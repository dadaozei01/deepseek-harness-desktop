# Windows 安装说明

## 适用系统

- Windows 10/11，x64 处理器
- 安装文件：`DeepSeek-Harness-Desktop-0.1.1-Windows-x64.exe`

安装包已经内置运行环境，不需要安装 Node.js 或 pnpm。

## 下载与校验

从本仓库的 GitHub Release 同时下载 EXE 和 `SHA256SUMS.txt`。在下载目录打开 PowerShell：

```powershell
Get-FileHash '.\DeepSeek-Harness-Desktop-0.1.1-Windows-x64.exe' -Algorithm SHA256
```

把输出值与 `SHA256SUMS.txt` 中对应文件的值逐字比较。不同则不要运行，并重新下载。

## 安装

1. 双击 EXE。
2. 选择当前用户安装位置并完成安装。
3. 从开始菜单或桌面快捷方式启动。

当前版本没有商业代码签名，因此 Windows SmartScreen 可能显示“Windows 已保护你的电脑”。只有在下载地址确实属于本仓库、且 SHA-256 校验一致时，才点击“更多信息”，核对应用名称，然后选择“仍要运行”。

## 首次启动

应用会自动启动仅监听 `127.0.0.1` 的本地 Harness 服务，并在桌面窗口打开界面。随后在设置页配置模型服务商并选择工作区。密钥由 Harness 本地配置管理，桌面外壳不会读取或上传密钥。

## 数据与卸载

应用数据通常位于 `%USERPROFILE%\.dsh`。卸载应用不会删除该目录，因此重装可以继续使用原配置。如需彻底清理，请先备份必要会话，再手动删除该目录。

## 常见问题

- 窗口未出现：先在任务管理器结束旧的 DeepSeek Harness Desktop 进程，再重启。
- 安装包被拦截：重新从 GitHub Release 下载并再次核对 SHA-256，不要从不明镜像获取。
- 端口冲突：程序会自动尝试 `3080` 到 `3100`；全部被占用时，请关闭占用程序后重试。
