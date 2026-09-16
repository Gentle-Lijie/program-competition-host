import { onBeforeUnmount, reactive, ref } from 'vue';

// 轮询：立即执行一次；页面不可见时暂停（大屏后台标签页不空转）
export function usePolling<T>(fn: () => Promise<T>, intervalMs: number) {
  const data = ref<T>();
  const error = ref<string>('');
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      data.value = await fn();
      error.value = '';
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) return;
    tick();
    timer = setInterval(tick, intervalMs);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function onVisibility() {
    document.hidden ? stop() : start();
  }

  start();
  document.addEventListener('visibilitychange', onVisibility);

  onBeforeUnmount(() => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  });

  // reactive 包装：模板中 .data / .error 自动解包
  return reactive({ data, error, refresh: tick });
}
