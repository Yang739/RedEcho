// services/pcLayout.js —— 明信片排版引擎（与页面解耦，三页共用）
//
// 职责：
// - buildQuote：根据 名言 / 方向 / 排列 / 位置 计算展示方案（换行断行 / 句尾去标点 / 续行缩进）
// - decorateCard：补全渲染字段（quoteLines / quoteFontSize / indent / sign / 统一格式 date）
// - paintPostcard：Canvas 精绘（9 宫格定位、字号自适应、落款双行、名句避让落款带）

const { FONTS } = require('./fonts.js')
const POS_FULL = { top: 1, bottom: 1, center: 1 } // 满宽位置（横排时可整行书写）
const DEFAULT_QUOTE = ""
const SIGN_BAND = 96   // 底部落款带预留高度（Canvas px）
const SCENE_BAND = 112 // 顶部场景名预留高度（Canvas px）

// 将文本做「均衡分行」：行数尽量少，且相邻行字数差不超过 1
function splitBalanced(text, perLine) {
  const n = Math.max(1, Math.ceil(text.length / perLine))
  const base = Math.floor(text.length / n)
  const rem = text.length - base * n
  const lines = []
  let i = 0
  for (let k = 0; k < n; k++) {
    const take = base + (k < rem ? 1 : 0)
    lines.push(text.substr(i, take))
    i += take
  }
  return lines
}

// 以换行符断行（换行本身不显示）；所有句子（行/列）结尾都不跟标点；过长子段再均衡拆分
function splitQuoteLines(text, arrange, perLine) {
  let segs = String(text).split(/\r?\n/).map(s => s.trim()).filter(s => s.length)
  if (!segs.length) segs = [String(text).trim() || String(text)]
  // 句尾不跟标点：去除段尾全角/半角标点（横竖排一致）
  segs = segs.map(s => s.replace(/[。！？!?；：、，,.…—~·]+$/, ''))
  const lines = []
  for (const s of segs) {
    if (s.length <= perLine) lines.push(s)
    else lines.push(...splitBalanced(s, perLine))
  }
  return lines
}

// 日期统一为 YYYY.MM.DD（落库为 YYYY-MM-DD，预览/导出一致）
function formatDate(d) {
  if (!d) return ''
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return m[1] + '.' + m[2] + '.' + m[3]
  return d
}

// 计算名言的展示方案（与 Canvas 规则对齐：换行断行 / 句尾去标点 / 续行缩进）
function buildQuote(quote, orient, arrange, position) {
  const raw = (quote && String(quote).trim()) || DEFAULT_QUOTE
  // 以换行符断行、句尾去标点；空行忽略
  let lines = String(raw).split(/\r?\n/).map(s => s.trim()).filter(s => s.length)
    .map(s => s.replace(/[。！？!?；：、，,.…—~·]+$/, ''))
  if (!lines.length) lines = [raw]
  const full = !!POS_FULL[position]
  const indent = (position === 'left' || position === 'tl' || position === 'bl')
  const longest = lines.reduce((m, s) => Math.max(m, s.length), 0)

  if (arrange === 'v') {
    // 竖排：以最长段定字号（尽量一列放下）
    const maxCol = orient === 'port' ? 16 : 11
    let fs = 34
    if (longest > maxCol) fs = Math.max(22, Math.round((34 * maxCol) / longest))
    return { lines, fontSizeRpx: fs, indent }
  }

  // 横排：按位置估算单行容量（基准字号 34rpx，CJK 约等宽）
  const perLine = orient === 'port'
    ? (full ? 10 : 5)
    : (full ? 15 : 7)
  if (longest <= perLine) {
    const boost = longest <= Math.ceil(perLine * 0.6) ? 6 : 0
    return { lines, fontSizeRpx: Math.min(44, 34 + boost), indent }
  }
  const fs = Math.max(22, Math.round((34 * perLine) / longest))
  return { lines, fontSizeRpx: fs, indent }
}

// 补全一张明信片渲染所需字段
function decorateCard(rec) {
  const orient = rec.orient || 'land'
  const arrange = rec.arrange || 'h'
  const position = rec.position || 'center'
  const q = buildQuote(rec.quote, orient, arrange, position)
  return Object.assign({}, rec, {
    orient, arrange, position,
    quoteLines: q.lines,
    quoteFontSize: q.fontSizeRpx,
    indent: q.indent,
    sign: rec.sign || '红韵智演',
    date: formatDate(rec.date)
  })
}

// ---------------- Canvas 精绘 ----------------

function paintPostcard(ctx, W, H, rec) {
  const colors = (rec.colors && rec.colors.length === 2) ? rec.colors : ['#C8161D', '#7A0A10']
  const F = FONTS[rec.font] || FONTS.maoti
  const orient = rec.orient || 'land'
  const arrange = rec.arrange || 'h'
  const position = rec.position || 'center'

  // 背景
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, colors[0])
  g.addColorStop(1, colors[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#ffffff'

  // 场景名（左上）
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.font = F.weight + ' 40px ' + F.family
  ctx.fillText(rec.scene || '', 40, 40)

  // 落款（右下，双行：日期 / 红韵智演）
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,.9)'
  ctx.font = '400 22px sans-serif'
  ctx.fillText(rec.date || '', W - 40, H - 76)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 28px sans-serif'
  ctx.fillText(rec.sign || '红韵智演', W - 40, H - 44)

  // 名言（不加引号，按用户要求纯文本呈现）
  const quote = (rec.quote && String(rec.quote).trim()) ? rec.quote : DEFAULT_QUOTE
  const q = quote
  if (arrange === 'v') paintVertical(ctx, q, W, H, F, orient, position)
  else paintHorizontal(ctx, q, W, H, F, orient, position)
}

function paintHorizontal(ctx, q, W, H, F, orient, position) {
  const pad = 40
  // br（右下）多行时降级为 bottom 居中，避让右下落款带
  const eff = (position === 'br' && q.length > (orient === 'port' ? 9 : 14)) ? 'bottom' : position

  let boxX = pad
  let boxW = W - pad * 2
  let align = 'center'
  if (eff === 'left' || eff === 'tl' || eff === 'bl') { boxW = (W - pad * 2) * 0.62; align = 'left' }
  if (eff === 'right' || eff === 'tr') { boxX = pad + (W - pad * 2) * 0.38; boxW = (W - pad * 2) * 0.62; align = 'right' }

  // 字号自适应：先按换行切段、去句尾标点，以最长段为基准测量，超宽则缩（min 20）
  let fs = orient === 'port' ? 40 : 38
  ctx.font = F.weight + ' ' + fs + 'px ' + F.family
  const segs = splitQuoteLines(q, 'h', q.length)
  let longestW = 0
  for (const s of segs) longestW = Math.max(longestW, ctx.measureText(s).width)
  if (longestW > boxW) {
    fs = Math.max(20, Math.floor((fs * boxW) / longestW))
    ctx.font = F.weight + ' ' + fs + 'px ' + F.family
  }

  // 分行：以换行符断行；续行缩进两字；超长段再均衡折行
  const perLine = Math.max(1, Math.floor(boxW / (fs * 0.95)))
  let lines = splitQuoteLines(q, 'h', perLine)

  // 限行（最多 6 行）：超出再缩字号
  if (lines.length > 6) {
    fs = Math.max(18, Math.floor((fs * 6) / lines.length))
    ctx.font = F.weight + ' ' + fs + 'px ' + F.family
    const pl = Math.max(1, Math.floor(boxW / (fs * 0.95)))
    lines = splitQuoteLines(q, 'h', pl)
    if (lines.length > 6) lines = lines.slice(0, 6)
  }

  const lineH = fs * 1.5
  const totalH = lines.length * lineH
  const indentX = fs * 2 // 续行缩进两字

  // 垂直锚点（bottom 系预留落款带）
  let y
  if (eff === 'top' || eff === 'tl' || eff === 'tr') y = SCENE_BAND
  else if (eff === 'bottom' || eff === 'bl' || eff === 'br') y = H - SIGN_BAND - totalH
  else y = (H - totalH) / 2

  ctx.textBaseline = 'top'
  ctx.textAlign = align
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < lines.length; i++) {
    const baseX = align === 'center' ? boxX + boxW / 2
      : align === 'right' ? boxX + boxW
      : boxX
    // 续行相对上一行缩进两字（右对齐则向左缩）
    const x = baseX + (i > 0 ? (align === 'right' ? -indentX : indentX) : 0)
    ctx.fillText(lines[i], x, y + i * lineH)
  }
}

function paintVertical(ctx, q, W, H, F, orient, position) {
  const pad = 40
  // 横版竖向容量放宽，使单列可容纳约 14 汉字 + 1 逗号（约 15 字）；竖版保持更大留白
  const maxH = orient === 'port' ? H - 200 : H - 240
  // 先按换行切段、去段尾标点，以最长段为基准定字号（保证单列不超列高）
  const segs = splitQuoteLines(q, 'v', q.length)
  const maxSeg = segs.reduce((m, s) => Math.max(m, s.length), 0)
  let fs = 46
  const colCap = Math.floor(maxH / (fs * 1.05))
  if (maxSeg > colCap) fs = Math.max(22, Math.floor((fs * colCap) / maxSeg))
  ctx.font = F.weight + ' ' + fs + 'px ' + F.family
  const charH = fs * 1.05
  const cap = Math.floor(maxH / charH)

  // 每段再按列高切列（列序：续列朝中心方向展开）
  const cols = []
  for (const seg of segs) {
    let i = 0
    while (i < seg.length) { cols.push(seg.substr(i, cap)); i += cap }
  }

  // 水平锚点
  let x, colDir
  if (position === 'left' || position === 'tl' || position === 'bl') {
    x = pad + fs / 2
    colDir = 1
  } else if (position === 'center') {
    // 居中：以首列（最右列）中心为基准，整块列向中心展开后整体水平居中
    x = W / 2 + (cols.length - 1) * (fs * 1.15) / 2
    colDir = -1
  } else {
    x = W - pad - fs / 2
    colDir = -1
  }

  // 续列（换行后 / 段内换行）整体向下缩进两字
  const indentY = fs * 2
  const mainH = (cols[0] ? cols[0].length * charH : 0) + indentY

  // 垂直锚点（bottom 系预留落款带；以首列高度 + 续列缩进估算整体块高）
  let y0
  if (position === 'top' || position === 'tl' || position === 'tr') y0 = SCENE_BAND
  else if (position === 'bottom' || position === 'bl' || position === 'br') y0 = H - SIGN_BAND - mainH
  else y0 = (H - mainH) / 2

  // 竖版竖排（左锚点）单列下移，避让左上角场景名，不与其相接
  if (orient === 'port' && (position === 'left' || position === 'tl' || position === 'bl')) {
    y0 = Math.max(y0, SCENE_BAND + 16)
  }

  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  for (let c = 0; c < cols.length; c++) {
    const cx = x + colDir * c * (fs * 1.15)
    const col = cols[c]
    const yStart = y0 + (c > 0 ? indentY : 0)
    for (let j = 0; j < col.length; j++) {
      ctx.fillText(col[j], cx, yStart + j * charH)
    }
  }
}

// 把明信片绘制到离屏 canvas 并导出：统一为竖版(2:3)，
// 横版内容顺时针旋转 90° CW（展示态与导出均统一竖版 2:3、横版内旋），所见即所得。
// canvas：type=2d 的 canvas node；card：与 paintPostcard 同结构。
function renderPostcard(canvas, card) {
  const orient = (card && card.orient) || 'land'
  const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
  const W = 600
  const H = 900
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  // 重设 canvas.width 已重置变换矩阵；这里再显式归零，复用同一节点时安全
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)
  const c = decorateCard(card)
  if (orient === 'land') {
    // 横版 3:2 组合旋转 90° CW 放入 600×900 竖版画布：
    // 逻辑 900×600 → translate(600,0) + rotate(π/2) 恰好映射到 600×900
    ctx.translate(W, 0)
    ctx.rotate(Math.PI / 2)
    paintPostcard(ctx, 900, 600, c)
  } else {
    paintPostcard(ctx, W, H, c)
  }
  return canvas
}

module.exports = { buildQuote, decorateCard, paintPostcard, renderPostcard, DEFAULT_QUOTE }
