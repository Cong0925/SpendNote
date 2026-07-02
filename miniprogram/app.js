// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // env 参数说明：
      // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会请求到哪个云环境的资源
      // 此处请填入环境 ID, 环境 ID 可在微信开发者工具右上顶部工具栏点击云开发按钮打开获取
      env: "cloud1-d4gjxhe74a1deccaa",
      // Tab 切换跟踪
      lastTabBarIndex: -1,
      currentTabBarIndex: 0,
      // 页面状态重置配置
      tabBarPages: [
        'pages/index/index',
        'pages/stats/stats',
        'pages/account/account',
        'pages/mine/mine'
      ]
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },

  /**
   * 检测是否发生了 Tab 切换
   * @param {String} pagePath - 当前页面路径
   * @returns {Boolean} 是否发生了 Tab 切换
   */
  checkTabBarChange(pagePath) {
    const app = this;
    const tabBarPages = app.globalData.tabBarPages;
    const currentIndex = tabBarPages.indexOf(pagePath);

    if (currentIndex === -1) {
      // 不是 Tab 页面
      return false;
    }

    const lastTabBarIndex = app.globalData.lastTabBarIndex;
    const isChanged = lastTabBarIndex !== -1 && lastTabBarIndex !== currentIndex;

    // 更新 Tab 索引
    app.globalData.lastTabBarIndex = currentIndex;
    app.globalData.currentTabBarIndex = currentIndex;

    return isChanged;
  },

  /**
   * 获取当前 Tab 索引
   * @returns {Number} 当前 Tab 索引
   */
  getCurrentTabIndex() {
    return this.globalData.currentTabBarIndex;
  }
});
