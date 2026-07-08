Component({
  properties: {
    title: { type: String, value: '我的账本' },
    date: { type: String, value: '' },
    dateText: { type: String, value: '' },
    viewMode: { type: String, value: 'month' },
    rangeStartDate: { type: String, value: '' },
    rangeEndDate: { type: String, value: '' },
    rangeStartText: { type: String, value: '' },
    rangeEndText: { type: String, value: '' }
  },
  data: {
    statusBarHeight: 20,
    showQuarter: false,
    quarterIndex: 0,
    quarters: [
      { label: '第一季度 Q1', value: 0 },
      { label: '第二季度 Q2', value: 1 },
      { label: '第三季度 Q3', value: 2 },
      { label: '第四季度 Q4', value: 3 }
    ],
    // 范围选择相关
    tempStartDate: '',
    tempEndDate: ''
  },
  lifetimes: {
    attached() {
      const sysInfo = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    }
  },
  observers: {
    'date, viewMode': function (date, viewMode) {
      if (!date) return
      const parts = date.split('-')
      const update = {}
      if (viewMode === 'quarter' && parts.length >= 2) {
        const month = parseInt(parts[1])
        update.quarterIndex = Math.ceil(month / 3) - 1
      }
      this.setData(update)
    },
    'rangeStartDate, rangeEndDate, viewMode': function (rangeStartDate, rangeEndDate, viewMode) {
      if (rangeStartDate && rangeEndDate) {
        // 根据 viewMode 格式化 picker value
        const formatForPicker = (dateStr, mode) => {
          const parts = dateStr.split('-')
          if (mode === 'year') return parts[0] // 只需要 YYYY
          if (mode === 'month') return `${parts[0]}-${parts[1]}` // 需要 YYYY-MM
          return dateStr // day 模式保持 YYYY-MM-DD
        }
        this.setData({
          tempStartDate: formatForPicker(rangeStartDate, viewMode),
          tempEndDate: formatForPicker(rangeEndDate, viewMode)
        })
      }
    }
  },
  methods: {
    // 范围选择 - 开始日期变更
    onStartDateChange(e) {
      const rawValue = e.detail.value
      const { tempEndDate, viewMode } = this.data

      // 将 picker 值转为完整日期格式 (YYYY-MM-DD)
      const value = this.normalizeDate(rawValue, viewMode, false)
      const endDate = this.normalizeDate(tempEndDate, viewMode, true)

      // 开始不能晚于结束
      if (endDate && value > endDate) {
        wx.showToast({ title: '开始不能晚于结束', icon: 'none' })
        return
      }

      this.setData({ tempStartDate: rawValue })
      this.triggerEvent('rangeDateChange', {
        startDate: value,
        endDate: endDate || value
      })
    },
    // 范围选择 - 结束日期变更
    onEndDateChange(e) {
      const rawValue = e.detail.value
      const { tempStartDate, viewMode } = this.data

      // 将 picker 值转为完整日期格式 (YYYY-MM-DD)
      const value = this.normalizeDate(rawValue, viewMode, true)
      const startDate = this.normalizeDate(tempStartDate, viewMode, false)

      // 结束不能早于开始
      if (startDate && value < startDate) {
        wx.showToast({ title: '结束不能早于开始', icon: 'none' })
        return
      }

      this.setData({ tempEndDate: rawValue })
      this.triggerEvent('rangeDateChange', {
        startDate: startDate || value,
        endDate: value
      })
    },
    // 将 picker 值标准化为 YYYY-MM-DD 格式
    // isEnd: true 表示结束日期（月末/年末），false 表示开始日期（月初/年初）
    normalizeDate(dateStr, mode, isEnd = false) {
      if (!dateStr) return ''
      const parts = dateStr.split('-')
      if (mode === 'year') {
        return isEnd ? `${parts[0]}-12-31` : `${parts[0]}-01-01`
      }
      if (mode === 'month') {
        const [y, m] = parts
        if (isEnd) {
          const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
          return `${y}-${m}-${lastDay}`
        }
        return `${y}-${m}-01`
      }
      return dateStr // day 模式已经是 YYYY-MM-DD
    },
    showQuarterPicker() { this.setData({ showQuarter: true }) },
    hideQuarterPicker() { this.setData({ showQuarter: false }) },
    selectQuarter(e) {
      const value = parseInt(e.currentTarget.dataset.value)
      const [y] = this.data.date.split('-')
      const startMonth = value * 3 + 1
      const endMonth = (value + 1) * 3

      // 计算季度的开始和结束日期
      const rangeStartDate = `${y}-${String(startMonth).padStart(2, '0')}-01`
      const lastDay = new Date(y, endMonth, 0).getDate()
      const rangeEndDate = `${y}-${String(endMonth).padStart(2, '0')}-${lastDay}`

      this.setData({ showQuarter: false, quarterIndex: value })
      this.triggerEvent('dateChange', { value: rangeStartDate })
      this.triggerEvent('rangeDateChange', {
        startDate: rangeStartDate,
        endDate: rangeEndDate
      })
    }
  }
})
