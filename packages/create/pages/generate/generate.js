// packages/create/pages/generate/generate.js
const api = require('../../../../services/api.js')
const postcards = require('../../../../services/postcards.js')
const { containsSensitive } = require('../../../../services/sensitive.js')

// 字体风格 → Canvas 字体（系统字体可用时生效，否则回退默认衬线）
const FONTS = {
  maoti:   { weight: '700', family: 'KaiTi, STKaiti, serif' },
  shoujin: { weight: '400', family: 'STXingkai, Xingkai SC, serif' },
  liu:     { weight: '600', family: 'LiSu, STLiti, serif' },
  yan:     { weight: '800', family: 'KaiTi, STKaiti, serif' }
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
    orient: 'land',   // land 横版 / port 竖版（按实物明信片比例）
    arrange: 'h',     // h 横排 / v 竖排
    font: 'maoti',    // maoti 毛体 / shoujin 瘦金 / liu 柳体 / yan 颜体
    draft: { gradient: '', scene: '', quote: '', orient: 'land', arrange: 'h', font: 'maoti' },
    presets: [
      '星星之火，可以燎原。',
      '为有牺牲多壮志，敢教日月换新天。',
      '江山就是人民，人民就是江山。',
      '一代人有一代人的长征。'
    ],
    orientList: [
      { key: 'land', name: '横版', desc: '148 × 105 mm' },
      { key: 'port', name: '竖版', desc: '105 × 148 mm' }
    ],
    arrangeList: [
      { key: 'h', name: '横排', desc: '从左向右' },
      { key: 'v', name: '竖排', desc: '从上向下' }
    ],
    fontList: [
      { key: 'maoti', name: '大气 · 毛体' },
      { key: 'shoujin', name: '遒劲 · 瘦金' },
      { key: 'liu', name: '柳体' },
      { key: 'yan', name: '颜体' }
    ]
  },

  tempPath: '',

  onLoad(options) {
    api.getScenes().then((scenes) => {
      this.setData({ scenes, selectedId: options.sceneId || (scenes[0] && scenes[0].id) || '' }, () => this.updateDraft())
    })
  },

  onSelectScene(e) {
    this.setData({ selectedId: e.currentTarget.dataset.id }, () => this.updateDraft())
  },

  onInputQuote(e) {
    this.setData({ customText: e.detail.value }, () => this.updateDraft())
  },

  onPickPreset(e) {
    this.setData({ customText: e.currentTarget.dataset.q }, () => this.updateDraft())
  },

  onSelectOrient(e) {
    this.setData({ orient: e.currentTarget.dataset.key }, () => this.updateDraft())
  },

  onSelectArrange(e) {
    this.setData({ arrange: e.currentTarget.dataset.key }, () => this.updateDraft())
  },

  onSelectFont(e) {
    this.setData({ font: e.currentTarget.dataset.key }, () => this.updateDraft())
  },

  // 根据当前选择实时构建预览草稿
  updateDraft() {
    const scenes = this.data.scenes
    const scene = scenes.find((s) => s.id === this.data.selectedId) || scenes[0] || {}
    const text = (this.data.customText && this.data.customText.trim()) || '在此写下你的红色金句'
    this.setData({
      draft: {
        gradient: scene.gradient || 'linear-gradient(135deg,#C8161D,#7A0A10)',
        scene: scene.name || '红色旧址',
        quote: text,
        orient: this.data.orient,
        arrange: this.data.arrange,
        font: this.data.font
      }
    })
  },

  onGenerate() {
    const { selectedId, customText, orient, arrange, font } = this.data
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
    const opts = { orient, arrange, font }
    api.generatePostcard(selectedId, customText, opts).then((res) => {
      const scene = this.data.scenes.find((s) => s.id === selectedId) || {}
      const finalRec = Object.assign({}, res, {
        scene: scene.name || res.scene,
        gradient: scene.gradient || res.gradient,
        colors: scene.colors || res.colors,
        quote: (customText && customText.trim()) || res.quote,
        orient, arrange, font
      })
      // 落库：保证「已存入我的作品」真实可信
      postcards.add(finalRec)
      wx.showToast({ title: '已存入我的作品', icon: 'success' })
      this.setData({ result: finalRec, generating: false, useImage: !!res.imageUrl }, () => {
        if (res.imageUrl) this.loadImage(res.imageUrl)
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
        }
      },
      fail: () => {}
    })
  },

  // 离屏画布绘制明信片，并导出临时文件用于保存（返回 Promise<tempPath>）
  drawPostcard() {
    const r = this.data.result
    if (!r) return Promise.resolve('')
    const orient = r.orient || 'land'
    const W = orient === 'port' ? 600 : 900
    const H = orient === 'port' ? 900 : 600
    const F = FONTS[r.font] || FONTS.maoti
    return new Promise((resolve) => {
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
          g.addColorStop(0, r.colors[0])
          g.addColorStop(1, r.colors[1])
          ctx.fillStyle = g
          ctx.fillRect(0, 0, W, H)

          ctx.fillStyle = '#ffffff'
          ctx.textBaseline = 'top'
          ctx.textAlign = 'left'

          // 场景名
          ctx.font = F.weight + ' 44px ' + F.family
          ctx.fillText(r.scene, 48, 48)

          // 金句
          const quote = '“' + r.quote + '”'
          if (r.arrange === 'v') {
            this._drawVertical(ctx, quote, W - 64, 150, 70, 60, F, orient)
          } else {
            ctx.font = F.weight + ' ' + (orient === 'port' ? 40 : 38) + 'px ' + F.family
            this._wrap(ctx, quote, 48, orient === 'port' ? 360 : 210, W - 96, 60, 'left')
          }

          // 日期
          ctx.font = '400 24px sans-serif'
          ctx.fillText(r.date + ' · 红色回响', 48, H - 64)

          wx.canvasToTempFilePath({
            canvas,
            success: (e) => { this.tempPath = e.tempFilePath; resolve(e.tempFilePath) },
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
  _drawVertical(ctx, text, x, y, colStep, charH, F, orient) {
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    ctx.font = F.weight + ' 46px ' + F.family
    let cx = x
    let cy = y
    const maxH = orient === 'port' ? 680 : 420
    for (const ch of text) {
      ctx.fillText(ch, cx, cy)
      cy += charH
      if (cy > y + maxH) { cy = y; cx -= colStep }
    }
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
    this.setData({ result: null, useImage: false, customText: '' }, () => this.updateDraft())
  },

  // 转发给好友（由结果层 <button open-type="share"> 触发）
  onShareAppMessage() {
    const r = this.data.result
    return {
      title: r ? ('我在红色回响创作了「' + r.scene + '」明信片') : '红色回响 · 创作你的专属红色明信片',
      path: '/pages/create/create',
      imageUrl: this.tempPath || (r && r.imageUrl) || ''
    }
  }
})
