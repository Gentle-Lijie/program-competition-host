# 贡献指南

感谢你关注并希望为本项目贡献！简单的流程：

1. Fork 本仓库
2. 新建分支实现你的改动（feature/xxx 或 fix/xxx）
3. 在 PR 中描述变更目的与测试步骤
4. 我们会尽快 review 并合并

代码规范

- `server/`：Node.js（ESM）+ better-sqlite3，一律使用 prepared statements
- `web/`：Vue 3 + TypeScript + Tailwind v4 + shadcn-vue，提交前运行 `npm run build` 与 `npm test`
- 提交信息请简洁明了

测试

- `npm test`：`programState.ts` 纯函数单元测试（vitest）
- 提交前请手动走一遍核心路径：大屏加载、提示栏切换、扫码签到、后台增删改
