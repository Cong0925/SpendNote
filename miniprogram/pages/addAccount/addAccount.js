/**
 * 添加账户页面
 * 选择账户类型，进入对应的详情填写页面
 */
const app = getApp()

// 账户类型配置
const ACCOUNT_TYPES = [
  { type: 'cash', name: '现金', icon: '/images/account/cash.png', isDebt: false, needBank: false, single: true },
  { type: 'wechat', name: '微信', icon: '/images/account/wechat.png', isDebt: false, needBank: false, single: true },
  { type: 'alipay', name: '支付宝', icon: '/images/account/alipay.png', isDebt: false, needBank: false, single: true },
  { type: 'qq', name: 'QQ钱包', icon: '/images/account/qq.png', isDebt: false, needBank: false, single: true },
  { type: 'savings', name: '储蓄卡', icon: '/images/account/savings.png', isDebt: false, needBank: true, single: false },
  { type: 'credit', name: '信用卡', icon: '/images/account/credit.png', isDebt: true, needBank: true, single: false },
  { type: 'huabei', name: '花呗', icon: '/images/account/huabei.png', isDebt: true, needBank: false, single: true },
  { type: 'jd', name: '京东白条', icon: '/images/account/jd.png', isDebt: true, needBank: false, single: true },
  { type: 'mt', name: '美团月付', icon: '/images/account/mt.png', isDebt: true, needBank: false, single: true },
  { type: 'other', name: '其他', icon: '/images/account/other.png', isDebt: false, needBank: false, single: false }
]

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 资产类账户
    assetTypes: [],
    // 负债类账户
    debtTypes: [],
    // 已添加的账户类型
    existingTypes: []
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadExistingAccounts()
  },

  /**
   * 加载已有的账户，过滤已添加的单账户类型
   */
  async loadExistingAccounts() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'list'
        }
      })

      if (res.result.success) {
        const accounts = res.result.data || []
        // 获取已添加的单账户类型
        const existingTypes = accounts
          .filter(item => {
            const typeConfig = ACCOUNT_TYPES.find(t => t.type === item.type)
            return typeConfig && typeConfig.single
          })
          .map(item => item.type)

        this.setData({ existingTypes })

        // 过滤已添加的单账户类型
        this.filterAccountTypes(existingTypes)
      }
    } catch (err) {
      console.error('加载已有账户失败：', err)
    }
  },

  /**
   * 过滤账户类型，移除已添加的单账户类型
   */
  filterAccountTypes(existingTypes) {
    const assetTypes = ACCOUNT_TYPES.filter(item => !item.isDebt && !existingTypes.includes(item.type))
    const debtTypes = ACCOUNT_TYPES.filter(item => item.isDebt && !existingTypes.includes(item.type))

    this.setData({
      assetTypes,
      debtTypes
    })
  },

  /**
   * 选择账户类型
   */
  selectAccountType(e) {
    const { type, name, icon, isdebt, needbank } = e.currentTarget.dataset

    // 转换为布尔值
    const isDebt = isdebt === 'true' || isdebt === true
    const needBank = needbank === 'true' || needbank === true

    // 如果需要选择银行，跳转到银行选择页面
    if (needBank) {
      wx.navigateTo({
        url: `/pages/selectBank/selectBank?type=${type}&name=${name}&icon=${icon}&isDebt=${isDebt}`
      })
    } else {
      // 直接跳转到账户详情页面
      wx.navigateTo({
        url: `/pages/accountDetail/accountDetail?type=${type}&name=${name}&icon=${icon}&isDebt=${isDebt}`
      })
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  }
})
