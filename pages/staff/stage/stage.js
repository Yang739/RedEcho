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
    const showId = options.id || 's1'
    this.setData({ showId, canPush: perm.staffCan('stage_push') })
    if (!this.data.canPush) return
    api.getShowRoom(showId).then((d) => {
      this.setData({ emotions: d.emotions || [] })
    })
    this.loadDanmaku()
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
    })
  },

  onPushEmotion(e) {
    if (!this.data.canPush) return
    api.pushEmotion(this.data.showId, e.currentTarget.dataset.type).then(() => {
      wx.showToast({ title: '情绪已上屏', icon: 'none' })
    })
  }
})
