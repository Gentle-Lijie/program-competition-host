<?php
require_once __DIR__ . '/../lib/helpers.php';
?>
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>大屏提示条</title>
<style>
  html, body { margin:0; height:100%; }
  body {
    /* background: url('bg.png') no-repeat center center fixed; */
    background-size: cover;
    color:#fff;
  }
  #program-bar {
    --bar-height: 10vh; /* 这里改高度，比如 15vh / 20vh / 30vh */
    position: fixed;
    left: 0; right: 0; bottom: 0;
  }
</style>
</head>
<body>
  <div id="program-bar">正在加载...</div>

<script>
async function fetchPrograms() {
  try {
    const res = await fetch('programs_refresh.php');
    const html = await res.text();
    document.getElementById('program-bar').innerHTML = html;
  } catch(err) {
    console.error(err);
  }
}
fetchPrograms();
setInterval(fetchPrograms,20000);
</script>
</body>
</html>
