# 贡献指南

- 准备环境：Node.js 20+（或 22+），npm
- 安装依赖：`npm ci`
- 配置环境：复制 `.env.example` 为 `.env.local`，填写后端基址与密钥
- 开发：`npm run dev`
- 构建：`npm run build`
- 规范检查：`npm run lint`、`npm run type-check`

## 提交规范

- 提交信息建议采用前缀：
  - `feat:` 新功能
  - `fix:` 修复问题
  - `docs:` 文档更新
  - `chore:` 日常维护
  - `refactor:` 重构

## 分支与PR

- 从 `main` 创建功能分支并提交 PR
- PR 应说明变更点、验证方式与影响范围
