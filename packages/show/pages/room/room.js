// packages/show/pages/room/room.js
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
    branch: { text: '', current: '', locked: false },
    notices: [],
    messages: [],
    voted: '',
    selectedEmotion: '',
    inputValue: '',
    statusBanner: '',
    isEnded: false,
    unlocked: false,    // 本场邀请码是否已核验解锁互动
    gateNeeded: false,  // 是否需要邀请码门禁（未解锁 且 非已结束场次）
    inviteInput: '',
    inviteError: ''
  },

  timer: null,

  onLoad(options) {
    const showId = options.id || 's1'
    this.setData({ showId })
    api.getShowRoom(showId).then((d) => {
      const status = d.show.status
      // 仅「直播中」的演出计为参与并发 +5（同一场只加一次）；即将开始 / 已结束不发放
      let awardTip = ''
      if (status === 'live' && rewards.awardShow(showId)) {
        awardTip = '参与演出 +5 积分'
      }
      // 邀请码门禁：按场次持久化解锁记录判断，已结束场次无需门禁
      const unlocked = !!storage.get('rede_invite_unlocked', {})[showId]
      this.setData({
        show: d.show,
        poll: Object.assign({}, d.poll, { options: computePct(d.poll.options) }),
        emotions: d.emotions,
        branch: d.branch,
        notices: d.notices,
        statusBanner: status === 'upcoming' ? '演出即将开始，敬请期待' : (status === 'ended' ? '本场演出已落幕' : ''),
        isEnded: status === 'ended',
        unlocked,
        gateNeeded: !unlocked && status !== 'ended',
        inviteError: ''
      })
      if (awardTip) wx.showToast({ title: awardTip, icon: 'none' })
      // 模拟实时：仅直播且投票开启时轮询结果（降级路径；wss 接入后由 socketClient 替代，见 RedEcho×RPC集成设计）
      if (d.show.pollOpen) {
        this.timer = setInterval(() => this.tick(), 2600)
      }
    })
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },

  tick() {
    api.pollResult(this.data.showId).then((opts) => {
      this.setData({ 'poll.options': computePct(opts) })
    })
  },

  onVote(e) {
    if (this.data.voted) return
    const id = e.currentTarget.dataset.id
    api.submitVote(this.data.showId, id).then(() => {
      const opts = this.data.poll.options.map((o) =>
        o.id === id ? Object.assign({}, o, { votes: o.votes + 1 }) : o
      )
      this.setData({ voted: id, 'poll.options': computePct(opts) })
      wx.showToast({ title: '投票成功', icon: 'success' })
    })
  },

  onEmotion(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedEmotion: id })
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
        this.setData({ unlocked: true, gateNeeded: false, inviteError: '' })
        wx.showToast({ title: '已解锁互动', icon: 'success' })
      } else {
        this.setData({ inviteError: '邀请码不正确' })
      }
    })
  },

  onSend() {
    const text = (this.data.inputValue || '').trim()
    if (!text) return
    // 弹幕本地预览：真实上行与房间广播将在 wss 阶段接入（见 RedEcho×RPC集成设计 R-T1/R-T5），此处仅本地回显兜底
    const msg = { id: 'm' + Date.now(), text, time: this.now() }
    this.setData({ messages: this.data.messages.concat(msg), inputValue: '' })
  },

  goGenerate() {
    wx.navigateTo({ url: '/packages/create/pages/generate/generate' })
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
