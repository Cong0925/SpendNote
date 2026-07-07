// pages/mine/mine.js
const { formatAmount } = require('../../utils/formatAmount')
const app = getApp()

Page({
  data: {
    userInfo: null,
    year: 2026,
    totalBills: 0,
    totalExpense: 0,
    totalIncome: 0,
    totalExpenseStr: '0.00',
    totalIncomeStr: '0.00',
    usageDays: 0,
    bookkeepingDays: 0,
    loading: false,
    // 数据统计
    dataStats: null,
    loadingStats: false,  // 数据统计加载状态
    showClearModal: false,
    clearStep: 0 // 0: 确认, 1: 输入确认文字
  },

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    const app = getApp()

    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }

    // 检测是否发生了 Tab 切换
    if (app.checkTabBarChange('pages/mine/mine')) {
      // 发生了 Tab 切换，重置临时状态
      this.resetTemporaryStates()
    }

    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }

    // 加载数据
    this.loadOverview()
  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    const app = getApp()
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    const currentYear = new Date().getFullYear()
    this.setData({ year: currentYear })
    this.loadUserInfo()
    this.loadOverview()
  },

  /**
   * 重置临时状态
   * 当从其他Tab切换回来时，重置这些状态
   */
  resetTemporaryStates() {
    this.setData({
      showClearModal: false,     // 重置清除数据弹窗
      clearStep: 0,              // 重置清除步骤
      loadingStats: false        // 重置数据统计加载状态
    })
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 加载总览数据
  async loadOverview() {
    this.setData({ loading: true })

    try {
      const { year } = this.data

      // 获取所有账单（不使用日期范围查询，因为date字段是字符串格式）
      const allBillsRes = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'list',
          data: {
            page: 1,
            pageSize: 1000
          }
        }
      })

      let totalIncome = 0
      let totalExpense = 0
      let totalCount = 0
      const bookkeepingDates = new Set()

      // 过滤当年数据
      if (allBillsRes.result.success && allBillsRes.result.data) {
        const allBills = allBillsRes.result.data

        allBills.forEach(bill => {
          // 检查是否是当年数据
          if (bill.date && bill.date.startsWith(String(year))) {
            totalCount++

            // 计算收入
            if (bill.type === 'income') {
              totalIncome += (bill.amount || 0)
            }

            // 计算支出
            if (bill.type === 'expense') {
              totalExpense += (bill.amount || 0)
            }

            // 记录记账日期
            if (bill.date) {
              bookkeepingDates.add(bill.date)
            }
          }
        })
      }

      // 计算使用天数
      let usageDays = 1
      const userInfo = app.globalData.userInfo
      if (userInfo && userInfo.createTime) {
        const createTime = new Date(userInfo.createTime)
        const now = new Date()
        const diffTime = now.getTime() - createTime.getTime()
        usageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
      }

      this.setData({
        totalBills: totalCount,
        totalExpense: totalExpense,
        totalIncome: totalIncome,
        totalExpenseStr: formatAmount(totalExpense),
        totalIncomeStr: formatAmount(totalIncome),
        usageDays: usageDays,
        bookkeepingDays: bookkeepingDates.size
      })
    } catch (error) {
      console.error('加载总览失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 获取用户信息
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => {
        const userInfo = res.userInfo
        wx.setStorageSync('userInfo', userInfo)
        this.setData({ userInfo })
      },
      fail: (err) => {
        console.log('获取用户信息失败:', err)
      }
    })
  },

  // 修改头像
  onChangeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })

        try {
          const userInfo = this.data.userInfo
          const openid = userInfo.openid

          // 上传到云存储
          const cloudPath = `user-avatars/${openid}/${Date.now()}.png`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath
          })

          const newAvatarUrl = uploadRes.fileID

          // 更新云数据库
          await wx.cloud.callFunction({
            name: 'user',
            data: {
              action: 'updateAvatar',
              avatarUrl: newAvatarUrl
            }
          })

          // 更新本地缓存
          userInfo.avatarUrl = newAvatarUrl
          wx.setStorageSync('userInfo', userInfo)
          app.globalData.userInfo = userInfo

          this.setData({ userInfo })
          wx.hideLoading()
          wx.showToast({ title: '头像已更新', icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          console.error('修改头像失败:', err)
          wx.showToast({ title: '修改失败，请重试', icon: 'none' })
        }
      }
    })
  },

  // 修改昵称
  onChangeNickname() {
    const currentNickname = this.data.userInfo?.nickName || ''

    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: currentNickname,
      success: async (res) => {
        if (res.confirm && res.content) {
          const newNickname = res.content.trim()

          // 验证昵称
          if (!newNickname) {
            wx.showToast({ title: '昵称不能为空', icon: 'none' })
            return
          }

          if (newNickname.length > 12) {
            wx.showToast({ title: '昵称不能超过12个字符', icon: 'none' })
            return
          }

          wx.showLoading({ title: '修改中...' })

          try {
            // 更新云数据库
            await wx.cloud.callFunction({
              name: 'user',
              data: {
                action: 'updateNickname',
                nickName: newNickname
              }
            })

            // 更新本地缓存
            const userInfo = this.data.userInfo
            userInfo.nickName = newNickname
            wx.setStorageSync('userInfo', userInfo)
            app.globalData.userInfo = userInfo

            this.setData({ userInfo })
            wx.hideLoading()
            wx.showToast({ title: '昵称已更新', icon: 'success' })
          } catch (err) {
            wx.hideLoading()
            console.error('修改昵称失败:', err)
            wx.showToast({ title: '修改失败，请重试', icon: 'none' })
          }
        }
      }
    })
  },

  // 导出数据
  async exportData() {
    wx.showLoading({ title: '导出中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'clearUserData',
        data: { action: 'export' }
      })

      if (res.result.success) {
        const data = res.result.data
        const content = this.formatExportData(data)

        // 复制到剪贴板
        wx.setClipboardData({
          data: content,
          success: () => {
            wx.hideLoading()
            wx.showModal({
              title: '导出成功',
              content: '数据已复制到剪贴板，请粘贴到需要保存的位置',
              showCancel: false
            })
          }
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '导出失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('导出数据失败:', error)
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    }
  },

  // 格式化导出数据
  formatExportData(data) {
    const lines = []
    lines.push('=== SpendNote 数据导出 ===')
    lines.push(`导出时间：${data.exportTime}`)
    lines.push('')

    // 账户信息
    lines.push('【账户列表】')
    if (data.accounts.length === 0) {
      lines.push('  暂无数据')
    } else {
      data.accounts.forEach((account, index) => {
        lines.push(`${index + 1}. ${account.name} (${account.type})`)
        lines.push(`   余额：${account.balance}`)
      })
    }
    lines.push('')

    // 账单信息
    lines.push('【账单记录】')
    if (data.bills.length === 0) {
      lines.push('  暂无数据')
    } else {
      data.bills.forEach((bill, index) => {
        lines.push(`${index + 1}. [${bill.date}] ${bill.type === 'income' ? '收入' : '支出'} ${bill.amount}元 - ${bill.category}`)
        if (bill.note) {
          lines.push(`   备注：${bill.note}`)
        }
      })
    }
    lines.push('')

    // 借款记录
    lines.push('【借款记录】')
    if (data.loans.length === 0) {
      lines.push('  暂无数据')
    } else {
      data.loans.forEach((loan, index) => {
        lines.push(`${index + 1}. [${loan.loanDate}] ${loan.type === 'lend' ? '借出' : '借入'} ${loan.amount}元`)
        lines.push(`   对象：${loan.personName}，已还：${loan.paidAmount || 0}元`)
      })
    }
    lines.push('')

    // 转账记录
    lines.push('【转账记录】')
    if (data.transfers.length === 0) {
      lines.push('  暂无数据')
    } else {
      data.transfers.forEach((transfer, index) => {
        lines.push(`${index + 1}. [${transfer.date}] ${transfer.amount}元`)
        lines.push(`   从 ${transfer.fromAccountName} 到 ${transfer.toAccountName}`)
      })
    }

    return lines.join('\n')
  },

  // 显示清除数据弹窗
  showClearDataModal() {
    this.setData({ showClearModal: true, clearStep: 0 })
    this.loadDataStats()
  },

  // 空函数，用于阻止事件冒泡
  noop() {},

  // 加载数据统计
  async loadDataStats() {
    this.setData({ loadingStats: true })
    try {
      console.log('开始获取数据统计...')
      const res = await wx.cloud.callFunction({
        name: 'clearUserData',
        data: { action: 'getStats' }
      })

      console.log('获取数据统计结果:', res)
      if (res.result && res.result.success) {
        this.setData({ dataStats: res.result.data, loadingStats: false })
      } else {
        console.error('获取数据统计失败:', res.result)
        this.setData({ loadingStats: false })
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('获取数据统计异常:', error)
      this.setData({ loadingStats: false })
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
    }
  },

  // 关闭清除数据弹窗
  closeClearModal() {
    this.setData({ showClearModal: false, clearStep: 0, dataStats: null, loadingStats: false })
  },

  // 下一步（确认删除）
  nextClearStep() {
    this.setData({ clearStep: 1 })
  },

  // 确认清除所有数据
  async confirmClearData() {
    this.setData({ showClearModal: false, clearStep: 0 })
    wx.showLoading({ title: '清除中...' })

    try {
      console.log('开始清除数据...')
      const res = await wx.cloud.callFunction({
        name: 'clearUserData',
        data: { action: 'clearAll' }
      })

      console.log('清除数据结果:', res)
      wx.hideLoading()

      if (res.result && res.result.success) {
        const { bills, accounts, loans, transfers, total } = res.result.data
        wx.showModal({
          title: '清除成功',
          content: `已清除：${bills}条账单、${accounts}个账户、${loans}条借款、${transfers}条转账`,
          showCancel: false
        })
        this.loadOverview()
      } else {
        console.error('清除数据失败:', res.result)
        wx.showToast({
          title: res.result?.error || '清除失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('清除数据异常:', error)
      wx.showToast({
        title: '清除失败，请检查云函数是否已部署',
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 跳转到评分页面
  goToRating() {
    wx.navigateTo({ url: '/pages/rating/rating' })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#e57373',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })

          try {
            // 删除数据库中的用户记录
            await wx.cloud.callFunction({
              name: 'user',
              data: {
                action: 'deleteUser'
              }
            })

            // 清除本地缓存
            wx.removeStorageSync('userInfo')
            wx.removeStorageSync('loginTime')

            // 清除全局用户信息
            const app = getApp()
            app.globalData.userInfo = null
            app.globalData.isLoggedIn = false

            wx.hideLoading()

            // 跳转到登录页
            wx.redirectTo({ url: '/pages/login/login' })
          } catch (err) {
            wx.hideLoading()
            console.error('退出登录失败：', err)
            // 即使删除数据库失败，也清除本地信息
            wx.removeStorageSync('userInfo')
            wx.removeStorageSync('loginTime')
            const app = getApp()
            app.globalData.userInfo = null
            app.globalData.isLoggedIn = false
            wx.redirectTo({ url: '/pages/login/login' })
          }
        }
      }
    })
  },

  // 跳转到问题反馈页面
  goToFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  // 跳转到年度总结页面
  goToYearlySummary() {
    wx.navigateTo({ url: '/pages/yearly-summary/yearly-summary' })
  },

  // 跳转到分类管理页面
  goToCategory() {
    wx.navigateTo({ url: '/pages/category/category' })
  },

  // 跳转到使用帮助页面
  goToHelp() {
    wx.navigateTo({ url: '/pages/help/help' })
  }
})
