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

module.exports = {
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
  getShows(filter = 'all') {
    if (IS_CLOUD) return call('getShows', { status: filter })
    const list = filter === 'all' ? mock.shows : mock.shows.filter((s) => s.status === filter)
    return delay(list, 360)
  },

  getShowRoom(showId) {
    if (IS_CLOUD) return call('getShowRoom', { showId })
    const show = mock.shows.find((s) => s.id === showId) || mock.shows[0]
    return delay({
      show,
      poll: mock.poll,
      emotions: mock.emotions,
      branch: mock.branch,
      notices: mock.notices
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
      show: mock.shows[0],
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
  }
}
