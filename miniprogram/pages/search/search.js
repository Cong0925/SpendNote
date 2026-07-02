// pages/search/search.js
const { formatAmount } = require('../../utils/formatAmount')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    searchKeyword: '',
    searchResult: [],
    searched: false,
    loading: false,
    // 汇总数据
    searchTotal: 0,
    searchIncomeStr: '0.00',
    searchExpenseStr: '0.00',
    searchBalanceStr: '0.00',
    searchBalance: 0,
    // 参数
    viewMode: 'month',
    startDate: '',
    endDate: '',
    // 所有账单（用于搜索）
    allBills: []
  },

  onLoad(options) {
    // 获取状态栏高度
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      viewMode: options.viewMode || 'month',
      startDate: options.startDate || '',
      endDate: options.endDate || ''
    })
    this.loadAllBills()
  },

  // 加载账单用于搜索（有日期范围则按范围加载，否则加载所有）
  async loadAllBills() {
    const { startDate, endDate } = this.data

    try {
      let res
      // 如果有日期范围，按日期范围加载；否则加载所有账单
      if (startDate && endDate) {
        res = await wx.cloud.callFunction({
          name: 'billFunctions',
          data: {
            action: 'getBillsByDateRange',
            data: { startDate, endDate, page: 1, pageSize: 500 }
          }
        })
      } else {
        res = await wx.cloud.callFunction({
          name: 'billFunctions',
          data: {
            action: 'getBills',
            data: { page: 1, pageSize: 500 }
          }
        })
      }

      if (res.result.success) {
        const allBills = res.result.data.map(bill => ({
          ...bill,
          amount: parseFloat(bill.amount) || 0,
          amountStr: this.getBillAmountStr(bill)
        }))
        this.setData({ allBills })
      }
    } catch (error) {
      console.error('【搜索页面】加载账单失败', error)
    }
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 输入搜索关键词
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  // 执行搜索
  doSearch() {
    const { searchKeyword, allBills, viewMode } = this.data

    if (!searchKeyword.trim()) {
      this.setData({
        searchResult: [],
        searched: false,
        searchTotal: 0,
        searchIncomeStr: '0.00',
        searchExpenseStr: '0.00',
        searchBalanceStr: '0.00',
        searchBalance: 0
      })
      return
    }

    this.setData({ loading: true })

    const keyword = searchKeyword.trim().toLowerCase()

    // 模糊搜索：金额、分类、备注
    const matchedBills = allBills.filter(bill => {
      const amountStr = bill.amount.toString()
      const category = (bill.category || '').toLowerCase()
      const note = (bill.note || '').toLowerCase()

      return amountStr.includes(keyword) ||
             category.includes(keyword) ||
             note.includes(keyword)
    })

    // 计算汇总
    let totalIncome = 0
    let totalExpense = 0
    matchedBills.forEach(bill => {
      if (bill.type === 'expense') {
        totalExpense += bill.amount
      } else {
        totalIncome += bill.amount
      }
    })

    const balance = totalIncome - totalExpense

    // 按日期分组
    const groupedBills = this.groupBillsByDate(matchedBills, viewMode)

    this.setData({
      searchResult: groupedBills,
      searched: true,
      loading: false,
      searchTotal: matchedBills.length,
      searchIncomeStr: formatAmount(totalIncome),
      searchExpenseStr: formatAmount(totalExpense),
      searchBalanceStr: formatAmount(Math.abs(balance)),
      searchBalance: balance
    })
  },

  // 按日期分组账单
  groupBillsByDate(bills, viewMode) {
    const groupMap = {}

    bills.forEach(bill => {
      let dateKey = bill.date
      let dateText = ''

      if (viewMode === 'day') {
        // 日模式：按具体日期分组
        dateKey = bill.date.substring(0, 10) // YYYY-MM-DD
        const [y, m, d] = dateKey.split('-')
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        dateText = `${parseInt(m)}月${parseInt(d)}日 ${weekDays[date.getDay()]}`
      } else if (viewMode === 'month') {
        // 月模式：按月份分组
        dateKey = bill.date.substring(0, 7) // YYYY-MM
        const [y, m] = dateKey.split('-')
        dateText = `${y}年${parseInt(m)}月`
      } else if (viewMode === 'quarter') {
        // 季度模式：按季度分组
        const [y, m] = bill.date.split('-')
        const quarter = Math.ceil(parseInt(m) / 3)
        dateKey = `${y}-Q${quarter}`
        dateText = `${y}年Q${quarter}`
      } else if (viewMode === 'year') {
        // 年模式：按年份分组
        dateKey = bill.date.substring(0, 4) // YYYY
        dateText = `${dateKey}年`
      }

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

    // 转换为数组并按日期倒序排列
    const groups = Object.values(groupMap).map(group => ({
      ...group,
      incomeStr: formatAmount(group.income),
      expenseStr: formatAmount(group.expense),
      balanceStr: formatAmount(Math.abs(group.income - group.expense))
    }))

    // 倒序排列（最新的在最上面）
    groups.sort((a, b) => b.date.localeCompare(a.date))

    return groups
  },

  // 获取账单金额显示
  getBillAmountStr(bill) {
    const amount = parseFloat(bill.amount) || 0
    const prefix = bill.type === 'expense' ? '-' : '+'
    return `${prefix}¥${formatAmount(amount)}`
  },

  // 跳转到详情页
  goToDetail(e) {
    const billId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?billId=${billId}`
    })
  }
})
