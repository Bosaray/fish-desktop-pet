'use strict';
// 复用实际通过验证的本地 Electron；缺少运行时才由官方安装器下载。
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const runtime = require('electron');
const target = process.argv.includes('--dir') ? ['--win', '--dir'] : ['--win', 'portable'];
const result = spawnSync(process.execPath, [require.resolve('electron-builder/cli.js'), ...target, '--config.electronDist=' + path.dirname(runtime)], { stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
