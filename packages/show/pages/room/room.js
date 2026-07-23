// packages/show/pages/room/room.js
const api = require('../../../../services/api.js')
const rewards = require('../../../../services/rewards.js')

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
    isEnded: false
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
      this.setData({
        show: d.show,
        poll: Object.assign({}, d.poll, { options: computePct(d.poll.options) }),
        emotions: d.emotions,
        branch: d.branch,
        notices: d.notices,
        statusBanner: status === 'upcoming' ? '演出即将开始，敬请期待' : (status === 'ended' ? '本场演出已落幕' : ''),
        isEnded: status === 'ended'
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
