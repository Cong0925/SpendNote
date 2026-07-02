/**
 * 记录详情页面
 * 显示操作记录详情，支持编辑/删除
 */
const app = getApp()
const { formatAmount } = require('../../utils/formatAmount')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 记录ID
    paymentId: '',
    // 借款ID
    loanId: '',
    // 记录信息
    paymentInfo: null,
    // 加载状态
    loading: true,
    // 是否编辑模式
    isEditing: false,
    // 编辑表单数据
    editForm: {
      amount: '',
      date: '',
      remark: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id && options.loanId) {
      this.setData({
        paymentId: options.id,
        loanId: options.loanId
      })
      this.loadData()
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true })

    try {
      await this.loadPaymentInfo()
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
   * 加载记录信息
   */
  async loadPaymentInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'loanPayments',
        data: {
          action: 'get',
          data: { id: this.data.paymentId }
        }
      })

      if (res.result.success) {
        const payment = res.result.data
        this.setData({
          paymentInfo: {
            ...payment,
            amountStr: formatAmount(payment.amount),
            dateStr: this.formatDate(payment.date),
            typeText: this.getPaymentTypeText(payment.type)
          },
          editForm: {
            amount: payment.amount.toString(),
            date: this.formatDate(payment.date),
            remark: payment.remark || ''
          }
        })
      }
    } catch (err) {
      console.error('获取记录信息失败：', err)
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
   * 进入编辑模式
   */
  startEdit() {
    this.setData({ isEditing: true })
  },

  /**
   * 取消编辑
   */
  cancelEdit() {
    this.setData({
      isEditing: false,
      editForm: {
        amount: this.data.paymentInfo.amount.toString(),
        date: this.data.paymentInfo.dateStr,
        remark: this.data.paymentInfo.remark || ''
      }
    })
  },

  /**
   * 保存编辑
   */
  async saveEdit() {
    const { amount, date, remark } = this.data.editForm

    // 参数校验
    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    // 精度处理，避免浮点数精度问题
    const roundedAmount = Math.round(amountNum * 100) / 100

    if (!date) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      const res = await wx.cloud.callFunction({
        name: 'loanPayments',
        data: {
          action: 'update',
          data: {
            id: this.data.paymentId,
            amount: roundedAmount,
            date: date,
            remark: remark
          }
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        // 退出编辑模式，刷新数据
        this.setData({ isEditing: false })
        await this.loadData()
      } else {
        wx.showToast({
          title: res.result.error || '保存失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败：', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  /**
   * 删除记录
   */
  async deletePayment() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？删除后金额会自动调整。',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            const result = await wx.cloud.callFunction({
              name: 'loanPayments',
              data: {
                action: 'delete',
                data: {
                  id: this.data.paymentId,
                  loanId: this.data.loanId
                }
              }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })

              // 返回上一页
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            } else {
              wx.showToast({
                title: result.result.error || '删除失败',
                icon: 'none'
              })
            }
          } catch (err) {
            wx.hideLoading()
            console.error('删除失败：', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  /**
   * 表单输入处理
   */
  onAmountInput(e) {
    this.setData({
      'editForm.amount': e.detail.value
    })
  },

  onDateChange(e) {
    this.setData({
      'editForm.date': e.detail.value
    })
  },

  onRemarkInput(e) {
    this.setData({
      'editForm.remark': e.detail.value
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
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.paymentInfo.images || []
    })
  }
})
