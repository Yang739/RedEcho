// services/pcLayout.js —— 明信片排版引擎（与页面解耦，三页共用）
//
// 职责：
// - buildQuote：根据 名言 / 方向 / 排列 / 位置 计算展示方案（单行放大 / 均衡分行 / 续行缩进）
// - decorateCard：补全渲染字段（quoteLines / quoteFontSize / indent / sign / 统一格式 date）
// - paintPostcard：Canvas 精绘（9 宫格定位、字号自适应、落款双行、名句避让落款带）

const { FONTS } = require('./fonts.js')
const POS_FULL = { top: 1, bottom: 1, center: 1 } // 满宽位置（横排时可整行书写）
const DEFAULT_QUOTE = '在此写下你的红色金句'
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

// 日期统一为 YYYY.MM.DD（落库为 YYYY-MM-DD，预览/导出一致）
function formatDate(d) {
  if (!d) return ''
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return m[1] + '.' + m[2] + '.' + m[3]
  return d
}

// 计算名言的展示方案（CSS 预览用，与 Canvas 规则对齐）
function buildQuote(quote, orient, arrange, position) {
  const raw = (quote && String(quote).trim()) || DEFAULT_QUOTE
  const text = raw
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

  // 单行且字少：放大字号，使长短句都饱满不空旷
  if (text.length <= perLine) {
    const boost = text.length <= Math.ceil(perLine * 0.6) ? 6 : 0
    return { lines: [text], fontSizeRpx: Math.min(44, 34 + boost), indent: false }
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
    indent: q.indent,
    sign: rec.sign || '红色回响',
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

  // 落款（右下，双行：日期 / 红色回响）
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,.9)'
  ctx.font = '400 22px sans-serif'
  ctx.fillText(rec.date || '', W - 40, H - 76)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 28px sans-serif'
  ctx.fillText(rec.sign || '红色回响', W - 40, H - 44)

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

  // 字号自适应：先按基准字号测量，超宽则缩（min 20）
  let fs = orient === 'port' ? 40 : 38
  ctx.font = F.weight + ' ' + fs + 'px ' + F.family
  let w = ctx.measureText(q).width
  if (w > boxW) {
    fs = Math.max(20, Math.floor((fs * boxW) / w))
    ctx.font = F.weight + ' ' + fs + 'px ' + F.family
  }

  // 分行（均衡）
  const charW = fs * 0.95
  const perLine = Math.max(1, Math.floor(boxW / charW))
  let lines = q.length <= perLine ? [q] : splitBalanced(q, perLine)

  // 限行（最多 6 行）：超出再缩字号，仍超则截断
  if (lines.length > 6) {
    fs = Math.max(18, Math.floor((fs * 6) / lines.length))
    ctx.font = F.weight + ' ' + fs + 'px ' + F.family
    const pl = Math.max(1, Math.floor(boxW / (fs * 0.95)))
    lines = splitBalanced(q, pl)
    if (lines.length > 6) lines = lines.slice(0, 6)
  }

  const lineH = fs * 1.5
  const totalH = lines.length * lineH
  const indentX = (eff === 'left' || eff === 'tl' || eff === 'bl') ? fs * 2 : 0

  // 垂直锚点（bottom 系预留落款带）
  let y
  if (eff === 'top' || eff === 'tl' || eff === 'tr') y = SCENE_BAND
  else if (eff === 'bottom' || eff === 'bl' || eff === 'br') y = H - SIGN_BAND - totalH
  else y = (H - totalH) / 2

  ctx.textBaseline = 'top'
  ctx.textAlign = align
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < lines.length; i++) {
    const x = align === 'center'
      ? boxX + boxW / 2
      : (align === 'right' ? boxX + boxW : boxX + (i > 0 ? indentX : 0))
    ctx.fillText(lines[i], x, y + i * lineH)
  }
}

function paintVertical(ctx, q, W, H, F, orient, position) {
  const pad = 40
  const maxH = orient === 'port' ? H - 200 : H - 260
  let fs = 46
  const colCap = Math.floor(maxH / (fs * 1.05))
  if (q.length > colCap) fs = Math.max(22, Math.floor((fs * colCap) / q.length))
  ctx.font = F.weight + ' ' + fs + 'px ' + F.family
  const charH = fs * 1.05
  const cap = Math.floor(maxH / charH)

  // 拆成多列（自右向左）
  const cols = []
  let i = 0
  while (i < q.length) { cols.push(q.substr(i, cap)); i += cap }

  // 水平锚点
  let x
  if (position === 'left' || position === 'tl' || position === 'bl') x = pad + fs / 2
  else if (position === 'center') x = W / 2
  else x = W - pad - fs / 2

  // 垂直锚点（bottom 系预留落款带）
  const colH = cols.length * charH
  let y0
  if (position === 'top' || position === 'tl' || position === 'tr') y0 = SCENE_BAND
  else if (position === 'bottom' || position === 'bl' || position === 'br') y0 = H - SIGN_BAND - colH
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
