// packages/create/pages/generate/generate.js
const api = require('../../../../services/api.js')

Page({
  data: {
    scenes: [],
    result: null,
    generating: false,
    useImage: false
  },

  tempPath: '',

  onLoad(options) {
    api.getScenes().then((scenes) => {
      this.setData({ scenes })
      if (options.sceneId) this.generate(options.sceneId)
    })
  },

  onSelect(e) {
    this.generate(e.currentTarget.dataset.id)
  },

  generate(id) {
    const scene = this.data.scenes.find((s) => s.id === id)
    if (!scene) return
    this.setData({ generating: true, result: null, useImage: false })
    api.generatePostcard(id).then((res) => {
      const result = Object.assign({}, res, { colors: scene.colors })
      this.setData({ result, generating: false }, () => {
        if (result.imageUrl) this.loadImage(result.imageUrl)
        else this.drawPostcard()
      })
    })
  },

  // 真实文生图：下载到本地临时文件后展示（保存时直接用该路径）
  loadImage(url) {
    wx.downloadFile({
      url,
      success: (e) => {
        if (e.statusCode === 200 && e.tempFilePath) {
          this.tempPath = e.tempFilePath
          this.setData({ useImage: true })
        } else {
          this.drawPostcard()
        }
      },
      fail: () => this.drawPostcard()
    })
  },

  // 离屏画布绘制明信片，并导出临时文件用于保存
  drawPostcard() {
    const r = this.data.result
    if (!r) return
    wx.createSelectorQuery()
      .select('#pcCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
        const W = 600
        const H = 800
        canvas.width = W * dpr
        canvas.height = H * dpr
        ctx.scale(dpr, dpr)

        const g = ctx.createLinearGradient(0, 0, W, H)
        g.addColorStop(0, r.colors[0])
        g.addColorStop(1, r.colors[1])
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)

        ctx.fillStyle = '#ffffff'
        ctx.textBaseline = 'top'
        ctx.font = '700 44px sans-serif'
        ctx.fillText(r.scene, 48, 56)

        ctx.font = 'italic 600 38px sans-serif'
        this.wrapText(ctx, '“' + r.quote + '”', 48, 360, W - 96, 58)

        ctx.font = '400 24px sans-serif'
        ctx.fillText(r.date + ' · 红色回响', 48, H - 64)

        wx.canvasToTempFilePath({
          canvas,
          success: (e) => { this.tempPath = e.tempFilePath },
          fail: () => {}
        })
      })
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
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

  onSave() {
    if (!this.tempPath) {
      this.drawPostcard()
      wx.showToast({ title: '稍候再试', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: this.tempPath,
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
  },

  onAgain() {
    this.tempPath = ''
    this.setData({ result: null, useImage: false })
  }
})
