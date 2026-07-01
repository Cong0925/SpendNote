/**
 * 添加账户页面
 * 选择账户类型，进入对应的详情填写页面
 */
const app = getApp()

// 账户类型配置
const ACCOUNT_TYPES = [
  { type: 'cash', name: '现金', icon: '/images/account/cash.png', isDebt: false, needBank: false },
  { type: 'wechat', name: '微信', icon: '/images/account/wechat.png', isDebt: false, needBank: false },
  { type: 'alipay', name: '支付宝', icon: '/images/account/alipay.png', isDebt: false, needBank: false },
  { type: 'qq', name: 'QQ钱包', icon: '/images/account/qq.png', isDebt: false, needBank: false },
  { type: 'savings', name: '储蓄卡', icon: '/images/account/savings.png', isDebt: false, needBank: true },
  { type: 'credit', name: '信用卡', icon: '/images/account/credit.png', isDebt: true, needBank: true },
  { type: 'huabei', name: '花呗', icon: '/images/account/huabei.png', isDebt: true, needBank: false },
  { type: 'jd', name: '京东白条', icon: '/images/account/jd.png', isDebt: true, needBank: false },
  { type: 'mt', name: '美团月付', icon: '/images/account/mt.png', isDebt: true, needBank: false },
  { type: 'other', name: '其他', icon: '/images/account/other.png', isDebt: false, needBank: false }
]

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 资产类账户
    assetTypes: [],
    // 负债类账户
    debtTypes: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 分类账户类型
    const assetTypes = ACCOUNT_TYPES.filter(item => !item.isDebt)
    const debtTypes = ACCOUNT_TYPES.filter(item => item.isDebt)

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
