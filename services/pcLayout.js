// services/pcLayout.js —— 明信片排版引擎（与页面解耦，三页共用）
//
// 职责：
// - buildQuote：根据 名言 / 方向 / 排列 / 位置 计算「尽量一行、分行均衡、续行缩进两字符」的展示方案
// - decorateCard：给一张明信片记录补全渲染所需字段（quoteLines / quoteFontSize / indent / position 等）
// - paintPostcard：在 Canvas 上精绘（按 9 宫格定位、测量缩字号、均衡分行、续行缩进）

const { FONTS } = require('./fonts.js')
const POS_FULL = { top: 1, bottom: 1, center: 1 } // 满宽位置（横排时可整行书写）
const DEFAULT_QUOTE = '在此写下你的红色金句'

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

// 计算名言的展示方案（CSS 预览用）
function buildQuote(quote, orient, arrange, position) {
  const raw = (quote && String(quote).trim()) || DEFAULT_QUOTE
  const text = '“' + raw + '”'
  const full = !!POS_FULL[position]

  if (arrange === 'v') {
    // 竖排：尽量一列放下（按高度），过长则缩字号
    const maxCol = orient === 'port' ? 16 : 11
    let fs = 34
    if (text.length > maxCol) fs = Math.max(22, Math.round((34 * maxCol) / text.length))
    return { lines: [text], fontSizeRpx: fs, indent: false }
  }

  // 横排：先按位置估算一行可容纳字符数（基准字号 34rpx，CJK 约等宽）
  let perLine = orient === 'port'
    ? (full ? 10 : 5)
    : (full ? 15 : 7)

  if (text.length <= perLine) {
    return { lines: [text], fontSizeRpx: 34, indent: false }
  }
  // 仅略长：缩字号强行一行
  if (text.length <= perLine * 1.4) {
    const fs = Math.max(22, Math.round((34 * perLine) / text.length))
    return { lines: [text], fontSizeRpx: fs, indent: false }
  }
  // 过长：均衡分行，续行缩进两字符（仅左侧对齐位置）
  const lines = splitBalanced(text, perLine)
  const indent = (position === 'left' || position === 'tl' || position === 'bl')
  return { lines, fontSizeRpx: 34, indent }
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
    indent: q.indent
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

  // 日期（右下）
  ctx.font = '400 22px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText((rec.date || '') + ' · 红色回响', W - 40, H - 44)

  // 名言
  const quote = (rec.quote && String(rec.quote).trim()) ? rec.quote : DEFAULT_QUOTE
  if (arrange === 'v') paintVertical(ctx, quote, W, H, F, orient, position)
  else paintHorizontal(ctx, quote, W, H, F, orient, position)
}

function paintHorizontal(ctx, quote, W, H, F, orient, position) {
  const pad = 40
  const full = !!POS_FULL[position]
  let boxX = pad
  let boxW = W - pad * 2
  let align = 'center'
  if (position === 'left' || position === 'tl' || position === 'bl') { boxW = (W - pad * 2) * 0.62; align = 'left' }
  if (position === 'right' || position === 'tr' || position === 'br') { boxX = pad + (W - pad * 2) * 0.38; boxW = (W - pad * 2) * 0.62; align = 'right' }

  // 测量并缩字号，尽量一行
  let fs = orient === 'port' ? 40 : 38
  ctx.font = F.weight + ' ' + fs + 'px ' + F.family
  let w = ctx.measureText(quote).width
  if (w > boxW) {
    fs = Math.max(20, Math.floor((fs * boxW) / w))
    ctx.font = F.weight + ' ' + fs + 'px ' + F.family
    w = ctx.measureText(quote).width
  }

  // 分行（均衡）
  const charW = fs * 0.95
  const perLine = Math.max(1, Math.floor(boxW / charW))
  let lines
  if (quote.length <= perLine) lines = [quote]
  else lines = splitBalanced(quote, perLine)

  const lineH = fs * 1.5
  const totalH = lines.length * lineH
  const indentX = (position === 'left' || position === 'tl' || position === 'bl') ? fs * 2 : 0

  // 垂直锚点
  let y
  if (position === 'top' || position === 'tl' || position === 'tr') y = 112
  else if (position === 'bottom' || position === 'bl' || position === 'br') y = H - 64 - totalH
  else y = (H - totalH) / 2

  ctx.textBaseline = 'top'
  ctx.textAlign = align
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < lines.length; i++) {
    let x = align === 'center'
      ? boxX + boxW / 2
      : (align === 'right' ? boxX + boxW : boxX + (i > 0 ? indentX : 0))
    ctx.fillText(lines[i], x, y + i * lineH)
  }
}

function paintVertical(ctx, quote, W, H, F, orient, position) {
  const pad = 40
  const maxH = orient === 'port' ? H - 200 : H - 260
  let fs = 46
  const colCap = Math.floor(maxH / (fs * 1.05))
  if (quote.length > colCap) fs = Math.max(22, Math.floor((fs * colCap) / quote.length))
  ctx.font = F.weight + ' ' + fs + 'px ' + F.family
  const charH = fs * 1.05
  const cap = Math.floor(maxH / charH)

  // 拆成多列（自右向左）
  const cols = []
  let i = 0
  while (i < quote.length) { cols.push(quote.substr(i, cap)); i += cap }

  // 水平锚点
  let x
  if (position === 'left' || position === 'tl' || position === 'bl') x = pad + fs / 2
  else if (position === 'center') x = W / 2
  else x = W - pad - fs / 2

  // 垂直锚点
  const colH = cols.length * charH
  let y0
  if (position === 'top' || position === 'tl' || position === 'tr') y0 = 112
  else if (position === 'bottom' || position === 'bl' || position === 'br') y0 = H - 64 - colH
  else y0 = (H - colH) / 2

  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  for (let c = 0; c < cols.length; c++) {
    const cx = x - c * (fs * 1.15)
    const col = cols[c]
    for (let j = 0; j < col.length; j++) {
      ctx.fillText(col[j], cx, y0 + j * charH)
    }
  }
}

module.exports = { buildQuote, decorateCard, paintPostcard, DEFAULT_QUOTE }
