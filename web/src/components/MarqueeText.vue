<script setup lang="ts">
import { onMounted, ref } from 'vue';

// 跑马灯：文字溢出才滚动，否则静止
const container = ref<HTMLElement | null>(null);
const inner = ref<HTMLElement | null>(null);
const needsScroll = ref(false);

onMounted(() => {
  if (container.value && inner.value) {
    needsScroll.value = inner.value.scrollWidth > container.value.clientWidth + 4;
  }
});
</script>

<template>
  <div ref="container" class="marquee">
    <span ref="inner" class="marquee__text" :class="{ 'marquee__text--scroll': needsScroll }">
      <slot />
    </span>
  </div>
</template>

<style scoped>
.marquee {
  position: relative;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}
.marquee__text {
  display: inline-block;
  white-space: nowrap;
  font-weight: 600;
}
.marquee__text--scroll {
  padding-left: 100%;
  animation: marquee 12s linear infinite;
}
@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}
</style>
