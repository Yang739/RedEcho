// pages/staff/session/session.js —— 场次管理（添加场次 / 开场 / 散场）
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')
const { GRAD } = require('../../../services/mock.js')

const GRADS = [GRAD.red, GRAD.ember, GRAD.gold, GRAD.ink, GRAD.dawn, GRAD.mist]

Page({
  data: {
    canControl: false,
    shows: [],                 // 全部场次（含已结束）
    adding: false,             // 是否展开添加表单
    form: { title: '', venue: '', date: '' }
  },

  onLoad() {
    this.setData({ canControl: perm.staffCan('show_control') })
    this.load()
  },

  onShow() {
    this.load()
  },

  load() {
    if (!this.data.canControl) return
    api.getShows('all').then((list) => {
      this.setData({ shows: (list || []).filter((s) => !!s) })
    }).catch(() => {
      wx.showToast({ title: '加载场次失败', icon: 'none' })
    })
  },

  // 展开 / 收起添加表单
  onToggleAdd() {
    this.setData({
      adding: !this.data.adding,
      form: { title: '', venue: '', date: '' }
    })
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  // 添加场次
  onCreate() {
    const f = this.data.form
    const title = (f.title || '').trim()
    const venue = (f.venue || '').trim()
    const date = (f.date || '').trim()
    if (!title || !venue || !date) {
      wx.showToast({ title: '标题、地点、时间均必填', icon: 'none' })
      return
    }
    wx.showLoading({ title: '创建中', mask: true })
    // 渐变按现有场次数量轮询取色，保证视觉区分
    const gradient = GRADS[this.data.shows.length % GRADS.length]
    api.createShow({ title, venue, date, gradient, segment: '未开始' }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '场次已添加', icon: 'success' })
      this.setData({ adding: false, form: { title: '', venue: '', date: '' } })
      this.load()
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
    })
  },

  // 开始 / 结束演出
  onToggleStatus(e) {
    if (!this.data.canControl) return
    const id = e.currentTarget.dataset.id
    const show = this.data.shows.find((s) => s.id === id)
    if (!show) return
    const next = show.status === 'live' ? 'ended' : 'live'
    const tip = next === 'ended' ? '确认结束本场演出？' : '确认开始本场演出？'
    wx.showModal({
      title: '演出状态',
      content: tip,
      confirmText: next === 'ended' ? '结束' : '开始',
      confirmColor: '#C8161D',
      success: (r) => {
        if (!r.confirm) return
        api.setShowStatus(id, next).then(() => {
          wx.showToast({ title: next === 'ended' ? '已结束演出' : '已开始演出', icon: 'success' })
          this.load()
        }).catch((err) => {
          wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
        })
      }
    })
  }
})
