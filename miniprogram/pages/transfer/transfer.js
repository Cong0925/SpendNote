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
    // 转账记录ID（查看/编辑模式）
    transferId: '',
    // 页面模式：add（新增）/ view（查看）/ edit（编辑）
    mode: 'add',
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
    // 可选的转出账户列表（排除负债账户和已清零的账户）
    fromAccountList: [],
    // 可选的转入账户列表（排除已清零的负债账户）
    toAccountList: [],
    // 当前选中的转入负债账户余额（用于金额限制）
    selectedToDebtBalance: 0,
    // 当前选中的转出账户余额（用于金额限制）
    selectedFromBalance: 0,
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
    const { accountId, transferId } = options
    const today = this.formatDate(new Date())

    // 设置默认日期为今天
    this.setData({
      accountId,
      'form.date': today
    })

    // 如果有 transferId，进入查看模式
    if (transferId) {
      this.setData({
        mode: 'view',
        transferId
      })
      wx.setNavigationBarTitle({ title: '转账详情' })
    }

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

        // 转出账户：排除所有负债账户（负债账户不能转出）
        const fromAccounts = accountList.filter(account => {
          return !account.isDebt
        })

        // 转入账户：排除已清零的负债账户
        const toAccounts = accountList.filter(account => {
          // 负债账户且余额为0，不可选
          if (account.isDebt && account.balance === 0) {
            return false
          }
          return true
        })

        this.setData({
          accountList,
          fromAccountList: fromAccounts,
          toAccountList: toAccounts
        })

        // 如果是查看或编辑模式，加载转账记录
        if (this.data.mode === 'view' || this.data.mode === 'edit') {
          await this.loadTransferData(accountList)
        } else {
          // 根据当前账户类型设置默认值
          this.setDefaultAccount(accountList)
        }
      }
    } catch (err) {
      console.error('加载账户列表失败：', err)
    } finally {
      this.setData({ loadingAccounts: false })
    }
  },

  /**
   * 加载转账记录数据（查看/编辑模式）
   */
  async loadTransferData(accountList) {
    wx.showLoading({ title: '加载中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'transferFunctions',
        data: {
          action: 'get',
          data: { id: this.data.transferId }
        }
      })

      if (res.result.success) {
        const transfer = res.result.data
        // 根据账户ID获取账户名称
        const fromAccount = accountList.find(item => item._id === transfer.fromAccountId)
        const toAccount = accountList.find(item => item._id === transfer.toAccountId)

        this.setData({
          form: {
            fromAccountId: transfer.fromAccountId,
            fromAccountName: fromAccount ? fromAccount.name : '',
            fromAmount: transfer.amount.toString(),
            toAccountId: transfer.toAccountId,
            toAccountName: toAccount ? toAccount.name : '',
            toAmount: transfer.amount.toString(),
            date: transfer.date,
            remark: transfer.remark || ''
          }
        })
      } else {
        wx.showToast({ title: '加载转账记录失败', icon: 'none' })
      }
    } catch (err) {
      console.error('加载转账记录失败：', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 切换到编辑模式
   */
  switchToEdit() {
    this.setData({ mode: 'edit' })
    wx.setNavigationBarTitle({ title: '编辑转账' })
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
        // 记录负债账户余额用于金额限制
        let selectedToDebtBalance = 0
        if (currentAccount.balance > 0) {
          selectedToDebtBalance = currentAccount.balance
        }
        this.setData({
          'form.toAccountId': currentAccount._id,
          'form.toAccountName': currentAccount.name,
          selectedToDebtBalance
        })
      } else {
        // 非负债类型：转出账户默认选择当前账户
        // 记录转出账户余额用于金额限制
        this.setData({
          'form.fromAccountId': currentAccount._id,
          'form.fromAccountName': currentAccount.name,
          selectedFromBalance: currentAccount.balance
        })
      }
    }
  },

  /**
   * 选择转出账户
   */
  selectFromAccount() {
    // 过滤掉已选择的转入账户
    const { toAccountList, form } = this.data
    let availableFromAccounts = toAccountList

    // 如果已选转入账户，从转出列表中排除
    if (form.toAccountId) {
      availableFromAccounts = toAccountList.filter(account => account._id !== form.toAccountId)
    }

    this.setData({
      fromAccountList: availableFromAccounts,
      showFromAccountPicker: true
    })
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
    const { accountList } = this.data

    // 查找选中的账户信息，记录余额
    const selectedAccount = accountList.find(account => account._id === id)
    const selectedFromBalance = selectedAccount ? selectedAccount.balance : 0

    this.setData({
      'form.fromAccountId': id || '',
      'form.fromAccountName': name || '',
      selectedFromBalance,
      showFromAccountPicker: false
    })
  },

  /**
   * 选择转入账户
   */
  selectToAccount() {
    // 过滤掉已选择的转出账户
    const { accountList, form } = this.data

    // 转入账户：排除已清零的负债账户 + 已选的转出账户
    let availableToAccounts = accountList.filter(account => {
      // 负债账户且余额为0，不可选
      if (account.isDebt && account.balance === 0) {
        return false
      }
      return true
    })

    // 如果已选转出账户，从转入列表中排除
    if (form.fromAccountId) {
      availableToAccounts = availableToAccounts.filter(account => account._id !== form.fromAccountId)
    }

    this.setData({
      toAccountList: availableToAccounts,
      showToAccountPicker: true
    })
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
    const { accountList } = this.data

    // 查找选中的账户信息
    const selectedAccount = accountList.find(account => account._id === id)

    // 如果是负债账户，记录余额用于金额限制
    let selectedToDebtBalance = 0
    if (selectedAccount && selectedAccount.isDebt && selectedAccount.balance > 0) {
      selectedToDebtBalance = selectedAccount.balance
    }

    this.setData({
      'form.toAccountId': id || '',
      'form.toAccountName': name || '',
      selectedToDebtBalance,
      showToAccountPicker: false
    })
  },

  /**
   * 输入转出金额
   */
  onFromAmountInput(e) {
    let value = e.detail.value
    const { selectedFromBalance } = this.data

    // 如果转出账户有余额限制，超过时自动调整为最大值
    if (selectedFromBalance > 0 && Number(value) > selectedFromBalance) {
      value = selectedFromBalance.toString()
      wx.showToast({
        title: '已自动调整为账户最大余额',
        icon: 'none'
      })
    }

    this.setData({
      'form.fromAmount': value,
      'form.toAmount': value
    })
  },

  /**
   * 输入转入金额
   */
  onToAmountInput(e) {
    let value = e.detail.value
    const { selectedToDebtBalance, selectedFromBalance } = this.data

    // 如果转入账户是负债账户，金额超过负债余额时自动调整为最大值
    if (selectedToDebtBalance > 0 && Number(value) > selectedToDebtBalance) {
      value = selectedToDebtBalance.toString()
      wx.showToast({
        title: '已自动调整为最大可转账金额',
        icon: 'none'
      })
    }

    // 同时检查转出账户余额限制
    if (selectedFromBalance > 0 && Number(value) > selectedFromBalance) {
      value = selectedFromBalance.toString()
      wx.showToast({
        title: '已自动调整为账户最大余额',
        icon: 'none'
      })
    }

    this.setData({
      'form.fromAmount': value,
      'form.toAmount': value
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
    const { form, mode, transferId } = this.data

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

    // 检查转出账户余额限制
    const { selectedFromBalance, selectedToDebtBalance, accountList } = this.data
    if (selectedFromBalance > 0 && Number(form.fromAmount) > selectedFromBalance) {
      wx.showToast({
        title: '转出金额不能大于账户余额',
        icon: 'none'
      })
      return
    }

    // 检查负债账户金额限制
    if (selectedToDebtBalance > 0) {
      const toAccount = accountList.find(account => account._id === form.toAccountId)
      if (toAccount && toAccount.isDebt && Number(form.fromAmount) > selectedToDebtBalance) {
        wx.showToast({
          title: '转入金额不能大于负债余额',
          icon: 'none'
        })
        return
      }
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

      let res
      if (mode === 'edit') {
        // 编辑模式
        data.id = transferId
        res = await wx.cloud.callFunction({
          name: 'transferFunctions',
          data: {
            action: 'update',
            data
          }
        })
      } else {
        // 新增模式
        res = await wx.cloud.callFunction({
          name: 'transferFunctions',
          data: {
            action: 'add',
            data
          }
        })
      }

      if (res.result.success) {
        wx.showToast({
          title: mode === 'edit' ? '修改成功' : '转账成功',
          icon: 'success'
        })

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.error || (mode === 'edit' ? '修改失败' : '转账失败'),
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('保存转账失败：', err)
      wx.showToast({
        title: mode === 'edit' ? '修改失败' : '转账失败',
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
