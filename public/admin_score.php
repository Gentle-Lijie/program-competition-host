<?php
require_once __DIR__ . '/../lib/helpers.php';   // 仅这一行引入

// 这里假设 helpers.php 内部已提供 $db (PDO) 数据库连接

// 保存打分
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id    = intval($_POST['id']);
    $score = floatval($_POST['score']);

    $stmt  = $db->prepare("UPDATE programs SET score=? WHERE id=?");
    $stmt->execute([$score, $id]);
    $msg = "节目 ID {$id} 打分成功！";
}

// 读取所有节目
$stmt = $db->query("SELECT id,name,performer,start_time,score FROM programs ORDER BY start_time ASC");
$programs = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>节目打分后台</title>
<style>
body{font-family:Arial;background:#F3F4F5;color:#10263B;margin:20px;}
h1{color:#10263B;text-align:center;}
table{width:100%;border-collapse:collapse;background:#FAF6EF;}
th,td{padding:10px;border:1px solid #9FA8B1;text-align:center;}
th{background:#405162;color:#fff;}
tr:nth-child(even){background:#CFD4D8;}
button{background:#10263B;color:#fff;border:none;padding:6px 12px;cursor:pointer;border-radius:6px;}
button:hover{background:#405162;}
input[type="number"]{width:80px;padding:4px;}
.msg{color:#009BC1;text-align:center;margin:10px;}
</style>
</head>
<body>
<h1>节目打分后台</h1>
<?php if(!empty($msg)) echo "<div class='msg'>$msg</div>"; ?>
<table>
<thead>
<tr><th>ID</th><th>节目名称</th><th>表演者</th><th>开始时间</th><th>分数</th><th>操作</th></tr>
</thead>
<tbody>
<?php foreach($programs as $p): ?>
<tr>
  <form method="post">
    <td><?=htmlspecialchars($p['id'])?></td>
    <td><?=htmlspecialchars($p['name'])?></td>
    <td><?=htmlspecialchars($p['performer'])?></td>
    <td><?=htmlspecialchars($p['start_time'])?></td>
    <td>
      <input type="number" step="0.1" name="score" value="<?=htmlspecialchars($p['score'])?>">
      <input type="hidden" name="id" value="<?=$p['id']?>">
    </td>
    <td><button type="submit">保存</button></td>
  </form>
</tr>
<?php endforeach; ?>
</tbody>
</table>
</body>
</html>
