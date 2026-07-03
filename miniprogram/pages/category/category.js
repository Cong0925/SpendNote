// pages/category/category.js
Page({
  data: {
    activeTab: 'expense',
    expenseCategories: [],
    incomeCategories: [],
    currentCategories: [],
    loading: true,
    showAddModal: false,
    showEditModal: false,
    editingCategory: null,
    newCategory: {
      name: '',
      icon: ''
    },
    selectedIcon: '',
    // 内置图标列表
    builtinIcons: [
      { name: '餐饮', icon: '🍜' },
      { name: '交通', icon: '🚌' },
      { name: '购物', icon: '🛒' },
      { name: '娱乐', icon: '🎬' },
      { name: '居住', icon: '🏠' },
      { name: '医疗', icon: '💊' },
      { name: '教育', icon: '📚' },
      { name: '通讯', icon: '📱' },
      { name: '服饰', icon: '👗' },
      { name: '美容', icon: '💄' },
      { name: '运动', icon: '⚽' },
      { name: '旅行', icon: '✈️' },
      { name: '宠物', icon: '🐱' },
      { name: '社交', icon: '🎉' },
      { name: '数码', icon: '💻' },
      { name: '其他', icon: '📦' },
      { name: '工资', icon: '💰' },
      { name: '奖金', icon: '🎁' },
      { name: '投资', icon: '📈' },
      { name: '兼职', icon: '💼' },
      { name: '理财', icon: '🏦' },
      { name: '红包', icon: '🧧' },
      { name: '咖啡', icon: '☕' },
      { name: '视频', icon: '📺' },
      { name: '音乐', icon: '🎵' },
      { name: '游戏', icon: '🎮' },
      { name: '消息', icon: '💬' },
      { name: '店铺', icon: '🏪' },
      { name: '订单', icon: '📋' },
      { name: '图片', icon: '🖼️' }
    ]
  },

  onLoad() {
    this.loadCategories()
  },

  // 切换tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.updateCurrentCategories()
  },

  // 更新当前显示的分类列表
  updateCurrentCategories() {
    const { activeTab, expenseCategories, incomeCategories } = this.data
    const currentCategories = activeTab === 'expense' ? expenseCategories : incomeCategories
    this.setData({ currentCategories })
  },

  // 加载分类列表
  async loadCategories() {
    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'categoryFunctions',
        data: {
          action: 'getList'
        }
      })

      if (res.result.success) {
        const { expense, income } = res.result.data
        this.setData({
          expenseCategories: expense,
          incomeCategories: income
        })
        this.updateCurrentCategories()
      }
    } catch (err) {
      console.error('加载分类失败：', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 显示新增弹窗
  showAddModal() {
    this.setData({
      showAddModal: true,
      newCategory: { name: '', icon: '' },
      selectedIcon: ''
    })
  },

  // 隐藏新增弹窗
  hideAddModal() {
    this.setData({
      showAddModal: false,
      newCategory: { name: '', icon: '' },
      selectedIcon: ''
    })
  },

  // 显示编辑弹窗
  showEditModal(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      showEditModal: true,
      editingCategory: JSON.parse(JSON.stringify(category)),
      selectedIcon: category.icon
    })
  },

  // 隐藏编辑弹窗
  hideEditModal() {
    this.setData({
      showEditModal: false,
      editingCategory: null,
      selectedIcon: ''
    })
  },

  // 输入分类名称
  onInputName(e) {
    this.setData({
      'newCategory.name': e.detail.value
    })
  },

  // 输入编辑分类名称
  onEditInputName(e) {
    this.setData({
      'editingCategory.name': e.detail.value
    })
  },

  // 选择图标
  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      selectedIcon: icon,
      'newCategory.icon': icon
    })
  },

  // 选择编辑图标
  selectEditIcon(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      selectedIcon: icon,
      'editingCategory.icon': icon
    })
  },

  // 新增分类
  async addCategory() {
    const { newCategory, activeTab } = this.data

    if (!newCategory.name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }

    if (!newCategory.icon) {
      wx.showToast({ title: '请选择图标', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '添加中...' })

      const res = await wx.cloud.callFunction({
        name: 'categoryFunctions',
        data: {
          action: 'add',
          data: {
            name: newCategory.name.trim(),
            type: activeTab,
            icon: newCategory.icon
          }
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.hideAddModal()
        this.loadCategories()
      } else {
        wx.showToast({ title: res.result.error || '添加失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('添加分类失败：', err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  // 修改分类
  async updateCategory() {
    const { editingCategory } = this.data

    if (!editingCategory.name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '修改中...' })

      const res = await wx.cloud.callFunction({
        name: 'categoryFunctions',
        data: {
          action: 'update',
          data: {
            id: editingCategory._id,
            name: editingCategory.name.trim(),
            icon: editingCategory.icon
          }
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({ title: '修改成功', icon: 'success' })
        this.hideEditModal()
        this.loadCategories()
      } else {
        wx.showToast({ title: res.result.error || '修改失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('修改分类失败：', err)
      wx.showToast({ title: '修改失败', icon: 'none' })
    }
  },

  // 删除分类
  deleteCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name

    wx.showModal({
      title: '确认删除',
      content: `确定要删除分类"${name}"吗？`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            const result = await wx.cloud.callFunction({
              name: 'categoryFunctions',
              data: {
                action: 'delete',
                data: { id }
              }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              this.loadCategories()
            } else {
              wx.showToast({ title: result.result.error || '删除失败', icon: 'none' })
            }
          } catch (err) {
            wx.hideLoading()
            console.error('删除分类失败：', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
