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
    categories: [],
    loading: false
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
        date: options.date || ''
      })
    } else {
      this.setCurrentDate()
    }
    this.loadCategories()
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

  // 加载分类
  async loadCategories() {
    try {
      // 先初始化分类
      await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'initCategories'
        }
      })

      // 获取分类列表
      const res = await wx.cloud.callFunction({
        name: 'billFunctions',
        data: {
          action: 'getCategories',
          data: { type: this.data.type }
        }
      })

      if (res.result.success) {
        this.setData({
          categories: res.result.data
        })
      } else {
        this.setDefaultCategories()
      }
    } catch (error) {
      console.error('加载分类失败:', error)
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

    const categories = this.data.type === 'expense' ? expenseCategories : incomeCategories
    this.setData({ categories })
  },

  // 切换类型
  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      type: type,
      category: '',
      icon: ''
    })
    this.loadCategories()
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

  // 提交账单
  async submitBill() {
    const { isEdit, billId, type, amount, category, icon, note, date } = this.data

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
            action: 'updateBill',
            data: {
              billId: billId,
              type: type,
              amount: parseFloat(amount),
              category: category,
              icon: icon,
              note: note,
              date: date
            }
          }
        })
      } else {
        // 新增模式
        res = await wx.cloud.callFunction({
          name: 'billFunctions',
          data: {
            action: 'addBill',
            data: {
              type: type,
              amount: parseFloat(amount),
              category: category,
              icon: icon,
              note: note,
              date: date
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
