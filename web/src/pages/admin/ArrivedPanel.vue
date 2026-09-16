<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import FileSelect from '@/components/FileSelect.vue';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { parseRosterCsvFile, type RosterRow } from '@/lib/csv';
import { useNow } from '@/composables/useNow';

// 表演者签到首页：节目列表（名单全局，按班级匹配到节目）+ 外层批量导入
interface ProgramRow {
  id: number;
  name: string;
  performer: string;
  start_time: string;
  roster_total: number;
  roster_arrived: number;
}

const programs = ref<ProgramRow[]>([]);
const search = ref('');
const message = ref('');
const now = useNow();

// 导入对话框
const importing = ref(false);
const csvPreview = ref<{ rows: RosterRow[]; errors: { line: number; message: string }[] } | null>(null);

async function load() {
  programs.value = await api('/api/admin/programs/full');
}
onMounted(load);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return programs.value;
  return programs.value.filter(
    (p) => p.name.toLowerCase().includes(q) || p.performer.toLowerCase().includes(q),
  );
});

const nowKey = computed(() => {
  const d = now.value;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
});

async function onCsvFile(file: File) {
  csvPreview.value = await parseRosterCsvFile(file);
}

async function importCsv() {
  if (!csvPreview.value?.rows.length) return;
  try {
    const r = await api<{ inserted: number; errors: string[] }>('/api/admin/performers/batch', {
      method: 'POST',
      body: JSON.stringify({ rows: csvPreview.value.rows }),
    });
    message.value = `导入 ${r.inserted} 人${r.errors.length ? `，跳过 ${r.errors.length} 人` : ''}`;
    csvPreview.value = null;
    importing.value = false;
    await load();
  } catch (e) {
    message.value = e instanceof Error ? e.message : '导入失败';
  }
}
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold">表演者签到</h2>
      <Badge variant="secondary">{{ programs.length }} 个节目</Badge>
      <div class="flex-1" />
      <Input v-model="search" placeholder="搜索节目或表演者…" class="max-w-56" />
      <Button variant="outline" @click="importing = true">导入名单</Button>
    </div>

    <div v-if="message" class="text-sm text-muted-foreground">{{ message }}</div>

    <div class="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-44">开始时间</TableHead>
            <TableHead>节目名称</TableHead>
            <TableHead>表演者</TableHead>
            <TableHead class="w-36 text-center">签到进度</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!filtered.length">
            <TableCell colspan="4" class="text-center text-muted-foreground py-10">暂无节目</TableCell>
          </TableRow>
          <TableRow v-for="p in filtered" :key="p.id" class="cursor-pointer" @click="$router.push(`/admin/arrived/${p.id}`)">
            <TableCell class="tabular-nums">
              {{ p.start_time }}
              <Badge v-if="p.start_time <= nowKey" variant="outline" class="ml-1">已开演</Badge>
            </TableCell>
            <TableCell class="font-medium">{{ p.name }}</TableCell>
            <TableCell>{{ p.performer }}</TableCell>
            <TableCell class="text-center">
              <Badge v-if="p.roster_total" :variant="p.roster_arrived === p.roster_total ? 'default' : 'secondary'" class="bg-brand text-primary-foreground">
                {{ p.roster_arrived }} / {{ p.roster_total }}
              </Badge>
              <span v-else class="text-muted-foreground text-sm">未导入名单</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 外层批量导入：全局名单（班级 → 学生），节目按班级自动匹配 -->
    <Dialog :open="importing" @update:open="(v) => (importing = v)">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入表演者名单</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="text-sm text-muted-foreground">
            三列：<code>班级, 姓名, 学号</code>；首行表头自动映射；支持 Excel GBK 编码；重复的人自动跳过。
            名单全局保存，各节目按「表演者班级代码」自动匹配（如 <code>EG2601</code>、<code>BDMA2601+MS2601</code>）。
            <a href="/templates/roster_template.csv" download class="text-primary underline ml-1">下载模板 (.csv)</a>
          </div>
          <FileSelect accept=".csv,text/csv" @select="onCsvFile" />
          <div v-if="csvPreview" class="grid gap-2">
            <div class="text-sm">
              解析出 <b class="text-primary">{{ csvPreview.rows.length }}</b> 人
              <template v-if="csvPreview.errors.length">
                ，<b class="text-destructive">{{ csvPreview.errors.length }}</b> 行有误：
                <div v-for="e in csvPreview.errors.slice(0, 5)" :key="e.line" class="text-destructive">
                  第 {{ e.line }} 行：{{ e.message }}
                </div>
              </template>
            </div>
            <div class="max-h-56 overflow-auto rounded border text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>班级</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>学号</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(r, i) in csvPreview.rows.slice(0, 50)" :key="i">
                    <TableCell>{{ r.class }}</TableCell>
                    <TableCell>{{ r.name }}</TableCell>
                    <TableCell class="tabular-nums">{{ r.student_no }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div v-if="csvPreview.rows.length > 50" class="px-3 py-2 text-muted-foreground">
                …仅预览前 50 人
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="importing = false">取消</Button>
          <Button :disabled="!csvPreview?.rows.length" @click="importCsv">
            导入 {{ csvPreview?.rows.length ?? 0 }} 人
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
