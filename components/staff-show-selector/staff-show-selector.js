// components/staff-show-selector —— 工作人员「正在进行的表演」选择器
// 作用：强制其他功能页在开始执行前，必须选定一个 status==='live' 的演出。
//   - 加载全部演出，筛出正在进行的（live）作为可选项；
//   - value 命中则选中，否则默认取首个 live；若没有任何正在进行的演出，提示先去场次管理开场；
//   - 点击弹出 actionSheet 在多个 live 演出间切换；选中后 triggerEvent('change', show|null)。
const api = require('../../services/api.js')

Component({
  properties: {
    value: { type: String, value: '' }     // 当前选中的 showId（通常由 home 传入）
  },
  data: {
    liveShows: [],
    current: null,
    none: false,
    loading: true
  },
  lifetimes: {
    attached() { this.load() }
  },
  observers: {
    value(v) { if (v) this.resolve(v) }
  },
  methods: {
    load() {
      api.getShows('all').then((list) => {
        const live = (list || []).filter((s) => s.status === 'live')
        this.setData({ liveShows: live, loading: false })
        this.resolve(this.data.value)
      }).catch(() => {
        this.setData({ loading: false, none: true })
        this.triggerEvent('change', null)
      })
    },
    // 根据偏好 id 解析出当前选中的 live 演出
    resolve(pref) {
      const live = this.data.liveShows
      let cur = null
      if (pref) cur = live.find((s) => s.id === pref) || null
      if (!cur && live.length) cur = live[0]
      this.setData({ current: cur, none: live.length === 0 })
      this.triggerEvent('change', cur)
    },
    onPick() {
      const live = this.data.liveShows
      if (!live.length) return
      wx.showActionSheet({
        itemList: live.map((s) => s.title),
        success: (r) => {
          const cur = live[r.tapIndex]
          this.setData({ current: cur })
          this.triggerEvent('change', cur)
        }
      })
    }
  }
})
