#!/usr/bin/env sh
#
# ani-rss 替代 WebUI 一键安装（Linux / macOS / NAS / Docker 宿主机）
#
#   curl -fsSL https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.sh | bash
#
# 非交互：
#   curl -fsSL .../install.sh | bash -s -- --dir /vol1/docker/ani-rss/config/webui --ui vue -y
#
# 用 POSIX sh 写，不依赖 bash 特性 —— 群晖/威联通的默认 shell 常常是 ash/busybox。
set -eu

REPO="zzzwannasleep/ani-rss-themes"
# 可用 ANIRSS_BASE 覆盖下载源（自建镜像、或本地测试）
BASE="${ANIRSS_BASE:-https://github.com/$REPO/releases/latest/download}"

# 九款界面。序号只是给交互时少打几个字用的，真正的 id 是右边那个。
UI_IDS="acg liquid-glass vue github material win98 argon macintosh synology"

DIR=""
UI=""
ASSUME_YES=""

# ── 输出 ───────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    B='\033[1m'; R='\033[31m'; G='\033[32m'; Y='\033[33m'; D='\033[2m'; N='\033[0m'
else
    B=''; R=''; G=''; Y=''; D=''; N=''
fi
say()  { printf '%b\n' "$*"; }
ok()   { printf '%b\n' "  ${G}✓${N} $*"; }
warn() { printf '%b\n' "  ${Y}!${N} $*"; }
die()  { printf '%b\n' "${R}✗ $*${N}" >&2; exit 1; }

# ── 参数 ───────────────────────────────────────────────
while [ $# -gt 0 ]; do
    case "$1" in
        --dir) DIR="${2:-}"; shift 2 ;;
        --ui) UI="${2:-}"; shift 2 ;;
        -y|--yes) ASSUME_YES="yes"; shift ;;
        -h|--help)
            say "用法: install.sh [--dir <webui目录>] [--ui <id>] [-y]"
            say "id: acg | liquid-glass | vue | github | material | win98 | argon | macintosh | synology"
            say "在线播放器包含在每个包里，不需要单独选。"
            exit 0 ;;
        *) die "未知参数: $1" ;;
    esac
done

# ── 交互输入 ───────────────────────────────────────────
# 管道执行时 stdin 是脚本本身，read 读不到键盘，必须走 /dev/tty。
# 连 /dev/tty 都没有（比如 CI）就只能要求把参数给全。
# 注意：不能只用 [ -e /dev/tty ] —— 路径存在不代表能打开。
# 没有控制终端时（cron、CI、docker exec -T）打开会报 "No such device or address"，
# 必须真试着开一次才算数。
# 必须在子 shell 里试开：':' 是 POSIX 特殊内建，对它重定向失败会让整个 shell 直接退出
# （表现为脚本连横幅都没打就没了）。套一层 ( ) 就只影响子进程。
TTY=""
if ( exec 3</dev/tty ) 2>/dev/null; then TTY="/dev/tty"; fi

ask() {  # ask <提示> <默认值>
    _p="$1"; _d="${2:-}"
    if [ -z "$TTY" ]; then
        [ -n "$_d" ] || die "没有终端可交互，请用参数指定（--dir / --ui）"
        printf '%s\n' "$_d"; return
    fi
    if [ -n "$_d" ]; then
        printf '%b' "$_p ${D}[$_d]${N}: " > "$TTY"
    else
        printf '%b' "$_p: " > "$TTY"
    fi
    IFS= read -r _a < "$TTY" || _a=""
    printf '%s\n' "${_a:-$_d}"
}

confirm() {  # confirm <提示>  默认否
    [ -n "$ASSUME_YES" ] && return 0
    [ -z "$TTY" ] && return 1
    printf '%b' "$1 ${D}[y/N]${N}: " > "$TTY"
    IFS= read -r _a < "$TTY" || _a=""
    case "$_a" in [yY]*) return 0 ;; *) return 1 ;; esac
}

# ── 依赖 ───────────────────────────────────────────────
have() { command -v "$1" >/dev/null 2>&1; }

if have curl; then DL="curl -fsSL -o"
elif have wget; then DL="wget -qO"
else die "需要 curl 或 wget"
fi

# 解压：unzip 最常见；busybox 的 unzip 也够用；都没有就退回 python3
if have unzip; then UNZIP="unzip"
elif have python3; then UNZIP="python3"
else die "需要 unzip 或 python3 来解压"
fi

# ── 猜一个默认目录 ─────────────────────────────────────
# 依据 ani-rss 的 ConfigUtil.getConfigDir()：环境变量 CONFIG → ./config → ~/ani-rss
guess_dir() {
    [ -n "${CONFIG:-}" ] && { printf '%s\n' "$CONFIG/webui"; return; }
    [ -d "./config" ] && { printf '%s\n' "$(pwd)/config/webui"; return; }
    [ -d "$HOME/ani-rss" ] && { printf '%s\n' "$HOME/ani-rss/webui"; return; }
    printf '\n'
}

say ""
say "${B}ani-rss 替代 WebUI 安装${N}"
say "${D}装完刷新页面就生效（ani-rss 3.2.15 以下要重启）；想还原见结尾。${N}"
say ""

# ── 目录 ───────────────────────────────────────────────
if [ -z "$DIR" ]; then
    say "webui 目录 = ani-rss ${B}配置目录${N}下的 webui/"
    say "${D}Docker 用户填映射到宿主机的那个配置目录，例如 /vol1/docker/ani-rss/config/webui${N}"
    DIR=$(ask "请输入 webui 目录" "$(guess_dir)")
fi
[ -n "$DIR" ] || die "没有填目录"

# 用户很可能填的是配置目录而不是 webui 本身，帮他补上，别让人装错地方
case "$DIR" in
    */webui|*/webui/) : ;;
    *)
        if [ -f "$DIR/config.v2.json" ]; then
            say "  ${D}检测到 $DIR 是配置目录，自动补上 webui/${N}"
            DIR="${DIR%/}/webui"
        fi ;;
esac
DIR="${DIR%/}"

PARENT=$(dirname "$DIR")
if [ -f "$PARENT/config.v2.json" ]; then
    ok "确认是 ani-rss 的配置目录"
else
    warn "$PARENT 下没有 config.v2.json，可能不是 ani-rss 的配置目录"
    confirm "  仍然装到 $DIR ?" || die "已取消"
fi

# ── 选界面 ─────────────────────────────────────────────
# 九款是同一套功能的不同外观，装一款就够；先在线看看：
#   https://zzzwannasleep.github.io/ani-rss-themes/webui/
if [ -z "$UI" ]; then
    say ""
    say "  ${B}1${N} 二次元          壁纸打底的海报墙，窄屏走底部导航"
    say "  ${B}2${N} 液态玻璃        悬浮玻璃胶囊导航 + 横躺大卡"
    say "  ${B}3${N} Vue 文档        分组侧栏 + 居中正文，细线分栏"
    say "  ${B}4${N} GitHub          深色顶栏 + tab，一张带边框的清单"
    say "  ${B}5${N} Material 3      导航栏杆 / 底部导航 + 右下 FAB"
    say "  ${B}6${N} Windows 98      标题栏 + 菜单栏 + 任务栏，订阅页是详细信息列表"
    say "  ${B}7${N} Argon           博客的排法：毛玻璃顶栏 + 居中正文栏 + 右侧挂件"
    say "  ${B}8${N} 经典 Macintosh  黑白两色，苹果菜单栏 + 条纹标题栏，Finder 图标视图"
    say "  ${B}9${N} 群晖 DSM        顶部任务栏 + 主菜单，应用在一扇带左侧栏的窗里"
    say "${D}  九款功能完全一样，只是长得不同。在线预览：${N}"
    say "${D}  https://zzzwannasleep.github.io/ani-rss-themes/webui/${N}"
    UI=$(ask "装哪一款（序号或 id）" "3")
fi

# 序号翻成 id，方便交互；直接给 id 的走下面的校验
case "$UI" in
    1) UI="acg" ;;
    2) UI="liquid-glass" ;;
    3) UI="vue" ;;
    4) UI="github" ;;
    5) UI="material" ;;
    6) UI="win98" ;;
    7) UI="argon" ;;
    8) UI="macintosh" ;;
    9) UI="synology" ;;
esac

_hit=""
for _i in $UI_IDS; do [ "$UI" = "$_i" ] && _hit="yes"; done
[ -n "$_hit" ] || die "只能是 $UI_IDS（或序号 1-9），收到: $UI"

# ── 下载 ───────────────────────────────────────────────
TMP=$(mktemp -d 2>/dev/null || mktemp -d -t anirss)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT INT TERM

ZIP="ani-rss-webui-$UI.zip"

say ""
say "下载 $ZIP ${D}（含在线播放器，约 14MB）${N}"
# shellcheck disable=SC2086
$DL "$TMP/$ZIP" "$BASE/$ZIP" || die "下载失败：$BASE/$ZIP"
# 截断的包解压时才报错，先验一下，错误信息能落在下载这一步上
if [ "$UNZIP" = "unzip" ]; then
    unzip -tq "$TMP/$ZIP" >/dev/null 2>&1 || die "$ZIP 不是完整的压缩包（下载被截断？）"
fi
ok "$ZIP ($(du -h "$TMP/$ZIP" | cut -f1))"

# ── 备份 ───────────────────────────────────────────────
if [ -d "$DIR" ] && [ -n "$(ls -A "$DIR" 2>/dev/null)" ]; then
    BAK="$DIR.bak.$(date +%Y%m%d%H%M%S)"
    say ""
    say "已有内容，先备份到 ${B}$BAK${N}"
    mv "$DIR" "$BAK"
    ok "已备份"
fi

mkdir -p "$DIR" || die "无法创建 $DIR（权限？）"

# ── 解压 ───────────────────────────────────────────────
say ""
say "解压到 $DIR ..."
if [ "$UNZIP" = "unzip" ]; then
    unzip -oq "$TMP/$ZIP" -d "$DIR"
else
    python3 -c 'import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' "$TMP/$ZIP" "$DIR"
fi
[ -f "$DIR/index.html" ] || die "解压后没有 index.html，包可能有问题"
ok "界面已就位"
[ -f "$DIR/player/play.html" ] || die "解压后没有 player/play.html，包可能有问题"
ok "播放器已就位"

# ── 收尾 ───────────────────────────────────────────────
say ""
say "${G}${B}装好了${N}  $DIR  ${D}($UI)${N}"
say ""
say "${Y}${B}刷新页面就能看到。${N}${D}ani-rss 3.2.15 以下静态资源带缓存，那些版本要重启一次。${N}"
say ""
say "${D}想还原：3.2.17 起在网页「设置 → 关于 → 更换界面」里点「还原自带界面」；${N}"
say "${D}或者清空该目录（删掉后把 .bak 改回来也行），再刷新一次。${N}"
say ""
