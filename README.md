# Codex Usage Rings

Windows 桌面上的 Codex 用量悬浮圆环：外圈显示 5 小时额度已使用比例，内圈显示每周额度已使用比例。鼠标悬停可查看百分比和下次重置时间，右键组件可退出。

## Windows 使用

需要 Windows、PowerShell 7、Node.js、已安装并登录的 Codex CLI。项目使用 npm 全局安装的 Codex CLI（`%APPDATA%/npm/node_modules/@openai/codex`）。

在项目目录中运行：

```powershell
& './Start.ps1'
```

再次运行不会重复启动。组件跟随标题为 `ChatGPT` 的桌面窗口；关闭窗口后组件会自动退出。数据通过本机 Codex app-server 读取，每分钟刷新一次，未能更新时会标记数据过期。运行时的 `usage.json` 已加入 `.gitignore`。

如需移除，右键退出后删除本文件夹即可。不会修改 Codex 安装文件或登录凭据。


## macOS 版本

原生 AppKit 悬浮双圆环，通过系统 JavaScript for Automation 构建，无需 Xcode。已在 macOS 13.7.8 和 Codex CLI 0.159.2 上验证。

### 构建与启动

需要 Node.js 22+、已安装并登录的 Codex CLI，以及 Codex 桌面应用。Node 与 CLI 必须在终端 PATH 中可用。

```sh
chmod +x build.sh
./build.sh
open "Codex Usage Rings.app"
```

构建时自动记录本机 Node 与 Codex CLI 路径；生成的 `mac/runtime.json` 不提交。依赖升级或移动后需退出圆环，将旧 `.app` 移开，再重新构建。构建产物使用本地 ad-hoc 签名，未做 Apple 公证。

### 操作与显示规则

- 粉色外圈显示 5 小时已用额度，绿色内圈显示每周已用额度，每分钟刷新。
- 24 点圆环默认位于侧栏头像上方，圆心距主窗口左侧 26 点、底部 60 点。拖动可调整并保存相对位置。
- 鼠标停留约 0.35 秒显示详情框，包含百分比与重置时间。
- Codex 在前台且主窗口可见时显示；普通应用切到前台、主窗口最小化或关闭时隐藏。
- 从 Codex 切入截图工具时，识别到截图覆盖层可临时保留最多 20 秒。微信覆盖层依据窗口元数据识别，不同微信版本仍需实际验证。
- 右键可立即刷新、重置位置、退出。
- 使用 CLI 当前登录账户，不修改 Codex 安装文件或登录凭据，不发送模型请求。

窗口识别适配 `com.openai.codex`，以面积最大的普通窗口作为主窗口。多主窗口、不同侧栏布局与多屏幕环境仍需进一步人工验证；头像对齐可拖动微调。

缓存与运行状态存放在 `~/Library/Application Support/CodexUsageRings/`。超过三分钟未更新会标记数据过期。退出圆环后删除应用即可移除，不默认设置开机启动。

### 验证

```sh
node --test tests/*.cjs
```

测试覆盖额度窗口识别、过期数据、窗口定位、最小化隐藏、前台应用显隐、截图例外和悬停重置时间。
