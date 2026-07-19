// pages/works/works.js —— 我的作品列表页（展示全部创作的明信片）
const postcards = require('../../services/postcards.js')
const { loadFonts } = require('../../services/fonts.js')
const { decorateCard, paintPostcard } = require('../../services/pcLayout.js')

Page({
  data: {
    list: [],
    preview: null
  },

  onShow() {
    loadFonts()
    this.load()
  },

  load() {
    const list = postcards.getList().map((p) => decorateCard(p))
    this.setData({ list })
  },

  onPreview(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.list.find((p) => p.id === id)
    if (item) this.setData({ preview: item })
  },

  onClosePreview() {
    this.setData({ preview: null })
  },

  noop() {},

  // 列表长按删除
  onDeleteList(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.list.find((p) => p.id === id)
    if (!item) return
    wx.showModal({
      title: '删除作品',
      content: '确定删除这张明信片吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#C8161D',
      success: (m) => {
        if (m.confirm) {
          postcards.remove(id)
          this.setData({ preview: null })
          this.load()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 现绘明信片导出图片（CSS 卡无 imageUrl 时），返回 Promise<tempPath>
  drawRecord(rec) {
    return new Promise((resolve) => {
      if (!rec) return resolve('')
      const orient = rec.orient || 'land'
      const W = orient === 'port' ? 600 : 900
      const H = orient === 'port' ? 900 : 600
      wx.createSelectorQuery().in(this)
        .select('#pcCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return resolve('')
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
          canvas.width = W * dpr
          canvas.height = H * dpr
          ctx.scale(dpr, dpr)
          paintPostcard(ctx, W, H, decorateCard(rec))
          wx.canvasToTempFilePath({
            canvas,
            success: (e) => resolve(e.tempFilePath),
            fail: () => resolve('')
          })
        })
    })
  },

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

  onShareAppMessage() {
    const p = this.data.preview
    return {
      title: p ? ('我在红色回响创作了「' + p.scene + '」明信片') : '红色回响 · 我的红色明信片作品',
      path: '/pages/works/works',
      imageUrl: p && p.imageUrl ? p.imageUrl : ''
    }
  }
})
