// pages/yearly-summary/yearly-summary.js
const app = getApp()

Page({
  data: {
    year: 2026,
    totalIncome: 0,
    totalExpense: 0,
    totalCount: 0,
    usageDays: 0,
    bookkeepingDays: 0,
    loading: false,
    // 格式化后的金额字符串
    totalIncomeStr: '0.00',
    totalExpenseStr: '0.00'
  },

  onLoad() {
    const currentYear = new Date().getFullYear()
    this.setData({ year: currentYear })
    this.loadYearlyData()
    this.calculateUsageDays()
  },

  // 加载年度数据
  async loadYearlyData() {
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

      this.setData({
        totalIncome,
        totalExpense,
        totalCount,
        bookkeepingDays: bookkeepingDates.size,
        totalIncomeStr: this.formatAmount(totalIncome),
        totalExpenseStr: this.formatAmount(totalExpense),
        loading: false
      })
    } catch (err) {
      console.error('加载年度数据失败：', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 计算使用天数
  calculateUsageDays() {
    try {
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
      if (userInfo && userInfo.createTime) {
        const createTime = new Date(userInfo.createTime)
        const now = new Date()
        const diffTime = now.getTime() - createTime.getTime()
        const usageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

        this.setData({ usageDays })
      } else {
        // 如果没有注册时间，使用默认值
        this.setData({ usageDays: 1 })
      }
    } catch (err) {
      console.error('计算使用天数失败：', err)
      this.setData({ usageDays: 1 })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 格式化金额
  formatAmount(amount) {
    if (amount == null || isNaN(amount)) {
      return '0.00'
    }
    return Number(amount).toFixed(2)
  }
})
