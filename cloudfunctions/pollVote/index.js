// 云函数：pollVote
// 职责：游客投票，原子自增票数并写 vote_records；一人一票校验。
// 读取/写入集合：polls（原子 inc）/ vote_records
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

exports.main = async (event, context) => {
  const { OPENID } = getOpenid()
  const { showId, optionId } = event
  if (!OPENID) return fail(401, 'missing openid')
  if (!showId || !optionId) return fail(400, 'missing showId or optionId')

  try {
    // 一人一票校验
    const voted = await db
      .collection('vote_records')
      .where({ openid: OPENID, showId })
      .count()
    if (voted.total > 0) {
      return fail(409, 'already voted', { voted: true })
    }

    // 找到该场次的投票题目
    const pRes = await db
      .collection('polls')
      .where({ showId, open: true })
      .limit(1)
      .get()
    if (!pRes.data[0]) return fail(404, 'no active poll')

    const pollId = pRes.data[0]._id
    const options = pRes.data[0].options || []
    const idx = options.findIndex((o) => o.id === optionId)
    if (idx < 0) return fail(400, 'invalid optionId')

    // 原子自增该选项票数
    await db
      .collection('polls')
      .doc(pollId)
      .update({
        data: { [`options.${idx}.votes`]: _.inc(1) }
      })

    // 落库投票记录
    await db.collection('vote_records').add({
      data: {
        openid: OPENID,
        showId,
        optionId,
        created_at: new Date()
      }
    })

    // 返回最新票数
    const fresh = (await db.collection('polls').doc(pollId).get()).data
    return ok({ voted: true, optionId, poll: fresh })
  } catch (e) {
    return fail(500, 'pollVote failed: ' + e.message)
  }
}
