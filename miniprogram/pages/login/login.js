// pages/login/login.js
const app = getApp()

Page({
  data: {
    avatarUrl: '',
    nickName: '',
    isAgreed: false,
    canLogin: false,
    isLoading: false
  },

  // 选择头像回调
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({ avatarUrl })
  },

  // 输入昵称
  onInputNickname(e) {
    this.setData({ nickName: e.detail.value })
    this.updateCanLogin()
  },

  // 清除昵称
  onClearNickname() {
    this.setData({ nickName: '' })
  },

  // 切换协议勾选状态
  toggleAgreement() {
    const isAgreed = !this.data.isAgreed
    this.setData({ isAgreed })
    this.updateCanLogin()
  },

  // 更新登录按钮状态
  updateCanLogin() {
    const { nickName, isAgreed } = this.data
    const canLogin = !!(nickName && nickName.trim() && isAgreed)
    this.setData({ canLogin })
  },

  // 登录
  async onLogin() {
    const { avatarUrl, nickName, isAgreed } = this.data

    if (!nickName || !nickName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    // 未勾选协议，弹出提示
    if (!isAgreed) {
      wx.showModal({
        title: '提示',
        content: '请先阅读并同意《用户协议》和《隐私政策》',
        confirmText: '同意',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 用户点击同意，自动勾选
            this.setData({ isAgreed: true })
            this.updateCanLogin()
          }
        }
      })
      return
    }

    // 显示加载遮罩
    this.setData({ isLoading: true })

    try {
      // 1. 获取openid
      const loginRes = await wx.cloud.callFunction({
        name: 'login'
      })

      const { openid } = loginRes.result

      // 2. 处理头像：如果有选择头像，上传到云存储
      let finalAvatarUrl = avatarUrl
      if (avatarUrl) {
        finalAvatarUrl = await this.uploadAvatar(avatarUrl, openid)
      }

      // 3. 保存用户信息到云数据库
      await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'save',
          userInfo: {
            avatarUrl: finalAvatarUrl,
            nickName: nickName.trim(),
            openid
          }
        }
      })

      // 4. 缓存用户信息到本地
      const userInfo = {
        avatarUrl: finalAvatarUrl,
        nickName: nickName.trim(),
        openid
      }
      wx.setStorageSync('userInfo', userInfo)
      app.globalData.userInfo = userInfo

      // 5. 跳转到主页
      wx.switchTab({ url: '/pages/index/index' })

    } catch (err) {
      this.setData({ isLoading: false })
      console.error('登录失败：', err)
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  },

  // 上传头像到云存储
  async uploadAvatar(tempFilePath, openid) {
    try {
      const cloudPath = `user-avatars/${openid}/${Date.now()}.png`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath
      })
      return uploadRes.fileID
    } catch (err) {
      console.error('上传头像失败：', err)
      return tempFilePath // 上传失败则使用临时路径
    }
  },

  // 查看用户协议
  onViewAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement' })
  },

  // 查看隐私政策
  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  }
})
