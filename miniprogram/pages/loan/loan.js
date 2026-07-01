/**
 * 借款记账页面
 * 显示借出/借入记录列表，支持切换类型
 */
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 当前类型：lend（借出）/ borrow（借入）
    currentType: 'lend',
    // 汇总数据
    summary: {
      lendReceivable: 0,
      borrowRepayable: 0
    },
    // 借款记录列表
    loanList: [],
    // 加载状态
    loading: true
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadData()
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 加载所有数据
   */
  async loadData() {
    this.setData({ loading: true })

    try {
      await Promise.all([
        this.loadLoanSummary(),
        this.loadLoanList()
      ])
    } catch (err) {
      console.error('加载数据失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 加载借款汇总
   */
  async loadLoanSummary() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'loanFunctions',
        data: {
          action: 'getSummary'
        }
      })

      if (res.result.success) {
        this.setData({
          summary: res.result.data
        })
      }
    } catch (err) {
      console.error('获取借款汇总失败：', err)
    }
  },

  /**
   * 加载借款记录列表
   */
  async loadLoanList() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'loanFunctions',
        data: {
          action: 'list',
          data: {
            type: this.data.currentType
          }
        }
      })

      if (res.result.success) {
        // 格式化日期为年月日
        const loanList = (res.result.data || []).map(item => ({
          ...item,
          loanDate: this.formatDate(item.loanDate)
        }))
        this.setData({
          loanList,
          loading: false
        })
      }
    } catch (err) {
      console.error('获取借款记录失败：', err)
      this.setData({ loading: false })
    }
  },

  /**
   * 切换类型
   */
  switchType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.currentType) return

    // 显示loading状态，清空列表
    this.setData({
      currentType: type,
      loanList: [],
      loading: true
    })
    this.loadLoanList()
  },

  /**
   * 跳转到新建借款页面
   */
  goToAddLoan() {
    wx.navigateTo({
      url: `/pages/addLoan/addLoan?type=${this.data.currentType}`
    })
  },

  /**
   * 查看借款详情
   */
  goToLoanDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/addLoan/addLoan?id=${id}`
    })
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
