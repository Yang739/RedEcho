// pages/create/create.js
const api = require('../../services/api.js')

// 与生成页一致的排版坐标（用于从历史记录现绘保存）
const LAYOUTS = {
  classic: { align: 'left',   dateAlign: 'left',   sceneY: 56,  quoteY: 360, quoteSize: 38 },
  center:  { align: 'center', dateAlign: 'center', sceneY: 64,  quoteY: 320, quoteSize: 40 },
  minimal: { align: 'right',  dateAlign: 'right',  sceneY: 56,  quoteY: 380, quoteSize: 34 }
}

Page({
  data: {
    loading: true,
    scenes: [],
    postcards: [],
    preview: null
  },

  onShow() {
    this.load()
  },

  load() {
    this.setData({ loading: true })
    Promise.all([api.getScenes(), api.getPostcards()])
      .then(([scenes, postcards]) => this.setData({ scenes, postcards, loading: false }))
      .catch(() => this.setData({ loading: false }))
  },

  onSelect(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packages/create/pages/generate/generate?sceneId=${id}` })
  },

  // 画廊点击 → 预览
  onPreview(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.postcards.find((p) => p.id === id)
    if (item) this.setData({ preview: item })
  },

  onClosePreview() {
    this.setData({ preview: null })
  },

  noop() {},

  // 从历史记录现绘明信片（CSS 卡无 imageUrl 时），返回 Promise<tempPath>
  drawRecord(rec) {
    return new Promise((resolve) => {
      if (!rec) return resolve('')
      const colors = (rec.colors && rec.colors.length === 2) ? rec.colors : ['#C8161D', '#7A0A10']
      wx.createSelectorQuery()
        .select('#pcCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return resolve('')
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
          const W = 600
          const H = 800
          canvas.width = W * dpr
          canvas.height = H * dpr
          ctx.scale(dpr, dpr)

          const g = ctx.createLinearGradient(0, 0, W, H)
          g.addColorStop(0, colors[0])
          g.addColorStop(1, colors[1])
          ctx.fillStyle = g
          ctx.fillRect(0, 0, W, H)

          const lay = LAYOUTS[rec.layout] || LAYOUTS.classic
          const anchorX = lay.align === 'center' ? W / 2 : (lay.align === 'right' ? W - 48 : 48)

          ctx.fillStyle = '#ffffff'
          ctx.textBaseline = 'top'
          ctx.textAlign = lay.align

          ctx.font = '700 44px sans-serif'
          ctx.fillText(rec.scene, anchorX, lay.sceneY)

          ctx.font = 'italic 600 ' + lay.quoteSize + 'px sans-serif'
          this._wrap(ctx, '“' + rec.quote + '”', anchorX, lay.quoteY, W - 96, 58, lay.align)

          ctx.textAlign = lay.dateAlign
          const dateX = lay.dateAlign === 'center' ? W / 2 : (lay.dateAlign === 'right' ? W - 48 : 48)
          ctx.font = '400 24px sans-serif'
          ctx.fillText(rec.date + ' · 红色回响', dateX, H - 64)

          wx.canvasToTempFilePath({
            canvas,
            success: (e) => resolve(e.tempFilePath),
            fail: () => resolve('')
          })
        })
    })
  },

  _wrap(ctx, text, x, y, maxWidth, lineHeight, align) {
    ctx.textAlign = align || 'left'
    let line = ''
    for (const ch of text) {
      const test = line + ch
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y)
        line = ch
        y += lineHeight
      } else {
        line = test
      }
    }
    if (line) ctx.fillText(line, x, y)
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
