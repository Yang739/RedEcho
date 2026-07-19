// pages/works/works.js —— 我的作品列表页（展示全部创作的明信片）
const postcards = require('../../services/postcards.js')

// 字体风格 → Canvas 字体（系统字体可用时生效，否则回退默认衬线）
const FONTS = {
  maoti:   { weight: '700', family: 'KaiTi, STKaiti, serif' },
  shoujin: { weight: '400', family: 'STXingkai, Xingkai SC, serif' },
  liu:     { weight: '600', family: 'LiSu, STLiti, serif' },
  yan:     { weight: '800', family: 'KaiTi, STKaiti, serif' }
}

Page({
  data: {
    list: [],
    preview: null
  },

  onShow() {
    this.load()
  },

  load() {
    this.setData({ list: postcards.getList() })
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

  onDelete() {
    const item = this.data.preview
    if (!item) return
    wx.showModal({
      title: '删除作品',
      content: '确定删除这张明信片吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#C8161D',
      success: (m) => {
        if (m.confirm) {
          postcards.remove(item.id)
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

          // 场景名
          ctx.font = F.weight + ' 44px ' + F.family
          ctx.fillText(rec.scene, 48, 48)

          // 金句
          const quote = '“' + rec.quote + '”'
          if (rec.arrange === 'v') {
            this._drawVertical(ctx, quote, W - 64, 150, 70, 60, F)
          } else {
            ctx.font = F.weight + ' ' + (orient === 'port' ? 40 : 38) + 'px ' + F.family
            this._wrap(ctx, quote, 48, orient === 'port' ? 360 : 210, W - 96, 60, 'left')
          }

          // 日期
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

  // 竖排：从右向左分列，每列自上而下
  _drawVertical(ctx, text, x, y, colStep, charH, F) {
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    ctx.font = F.weight + ' 46px ' + F.family
    let cx = x
    let cy = y
    const maxH = (this.data.preview && this.data.preview.orient === 'port') ? 640 : 420
    for (const ch of text) {
      ctx.fillText(ch, cx, cy)
      cy += charH
      if (cy > y + maxH) { cy = y; cx -= colStep }
    }
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

  onShareAppMessage() {
    const p = this.data.preview
    return {
      title: p ? ('我在红色回响创作了「' + p.scene + '」明信片') : '红色回响 · 我的红色明信片作品',
      path: '/pages/works/works',
      imageUrl: p && p.imageUrl ? p.imageUrl : ''
    }
  }
})
