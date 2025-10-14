<?php
// lib/helpers.php


require_once __DIR__ . '/db.php';


function fetchAllPrograms(PDO $pdo): array {
    $stmt = $pdo->query('SELECT id, name, performer, start_time, ended, created_at FROM programs ORDER BY start_time ASC');
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function fetchCurrentProgram(PDO $pdo) {
    $now = (new DateTime())->format('Y-m-d H:i:s');
    // 查找当前时间之前已经开始，且未提前结束的节目
    $stmt = $pdo->prepare("
        SELECT * FROM programs
        WHERE start_time <= ? AND ended = 0
        ORDER BY start_time DESC
        LIMIT 1
    ");
    $stmt->execute([$now]);
    $program = $stmt->fetch(PDO::FETCH_ASSOC);

    // 如果当前没有符合条件的节目（可能是刚结束），就找下一个即将开始的
    if (!$program) {
        $stmt = $pdo->prepare("
            SELECT * FROM programs
            WHERE start_time > ? AND ended = 0
            ORDER BY start_time ASC
            LIMIT 1
        ");
        $stmt->execute([$now]);
        $program = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    return $program;
}


function fetchNextProgram(PDO $pdo): ?array {
$stmt = $pdo->prepare('SELECT id, name, performer, start_time
FROM programs
WHERE start_time > NOW()
ORDER BY start_time ASC
LIMIT 1');
$stmt->execute();
return $stmt->fetch() ?: null;
}


function updateProgram(PDO $pdo, int $id, string $name, string $performer, string $start_time): bool {
$stmt = $pdo->prepare('UPDATE programs SET name=?, performer=?, start_time=? WHERE id=?');
return $stmt->execute([$name, $performer, $start_time, $id]);
}


function deleteProgram(PDO $pdo, int $id): bool {
$stmt = $pdo->prepare('DELETE FROM programs WHERE id=?');
return $stmt->execute([$id]);
}


function h(string $s): string {
return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function addProgram(PDO $pdo, string $name, string $performer, string $start_time): bool {
    $stmt = $pdo->prepare('INSERT INTO programs (name, performer, start_time) VALUES (?, ?, ?)');
    return $stmt->execute([$name, $performer, $start_time]);
}
