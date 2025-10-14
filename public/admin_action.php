<?php
require_once __DIR__ . '/../lib/helpers.php';

// 验证 CSRF token
if (session_status() === PHP_SESSION_NONE) session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrfPost = $_POST['csrf_token'] ?? '';
    $csrfSession = $_SESSION['csrf_token'] ?? '';
    if (!hash_equals($csrfSession, $csrfPost)) {
        http_response_code(403);
        die('Forbidden: invalid CSRF token');
    }
    $action = $_POST['action'] ?? '';
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;

    if ($action === 'update') {
        $name = trim($_POST['name'] ?? '');
        $performer = trim($_POST['performer'] ?? '');
        $start_time = trim($_POST['start_time'] ?? '');

        if ($name && $performer && $start_time) {
            $dt = DateTime::createFromFormat('Y-m-d\\TH:i', $start_time);
            if ($dt) {
                updateProgram($pdo, $id, $name, $performer, $dt->format('Y-m-d H:i:00'));
            }
        }
    } elseif ($action === 'delete') {
        deleteProgram($pdo, $id);
    } elseif ($action === 'add') {
        $name = trim($_POST['name'] ?? '');
        $performer = trim($_POST['performer'] ?? '');
        $start_time = trim($_POST['start_time'] ?? '');

        if ($name && $performer && $start_time) {
            $dt = DateTime::createFromFormat('Y-m-d\\TH:i', $start_time);
            if ($dt) {
                addProgram($pdo, $name, $performer, $dt->format('Y-m-d H:i:00'));
            }
        }
    }
}

header('Location: admin.php');
exit;
