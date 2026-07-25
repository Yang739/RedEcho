// services/level.js —— 等级制度（红色主题）
//
// 规则（与产品需求一致）：
//   1) 1 积分（获得）= 1 经验；经验来自累计获得的积分。
//   2) 积分消费（兑换文创等）不影响经验 —— 经验只增不减。
//   经验值由 store.exp 提供（store.addPoints 在正 delta 时累加），本模块只负责
//   「经验 → 等级 / 称号 / 进度」的纯函数映射，便于页面复用与单测。
//
// 等级表：exp 为「升到下一级所需累计经验」阈值；Lv1 从 0 起。
const TIERS = [
  { lv: 1,  name: '新兵',     exp: 0 },
  { lv: 2,  name: '宣传员',   exp: 100 },
  { lv: 3,  name: '红军战士', exp: 300 },
  { lv: 4,  name: '长征先锋', exp: 600 },
  { lv: 5,  name: '星火讲师', exp: 1000 },
  { lv: 6,  name: '赤焰骨干', exp: 1500 },
  { lv: 7,  name: '革命功臣', exp: 2500 },
  { lv: 8,  name: '红色脊梁', exp: 4000 },
  { lv: 9,  name: '燎原之星', exp: 6000 },
  { lv: 10, name: '信仰丰碑', exp: 9000 }
]

// 根据累计经验返回等级信息
// 返回 { lv, name, exp, curExp, nextExp, nextName, gap, pct, isMax }
function calc(exp) {
  exp = Math.max(0, Math.floor(exp || 0))
  let cur = TIERS[0]
  let next = null
  for (let i = 0; i < TIERS.length; i++) {
    if (exp >= TIERS[i].exp) {
      cur = TIERS[i]
      next = TIERS[i + 1] || null
    } else {
      break
    }
  }
  const isMax = !next
  const curExp = cur.exp
  const nextExp = next ? next.exp : curExp
  const span = nextExp - curExp
  const inSpan = exp - curExp
  const pct = isMax ? 100 : Math.min(100, Math.round((inSpan / span) * 100))
  const gap = isMax ? 0 : (nextExp - exp)
  return {
    lv: cur.lv,
    name: cur.name,
    exp: exp,
    curExp: curExp,
    nextExp: next ? next.exp : null,
    nextName: next ? next.name : null,
    gap: gap,
    pct: pct,
    isMax: isMax
  }
}

module.exports = { TIERS, calc }
