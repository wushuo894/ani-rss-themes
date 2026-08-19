#!/usr/bin/env sh
#
# ani-rss 替代 WebUI 一键安装（Linux / macOS / NAS / Docker 宿主机）
#
#   curl -fsSL https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.sh | bash
#
# 非交互：
#   curl -fsSL .../install.sh | bash -s -- --dir /vol1/docker/ani-rss/config/webui --ui vt --player
#
# 用 POSIX sh 写，不依赖 bash 特性 —— 群晖/威联通的默认 shell 常常是 ash/busybox。
set -eu

REPO="zzzwannasleep/ani-rss-themes"
# 可用 ANIRSS_BASE 覆盖下载源（自建镜像、或本地测试）
BASE="${ANIRSS_BASE:-https://github.com/$REPO/releases/latest/download}"

DIR=""
UI=""
PLAYER=""
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
        --player) PLAYER="yes"; shift ;;
        --no-player) PLAYER="no"; shift ;;
        -y|--yes) ASSUME_YES="yes"; shift ;;
        -h|--help)
            say "用法: install.sh [--dir <webui目录>] [--ui vt|qb] [--player|--no-player] [-y]"
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
say "${D}装完刷新页面即可；想还原就把 webui 目录清空。${N}"
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
if [ -z "$UI" ]; then
    say ""
    say "  ${B}vt${N}  VueTorrent 风：总览页 + 海报网格，密度舒适"
    say "  ${B}qb${N}  qb-web 风：打开就是紧凑表格，信息密度高"
    UI=$(ask "装哪一套" "vt")
fi
case "$UI" in vt|qb) : ;; *) die "只能是 vt 或 qb，收到: $UI" ;; esac

# ── 播放器 ─────────────────────────────────────────────
if [ -z "$PLAYER" ]; then
    say ""
    say "${D}在线播放用 webplayer：本地拆容器交给 MSE，mkv 与 ASS 特效字幕都能放。${N}"
    say "${D}约 40MB。不装也能用列表和设置，播放可交给本机播放器。${N}"
    if confirm "一并安装播放器?"; then PLAYER="yes"; else PLAYER="no"; fi
fi

# ── 下载 ───────────────────────────────────────────────
TMP=$(mktemp -d 2>/dev/null || mktemp -d -t anirss)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT INT TERM

fetch() {  # fetch <文件名>
    say ""
    say "下载 $1 ..."
    # shellcheck disable=SC2086
    $DL "$TMP/$1" "$BASE/$1" || die "下载失败：$BASE/$1"
    # 截断的包解压时才报错，先验一下，错误信息能落在下载这一步上
    if [ "$UNZIP" = "unzip" ]; then
        unzip -tq "$TMP/$1" >/dev/null 2>&1 || die "$1 不是完整的压缩包（下载被截断？）"
    fi
    ok "$1 ($(du -h "$TMP/$1" | cut -f1))"
}

extract() {  # extract <文件名> <目标目录>
    if [ "$UNZIP" = "unzip" ]; then
        unzip -oq "$TMP/$1" -d "$2"
    else
        python3 -c 'import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' "$TMP/$1" "$2"
    fi
}

fetch "ani-rss-webui-$UI.zip"
[ "$PLAYER" = "yes" ] && fetch "ani-rss-webplayer.zip"

# ── 备份 ───────────────────────────────────────────────
# 只升级界面时要把已装好的播放器留下：它有 40MB，
# 跟着备份走的话用户升一次界面就静默失去在线播放，或者得重下一遍。
KEEP_PLAYER=""
if [ "$PLAYER" != "yes" ] && [ -d "$DIR/player" ]; then
    KEEP_PLAYER="$TMP/keep-player"
    mv "$DIR/player" "$KEEP_PLAYER"
    say ""
    ok "已装的播放器会原样保留"
fi

if [ -d "$DIR" ] && [ -n "$(ls -A "$DIR" 2>/dev/null)" ]; then
    BAK="$DIR.bak.$(date +%Y%m%d%H%M%S)"
    say ""
    say "已有内容，先备份到 ${B}$BAK${N}"
    mv "$DIR" "$BAK"
    ok "已备份"
fi

mkdir -p "$DIR" || die "无法创建 $DIR（权限？）"

[ -n "$KEEP_PLAYER" ] && mv "$KEEP_PLAYER" "$DIR/player"

# ── 解压 ───────────────────────────────────────────────
say ""
say "解压到 $DIR ..."
extract "ani-rss-webui-$UI.zip" "$DIR"
[ -f "$DIR/index.html" ] || die "解压后没有 index.html，包可能有问题"
ok "界面已就位"

if [ "$PLAYER" = "yes" ]; then
    extract "ani-rss-webplayer.zip" "$DIR"
    [ -f "$DIR/player/play.html" ] || die "解压后没有 player/play.html"
    ok "播放器已就位"
fi

# ── 收尾 ───────────────────────────────────────────────
say ""
say "${G}${B}装好了${N}  $DIR"
say ""
say "刷新 ani-rss 页面即可。想还原：清空该目录（或删掉后把 .bak 改回来）。"
if [ "$PLAYER" = "yes" ]; then
    say ""
    say "${Y}播放前建议先验一下服务端的 Range 实现：${N}"
    say "${D}  ani-rss 当前版本每个分段响应少一字节，会让 webplayer 崩在解复用阶段，"
    say "  看起来像播放器的锅。仓库里的 webui-shared/tools/range-probe.mjs 可判定。${N}"
fi
say ""
