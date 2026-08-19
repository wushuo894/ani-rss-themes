/**
 * ani-rss 接口层。
 *
 * 与后端的约定全部在这里，两个 WebUI 共用，UI 层不许自己拼 URL、自己塞请求头。
 *
 * 约定来源（上游 test 分支实读，非推测）：
 *  - 响应恒为 Result<T> = {code, message, data, t}；code 是**业务码不是 HTTP 状态码**，
 *    200~299 才算成功。见 ani/rss/entity/web/Result.java
 *  - 令牌明文放 Authorization 头，没有 Bearer 前缀。见 ani-rss-ui/src/js/api.js
 *  - 令牌存 localStorage 的 'authorization' 键 —— 特意和上游用同一个键：
 *    同源共享，在自带界面登录过的人切过来就已经是登录态，不必再登一次。
 *  - t 是服务端毫秒时间戳，和本地差超过 30 分钟说明有一边时钟不对，只告警不拦截。
 */

const TOKEN_KEY = 'authorization'

export function getToken(): string {
    return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(v: string): void {
    if (v) localStorage.setItem(TOKEN_KEY, v)
    else localStorage.removeItem(TOKEN_KEY)
}

/**
 * 接口根地址。
 *
 * 取当前页面所在**目录**，让整套东西在反代的任意子路径下都能用（/ani-rss/ 之类）。
 * 上游同名函数直接用 location.pathname 拼，页面以 /x/index.html 打开时会拼出
 * /x/index.htmlapi/...；这里把末段文件名去掉，避开那个洞。
 */
export function getBaseUrl(): string {
    const {protocol, host, pathname} = location
    const dir = pathname.endsWith('/') ? pathname : pathname.replace(/[^/]*$/, '')
    return `${protocol}//${host}${dir}`
}

/** 拼一个带查询参数的接口地址 */
export function toApiUrl(path: string, params: Record<string, string> = {}): string {
    const url = new URL(getBaseUrl())
    url.pathname += path
    url.search = new URLSearchParams(params).toString()
    return url.toString()
}

/**
 * UTF-8 安全的 base64。
 * 直接 btoa 遇到中文会抛 InvalidCharacterError，番剧名基本全是中文，绕不开。
 * 和上游 base64Encode 行为一致（标准 base64，非 URL-safe；靠 URLSearchParams 转义）。
 */
export function base64Encode(s: string): string {
    const bytes = new TextEncoder().encode(s)
    let bin = ''
    // 不用 String.fromCharCode(...bytes)：番剧名不长，但展开成参数列表对长字符串会爆栈，
    // 而这个函数也用在文件路径上，路径可以很长
    bytes.forEach(b => {
        bin += String.fromCharCode(b)
    })
    return btoa(bin)
}

/**
 * 封面图地址。
 * 这类地址用在 <img src> 上，设不了请求头，所以令牌只能走查询参数 s —— 上游如此，照办。
 */
export function proxyImage(imgUrl: string): string {
    return toApiUrl('api/proxyImage', {imgUrl: base64Encode(imgUrl), s: getToken()})
}

/** 文件下载地址，同样用查询参数带令牌 */
export function toApiFile(filename: string): string {
    // 已经是自带内容的地址就原样返回：<img src> 不走 fetch，演示站没法在传输层伪造图片，
    // 只能让假数据直接给出内联的 data: URI。这个判断对真实环境是死代码 —— 后端给的是路径。
    if (/^(data:|blob:)/.test(filename)) return filename
    return toApiUrl('api/file', {filename: base64Encode(filename), s: getToken()})
}

export interface Result<T> {
    code: number
    message: string
    data: T
    t: number
}

/** 鉴权失效时的回调，由各 app 在启动时注册（跳登录页的方式两边不同） */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: () => void): void {
    onUnauthorized = fn
}

/** 出错时给用户看的提示，由各 app 注册（vt 用 snackbar，qb 用 toast） */
let onError: ((msg: string) => void) | null = null

export function setErrorHandler(fn: (msg: string) => void): void {
    onError = fn
}

export class ApiError extends Error {
    constructor(public code: number, message: string) {
        super(message)
        this.name = 'ApiError'
    }
}

let skewWarned = false

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {}
    const token = getToken()
    if (token) headers['Authorization'] = token
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const res = await fetch(toApiUrl(path), {
        method,
        headers,
        body: body === undefined ? null : JSON.stringify(body),
    })

    // 后端正常情况下 HTTP 恒 200、错误码在包里；但静态资源 404 之类会走到这
    let json: Result<T>
    try {
        json = await res.json()
    } catch {
        throw new ApiError(res.status, `服务端返回了非 JSON 内容（HTTP ${res.status}）`)
    }

    // 时钟偏移只提醒一次，刷屏没有意义
    if (!skewWarned && Math.abs(Date.now() - Number(json.t)) > 30 * 60 * 1000) {
        skewWarned = true
        console.warn('[ani-rss] 与服务端时差超过 30 分钟，涉及时间的显示可能不准')
    }

    if (json.code >= 200 && json.code < 300) return json.data

    if (json.code === 403) {
        setToken('')
        onUnauthorized?.()
    }
    onError?.(json.message)
    throw new ApiError(json.code, json.message)
}

export const http = {
    get: <T>(path: string) => request<T>(path, 'GET'),
    post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body),
    put: <T>(path: string, body?: unknown) => request<T>(path, 'PUT', body),
    del: <T>(path: string, body?: unknown) => request<T>(path, 'DELETE', body),
}
