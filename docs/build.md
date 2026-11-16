# Windows 构建

需要 Windows 10/11 x64、Node.js/npm、.NET SDK 和 Windows .NET Framework 4.x 引用程序集。

在仓库根目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-native.ps1
cd app
npm ci
npm test
npm run dist -- --dir
```

桌面桥会编译到 `app/helper/NativeDesktop.exe`；最后一步生成未压缩的测试程序，不会安装或启动桌宠。运行 `npm run dist` 可尝试打包便携版。依赖和 Electron 的下载需要联网。

这些自动检查不覆盖所有桌面交互；依赖旧备份和审查工具的三组测试暂未纳入，仍需迁移。未在其他电脑验证。
