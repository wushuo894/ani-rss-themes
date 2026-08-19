# ani-rss 替代 WebUI 一键安装（Windows PowerShell）
#
#   irm https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.ps1 | iex
#
# 非交互（先设环境变量再执行）：
#   $env:ANIRSS_WEBUI_DIR = 'D:\ani-rss\config\webui'
#   $env:ANIRSS_UI = 'vt'; $env:ANIRSS_PLAYER = 'yes'
#   irm .../install.ps1 | iex
#
# 注意：这里刻意不写 param()，因为 `irm | iex` 是把脚本文本当语句执行的，
# 顶层 param() 在那种模式下不成立，只能走环境变量。

$ErrorActionPreference = 'Stop'

$Repo = 'zzzwannasleep/ani-rss-themes'
# 可用 $env:ANIRSS_BASE 覆盖下载源（自建镜像、或本地测试）
$Base = if ($env:ANIRSS_BASE) { $env:ANIRSS_BASE } else { "https://github.com/$Repo/releases/latest/download" }

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
$ui = $env:ANIRSS_UI
if (-not $ui) {
    Say ''
    Say '  vt  VueTorrent 风：总览页 + 海报网格，密度舒适'
    Say '  qb  qb-web 风：打开就是紧凑表格，信息密度高'
    $ui = Ask '装哪一套' 'vt'
}
if ($ui -notin @('vt', 'qb')) { Die "只能是 vt 或 qb，收到: $ui" }

# ── 播放器 ──────────────────────────────────────────────
$player = $env:ANIRSS_PLAYER
if (-not $player) {
    Say ''
    Say '在线播放用 webplayer：本地拆容器交给 MSE，mkv 与 ASS 特效字幕都能放。' 'DarkGray'
    Say '约 40MB。不装也能用列表和设置，播放可交给本机播放器。' 'DarkGray'
    $player = if (Confirm '一并安装播放器?') { 'yes' } else { 'no' }
}

# ── 下载 ────────────────────────────────────────────────
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("anirss-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $tmp | Out-Null

function Fetch {
    param([string]$Name)
    Say ''
    Say "下载 $Name ..."
    $out = Join-Path $tmp $Name
    try {
        # 进度条会让下载慢一个数量级，关掉
        $old = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri "$Base/$Name" -OutFile $out
        $ProgressPreference = $old
    } catch {
        Die "下载失败：$Base/$Name`n$($_.Exception.Message)"
    }
    $mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
    Ok "$Name ($mb MB)"
    return $out
}

try {
    $uiZip = Fetch "ani-rss-webui-$ui.zip"
    $playerZip = if ($player -eq 'yes') { Fetch 'ani-rss-webplayer.zip' } else { $null }

    # ── 备份 ────────────────────────────────────────────
    # 只升级界面时要把已装好的播放器留下：它有 40MB，
    # 跟着备份走的话用户升一次界面就静默失去在线播放，或者得重下一遍。
    $keepPlayer = $null
    if (($player -ne 'yes') -and (Test-Path (Join-Path $dir 'player'))) {
        $keepPlayer = Join-Path $tmp 'keep-player'
        Move-Item (Join-Path $dir 'player') $keepPlayer
        Say ''
        Ok '已装的播放器会原样保留'
    }

    if ((Test-Path $dir) -and (Get-ChildItem $dir -Force | Select-Object -First 1)) {
        $bak = "$dir.bak." + (Get-Date -Format 'yyyyMMddHHmmss')
        Say ''
        Say "已有内容，先备份到 $bak"
        Move-Item -Path $dir -Destination $bak
        Ok '已备份'
    }
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    if ($keepPlayer) { Move-Item $keepPlayer (Join-Path $dir 'player') }

    # ── 解压 ────────────────────────────────────────────
    Say ''
    Say "解压到 $dir ..."
    Expand-Archive -Path $uiZip -DestinationPath $dir -Force
    if (-not (Test-Path (Join-Path $dir 'index.html'))) { Die '解压后没有 index.html，包可能有问题' }
    Ok '界面已就位'

    if ($playerZip) {
        Expand-Archive -Path $playerZip -DestinationPath $dir -Force
        if (-not (Test-Path (Join-Path $dir 'player\play.html'))) { Die '解压后没有 player\play.html' }
        Ok '播放器已就位'
    }
} finally {
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

# ── 收尾 ────────────────────────────────────────────────
Say ''
Say "装好了  $dir" 'Green'
Say ''
Say '刷新 ani-rss 页面即可。想还原：清空该目录（或删掉后把 .bak 改回来）。'
if ($player -eq 'yes') {
    Say ''
    Say '播放前建议先验一下服务端的 Range 实现：' 'Yellow'
    Say '  ani-rss 当前版本每个分段响应少一字节，会让 webplayer 崩在解复用阶段，' 'DarkGray'
    Say '  看起来像播放器的锅。仓库里的 webui-shared/tools/range-probe.mjs 可判定。' 'DarkGray'
}
Say ''
