/**
 * 账户详情页面 - 完全重构
 * 功能：显示账户信息、收支统计、账单记录、操作按钮
 * 设计：参考统计页面和账单详情页面的风格
 */
const app = getApp()
const { formatAmount } = require('../../utils/formatAmount')

// 账户类型映射
const ACCOUNT_TYPE_MAP = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  qq: 'QQ钱包',
  savings: '储蓄卡',
  credit: '信用卡',
  huabei: '花呗',
  jd: '京东白条',
  mt: '美团月付',
  other: '其他'
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 账户信息
    account: {},
    // 统计数据
    stats: {
      income: 0,
      expense: 0
    },
    // 账单列表
    billList: [],
    // 加载状态
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options
    if (id) {
      this.loadAccountData(id)
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 如果已有账户ID，刷新数据
    if (this.data.account._id) {
      this.loadAccountData(this.data.account._id)
    }
  },

  /**
   * 加载账户数据
   */
  async loadAccountData(id) {
    this.setData({ loading: true })

    try {
      // 加载账户信息
      await this.loadAccountInfo(id)
      // 加载账单数据
      await this.loadBills(id)
    } catch (err) {
      console.error('加载账户数据失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 加载账户信息
   */
  async loadAccountInfo(id) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'get',
          data: { id }
        }
      })

      if (res.result.success) {
        const account = res.result.data
        // 转换账户类型为中文
        account.typeText = ACCOUNT_TYPE_MAP[account.type] || account.type
        // 格式化余额
        account.balanceStr = formatAmount(account.balance)
        // 格式化信用额度
        if (account.creditLimit) {
          account.creditLimitStr = formatAmount(account.creditLimit)
        }
        this.setData({ account })
      }
    } catch (err) {
      console.error('获取账户信息失败：', err)
    }
  },

  /**
   * 加载账单数据
   */
  async loadBills(accountId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'listByAccount',
          data: { accountId }
        }
      })

      if (res.result.success) {
        const billList = res.result.data || []
        // 计算入账和出账
        let income = 0
        let expense = 0
        billList.forEach(bill => {
          if (bill.type === 'income') {
            income += bill.amount
          } else {
            expense += bill.amount
          }
        })

        // 格式化账单金额
        const formattedBillList = billList.map(bill => ({
          ...bill,
          amountStr: formatAmount(bill.amount)
        }))

        this.setData({
          billList: formattedBillList,
          stats: {
            income,
            expense,
            incomeStr: formatAmount(income),
            expenseStr: formatAmount(expense)
          }
        })
      }
    } catch (err) {
      console.error('获取账单数据失败：', err)
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 跳转到账户编辑页面
   */
  goToAccountDetail() {
    const { account } = this.data
    wx.navigateTo({
      url: `/pages/accountDetail/accountDetail?id=${account._id}`
    })
  },

  /**
   * 跳转到账单详情
   */
  goToBillDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?billId=${id}`
    })
  },

  /**
   * 跳转到记一笔页面
   */
  goToAddBill() {
    const { account } = this.data
    wx.navigateTo({
      url: `/pages/add/add?accountId=${account._id}`
    })
  },

  /**
   * 跳转到转账页面
   */
  goToTransfer() {
    const { account } = this.data
    wx.navigateTo({
      url: `/pages/transfer/transfer?accountId=${account._id}`
    })
  },

  /**
   * 删除账户
   */
  async deleteAccount() {
    const { account } = this.data

    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: `确定要删除账户"${account.name}"吗？此操作不可恢复。`,
        success: (res) => {
          resolve(res.confirm)
        }
      })
    })

    if (!confirmed) return

    wx.showLoading({ title: '删除中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'delete',
          data: { id: account._id }
        }
      })

      if (res.result.success) {
        wx.hideLoading()
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('删除账户失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  }
})
