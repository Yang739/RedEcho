// pages/staff/session/session.js —— 场次管理（开场 / 散场 / 状态切换）
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')

Page({
  data: {
    showId: '',
    canControl: false,
    show: { title: '', status: '', gradient: '', venue: '', date: '' }
  },

  onLoad(options) {
    const showId = options.id || 's1'
    this.setData({ showId, canControl: perm.staffCan('show_control') })
    if (!this.data.canControl) return
    api.getShowRoom(showId).then((d) => {
      this.setData({ show: d.show })
    })
  },

  onToggle() {
    if (!this.data.canControl) return
    const cur = this.data.show
    const next = cur.status === 'live' ? 'ended' : 'live'
    wx.showModal({
      title: '演出状态',
      content: next === 'ended' ? '确认结束本场演出？' : '确认开始本场演出？',
      confirmText: next === 'ended' ? '结束' : '开始',
      confirmColor: '#C8161D',
      success: (r) => {
        if (!r.confirm) return
        api.setShowStatus(this.data.showId, next).then(() => {
          this.setData({ 'show.status': next })
          wx.showToast({ title: next === 'ended' ? '已结束演出' : '已开始演出', icon: 'success' })
        }).catch((err) => {
          wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
        })
      }
    })
  }
})
