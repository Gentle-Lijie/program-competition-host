#!/usr/bin/env php
<?php
require_once __DIR__ . '/../lib/helpers.php';

$usage = "Usage: php add_program.php \"开始时间(YYYY-MM-DD HH:MM)\" \"节目名称\" \"表演者\"\n";

if ($argc < 4) {
    fwrite(STDERR, $usage);
    exit(1);
}

// for 

$start = $argv[1];
$name = $argv[2];
$performer = $argv[3];

// 基本校验
$dt = DateTime::createFromFormat('Y-m-d H:i', $start);
if (!$dt) {
    fwrite(STDERR, "Invalid datetime format. Expect: YYYY-MM-DD HH:MM\n");
    exit(1);
}

$stmt = $pdo->prepare('INSERT INTO programs (name, performer, start_time) VALUES (?,?,?)');
$stmt->execute([$name, $performer, $dt->format('Y-m-d H:i:00')]);

fwrite(STDOUT, "OK: added #" . $pdo->lastInsertId() . "\n");
