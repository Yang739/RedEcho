// components/pc-canvas/pc-canvas.js
// 复用 services/pcLayout.js 的 paintPostcard，将明信片以 Canvas 绘制，
// 与「保存/分享」导出的离屏画布像素级一致（真正所见即所得）。
const { paintPostcard, decorateCard } = require('../../services/pcLayout.js')

// 缩略图背存长边上限（px，未乘 dpr）。画廊多卡时控制内存；预览可通过 res 覆盖到 900。
const MAX_LONG = 480

function getDpr() {
  try {
    if (wx.getWindowInfo) return wx.getWindowInfo().pixelRatio || 2
    return wx.getSystemInfoSync().pixelRatio || 2
  } catch (e) { return 2 }
}

Component({
  properties: {
    // 明信片数据（与导出同一结构：orient/arrange/position/quote/scene/colors/font/date/sign）
    card: { type: Object, value: null, observer() { this._render() } },
    // 可选：覆盖长边上限（预览传 900 提升清晰度；默认缩略图 480）
    res: { type: Number, value: 0 }
  },

  lifetimes: {
    attached() { this._canvas = null },
    ready() { this._query() }
  },

  // 页面 show 时字体可能已加载完成，重绘一次用上真·书法体
  pageLifetimes: {
    show() { this._render() }
  },

  methods: {
    _query() {
      wx.createSelectorQuery().in(this).select('.cv')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            this._canvas = res[0].node
            this._render()
          }
        })
    },

    _render() {
      const canvas = this._canvas
      const card = this.data.card
      if (!canvas || !card) return

      const orient = card.orient || 'land'
      // 参考分辨率：与导出 Canvas 比例一致（横 3:2 / 竖 2:3）
      const refW = orient === 'port' ? 600 : 900
      const refH = orient === 'port' ? 900 : 600
      const maxLong = (this.data.res && this.data.res > 0) ? this.data.res : MAX_LONG
      const scale = Math.min(maxLong / refW, maxLong / refH)

      const W = Math.round(refW * scale)
      const H = Math.round(refH * scale)
      const dpr = getDpr()
      canvas.width = W * dpr
      canvas.height = H * dpr

      const ctx = canvas.getContext('2d')
      // 重置变换（重绘时避免叠加），再按 dpr*scale 把参考坐标映射到背存像素
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(dpr * scale, dpr * scale)

      // 在参考坐标系下绘制，得到与导出图完全一致的版式
      paintPostcard(ctx, refW, refH, decorateCard(card))
    }
  }
})
