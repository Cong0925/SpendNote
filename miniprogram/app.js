// app.js
App({
  onLaunch: async function () {
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
      ],
      // 用户信息
      userInfo: null,
      // 登录状态
      isLoggedIn: false
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }

    // 检查登录状态（异步）
    this.globalData.isLoggedIn = await this.checkLoginStatus();

    // 初始化默认分类（新用户首次使用时）
    this.initDefaultCategories();
  },

  /**
   * 检查登录状态（混合验证：7天内本地免登，超过7天验证数据库）
   * @returns {Promise<boolean>} 是否已登录
   */
  async checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const loginTime = wx.getStorageSync('loginTime');

      if (!userInfo || !loginTime) {
        // 无本地登录信息，需要登录
        return false;
      }

      // 计算距上次登录的时间差（毫秒）
      const currentTime = Date.now();
      const timeDiff = currentTime - loginTime;
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      if (timeDiff < sevenDaysInMs) {
        // 7天内，使用本地标识免登
        this.globalData.userInfo = userInfo;
        console.log('登录状态：本地免登（有效期内）');
        return true;
      }

      // 超过7天，需要验证数据库
      console.log('登录状态：验证数据库（已超过7天）');
      const isValid = await this.validateUserFromDatabase(userInfo);

      if (isValid) {
        // 数据库验证通过，更新登录时间
        this.globalData.userInfo = userInfo;
        wx.setStorageSync('loginTime', currentTime);
        console.log('登录状态：数据库验证通过，已更新登录时间');
        return true;
      } else {
        // 数据库验证失败，清除本地信息
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('loginTime');
        this.globalData.userInfo = null;
        console.log('登录状态：数据库验证失败，已清除本地信息');
        return false;
      }
    } catch (err) {
      console.error('检查登录状态失败：', err);
      // 网络异常时降级处理：如果有本地信息则暂时信任
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        console.log('登录状态：网络异常，暂时信任本地信息');
        return true;
      }
      return false;
    }
  },

  /**
   * 从数据库验证用户是否存在
   * @param {Object} userInfo - 本地用户信息
   * @returns {Promise<boolean>} 用户是否存在
   */
  async validateUserFromDatabase(userInfo) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'get'
        }
      });

      if (res.result.success && res.result.data) {
        // 用户存在于数据库
        return true;
      } else {
        // 用户不存在于数据库
        return false;
      }
    } catch (err) {
      console.error('验证用户数据库失败：', err);
      // 网络异常时返回false，让调用方决定
      throw err;
    }
  },

  /**
   * 获取用户信息（带缓存）
   * @returns {Object|null} 用户信息或null
   */
  async getUserInfo() {
    // 优先从内存获取
    if (this.globalData.userInfo) {
      return this.globalData.userInfo;
    }

    // 从本地存储获取
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      return userInfo;
    }

    // 需要登录
    return null;
  },

  /**
   * 初始化默认分类（新用户首次使用时调用）
   */
  async initDefaultCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'categoryFunctions',
        data: {
          action: 'initDefaultCategories'
        }
      });

      if (res.result.success) {
        console.log('默认分类初始化完成：', res.result.message);
      } else {
        console.error('默认分类初始化失败：', res.result.error);
      }
    } catch (err) {
      console.error('调用初始化分类函数失败：', err);
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
