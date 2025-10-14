<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../lib/helpers.php';

$programs = fetchAllPrograms($pdo);
if (!is_array($programs)) {
    echo "Error: fetchAllPrograms() did not return an array.";
    exit;
}

// 按时间升序排序
usort($programs, fn($a, $b) => strtotime($a['start_time']) <=> strtotime($b['start_time']));

$now = time();
$current = null;
$next    = null;

// 1️⃣ 找到“当前时间前最近的一场”
$closestPast = null;
foreach ($programs as $p) {
    if (strtotime($p['start_time']) <= $now) {
        $closestPast = $p; // 由于升序，最后一次循环就是最近的一场
    } else {
        break;
    }
}

if ($closestPast) {
    if ((int)$closestPast['ended'] === 0) {
        // 2️⃣ 最近的一场未结束
        $current = $closestPast;
    } else {
        // 3️⃣ 最近的一场已结束，找它之后第一个未结束的
        foreach ($programs as $p) {
            if (strtotime($p['start_time']) > strtotime($closestPast['start_time']) && (int)$p['ended'] === 0) {
                $current = $p;
                break;
            }
        }
    }
}

// 4️⃣ 找下一节目：从当前节目的时间往后找第一个未结束的
if ($current) {
    foreach ($programs as $p) {
        if (strtotime($p['start_time']) > strtotime($current['start_time']) && (int)$p['ended'] === 0) {
            $next = $p;
            break;
        }
    }
} else {
    // 如果没有当前节目（比如所有节目都在未来或全结束），下一节目是未来第一个未结束的
    foreach ($programs as $p) {
        if (strtotime($p['start_time']) > $now && (int)$p['ended'] === 0) {
            $next = $p;
            break;
        }
    }
}
?>
<style>
  @font-face {
    font-family: 'CustomFont';
    src: url('font.otf') format('opentype');
    font-weight: normal;
    font-style: normal;
  }
  .program-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: var(--bar-height, 20vh);
    background: rgba(34,34,34,0.85);
    box-shadow: 0 -4px 12px rgba(0,0,0,.4);
    padding: 0 40px;
    font-family: 'CustomFont', sans-serif;
    color: #fff;
    overflow: hidden;
  }
  .program-left, .program-right {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
  }
  .program-right {
    justify-content: flex-start;
  }
  .label {
    opacity: .7;
    font-size: calc(var(--bar-height, 20vh) * 0.45);
    margin-right: 0.5em;
    flex-shrink: 0;
  }

  /* 跑马灯容器 */
  .scroll-container {
    position: relative;
    overflow: hidden;
    flex: 1;
    min-width: 0;
  }
  .scroll-text {
    display: inline-block;
    padding-left: 100%;
    animation: marquee 12s linear infinite;
    white-space: nowrap;
    font-weight: 600;
  }
  .now .scroll-text {
    font-size: calc(var(--bar-height, 20vh) * 0.45);
  }
  .hint .scroll-text {
    font-size: calc(var(--bar-height, 20vh) * 0.45);
  }
  @keyframes marquee {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-100%); }
  }
</style>

<div class="program-bar">
  <div class="program-left">
    <span class="label">当前节目</span>
    <div class="scroll-container now">
      <span class="scroll-text">
        <?= $current ? h($current['name']).' — 表演者：'.h($current['performer']) : '暂无（等待开始）' ?>
      </span>
    </div>
  </div>
  <div class="program-right">
    <span class="label">下一节目</span>
    <div class="scroll-container hint">
      <span class="scroll-text">
        <?= $next ? h($next['name']).' — 表演者：'.h($next['performer']) : '暂无' ?>
      </span>
    </div>
  </div>
</div>
