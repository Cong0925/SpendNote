// pages/add/add.js
Page({
  data: {
    isEdit: false, // 是否为修改模式
    billId: '', // 修改模式下的账单ID
    type: 'expense', // expense: 支出, income: 收入
    amount: '',
    category: '',
    icon: '',
    note: '',
    date: '',
    accountId: '', // 关联账户ID
    accountName: '', // 关联账户名称
    categories: [],
    loadingCategories: true, // 分类加载状态
    accountList: [], // 账户列表
    loadingAccounts: false, // 账户列表加载状态
    loading: false,
    showAccountPicker: false // 显示账户选择弹窗
  },

  // 分类本地缓存（支出/收入各自独立缓存）
  _categoryCache: {
    expense: null,
    income: null
  },

  onLoad(options) {
    // 检查是否为修改模式
    if (options.billId) {
      this.setData({
        isEdit: true,
        billId: options.billId,
        type: options.type || 'expense',
        amount: options.amount || '',
        category: options.category || '',
        icon: options.icon || '',
        note: options.note || '',
        date: options.date || '',
        accountId: options.accountId || '',
        accountName: options.accountName || ''
      })
      // 如果有 accountId 但没有 accountName，加载账户信息
      if (options.accountId && !options.accountName) {
        this.loadAccountInfo(options.accountId)
      }
    } else {
      this.setCurrentDate()
      // 如果从账户详情页面传入accountId，自动关联
      if (options.accountId) {
        this.setData({
          accountId: options.accountId
        })
        this.loadAccountInfo(options.accountId)
      }
    }
    // 预加载两类分类（支出+收入），缓存到本地
    this.preloadCategories()
    this.loadAccountList()
  },

  // 设置当前日期
  setCurrentDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    this.setData({
      date: `${year}-${month}-${day}`
    })
  },

  // 预加载两类分类（支出+收入），缓存到本地
  async preloadCategories() {
    this.setData({ loadingCategories: true })

    try {
      // 先初始化分类
      await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'initCategories'
        }
      })

      // 并行加载两类分类
      const [expenseRes, incomeRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'billFunctions',
          data: {
            action: 'getCategories',
            data: { type: 'expense' }
          }
        }),
        wx.cloud.callFunction({
          name: 'billFunctions',
          data: {
            action: 'getCategories',
            data: { type: 'income' }
          }
        })
      ])

      // 缓存两类分类
      if (expenseRes.result.success) {
        this._categoryCache.expense = expenseRes.result.data
      }
      if (incomeRes.result.success) {
        this._categoryCache.income = incomeRes.result.data
      }

      // 设置当前类型的分类
      const currentCategories = this._categoryCache[this.data.type]
      if (currentCategories) {
        this.setData({ categories: currentCategories, loadingCategories: false })
      } else {
        this.setDefaultCategories()
      }
    } catch (error) {
      console.error('预加载分类失败:', error)
      // 使用默认分类
      this.setDefaultCategories()
    }
  },

  // 设置默认分类（云函数未部署时使用）
  setDefaultCategories() {
    const expenseCategories = [
      { name: '餐饮', icon: '🍜', type: 'expense', sort: 1 },
      { name: '交通', icon: '🚗', type: 'expense', sort: 2 },
      { name: '购物', icon: '🛒', type: 'expense', sort: 3 },
      { name: '娱乐', icon: '🎬', type: 'expense', sort: 4 },
      { name: '居住', icon: '💡', type: 'expense', sort: 5 },
      { name: '通讯', icon: '📱', type: 'expense', sort: 6 },
      { name: '医疗', icon: '🏥', type: 'expense', sort: 7 },
      { name: '教育', icon: '📚', type: 'expense', sort: 8 },
      { name: '服饰', icon: '👕', type: 'expense', sort: 9 },
      { name: '其他', icon: '💰', type: 'expense', sort: 10 }
    ]

    const incomeCategories = [
      { name: '工资', icon: '💵', type: 'income', sort: 1 },
      { name: '奖金', icon: '💰', type: 'income', sort: 2 },
      { name: '红包', icon: '🎁', type: 'income', sort: 3 },
      { name: '投资', icon: '💹', type: 'income', sort: 4 },
      { name: '兼职', icon: '💼', type: 'income', sort: 5 },
      { name: '其他', icon: '📝', type: 'income', sort: 6 }
    ]

    // 缓存默认分类
    this._categoryCache.expense = expenseCategories
    this._categoryCache.income = incomeCategories

    const categories = this.data.type === 'expense' ? expenseCategories : incomeCategories
    this.setData({ categories, loadingCategories: false })
  },

  // 按类型加载分类（降级方案，缓存未命中时使用）
  async loadCategoriesByType(type) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'getCategories',
          data: { type: type }
        }
      })

      if (res.result.success) {
        // 缓存结果
        this._categoryCache[type] = res.result.data
        this.setData({ categories: res.result.data })
      } else {
        this.setDefaultCategories()
      }
    } catch (error) {
      console.error('加载分类失败:', error)
      this.setDefaultCategories()
    }
  },

  // 切换类型（从本地缓存读取，无延迟）
  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      type: type,
      category: '',
      icon: '',
      accountId: '',
      accountName: ''
    })
    // 从本地缓存读取分类（毫秒级切换）
    const cachedCategories = this._categoryCache[type]
    if (cachedCategories) {
      this.setData({ categories: cachedCategories })
    } else {
      // 缓存未命中时，加载分类（降级方案）
      this.loadCategoriesByType(type)
    }
    this.loadAccountList()
  },

  // 输入金额
  inputAmount(e) {
    this.setData({
      amount: e.detail.value
    })
  },

  // 选择分类
  selectCategory(e) {
    const { name, icon } = e.currentTarget.dataset
    this.setData({
      category: name,
      icon: icon
    })
  },

  // 输入备注
  inputNote(e) {
    this.setData({
      note: e.detail.value
    })
  },

  // 选择日期
  changeDate(e) {
    this.setData({
      date: e.detail.value
    })
  },

  // 加载账户列表
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
        let accountList = res.result.data || []

        // 收入时只显示普通账户，支出时显示所有账户
        if (this.data.type === 'income') {
          accountList = accountList.filter(item => !item.isDebt)
        }

        this.setData({
          accountList
        })
      }
    } catch (err) {
      console.error('加载账户列表失败：', err)
    } finally {
      this.setData({ loadingAccounts: false })
    }
  },

  // 加载账户信息
  async loadAccountInfo(accountId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'get',
          data: { id: accountId }
        }
      })

      if (res.result.success) {
        const account = res.result.data
        this.setData({
          accountName: account.name
        })
      }
    } catch (err) {
      console.error('加载账户信息失败：', err)
    }
  },

  // 选择账户
  selectAccount() {
    this.setData({
      showAccountPicker: true
    })
  },

  // 关闭账户选择弹窗
  onAccountPickerClose() {
    this.setData({
      showAccountPicker: false
    })
  },

  // 账户选择结果
  onAccountSelect(e) {
    const { id, name } = e.detail
    this.setData({
      accountId: id,
      accountName: name,
      showAccountPicker: false
    })
  },

  // 提交账单
  async submitBill() {
    const { isEdit, billId, type, amount, category, icon, note, date, accountId } = this.data

    // 验证
    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({
        title: '请输入正确金额',
        icon: 'none'
      })
      return
    }

    if (!category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      })
      return
    }

    if (!date) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      let res

      if (isEdit) {
        // 修改模式
        res = await wx.cloud.callFunction({
          name: 'billFunctions',
          data: {
            action: 'update',
            data: {
              id: billId,
              type: type,
              amount: parseFloat(amount),
              category: category,
              icon: icon,
              note: note,
              date: date,
              accountId: accountId
            }
          }
        })
      } else {
        // 新增模式
        res = await wx.cloud.callFunction({
          name: 'billFunctions',
          data: {
            action: 'add',
            data: {
              type: type,
              amount: parseFloat(amount),
              category: category,
              icon: icon,
              note: note,
              date: date,
              accountId: accountId
            }
          }
        })
      }

      if (res.result.success) {
        wx.showToast({
          title: isEdit ? '修改成功' : '记账成功',
          icon: 'success'
        })

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.error || (isEdit ? '修改失败' : '记账失败'),
          icon: 'none'
        })
      }
    } catch (error) {
      console.error(isEdit ? '修改失败:' : '记账失败:', error)
      wx.showToast({
        title: isEdit ? '修改失败，请重试' : '记账失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})
