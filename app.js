// app.js
const { ENV, DEBUG } = require('./config.js')

App({
  globalData: {
    env: ENV,
    userInfo: null
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('[RedEcho] 当前基础库版本过低，请使用 2.2.3 及以上的基础库以使用云能力')
      return
    }

    // 占位符环境 ID 表示使用本地 mock 调试，无需初始化云开发（避免控制台报 env 不存在）
    if (ENV === 'your-cloud-env-id') {
      if (DEBUG) console.log('[RedEcho] 未配置云环境，使用本地 mock 数据调试')
      return
    }

    wx.cloud.init({
      // 使用你在「云开发控制台 - 设置」中看到的环境 ID
      env: ENV,
      // 在用户管理中记录访问用户，便于排查
      traceUser: true
    })

    if (DEBUG) {
      console.log('[RedEcho] 云开发环境已初始化，env =', ENV)
    }
  }
})
