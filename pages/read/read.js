// pages/read/read.js —— 我的阅读：已读篇章列表（本地阅读历史）
const res = require('../../services/resources.js')
const readHistory = require('../../services/readHistory.js')

const CAT_NAME = res.CATEGORIES.reduce((m, c) => { m[c.key] = c.name; return m }, {})
const READ_SHOW = 50 // 最多展示条数

const SWIPE_BTN = 72        // 删除按钮宽度（px）
const SWIPE_OPEN = -SWIPE_BTN   // 完全展开时的偏移
const SWIPE_THRESHOLD = 36  // 位移超过该阈值则自动展开（px）

Page({
  data: { list: [], count: 0 },

  // 拖拽过程临时状态（不放入 data，避免无谓渲染）
  _dragId: null,
  _startX: 0,
  _startOffset: 0,

  onShow() { this.refresh() },

  refresh() {
    const entries = readHistory.getEntries()
    const list = entries
      .map((e) => {
        const c = res.cards.find((x) => x.id === e.id)
        if (!c) return null
        return {
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          catName: CAT_NAME[c.cat] || '',
          gradient: c.gradient,
          readTime: readHistory.formatDate(e.time),
          offset: 0,   // 右滑偏移（px，负数表示露出删除键）
          anim: false  // 偏移变化时是否启用过渡动画
        }
      })
      .filter(Boolean)
      .slice(0, READ_SHOW)
    this.setData({ list, count: entries.length })
  },

  idxOf(id) {
    return this.data.list.findIndex((x) => x.id === id)
  },

  onRead(e) {
    const id = e.currentTarget.dataset.id
    const i = this.idxOf(id)
    const item = this.data.list[i]
    // 已滑开（露出删除键）时，点击内容先收起而非跳转
    if (item && item.offset) {
      this.setData({ [`list[${i}].offset`]: 0, [`list[${i}].anim`]: true })
      return
    }
    wx.navigateTo({ url: '/pages/resource/detail/detail?id=' + id })
  },

  // —— 右滑删除手势 ——
  onSwipeStart(e) {
    const id = e.currentTarget.dataset.id
    const i = this.idxOf(id)
    if (i < 0) return
    this._dragId = id
    this._startX = e.touches[0].clientX
    this._startOffset = this.data.list[i].offset || 0
    // 拖拽中关闭过渡动画，并把其它已展开的项收起
    const updates = {}
    this.data.list.forEach((it, idx) => {
      if (it.id !== id && it.offset) updates[`list[${idx}].offset`] = 0
    })
    updates[`list[${i}].anim`] = false
    this.setData(updates)
  },

  onSwipeMove(e) {
    if (!this._dragId) return
    const i = this.idxOf(this._dragId)
    if (i < 0) return
    let offset = this._startOffset + (e.touches[0].clientX - this._startX)
    if (offset > 0) offset = 0
    if (offset < SWIPE_OPEN) offset = SWIPE_OPEN
    this.setData({ [`list[${i}].offset`]: offset })
  },

  onSwipeEnd(e) {
    if (!this._dragId) return
    const i = this.idxOf(this._dragId)
    this._dragId = null
    if (i < 0) return
    const offset = this.data.list[i].offset || 0
    const target = offset <= -SWIPE_THRESHOLD ? SWIPE_OPEN : 0
    this.setData({ [`list[${i}].offset`]: target, [`list[${i}].anim`]: true })
  },

  // 点击删除键：移除单条阅读记录
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    readHistory.remove(id)
    this.refresh()
  },

  onClear() {
    wx.showModal({
      title: '清空阅读记录',
      content: '确定清空「我的阅读」记录？',
      success: (r) => { if (r.confirm) { readHistory.clear(); this.refresh() } }
    })
  }
})
