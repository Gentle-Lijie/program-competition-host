#!/usr/bin/env php
<?php
require_once __DIR__ . '/../lib/helpers.php';

$rows = fetchAllPrograms($pdo);
foreach ($rows as $r) {
    echo sprintf("%5d  %s  %-20s  %-20s\n",
        $r['id'],
        (new DateTime($r['start_time']))->format('Y-m-d H:i'),
        $r['name'],
        $r['performer']
    );
}
