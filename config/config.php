<?php
// 配置文件：优先使用环境变量，未设置时使用默认值
return [
    // MySQL 连接（可通过环境变量覆盖）
    'db' => [
        'host' => getenv('MYSQL_HOST') ?: '127.0.0.1',
        'port' => getenv('MYSQL_PORT') ? (int)getenv('MYSQL_PORT') : 3306,
        'dbname' => getenv('MYSQL_DATABASE') ?: 'program_schedule',
        'user' => getenv('MYSQL_USER') ?: 'root',
    // 默认占位密码，请务必在生产环境通过环境变量覆盖
    'pass' => getenv('MYSQL_PASSWORD') ?: '',
        'charset' => 'utf8mb4',
    ],

    // 时区（影响“当前时间”的计算）
    'timezone' => getenv('APP_TIMEZONE') ?: 'Asia/Shanghai', // 可改为 Asia/Taipei 等
];
