<?php
require_once __DIR__ . '/../lib/helpers.php';

$programs = fetchAllPrograms($pdo);
$current  = fetchCurrentProgram($pdo);
$now = new DateTime();
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>节目单</title>
  <style>
    body {
      font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,"Noto Sans CJK SC",sans-serif;
      margin: 24px;
      background: #FAF6EF; /* Portland Stone */
      color: #10263B;      /* Nottingham Blue */
    }
    h1 {
      color: #009BC1; /* Malaysia Sky Blue */
      margin-bottom: 20px;
    }
    .now {
      background: #F2FAFC; /* 5% Malaysia Sky Blue */
      border-left: 6px solid #009BC1; /* Malaysia Sky Blue */
      padding: 16px 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }
    table {
      border-collapse: collapse;
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    th {
      background: #10263B; /* Nottingham Blue */
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      border-top: 1px solid #CFD4D8; /* 20% Nottingham Blue */
      padding: 10px;
    }
    tr.current {
      background: #CCEBF3; /* 20% Malaysia Sky Blue */
      font-weight: bold;
    }
    tr:hover {
      background: #FDFBF9; /* 40% Portland Stone */
    }
    .time {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      color: #405162; /* 80% Nottingham Blue */
    }
  </style>
</head>
<body>
  <h1>节目单</h1>
  <div class="now">
    <strong>当前时间：</strong><?= h($now->format('Y-m-d H:i:s')) ?><br>
    <?php if ($current): ?>
      <strong>当前节目：</strong><?= h($current['name']) ?> — <?= h($current['performer']) ?>
      <span class="time">(开始于 <?= h((new DateTime($current['start_time']))->format('Y-m-d H:i')) ?>)</span>
    <?php else: ?>
      <strong>当前节目：</strong>暂无（等待开始）
    <?php endif; ?>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>开始时间</th>
        <th>节目名称</th>
        <th>表演者</th>
      </tr>
    </thead>
    <tbody>
    <?php foreach ($programs as $i => $p):
      $isCurrent = $current && ((int)$p['id'] === (int)$current['id']);
    ?>
      <tr class="<?= $isCurrent ? 'current' : '' ?>">
        <td><?= $i+1 ?></td>
        <td class="time"><?= h((new DateTime($p['start_time']))->format('Y-m-d H:i')) ?></td>
        <td><?= h($p['name']) ?></td>
        <td><?= h($p['performer']) ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
</body>
</html>
