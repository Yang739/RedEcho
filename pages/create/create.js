// pages/create/create.js
const api = require('../../services/api.js')
const { loadFonts } = require('../../services/fonts.js')
const { decorateCard, renderPostcard } = require('../../services/pcLayout.js')
const postcards = require('../../services/postcards.js')

// 创作页「我的作品」最多展示条数
const MAX_SHOW = 4

Page({
  data: {
    loading: true,
    postcards: [],
    hasWorks: false,
    preview: null
  },

  onShow() {
    loadFonts()
    this.load()
    // 每次回到本页都强制显示自定义 tabBar（防从其他页返回后卡在隐藏态）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: false })
    }
  },

  load() {
    this.setData({ loading: true })
    api.getPostcards()
      .then((list) => {
        const decorated = list.map((p) => decorateCard(p))
        this.setData({
          postcards: decorated.slice(0, MAX_SHOW),
          hasWorks: list.length > 0,
          loading: false
        })
      })
      .catch(() => this.setData({ loading: false }))
  },

  // 「创作红色记忆」卡片入口：进入生成页（场景选择留在生成页内）
  onStartCreate() {
    wx.navigateTo({ url: '/packages/create/pages/generate/generate' })
  },

  // 「全部」：跳转我的作品列表页
  onAll() {
    wx.navigateTo({ url: '/pages/works/works' })
  },

  // 画廊点击 → 预览
  onPreview(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.postcards.find((p) => p.id === id)
    if (!item) return
    // 打开预览前先隐藏自定义 tabBar（组件 hidden 状态），否则 tabBar 会浮在遮罩之上仍可点击
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: true })
    }
    this.setData({ preview: item })
  },

  onClosePreview() {
    this.setData({ preview: null })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: false })
    }
  },

  // 画廊长按删除作品
  onDeleteWork(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.showModal({
      title: '删除作品',
      content: '确定删除这张明信片吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#C8161D',
      success: (m) => {
        if (m.confirm) {
          postcards.remove(id)
          if (this.data.preview && this.data.preview.id === id) {
            this.setData({ preview: null })
            // 预览中被删除，关闭预览的同时恢复 tabBar
            if (typeof this.getTabBar === 'function' && this.getTabBar()) {
              this.getTabBar().setData({ hidden: false })
            }
          }
          this.load()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  noop() {},

  // 从历史记录现绘明信片（无 imageUrl 时），返回 Promise<tempPath>
  // 导出统一为竖版(2:3)，横版内容顺时针旋转 90°（与展示态一致）
  drawRecord(rec) {
    return new Promise((resolve) => {
      if (!rec) return resolve('')
      wx.createSelectorQuery().in(this)
        .select('#pcCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return resolve('')
          const canvas = res[0].node
          renderPostcard(canvas, rec)
          wx.canvasToTempFilePath({
            canvas,
            success: (e) => resolve(e.tempFilePath),
            fail: () => resolve('')
          })
        })
    })
  },

  // 预览层「保存相册」
  onSaveFromPreview() {
    const rec = this.data.preview
    if (!rec) return
    const save = (path) => {
      if (!path) { wx.showToast({ title: '稍候再试', icon: 'none' }); return }
      wx.saveImageToPhotosAlbum({
        filePath: path,
        success: () => wx.showToast({ title: '已保存相册', icon: 'success' }),
        fail: (err) => {
          if (/auth|deny/i.test(err.errMsg || '')) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中开启「保存到相册」权限',
              confirmText: '去设置',
              success: (m) => { if (m.confirm) wx.openSetting() }
            })
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        }
      })
    }
    if (rec.imageUrl) { save(rec.imageUrl); return }
    this.drawRecord(rec).then((path) => save(path))
  },

  // 打印：绘制高清图后用系统图片查看器（可长按保存 / 打印）
  onPrint() {
    const rec = this.data.preview
    if (!rec) return
    wx.showToast({ title: '长按图片可保存或打印', icon: 'none' })
    const open = (path) => { if (path) wx.previewImage({ urls: [path], current: path }) }
    if (rec.imageUrl) { open(rec.imageUrl); return }
    this.drawRecord(rec).then(open)
  },

  // 转发给好友（由预览层 <button open-type="share"> 触发）
  onShareAppMessage() {
    const p = this.data.preview
    return {
      title: p ? ('我在红色回响创作了「' + p.scene + '」明信片') : '红色回响 · 创作你的专属红色明信片',
      path: '/pages/create/create',
      imageUrl: p && p.imageUrl ? p.imageUrl : ''
    }
  }
})
