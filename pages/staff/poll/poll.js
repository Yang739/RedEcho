// pages/staff/poll/poll.js —— 投票发布（开关投票通道 / 修改题目与选项）
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')

function computePct(options) {
  const total = options.reduce((s, o) => s + o.votes, 0) || 1
  return options.map((o) => Object.assign({}, o, { pct: Math.round((o.votes / total) * 100) }))
}

Page({
  data: {
    showId: '',
    canManage: false,
    pollOpen: false,
    question: '',
    options: [],       // [{ id, label, votes, pct }]
    optionInputs: []   // 编辑态的标签文本（与 options 一一对应）
  },

  onLoad(options) {
    const showId = options.id || ''
    this.setData({ showId, canManage: perm.staffCan('poll_manage') })
    this.reload()
  },

  // 选定正在进行的表演后载入数据
  reload() {
    if (!this.data.canManage || !this.data.showId) return
    api.getShowRoom(this.data.showId).then((d) => {
      this.setData({
        pollOpen: d.show.pollOpen,
        question: d.poll.question,
        options: computePct(d.poll.options),
        optionInputs: d.poll.options.map((o) => o.label)
      })
    })
  },

  // 选择器回调：必须选定一个正在进行的表演才能操作
  onShowChange(e) {
    const show = e.detail
    this.setData({ showId: show ? show.id : '' })
    if (show) this.reload()
    else this.setData({ pollOpen: false, question: '', options: [], optionInputs: [] })
  },

  onToggle() {
    if (!this.data.canManage) return
    const open = !this.data.pollOpen
    api.setPoll(this.data.showId, { pollOpen: open }).then(() => {
      this.setData({ pollOpen: open })
      wx.showToast({ title: open ? '投票已开启' : '投票已关闭', icon: 'none' })
    }).catch((err) => {
      wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
    })
  },

  onQuestion(e) { this.setData({ question: e.detail.value }) },

  onOption(e) {
    const i = e.currentTarget.dataset.index
    this.setData({ ['optionInputs[' + i + ']']: e.detail.value })
  },

  onSave() {
    if (!this.data.canManage) return
    const options = this.data.options.map((o, i) => {
      const label = (this.data.optionInputs[i] || '').trim() || o.label
      return Object.assign({}, o, { label })
    })
    api.setPoll(this.data.showId, { question: this.data.question.trim(), options }).then(() => {
      this.setData({ options: computePct(options) })
      wx.showToast({ title: '投票已更新', icon: 'success' })
    }).catch((err) => {
      wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
    })
  }
})
