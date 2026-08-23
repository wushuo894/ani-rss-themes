/**
 * 一口气构建十一款界面。
 *
 *   node tools/build-all.mjs            → dist/<id>/    十一款正式产物
 *   node tools/build-all.mjs --demo     → 演示构建（假数据，给 GitHub Pages 预览用）
 *   node tools/build-all.mjs --only vue,acg
 *
 * 类型检查只跑一次：十一款共用同一份 tsconfig，跑十一遍是白等十遍。
 */
import {execFileSync} from 'node:child_process'
import {readdirSync, statSync} from 'node:fs'
import {resolve} from 'node:path'
import {PRESET_IDS} from '../src/presets/ids.ts'

const argv = process.argv.slice(2)
const demo = argv.includes('--demo')
const onlyArg = argv[argv.indexOf('--only') + 1]
const targets = argv.includes('--only') ? onlyArg.split(',') : [...PRESET_IDS]

for (const t of targets) {
    if (!PRESET_IDS.includes(t)) {
        console.error(`未知预设 ${t}，可选：${PRESET_IDS.join(' / ')}`)
        process.exit(1)
    }
}

const root = resolve(import.meta.dirname, '..')
const run = (cmd, args, env) =>
    execFileSync(cmd, args, {cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: {...process.env, ...env}})

console.log('▶ 类型检查')
run('npx', ['vue-tsc', '--noEmit', '-p', 'tsconfig.json'])

const size = dir => readdirSync(dir, {withFileTypes: true})
    .reduce((n, e) => n + (e.isDirectory() ? size(resolve(dir, e.name)) : statSync(resolve(dir, e.name)).size), 0)

for (const id of targets) {
    console.log(`\n▶ 构建 ${id}${demo ? '（演示）' : ''}`)
    run('npx', ['vite', 'build'], {VITE_PRESET: id, VITE_DEMO: demo ? '1' : ''})
    const mb = (size(resolve(root, 'dist', id)) / 1024 / 1024).toFixed(1)
    console.log(`  dist/${id}  ${mb} MB`)
}

console.log(`\n✓ ${targets.length} 款已构建`)
