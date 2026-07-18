// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化：DYNAMIC_CURRENT_ENV 自动指向当前云环境，无需手写 env
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取小程序调用方的身份上下文（游客 openid 等）
  const { OPENID, APPID } = cloud.getWXContext()
  const action = event.action

  // 示例分支 1：投票（实际项目应拆分为独立云函数 pollVote）
  if (action === 'vote') {
    // TODO: 写入 vote_records，并通过腾讯云 IM 广播结果
    return {
      code: 0,
      msg: 'vote received',
      data: { openid: OPENID, optionKey: event.optionKey }
    }
  }

  // 示例分支 2：生成明信片（实际项目应拆分为 postcardGenerate，调用文生图 API）
  if (action === 'generate') {
    // TODO: 调用混元/Stable Diffusion，结果存入 postcards 表，返回 imageUrl
    return {
      code: 0,
      msg: 'generate received',
      data: { openid: OPENID, sceneId: event.sceneId }
    }
  }

  // 默认逻辑：游客登录态登记（首次自动建用户）
  let user = await db.collection('users').where({ openid: OPENID }).get()
  if (!user.data.length) {
    await db.collection('users').add({
      data: {
        openid: OPENID,
        role: 0,
        points: 0,
        level: '新兵',
        created_at: new Date()
      }
    })
  }

  return {
    code: 0,
    msg: 'ok',
    data: { openid: OPENID, appid: APPID }
  }
}
