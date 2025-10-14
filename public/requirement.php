<?php
require_once __DIR__ . '/../lib/helpers.php';

// 获取当前正在进行的比赛（跟节目类似）
$current = fetchCurrentProgram($pdo);  // 假设里面也查出了 requirement 字段
$now = new DateTime();
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>比赛大屏</title>
  <meta http-equiv="refresh" content="1"> <!-- 每10秒刷新 -->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,"Noto Sans CJK SC",sans-serif;
      background: #10263B; /* Nottingham Blue */
      color: #FAF6EF;      /* Portland Stone */
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      text-align: left;
      vertical-align: middle;
    }
    .time {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #99D7E6; /* 40% Malaysia Sky Blue */
    }
    .title {
      font-size: 4rem;
      font-weight: bold;
      margin-bottom: 40px;
      color: white; /* Malaysia Sky Blue */
    }
    .requirement {
      font-size: 2rem;
      max-width: 80%;
      line-height: 1;
      background: #F2FAFC; /* 5% Malaysia Sky Blue */
      color: #10263B;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div class="time">
    当前时间：<?= h($now->format('Y-m-d H:i:s')) ?>
  </div>

  <?php if ($current): ?>
    <div class="title">
      当前节目：<?= h($current['name']) ?> — <?= h($current['performer']) ?>
    </div>
    <div class="requirement">
      <?= nl2br(h($current['requirement'])) ?>
    </div>
  <?php else: ?>
    <div class="title"><div align=center style="font-size:20vmin;color:red">下班</div><br/>当前没有节目</div>
  <?php endif; ?>
  <div style="position:fixed;bottom:20px;right:20px;z-index:9999;">
</div>
</body>
</html>
