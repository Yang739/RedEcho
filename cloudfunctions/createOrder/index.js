// 云函数：createOrder
// 职责：周边商城下单（积分/混合支付，生成核销码）。
// 写入集合：orders
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

function genCode() {
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = crypto.randomBytes(3).toString('hex').toUpperCase()
  return 'R' + ts + rnd
}

exports.main = async (event, context) => {
  const { OPENID } = getOpenid()
  if (!OPENID) return fail(401, 'missing openid')

  const { productId, title, spec, price, payType } = event
  if (!productId || price === undefined) return fail(400, 'missing productId or price')

  try {
    const now = new Date()
    const addRes = await db.collection('orders').add({
      data: {
        openid: OPENID,
        productId,
        title: title || '商品',
        spec: spec || '',
        price: price || 0,
        payType: payType || 'points',
        status: '待核销',
        redemptionCode: genCode(),
        created_at: now
      }
    })
    const order = (await db.collection('orders').doc(addRes._id).get()).data
    return ok(order)
  } catch (e) {
    return fail(500, 'createOrder failed: ' + e.message)
  }
}
