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
    // 骨架屏状态
    showSkeleton: true,
    // 加载转账记录状态
    loadingTransfers: false,
    // 账单分页相关
    billPage: 1,
    billPageSize: 10,
    hasMoreBills: true,
    loadingMoreBills: false,
    // 转账记录分页相关
    transferPage: 1,
    transferPageSize: 10,
    hasMoreTransfers: true,
    loadingMoreTransfers: false
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
    // 如果已有账户ID，刷新数据（从子页面返回时不需要显示骨架屏）
    if (this.data.account._id) {
      this.refreshData(this.data.account._id)
    }
  },

  /**
   * 加载账户数据
   */
  async loadAccountData(id) {
    this.setData({ loading: true, showSkeleton: true })

    try {
      // 并行加载账户信息、账单数据、转账记录（无依赖关系）
      await Promise.all([
        this.loadAccountInfo(id),
        this.loadBills(id),
        this.loadTransfers(id)
      ])
      // 统计入账和出账（包含账单和转账）
      this.calculateStats(id)
    } catch (err) {
      console.error('加载账户数据失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false, showSkeleton: false })
    }
  },

  /**
   * 刷新数据（不显示骨架屏，用于从子页面返回时）
   */
  async refreshData(id) {
    // 重置分页状态，从第1页开始加载
    this.setData({
      billPage: 1,
      hasMoreBills: true,
      transferPage: 1,
      hasMoreTransfers: true
    })

    try {
      // 并行加载账户信息、账单数据、转账记录
      await Promise.all([
        this.loadAccountInfo(id),
        this.loadBills(id),
        this.loadTransfers(id)
      ])
      // 统计入账和出账
      this.calculateStats(id)
    } catch (err) {
      console.error('刷新数据失败：', err)
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
   * 加载账单数据（分页）
   */
  async loadBills(accountId, isLoadMore = false) {
    const { billPage, billPageSize } = this.data

    // 如果是加载更多，设置加载状态
    if (isLoadMore) {
      this.setData({ loadingMoreBills: true })
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'listByAccount',
          data: {
            accountId,
            page: billPage,
            pageSize: billPageSize
          }
        }
      })

      if (res.result.success) {
        const newBills = res.result.data || []
        const hasMore = res.result.hasMore

        // 格式化账单金额
        const formattedBills = newBills.map(bill => ({
          ...bill,
          amountStr: formatAmount(bill.amount)
        }))

        // 如果是加载更多，追加到列表；否则替换
        const billList = isLoadMore
          ? [...this.data.billList, ...formattedBills]
          : formattedBills

        this.setData({
          billList,
          hasMoreBills: hasMore,
          billPage: isLoadMore ? billPage + 1 : 2,
          loadingMoreBills: false
        })
      }
    } catch (err) {
      console.error('获取账单数据失败：', err)
      this.setData({ loadingMoreBills: false })
    }
  },

  /**
   * 加载转账记录（分页）
   */
  async loadTransfers(accountId, isLoadMore = false) {
    const { transferPage, transferPageSize } = this.data

    // 如果是加载更多，设置加载状态
    if (isLoadMore) {
      this.setData({ loadingMoreTransfers: true })
    } else {
      this.setData({ loadingTransfers: true })
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'transferFunctions',
        data: {
          action: 'list',
          data: {
            accountId,
            page: transferPage,
            pageSize: transferPageSize
          }
        }
      })

      if (res.result.success) {
        const newTransfers = res.result.data || []
        const hasMore = res.result.hasMore

        // 获取所有相关账户的名称
        const accountIds = new Set()
        newTransfers.forEach(transfer => {
          accountIds.add(transfer.fromAccountId)
          accountIds.add(transfer.toAccountId)
        })

        // 批量获取账户名称
        const accountNames = await this.fetchAccountNames(Array.from(accountIds))

        // 格式化转账记录
        const formattedTransfers = newTransfers.map(transfer => ({
          ...transfer,
          amountStr: formatAmount(transfer.amount),
          fromAccountName: accountNames[transfer.fromAccountId] || '未知账户',
          toAccountName: accountNames[transfer.toAccountId] || '未知账户',
          // 判断当前账户是转出还是转入
          isOut: transfer.fromAccountId === accountId
        }))

        // 如果是加载更多，追加到列表；否则替换
        const transferList = isLoadMore
          ? [...this.data.transferList, ...formattedTransfers]
          : formattedTransfers

        this.setData({
          transferList,
          hasMoreTransfers: hasMore,
          transferPage: isLoadMore ? transferPage + 1 : 2,
          loadingMoreTransfers: false
        })
      }
    } catch (err) {
      console.error('获取转账记录失败：', err)
      this.setData({ loadingMoreTransfers: false })
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
   * 上拉加载更多账单
   */
  async loadMoreBills() {
    const { hasMoreBills, loadingMoreBills, currentTab, account } = this.data

    // 只有账单tab且有更多数据时才加载
    if (currentTab !== 'bills' || !hasMoreBills || loadingMoreBills) {
      return
    }

    await this.loadBills(account._id, true)
  },

  /**
   * 上拉加载更多转账记录
   */
  async loadMoreTransfers() {
    const { hasMoreTransfers, loadingMoreTransfers, currentTab, account } = this.data

    // 只有转账tab且有更多数据时才加载
    if (currentTab !== 'transfers' || !hasMoreTransfers || loadingMoreTransfers) {
      return
    }

    await this.loadTransfers(account._id, true)
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

    // 如果是负债账户且余额为0（已还清），禁止转账
    if (account.isDebt && account.balance === 0) {
      wx.showToast({
        title: '该账户已还清，无需转账',
        icon: 'none'
      })
      return
    }

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
