<?php
// 返回所有节目（含 id、name、performer、score），用于编辑页面
require_once __DIR__ . '/../lib/helpers.php'; // helpers.php 会引入 db.php，提供 $pdo

header('Content-Type: application/json; charset=utf-8');

try {
    $stmt = $pdo->query("SELECT id, name, performer, score FROM programs ORDER BY id ASC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
