<?php
require_once __DIR__ . '/../lib/helpers.php';
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>本场节目得分</title>
<style>
html, body {
    margin:0;
    padding:0;
    /* height:100%; */
    overflow:hidden; /* 禁止滚动条 */
    background:#FAF6EF;
    font-family:Arial, sans-serif;
    display:flex;
    flex-direction:column;
    color:#10263B;
}

/* 大标题 */
h1{
    text-align:center;
    font-size:6vh;  /* 高度的百分比自适应 */
    margin:1vh 0;
}

/* 内容容器：单栏 */
.wrapper{
    flex:1;  /* 占满剩余空间 */
    display:block;
    padding:0 2vw 2vh 2vw; /* 左右边距+底部小留白 */
    box-sizing:border-box;
}

/* 表格占满容器 */
table{
    width:100%;
    height:100%;
    border-collapse:collapse;
    table-layout:fixed;
    text-align:center;
}

/* 表头和单元格样式 */
th, td{
    border:1px solid #9FA8B1;
    vertical-align:middle;
    /* word-wrap:break-word; */
}

/* 表头 */
th{
    background:#405162;
    color:#fff;
    font-weight:bold;
    font-size:4vh; /* 根据高度自适应 */
    padding:0.3vh;
}

/* 单元格 */
td{
    font-size:3.5vh;   /* 根据高度自适应 */
    padding:0.3vh 0;   /* 顶下内边距根据高度自适应 */
    height:20%;         /* 行高占表格高度的百分比 */
}

/* 分数字体更大 */
td.score{
    font-size:4vh;     /* 分数大字体 */
    font-weight:bold;
}
td.performer{
    font-size:4vh;
}
/* 交替行颜色 */
tr:nth-child(even){
    background:#CFD4D8;
}
</style>
<script>
async function loadScores() {
    try {
        const res = await fetch('score_api.php');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        const tbody = document.querySelector('#scores-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement('tr');

            const tdName = document.createElement('td');
            tdName.textContent = row.name;

            const tdPerformer = document.createElement('td');
            tdPerformer.className = 'performer';
            tdPerformer.textContent = row.performer;

            const tdScore = document.createElement('td');
            tdScore.className = 'score';
            tdScore.textContent = row.score;

            tr.appendChild(tdName);
            tr.appendChild(tdPerformer);
            tr.appendChild(tdScore);
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('加载分数失败:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadScores();
    setInterval(loadScores, 10000);
});
</script>
</head>
<body>
<h1>本场节目得分</h1>
<div class="wrapper">
    <table>
        <thead>
            <tr>
                <th>节目名称</th>
                <th>表演者</th>
                <th>分数</th>
            </tr>
        </thead>
        <tbody id="scores-body"></tbody>
    </table>
</div>
</body>
</html>
