/**
 * 账户主页
 * 显示净资产、负债、总资产，以及账户列表和借款记账入口
 */
const app = getApp()

// 账户类型映射（英文 -> 中文）
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
    // 账户汇总数据
    summary: {
      netAsset: 0,
      totalAsset: 0,
      totalDebt: 0
    },
    // 是否隐藏金额
    hideAmount: false,
    // 资产类账户列表
    assetAccounts: [],
    // 负债类账户列表
    debtAccounts: [],
    // 借款汇总
    loanSummary: {
      lendReceivable: 0,
      borrowRepayable: 0
    },
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
        this.loadAccountSummary(),
        this.loadAccounts(),
        this.loadLoanSummary()
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
   * 加载账户汇总
   */
  async loadAccountSummary() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
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
      console.error('获取账户汇总失败：', err)
    }
  },

  /**
   * 加载账户列表
   */
  async loadAccounts() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'list'
        }
      })

      if (res.result.success) {
        const accounts = (res.result.data || []).map(item => ({
          ...item,
          // 将英文类型转换为中文类型
          type: ACCOUNT_TYPE_MAP[item.type] || item.type
        }))
        const assetAccounts = accounts.filter(item => !item.isDebt)
        const debtAccounts = accounts.filter(item => item.isDebt)

        this.setData({
          assetAccounts,
          debtAccounts
        })
      }
    } catch (err) {
      console.error('获取账户列表失败：', err)
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
          loanSummary: res.result.data
        })
      }
    } catch (err) {
      console.error('获取借款汇总失败：', err)
    }
  },

  /**
   * 切换金额显示/隐藏
   */
  toggleHideAmount() {
    this.setData({
      hideAmount: !this.data.hideAmount
    })
  },

  /**
   * 格式化金额显示
   */
  formatAmount(amount) {
    if (this.data.hideAmount) {
      return '******'
    }
    return this.formatNumber(amount)
  },

  /**
   * 格式化数字
   */
  formatNumber(num) {
    if (num === undefined || num === null) {
      return '0.00'
    }
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  },

  /**
   * 跳转到添加账户页面
   */
  goToAddAccount() {
    wx.navigateTo({
      url: '/pages/addAccount/addAccount'
    })
  },

  /**
   * 跳转到账户详情页面
   */
  goToAccountDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/accountInfo/accountInfo?id=${id}`
    })
  },

  /**
   * 跳转到借款记账页面
   */
  goToLoan() {
    wx.navigateTo({
      url: '/pages/loan/loan'
    })
  }
})
