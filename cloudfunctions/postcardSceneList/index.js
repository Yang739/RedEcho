// 云函数：postcardSceneList
// 职责：明信片场景模板列表（公开，无需登录）。
// 读取集合：postcard_scenes
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

exports.main = async (event, context) => {
  try {
    const res = await db
      .collection('postcard_scenes')
      .orderBy('sort', 'asc')
      .limit(50)
      .get()
    return ok(res.data)
  } catch (e) {
    return fail('postcardSceneList failed: ' + e.message, 500)
  }
}
