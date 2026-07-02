// pages/stats/stats.js
const { formatAmount } = require('../../utils/formatAmount')

const CHART_COLORS = [
  '#2563EB', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#E11D48', '#7C3AED', '#0EA5E9', '#D946EF', '#84CC16'
]

Page({
  data: {
    viewMode: 'month',
    viewModes: [
      { label: '日', value: 'day' },
      { label: '月', value: 'month' },
      { label: '季', value: 'quarter' },
      { label: '年', value: 'year' }
    ],
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
    totalExpenseStr: '0.00',
    totalIncomeStr: '0.00',
    balanceStr: '0.00',
    balance: 0,
    categoryStats: [],
    displayStats: [],
    donutGradient: '',
    loading: false,
    activeTab: 'expense',
    // 时间范围选择
    isRange: true, // 启用时间范围选择
    rangeStartDate: '',
    rangeEndDate: '',
    rangeStartText: '',
    rangeEndText: ''
  },

  onLoad() {
    this.initDate()
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

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

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  getDisplayDate(dateStr, mode) {
    const parts = dateStr.split('-')
    const y = parts[0]
    const m = parts[1] || '01'
    switch (mode) {
      case 'day': return dateStr
      case 'month': return `${y}-${m}`
      case 'quarter': return `${y} Q${Math.ceil(parseInt(m) / 3)}`
      case 'year': return `${y}`
    }
  },

  getDateRange(dateStr, mode) {
    const parts = dateStr.split('-')
    const y = parseInt(parts[0])
    const m = parseInt(parts[1]) || 1
    switch (mode) {
      case 'day':
        return { start: dateStr, end: dateStr }
      case 'month':
        return {
          start: `${y}-${String(m).padStart(2, '0')}-01`,
          end: `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`
        }
      case 'quarter':
        const q = Math.ceil(m / 3)
        const qStart = (q - 1) * 3 + 1
        const qEnd = q * 3
        return {
          start: `${y}-${String(qStart).padStart(2, '0')}-01`,
          end: `${y}-${String(qEnd).padStart(2, '0')}-${new Date(y, qEnd, 0).getDate()}`
        }
      case 'year':
        return { start: `${y}-01-01`, end: `${y}-12-31` }
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

    this.loadStats()
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
        newDate = `${parts[0]}-${parts[1] || '01'}-01`
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

    this.loadStats()
  },

  async loadStats() {
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
        data: { action: 'getStatsByDateRange', data: { startDate: start, endDate: end } }
      })

      if (res.result.success) {
        const stats = res.result.data
        const totalExpense = parseFloat(stats.totalExpense) || 0
        const totalIncome = parseFloat(stats.totalIncome) || 0
        const balance = parseFloat(stats.balance) || 0

        const total = this.data.activeTab === 'expense' ? totalExpense : totalIncome

        const displayStats = stats.categoryStats
          .filter(item => item.type === this.data.activeTab)
          .map((item, index) => {
            const amount = parseFloat(item.amount) || 0
            const percent = total > 0 ? (amount / total) * 100 : 0
            return {
              ...item,
              amount,
              amountStr: formatAmount(amount),
              percent: percent.toFixed(1),
              percentStr: percent.toFixed(1),
              color: CHART_COLORS[index % CHART_COLORS.length]
            }
          })
          .sort((a, b) => b.amount - a.amount)

        let donutGradient = ''
        if (total > 0 && displayStats.length > 0) {
          let accumulated = 0
          const segments = displayStats.map((item) => {
            const start = accumulated
            const end = accumulated + (item.amount / total) * 360
            accumulated = end
            return `${item.color} ${start}deg ${end}deg`
          })
          if (accumulated < 360) {
            segments.push(`#F0F2F5 ${accumulated}deg 360deg`)
          }
          donutGradient = segments.join(', ')
        } else {
          donutGradient = '#F0F2F5 0deg 360deg'
        }

        this.setData({
          totalExpenseStr: formatAmount(totalExpense),
          totalIncomeStr: formatAmount(totalIncome),
          balanceStr: formatAmount(balance),
          balance,
          categoryStats: stats.categoryStats,
          displayStats,
          donutGradient
        })
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    } finally {
      this.setData({ loading: false })
    }
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
    this.loadStats()
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.loadStats()
  }
})
