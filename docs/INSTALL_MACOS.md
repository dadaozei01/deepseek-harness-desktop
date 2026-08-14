# macOS 安装说明

## 选择正确版本

- Apple Silicon（M1/M2/M3/M4 及后续）：`DeepSeek-Harness-Desktop-0.1.1-macOS-arm64.dmg`
- Intel Mac：`DeepSeek-Harness-Desktop-0.1.1-macOS-x64.dmg`

可在“关于本机”查看芯片，或在终端运行 `uname -m`：`arm64` 选择 Apple Silicon，`x86_64` 选择 Intel。

## 下载与校验

从本仓库的 GitHub Release 同时下载 DMG 和 `SHA256SUMS.txt`。在下载目录运行：

```bash
shasum -a 256 DeepSeek-Harness-Desktop-0.1.1-macOS-arm64.dmg
```

Intel Mac 请替换为 x64 文件名。把输出与 `SHA256SUMS.txt` 中对应行比较；不一致时不要打开文件。

## 安装

1. 打开 DMG。
2. 将 `DeepSeek Harness Desktop` 拖入“应用程序”文件夹。
3. 弹出 DMG。

当前版本没有 Apple Developer ID 签名。首次启动时，在 Finder 的“应用程序”中找到应用，右键（right-click）选择“打开”，再次确认“打开”。也可以在系统设置的“隐私与安全性”中核对应用后允许打开。不要通过关闭 Gatekeeper 或批量移除隔离属性来绕过系统保护。

## 首次启动与本地数据

应用会自动启动仅监听 `127.0.0.1` 的 Harness 服务。在界面中配置模型服务商并选择工作区。Harness 数据通常保存在 `$HOME/.dsh`；卸载应用不会删除该目录。

## 卸载

退出应用，将“应用程序”中的 `DeepSeek Harness Desktop` 移到废纸篓。若希望彻底删除配置和会话，请先备份，再单独删除 `$HOME/.dsh`。

## 常见问题

- 提示应用已损坏或无法验证：确认文件来自本仓库 Release 且校验和一致，再使用上面的右键“打开”流程。
- 版本无法运行：确认 DMG 架构与 Mac 芯片一致。
- 端口冲突：应用会尝试 `3080` 到 `3100`，请释放其中至少一个端口。
