// services/api.js —— 业务接口封装（前端 BFF 调用层）
//
// 双模支持：
//   - 当 config.js 的 ENV 仍是占位符 'your-cloud-env-id' 时，所有方法走本地 mock
//     （services/mock.js + setTimeout 模拟），页面交互无需后端即可跑通。
//   - 一旦填入真实云环境 ID，所有方法自动切换为 wx.cloud.callFunction 调用真实云函数。
//
// 约定：所有方法返回 Promise，统一 resolve 业务数据；错误在页面层 catch 处理。

const mock = require('./mock.js')
const resources = require('./resources.js')
const postcards = require('./postcards.js')
const store = require('../store.js')
const mall = require('./mall.js')
const storage = require('./storage.js')
const { ENV } = require('../config.js')

// 是否启用真实云函数：ENV 不是占位符即视为已配置真实环境
const IS_CLOUD = !!(ENV && ENV !== 'your-cloud-env-id')

// 调用云函数的统一封装：成功取 result.data；result.code !== 0 视为业务错误
function call(name, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: data || {},
      success: (res) => {
        const r = res.result || {}
        if (r.code === 0) resolve(r.data)
        else reject(new Error(r.msg || ('cloud function ' + name + ' failed')))
      },
      fail: (err) => reject(err)
    })
  })
}

function delay(data, ms = 420) {
  return new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), ms))
}

// 模拟「实时」数据的小幅波动（用于投票/在线人数等演示）
function jitter(map) {
  return map.map((o) => ({ ...o, votes: o.votes + Math.floor(Math.random() * 6) }))
}

// 演出按开始时间排序：date 形如 "2026-07-18 19:30" 或 "2026-07-18"。
// 用 replace(' ','T') 兼容 iOS 端 Date 解析空格格式可能返回 NaN 的坑。
function showTimeOf(s) {
  if (!s || !s.date) return 0
  const t = new Date(String(s.date).replace(' ', 'T')).getTime()
  return isNaN(t) ? String(s.date) : t
}
function sortShows(list, filter) {
  const cmp = (a, b) => {
    const ta = showTimeOf(a), tb = showTimeOf(b)
    if (typeof ta === 'string' || typeof tb === 'string') {
      return String(ta) < String(tb) ? -1 : String(ta) > String(tb) ? 1 : 0
    }
    return ta - tb
  }
  const arr = (list || []).slice()
  if (filter !== 'all') return arr.sort(cmp)
  // 「全部」：非已结束按时间在前；已结束单独按时间排在末尾
  const active = arr.filter((s) => s.status !== 'ended').sort(cmp)
  const ended = arr.filter((s) => s.status === 'ended').sort(cmp)
  return active.concat(ended)
}

// ===== 工作人员模式（双轨：mock 本地 + 云函数） =====
// 演示账号（与 staff.js 共用，单一数据源）
const DEMO_ACCOUNTS = {
  '13700000000': { name: '管理员演示员', role: 'admin', roleName: '管理员' },
  '13800000000': { name: '场务演示员', role: 'field', roleName: '场务' },
  '13900000000': { name: '演员演示员', role: 'actor', roleName: '演员' }
}
const DEMO_PWD = '123456'

// 工作人员对演出的本地配置覆盖：{ [showId]: { status, inviteCode, pollOpen, question, options, branch } }
// 重进保留，使 mock 模式下工作人员操作可持久化（云模式由服务端保证）。
const SHOW_CFG_KEY = 'rede_show_config'
const NOTICE_KEY = 'rede_notices'
const STAGE_KEY = 'rede_stage'
const SHOWS_LOCAL_KEY = 'rede_shows'   // 本地新建的场次（mock 模式持久化）

function readLocalShows() { return storage.get(SHOWS_LOCAL_KEY, []) }

function readShowConfig() { return storage.get(SHOW_CFG_KEY, {}) }
function writeShowConfig(map) { storage.set(SHOW_CFG_KEY, map) }

// 应用覆盖到演出对象（不污染 mock 源）
function applyShowConfig(show) {
  const cfg = readShowConfig()[show.id]
  if (!cfg) return show
  const out = Object.assign({}, show)
  if (cfg.status !== undefined) out.status = cfg.status
  if (cfg.inviteCode !== undefined) out.inviteCode = cfg.inviteCode
  if (cfg.pollOpen !== undefined) out.pollOpen = cfg.pollOpen
  return out
}

// 应用工作人员改过的投票题目 / 选项
function applyPollConfig(showId) {
  const cfg = readShowConfig()[showId]
  const p = Object.assign({}, mock.poll)
  if (cfg) {
    if (cfg.question !== undefined) p.question = cfg.question
    if (cfg.options !== undefined) p.options = cfg.options
  }
  return p
}

function readNoticeOverride() { return storage.get(NOTICE_KEY, {}) }

function dashPct(options) {
  const total = options.reduce((s, o) => s + o.votes, 0) || 1
  return options.map((o) => Object.assign({}, o, { pct: Math.round((o.votes / total) * 100) }))
}

module.exports = {
  DEMO_ACCOUNTS,
  DEMO_PWD,

  /* ---------------- 首页 ---------------- */
  getHomeData() {
    // 资料卡片统一取本地精选内容（湖南主题史料），双模式均稳定展示
    const recommend = resources.cards
    if (IS_CLOUD) {
      return call('getHomeFeed', {}).then((d) => Object.assign({}, d, { recommend }))
    }
    return delay({
      greeting: '下午好',
      points: store.getState().points,
      todayGain: store.getState().todayGain,
      recommend,
      reading: mock.reading,
      liveShow: mock.shows.find((s) => s.status === 'live') || null
    })
  },

  /* ---------------- 演出 ---------------- */
  // 演出按开始时间排序：date 形如 "2026-07-18 19:30" 或 "2026-07-18"。
  // 用 replace(' ','T') 兼容 iOS 端 Date 解析空格格式可能返回 NaN 的坑。
  getShows(filter = 'all') {
    if (IS_CLOUD) return call('getShows', { status: filter }).then((list) => sortShows(list, filter))
    // mock 模式：合并本地新建场次，使「添加场次」即时可见
    const raw = sortShows(mock.shows.concat(readLocalShows()), filter)
    return delay(raw, 360)
  },

  getShowRoom(showId) {
    if (IS_CLOUD) return call('getShowRoom', { showId })
    let show = mock.shows.find((s) => s.id === showId)
      || readLocalShows().find((s) => s.id === showId)
      || mock.shows[0]
    show = applyShowConfig(show)            // 应用工作人员改过的 status/inviteCode/pollOpen
    const poll = applyPollConfig(showId)    // 应用工作人员改过的 question/options
    const notices = (readNoticeOverride()[showId]) || mock.notices
    const stage = (storage.get(STAGE_KEY, {})[showId]) || { danmaku: [] }
    const danmaku = stage.danmaku.slice(-30).reverse().map((m) => ({ id: m.id, text: m.text, time: m.time }))
    return delay({
      show,
      poll,
      emotions: mock.emotions,
      notices,
      danmaku
    })
  },

  // 邀请码核验：演示用本地比对 mock.shows.inviteCode；
  // 生产环境应改为服务端校验（云函数 verifyInvite），且邀请码不应下发到客户端。
  // 房间页据此解锁互动（弹幕 / 投票 / 情绪 / 分支）；实时校验后端由用户后续接入。
  verifyInvite(showId, code) {
    if (IS_CLOUD) return call('verifyInvite', { showId, code })
    const show = mock.shows.find((s) => s.id === showId)
    const expect = show && show.inviteCode
    const ok = !!expect && String(code || '').trim().toUpperCase() === String(expect).trim().toUpperCase()
    return delay({ ok }, 220)
  },

  // 投票（真实环境：云函数 pollVote 原子自增 + 一人一票校验）
  submitVote(showId, optionId) {
    if (IS_CLOUD) return call('pollVote', { showId, optionId })
    return delay({ ok: true, showId, optionId, ts: Date.now() }, 240)
  },

  submitEmotion(showId, type) {
    if (IS_CLOUD) return call('submitEmotion', { showId, type })
    return delay({ ok: true, type }, 160)
  },

  // 实时轮询投票结果：云模式下复用 getShowRoom 拉取最新票数；mock 模式小幅波动
  pollResult(showId) {
    if (IS_CLOUD) return call('getShowRoom', { showId }).then((d) => d.poll.options)
    return delay(jitter(mock.poll.options), 600)
  },

  // 演出回顾：云函数 showReview（场次 + 我的投票 + 情绪分布 + 金句）
  getReview(showId) {
    if (IS_CLOUD) return call('showReview', { showId })
    return delay({
      show: mock.shows.find((s) => s.id === showId) || mock.shows[0],
      myVote: '冒险突围',
      emotionDist: [
        { label: '感动', pct: 42 },
        { label: '震撼', pct: 31 },
        { label: '激昂', pct: 19 },
        { label: '沉思', pct: 8 }
      ],
      quote: mock.quotes[1]
    })
  },

  /* ---------------- 创作 / 明信片 ---------------- */
  // 场景模板：云函数 postcardSceneList
  // 云模式：云端空集合/云函数未部署时回退本地 mock.scenes，保证本地可跑通（有数据则优先云端）
  getScenes() {
    if (!IS_CLOUD) return delay(mock.scenes, 320)
    return call('postcardSceneList', {})
      .then((list) => (list && list.length ? list : mock.scenes))
      .catch(() => mock.scenes)
  },

  // 生成明信片：云函数 postcardGenerate（文生图接入点已标注为占位）
  // customText：用户自定义金句（为空则随机抽名言库）
  // opts：{ orient, arrange, font, position }
  //   - orient: 'land'|'port'（匹配图片朝向）
  //   - arrange: 'h'|'v'（横排/竖排）
  //   - font: 'maoti'|'shoujin'|'liu'|'yan'（仅 UI 展示修饰词）
  //   - position: 'top'|'bottom'|'left'|'right'|'tl'|'tr'|'bl'|'br'|'center'（名言九宫格位置）
  // 云模式：云端生成失败（未部署/文生图异常）时回退本地 CSS 生成，保证本地可跑通
  generatePostcard(sceneId, customText, opts) {
    opts = opts || {}
    const fallback = () => {
      const scene = mock.scenes.find((s) => s.id === sceneId) || mock.scenes[0]
      const quote = (customText && customText.trim()) || ''
      return delay({
        id: 'p' + Date.now(),
        scene: scene.name,
        gradient: scene.gradient,
        colors: scene.colors,
        quote,
        date: '2026-07-18',
        orient: opts.orient || 'land',
        arrange: opts.arrange || 'h',
        font: opts.font || 'maoti',
        position: opts.position || 'center'
      }, 1600)
    }
    if (!IS_CLOUD) return fallback()
    return call('postcardGenerate', {
      sceneId,
      customText: customText || '',
      orient: opts.orient || 'land',
      arrange: opts.arrange || 'h',
      font: opts.font || 'maoti',
      position: opts.position || 'center'
    }).catch(fallback)
  },

  // 我的明信片（我的作品）：以本地存储 postcards 为准（与创作落库同源）
  // 作品为 0 时不自动生成示例，直接返回当前列表（空则空），由页面展示「暂无作品」空态
  getPostcards() {
    return delay(postcards.getList(), 200)
  },

  /* ---------------- 我的 ---------------- */
  // 个人中心：云函数 getUserProfile（档案 + 积分 + 统计 + 积分商城兑换）
  getMine() {
    if (IS_CLOUD) return call('getUserProfile', {})
    return delay({
      user: { nickname: '红色旅人', avatarText: '红', level: '长征先锋', isStaff: false },
      points: store.getState().points,
      stats: { postcards: 2, orders: 2, favorites: 12 },
      orders: mock.orders
    })
  },

  getOrders() {
    if (IS_CLOUD) return call('getOrders', {})
    return delay(mock.orders, 300)
  },

  /* ---------------- 积分商城 ---------------- */
  // 文创产品目录：云模式回退本地静态目录（便于无后端时预览）
  getProducts() {
    if (IS_CLOUD) return call('productList', {}).catch(() => mall.getProducts())
    return delay(mall.getProducts(), 200)
  },

  // 我的兑换（积分商城订单）
  getMallOrders() {
    if (IS_CLOUD) return call('getOrders', {})
    return delay(mall.getOrders(), 200)
  },

  // 兑换文创产品：扣减积分并生成订单；云模式转发 createOrder 云函数
  purchaseProduct(productId, qty) {
    if (IS_CLOUD) {
      const p = mall.getProducts().find((x) => x.id === productId)
      if (!p) return Promise.reject(new Error('product not found'))
      return call('createOrder', {
        productId,
        title: p.title,
        spec: p.desc,
        price: p.price,
        payType: 'points'
      }).then((o) => ({ ok: true, order: Object.assign({}, o, { id: o._id || o.id }) }))
    }
    return delay(mall.purchase(productId, qty), 260)
  },

  /* ---------------- 工作人员模式（双轨） ---------------- */
  // 登录：mock 比对 DEMO_ACCOUNTS；云模式走 staffLogin 云函数（返回 {role, roleName, name}）
  // 注意：call() 在云模式成功时 resolve 的是业务数据（无 ok 字段），
  // 而页面层 staff.js 依赖 { ok, msg } 形态判断成败。故此处统一包成 {ok,...}，
  // 否则云模式即便密码正确也会被误判为「账号或密码错误」（r.ok 恒为 undefined）。
  staffLogin(phone, pwd) {
    if (!IS_CLOUD) {
      const acc = DEMO_ACCOUNTS[phone]
      if (!acc || pwd !== DEMO_PWD) return delay({ ok: false, msg: '演示账号或密码错误' }, 200)
      return delay({ ok: true, name: acc.name, role: acc.role, roleName: acc.roleName }, 200)
    }
    return call('staffLogin', { phone, pwd })
      .then((d) => ({ ok: true, name: d.name, role: d.role, roleName: d.roleName }))
      .catch((e) => ({ ok: false, msg: e.message || '账号或密码错误' }))
  },

  // 校验工作人员 token（云模式由 staffVerify 校验；mock 直接通过）
  staffVerify(token, code) {
    if (IS_CLOUD) return call('staffVerify', { token, code })
    return delay({ ok: true }, 200)
  },

  // 翻转演出状态：upcoming→live（开场）/ live→ended（散场）
  setShowStatus(showId, status) {
    if (IS_CLOUD) return call('showControl', { showId, status })
    const cfg = readShowConfig()
    cfg[showId] = Object.assign({}, cfg[showId], { status })
    writeShowConfig(cfg)
    return delay({ ok: true, showId, status }, 200)
  },

  // 新建演出场次（添加场次）：云模式写 shows 集合；mock 落地本地，供列表/房间读取
  createShow(payload) {
    if (IS_CLOUD) return call('createShow', payload)
    const list = readLocalShows()
    const id = 's' + Date.now()
    const show = Object.assign({
      id, status: 'upcoming', pollOpen: false, online: 0, segment: '未开始',
      inviteCode: 'NEW' + Math.floor(Math.random() * 900 + 100)
    }, payload)
    list.unshift(show)
    storage.set(SHOWS_LOCAL_KEY, list)
    return delay({ id, show }, 200)
  },

  // 投票管控：patch = { pollOpen?, question?, options? }
  setPoll(showId, patch) {
    if (IS_CLOUD) return call('pollUpdate', { showId, patch })
    const cfg = readShowConfig()
    cfg[showId] = Object.assign({}, cfg[showId], patch)
    writeShowConfig(cfg)
    return delay({ ok: true, showId, patch }, 200)
  },

  // 设置 / 重置邀请码（注意：生产应服务端存储，不得下发客户端）
  setInvite(showId, code) {
    if (IS_CLOUD) return call('inviteSet', { showId, code })
    const cfg = readShowConfig()
    cfg[showId] = Object.assign({}, cfg[showId], { inviteCode: (code || '').toUpperCase() })
    writeShowConfig(cfg)
    return delay({ ok: true, showId, code }, 200)
  },

  // 推送现场通知（场务提示），按场次持久化
  pushNotice(showId, text) {
    if (IS_CLOUD) return call('noticePush', { showId, text })
    const all = readNoticeOverride()
    const base = all[showId] ? all[showId].slice() : mock.notices.slice()
    const d = new Date()
    const time = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
    base.unshift({ id: 'n' + Date.now(), text, time })
    all[showId] = base
    storage.set(NOTICE_KEY, all)
    return delay({ ok: true }, 200)
  },

  // 锁定剧情分支走向
  lockBranch(showId, branchId) {
    if (IS_CLOUD) return call('branchLock', { showId, branchId })
    const cfg = readShowConfig()
    cfg[showId] = Object.assign({}, cfg[showId], { branch: branchId })
    writeShowConfig(cfg)
    return delay({ ok: true, showId, branchId }, 200)
  },

  // 弹幕上大屏（舞台总控）
  pushDanmaku(showId, text) {
    if (IS_CLOUD) return call('videoPush', { showId, text })
    const stage = storage.get(STAGE_KEY, {})
    const d = stage[showId] || { danmaku: [], emotions: [] }
    d.danmaku = d.danmaku.concat({ id: 'm' + Date.now(), text, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })
    stage[showId] = d
    storage.set(STAGE_KEY, stage)
    return delay({ ok: true }, 200)
  },

  // 情绪上大屏（舞台总控）
  pushEmotion(showId, type) {
    if (IS_CLOUD) return call('emotionSend', { showId, type })
    const stage = storage.get(STAGE_KEY, {})
    const d = stage[showId] || { danmaku: [], emotions: [] }
    d.emotions = d.emotions.concat({ type })
    stage[showId] = d
    storage.set(STAGE_KEY, stage)
    return delay({ ok: true }, 200)
  },

  // 游客弹幕上行（游客→大屏）：云模式走 danmakuSend；mock 落地本地 stage 仓库
  danmakuSend(showId, text) {
    if (IS_CLOUD) return call('danmakuSend', { showId, text })
    const stage = storage.get(STAGE_KEY, {})
    const d = stage[showId] || { danmaku: [], emotions: [] }
    d.danmaku = d.danmaku.concat({
      id: 'm' + Date.now(),
      text,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      source: 'visitor'
    })
    stage[showId] = d
    storage.set(STAGE_KEY, stage)
    return delay({ ok: true }, 200)
  },

  // 订单核销：按核销码查找本地订单，置「已核销」
  redeemOrder(code) {
    if (IS_CLOUD) return call('orderRedeem', { code })
    const list = mall.getOrders()
    const idx = list.findIndex((o) => o.code === code)
    if (idx === -1) return delay({ ok: false, reason: 'notfound' }, 200)
    if (list[idx].status === '已核销') return delay({ ok: false, reason: 'redeemed' }, 200)
    list[idx] = Object.assign({}, list[idx], { status: '已核销', redeemed_at: Date.now() })
    storage.set('rede_mall_orders', list)
    return delay({ ok: true, order: list[idx] }, 200)
  },

  // 数据看板聚合：投票实时分布 + 情绪类型 + 弹幕流 + 在线人数
  getDashboard(showId) {
    if (IS_CLOUD) return call('dashboardShow', { showId })
    const poll = applyPollConfig(showId)
    const stage = (storage.get(STAGE_KEY, {})[showId]) || { danmaku: [], emotions: [] }
    const show = mock.shows.find((s) => s.id === showId) || mock.shows[0]
    return delay({
      poll: Object.assign({}, poll, { options: dashPct(poll.options) }),
      emotions: mock.emotions,
      danmaku: stage.danmaku.slice(-30).reverse(),
      online: show.online || 0
    }, 300)
  }
}
