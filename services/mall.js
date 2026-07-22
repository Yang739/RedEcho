// services/mall.js —— 积分商城（文创产品兑换）
//
// 双模：mock 模式走本地产品目录 + 本地订单存储；云模式由 api.js 转发到
// productList / createOrder 云函数（产品目录仍由前端静态提供，便于无后端时预览）。
//
// 所有价格以「积分」计价；兑换即扣减 store 积分并写入本地订单（含核销码）。

const store = require('../store.js')
const storage = require('./storage.js')

const ORDERS_KEY = 'rede_mall_orders'

// 文创产品目录（价格 = 所需积分）
const PRODUCTS = [
  { id: 'm1', title: '红船精神书签',   desc: '黄铜烤漆 · 红船浮雕',   price: 20,  gradient: 'linear-gradient(135deg,#C8161D 0%,#7A0A10 100%)' },
  { id: 'm2', title: '长征主题徽章',   desc: '合金烤漆 · 背面刻字',   price: 30,  gradient: 'linear-gradient(135deg,#E8A33D 0%,#C8161D 100%)' },
  { id: 'm3', title: '延安窑洞香薰',   desc: '草木香调 · 窑洞造型',   price: 60,  gradient: 'linear-gradient(135deg,#F6D365 0%,#C8161D 100%)' },
  { id: 'm4', title: '红色记忆帆布包', desc: '米白加厚 · 经典款',     price: 80,  gradient: 'linear-gradient(135deg,#2B2B2B 0%,#5A1A1D 100%)' },
  { id: 'm5', title: '红军搪瓷水杯',   desc: '复古搪瓷 · 红字印花',   price: 100, gradient: 'linear-gradient(135deg,#8E9EAB 0%,#3A3A3A 100%)' },
  { id: 'm6', title: '《星火》演出纪念册', desc: '精装 · 签名版',     price: 120, gradient: 'linear-gradient(135deg,#E23744 0%,#9E0B11 100%)' }
]

function genCode() {
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return 'R' + ts + rnd
}

function getProducts() {
  return PRODUCTS
}

function getOrders() {
  const v = storage.get(ORDERS_KEY, [])
  return Array.isArray(v) ? v : []
}

// 兑换：校验库存(此处无限)/积分；成功则扣积分并写入订单
// 返回 { ok, order } 或 { ok:false, reason: 'notfound' | 'points' }
function purchase(productId, qty) {
  qty = qty || 1
  const p = PRODUCTS.find((x) => x.id === productId)
  if (!p) return { ok: false, reason: 'notfound' }
  const total = p.price * qty
  if (store.getState().points < total) return { ok: false, reason: 'points' }
  store.addPoints(-total)
  const order = {
    id: 'mo' + Date.now(),
    productId,
    title: p.title,
    desc: p.desc,
    price: p.price,
    qty,
    total,
    status: '待核销',
    code: genCode(),
    created_at: Date.now(),
    gradient: p.gradient
  }
  const list = getOrders()
  list.unshift(order)
  storage.set(ORDERS_KEY, list)
  return { ok: true, order }
}

module.exports = { getProducts, getOrders, purchase, genCode }
