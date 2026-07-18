// 云函数：aiLineGenerate
// 职责：演员 AI 台词助手 —— 结合角色/情境生成多条备选台词。
//
// 真实接入（腾讯云混元大模型）：
//   - 在云函数控制台「配置 → 环境变量」中配置：
//       TENCENT_SECRET_ID  = 你的腾讯云 SecretId
//       TENCENT_SECRET_KEY = 你的腾讯云 SecretKey
//       TENCENT_REGION     = ap-guangzhou（可选，默认）
//       HUNYUAN_MODEL      = hunyuan-standard（可选，默认）
//   - 未配置或调用失败时，自动回退到内置示例台词（placeholder:true），保证可用。
// 返回字段保持 { role, scene, situation, lines:[{text,tone,reason}], placeholder }。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

const SECRET_ID = process.env.TENCENT_SECRET_ID
const SECRET_KEY = process.env.TENCENT_SECRET_KEY
const REGION = process.env.TENCENT_REGION || 'ap-guangzhou'
const MODEL = process.env.HUNYUAN_MODEL || 'hunyuan-standard'

// 从大模型文本中解析出台词数组（兼容 JSON / 退化分行）
function parseLines(content) {
  if (!content) return null
  let arr = extractJsonArray(content)
  if (Array.isArray(arr) && arr.length) {
    const lines = arr.slice(0, 5).map((it) => ({
      text: String(it.text || it.content || '').trim(),
      tone: String(it.tone || it.emotion || '深情').trim(),
      reason: String(it.reason || it.note || '').trim()
    })).filter((l) => l.text)
    if (lines.length) return lines
  }
  // 退化：按行拆分
  return content.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 5)
    .map((text) => ({ text, tone: '深情', reason: '' }))
}

function extractJsonArray(s) {
  try {
    const m = s.match(/\[[\s\S]*\]/)
    if (m) return JSON.parse(m[0])
  } catch (e) { /* ignore */ }
  try { return JSON.parse(s) } catch (e) { /* ignore */ }
  return null
}

// 调用腾讯云混元大模型，返回台词数组或 null（走回退）
async function callHunyuan(role, scene, situation) {
  if (!SECRET_ID || !SECRET_KEY) return null
  let hunyuan
  try {
    hunyuan = require('tencentcloud-sdk-nodejs-hunyuan')
  } catch (e) {
    console.warn('[aiLineGenerate] 未安装 tencentcloud-sdk-nodejs-hunyuan，回退示例台词')
    return null
  }
  const client = new hunyuan.hunyuan.v20230901.Client({
    credential: { secretId: SECRET_ID, secretKey: SECRET_KEY },
    region: REGION,
    profile: { httpProfile: { endpoint: 'hunyuan.tencentcloudapi.com' } }
  })
  const prompt =
    `你是沉浸式红色实景演出的编剧助手。请为以下设定生成 3 条可选台词，` +
    `兼顾戏剧张力与史实基调，并标注每条的情绪基调与创作意图。\n` +
    `角色：${role || '主角'}\n场景：${scene || '未知'}\n情境：${situation || ' unspecified'}\n` +
    `请严格以 JSON 数组返回，每条格式：{"text":"台词正文","tone":"情绪基调","reason":"创作意图"}，` +
    `不要输出任何额外说明文字。`
  const resp = await client.ChatCompletions({
    Model: MODEL,
    Messages: [{ Role: 'user', Content: prompt }],
    Stream: false
  })
  const content = resp && resp.Choices && resp.Choices[0] && resp.Choices[0].Message && resp.Choices[0].Message.Content
  return parseLines(content)
}

// 内置示例（回退用）
const FALLBACK_LINES = [
  { text: '同志们，天快亮了。把火把举高点，让后面的人看清路。', tone: '坚定', reason: '在突围情境下稳定军心，呼应「冒险突围」分支' },
  { text: '别出声。听——风里有追兵的马蹄，我们得从这崖缝钻过去。', tone: '警觉', reason: '营造紧张感，推动剧情进入潜行段落' },
  { text: '这封信，我替牺牲的战友带到了。他说，回家替他看一眼麦田。', tone: '深情', reason: '情绪落点，呼应「烽火家书」主题' }
]

exports.main = async (event, context) => {
  const { role, scene, situation } = event

  let lines = null
  let placeholder = false
  try {
    lines = await callHunyuan(role, scene, situation)
  } catch (e) {
    console.warn('[aiLineGenerate] 大模型调用异常，回退示例台词：', e && e.message)
  }
  if (!lines || !lines.length) {
    lines = FALLBACK_LINES
    placeholder = true
  }

  return ok({
    role: role || '主角',
    scene: scene || '',
    situation: situation || '',
    lines,
    placeholder
  })
}
