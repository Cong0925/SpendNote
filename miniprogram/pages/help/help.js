// pages/help/help.js
Page({
  data: {
    helpUrl: 'https://mp.weixin.qq.com/s/7DW0y0DjgfJIpAmRjnls7Q',
    loading: true
  },

  onLoad() {
    // web-view 加载完成
  },

  // web-view 加载成功
  onWebviewLoad() {
    this.setData({ loading: false })
  },

  // web-view 加载失败
  onWebviewError(e) {
    console.error('加载帮助页面失败：', e.detail)
    this.setData({ loading: false })
    wx.showToast({ title: '加载失败', icon: 'none' })
  }
})
