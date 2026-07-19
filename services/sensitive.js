// services/sensitive.js —— 轻量敏感词过滤（前端演示用）
// 生产环境应以服务端审核为准；此处仅做客户端基础拦截，避免明显违规内容进入生成流程。
const WORDS = ['毒品', '恐怖', '暴力', '色情', '赌博', '诈骗', '反动', '分裂', '枪支', '炸药']

function containsSensitive(text) {
  if (!text) return false
  const t = String(text)
  return WORDS.some((w) => t.indexOf(w) !== -1)
}

module.exports = { containsSensitive, WORDS }
