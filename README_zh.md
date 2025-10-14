# 节目比赛管理（Program Competition Host）

这是一个轻量的 PHP 应用，用于管理演出/节目日程、计分和展示（适合学校/社团/现场活动）。

功能概述：
- 管理节目（新增/编辑/删除）
- 记录与展示节目得分
- 提供前端展示页面用于大屏播放

主要文件结构：
- `public/` - 对外的前端与 API 页面（例如 `admin.php`、`score_api.php`、`index.html`）
- `lib/` - 核心库：`db.php`（数据库连接）、`helpers.php`（常用函数）
- `config/` - 默认配置 `config.php`
- `cli/` - 命令行脚本（导入/列出/添加节目）
- `create_database.sql` - 建库与表结构

快速开始（使用 Docker）

1. 复制配置（可选）

   项目默认读取 `config/config.php`，并且支持通过环境变量覆盖数据库设置。若要本地运行，可修改 `config/config.php` 中的默认值，或在 Docker 环境中通过 `docker-compose.yml` 传递环境变量。

2. 使用 Docker（推荐）

   - 构建并启动服务：

   ```bash
   docker-compose up --build -d
   ```

   - 服务包括：PHP-FPM + Nginx（用于静态页面）和 MariaDB（数据库）。

3. 导入数据库结构

   在容器内或本地使用 `create_database.sql` 建表：

   ```bash
   docker-compose exec db sh -c 'mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" < /docker-entrypoint-initdb.d/create_database.sql'
   ```

4. 打开后台管理页面

   默认管理页面： `http://localhost:8080/admin.php`

配置说明（环境变量，优先级高于 config 文件）：

- MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD
- APP_TIMEZONE（例：Asia/Shanghai）

运行环境与安全建议：

- 推荐 PHP 版本：8.0+，并启用 `pdo_mysql` 扩展。Dockerfile 使用 `php:8.1-fpm-alpine`。
- 推荐数据库：MariaDB / MySQL 10.x。
- 严禁在生产环境使用仓库中的默认数据库密码（若使用 Docker，请在 `docker-compose.yml` 中设置强密码）。
- 建议不要将 `admin.php` 公开暴露到公网。若需公网访问，请在反向代理（Nginx）上启用基本认证或其他访问控制。示例：使用 Nginx 的 HTTP Basic Auth 或将管理面板放在受保护网络中。
- 若需调试数据库连接错误，可在环境中设置 `SHOW_PDO_ERRORS=1`，但请勿在生产环境长期开启。

贡献

欢迎 PR。请阅读 `CONTRIBUTING.md` 了解提交规范。

许可证

本项目采用 MIT 许可证，详见 `LICENSE`。

本地配置覆盖

如果你不想通过环境变量，可以复制示例文件 `config/local.php.example` 为 `config/local.php` 并修改数据库密码等私密配置。`config/local.php` 已在 `.gitignore` 中被忽略，请确保不要将包含凭证的文件提交到仓库。
