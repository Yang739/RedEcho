// pages/create/create.js
const api = require('../../services/api.js')

// 字体风格 → Canvas 字体（系统字体可用时生效，否则回退默认衬线）
const FONTS = {
  maoti:   { weight: '700', family: 'KaiTi, STKaiti, serif' },
  shoujin: { weight: '400', family: 'STXingkai, Xingkai SC, serif' },
  liu:     { weight: '600', family: 'LiSu, STLiti, serif' },
  yan:     { weight: '800', family: 'KaiTi, STKaiti, serif' }
}

// 创作页「我的作品」最多展示条数
const MAX_SHOW = 4

Page({
  data: {
    loading: true,
    postcards: [],
    hasMoreWorks: false,
    preview: null
  },

  onShow() {
    this.load()
  },

  load() {
    this.setData({ loading: true })
    api.getPostcards()
      .then((list) => {
        this.setData({
          postcards: list.slice(0, MAX_SHOW),
          hasMoreWorks: list.length > MAX_SHOW,
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
      const orient = rec.orient || 'land'
      const W = orient === 'port' ? 600 : 900
      const H = orient === 'port' ? 900 : 600
      const F = FONTS[rec.font] || FONTS.maoti
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

          const g = ctx.createLinearGradient(0, 0, W, H)
          g.addColorStop(0, colors[0])
          g.addColorStop(1, colors[1])
          ctx.fillStyle = g
          ctx.fillRect(0, 0, W, H)

          ctx.fillStyle = '#ffffff'
          ctx.textBaseline = 'top'
          ctx.textAlign = 'left'

          ctx.font = F.weight + ' 44px ' + F.family
          ctx.fillText(rec.scene, 48, 48)

          const quote = '“' + rec.quote + '”'
          if (rec.arrange === 'v') {
            this._drawVertical(ctx, quote, W - 64, 150, 70, 60, F, orient)
          } else {
            ctx.font = F.weight + ' ' + (orient === 'port' ? 40 : 38) + 'px ' + F.family
            this._wrap(ctx, quote, 48, orient === 'port' ? 360 : 210, W - 96, 60, 'left')
          }

          ctx.font = '400 24px sans-serif'
          ctx.fillText(rec.date + ' · 红色回响', 48, H - 64)

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

  _drawVertical(ctx, text, x, y, colStep, charH, F, orient) {
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    ctx.font = F.weight + ' 46px ' + F.family
    let cx = x
    let cy = y
    const maxH = orient === 'port' ? 640 : 420
    for (const ch of text) {
      ctx.fillText(ch, cx, cy)
      cy += charH
      if (cy > y + maxH) { cy = y; cx -= colStep }
    }
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
