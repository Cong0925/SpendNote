// pages/detail/detail.js
const { formatAmount } = require('../../utils/formatAmount')

Page({
  data: {
    statusBarHeight: 20,
    billId: '',
    billDetail: null,
    loading: false
  },

  onLoad(options) {
    // 获取状态栏高度
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      billId: options.billId || ''
    })

    if (this.data.billId) {
      this.loadBillDetail()
    }
  },

  onShow() {
    // 从修改页面返回时刷新数据
    if (this.data.billId) {
      this.loadBillDetail()
    }
  },

  // 加载账单详情
  async loadBillDetail() {
    const { billId } = this.data
    if (!billId) return

    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'get',
          data: { id: billId }
        }
      })

      if (res.result.success) {
        const bill = res.result.data
        this.setData({
          billDetail: {
            ...bill,
            amount: parseFloat(bill.amount) || 0,
            amountStr: formatAmount(bill.amount)
          }
        })
      } else {
        wx.showToast({
          title: '账单不存在',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载账单详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 删除账单
  deleteBill() {
    const { billId } = this.data

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条账单吗？删除后无法恢复。',
      confirmColor: '#e57373',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            const res = await wx.cloud.callFunction({
              name: 'billFunctions',
              data: { action: 'delete', data: { id: billId } }
            })
            wx.hideLoading()

            if (res.result && res.result.success) {
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
                title: (res.result && res.result.error) || '删除失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 修改账单
  editBill() {
    const { billDetail } = this.data
    if (!billDetail) return

    // 跳转到记账页面，传递修改参数
    const params = [
      `billId=${billDetail._id}`,
      `type=${billDetail.type}`,
      `amount=${billDetail.amount}`,
      `category=${billDetail.category}`,
      `icon=${billDetail.icon}`,
      `note=${billDetail.note || ''}`,
      `date=${billDetail.date}`,
      `accountId=${billDetail.accountId || ''}`,
      `accountName=${billDetail.accountName || ''}`
    ].join('&')

    wx.navigateTo({
      url: `/pages/add/add?${params}`
    })
  }
})
