<script setup lang="ts">
defineProps<{ count: number }>();
</script>

<template>
  <div class="checkin-badge">
    <span class="checkin-badge__label">已签到</span>
    <span class="checkin-badge__count">{{ count }}</span>
    <span class="checkin-badge__unit">人</span>
  </div>
</template>

<style scoped>
.checkin-badge {
  display: flex;
  align-items: baseline;
  gap: 10px;
  background: rgba(46, 100, 23, 0.92);
  color: #faf6ef;
  border-radius: 999px;
  padding: 14px 30px;
  font-family: 'Noto Sans SC', sans-serif;
  box-shadow: 0 4px 16px rgba(46, 100, 23, 0.3);
}
.checkin-badge__label {
  font-size: 30px;
  opacity: 0.85;
}
.checkin-badge__count {
  font-family: 'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif;
  font-size: 52px;
  line-height: 1;
  color: #c9f0a6;
  font-variant-numeric: tabular-nums;
}
.checkin-badge__unit {
  font-size: 26px;
  opacity: 0.85;
}
</style>
