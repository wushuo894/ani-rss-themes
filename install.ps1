# ani-rss 替代 WebUI 一键安装（Windows PowerShell）
#
#   irm https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.ps1 | iex
#
# 非交互（先设环境变量再执行）：
#   $env:ANIRSS_WEBUI_DIR = 'D:\ani-rss\config\webui'
#   $env:ANIRSS_UI = 'vue'
#   irm .../install.ps1 | iex
#
# 注意：这里刻意不写 param()，因为 `irm | iex` 是把脚本文本当语句执行的，
# 顶层 param() 在那种模式下不成立，只能走环境变量。
#
# 另：本文件必须存为 带 BOM 的 UTF-8。Windows PowerShell 5.1 对无 BOM 的文件按
# ANSI 解码，中文注释的字节会被重解释出引号，直接把脚本结构撕开、报一堆莫名其妙的语法错。

$ErrorActionPreference = 'Stop'

$Repo = 'zzzwannasleep/ani-rss-themes'
# 可用 $env:ANIRSS_BASE 覆盖下载源（自建镜像、或本地测试）
$Base = if ($env:ANIRSS_BASE) { $env:ANIRSS_BASE } else { "https://github.com/$Repo/releases/latest/download" }

$UiIds = @('acg', 'liquid-glass', 'vue', 'github', 'material')

# param() 后面必须换行或加分号，同一行直接跟语句 PowerShell 解析不了
function Say {
    param([string]$m, [string]$c = 'Gray')
    Write-Host $m -ForegroundColor $c
}
function Ok {
    param([string]$m)
    Write-Host "  ✓ $m" -ForegroundColor Green
}
function Warn {
    param([string]$m)
    Write-Host "  ! $m" -ForegroundColor Yellow
}
function Die {
    param([string]$m)
    Write-Host "✗ $m" -ForegroundColor Red
    exit 1
}

function Ask {
    param([string]$Prompt, [string]$Default = '')
    $suffix = if ($Default) { " [$Default]" } else { '' }
    $a = Read-Host "$Prompt$suffix"
    if ([string]::IsNullOrWhiteSpace($a)) { return $Default }
    return $a.Trim()
}

function Confirm {
    param([string]$Prompt)
    $a = Read-Host "$Prompt [y/N]"
    return $a -match '^[yY]'
}

Say ''
Say 'ani-rss 替代 WebUI 安装' 'White'
Say '装完刷新页面即可；想还原就把 webui 目录清空。' 'DarkGray'
Say ''

# ── 目录 ────────────────────────────────────────────────
# 依据 ani-rss 的 ConfigUtil.getConfigDir()：环境变量 CONFIG → ./config → ~\ani-rss
function Guess-Dir {
    if ($env:CONFIG) { return (Join-Path $env:CONFIG 'webui') }
    if (Test-Path './config') { return (Join-Path (Resolve-Path './config') 'webui') }
    $home1 = Join-Path $HOME 'ani-rss'
    if (Test-Path $home1) { return (Join-Path $home1 'webui') }
    return ''
}

$dir = $env:ANIRSS_WEBUI_DIR
if (-not $dir) {
    Say 'webui 目录 = ani-rss 配置目录下的 webui\'
    Say 'Docker 用户填映射到宿主机的那个配置目录' 'DarkGray'
    $dir = Ask '请输入 webui 目录' (Guess-Dir)
}
if (-not $dir) { Die '没有填目录' }

# 用户很可能填的是配置目录而不是 webui 本身，帮他补上
if ($dir -notmatch '[\\/]webui[\\/]?$') {
    if (Test-Path (Join-Path $dir 'config.v2.json')) {
        Say "  检测到 $dir 是配置目录，自动补上 webui\" 'DarkGray'
        $dir = Join-Path $dir 'webui'
    }
}
$dir = $dir.TrimEnd('\', '/')

$parent = Split-Path $dir -Parent
if (Test-Path (Join-Path $parent 'config.v2.json')) {
    Ok '确认是 ani-rss 的配置目录'
} else {
    Warn "$parent 下没有 config.v2.json，可能不是 ani-rss 的配置目录"
    if (-not (Confirm "  仍然装到 $dir ?")) { Die '已取消' }
}

# ── 选界面 ──────────────────────────────────────────────
# 五款是同一套功能的不同外观，装一款就够
$ui = $env:ANIRSS_UI
if (-not $ui) {
    Say ''
    Say '  1 二次元          壁纸打底的海报墙，窄屏走底部导航'
    Say '  2 液态玻璃        悬浮玻璃胶囊导航 + 横躺大卡'
    Say '  3 Vue 文档        分组侧栏 + 居中正文，细线分栏'
    Say '  4 GitHub          深色顶栏 + tab，一张带边框的清单'
    Say '  5 Material 3      导航栏杆 / 底部导航 + 右下 FAB'
    Say '  五款功能完全一样，只是长得不同。在线预览：' 'DarkGray'
    Say '  https://zzzwannasleep.github.io/ani-rss-themes/webui/' 'DarkGray'
    $ui = Ask '装哪一款（序号或 id）' '3'
}

switch ($ui) {
    '1' { $ui = 'acg' }
    '2' { $ui = 'liquid-glass' }
    '3' { $ui = 'vue' }
    '4' { $ui = 'github' }
    '5' { $ui = 'material' }
}
if ($ui -notin $UiIds) { Die "只能是 $($UiIds -join ' / ')（或序号 1-5），收到: $ui" }

# ── 下载 ────────────────────────────────────────────────
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("anirss-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $tmp | Out-Null

try {
    $zipName = "ani-rss-webui-$ui.zip"
    $zip = Join-Path $tmp $zipName
    Say ''
    Say "下载 $zipName （含在线播放器，约 14MB）..."
    try {
        # 进度条会让下载慢一个数量级，关掉
        $old = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri "$Base/$zipName" -OutFile $zip
        $ProgressPreference = $old
    } catch {
        Die "下载失败：$Base/$zipName`n$($_.Exception.Message)"
    }
    $mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
    Ok "$zipName ($mb MB)"

    # ── 备份 ────────────────────────────────────────────
    if ((Test-Path $dir) -and (Get-ChildItem $dir -Force | Select-Object -First 1)) {
        $bak = "$dir.bak." + (Get-Date -Format 'yyyyMMddHHmmss')
        Say ''
        Say "已有内容，先备份到 $bak"
        Move-Item -Path $dir -Destination $bak
        Ok '已备份'
    }
    New-Item -ItemType Directory -Path $dir -Force | Out-Null

    # ── 解压 ────────────────────────────────────────────
    Say ''
    Say "解压到 $dir ..."
    Expand-Archive -Path $zip -DestinationPath $dir -Force
    if (-not (Test-Path (Join-Path $dir 'index.html'))) { Die '解压后没有 index.html，包可能有问题' }
    Ok '界面已就位'
    if (-not (Test-Path (Join-Path $dir 'player\play.html'))) { Die '解压后没有 player\play.html，包可能有问题' }
    Ok '播放器已就位'
} finally {
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

# ── 收尾 ────────────────────────────────────────────────
Say ''
Say "装好了  $dir  ($ui)" 'Green'
Say ''
Say '刷新 ani-rss 页面即可。想还原：清空该目录（或删掉后把 .bak 改回来）。'
Say ''
Say '播放前建议先验一下服务端的 Range 实现：' 'Yellow'
Say '  ani-rss 当前版本每个分段响应少一字节，会让播放器崩在解复用阶段，' 'DarkGray'
Say '  看起来像播放器的锅。仓库里的 webui/shared/tools/range-probe.mjs 可判定。' 'DarkGray'
Say ''
