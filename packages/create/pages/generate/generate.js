// packages/create/pages/generate/generate.js
const api = require('../../../../services/api.js')
const { containsSensitive } = require('../../../../services/sensitive.js')

// 排版方案：影响 Canvas 绘制坐标与 CSS 卡对齐
const LAYOUTS = {
  classic: { align: 'left',   dateAlign: 'left',   sceneY: 56,  quoteY: 360, quoteSize: 38 },
  center:  { align: 'center', dateAlign: 'center', sceneY: 64,  quoteY: 320, quoteSize: 40 },
  minimal: { align: 'right',  dateAlign: 'right',  sceneY: 56,  quoteY: 380, quoteSize: 34 }
}

Page({
  data: {
    scenes: [],
    result: null,
    generating: false,
    useImage: false,
    // 创作面板状态
    selectedId: '',
    customText: '',
    layout: 'classic',
    presets: [
      '星星之火，可以燎原。',
      '为有牺牲多壮志，敢教日月换新天。',
      '江山就是人民，人民就是江山。',
      '一代人有一代人的长征。'
    ],
    layoutList: [
      { key: 'classic', name: '经典', desc: '左对齐 · 大气' },
      { key: 'center', name: '居中', desc: '居中 · 典雅' },
      { key: 'minimal', name: '留白', desc: '右对齐 · 简约' }
    ]
  },

  tempPath: '',

  onLoad(options) {
    api.getScenes().then((scenes) => {
      this.setData({ scenes, selectedId: options.sceneId || (scenes[0] && scenes[0].id) || '' })
    })
  },

  onSelectScene(e) {
    this.setData({ selectedId: e.currentTarget.dataset.id })
  },

  onInputQuote(e) {
    this.setData({ customText: e.detail.value })
  },

  onPickPreset(e) {
    this.setData({ customText: e.currentTarget.dataset.q })
  },

  onSelectLayout(e) {
    this.setData({ layout: e.currentTarget.dataset.key })
  },

  onGenerate() {
    const { selectedId, customText, layout } = this.data
    if (!selectedId) {
      wx.showToast({ title: '请先选择场景', icon: 'none' })
      return
    }
    // 前端敏感词过滤（与云函数一致）
    if (containsSensitive(customText)) {
      wx.showModal({
        title: '内容需调整',
        content: '明信片文字包含不适当的词汇，请修改后再生成。',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }
    this.setData({ generating: true, result: null, useImage: false })
    api.generatePostcard(selectedId, customText, layout).then((res) => {
      const scene = this.data.scenes.find((s) => s.id === selectedId) || {}
      const result = Object.assign({}, res, { colors: scene.colors || res.colors || ['#C8161D', '#7A0A10'] })
      this.setData({ result, generating: false }, () => {
        if (result.imageUrl) this.loadImage(result.imageUrl)
        else this.drawPostcard()
      })
    }).catch((err) => {
      this.setData({ generating: false })
      wx.showToast({ title: (err && err.message) || '生成失败', icon: 'none' })
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

  // 离屏画布绘制明信片，并导出临时文件用于保存（返回 Promise<tempPath>）
  drawPostcard() {
    const r = this.data.result
    if (!r) return Promise.resolve('')
    return new Promise((resolve) => {
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
          g.addColorStop(0, r.colors[0])
          g.addColorStop(1, r.colors[1])
          ctx.fillStyle = g
          ctx.fillRect(0, 0, W, H)

          const lay = LAYOUTS[r.layout] || LAYOUTS.classic
          const anchorX = lay.align === 'center' ? W / 2 : (lay.align === 'right' ? W - 48 : 48)

          ctx.fillStyle = '#ffffff'
          ctx.textBaseline = 'top'
          ctx.textAlign = lay.align

          ctx.font = '700 44px sans-serif'
          ctx.fillText(r.scene, anchorX, lay.sceneY)

          ctx.font = 'italic 600 ' + lay.quoteSize + 'px sans-serif'
          this.wrapText(ctx, '“' + r.quote + '”', anchorX, lay.quoteY, W - 96, 58, lay.align)

          ctx.textAlign = lay.dateAlign
          const dateX = lay.dateAlign === 'center' ? W / 2 : (lay.dateAlign === 'right' ? W - 48 : 48)
          ctx.font = '400 24px sans-serif'
          ctx.fillText(r.date + ' · 红色回响', dateX, H - 64)

          wx.canvasToTempFilePath({
            canvas,
            success: (e) => { this.tempPath = e.tempFilePath; resolve(e.tempFilePath) },
            fail: () => resolve('')
          })
        })
    })
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight, align) {
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

  onSave() {
    const save = (path) => {
      if (!path) {
        wx.showToast({ title: '稍候再试', icon: 'none' })
        return
      }
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
    // 文生图模式或已绘制过：直接保存；CSS 模式：先绘制再保存（Promise 完成即存）
    if (this.tempPath) {
      save(this.tempPath)
      return
    }
    this.drawPostcard().then((path) => save(path))
  },

  onAgain() {
    this.tempPath = ''
    this.setData({ result: null, useImage: false, customText: '' })
  }
})
