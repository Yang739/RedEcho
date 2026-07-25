// pages/staff/stage/stage.js —— 舞台总控（弹幕 / 情绪上屏）
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')
const storage = require('../../../services/storage.js')

Page({
  data: {
    showId: '',
    canPush: false,
    emotions: [],
    danmaku: [],    // 最近上屏弹幕（倒序）
    input: ''
  },

  onLoad(options) {
    const showId = options.id || ''
    this.setData({ showId, canPush: perm.staffCan('stage_push') })
    this.reload()
  },

  // 选定正在进行的表演后载入情绪与弹幕
  reload() {
    if (!this.data.canPush || !this.data.showId) return
    api.getShowRoom(this.data.showId).then((d) => {
      this.setData({ emotions: d.emotions || [] })
    })
    this.loadDanmaku()
  },

  // 选择器回调：必须选定一个正在进行的表演才能操作
  onShowChange(e) {
    const show = e.detail
    this.setData({ showId: show ? show.id : '' })
    if (show) this.reload()
    else this.setData({ emotions: [] })
  },

  loadDanmaku() {
    const stage = (storage.get('rede_stage', {})[this.data.showId]) || { danmaku: [] }
    this.setData({ danmaku: stage.danmaku.slice(-20).reverse() })
  },

  onInput(e) { this.setData({ input: e.detail.value }) },

  onPushDanmaku() {
    if (!this.data.canPush) return
    const text = (this.data.input || '').trim()
    if (!text) { wx.showToast({ title: '请输入弹幕内容', icon: 'none' }); return }
    api.pushDanmaku(this.data.showId, text).then(() => {
      this.setData({ input: '' })
      this.loadDanmaku()
      wx.showToast({ title: '已上屏', icon: 'success' })
    }).catch((err) => {
      wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
    })
  },

  onPushEmotion(e) {
    if (!this.data.canPush) return
    api.pushEmotion(this.data.showId, e.currentTarget.dataset.type).then(() => {
      wx.showToast({ title: '情绪已上屏', icon: 'none' })
    }).catch((err) => {
      wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
    })
  }
})
