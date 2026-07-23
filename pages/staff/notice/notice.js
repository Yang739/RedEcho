// pages/staff/notice/notice.js —— 现场通知推送
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')

Page({
  data: {
    showId: '',
    canPush: false,
    notices: [],
    input: ''
  },

  onLoad(options) {
    const showId = options.id || 's1'
    this.setData({ showId, canPush: perm.staffCan('notice_push') })
    if (!this.data.canPush) return
    api.getShowRoom(showId).then((d) => {
      this.setData({ notices: d.notices || [] })
    })
  },

  now() {
    const d = new Date()
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
  },

  onInput(e) { this.setData({ input: e.detail.value }) },

  onPush() {
    if (!this.data.canPush) return
    const text = (this.data.input || '').trim()
    if (!text) { wx.showToast({ title: '请输入通知内容', icon: 'none' }); return }
    api.pushNotice(this.data.showId, text).then(() => {
      const notices = this.data.notices.slice()
      notices.unshift({ id: 'n' + Date.now(), text, time: this.now() })
      this.setData({ notices, input: '' })
      wx.showToast({ title: '已推送', icon: 'success' })
    })
  }
})
