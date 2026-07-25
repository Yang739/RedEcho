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
    const showId = options.id || ''
    this.setData({ showId, canPush: perm.staffCan('notice_push') })
    this.reload()
  },

  // 选定正在进行的表演后载入数据
  reload() {
    if (!this.data.canPush || !this.data.showId) return
    api.getShowRoom(this.data.showId).then((d) => {
      this.setData({ notices: d.notices || [] })
    })
  },

  // 选择器回调：必须选定一个正在进行的表演才能操作
  onShowChange(e) {
    const show = e.detail
    this.setData({ showId: show ? show.id : '' })
    if (show) this.reload()
    else this.setData({ notices: [] })
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
    wx.showLoading({ title: '推送中', mask: true })
    api.pushNotice(this.data.showId, text)
      .then(() => {
        wx.hideLoading()
        const notices = this.data.notices.slice()
        notices.unshift({ id: 'n' + Date.now(), text, time: this.now() })
        this.setData({ notices, input: '' })
        wx.showToast({ title: '已推送', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        const msg = (err && (err.msg || err.errMsg)) || '推送失败'
        // 管控云函数返回 403（角色链未打通）时明确提示，避免静默「无反应」
        wx.showToast({ title: msg.indexOf('403') >= 0 || msg.indexOf('无权限') >= 0 ? '操作失败：无权限' : msg, icon: 'none' })
      })
  }
})
