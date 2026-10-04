# cuckoo-doubao

为 [Cuckoo Code](https://github.com/wangyongpeng90/cuckoo-code) 添加**豆包（doubao.com）**平台支持。

## 这是什么

一个 Cuckoo Code 插件（plugin）。安装后，新建窗口即可在平台选择页看到「豆包」，支持登录、对话、工具调用。

- 网络拦截模式（SSE），自动捕获豆包回复
- 支持发送（Enter 键）、会话识别、用户信息提取
- 纯平台适配，不含任何风控绕过逻辑

## 安装

**方式一：插件市场**
Cuckoo Code → 侧边栏「插件」→ 市场 → 搜索 doubao → 安装 → 启用。

**方式二：手动**
1. 把本仓库内容放到 `%USERPROFILE%\.cuckoo\plugins\cuckoo-doubao\`
2. 编辑 `%USERPROFILE%\.cuckoo\plugins-state.json`：
   ```json
   { "cuckoo-doubao": { "enabled": true } }
   ```
3. 重启 Cuckoo Code

## 要求

- Cuckoo Code >= 0.8.8（插件系统）
- 豆包账号（自行登录）

## 结构

```
plugin.json          # 插件清单
providers/doubao.js  # 豆包 provider（自包含，含网络拦截 hook）
```

## 许可

MIT
