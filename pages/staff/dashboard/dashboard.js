// pages/staff/dashboard/dashboard.js —— 数据看板（三档均可查看，只读）
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')

Page({
  data: {
    showId: '',
    title: '',
    canView: false,
    online: 0,
    poll: { question: '', options: [] },
    emotions: [],
    danmaku: []
  },

  timer: null,

  onLoad(options) {
    const showId = options.id || 's1'
    this.setData({ showId, canView: perm.staffCan('view_data') })
    this.refresh()
    // 看板定时刷新（降级轮询；真实实时由 wss 通道替换，见 RedEcho×RPC集成设计）
    this.timer = setInterval(() => this.refresh(), 3000)
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
  },

  refresh() {
    if (!this.data.canView) return Promise.resolve()
    return api.getDashboard(this.data.showId).then((d) => {
      this.setData({
        title: (d.poll && d.poll.question) || '',
        online: d.online || 0,
        poll: d.poll || { question: '', options: [] },
        emotions: d.emotions || [],
        danmaku: d.danmaku || []
      })
    }).catch(() => {})
  },

  onBack() {
    wx.navigateBack()
  }
})
