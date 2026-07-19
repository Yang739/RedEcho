// services/quote.js —— 金句输入框约束
// 规则：有效字数 = 去掉换行后的字符数（标点也算）；上限 20；超出则截断并保留换行结构。
const MAX_QUOTE = 20

// 对输入做约束：保留换行，但非换行字符最多保留 limit 个（默认 20）
// 返回 { text: 约束后的文本, count: 有效字数(不含换行) }
function clampQuote(v, limit) {
  const max = (typeof limit === 'number' && limit > 0) ? limit : MAX_QUOTE
  const s = (v == null) ? '' : String(v)
  let count = 0
  let out = ''
  for (const ch of s) {
    if (ch === '\n' || ch === '\r') { out += ch; continue } // 换行不计入、也不截断
    if (count < max) { out += ch; count++ }
  }
  return { text: out, count }
}

// 仅统计有效字数（不含换行），用于实时计数展示
function quoteCount(v) {
  return String(v == null ? '' : v).replace(/\r?\n/g, '').length
}

module.exports = { clampQuote, quoteCount, MAX_QUOTE }
