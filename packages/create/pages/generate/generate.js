// packages/create/pages/generate/generate.js
const api = require('../../../../services/api.js')
const postcards = require('../../../../services/postcards.js')
const { containsSensitive } = require('../../../../services/sensitive.js')
const { FONTS, loadFonts } = require('../../../../services/fonts.js')
const { decorateCard, paintPostcard, renderPostcard } = require('../../../../services/pcLayout.js')

// 字体风格 → 仅暴露修饰词（不展示具体字体名）
const fontList = Object.keys(FONTS).map((key) => ({
  key,
  name: FONTS[key].adjective,
  desc: FONTS[key].desc
}))

// 位置中文名（用于展示）
const POSITION_NAMES = {
  top: '上', center: '中', bottom: '下',
  left: '左', right: '右'
}

// 按「排列」限定可选位置（横排：上/中/下；竖排：左/中/右）
const POSITIONS_BY_MODE = {
  h: ['top', 'center', 'bottom'],
  v: ['left', 'center', 'right']
}

// 各排列的默认位置（切换排列时回退到该默认，而非首个，体验更自然）
const POSITION_DEFAULT = { h: 'center', v: 'right' }

// 根据排列返回当前可选位置列表（[{key,name}]）
function getPositionList(orient, arrange) {
  const keys = POSITIONS_BY_MODE[arrange || 'h'] || POSITIONS_BY_MODE['h']
  return keys.map((k) => ({ key: k, name: POSITION_NAMES[k] || k }))
}

// 当前位置是否仍在可选范围内，否则回退到该排列的默认位置
function normalPosition(orient, arrange, position) {
  const list = getPositionList(orient, arrange)
  if (list.some((p) => p.key === position)) return position
  return POSITION_DEFAULT[arrange] || (list[0] ? list[0].key : 'top')
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
    orient: 'land',   // land 横版 / port 竖版（匹配图片朝向，按实物明信片比例）
    arrange: 'h',     // h 横排 / v 竖排
    position: 'center', // 名言 9 宫格位置
    font: 'maoti',    // 字体风格 key（UI 仅显示修饰词）
    draft: {},
    presets: [
      '星星之火，可以燎原。',
      '为有牺牲多壮志，敢教日月换新天。',
      '江山就是人民，人民就是江山。',
      '一代人有一代人的长征。'
    ],
    orientList: [
      { key: 'land', name: '横版', desc: '适配横向图' },
      { key: 'port', name: '竖版', desc: '适配竖向图' }
    ],
    arrangeList: [
      { key: 'h', name: '横排', desc: '从左向右' },
      { key: 'v', name: '竖排', desc: '从上向下' }
    ],
    positionList: getPositionList('land', 'h'),
    fontList
  },

  tempPath: '',

  onLoad(options) {
    loadFonts()
    api.getScenes().then((scenes) => {
      this.setData({
        scenes,
        selectedId: options.sceneId || (scenes[0] && scenes[0].id) || ''
      }, () => this.updateDraft())
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
    const orient = e.currentTarget.dataset.key
    this.setData({
      orient,
      positionList: getPositionList(orient, this.data.arrange),
      position: normalPosition(orient, this.data.arrange, this.data.position)
    }, () => this.updateDraft())
  },

  onSelectArrange(e) {
    const arrange = e.currentTarget.dataset.key
    this.setData({
      arrange,
      positionList: getPositionList(this.data.orient, arrange),
      position: normalPosition(this.data.orient, arrange, this.data.position)
    }, () => this.updateDraft())
  },

  onSelectPosition(e) {
    this.setData({ position: e.currentTarget.dataset.key }, () => this.updateDraft())
  },

  onSelectFont(e) {
    this.setData({ font: e.currentTarget.dataset.key }, () => this.updateDraft())
  },

  // 根据当前选择实时构建预览草稿（含排版引擎计算的名言分行/字号）
  updateDraft() {
    const scenes = this.data.scenes
    const scene = scenes.find((s) => s.id === this.data.selectedId) || scenes[0] || {}
    const text = (this.data.customText && this.data.customText.trim()) || ""
    const base = {
      gradient: scene.gradient || 'linear-gradient(135deg,#C8161D,#7A0A10)',
      colors: scene.colors || ['#C8161D', '#7A0A10'],
      scene: scene.name || '红色旧址',
      quote: text,
      orient: this.data.orient,
      arrange: this.data.arrange,
      position: this.data.position,
      font: this.data.font,
      date: postcards.today()
    }
    this.setData({ draft: decorateCard(base) })
  },

  onGenerate() {
    const { selectedId, customText, orient, arrange, position, font } = this.data
    if (!selectedId) {
      wx.showToast({ title: '请先选择场景', icon: 'none' })
      return
    }
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
    const opts = { orient, arrange, position, font }
    api.generatePostcard(selectedId, customText, opts).then((res) => {
      const scene = this.data.scenes.find((s) => s.id === selectedId) || {}
      const finalRec = Object.assign({}, res, {
        scene: scene.name || res.scene,
        gradient: scene.gradient || res.gradient,
        colors: scene.colors || res.colors,
        quote: (customText && customText.trim()) || '',
        orient, arrange, position, font,
        date: postcards.today()
      })
      // 排版引擎补全渲染字段
      const decorated = decorateCard(finalRec)
      // 落库：保证「已存入我的作品」真实可信
      postcards.add(decorated)
      wx.showToast({ title: '已存入我的作品', icon: 'success' })
      this.setData({ result: decorated, generating: false, useImage: !!res.imageUrl }, () => {
        if (res.imageUrl) this.loadImage(res.imageUrl)
      })
    }).catch((err) => {
      this.setData({ generating: false })
      wx.showToast({ title: (err && err.message) || '生成失败', icon: 'none' })
    })
  },

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

  // 离屏画布绘制明信片，导出临时文件用于保存/打印（返回 Promise<tempPath>）
  // 导出统一为竖版(2:3)，横版内容顺时针旋转 90°（与展示态一致）
  drawPostcard() {
    const r = this.data.result
    if (!r) return Promise.resolve('')
    return new Promise((resolve) => {
      wx.createSelectorQuery().in(this)
        .select('#pcCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return resolve('')
          const canvas = res[0].node
          renderPostcard(canvas, r)
          wx.canvasToTempFilePath({
            canvas,
            success: (e) => { this.tempPath = e.tempFilePath; resolve(e.tempFilePath) },
            fail: () => resolve('')
          })
        })
    })
  },

  onSave() {
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
    if (this.tempPath) { save(this.tempPath); return }
    this.drawPostcard().then((path) => save(path))
  },

  // 打印：绘制高清图后用系统图片查看器（可长按保存 / 打印）
  onPrint() {
    const rec = this.data.result
    if (!rec) return
    wx.showToast({ title: '长按图片可保存或打印', icon: 'none' })
    const open = (path) => { if (path) wx.previewImage({ urls: [path], current: path }) }
    if (rec.imageUrl) { open(rec.imageUrl); return }
    this.drawPostcard().then(open)
  },

  onAgain() {
    this.tempPath = ''
    this.setData({ result: null, useImage: false, customText: '' }, () => this.updateDraft())
  },

  onShareAppMessage() {
    const r = this.data.result
    return {
      title: r ? ('我在红色回响创作了「' + r.scene + '」明信片') : '红色回响 · 创作你的专属红色明信片',
      path: '/pages/create/create',
      imageUrl: this.tempPath || (r && r.imageUrl) || ''
    }
  }
})
