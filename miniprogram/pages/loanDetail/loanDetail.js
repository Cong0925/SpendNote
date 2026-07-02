/**
 * 借款详情页面
 * 显示操作记录列表，支持收款/还款
 */
const app = getApp()
const { formatAmount } = require('../../utils/formatAmount')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 借款ID
    loanId: '',
    // 借款信息
    loanInfo: null,
    // 操作记录列表
    paymentList: [],
    // 加载状态
    loading: true,
    // 页面标题
    pageTitle: '借款详情'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({ loanId: options.id })
      this.loadData()
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (this.data.loanId) {
      this.loadData()
    }
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
        this.loadLoanInfo(),
        this.loadPaymentList()
      ])

      // 更新页面标题
      this.updatePageTitle()
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
   * 加载借款信息
   */
  async loadLoanInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'loanFunctions',
        data: {
          action: 'get',
          data: { id: this.data.loanId }
        }
      })

      if (res.result.success) {
        const loan = res.result.data
        this.setData({
          loanInfo: {
            ...loan,
            amountStr: formatAmount(loan.amount),
            paidAmountStr: formatAmount(loan.paidAmount),
            remainingStr: formatAmount(loan.amount - loan.paidAmount),
            loanDateStr: this.formatDate(loan.loanDate),
            typeText: loan.type === 'lend' ? '借出' : '借入'
          }
        })
      }
    } catch (err) {
      console.error('获取借款信息失败：', err)
    }
  },

  /**
   * 加载操作记录列表
   */
  async loadPaymentList() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'loanPayments',
        data: {
          action: 'list',
          data: { loanId: this.data.loanId }
        }
      })

      if (res.result.success) {
        const paymentList = (res.result.data || []).map(item => ({
          ...item,
          amountStr: formatAmount(item.amount),
          dateStr: this.formatDate(item.date),
          typeText: this.getPaymentTypeText(item.type),
          // 初始记录不可删除，只有操作记录可以编辑/删除
          canEdit: item.type !== 'initial',
          canDelete: item.type !== 'initial'
        }))

        this.setData({ paymentList })
      }
    } catch (err) {
      console.error('获取操作记录失败：', err)
    }
  },

  /**
   * 更新页面标题
   */
  updatePageTitle() {
    if (this.data.loanInfo) {
      const typeText = this.data.loanInfo.type === 'lend' ? '借出' : '借入'
      this.setData({
        pageTitle: `${typeText}详情`
      })
    }
  },

  /**
   * 获取操作类型文本
   */
  getPaymentTypeText(type) {
    const typeMap = {
      initial: '借出',
      receive: '收款',
      repay: '还款'
    }
    return typeMap[type] || type
  },

  /**
   * 点击操作记录
   */
  goToPaymentDetail(e) {
    const { id, type } = e.currentTarget.dataset

    if (type === 'initial') {
      // 初始记录：跳转到编辑页面
      wx.navigateTo({
        url: `/pages/addLoan/addLoan?id=${this.data.loanId}`
      })
    } else {
      // 操作记录：跳转到记录详情页
      wx.navigateTo({
        url: `/pages/paymentDetail/paymentDetail?id=${id}&loanId=${this.data.loanId}`
      })
    }
  },

  /**
   * 收款/还款按钮
   */
  goToPayment() {
    if (!this.data.loanInfo) return

    const type = this.data.loanInfo.type === 'lend' ? 'receive' : 'repay'
    wx.navigateTo({
      url: `/pages/loanPayment/loanPayment?loanId=${this.data.loanId}&type=${type}`
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
