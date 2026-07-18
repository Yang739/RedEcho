// pages/create/create.js
const api = require('../../services/api.js')

Page({
  data: {
    loading: true,
    scenes: [],
    postcards: []
  },

  onShow() {
    this.load()
  },

  load() {
    this.setData({ loading: true })
    Promise.all([api.getScenes(), api.getPostcards()])
      .then(([scenes, postcards]) => this.setData({ scenes, postcards, loading: false }))
      .catch(() => this.setData({ loading: false }))
  },

  onSelect(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packages/create/pages/generate/generate?sceneId=${id}` })
  }
})
