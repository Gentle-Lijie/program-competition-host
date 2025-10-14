<?php
return [
    // MySQL 连接（根据你的环境调整）
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'dbname' => 'program_schedule',
        'user' => 'root',
        'pass' => '123456',
        'charset' => 'utf8mb4',
    ],

    // 时区（影响“当前时间”的计算）
    'timezone' => 'Asia/Shanghai', // 可改为 Asia/Taipei 等
];
