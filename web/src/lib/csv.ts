// CSV 前端解析：嗅探 UTF-8 BOM，无 BOM 按 GBK 解码（Excel 中文默认编码）
// 节目单列序与原项目 cli/import_csv.php 一致：start_time(YYYY-MM-DD HH:MM), name, performer；首行表头自动跳过

export interface CsvRow {
  start_time: string;
  name: string;
  performer: string;
}

export interface RosterRow {
  class: string;
  name: string;
  student_no: string;
}

export interface CsvError {
  line: number;
  message: string;
}

const TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

// 解码：BOM → UTF-8；含非法 UTF-8 序列 → GBK
async function decodeFile(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  let isUtf8 = hasBom;
  if (!hasBom) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buf);
      isUtf8 = true;
    } catch {
      isUtf8 = false;
    }
  }
  const decoder = new TextDecoder(isUtf8 ? 'utf-8' : 'gbk');
  return decoder.decode(hasBom ? buf.subarray(3) : buf);
}

function toLines(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.trim() !== '');
}

export async function parseCsvFile(file: File): Promise<{ rows: CsvRow[]; errors: CsvError[] }> {
  const lines = toLines(await decodeFile(file));
  const rows: CsvRow[] = [];
  const errors: CsvError[] = [];

  lines.forEach((line, i) => {
    const cols = line.split(',').map((c) => c.trim());
    if (i === 0 && /start/i.test(cols[0] ?? '')) return; // 表头

    const [start = '', name = '', performer = ''] = cols;
    if (!TIME_RE.test(start)) {
      errors.push({ line: i + 1, message: `时间「${start || '空'}」格式应为 YYYY-MM-DD HH:MM` });
      return;
    }
    if (!name || !performer) {
      errors.push({ line: i + 1, message: '节目名称或表演者为空' });
      return;
    }
    rows.push({ start_time: start, name, performer });
  });

  return { rows, errors };
}

// 名单解析：三列 班级,姓名,学号；首行表头自动映射（任意列序）
export async function parseRosterCsvFile(file: File): Promise<{ rows: RosterRow[]; errors: CsvError[] }> {
  const lines = toLines(await decodeFile(file));
  const rows: RosterRow[] = [];
  const errors: CsvError[] = [];

  let cIdx = 0, nIdx = 1, sIdx = 2, start = 0;

  const first = lines[0]?.split(',').map((c) => c.trim()) ?? [];
  const cf = first.findIndex((c) => c.includes('班级'));
  const nf = first.findIndex((c) => c.includes('姓名'));
  const sf = first.findIndex((c) => c.includes('学号'));
  if (nf >= 0) {
    cIdx = cf >= 0 ? cf : -1;
    nIdx = nf;
    sIdx = sf >= 0 ? sf : -1;
    start = 1; // 跳过表头
  }

  lines.slice(start).forEach((line, i) => {
    const cols = line.split(',').map((c) => c.trim());
    const cls = cIdx >= 0 ? (cols[cIdx] ?? '') : '';
    const name = cols[nIdx] ?? '';
    const studentNo = sIdx >= 0 ? (cols[sIdx] ?? '') : '';
    if (!name) {
      errors.push({ line: i + 1, message: '姓名为空' });
      return;
    }
    rows.push({ class: cls, name, student_no: studentNo });
  });

  return { rows, errors };
}
