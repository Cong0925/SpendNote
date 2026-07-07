/**
 * 转账页面
 * 账户间转账功能
 */
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 当前账户ID（从上一页传入）
    accountId: '',
    // 表单数据
    form: {
      fromAccountId: '',
      fromAccountName: '',
      fromAmount: '',
      toAccountId: '',
      toAccountName: '',
      toAmount: '',
      date: '',
      remark: ''
    },
    // 账户列表
    accountList: [],
    // 加载状态
    loading: false,
    // 账户选择弹窗状态
    showFromAccountPicker: false,
    showToAccountPicker: false,
    loadingAccounts: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { accountId } = options
    const today = this.formatDate(new Date())

    // 设置默认日期为今天
    this.setData({
      accountId,
      'form.date': today
    })

    // 加载账户列表
    this.loadAccountList()
  },

  /**
   * 加载账户列表
   */
  async loadAccountList() {
    this.setData({ loadingAccounts: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'list'
        }
      })

      if (res.result.success) {
        const accountList = res.result.data || []
        this.setData({ accountList })

        // 根据当前账户类型设置默认值
        this.setDefaultAccount(accountList)
      }
    } catch (err) {
      console.error('加载账户列表失败：', err)
    } finally {
      this.setData({ loadingAccounts: false })
    }
  },

  /**
   * 设置默认账户
   */
  setDefaultAccount(accountList) {
    const { accountId } = this.data
    const currentAccount = accountList.find(item => item._id === accountId)

    if (currentAccount) {
      if (currentAccount.isDebt) {
        // 负债类型：转入账户默认选择当前账户
        this.setData({
          'form.toAccountId': currentAccount._id,
          'form.toAccountName': currentAccount.name
        })
      } else {
        // 非负债类型：转出账户默认选择当前账户
        this.setData({
          'form.fromAccountId': currentAccount._id,
          'form.fromAccountName': currentAccount.name
        })
      }
    }
  },

  /**
   * 选择转出账户
   */
  selectFromAccount() {
    this.setData({ showFromAccountPicker: true })
  },

  /**
   * 关闭转出账户选择弹窗
   */
  onFromAccountPickerClose() {
    this.setData({ showFromAccountPicker: false })
  },

  /**
   * 选择转出账户
   */
  onFromAccountSelect(e) {
    const { id, name } = e.detail
    this.setData({
      'form.fromAccountId': id || '',
      'form.fromAccountName': name || '',
      showFromAccountPicker: false
    })
  },

  /**
   * 选择转入账户
   */
  selectToAccount() {
    this.setData({ showToAccountPicker: true })
  },

  /**
   * 关闭转入账户选择弹窗
   */
  onToAccountPickerClose() {
    this.setData({ showToAccountPicker: false })
  },

  /**
   * 选择转入账户
   */
  onToAccountSelect(e) {
    const { id, name } = e.detail
    this.setData({
      'form.toAccountId': id || '',
      'form.toAccountName': name || '',
      showToAccountPicker: false
    })
  },

  /**
   * 输入转出金额
   */
  onFromAmountInput(e) {
    this.setData({
      'form.fromAmount': e.detail.value,
      'form.toAmount': e.detail.value
    })
  },

  /**
   * 输入转入金额
   */
  onToAmountInput(e) {
    this.setData({
      'form.fromAmount': e.detail.value,
      'form.toAmount': e.detail.value
    })
  },

  /**
   * 选择日期
   */
  onDateChange(e) {
    this.setData({
      'form.date': e.detail.value
    })
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      'form.remark': e.detail.value
    })
  },

  /**
   * 保存转账
   */
  async saveTransfer() {
    const { form } = this.data

    // 参数校验
    if (!form.fromAccountId) {
      wx.showToast({
        title: '请选择转出账户',
        icon: 'none'
      })
      return
    }

    if (!form.toAccountId) {
      wx.showToast({
        title: '请选择转入账户',
        icon: 'none'
      })
      return
    }

    if (form.fromAccountId === form.toAccountId) {
      wx.showToast({
        title: '转出和转入账户不能相同',
        icon: 'none'
      })
      return
    }

    if (!form.fromAmount || isNaN(Number(form.fromAmount)) || Number(form.fromAmount) <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    if (!form.date) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      const data = {
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        amount: Math.abs(Number(form.fromAmount)),
        date: form.date,
        remark: form.remark
      }

      const res = await wx.cloud.callFunction({
        name: 'transferFunctions',
        data: {
          action: 'add',
          data
        }
      })

      if (res.result.success) {
        wx.showToast({
          title: '转账成功',
          icon: 'success'
        })

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.error || '转账失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('保存转账失败：', err)
      wx.showToast({
        title: '转账失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
