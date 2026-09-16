// CSV 前端解析：嗅探 UTF-8 BOM，无 BOM 按 GBK 解码（Excel 中文默认编码）
// 列序与原项目 cli/import_csv.php 一致：start_time(YYYY-MM-DD HH:MM), name, performer；首行表头自动跳过

export interface CsvRow {
  start_time: string;
  name: string;
  performer: string;
}

export interface CsvError {
  line: number;
  message: string;
}

const TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

export async function parseCsvFile(file: File): Promise<{ rows: CsvRow[]; errors: CsvError[] }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  let isUtf8 = hasBom;
  if (!hasBom) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buf);
      isUtf8 = true;
    } catch {
      isUtf8 = false; // 含非法 UTF-8 序列，按 GBK 处理
    }
  }
  const decoder = new TextDecoder(isUtf8 ? 'utf-8' : 'gbk');
  const text = decoder.decode(hasBom ? buf.subarray(3) : buf);

  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
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
