// 云函数：getBranch
// 职责：返回某场次的分支进度（最新一条 branch_log）。
// 读取集合：branch_log
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

exports.main = async (event, context) => {
  const showId = event.showId
  if (!showId) return fail(400, 'missing showId')

  try {
    const bRes = await db
      .collection('branch_log')
      .where({ showId })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()
    const b = bRes.data[0]
    const branch = b
      ? { current: b.current || '', locked: !!b.locked, text: b.text || '', branchKey: b.branchKey || '' }
      : { current: '', locked: false, text: '', branchKey: '' }
    return ok(branch)
  } catch (e) {
    return fail(500, 'getBranch failed: ' + e.message)
  }
}
