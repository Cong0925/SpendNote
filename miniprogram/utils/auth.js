/**
 * 登录状态检查工具函数
 * 用于统一处理页面登录状态检查
 */

/**
 * 检查登录状态，未登录则跳转到登录页
 * @param {boolean} redirect - 是否跳转到登录页（默认true）
 * @returns {boolean} 是否已登录
 */
function checkLogin(redirect = true) {
  const app = getApp()

  if (app.globalData.isLoggedIn) {
    return true
  }

  if (redirect) {
    wx.redirectTo({ url: '/pages/login/login' })
  }

  return false
}

/**
 * 检查登录状态并返回用户信息
 * @param {boolean} redirect - 是否跳转到登录页（默认true）
 * @returns {Object|null} 用户信息或null
 */
async function checkLoginAndGetUserInfo(redirect = true) {
  const app = getApp()

  if (app.globalData.isLoggedIn && app.globalData.userInfo) {
    return app.globalData.userInfo
  }

  if (redirect) {
    wx.redirectTo({ url: '/pages/login/login' })
  }

  return null
}

module.exports = {
  checkLogin,
  checkLoginAndGetUserInfo
}
