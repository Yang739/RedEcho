// packages/show/pages/room/room.js
// 游客 / 观众端演出房间：邀请码核验 + 投票 / 情绪 / 现场通知 / 弹幕互动。
// 注：工作人员管控（开场散场 / 投票发布 / 邀请码 / 现场通知 / 分支总控 / 舞台总控）
// 已拆分为独立子页面（pages/staff/session、poll、invite、notice、branch、stage），
// 本房间页不再承载 manage=1 管控态。
const api = require('../../../../services/api.js')
const rewards = require('../../../../services/rewards.js')
const storage = require('../../../../services/storage.js')

function computePct(options) {
  const total = options.reduce((s, o) => s + o.votes, 0) || 1
  return options.map((o) => Object.assign({}, o, { pct: Math.round((o.votes / total) * 100) }))
}

Page({
  data: {
    showId: '',
    show: { title: '', segment: '', online: 0, gradient: '', status: '', pollOpen: false },
    poll: { question: '', options: [] },
    emotions: [],
    notices: [],
    danmaku: [],     // 弹幕流（来自 getShowRoom：工作人员 + 游客上行，source 区分）
    voted: '',
    selectedEmotion: '',
    inputValue: '',
    statusBanner: '',
    isEnded: false,
    isLive: false,      // 是否直播中
    isUpcoming: false,  // 是否未开始
    unlocked: false,    // 本场邀请码是否已核验解锁互动
    gateNeeded: false,  // 是否需要邀请码门禁（仅直播中 且 未解锁）
    inviteInput: '',
    inviteError: ''
  },

  timer: null,

  onLoad(options) {
    const showId = options.id || 's1'
    this.setData({ showId })
    api.getShowRoom(showId).then((d) => {
      const status = d.show.status
      const isLive = status === 'live'
      const isUpcoming = status === 'upcoming'
      // 邀请码门禁：仅「直播中」场次需要；按场次持久化解锁记录判断，未开始 / 已结束无需门禁。
      // 注：参与演出 +5 积分不再于进房时发放，改为「邀请码核验通过（解锁互动）后」才发，避免未解锁即加分（见 onUnlock）。
      const unlocked = !!storage.get('rede_invite_unlocked', {})[showId]
      // 恢复本场已持久化的个人选择（投票 / 情绪），退出重进不再丢失
      const votes = storage.get('rede_show_votes', {})
      const emos = storage.get('rede_show_emotions', {})
      const myVote = votes[showId] || ''
      let pollOpts = d.poll.options
      if (myVote) {
        // 重进后把「我的那一票」补回进度条（mock 降级：云端由原子自增保证持久）
        pollOpts = pollOpts.map((o) => o.id === myVote ? Object.assign({}, o, { votes: o.votes + 1 }) : o)
      }
      this.setData({
        show: d.show,
        poll: Object.assign({}, d.poll, { options: computePct(pollOpts) }),
        emotions: d.emotions,
        notices: d.notices,
        danmaku: d.danmaku || [],
        statusBanner: status === 'ended' ? '本场演出已落幕' : '',
        isEnded: status === 'ended',
        isLive,
        isUpcoming,
        unlocked,
        gateNeeded: isLive && !unlocked,
        voted: myVote,
        selectedEmotion: emos[showId] || '',
        inviteError: ''
      })
      // 模拟实时（降级路径；wss 接入后由 socketClient 替代，见 RedEcho×RPC集成设计）：
      // 直播 / 即将开始 时轮询房间全量状态，使工作人员「指令下发」在游客端可见效。
      if (isLive || isUpcoming) {
        this.timer = setInterval(() => this.tick(), 2600)
      }
    })
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },

  // 轮询刷新房间全量状态（降级实时通道）：保留「我的那一票」本地补丁，
  // 刷新投票结果 / 现场通知 / 情绪 / 演出状态，使工作人员指令下发在游客端可见效。
  tick() {
    api.getShowRoom(this.data.showId).then((d) => {
      const show = d.show
      const isLive = show.status === 'live'
      const isEnded = show.status === 'ended'
      const isUpcoming = show.status === 'upcoming'
      // 投票结果：保留本地已投标记（mock 降级：云端由服务端票数保证）
      let pollOpts = d.poll.options
      if (this.data.voted) {
        pollOpts = pollOpts.map((o) => o.id === this.data.voted ? Object.assign({}, o, { votes: o.votes + 1 }) : o)
      }
      this.setData({
        show,
        'poll.options': computePct(pollOpts),
        emotions: d.emotions,
        notices: d.notices || [],
        danmaku: d.danmaku || [],
        isLive,
        isEnded,
        isUpcoming,
        statusBanner: isEnded ? '本场演出已落幕' : '',
        // 直播中且未解锁 → 继续展示邀请码门禁；已解锁后随指令刷新
        gateNeeded: isLive && !this.data.unlocked
      })
    })
  },

  onVote(e) {
    if (this.data.voted) return
    const id = e.currentTarget.dataset.id
    api.submitVote(this.data.showId, id).then(() => {
      const opts = this.data.poll.options.map((o) =>
        o.id === id ? Object.assign({}, o, { votes: o.votes + 1 }) : o
      )
      // 按场次持久化已投票选项，退出重进仍保留
      const votes = storage.get('rede_show_votes', {})
      votes[this.data.showId] = id
      storage.set('rede_show_votes', votes)
      this.setData({ voted: id, 'poll.options': computePct(opts) })
      wx.showToast({ title: '投票成功', icon: 'success' })
    })
  },

  onEmotion(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedEmotion: id })
    // 按场次持久化情绪选择，退出重进仍保留
    const emos = storage.get('rede_show_emotions', {})
    emos[this.data.showId] = id
    storage.set('rede_show_emotions', emos)
    api.submitEmotion(this.data.showId, id) //  fire-and-forget
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  // 邀请码输入（实时清除错误提示）
  onInviteInput(e) {
    this.setData({ inviteInput: e.detail.value, inviteError: '' })
  },

  // 核验演出现场邀请码：通过后按场次持久化解锁，互动区放开
  onUnlock() {
    const code = (this.data.inviteInput || '').trim()
    if (!code) {
      this.setData({ inviteError: '请输入邀请码' })
      return
    }
    api.verifyInvite(this.data.showId, code).then((r) => {
      if (r.ok) {
        const map = storage.get('rede_invite_unlocked', {})
        map[this.data.showId] = true
        storage.set('rede_invite_unlocked', map)
        // 邀请码核验通过（解锁互动）后才发放「参与演出 +5 积分」；awardShow 内部去重，仅首次返回 true
        const awarded = rewards.awardShow(this.data.showId)
        this.setData({ unlocked: true, gateNeeded: false, inviteError: '' })
        wx.showToast({ title: awarded ? '已解锁互动，参与演出 +5 积分' : '已解锁互动', icon: 'success' })
      } else {
        this.setData({ inviteError: '邀请码不正确' })
      }
    })
  },

  onSend() {
    const text = (this.data.inputValue || '').trim()
    if (!text) return
    // 游客弹幕上行：写入云端 stage 集合，经 getShowRoom 轮询下发到大屏 / 工作人员端 / 其他游客。
    // 先乐观预插一条（临时 id），待下一次 tick() 拉取云端数据覆盖，避免重复且即时可见。
    api.danmakuSend(this.data.showId, text).then(() => {
      const msg = { id: 'm' + Date.now(), text, time: this.now(), source: 'visitor' }
      this.setData({ danmaku: [msg].concat(this.data.danmaku), inputValue: '' })
      wx.showToast({ title: '弹幕已发送', icon: 'success' })
    }).catch((err) => {
      wx.showToast({ title: '发送失败：' + (err && err.message ? err.message : '请重试'), icon: 'none' })
    })
  },

  // 演出已结束 → 跳转本场回顾
  goReview() {
    wx.navigateTo({ url: `/packages/show/pages/review/review?id=${this.data.showId}` })
  },

  now() {
    const d = new Date()
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
