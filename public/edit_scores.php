<?php
// =========================================
// 文件名：edit_scores.php
// 功能：单文件双模式（前端页面 + JSON接口）
// =========================================

require_once __DIR__ . '/../lib/helpers.php'; // helpers.php 会引入 db.php，提供 $pdo

// --------------------------
// ✅ 如果带 ?api=1 参数 → 返回节目列表 JSON
// --------------------------
if (isset($_GET['api'])) {
    header('Content-Type: application/json; charset=utf-8');

    try {
        $stmt = $pdo->query("SELECT id, name, performer, score FROM programs ORDER BY id ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($rows);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// --------------------------
// ✅ 如果带 ?update=1 参数 → 更新单个分数
// --------------------------
if (isset($_GET['update'])) {
    header('Content-Type: application/json; charset=utf-8');

    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? null;
        $score = $input['score'] ?? null;

        if ($id === null) {
            http_response_code(400);
            echo json_encode(['error' => '缺少 id']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE programs SET score = :score WHERE id = :id");
        $stmt->execute([':score' => $score, ':id' => $id]);

        echo json_encode(['ok' => true]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}
?>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>编辑所有活动分数</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;background:#f7f9fb;color:#10263B;margin:0;padding:20px}
.container{max-width:1100px;margin:0 auto}
h1{font-size:2.2rem;margin-bottom:0.5rem}
.controls{margin:1rem 0}
button{padding:8px 12px;border-radius:4px;border:1px solid #407;background:#405162;color:#fff;cursor:pointer}
button.secondary{background:#6c7a86}
table{width:100%;border-collapse:collapse;background:#fff}
th,td{border:1px solid #d0d7dd;padding:8px;text-align:left}
th{background:#405162;color:#fff}
.status{font-size:0.9rem;color:#666}
.row-status{margin-left:8px;font-size:0.9rem}
.success{color:green}
.error{color:red}
.small{font-size:0.9rem;color:#666}
</style>
</head>
<body>
<div class="container">
    <h1>编辑所有活动分数</h1>
    <div class="controls">
        <button id="save-all">保存所有更改</button>
        <button id="reload" class="secondary">刷新列表</button>
        <span class="small" id="global-msg"></span>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:40%">节目名称</th>
                <th style="width:30%">表演者</th>
                <th style="width:15%">分数</th>
                <th style="width:15%">操作</th>
            </tr>
        </thead>
        <tbody id="programs-body"></tbody>
    </table>
</div>

<script>
async function fetchPrograms(){
    try{
        const res = await fetch('edit_scores.php?api=1'); // ✅ 同文件接口
        if(!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return data;
    }catch(e){
        console.error(e);
        throw e;
    }
}

function renderPrograms(data){
    const tbody = document.getElementById('programs-body');
    tbody.innerHTML = '';
    data.forEach(p => {
        const tr = document.createElement('tr');
        tr.dataset.id = p.id;
        const nameTd = document.createElement('td');
        nameTd.textContent = p.name;
        const perfTd = document.createElement('td');
        perfTd.textContent = p.performer;
        const scoreTd = document.createElement('td');
        const input = document.createElement('input'); // ✅ 普通文本输入框
        input.value = (p.score !== null) ? p.score : '';
        scoreTd.appendChild(input);
        const actionTd = document.createElement('td');
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', () => saveRow(tr));
        const status = document.createElement('span');
        status.className = 'row-status';
        actionTd.appendChild(saveBtn);
        actionTd.appendChild(status);
        tr.appendChild(nameTd);
        tr.appendChild(perfTd);
        tr.appendChild(scoreTd);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
    });
}

async function saveRow(tr){
    const id = tr.dataset.id;
    const input = tr.querySelector('input');
    const score = input.value === '' ? null : input.value; // ✅ 不做数字转换
    const status = tr.querySelector('.row-status');
    status.textContent = '保存中...';
    status.className = 'row-status';
    try{
        const res = await fetch('edit_scores.php?update=1', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({id: Number(id), score: score})
        });
        const j = await res.json();
        if(!res.ok){
            status.textContent = j.error || ('HTTP ' + res.status);
            status.classList.add('error');
        }else{
            status.textContent = '已保存';
            status.classList.add('success');
        }
    }catch(e){
        console.error(e);
        status.textContent = '保存失败';
        status.classList.add('error');
    }
}

async function saveAll(){
    const rows = Array.from(document.querySelectorAll('#programs-body tr'));
    const promises = rows.map(tr => {
        const id = tr.dataset.id;
        const input = tr.querySelector('input');
        const score = input.value === '' ? null : input.value; // ✅ 不做数字转换
        const status = tr.querySelector('.row-status');
        status.textContent = '保存中...';
        status.className = 'row-status';
        return fetch('edit_scores.php?update=1', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({id: Number(id), score: score})
        }).then(async res => {
            const j = await res.json();
            if(!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
            status.textContent = '已保存';
            status.classList.add('success');
        }).catch(err => {
            status.textContent = '失败';
            status.classList.add('error');
            console.error('save error', err);
        });
    });
    await Promise.all(promises);
    const msg = document.getElementById('global-msg');
    msg.textContent = '保存完成';
    setTimeout(()=> msg.textContent = '', 2000);
}

document.getElementById('save-all').addEventListener('click', saveAll);
document.getElementById('reload').addEventListener('click', async ()=>{
    try{
        const data = await fetchPrograms();
        renderPrograms(data);
    }catch(e){
        document.getElementById('global-msg').textContent = '加载失败';
    }
});

// 初始加载
(async function(){
    try{
        const data = await fetchPrograms();
        renderPrograms(data);
    }catch(e){
        document.getElementById('global-msg').textContent = '加载失败，请稍后重试';
    }
})();
</script>
</body>
</html>
