// pages/index/index.js
Page({
  data: {
    bills: [],
    groupedBills: [],
    collapsed: {}, // 折叠状态：{ '2026': false, '2026-05': false, ... }
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
    savedDate: '', // 保存完整日期，用于视图切换时恢复
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
    balanceStr: '0.00',
    balance: 0,
    totalBills: 0,
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
      savedDate: date,
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

    // 根据 viewMode 计算 dateDisplay（左上角显示文本）
    let dateDisplay = ''
    if (viewMode === 'quarter') {
      const [y, m] = startDate.split('-')
      const quarter = Math.ceil(parseInt(m) / 3)
      dateDisplay = `${y} Q${quarter}`
    } else {
      dateDisplay = this.getDisplayDate(startDate, viewMode)
    }

    this.setData({
      dateDisplay: dateDisplay,
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
    if (isRange) {
      // 使用时间范围
      start = rangeStartDate
      end = rangeEndDate
    } else {
      // 使用单一日期
      const range = this.getDateRange(currentDate, viewMode)
      start = range.start
      end = range.end
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'getBillsByDateRange',
          data: { startDate: start, endDate: end, page: 1, pageSize: 200 }
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

        const balance = totalIncome - totalExpense
        const groupedBills = this.groupBillsByDate(bills, viewMode)

        this.setData({
          bills,
          groupedBills,
          totalExpenseStr: this.formatAmount(totalExpense),
          totalIncomeStr: this.formatAmount(totalIncome),
          balanceStr: this.formatAmount(Math.abs(balance)),
          balance,
          totalBills: bills.length,
          hasMore: bills.length >= 200,
          swipedIndex: -1
        })
      }
    } catch (error) {
      console.error('加载账单失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 按日期分组账单（支持多级嵌套）
  groupBillsByDate(bills, viewMode) {
    let groups = []
    if (viewMode === 'day') {
      // 日模式：单级分组
      groups = this.groupBillsByDay(bills)
    } else if (viewMode === 'month') {
      // 月模式：两级分组（月份 -> 日期）
      groups = this.groupBillsByMonth(bills)
    } else if (viewMode === 'quarter') {
      // 季度模式：三级分组（季度 -> 月份 -> 日期）
      groups = this.groupBillsByQuarter(bills)
    } else if (viewMode === 'year') {
      // 年模式：三级分组（年份 -> 月份 -> 日期）
      groups = this.groupBillsByYear(bills)
    }

    // 初始化折叠状态（默认全部展开）
    const collapsed = this.initCollapseState(groups, viewMode)
    this.setData({ collapsed })

    return groups
  },

  // 初始化折叠状态
  initCollapseState(groups, viewMode) {
    const collapsed = {}

    const traverse = (items, level = 1) => {
      items.forEach(item => {
        // 日模式不需要折叠
        if (viewMode === 'day') return

        collapsed[item.date] = false // 默认展开

        if (item.children && level < this.getMaxLevel(viewMode)) {
          traverse(item.children, level + 1)
        }
      })
    }

    traverse(groups)
    return collapsed
  },

  // 获取最大层级
  getMaxLevel(viewMode) {
    const levelMap = {
      'day': 1,
      'month': 2,
      'quarter': 3,
      'year': 3
    }
    return levelMap[viewMode] || 1
  },

  // 切换折叠状态
  toggleCollapse(e) {
    const key = e.currentTarget.dataset.key
    const { collapsed } = this.data

    this.setData({
      [`collapsed.${key}`]: !collapsed[key]
    })
  },

  // 日模式：按日期分组
  groupBillsByDay(bills) {
    const groupMap = {}

    bills.forEach(bill => {
      const dateKey = bill.date.substring(0, 10) // YYYY-MM-DD
      const [y, m, d] = dateKey.split('-')
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const dateText = `${parseInt(m)}月${parseInt(d)}日 ${weekDays[date.getDay()]}`

      if (!groupMap[dateKey]) {
        groupMap[dateKey] = {
          date: dateKey,
          dateText,
          bills: [],
          income: 0,
          expense: 0
        }
      }

      groupMap[dateKey].bills.push(bill)
      if (bill.type === 'expense') {
        groupMap[dateKey].expense += bill.amount
      } else {
        groupMap[dateKey].income += bill.amount
      }
    })

    const groups = Object.values(groupMap).map(group => ({
      ...group,
      incomeStr: this.formatAmount(group.income),
      expenseStr: this.formatAmount(group.expense),
      balanceStr: this.formatAmount(Math.abs(group.income - group.expense))
    }))

    groups.sort((a, b) => b.date.localeCompare(a.date))
    return groups
  },

  // 月模式：按月份分组，内部按日期二级分组
  groupBillsByMonth(bills) {
    const monthMap = {}

    bills.forEach(bill => {
      const monthKey = bill.date.substring(0, 7) // YYYY-MM
      const dateKey = bill.date.substring(0, 10) // YYYY-MM-DD
      const [y, m, d] = dateKey.split('-')
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const dayText = `${parseInt(m)}月${parseInt(d)}日 ${weekDays[date.getDay()]}`

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          date: monthKey,
          dateText: `${y}年${parseInt(m)}月`,
          children: {},
          income: 0,
          expense: 0
        }
      }

      if (!monthMap[monthKey].children[dateKey]) {
        monthMap[monthKey].children[dateKey] = {
          date: dateKey,
          dateText: dayText,
          bills: [],
          income: 0,
          expense: 0
        }
      }

      monthMap[monthKey].children[dateKey].bills.push(bill)
      monthMap[monthKey].children[dateKey].income += bill.type === 'income' ? bill.amount : 0
      monthMap[monthKey].children[dateKey].expense += bill.type === 'expense' ? bill.amount : 0
      monthMap[monthKey].income += bill.type === 'income' ? bill.amount : 0
      monthMap[monthKey].expense += bill.type === 'expense' ? bill.amount : 0
    })

    const groups = Object.values(monthMap).map(month => ({
      ...month,
      incomeStr: this.formatAmount(month.income),
      expenseStr: this.formatAmount(month.expense),
      balanceStr: this.formatAmount(Math.abs(month.income - month.expense)),
      children: Object.values(month.children).map(day => ({
        ...day,
        incomeStr: this.formatAmount(day.income),
        expenseStr: this.formatAmount(day.expense),
        balanceStr: this.formatAmount(Math.abs(day.income - day.expense))
      })).sort((a, b) => b.date.localeCompare(a.date))
    }))

    groups.sort((a, b) => b.date.localeCompare(a.date))
    return groups
  },

  // 季度模式：按季度分组，内部按月份二级分组，再按日期三级分组
  groupBillsByQuarter(bills) {
    const quarterMap = {}

    bills.forEach(bill => {
      const [y, m] = bill.date.split('-')
      const monthNum = parseInt(m)
      const quarterNum = Math.ceil(monthNum / 3)
      const quarterKey = `${y}-Q${quarterNum}`
      const monthKey = bill.date.substring(0, 7) // YYYY-MM
      const dateKey = bill.date.substring(0, 10) // YYYY-MM-DD
      const [d] = bill.date.split('-').slice(2)
      const date = new Date(parseInt(y), monthNum - 1, parseInt(d))
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const dayText = `${monthNum}月${parseInt(d)}日 ${weekDays[date.getDay()]}`

      if (!quarterMap[quarterKey]) {
        quarterMap[quarterKey] = {
          date: quarterKey,
          dateText: `${y}年Q${quarterNum}`,
          children: {},
          income: 0,
          expense: 0
        }
      }

      if (!quarterMap[quarterKey].children[monthKey]) {
        quarterMap[quarterKey].children[monthKey] = {
          date: monthKey,
          dateText: `${parseInt(m)}月`,
          children: {},
          income: 0,
          expense: 0
        }
      }

      if (!quarterMap[quarterKey].children[monthKey].children[dateKey]) {
        quarterMap[quarterKey].children[monthKey].children[dateKey] = {
          date: dateKey,
          dateText: dayText,
          bills: [],
          income: 0,
          expense: 0
        }
      }

      quarterMap[quarterKey].children[monthKey].children[dateKey].bills.push(bill)
      quarterMap[quarterKey].children[monthKey].children[dateKey].income += bill.type === 'income' ? bill.amount : 0
      quarterMap[quarterKey].children[monthKey].children[dateKey].expense += bill.type === 'expense' ? bill.amount : 0
      quarterMap[quarterKey].children[monthKey].income += bill.type === 'income' ? bill.amount : 0
      quarterMap[quarterKey].children[monthKey].expense += bill.type === 'expense' ? bill.amount : 0
      quarterMap[quarterKey].income += bill.type === 'income' ? bill.amount : 0
      quarterMap[quarterKey].expense += bill.type === 'expense' ? bill.amount : 0
    })

    const formatChildren = (children) => {
      return Object.values(children).map(child => ({
        ...child,
        incomeStr: this.formatAmount(child.income),
        expenseStr: this.formatAmount(child.expense),
        balanceStr: this.formatAmount(Math.abs(child.income - child.expense)),
        children: child.children ? formatChildren(child.children) : undefined
      })).sort((a, b) => b.date.localeCompare(a.date))
    }

    const groups = Object.values(quarterMap).map(quarter => ({
      ...quarter,
      incomeStr: this.formatAmount(quarter.income),
      expenseStr: this.formatAmount(quarter.expense),
      balanceStr: this.formatAmount(Math.abs(quarter.income - quarter.expense)),
      children: formatChildren(quarter.children)
    }))

    groups.sort((a, b) => b.date.localeCompare(a.date))
    return groups
  },

  // 年模式：按年份分组，内部按月份二级分组，再按日期三级分组
  groupBillsByYear(bills) {
    const yearMap = {}

    bills.forEach(bill => {
      const [y, m, d] = bill.date.split('-')
      const yearKey = y
      const monthKey = bill.date.substring(0, 7) // YYYY-MM
      const dateKey = bill.date.substring(0, 10) // YYYY-MM-DD
      const monthNum = parseInt(m)
      const date = new Date(parseInt(y), monthNum - 1, parseInt(d))
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const dayText = `${monthNum}月${parseInt(d)}日 ${weekDays[date.getDay()]}`

      if (!yearMap[yearKey]) {
        yearMap[yearKey] = {
          date: yearKey,
          dateText: `${y}年`,
          children: {},
          income: 0,
          expense: 0
        }
      }

      if (!yearMap[yearKey].children[monthKey]) {
        yearMap[yearKey].children[monthKey] = {
          date: monthKey,
          dateText: `${monthNum}月`,
          children: {},
          income: 0,
          expense: 0
        }
      }

      if (!yearMap[yearKey].children[monthKey].children[dateKey]) {
        yearMap[yearKey].children[monthKey].children[dateKey] = {
          date: dateKey,
          dateText: dayText,
          bills: [],
          income: 0,
          expense: 0
        }
      }

      yearMap[yearKey].children[monthKey].children[dateKey].bills.push(bill)
      yearMap[yearKey].children[monthKey].children[dateKey].income += bill.type === 'income' ? bill.amount : 0
      yearMap[yearKey].children[monthKey].children[dateKey].expense += bill.type === 'expense' ? bill.amount : 0
      yearMap[yearKey].children[monthKey].income += bill.type === 'income' ? bill.amount : 0
      yearMap[yearKey].children[monthKey].expense += bill.type === 'expense' ? bill.amount : 0
      yearMap[yearKey].income += bill.type === 'income' ? bill.amount : 0
      yearMap[yearKey].expense += bill.type === 'expense' ? bill.amount : 0
    })

    const formatChildren = (children) => {
      return Object.values(children).map(child => ({
        ...child,
        incomeStr: this.formatAmount(child.income),
        expenseStr: this.formatAmount(child.expense),
        balanceStr: this.formatAmount(Math.abs(child.income - child.expense)),
        children: child.children ? formatChildren(child.children) : undefined
      })).sort((a, b) => b.date.localeCompare(a.date))
    }

    const groups = Object.values(yearMap).map(year => ({
      ...year,
      incomeStr: this.formatAmount(year.income),
      expenseStr: this.formatAmount(year.expense),
      balanceStr: this.formatAmount(Math.abs(year.income - year.expense)),
      children: formatChildren(year.children)
    }))

    groups.sort((a, b) => b.date.localeCompare(a.date))
    return groups
  },

  // 跳转到搜索页
  goToSearch() {
    const { viewMode, rangeStartDate, rangeEndDate } = this.data
    wx.navigateTo({
      url: `/pages/search/search?viewMode=${viewMode}&startDate=${rangeStartDate}&endDate=${rangeEndDate}`
    })
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
    const { startX, swipedIndex, groupedBills } = this.data
    const date = e.currentTarget.dataset.date
    const index = e.currentTarget.dataset.index
    const diffX = startX - e.touches[0].clientX

    // 关闭之前打开的
    if (swipedIndex !== -1 && swipedIndex !== `${date}-${index}`) {
      const newGroupedBills = groupedBills.map(group => ({
        ...group,
        bills: group.bills.map(b => ({ ...b, swiped: false }))
      }))
      this.setData({ groupedBills: newGroupedBills, swipedIndex: -1 })
    }

    if (diffX > 50) {
      const newGroupedBills = groupedBills.map(group => ({
        ...group,
        bills: group.bills.map((b, i) => ({
          ...b,
          swiped: group.date === date && i === index
        }))
      }))
      this.setData({ groupedBills: newGroupedBills, swipedIndex: `${date}-${index}` })
    } else if (diffX < -30) {
      const newGroupedBills = groupedBills.map(group => ({
        ...group,
        bills: group.bills.map(b => ({ ...b, swiped: false }))
      }))
      this.setData({ groupedBills: newGroupedBills, swipedIndex: -1 })
    }
  },

  onTouchEnd() {},

  // 修改账单
  editBill(e) {
    const billId = e.currentTarget.dataset.id
    const { bills } = this.data
    const bill = bills.find(b => b._id === billId)

    if (bill) {
      // 跳转到记账页面进行修改，传递账单信息
      wx.navigateTo({
        url: `/pages/add/add?billId=${billId}&type=${bill.type}&amount=${bill.amount}&category=${bill.category}&icon=${bill.icon}&note=${bill.note || ''}&date=${bill.date}`
      })
    }

    // 关闭滑动状态
    const { groupedBills } = this.data
    const newGroupedBills = groupedBills.map(group => ({
      ...group,
      bills: group.bills.map(b => ({ ...b, swiped: false }))
    }))
    this.setData({ groupedBills: newGroupedBills, swipedIndex: -1 })
  },

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
          const { groupedBills } = this.data
          const newGroupedBills = groupedBills.map(group => ({
            ...group,
            bills: group.bills.map(b => ({ ...b, swiped: false }))
          }))
          this.setData({ groupedBills: newGroupedBills, swipedIndex: -1 })
        }
      }
    })
  },

  // 快捷标签切换
  selectQuickTab(e) {
    const value = e.currentTarget.dataset.value
    const { currentDate, savedDate } = this.data

    // 同步日期精度：根据新模式截取日期
    let newDate = currentDate
    const parts = currentDate.split('-')

    // 保存当前完整日期，用于后续切换恢复
    let newSavedDate = savedDate
    if (currentDate.length >= 7) {
      // 保存完整的 YYYY-MM-DD 格式日期
      newSavedDate = currentDate.length === 10 ? currentDate : `${currentDate}-01`
    }

    // 确保 savedDate 是完整的 YYYY-MM-DD 格式（如果为空则使用当前日期）
    if (!newSavedDate || newSavedDate.split('-').length < 3) {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      newSavedDate = newSavedDate ? `${newSavedDate}-${m}-${d}` : `${y}-${m}-${d}`
    }

    if (value === 'day') {
      if (parts.length < 3) {
        // 从月/年切换到日，使用 savedDate 中的日期
        const savedParts = newSavedDate.split('-')
        newDate = `${parts[0]}-${parts[1]}-${savedParts[2] || '01'}`
      }
    } else if (value === 'month') {
      if (parts.length < 3) {
        // 从年切换到月，使用 savedDate 中的月份
        const savedParts = newSavedDate.split('-')
        newDate = `${parts[0]}-${savedParts[1] || '01'}`
      } else {
        newDate = `${parts[0]}-${parts[1]}`
      }
    } else if (value === 'year') {
      newDate = parts[0]
    } else if (value === 'quarter') {
      if (parts.length < 3) {
        const savedParts = newSavedDate.split('-')
        newDate = `${parts[0]}-${savedParts[1] || '01'}-01`
      } else {
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
      // 季度模式：根据当前日期计算季度范围
      const [y, m] = newDate.split('-')
      const currentQuarter = Math.ceil(parseInt(m) / 3) - 1
      const startMonth = currentQuarter * 3 + 1
      const endMonth = (currentQuarter + 1) * 3
      rangeStartDate = `${y}-${String(startMonth).padStart(2, '0')}-01`
      const lastDay = new Date(y, endMonth, 0).getDate()
      rangeEndDate = `${y}-${String(endMonth).padStart(2, '0')}-${lastDay}`
    }

    this.setData({
      viewMode: value,
      currentDate: newDate,
      savedDate: newSavedDate,
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
    const value = parseInt(e.currentTarget.dataset.value)
    const [y] = this.data.currentDate.split('-')
    const startMonth = value * 3 + 1
    const endMonth = (value + 1) * 3
    const newDate = `${y}-${String(startMonth).padStart(2, '0')}-01`

    // 计算季度的开始和结束日期
    const rangeStartDate = `${y}-${String(startMonth).padStart(2, '0')}-01`
    const lastDay = new Date(y, endMonth, 0).getDate()
    const rangeEndDate = `${y}-${String(endMonth).padStart(2, '0')}-${lastDay}`

    // 计算季度显示文本
    const quarter = value + 1
    const quarterText = `${y} Q${quarter}`

    this.setData({
      showQuarter: false,
      quarterIndex: value,
      currentDate: newDate,
      dateDisplay: quarterText,
      rangeStartDate: rangeStartDate,
      rangeEndDate: rangeEndDate,
      rangeStartText: this.getDisplayDate(rangeStartDate, 'quarter'),
      rangeEndText: this.getDisplayDate(rangeEndDate, 'quarter')
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
