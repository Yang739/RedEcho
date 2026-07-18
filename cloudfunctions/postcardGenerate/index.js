// 云函数：postcardGenerate
// 职责：AIGC 明信片 —— 依据场景 + 金句调用文生图生成底图，存云存储并返回可直接显示的 URL。
//
// 真实接入（腾讯云 AI 绘画）：
//   - 在云函数控制台「配置 → 环境变量」中配置：
//       TENCENT_SECRET_ID  = 你的腾讯云 SecretId
//       TENCENT_SECRET_KEY = 你的腾讯云 SecretKey
//       TENCENT_REGION     = ap-guangzhou（可选，默认）
//   - 未配置或调用/审核失败时，自动回退到 CSS 渐变卡（placeholder:true, imageUrl:''），保证可用。
// 返回字段保持 { id, scene, gradient, colors, quote, date, imageUrl?, placeholder }。
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

// 场景模板（与前端 mock.scenes 保持一致，可由 postcard_scenes 集合接管）
const SCENES = {
  sc1: { name: '红船旭日', gradient: 'linear-gradient(135deg,#C8161D 0%,#7A0A10 100%)', colors: ['#C8161D', '#7A0A10'], desc: '南湖晨光，希望初升' },
  sc2: { name: '井冈翠竹', gradient: 'linear-gradient(135deg,#E23744 0%,#9E0B11 100%)', colors: ['#E23744', '#9E0B11'], desc: '竹海苍翠，星火点点' },
  sc3: { name: '雪山丰碑', gradient: 'linear-gradient(135deg,#8E9EAB 0%,#3A3A3A 100%)', colors: ['#8E9EAB', '#3A3A3A'], desc: '风雪漫漫，信仰如钢' },
  sc4: { name: '延安晨曦', gradient: 'linear-gradient(135deg,#F6D365 0%,#C8161D 100%)', colors: ['#F6D365', '#C8161D'], desc: '宝塔破晓，灯火可亲' },
  sc5: { name: '天安门红', gradient: 'linear-gradient(135deg,#E8A33D 0%,#C8161D 100%)', colors: ['#E8A33D', '#C8161D'], desc: '城楼巍峨，山河无恙' },
  sc6: { name: '长征星河', gradient: 'linear-gradient(135deg,#2B2B2B 0%,#5A1A1D 100%)', colors: ['#2B2B2B', '#5A1A1D'], desc: '万里星河，步履不停' }
}

const QUOTES = [
  '星星之火，可以燎原。',
  '为有牺牲多壮志，敢教日月换新天。',
  '江山就是人民，人民就是江山。',
  '一代人有一代人的长征。'
]

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 调用腾讯云 AI 绘画（文生图），返回 base64 或 null（走回退）
async function callTextToImage(prompt) {
  if (!SECRET_ID || !SECRET_KEY) return null
  let aiart
  try {
    aiart = require('tencentcloud-sdk-nodejs-aiart')
  } catch (e) {
    console.warn('[postcardGenerate] 未安装 tencentcloud-sdk-nodejs-aiart，回退 CSS 渲染')
    return null
  }
  const client = new aiart.aiart.v20221229.Client({
    credential: { secretId: SECRET_ID, secretKey: SECRET_KEY },
    region: REGION,
    profile: { httpProfile: { endpoint: 'aiart.tencentcloudapi.com' } }
  })
  const resp = await client.TextToImage({
    Prompt: prompt,
    RspImgType: 'base64'
  })
  return resp && resp.ResultImage ? resp.ResultImage : null
}

// 将 base64 上传云存储并返回可直接 <image> 显示的临时 URL
async function saveImage(base64) {
  const buf = Buffer.from(base64, 'base64')
  const cloudPath = `postcards/${Date.now()}.png`
  const up = await cloud.uploadFile({ cloudPath, fileContent: buf })
  if (!up || !up.fileID) return ''
  const tmp = await cloud.getTempFileURL({ fileList: [up.fileID] })
  const item = tmp && tmp.fileList && tmp.fileList[0]
  return (item && item.tempFileURL) || ''
}

exports.main = async (event, context) => {
  const { OPENID } = getOpenid()
  const { sceneId, quote, customText } = event
  const scene = SCENES[sceneId] || SCENES.sc1
  const finalQuote = (customText || quote || QUOTES[Math.floor(Math.random() * QUOTES.length)])

  let imageUrl = ''
  if (SECRET_ID && SECRET_KEY) {
    try {
      const prompt =
        `艺术海报风格插画，主题「${scene.name}」：${scene.desc}。` +
        `电影感光照，庄重而温暖的革命历史氛围，构图留白充足，无人物特写，不要任何文字。` +
        `配色参考：${scene.colors.join('、')}。`
      const b64 = await callTextToImage(prompt)
      if (b64) imageUrl = await saveImage(b64)
    } catch (e) {
      console.warn('[postcardGenerate] 文生图失败，回退 CSS 渲染：', e && e.message)
    }
  }
  const placeholder = !imageUrl

  const result = {
    id: 'p' + Date.now(),
    scene: scene.name,
    gradient: scene.gradient,
    colors: scene.colors,
    quote: finalQuote,
    date: today(),
    imageUrl,
    placeholder
  }

  // 登录态下可落库（集合不存在时云开发自动创建）
  if (OPENID) {
    try {
      await db.collection('postcards').add({
        data: {
          openid: OPENID,
          scene: scene.name,
          gradient: scene.gradient,
          colors: scene.colors,
          quote: finalQuote,
          date: result.date,
          imageUrl,
          created_at: new Date()
        }
      })
    } catch (e) { /* 落库失败不影响返回 */ }
  }

  return ok(result)
}
