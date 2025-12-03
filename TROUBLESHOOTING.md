# 后端错误与排查指引

- 401/403 未授权
  - 检查 `VITE_API_KEY` 是否与后端一致，前端以 `Authorization: Bearer <key>` 发送
  - 在管理后台确认密钥启用与权限（Flow2API 管理后台）
  - 使用 `GET <BASE_URL>/v1/models` 验证密钥与权限

- 404 路径错误
  - 确认接口路径：`POST <BASE_URL>/v1/chat/completions`、`GET <BASE_URL>/v1/models`
  - 检查 `VITE_API_BASE_URL` 是否包含协议与主机名、斜杠拼接是否正确

- 5xx 服务异常
  - 查看后端日志与负载情况，尝试降低并发或拉长超时
  - 确认后端是否支持 SSE 流式返回

- CORS 浏览器跨域报错
  - 在后端或反向代理开启跨域允许（来源、方法、头部）
  - 本项目不使用本地代理，需后端自行配置 CORS

- SSE/流式解析失败或中断
  - 前端请求头需包含 `Accept: text/event-stream`
  - 服务端应按行返回：`data: {json}`，并以 `[DONE]` 结束
  - 网络中断或连接提前关闭会导致解析失败

- 超时/生成过慢
  - 提高界面中的超时设置（建议 240–600 秒）
  - 降低并发请求数量，避免排队或限流
  - 检查后端生成耗时与队列状态

- 模型不可用或未找到
  - 通过 `GET /v1/models` 拉取列表，确认模型 ID 是否存在
  - 更换同类模型或参考 Flow2API 支持列表

- 返回无图片 URL（违规或映射问题）
  - 期望返回 Markdown `![Generated Image](url)` 或结构化 `choices[].message.content[].image_url.url`
  - 若返回 Base64，前端将以 `data:image/png;base64,<...>` 兜底显示

## 快速自测命令

- 获取模型

```
curl -H "Authorization: Bearer $VITE_API_KEY" <BASE_URL>/v1/models
```

- 触发流式生成

```
curl -H "Authorization: Bearer $VITE_API_KEY" \
     -H "Content-Type: application/json" \
     -H "Accept: text/event-stream" \
     -d '{"model":"gemini-2.5-flash-image-landscape","messages":[{"role":"user","content":[{"type":"text","text":"一只猫"}]}],"stream":true}' \
     <BASE_URL>/v1/chat/completions
```
