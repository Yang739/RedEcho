// components/pc-canvas/pc-canvas.js
// 复用 services/pcLayout.js 的 paintPostcard，将明信片以 Canvas 绘制。
// 展示统一为竖版(2:3)：横版内容在 canvas 内部顺时针旋转 90°（与导出一致）。
// <canvas> 元素始终 100% 填满父容器，无裁剪问题。
const { paintPostcard, decorateCard } = require('../../services/pcLayout.js')

// 参考分辨率：统一竖版 600×900（与 .pc-frame aspect-ratio: 2/3 对应）
const REF_W = 600
const REF_H = 900

function getDpr() {
  try {
    if (wx.getWindowInfo) return wx.getWindowInfo().pixelRatio || 2
    return wx.getSystemInfoSync().pixelRatio || 2
  } catch (e) { return 2 }
}

Component({
  properties: {
    card: { type: Object, value: null, observer() { this._render() } },
    // 覆盖长边上限 px（未乘 dpr）。预览传 900 高清；默认缩略图 480 控内存。
    res: { type: Number, value: 0 }
  },

  lifetimes: {
    attached() { this._canvas = null },
    ready() { this._query() }
  },

  pageLifetimes: {
    show() { this._render() } // 字体加载后重绘用上真·书法体
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
      // 长边上限：按竖版 900 为基准
      const maxLong = (this.data.res && this.data.res > 0) ? this.data.res : 480
      const scale = Math.min(maxLong / REF_W, maxLong / REF_H)

      const dpr = getDpr()
      const W = Math.round(REF_W * scale)
      const H = Math.round(REF_H * scale)
      canvas.width = W * dpr
      canvas.height = H * dpr

      const ctx = canvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(dpr * scale, dpr * scale)

      const c = decorateCard(card)
      if (orient === 'land') {
        // 横版：在 600×900 竖版画布内，translate(600,0)+rotate(π/2) 把 3:2 组合旋转填满
        ctx.translate(REF_W, 0)
        ctx.rotate(Math.PI / 2)
        paintPostcard(ctx, 900, 600, c)
      } else {
        paintPostcard(ctx, REF_W, REF_H, c)
      }
    }
  }
})
