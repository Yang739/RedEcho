// components/staff-show-selector —— 工作人员「正在进行的表演」选择器
// 作用：强制其他功能页在开始执行前，必须选定一个 status==='live' 的演出。
//   - 加载全部演出，筛出正在进行的（live）作为可选项；
//   - value 命中则选中，否则默认取首个 live；若没有任何正在进行的演出，提示先去场次管理开场；
//   - 点击弹出 actionSheet 在多个 live 演出间切换；选中后 triggerEvent('change', show|null)。
//
// ⚠️ 防回环（关键）：本组件通过 triggerEvent('change') 把选中演出回传给页面，页面再把
// showId 通过 value 属性回绑给本组件；若每次 change 都无条件触发，会形成
// 「value 变化 → resolve → change → 页面 setData → value 变化 → …」的无限 setData 死循环，
// 表现为页面卡死（死机）、点击无反应、无法退出。故用 _emittedKey 记录已广播的演出 key，
// 仅在选中项真正变化时才 triggerEvent，彻底打断回环。
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
    attached() {
      this._emittedKey = ''   // 已广播的演出 key，用于防回环
      this.load()
    }
  },
  observers: {
    // value 来自页面回绑的 showId；仅在仍有意义时解析（空值跳过，避免无意义广播）
    value(v) { if (v) this.resolve(v) }
  },
  methods: {
    keyOf(s) { return (s && (s.id || s._id)) || '' },
    // 广播选中项；若与已广播项相同则不重复 triggerEvent（打断与页面的 setData 回环）
    emit(cur) {
      const key = this.keyOf(cur)
      if (key && key !== this._emittedKey) {
        this._emittedKey = key
        this.triggerEvent('change', cur)
      }
    },
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
    // 根据偏好 id 解析出当前选中的 live 演出；id 缺失时回退 _id（新建场次场景）
    resolve(pref) {
      const live = this.data.liveShows
      let cur = null
      if (pref) cur = live.find((s) => this.keyOf(s) === pref) || null
      if (!cur && live.length) cur = live[0]
      this.setData({ current: cur, none: live.length === 0 })
      this.emit(cur)
    },
    onPick() {
      const live = this.data.liveShows
      if (!live.length) return
      wx.showActionSheet({
        itemList: live.map((s) => s.title),
        success: (r) => {
          const cur = live[r.tapIndex]
          this.setData({ current: cur })
          this.emit(cur)
        }
      })
    }
  }
})
