# Text2img（前端工具） ✨

一个基于 Vue 3 + Vite 的前端工具，用于对接 Flow2API 的图像/视频生成能力，支持文本提示词与参考图片、多并发请求、流式解析、超时配置与违规提示展示。

## 功能概览 🖼️

- 🖌️ 文生图与图生图：输入提示词，可选上传参考图片，生成结果在右侧预览展示
- 🔀 多并发请求：并发数即同一提示词与图片同时提交的请求次数（并发设为 4 → 预期返回 4 张图）
- 📡 流式解析：SSE 事件流读取，兼容 Markdown 格式返回 `![Generated Image](url)` 与结构化字段
- ⏱️ 超时控制：每个请求独立超时（默认 240 秒），支持在界面配置并“应用”后生效
- 🚫 违规提示：正常回复但未检测到图片 URL 时，显示“内容违规或连接错误”的角标提示
- 🗂️ 历史与预览：生成结果列表、下载与复制提示词、历史持久化与分页

## 技术栈 🧰

- 前端：`Vue 3`、`TypeScript`、`Element Plus`、`Pinia`、`Vue Router`
- 网络：`fetch`（流式）与 `axios`（非流式的模型列表）
- 构建与开发：`Vite`

## 快速开始 🚀

```bash
npm install
npm run dev
```

默认开发地址为 `http://localhost:5173`（若占用端口则切换到其他端口）。

## 环境与配置 ⚙️

- 环境变量：
  - `VITE_API_BASE_URL`：后端 API 基址（必须配置，示例：`https://your-api-host/`）
  - `VITE_API_KEY`：后端鉴权密钥（与 Flow2API 管理后台配置一致）

### 配置步骤 📝

```
cp .env.example .env.local
# 编辑 .env.local，设置你的 API 地址与密钥
# VITE_API_BASE_URL=https://your-api-host/
# VITE_API_KEY=replace-with-your-api-key
```

`.env.local` 不会随仓库提交（已在 `.gitignore` 中忽略），请在你的本地或部署环境中配置。

## 使用说明 📖

1. 在左侧输入提示词；可选上传参考图片（JPG/PNG/WebP，≤10MB）
2. 选择模型并可从后端拉取最新模型列表
3. 设置并发数（1–10）：表示提交同一提示词与图片的请求次数
4. 设置超时（5–600 秒）并点击“应用”按钮后生效
5. 点击“开始生成”，右侧按请求逐张显示生成结果；每个请求独立处理成功/失败/超时

### 参考图片与请求体 🖼️

- 上传后在前端转为 `data:image/<mime>;base64,<...>` 并置入 `messages[-1].content` 的数组项：
  ```json
  {
    "type": "image_url",
    "image_url": { "url": "data:image/jpeg;base64,<base64>" }
  }
  ```
- 文生图则直接传字符串内容至 `messages[-1].content`。

### 流式返回解析 🌊

- 后端采用 SSE（`text/event-stream`），在生成完成时，以 Markdown 文本（`choices[0].delta.content`）返回：
  - `![Generated Image](<url>)`
  - 随后发送 `[DONE]` 结束信号
- 前端会即时解析事件中的 URL；若未检测到图片 URL，则标记为“内容违规或连接错误”。

## 支持的模型（参考 Flow2API） 🎛️

请查看 Flow2API 的 README“支持的模型”一节（https://github.com/TheSmallHanCat/flow2api），常见示例：

- 🖼️ 图片生成：
  - `gemini-2.5-flash-image-landscape`（横屏）
  - `gemini-2.5-flash-image-portrait`（竖屏）
  - `gemini-3.0-pro-image-landscape` / `gemini-3.0-pro-image-portrait`
  - `imagen-4.0-generate-preview-landscape` / `imagen-4.0-generate-preview-portrait`
- 🎬 文生视频（T2V，不支持图片）：
  - `veo_3_1_t2v_fast_portrait` / `veo_3_1_t2v_fast_landscape`
  - `veo_2_1_fast_d_15_t2v_portrait` / `veo_2_1_fast_d_15_t2v_landscape`
  - `veo_2_0_t2v_portrait` / `veo_2_0_t2v_landscape`
- 🎞️ 首尾帧视频（I2V，支持 1–2 张图片）与 🧩 多图生成（R2V，支持多图）也可参考上述 README 中的列表与说明。

## 前端架构 🏗️

- 入口与布局 🔌：
  - `src/main.ts:1-21` 挂载应用，注册 Pinia、Router、Element Plus 与图标
  - `src/App.vue:8-29` 顶栏与主内容布局
- 路由 🧭：`src/router/index.ts:5-19`（主页与历史页）
- 状态 🗃️：
  - `src/stores/generation.ts:14-28,59-76,98-115` 生成项、并发与本地持久化
  - `src/stores/history.ts:5-23,24-47,58-77` 历史列表、分页与持久化
- 服务 🧠：
  - `src/services/aiApi.ts` 流式 `fetch` 解析、URL 提取与并发队列；超时可配置
- 视图 🖥️：
  - `src/views/HomeView.vue` 表单、并发、超时设置与结果展示
  - `src/views/HistoryView.vue` 历史页（分页/批量操作）

## 常见问题 ❓

- 🚫 返回为违规或未检测到图片 URL 时：前端显示“内容违规或连接错误”的提示角标，并保留占位区域
- 🔑 API 鉴权失败（401/403）：请检查 `VITE_API_KEY` 与后端一致
- ⏱️ 超时与并发：每个请求独立超时（默认 240 秒），并发请求按 3 秒间隔依次启动

## 后端错误与排查指引 🛠️

更多细节请参考文档：[`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

## 开发命令 📦

```bash
npm run dev      # 启动开发
npm run build    # 生产构建
npm run lint     # 代码规范检查与修复
```

---
