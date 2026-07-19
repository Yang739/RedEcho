Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home',    text: '首页', iconGray: 'icons/home-gray.svg',   iconInk: 'icons/home.svg' },
      { pagePath: '/pages/show/show',    text: '演出', iconGray: 'icons/show-gray.svg',   iconInk: 'icons/show.svg' },
      { pagePath: '/pages/create/create', text: '创作', iconGray: 'icons/create-gray.svg', iconInk: 'icons/create.svg' },
      { pagePath: '/pages/mine/mine',    text: '我的', iconGray: 'icons/mine-gray.svg',   iconInk: 'icons/mine.svg' }
    ]
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const url = this.data.list[index].pagePath
      wx.switchTab({ url })
    }
  }
})
