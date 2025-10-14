<?php
require_once __DIR__ . '/../lib/helpers.php';

// 获取所有比赛
$stmt = $pdo->query("SELECT id, name, start_time FROM programs ORDER BY start_time ASC");
$programs = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 提交处理
$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $selectedId = (int)($_POST['selected_id'] ?? 0);

    if ($selectedId > 0) {
        // 找到选中比赛的开始时间
        $selectedProgram = null;
        foreach ($programs as $p) {
            if ($p['id'] == $selectedId) {
                $selectedProgram = $p;
                break;
            }
        }

        if ($selectedProgram) {
            $selectedTime = new DateTime($selectedProgram['start_time']);

            // 遍历所有比赛，按照时间设置 ended
            foreach ($programs as $p) {
                $programTime = new DateTime($p['start_time']);
                $ended = ($programTime <= $selectedTime) ? 1 : 0;
                $stmt = $pdo->prepare("UPDATE programs SET ended = :ended WHERE id = :id");
                $stmt->execute([
                    ':ended' => $ended,
                    ':id'    => $p['id']
                ]);
            }

            $message = "比赛状态已更新 ✅";
        }
    } else {
        $message = "请选择一个比赛 ❌";
    }

    // 刷新比赛列表
    $stmt = $pdo->query("SELECT id, name, start_time FROM programs ORDER BY start_time ASC");
    $programs = $stmt->fetchAll(PDO::FETCH_ASSOC);
}


// 找到当前选中的比赛（用于表单默认选择）
$selectedId = $_POST['selected_id'] ?? 0;
?>
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Override 比赛结束状态</title>
<style>
body {
  font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,"Noto Sans CJK SC",sans-serif;
  background: #FAF6EF;
  color: #10263B;
  padding: 30px;
}
h1 {
  color: #009BC1;
}
form {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  max-width: 600px;
}
select {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  margin-bottom: 20px;
  border-radius: 6px;
  border: 1px solid #CFD4D8;
}
button {
  padding: 12px 30px;
  font-size: 1rem;
  background: #009BC1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
button:hover {
  background: #33AFCD;
}
.msg {
  margin: 15px 0;
  font-weight: bold;
  color: green;
}
</style>
</head>
<body>
<h1>Override 比赛结束状态</h1>

<?php if ($message): ?>
  <div class="msg"><?= h($message) ?></div>
<?php endif; ?>

<form method="post">
  <label for="selected_id"><strong>选择比赛：</strong></label>
  <select name="selected_id" id="selected_id">
    <option value="0">-- 请选择比赛 --</option>
    <?php foreach ($programs as $p): ?>
      <option value="<?= h($p['id']) ?>" <?= $p['id'] == $selectedId ? 'selected' : '' ?>>
        <?= h((new DateTime($p['start_time']))->format('Y-m-d H:i')) ?> — <?= h($p['name']) ?>
      </option>
    <?php endforeach; ?>
  </select>
  <button type="submit">应用 Override</button>
</form>
</body>
</html>
