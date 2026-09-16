<script setup lang="ts">
import { ref } from 'vue';

// 统一样式的文件选择按钮（原生 input 会丢样式，这里用 label + 隐藏 input）
const props = defineProps<{ accept?: string }>();
const emit = defineEmits<{ select: [file: File] }>();
const filename = ref('');

function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    filename.value = file.name;
    emit('select', file);
  }
  input.value = '';
}
</script>

<template>
  <div class="flex items-center gap-3 flex-wrap">
    <label class="file-select-btn">
      选择文件
      <input type="file" :accept="accept" hidden @change="onChange" />
    </label>
    <span class="text-sm text-muted-foreground">{{ filename || '未选择文件' }}</span>
  </div>
</template>

<style scoped>
.file-select-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  padding: 0 1rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  font-size: 0.875rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.file-select-btn:hover {
  background: var(--accent);
  color: var(--accent-foreground);
}
</style>
