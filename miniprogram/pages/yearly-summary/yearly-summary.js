// pages/yearly-summary/yearly-summary.js
const app = getApp()

// 月度趋势数据加载（内联避免模块导入问题）
async function loadMonthlyTrendData(year) {
  const res = await wx.cloud.callFunction({
    name: 'billFunctions',
    data: { action: 'getMonthlyTrend', data: { year } }
  })
  if (!res.result.success) return { monthlyTrend: [], maxMonthlyAmount: 0 }
  const trend = res.result.data || []
  let maxAmount = 0
  trend.forEach(item => {
    const total = (item.expense || 0) + (item.income || 0)
    if (total > maxAmount) maxAmount = total
  })
  const monthlyTrend = trend.map(item => ({
    ...item,
    expenseHeight: maxAmount > 0 ? ((item.expense || 0) / maxAmount * 100).toFixed(1) : '0',
    incomeHeight: maxAmount > 0 ? ((item.income || 0) / maxAmount * 100).toFixed(1) : '0',
    expenseStr: Number(item.expense || 0).toFixed(2),
    incomeStr: Number(item.income || 0).toFixed(2)
  }))
  return { monthlyTrend, maxMonthlyAmount: maxAmount }
}

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
    totalExpenseStr: '0.00',
    // 新增分析数据
    dailyAvgExpense: '0.00',
    dailyAvgIncome: '0.00',
    savingsRate: 0,
    avgBillsPerDay: 0,
    bookkeepingRate: 0,
    // 支出分类排行
    expenseRankList: [],
    // 月度趋势
    monthlyTrend: [],
    maxMonthlyAmount: 0,
    // 年度选择器
    showYearPicker: false,
    yearList: []
  },

  onLoad() {
    const currentYear = new Date().getFullYear()
    this.setData({ year: currentYear })
    this.loadYearlyData()
    this.calculateUsageDays()
    this.loadYearList()
  },

  // 加载年度数据
  async loadYearlyData() {
    this.setData({ loading: true })

    try {
      const { year } = this.data

      // 调用云函数获取年度数据
      const res = await wx.cloud.callFunction({
        name: 'yearlySummary',
        data: {
          action: 'getYearData',
          year
        }
      })

      if (res.result.success) {
        const data = res.result.data
        this.setData({
          totalIncome: data.totalIncome || 0,
          totalExpense: data.totalExpense || 0,
          totalCount: data.totalCount || 0,
          bookkeepingDays: data.bookkeepingDays || 0,
          totalIncomeStr: this.formatAmount(data.totalIncome),
          totalExpenseStr: this.formatAmount(data.totalExpense),
          dailyAvgExpense: data.dailyAvgExpense || '0.00',
          dailyAvgIncome: data.dailyAvgIncome || '0.00',
          savingsRate: data.savingsRate || 0,
          avgBillsPerDay: data.avgBillsPerDay || 0,
          bookkeepingRate: data.bookkeepingRate || 0,
          expenseRankList: data.expenseRankList || []
        })

        // 加载月度趋势（等待完成后再隐藏骨架屏）
        await this.loadMonthlyTrend()
        this.setData({ loading: false })
      } else {
        console.error('获取年度数据失败：', res.result.error)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      }
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
        this.setData({ usageDays: 1 })
      }
    } catch (err) {
      console.error('计算使用天数失败：', err)
      this.setData({ usageDays: 1 })
    }
  },

  // 加载月度趋势数据
  async loadMonthlyTrend() {
    try {
      const { year } = this.data
      const { monthlyTrend, maxMonthlyAmount } = await loadMonthlyTrendData(year)
      this.setData({ monthlyTrend, maxMonthlyAmount })
    } catch (err) {
      console.error('加载月度趋势失败：', err)
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
  },

  // 加载年度列表
  async loadYearList() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'yearlySummary',
        data: {
          action: 'getYearList'
        }
      })

      if (res.result.success) {
        this.setData({ yearList: res.result.data })
      } else {
        console.error('获取年度列表失败：', res.result.error)
      }
    } catch (err) {
      console.error('加载年度列表失败：', err)
    }
  },

  // 显示年度选择器
  async onShowYearPicker() {
    // 先刷新年度列表，再显示弹窗
    await this.loadYearList()
    this.setData({ showYearPicker: true })
  },

  // 关闭年度选择器
  onCloseYearPicker() {
    this.setData({ showYearPicker: false })
  },

  // 选择年度
  async onSelectYear(e) {
    const { year } = e.detail
    this.setData({
      year,
      showYearPicker: false,
      loading: true
    })

    try {
      // 检查该年度是否有数据
      const yearItem = this.data.yearList.find(item => item.year === year)

      if (yearItem && !yearItem.hasSummary) {
        // 没有年度总结，尝试生成
        wx.showLoading({ title: '生成年度总结中...' })

        const generateRes = await wx.cloud.callFunction({
          name: 'yearlySummary',
          data: {
            action: 'generate',
            year
          }
        })

        wx.hideLoading()

        if (!generateRes.result.success) {
          wx.showToast({ title: '生成失败', icon: 'none' })
        }
      }

      // 重新加载年度列表和数据
      await Promise.all([
        this.loadYearList(),
        this.loadYearlyData()
      ])
    } catch (err) {
      console.error('选择年度失败：', err)
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})