#!/usr/bin/env php
<?php
require_once __DIR__ . '/../lib/helpers.php';

$usage = "Usage: php import_csv.php path/to/file.csv\nCSV columns: start_time(YYYY-MM-DD HH:MM), name, performer\n";

if ($argc < 2) {
    fwrite(STDERR, $usage);
    exit(1);
}

$path = $argv[1];
if (!is_readable($path)) {
    fwrite(STDERR, "File not readable: $path\n");
    exit(1);
}

$fh = fopen($path, 'r');
if (!$fh) { fwrite(STDERR, "Fail to open file.\n"); exit(1);}

$pdo->beginTransaction();
try {
    $lineNo = 0;
    $stmt = $pdo->prepare('INSERT INTO programs (name, performer, start_time) VALUES (?,?,?)');
    while (($row = fgetcsv($fh)) !== false) {
        $lineNo++;
        if ($lineNo === 1 && preg_match('/start/i', implode(',', $row))) {
            // 若首行是表头则跳过
            continue;
        }
        if (count($row) < 3) { continue; }
        [$start, $name, $performer] = $row;
        $dt = DateTime::createFromFormat('Y-m-d H:i', trim($start));
        if (!$dt) { continue; }
        $stmt->execute([trim($name), trim($performer), $dt->format('Y-m-d H:i:00')]);
    }
    fclose($fh);
    $pdo->commit();
    fwrite(STDOUT, "OK: imported.\n");
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, "Error: " . $e->getMessage() . "\n");
    exit(1);
}
