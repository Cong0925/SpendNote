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
    loading: false,
    // 数据统计
    dataStats: null,
    showClearModal: false,
    clearStep: 0 // 0: 确认, 1: 输入确认文字
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
    try {
      console.log('开始获取数据统计...')
      const res = await wx.cloud.callFunction({
        name: 'clearUserData',
        data: { action: 'getStats' }
      })

      console.log('获取数据统计结果:', res)
      if (res.result && res.result.success) {
        this.setData({ dataStats: res.result.data })
      } else {
        console.error('获取数据统计失败:', res.result)
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('获取数据统计异常:', error)
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
    }
  },

  // 关闭清除数据弹窗
  closeClearModal() {
    this.setData({ showClearModal: false, clearStep: 0, dataStats: null })
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

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于 SpendNote',
      content: '一款轻量、纯净的记账小程序\n\n版本：v1.0.0\n\n数据安全：所有数据存储在微信云开发，安全可靠',
      showCancel: false
    })
  }
})
