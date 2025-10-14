<?php
// lib/db.php

$config = require __DIR__ . '/../config/config.php';

$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['db']['host'],
    $config['db']['port'],
    $config['db']['dbname'],
    $config['db']['charset']
);

try {
    $pdo = new PDO($dsn, $config['db']['user'], $config['db']['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    die('Database connection failed: ' . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8'));
}

// 设置时区
if (!empty($config['timezone'])) {
    date_default_timezone_set($config['timezone']);
}
