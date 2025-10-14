# 节目比赛管理（Program Competition Host）

一个轻量、可部署到局域网或小型活动的 PHP 程序，用于：

- 管理节目日程（新增 / 编辑 / 删除）
- 记录并展示节目得分（可用于大屏展示）
- 提供简单的管理后台与 API，便于第三方集成

本仓库旨在提供一个易上手的基础实现，便于在校园活动、社团或小型演出场景快速部署与定制。

----

目录结构（重要文件）：

- `public/`：对外页面与 API（如 `admin.php`, `score_api.php`, `index.html` 等）
- `lib/`：核心库（`db.php`：DB 连接；`helpers.php`：常用函数）
- `config/`：配置（`config.php` 为默认配置，支持环境变量覆盖）
- `cli/`：命令行脚本（导入 CSV、添加节目等）
- `create_database.sql`：数据库建表脚本

----

快速开始（推荐：Docker）

先决条件：Docker 与 docker-compose 已安装。

1. 克隆仓库并进入目录：

```bash
git clone https://github.com/Gentle-Lijie/program-competition-host.git
cd program-competition-host
```

2. 编辑配置（可选）：

有两种方式覆盖默认配置：

- 环境变量（推荐）：在 `docker-compose.yml` 中编辑 `MYSQL_*` / `APP_TIMEZONE` 等变量；Docker 启动时会注入到容器中。
- 本地文件（适合开发）：复制 `config/local.php.example` 为 `config/local.php` 并修改（`config/local.php` 已被 `.gitignore` 忽略，便于本地保存凭证）。

3. 启动服务：

```bash
docker-compose up --build -d
```

4. 初始化数据库（容器方式）：

```bash
docker-compose exec db sh -c 'mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" < /docker-entrypoint-initdb.d/create_database.sql'
```

5. 打开管理页面：

访问 `http://localhost:8080/admin.php`（或根据你的端口映射调整）。

----

非 Docker 快速运行（PHP 环境）

1. 确保安装 PHP 8.0+，并启用 `pdo_mysql` 扩展。安装 MySQL/MariaDB 并创建数据库。 
2. 复制 `config/local.php.example` 为 `config/local.php` 并配置数据库连接。 
3. 将 `public/` 目录设置为 Web 根或配置 Nginx/Apache 指向 `public/`，然后访问 `admin.php`。

----

配置说明

优先级：环境变量 > `config/local.php`（如果存在）> `config/config.php` 默认值。

常见环境变量：

- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `APP_TIMEZONE`（例如 `Asia/Shanghai`）
- `SHOW_PDO_ERRORS`（可选：设置为 `1` 时在页面显示 PDO 错误，仅用于开发调试）

本地覆盖示例：

```php
// config/local.php
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'dbname' => 'program_schedule',
        'user' => 'root',
        'pass' => 'your_strong_password',
    ],
    'timezone' => 'Asia/Shanghai',
];
```

----

安全建议（必须阅读）

- 切勿在生产环境使用弱口令或仓库中的示例密码。始终通过环境变量或 `config/local.php` 设置强密码。
- 管理后台（`admin.php` / `admin_action.php`）应仅在内部网络访问或通过反向代理做访问控制（建议使用 Nginx basic auth 或 OAuth）。
- 已添加简单 CSRF 保护，但如果你需要更严格的认证/授权，请在前端/反向代理层或在 PHP 中添加登录认证。
- 在生产环境不要开启 `SHOW_PDO_ERRORS` 或 PHP 的 `display_errors`，以免泄露敏感信息。

----

开发与贡献

欢迎贡献：修复 bug、增加功能或改进文档。提交流程请参照 `CONTRIBUTING.md`。

开发建议：

- 推荐 PHP 版本：8.0+，并启用 `pdo_mysql`。Dockerfile 使用 `php:8.1-fpm-alpine`。
- 在提交前运行 `php -l` 做语法检查。

如果你是第一次贡献，以下是快速步骤：

1. Fork 本仓库
2. 新建分支 `feature/xxx` 或 `fix/xxx`
3. 提交并发起 PR，描述变更与测试步骤

----

常见问题（FAQ）

Q: 如何导入已有 CSV 节目单？
A: 使用 `cli/import_csv.php`，查看脚本头部注释了解用法。

Q: 如何改变大屏样式？
A: 修改 `public/screen.php` 和 `public/screen_bg.php` 中的 CSS/模板。

Q: 我想把管理端做认证，有示例吗？
A: 我可以帮你添加两种示例：PHP 层的简单 Basic Auth 或 Nginx 层的 Basic Auth。回复选择其中一种即可。

----

许可证

本项目采用 MIT 许可证。详情见仓库中的 `LICENSE` 文件。

----

更新历史（简要）

- 2025-10-14：改进 README、增加 Docker 支持、添加 CSRF 防护与若干安全改进。

