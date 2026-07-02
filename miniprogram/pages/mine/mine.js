// pages/mine/mine.js
const { formatAmount } = require('../../utils/formatAmount')

Page({
  data: {
    userInfo: null,
    totalBills: 0,
    totalExpense: 0,
    totalIncome: 0,
    totalExpenseStr: '0.00',
    totalIncomeStr: '0.00',
    loading: false
  },

  onLoad() {
    this.loadUserInfo()
    this.loadOverview()
  },

  onShow() {
    this.loadOverview()
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
      const res = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'getStats',
          data: {}
        }
      })

      if (res.result.success) {
        const { totalExpense, totalIncome, billCount } = res.result.data

        this.setData({
          totalBills: billCount,
          totalExpense: totalExpense,
          totalIncome: totalIncome,
          totalExpenseStr: formatAmount(totalExpense),
          totalIncomeStr: formatAmount(totalIncome)
        })
      }
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

  // 导出数据
  exportData() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于 SpendNote',
      content: '一款轻量、纯净的记账小程序\n\n版本：v1.0.0\n\n数据安全：所有数据存储在微信云开发，安全可靠',
      showCancel: false
    })
  },

  // 清除数据
  clearData() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有账单数据吗？此操作不可恢复！',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '清除中...' })

            // 先获取所有账单
            const getRes = await wx.cloud.callFunction({
              name: 'billFunctions',
              data: {
                action: 'getBills',
                data: { page: 1, pageSize: 1000 }
              }
            })

            if (getRes.result.success && getRes.result.data.length > 0) {
              // 逐个删除账单
              const deletePromises = getRes.result.data.map(bill => {
                return wx.cloud.callFunction({
                  name: 'billFunctions',
                  data: { action: 'deleteBill', billId: bill._id }
                })
              })

              await Promise.all(deletePromises)
            }

            wx.hideLoading()
            wx.showToast({
              title: '清除成功',
              icon: 'success'
            })

            this.loadOverview()
          } catch (error) {
            wx.hideLoading()
            console.error('清除失败:', error)
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})
