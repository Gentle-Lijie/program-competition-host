import { onBeforeUnmount, ref } from 'vue';

// 本地秒级时钟：节目切换判定零延迟（数据 10s 一刷，判定每秒重算）
export function useNow(stepMs = 1000) {
  const now = ref(new Date());
  const timer = setInterval(() => (now.value = new Date()), stepMs);
  onBeforeUnmount(() => clearInterval(timer));
  return now;
}
