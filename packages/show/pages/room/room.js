// packages/show/pages/room/room.js
const api = require('../../../../services/api.js')

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
    inputValue: ''
  },

  timer: null,

  onLoad(options) {
    const showId = options.id || 's1'
    this.setData({ showId })
    api.getShowRoom(showId).then((d) => {
      this.setData({
        show: d.show,
        poll: Object.assign({}, d.poll, { options: computePct(d.poll.options) }),
        emotions: d.emotions,
        branch: d.branch,
        notices: d.notices
      })
      // 模拟实时：仅直播且投票开启时轮询结果
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
    const msg = { id: 'm' + Date.now(), text, time: this.now() }
    this.setData({ messages: this.data.messages.concat(msg), inputValue: '' })
  },

  goGenerate() {
    wx.navigateTo({ url: '/packages/create/pages/generate/generate' })
  },

  now() {
    const d = new Date()
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
