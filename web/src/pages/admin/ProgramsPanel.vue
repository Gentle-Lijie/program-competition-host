<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import type { Program } from '@/lib/programState';
import { parseCsvFile, type CsvRow } from '@/lib/csv';
import FileSelect from '@/components/FileSelect.vue';

interface FullProgram extends Program {}

const programs = ref<FullProgram[]>([]);
const loading = ref(false);
const message = ref('');

// 编辑/新增对话框
const editing = ref(false);
const isNew = ref(false);
const form = reactive({ id: 0, name: '', performer: '', start_time: '' });

// CSV 导入对话框
const importing = ref(false);
const csvPreview = ref<{ rows: CsvRow[]; errors: { line: number; message: string }[] } | null>(null);

async function load() {
  loading.value = true;
  try {
    programs.value = await api('/api/admin/programs/full');
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function openNew() {
  isNew.value = true;
  editing.value = true;
  const d = new Date();
  d.setMinutes(0, 0, 0);
  Object.assign(form, { id: 0, name: '', performer: '', start_time: toLocal(d) });
}

function openEdit(p: FullProgram) {
  isNew.value = false;
  editing.value = true;
  Object.assign(form, { id: p.id, name: p.name, performer: p.performer, start_time: p.start_time });
}

// datetime-local "YYYY-MM-DDTHH:MM" → 存储 "YYYY-MM-DD HH:MM"
function toLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocal(v: string) {
  return v.replace('T', ' ');
}

async function save() {
  const body = JSON.stringify({
    name: form.name,
    performer: form.performer,
    start_time: fromLocal(form.start_time),
  });
  try {
    if (isNew.value) {
      await api('/api/programs', { method: 'POST', body });
    } else {
      await api(`/api/programs/${form.id}`, { method: 'PUT', body });
    }
    editing.value = false;
    await load();
  } catch (e) {
    message.value = e instanceof Error ? e.message : '保存失败';
  }
}

async function remove(p: FullProgram) {
  if (!confirm(`确定删除「${p.name}」？`)) return;
  await api(`/api/programs/${p.id}`, { method: 'DELETE' });
  await load();
}

async function onCsvFile(file: File) {
  csvPreview.value = await parseCsvFile(file);
}

async function importCsv() {
  if (!csvPreview.value?.rows.length) return;
  try {
    const r = await api<{ inserted: number; errors: string[] }>('/api/programs/batch', {
      method: 'POST',
      body: JSON.stringify({ rows: csvPreview.value.rows }),
    });
    message.value = `导入成功 ${r.inserted} 条${r.errors.length ? `，失败 ${r.errors.length} 条` : ''}`;
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
      <h2 class="text-xl font-bold">节目管理</h2>
      <Badge variant="secondary">{{ programs.length }} 个节目</Badge>
      <div class="flex-1" />
      <Button variant="outline" @click="importing = true">导入 CSV</Button>
      <Button @click="openNew">新增节目</Button>
    </div>

    <div v-if="message" class="text-sm text-muted-foreground">{{ message }}</div>

    <div class="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-44">开始时间</TableHead>
            <TableHead>节目名称</TableHead>
            <TableHead>表演者</TableHead>
            <TableHead class="w-32 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!programs.length && !loading">
            <TableCell colspan="4" class="text-center text-muted-foreground py-10">
              暂无节目，点「新增节目」或「导入 CSV」开始
            </TableCell>
          </TableRow>
          <TableRow v-for="p in programs" :key="p.id">
            <TableCell class="tabular-nums">{{ p.start_time }}</TableCell>
            <TableCell class="font-medium">{{ p.name }}</TableCell>
            <TableCell>{{ p.performer }}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="sm" @click="openEdit(p)">编辑</Button>
              <Button variant="ghost" size="sm" class="text-destructive" @click="remove(p)">删除</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 编辑/新增 -->
    <Dialog :open="editing" @update:open="(v) => (editing = v)">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ isNew ? '新增节目' : '编辑节目' }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="grid gap-2">
            <Label>开始时间</Label>
            <Input v-model="form.start_time" type="datetime-local" />
          </div>
          <div class="grid gap-2">
            <Label>节目名称</Label>
            <Input v-model="form.name" placeholder="如《稻香》" />
          </div>
          <div class="grid gap-2">
            <Label>表演者</Label>
            <Input v-model="form.performer" placeholder="如 EG2601" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="editing = false">取消</Button>
          <Button @click="save">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- CSV 导入 -->
    <Dialog :open="importing" @update:open="(v) => (importing = v)">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入 CSV</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="text-sm text-muted-foreground">
            列序：<code>开始时间(YYYY-MM-DD HH:MM), 节目名称, 表演者</code>；首行表头自动跳过；支持 Excel 的 GBK 编码。
            <a href="/templates/program_template.csv" download class="text-primary underline ml-1">下载模板 (.csv)</a>
          </div>
          <FileSelect accept=".csv,text/csv" @select="onCsvFile" />
          <div v-if="csvPreview" class="grid gap-2">
            <div class="text-sm">
              解析出 <b class="text-primary">{{ csvPreview.rows.length }}</b> 条有效
              <template v-if="csvPreview.errors.length">
                ，<b class="text-destructive">{{ csvPreview.errors.length }}</b> 条有误：
                <div v-for="e in csvPreview.errors.slice(0, 5)" :key="e.line" class="text-destructive">
                  第 {{ e.line }} 行：{{ e.message }}
                </div>
              </template>
            </div>
            <div class="max-h-56 overflow-auto rounded border text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>开始时间</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>表演者</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(r, i) in csvPreview.rows" :key="i">
                    <TableCell class="tabular-nums">{{ r.start_time }}</TableCell>
                    <TableCell>{{ r.name }}</TableCell>
                    <TableCell>{{ r.performer }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="importing = false">取消</Button>
          <Button :disabled="!csvPreview?.rows.length" @click="importCsv">
            导入 {{ csvPreview?.rows.length ?? 0 }} 条
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
