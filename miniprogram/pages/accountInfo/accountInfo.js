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
    // 转账记录列表
    transferList: [],
    // 当前显示的tab：bills（账单）/ transfers（转账）
    currentTab: 'bills',
    // 加载状态
    loading: true,
    // 加载转账记录状态
    loadingTransfers: false
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
      // 加载转账记录
      await this.loadTransfers(id)
      // 统计入账和出账（包含账单和转账）
      this.calculateStats(id)
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
        // 格式化账单金额
        const formattedBillList = billList.map(bill => ({
          ...bill,
          amountStr: formatAmount(bill.amount)
        }))

        this.setData({ billList: formattedBillList })
      }
    } catch (err) {
      console.error('获取账单数据失败：', err)
    }
  },

  /**
   * 加载转账记录
   */
  async loadTransfers(accountId) {
    this.setData({ loadingTransfers: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'transferFunctions',
        data: {
          action: 'list',
          data: { accountId }
        }
      })

      if (res.result.success) {
        const transferList = res.result.data || []

        // 获取所有相关账户的名称
        const accountIds = new Set()
        transferList.forEach(transfer => {
          accountIds.add(transfer.fromAccountId)
          accountIds.add(transfer.toAccountId)
        })

        // 批量获取账户名称
        const accountNames = await this.fetchAccountNames(Array.from(accountIds))

        // 格式化转账记录
        const formattedTransferList = transferList.map(transfer => ({
          ...transfer,
          amountStr: formatAmount(transfer.amount),
          fromAccountName: accountNames[transfer.fromAccountId] || '未知账户',
          toAccountName: accountNames[transfer.toAccountId] || '未知账户',
          // 判断当前账户是转出还是转入
          isOut: transfer.fromAccountId === accountId
        }))

        this.setData({ transferList: formattedTransferList })
      }
    } catch (err) {
      console.error('获取转账记录失败：', err)
    } finally {
      this.setData({ loadingTransfers: false })
    }
  },

  /**
   * 批量获取账户名称
   */
  async fetchAccountNames(accountIds) {
    const accountNames = {}

    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'list'
        }
      })

      if (res.result.success) {
        const accountList = res.result.data || []
        accountList.forEach(account => {
          if (accountIds.includes(account._id)) {
            accountNames[account._id] = account.name
          }
        })
      }
    } catch (err) {
      console.error('获取账户名称失败：', err)
    }

    return accountNames
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
  },

  /**
   * 切换tab
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  /**
   * 跳转到转账记录修改页面
   */
  goToTransferDetail(e) {
    const { id } = e.currentTarget.dataset
    const { account } = this.data
    wx.navigateTo({
      url: `/pages/transfer/transfer?accountId=${account._id}&transferId=${id}`
    })
  },

  /**
   * 统计入账和出账（包含账单和转账）
   */
  calculateStats(accountId) {
    let income = 0
    let expense = 0

    // 统计账单数据
    const { billList } = this.data
    billList.forEach(bill => {
      if (bill.type === 'income') {
        income += bill.amount
      } else {
        expense += bill.amount
      }
    })

    // 统计转账记录
    const { transferList } = this.data
    transferList.forEach(transfer => {
      if (transfer.isOut) {
        // 转出：出账增加
        expense += transfer.amount
      } else {
        // 转入：入账增加
        income += transfer.amount
      }
    })

    this.setData({
      stats: {
        income,
        expense,
        incomeStr: formatAmount(income),
        expenseStr: formatAmount(expense)
      }
    })
  }
})
