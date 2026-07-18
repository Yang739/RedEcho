// packages/show/pages/review/review.js
const api = require('../../../../services/api.js')

Page({
  data: {
    show: { title: '', venue: '', date: '', gradient: '' },
    myVote: '',
    emotionDist: [],
    quote: ''
  },

  onLoad(options) {
    const id = options.id || 's3'
    api.getReview(id).then((d) => {
      this.setData({
        show: d.show,
        myVote: d.myVote,
        emotionDist: d.emotionDist,
        quote: d.quote
      })
    })
  },

  goGenerate() {
    wx.navigateTo({ url: '/packages/create/pages/generate/generate' })
  }
})
