# DeepSeek Harness Desktop 跨平台发行设计

## 目标

创建公开仓库 `dadaozei01/deepseek-harness-desktop`，将 DeepSeek 官方 Harness 封装成可直接安装的 Windows 与 macOS 桌面应用。最终用户无需预装 Node.js、pnpm，也不需要在首次启动时下载或构建依赖。

## 定位与来源

本项目是 DeepSeek Harness 的非官方桌面发行封装，不冒充 DeepSeek 官方产品。README、应用说明和 Release 页面必须明确标注上游项目为 `deepseek-ai/deepseek-harness`，并标明实际打包的 `@deepseek-ai/dsh` 版本。

仓库不复制上游完整 monorepo。它只保存桌面外壳、启动逻辑、打包配置、测试和 CI 工作流，并通过固定版本依赖使用官方 npm 包。这样可以缩小维护范围，并让每个发行包的上游版本可追踪、可复现。

## 发行方案

采用包含完整运行环境的 Electron 安装包，不采用十几 MB 的在线自解压安装器。构建阶段下载并打包 Node/Electron/Harness 依赖；用户安装和首次启动阶段不执行 `npm install`，也不依赖 npm 或 npmmirror。

首版生成以下资产：

- Windows x64：NSIS 安装程序 EXE。
- macOS arm64：适用于 Apple Silicon 的 DMG。
- macOS x64：适用于 Intel Mac 的 DMG。
- 每个平台资产对应的 SHA-256 校验清单。

安装包预计约 100–200 MB。首版不包含自动更新器，用户从 GitHub Releases 手动下载新版本。

## 运行架构

Electron 主进程负责启动随应用分发的 DeepSeek Harness Web profile。服务仅绑定 `127.0.0.1`，从 3080 开始探测端口，最多检查到 3100；找到空闲端口后启动服务，并等待健康检查成功。

服务就绪后创建 Electron `BrowserWindow` 并加载本地 URL。窗口关闭时终止后台 Harness 子进程；后台服务异常退出时关闭应用并记录明确错误。外部 HTTP/HTTPS 链接交给系统默认浏览器，不允许在应用窗口内任意导航。

## 安全边界

Electron 窗口必须使用以下设置：

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- 不暴露通用 IPC 或任意命令执行接口给渲染页面
- Harness HTTP 服务只监听回环地址

应用不自行收集、记录或上传 API Key。模型凭据沿用 Harness 自身的本地配置机制。构建依赖必须使用锁文件固定，GitHub Actions 发布资产同时生成 SHA-256。

## 签名与系统提示

首版不配置 Windows 代码签名和 Apple Developer ID 签名，因为当前没有对应证书。Windows 可能显示“未知发布者”；macOS 用户首次需要右键应用并选择“打开”。文档必须如实说明该限制，不提供绕过系统安全机制的自动脚本。

未来获得证书后，可以在不改变运行架构的情况下加入 Windows Authenticode、macOS Developer ID 签名和 Apple notarization。

## GitHub 自动构建与发布

GitHub Actions 使用两个原生构建环境：

- `windows-latest` 构建 Windows x64 EXE。
- `macos-latest` 分别构建 macOS arm64 与 x64 DMG。

普通 push 和 pull request 执行测试与打包验证，但不发布资产。推送符合 `v*` 的版本标签时创建 GitHub Release，上传三个安装包和校验文件。工作流不得在日志中打印任何令牌或模型凭据。

## 版本策略

桌面封装使用独立的语义版本。`package.json` 同时固定桌面版本与官方 `@deepseek-ai/dsh` 版本。Release 说明必须列出两者，例如“Desktop v0.1.0，bundles DeepSeek Harness 0.1.0-rc.6”。

上游升级通过依赖版本更新完成，并在发布前重新运行启动、端口、生命周期和打包测试。

## 测试与验收

自动测试覆盖：

- 从 3080 开始选择第一个空闲端口。
- 端口被占用时递增选择。
- 后台服务启动失败和超时时返回可读错误。
- 关闭应用时终止后台子进程。
- 外部链接只交给系统浏览器。
- Electron 安全选项保持启用。

CI 验收要求：

- Windows 和 macOS 测试通过。
- 三个平台目标均能生成安装资产。
- 资产命名稳定且包含架构。
- SHA-256 清单覆盖所有发行资产。
- 安装包内不要求用户系统提供 Node.js 或 pnpm。

## 非目标

首版不实现自动更新、代码签名、公证、Linux 安装包、自定义插件市场、上游源码修改或模型 API 代理。上述功能可在基础发行流程稳定后独立设计。
