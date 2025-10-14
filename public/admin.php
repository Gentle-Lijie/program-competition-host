<?php
require_once __DIR__ . '/../lib/helpers.php';
$programs = fetchAllPrograms($pdo);
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>后台管理：节目列表</title>
  <style>
    body{font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,"Noto Sans CJK SC",sans-serif; margin: 24px;}
    table{border-collapse: collapse; width:100%;}
    th,td{border:1px solid #ddd; padding:8px; text-align:left;}
    .time{white-space:nowrap; font-variant-numeric: tabular-nums;}
    form{margin:0;}
    input[type=text],input[type=datetime-local]{width:100%; padding:4px;}
    button{padding:4px 10px; margin:2px;}
    .highlight{background-color: #ffeb3b; font-weight: bold;}
    .back-home {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  background: #009BC1;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: all 0.2s;
}
.back-home:hover {
  background: #33AFCD;
  transform: translateY(-2px);
}

  </style>
</head>
<body>
  <h1>后台管理：节目列表</h1>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>开始时间</th>
        <th>节目名称</th>
        <th>表演者</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
    <?php foreach ($programs as $p): ?>
      <tr class="<?= (new DateTime($p['start_time']))->format('Y-m-d H:i') <= (new DateTime())->format('Y-m-d H:i') && (new DateTime($p['start_time']))->format('Y-m-d H:i') > (new DateTime())->format('Y-m-d H:i') ? 'highlight' : '' ?>">
        <form method="post" action="admin_action.php">
          <td><?= (int)$p['id'] ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"></td>
          <td><input type="datetime-local" name="start_time" value="<?= h((new DateTime($p['start_time']))->format('Y-m-d\\TH:i')) ?>"></td>
          <td><input type="text" name="name" value="<?= h($p['name']) ?>"></td>
          <td><input type="text" name="performer" value="<?= h($p['performer']) ?>"></td>
          <td>
            <button type="submit" name="action" value="update">保存</button>
            <button type="submit" name="action" value="delete" onclick="return confirm('确定要删除该节目吗？');">删除</button>
          </td>
        </form>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>

  <h2>新增节目</h2>
  <form method="post" action="admin_action.php">
    <input type="hidden" name="action" value="add">
    <label>开始时间：<input type="datetime-local" name="start_time"></label><br>
    <label>节目名称：<input type="text" name="name"></label><br>
    <label>表演者：<input type="text" name="performer"></label><br>
    <button type="submit">新增节目</button>
  </form>
<div style="position:fixed;bottom:20px;right:20px;z-index:9999;">
  <a href="https://106.15.139.140/schedule/public/index.html" style="display:inline-block;background:#009BC1;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.2);transition:all 0.2s;">
    🏠 返回首页
  </a>
</div>

</body>
</html>
