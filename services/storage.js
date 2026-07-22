// services/storage.js —— 安全的 wx 本地存储封装
// 统一处理「键未设置」「非小程序环境（node 桩测）」等边界，避免各处重复写 try/catch。

function get(key, fallback) {
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const v = wx.getStorageSync(key)
      if (v === '' || v === undefined || v === null) return fallback
      return v
    }
  } catch (e) {}
  return fallback
}

function set(key, val) {
  try {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync(key, val)
    }
  } catch (e) {}
}

module.exports = { get, set }
