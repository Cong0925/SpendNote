/**
 * 选择银行页面
 * 从银行列表中选择银行，跳转到账户详情页面
 */
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 账户类型参数
    accountType: '',
    accountName: '',
    accountIcon: '',
    isDebt: false,
    // 银行列表
    bankList: [],
    // 搜索关键词
    searchText: '',
    // 筛选后的银行列表
    filteredList: [],
    // 加载状态
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { type, name, icon, isDebt } = options

    this.setData({
      accountType: type,
      accountName: name,
      accountIcon: icon,
      isDebt: isDebt === 'true'
    })

    this.loadBanks()
  },

  /**
   * 加载银行列表
   */
  async loadBanks() {
    this.setData({ loading: true })

    try {
      // 先尝试初始化银行数据
      await wx.cloud.callFunction({
        name: 'bankFunctions',
        data: { action: 'init' }
      })

      // 获取银行列表
      const res = await wx.cloud.callFunction({
        name: 'bankFunctions',
        data: { action: 'list' }
      })

      if (res.result.success) {
        this.setData({
          bankList: res.result.data,
          filteredList: res.result.data,
          loading: false
        })
      }
    } catch (err) {
      console.error('加载银行列表失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  /**
   * 搜索银行
   */
  onSearchInput(e) {
    const searchText = e.detail.value.trim()
    this.setData({ searchText })

    this.filterBanks(searchText)
  },

  /**
   * 清空搜索
   */
  clearSearch() {
    this.setData({ searchText: '' })
    this.filterBanks('')
  },

  /**
   * 筛选银行列表
   */
  filterBanks(keyword) {
    if (!keyword) {
      this.setData({
        filteredList: this.data.bankList
      })
      return
    }

    const filtered = this.data.bankList.filter(bank => {
      return bank.name.includes(keyword) ||
             bank.shortName.includes(keyword)
    })

    this.setData({
      filteredList: filtered
    })
  },

  /**
   * 选择银行
   */
  selectBank(e) {
    const { id, name, icon } = e.currentTarget.dataset

    // 跳转到账户详情页面，带上银行信息
    const url = `/pages/accountDetail/accountDetail` +
      `?type=${this.data.accountType}` +
      `&name=${encodeURIComponent(name)}` +
      `&icon=${encodeURIComponent(icon || '/images/account/savings.png')}` +
      `&isDebt=${this.data.isDebt}` +
      `&bankId=${id}` +
      `&bankName=${encodeURIComponent(name)}`

    wx.navigateTo({ url })
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  }
})
