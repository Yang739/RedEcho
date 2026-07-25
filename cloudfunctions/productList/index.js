// 云函数：productList
// 职责：返回积分商城文创产品目录（与 services/mall.js 的 PRODUCTS 保持一致）。
// 读取集合：无（静态目录；后续可由 products 集合接管，便于后台上下架）。
// P1-① 补齐：原源码缺 productList 云函数，导致商城在云模式下无法拉取目录。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return { code, msg } }

// 文创产品目录（价格 = 所需积分），须与 services/mall.js 的 PRODUCTS 同步。
const PRODUCTS = [
  { id: 'm1', title: '红船精神书签',     desc: '黄铜烤漆 · 红船浮雕', price: 20,  gradient: 'linear-gradient(135deg,#C8161D 0%,#7A0A10 100%)' },
  { id: 'm2', title: '长征主题徽章',     desc: '合金烤漆 · 背面刻字', price: 30,  gradient: 'linear-gradient(135deg,#E8A33D 0%,#C8161D 100%)' },
  { id: 'm3', title: '延安窑洞香薰',     desc: '草木香调 · 窑洞造型', price: 60,  gradient: 'linear-gradient(135deg,#F6D365 0%,#C8161D 100%)' },
  { id: 'm4', title: '红色记忆帆布包',   desc: '米白加厚 · 经典款',   price: 80,  gradient: 'linear-gradient(135deg,#2B2B2B 0%,#5A1A1D 100%)' },
  { id: 'm5', title: '红军搪瓷水杯',     desc: '复古搪瓷 · 红字印花', price: 100, gradient: 'linear-gradient(135deg,#8E9EAB 0%,#3A3A3A 100%)' },
  { id: 'm6', title: '《星火》演出纪念册', desc: '精装 · 签名版',       price: 120, gradient: 'linear-gradient(135deg,#E23744 0%,#9E0B11 100%)' }
]

exports.main = async () => {
  try {
    return ok({ products: PRODUCTS })
  } catch (e) {
    return fail(500, 'productList failed: ' + e.message)
  }
}
