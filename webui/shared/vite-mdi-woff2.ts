import type {Plugin} from 'vite'

/**
 * 只保留 MDI 图标字体的 woff2。
 *
 * @mdi/font 的 @font-face 里同时列了 eot / ttf / woff / woff2 四种格式，
 * Vite 会把四个文件全部拷进产物 —— 合计约 3.6MB，而任何现代浏览器只会取那个
 * 403KB 的 woff2，另外 3.2MB 是纯粹躺在 webui 目录里的死文件。
 *
 * 产物是要丢进 {configDir}/webui/ 的，用户还可能通过慢速内网或 Docker 卷同步它，
 * 所以这 3.2MB 值得在编译期就去掉，而不是打包完再删。
 *
 * 做法：在 CSS 进 Vite 的资源处理之前，把 src 里非 woff2 的那几段抹掉。
 * 引用没了，Vite 自然不会把那些文件算作资源。
 */
export function mdiWoff2Only(): Plugin {
    return {
        name: 'mdi-woff2-only',
        // 必须早于 Vite 内建的 CSS 资源处理，否则 url() 已经被替换成资源 id 了
        enforce: 'pre',
        transform(code, id) {
            if (!id.includes('@mdi/font') || !id.endsWith('.css')) return null

            const out = code.replace(/src:\s*([^;]+);/g, (_whole, srcList: string) => {
                // src 是逗号分隔的若干 url(...) format(...)，只留 woff2 那一段
                const kept = srcList
                    .split(/,(?![^(]*\))/)
                    .map(s => s.trim())
                    .filter(s => /woff2/.test(s))

                // 一条 woff2 都没有 = MDI 里那条只给 IE 的裸 eot 声明，整条删掉。
                // 早先版本在这种情况下「原样保留」，结果 1.3MB 的 .eot 照样被打进产物。
                return kept.length ? `src: ${kept.join(', ')};` : ''
            })

            return out === code ? null : {code: out, map: null}
        },
    }
}
