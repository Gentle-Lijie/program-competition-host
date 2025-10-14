<?php
require_once __DIR__ . '/../lib/helpers.php'; // helpers.php 会引入 db.php，提供 $pdo

header('Content-Type: application/json; charset=utf-8');

try {
    // 只查询已结束的节目
    $stmt = $pdo->query("
        SELECT name, performer, score
        FROM programs
        WHERE score is not NULL
        ORDER BY score DESC
    ");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Throwable $e) {
    http_response_code(500);
    error_log('score_api error: ' . $e->getMessage());
    echo json_encode(['error' => 'Internal server error']);
}
