<?php
require_once __DIR__ . '/../lib/helpers.php';

// 获取所有比赛
$stmt = $pdo->query("SELECT id, name, performer, start_time, requirement FROM programs ORDER BY start_time ASC");
$programs = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 默认选择第一个比赛
$selectedId = isset($_GET['id']) ? (int)$_GET['id'] : ($programs[0]['id'] ?? 0);

// 如果提交表单
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)($_POST['id'] ?? 0);
    $requirement = trim($_POST['requirement'] ?? '');

    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE programs SET requirement = :req WHERE id = :id");
        $stmt->execute([
            ':req' => $requirement,
            ':id'  => $id
        ]);
        $message = "比赛要求已更新 ✅";

        // 刷新数据
        $selectedId = $id;
        $stmt = $pdo->query("SELECT id, name, performer, start_time, requirement FROM programs ORDER BY start_time ASC");
        $programs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $message = "未找到比赛 ❌";
    }
}

// 找到当前选中的比赛
$current = null;
foreach ($programs as $p) {
    if ($p['id'] == $selectedId) {
        $current = $p;
        break;
    }
}
?>
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>修改比赛要求</title>
<style>
body {
  margin: 0;
  font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,"Noto Sans CJK SC",sans-serif;
  background: #FAF6EF;
  color: #10263B;
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  width: 280px;
  background: #10263B;
  color: white;
  overflow-y: auto;
  padding: 20px;
}
.sidebar h2 {
  margin-top: 0;
  color: #009BC1;
}
.sidebar a {
  display: block;
  padding: 10px;
  margin: 6px 0;
  text-decoration: none;
  color: white;
  border-radius: 6px;
  transition: background 0.2s;
}
.sidebar a:hover {
  background: #405162;
}
.sidebar a.active {
  background: #009BC1;
  font-weight: bold;
}
.content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
h1 {
  color: #009BC1;
  margin: 0 0 20px;
}
.msg {
  margin-bottom: 15px;
  font-weight: bold;
  color: green;
}
form {
  display: flex;
  flex-direction: column;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
  box-sizing: border-box;
}
textarea {
  width: 100%;
  min-height: 200px;
  max-height: 400px;
  padding: 12px;
  font-size: 1rem;
  border: 1px solid #CFD4D8;
  border-radius: 8px;
  resize: vertical;
  box-sizing: border-box;
  margin: 0;
}
.form-footer {
  margin-top: 20px;
  text-align: right;
  position: sticky;
  bottom: 0;
  background: white;
  padding-top: 10px;
}
button {
  padding: 12px 30px;
  font-size: 1.2rem;
  background: #009BC1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
button:hover {
  background: #33AFCD;
}
</style>
</head>
<body>

<div class="sidebar">
  <h2>所有比赛</h2>
  <?php foreach ($programs as $p): ?>
    <a href="?id=<?= h($p['id']) ?>" class="<?= $p['id']==$selectedId?'active':'' ?>">
      <?= h($p['name']) ?><br>
      <small><?= h((new DateTime($p['start_time']))->format('Y-m-d H:i')) ?> - <?= h($p['performer']) ?></small>
    </a>
  <?php endforeach; ?>
</div>

<div class="content">
  <h1>修改比赛要求</h1>

  <?php if (!empty($message)): ?>
    <div class="msg"><?= h($message) ?></div>
  <?php endif; ?>

  <?php if ($current): ?>
    <form method="post">
      <input type="hidden" name="id" value="<?= h($current['id']) ?>">
      <p><strong>当前比赛：</strong><?= h($current['name']) ?> — <?= h($current['performer']) ?></p>
      <textarea name="requirement"><?= h($current['requirement'] ?? '') ?></textarea>
      <div class="form-footer">
        <button type="submit">💾 保存修改</button>
      </div>
    </form>
  <?php else: ?>
    <p>请在左边选择一个比赛。</p>
  <?php endif; ?>
</div>
<div style="position:fixed;bottom:20px;right:20px;z-index:9999;">
  <a href="https://106.15.139.140/schedule/public/index.html" style="display:inline-block;background:#009BC1;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.2);transition:all 0.2s;">
    🏠 返回首页
  </a>
</div>
</body>
</html>
