#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"
APP="$PWD/Codex Usage Rings.app"
if [[ -e "$APP" ]]; then echo '应用已存在；请退出并移开旧版本后重新构建。' >&2; exit 1; fi
command -v node >/dev/null || { echo '请先安装 Node.js 22 或更高版本。' >&2; exit 1; }
CODEX_BIN="$(command -v codex)" || { echo '请先安装并登录 Codex CLI。' >&2; exit 1; }
node - "$CODEX_BIN" <<'JS'
const fs = require('node:fs');
fs.writeFileSync('mac/runtime.json', JSON.stringify({node: process.execPath, codex: process.argv[2]}, null, 2));
JS
osacompile -l JavaScript -s -o "$APP" mac/Rings.js
cp -R mac "$APP/Contents/Resources/mac"
/usr/libexec/PlistBuddy -c 'Add :LSUIElement bool true' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :CFBundleIdentifier string local.codex.usage-rings.macos' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :LSMinimumSystemVersion string 10.13' "$APP/Contents/Info.plist"
codesign --force --sign - "$APP"
echo "$APP"
