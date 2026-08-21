/*
 * 只干一件事：让装到桌面的那份在网络不好或者后端没起来时还能打开。
 *
 * 三条规则，按「错了会怎样」排的：
 *   1. /api/ 一律不碰 —— 订阅状态、下载进度都是活数据，缓存一次就是骗人。
 *      连 GET 也不缓存：番剧列表缓存下来，用户删掉一条刷新后它还在。
 *   2. 带哈希的 assets/ 走缓存优先 —— 文件名变了才算新文件，永远不会读到旧的。
 *   3. index.html 和其余文件走「网络优先、断网退缓存」——
 *      反过来（缓存优先）的话，后端升级了新版界面，用户得手动清缓存才看得到。
 *
 * 版本号变一次就把旧缓存整个删掉。改这个文件时记得跟着 +1，
 * 不然浏览器虽然会拿到新 sw.js，旧缓存却留在那儿。
 */
const VERSION = 'ani-rss-v1'
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png']

self.addEventListener('install', e => {
    e.waitUntil(caches.open(VERSION)
        // 单个文件 404 不该让整次安装失败（比如某款界面没有某张图）
        .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
        .then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
        .then(() => self.clients.claim()))
})

const put = (req, res) => {
    if (res && res.ok && res.type === 'basic') {
        const copy = res.clone()
        void caches.open(VERSION).then(c => c.put(req, copy))
    }
    return res
}

self.addEventListener('fetch', e => {
    const {request} = e
    if (request.method !== 'GET') return

    const url = new URL(request.url)
    if (url.origin !== self.location.origin) return
    if (url.pathname.includes('/api/')) return

    // 带内容哈希的静态资源：名字在，内容就一定对
    if (/\/assets\/.+\.[0-9a-f]{8,}\./.test(url.pathname)) {
        e.respondWith(caches.match(request).then(hit => hit || fetch(request).then(r => put(request, r))))
        return
    }

    e.respondWith(
        fetch(request)
            .then(r => put(request, r))
            .catch(() => caches.match(request)
                // 哈希路由下所有页面都是同一个 index.html，兜底回它就够了
                .then(hit => hit || (request.mode === 'navigate' ? caches.match('./index.html') : undefined))
                .then(hit => hit || Response.error())),
    )
})
