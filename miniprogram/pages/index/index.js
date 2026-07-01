// pages/index/index.js
Page({
  data: {
    bills: [],
    // 类型选择
    viewMode: 'day',
    viewModes: [
      { label: '日', value: 'day' },
      { label: '月', value: 'month' },
      { label: '季', value: 'quarter' },
      { label: '年', value: 'year' }
    ],
    // 日期相关
    currentDate: '',
    dateDisplay: '',
    // 季度弹窗
    showQuarter: false,
    quarterIndex: 0,
    quarters: [
      { label: '第一季度 Q1', value: 0 },
      { label: '第二季度 Q2', value: 1 },
      { label: '第三季度 Q3', value: 2 },
      { label: '第四季度 Q4', value: 3 }
    ],
    // 数据
    totalExpenseStr: '0.00',
    totalIncomeStr: '0.00',
    loading: false,
    hasMore: true,
    // 滑动相关
    startX: 0,
    swipedIndex: -1,
    // 时间范围选择
    isRange: true, // 启用时间范围选择
    rangeStartDate: '',
    rangeEndDate: '',
    rangeStartText: '',
    rangeEndText: ''
  },

  onLoad() {
    this.initDate()
  },

  onShow() {
    this.loadBills()
  },

  // 初始化日期
  initDate() {
    const now = new Date()
    const date = this.formatDate(now)
    const viewMode = this.data.viewMode

    // 初始化时间范围
    let rangeStartDate = date
    let rangeEndDate = date

    // 根据视图模式设置默认范围
    if (viewMode === 'month') {
      const [y, m] = date.split('-')
      rangeStartDate = `${y}-${m}-01`
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      rangeEndDate = `${y}-${m}-${lastDay}`
    } else if (viewMode === 'year') {
      const [y] = date.split('-')
      rangeStartDate = `${y}-01-01`
      rangeEndDate = `${y}-12-31`
    }

    this.setData({
      currentDate: date,
      dateDisplay: this.getDisplayDate(date, viewMode),
      rangeStartDate: rangeStartDate,
      rangeEndDate: rangeEndDate,
      rangeStartText: this.getDisplayDate(rangeStartDate, viewMode),
      rangeEndText: this.getDisplayDate(rangeEndDate, viewMode)
    })
  },

  // 格式化日期
  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  // 根据类型格式化显示
  getDisplayDate(dateStr, mode) {
    const [y, m, d] = dateStr.split('-')
    switch (mode) {
      case 'day':
        return `${y}-${m}-${d}`
      case 'month':
        return `${y}-${m}`
      case 'quarter':
        const q = Math.ceil(parseInt(m) / 3)
        return `${y} Q${q}`
      case 'year':
        return `${y}`
    }
  },

  // 根据类型获取日期范围
  getDateRange(dateStr, mode) {
    const [y, m, d] = dateStr.split('-').map(Number)

    switch (mode) {
      case 'day':
        return {
          start: dateStr,
          end: dateStr
        }
      case 'month':
        const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
        const lastDay = new Date(y, m, 0).getDate()
        const monthEnd = `${y}-${String(m).padStart(2, '0')}-${lastDay}`
        return { start: monthStart, end: monthEnd }
      case 'quarter':
        const q = Math.ceil(m / 3)
        const qStartMonth = (q - 1) * 3 + 1
        const qEndMonth = q * 3
        const qStart = `${y}-${String(qStartMonth).padStart(2, '0')}-01`
        const qLastDay = new Date(y, qEndMonth, 0).getDate()
        const qEnd = `${y}-${String(qEndMonth).padStart(2, '0')}-${qLastDay}`
        return { start: qStart, end: qEnd }
      case 'year':
        return {
          start: `${y}-01-01`,
          end: `${y}-12-31`
        }
    }
  },

  // 处理时间范围变更
  handleRangeDateChange(e) {
    const { startDate, endDate } = e.detail
    const viewMode = this.data.viewMode

    this.setData({
      rangeStartDate: startDate,
      rangeEndDate: endDate,
      rangeStartText: this.getDisplayDate(startDate, viewMode),
      rangeEndText: this.getDisplayDate(endDate, viewMode)
    })

    this.loadBills()
  },

  // 加载账单
  async loadBills() {
    if (this.data.loading) return

    this.setData({ loading: true })

    const { currentDate, viewMode, isRange, rangeStartDate, rangeEndDate } = this.data

    let start, end
    if (isRange && viewMode !== 'quarter') {
      // 使用时间范围
      start = rangeStartDate
      end = rangeEndDate
    } else {
      // 使用单一日期（季度保持原逻辑）
      const range = this.getDateRange(currentDate, viewMode)
      start = range.start
      end = range.end
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'getBillsByDateRange',
          data: { startDate: start, endDate: end, page: 1, pageSize: 50 }
        }
      })

      if (res.result.success) {
        const bills = res.result.data.map(bill => ({
          ...bill,
          amount: parseFloat(bill.amount) || 0,
          amountStr: this.getBillAmountStr(bill),
          swiped: false
        }))

        let totalExpense = 0, totalIncome = 0
        bills.forEach(bill => {
          if (bill.type === 'expense') totalExpense += bill.amount
          else totalIncome += bill.amount
        })

        this.setData({
          bills,
          totalExpenseStr: this.formatAmount(totalExpense),
          totalIncomeStr: this.formatAmount(totalIncome),
          hasMore: bills.length >= 50,
          swipedIndex: -1
        })
      }
    } catch (error) {
      console.error('加载账单失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  formatAmount(amount) {
    return (parseFloat(amount) || 0).toFixed(2)
  },

  getBillAmountStr(bill) {
    const amount = parseFloat(bill.amount) || 0
    const prefix = bill.type === 'expense' ? '-' : '+'
    return `${prefix}¥${amount.toFixed(2)}`
  },

  // 滑动相关
  onTouchStart(e) {
    this.setData({ startX: e.touches[0].clientX })
  },

  onTouchMove(e) {
    const { startX, swipedIndex } = this.data
    const index = e.currentTarget.dataset.index
    const diffX = startX - e.touches[0].clientX

    if (swipedIndex !== -1 && swipedIndex !== index) {
      const bills = this.data.bills.map(b => ({ ...b, swiped: false }))
      this.setData({ bills, swipedIndex: -1 })
    }

    if (diffX > 50) {
      const bills = this.data.bills.map((b, i) => ({ ...b, swiped: i === index }))
      this.setData({ bills, swipedIndex: index })
    } else if (diffX < -30) {
      const bills = this.data.bills.map(b => ({ ...b, swiped: false }))
      this.setData({ bills, swipedIndex: -1 })
    }
  },

  onTouchEnd() {},

  // 删除
  confirmDelete(e) {
    const billId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      confirmColor: '#e57373',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            await wx.cloud.callFunction({
              name: 'billFunctions',
              data: { action: 'deleteBill', billId }
            })
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadBills()
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        } else {
          const bills = this.data.bills.map(b => ({ ...b, swiped: false }))
          this.setData({ bills, swipedIndex: -1 })
        }
      }
    })
  },

  // 快捷标签切换
  selectQuickTab(e) {
    const value = e.currentTarget.dataset.value
    const { currentDate } = this.data

    // 同步日期精度：根据新模式截取日期
    let newDate = currentDate
    const parts = currentDate.split('-')

    if (value === 'day') {
      if (parts.length < 3) {
        newDate = `${parts[0]}-${parts[1]}-01`
      }
    } else if (value === 'month') {
      newDate = `${parts[0]}-${parts[1]}`
    } else if (value === 'year') {
      newDate = parts[0]
    } else if (value === 'quarter') {
      if (parts.length < 3) {
        newDate = `${parts[0]}-${parts[1]}-01`
      }
    }

    // 更新时间范围
    let rangeStartDate = newDate
    let rangeEndDate = newDate

    if (value === 'day') {
      // 日模式：保持当前日期
      rangeStartDate = newDate
      rangeEndDate = newDate
    } else if (value === 'month') {
      // 月模式：设置为当月范围
      const [y, m] = newDate.split('-')
      rangeStartDate = `${y}-${m}-01`
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      rangeEndDate = `${y}-${m}-${lastDay}`
    } else if (value === 'year') {
      // 年模式：设置为当年范围
      const [y] = newDate.split('-')
      rangeStartDate = `${y}-01-01`
      rangeEndDate = `${y}-12-31`
    } else if (value === 'quarter') {
      // 季度模式：保持原逻辑
      rangeStartDate = newDate
      rangeEndDate = newDate
    }

    this.setData({
      viewMode: value,
      currentDate: newDate,
      dateDisplay: this.getDisplayDate(newDate, value),
      rangeStartDate: rangeStartDate,
      rangeEndDate: rangeEndDate,
      rangeStartText: this.getDisplayDate(rangeStartDate, value),
      rangeEndText: this.getDisplayDate(rangeEndDate, value)
    })

    this.loadBills()
  },

  // 季度弹窗
  showQuarterPicker() {
    const { currentDate } = this.data
    const [, m] = currentDate.split('-')
    this.setData({
      showQuarter: true,
      quarterIndex: Math.ceil(parseInt(m || '01') / 3) - 1
    })
  },

  hideQuarterPicker() {
    this.setData({ showQuarter: false })
  },

  selectQuarter(e) {
    const value = e.currentTarget.dataset.value
    const [y] = this.data.currentDate.split('-')
    const startMonth = value * 3 + 1
    const newDate = `${y}-${String(startMonth).padStart(2, '0')}-01`
    this.setData({
      showQuarter: false,
      quarterIndex: value,
      currentDate: newDate,
      dateDisplay: this.getDisplayDate(newDate, 'quarter')
    })
    this.loadBills()
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/add/add' })
  },

  onPullDownRefresh() {
    this.loadBills()
    wx.stopPullDownRefresh()
  }
})
