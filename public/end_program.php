<?php
require_once __DIR__ . '/../lib/helpers.php';

$now = time();
$current = null;

// 1️⃣ 找到当前时间前最近的一场节目（开始时间 ≤ 现在），按时间降序
$stmt = $pdo->prepare("SELECT * FROM programs WHERE start_time <= ? ORDER BY start_time DESC LIMIT 1");
$stmt->execute([date('Y-m-d H:i:s', $now)]);
$closestPast = $stmt->fetch(PDO::FETCH_ASSOC);

if ($closestPast) {
    if ((int)$closestPast['ended'] === 0) {
        // 2️⃣ 最近的一场未结束，直接显示
        $current = $closestPast;
    } else {
        // 3️⃣ 最近的一场已结束，查找它之后最近的未结束节目
        $stmt = $pdo->prepare(
            "SELECT * FROM programs WHERE start_time > ? AND ended = 0 ORDER BY start_time ASC LIMIT 1"
        );
        $stmt->execute([$closestPast['start_time']]);
        $current = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}

// 4️⃣ 表单提交：手动提前结束当前节目
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $current) {
    $stmt = $pdo->prepare("UPDATE programs SET ended = 1 WHERE id = ?");
    $stmt->execute([$current['id']]);
    header("Location: end_program.php?success=1");
    exit;
}
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>提前结束节目</title>
  <style>
    body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,"Noto Sans CJK SC",sans-serif; margin: 24px; }
    .box { padding: 20px; background: #F2FAFC; border: 2px solid #009BC1; border-radius: 8px; }
    button { background: #009BC1; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    button:hover { background: #007a99; }
    .success { background: #e8f5e9; padding: 10px; margin-bottom: 10px; border-left: 4px solid #4caf50; }
  </style>
</head>
<body>
  <h1>提前结束节目</h1>

  <?php if (isset($_GET['success'])): ?>
    <div class="success">✅ 当前节目已结束，系统进入下一个节目。</div>
  <?php endif; ?>

  <?php if ($current): ?>
    <div class="box">
      <p><strong>当前节目：</strong><?= h($current['name']) ?> — <?= h($current['performer']) ?></p>
      <form method="post">
        <button type="submit">提前结束该节目 ➡️ 下一个</button>
      </form>
    </div>
  <?php else: ?>
    <p>当前没有正在进行的节目。</p>
  <?php endif; ?>
</body>
</html>
