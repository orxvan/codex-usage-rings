# Codex Usage Rings

Windows 桌面上的 Codex 用量悬浮圆环：外圈显示 5 小时额度已使用比例，内圈显示每周额度已使用比例。鼠标悬停可查看百分比和下次重置时间，右键组件可退出。

## 使用

需要 Windows、PowerShell 7、Node.js、已安装并登录的 Codex CLI。项目使用 npm 全局安装的 Codex CLI（`%APPDATA%/npm/node_modules/@openai/codex`）。

在项目目录中运行：

```powershell
& './Start.ps1'
```

再次运行不会重复启动。组件跟随标题为 `ChatGPT` 的桌面窗口；关闭窗口后组件会自动退出。数据通过本机 Codex app-server 读取，每分钟刷新一次，未能更新时会标记数据过期。运行时的 `usage.json` 已加入 `.gitignore`。

如需移除，右键退出后删除本文件夹即可。不会修改 Codex 安装文件或登录凭据。
