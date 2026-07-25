// tools/gen-source-list.js
// 生成软著「源码提交清单」：拼接全部 .js / .wxml / .wxss 源码，按「核心层 → 服务层 → 组件 → 页面层 → 云函数层」排序，
// 使前 30 页覆盖架构核心（store.js / api.js / config.js 等），后 30 页覆盖页面层与云函数层。
// 用法：node tools/gen-source-list.js [输出文件名]
//   不传参 → 写 docs/源码提交清单.md（V1.0：前端 + 全部云函数）
//   传参   → 写指定文件（如 docs/源码提交清单_V2.md，用于含实时增强增量的 V2.0 清单）
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const OUT = process.argv[2] || 'docs/源码提交清单.md'
const PAGE = 50
const FRONT_EXT = ['.js', '.wxml', '.wxss']

// 排除目录（非小程序前端/云函数源码）
const EXCLUDE_DIR = new Set([
  'node_modules', '.workbuddy', 'docs',
  'deploy', 'design', 'images', 'dist', 'miniprogram_npm', 'tools'
])
// 注：cloudfunctions 不再排除 —— 软著 V1.0 须含云端 30 个云函数源码（P1-④）。

// 排序权重：核心配置/状态(0) → 服务层(1) → 组件/自定义 tab(2) → 页面/分包(3) → 其它(4)
function rankOf(rel) {
  if (/^(app\.js|app\.wxss|config\.js|store\.js)$/.test(rel)) return 0
  if (rel.startsWith('services/')) return 1
  if (rel.startsWith('components/') || rel.startsWith('custom-tab-bar/')) return 2
  if (rel.startsWith('pages/') || rel.startsWith('packages/')) return 3
  return 4
}

function walk(dir, base, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    const rel = path.join(base, e.name).split(path.sep).join('/')
    if (e.isDirectory()) {
      if (!EXCLUDE_DIR.has(e.name)) walk(full, rel, out)
    } else if (FRONT_EXT.includes(path.extname(e.name)) && !/^_stub_/.test(e.name)) {
      out.push(rel)
    }
  }
}

const files = []
walk(ROOT, '', files)
// 将重点页面（个人资料页、头像编辑页）沉到 rank 3 末尾，确保落入「后 30 页」被提交
const TAIL = ['pages/info', 'pages/profile']
function tailBoost(rel) {
  for (let i = 0; i < TAIL.length; i++) {
    if (rel === TAIL[i] || rel.startsWith(TAIL[i] + '/')) return 1
  }
  return 0
}

files.sort((a, b) => {
  const ra = rankOf(a), rb = rankOf(b)
  if (ra !== rb) return ra - rb
  const ta = tailBoost(a), tb = tailBoost(b)
  if (ta !== tb) return ta - tb // 0 在前、1 在后 → 普通页面在前，info/profile 沉到末尾
  return a.localeCompare(b)
})

// 拼接为「显示行」数组（含文件锚点）
const allLines = []
let srcLines = 0
for (const rel of files) {
  allLines.push('/* === FILE: ' + rel + ' === */')
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  const lines = text.split(/\r?\n/)
  // 统计源码行数（不含文件锚点）
  srcLines += lines.length
  for (const ln of lines) allLines.push(ln)
}

// 按 50 行分页
const pages = [[]]
for (const ln of allLines) {
  const cur = pages[pages.length - 1]
  if (cur.length >= PAGE) pages.push([])
  pages[pages.length - 1].push(ln)
}
const totalPages = pages.length

function renderPage(p) {
  const idx = p + 1
  const body = pages[p].join('\n')
  return '/* ---------- 第 ' + idx + ' 页 ---------- */\n' + body
}

const head =
  '# 源码提交清单（前 30 页 + 后 30 页）\n\n' +
  '> 依据《计算机软件著作权登记办法》：源程序超过 60 页的，提交前 30 页与后 30 页（每页 50 行）。\n' +
  '> 本清单共 ' + files.length + ' 个源文件，合计 ' + srcLines + ' 行，约 ' + totalPages + ' 页；以下为前 30 页（第 1–' + Math.min(30, totalPages) + ' 页）与后 30 页（第 ' + Math.max(1, totalPages - 29) + '–' + totalPages + ' 页）。\n'

let out = head + '\n## 前 30 页\n\n'
for (let p = 0; p < Math.min(30, totalPages); p++) {
  out += renderPage(p) + '\n\n'
}
const startLast = Math.max(0, totalPages - 30)
out += '## 后 30 页\n\n'
for (let p = startLast; p < totalPages; p++) {
  out += renderPage(p) + '\n\n'
}

fs.writeFileSync(path.join(ROOT, OUT), out, 'utf8')
console.log('已生成 ' + OUT + '：' + files.length + ' 文件 / ' + srcLines + ' 行 / ' + totalPages + ' 页')
