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
    // 可拖拽按钮位置（默认右下角）
    fabPosition: {
      x: 0,
      y: 0
    },
    // 拖拽状态
    isDragging: false,
    // 滚动状态
    scrollDisabled: false,
    // 滚动位置
    scrollTop: 0,
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
    this.loadFabPosition()
  },

  // 切换tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.updateCurrentCategories()
  },

  // 记录滚动位置
  onScroll(e) {
    if (!this.data.scrollDisabled) {
      this.setData({ scrollTop: e.detail.scrollTop })
    }
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
  },

  // 加载新增按钮位置
  loadFabPosition() {
    try {
      const position = wx.getStorageSync('category_fab_position')
      if (position && position.x !== undefined && position.y !== undefined) {
        this.setData({ fabPosition: position })
      } else {
        // 默认位置：右下角
        const systemInfo = wx.getSystemInfoSync()
        const screenWidth = systemInfo.windowWidth
        const screenHeight = systemInfo.windowHeight
        // 按钮宽度100rpx = 50px，右边距40rpx = 20px，底部距离120rpx = 60px
        const buttonWidthPx = 50
        const rightMarginPx = 20
        const bottomMarginPx = 60
        const defaultX = screenWidth - buttonWidthPx - rightMarginPx
        const defaultY = screenHeight - buttonWidthPx - bottomMarginPx
        this.setData({
          fabPosition: { x: defaultX, y: defaultY }
        })
      }
    } catch (err) {
      console.error('读取按钮位置失败：', err)
      // 出错时使用默认位置
      this.setData({
        fabPosition: { x: 280, y: 500 }
      })
    }
  },

  // 新增按钮触摸开始
  onFabTouchStart(e) {
    // 记录起始位置
    this.startX = e.touches[0].clientX - this.data.fabPosition.x
    this.startY = e.touches[0].clientY - this.data.fabPosition.y
    // 记录当前滚动位置
    this.currentScrollTop = this.data.scrollTop || 0
    this.setData({
      isDragging: true,
      scrollDisabled: true
    })
  },

  // 新增按钮触摸移动
  onFabTouchMove(e) {
    if (!this.data.isDragging) return

    const x = e.touches[0].clientX - this.startX
    const y = e.touches[0].clientY - this.startY

    // 限制在屏幕范围内
    const systemInfo = wx.getSystemInfoSync()
    const screenWidth = systemInfo.windowWidth
    const screenHeight = systemInfo.windowHeight
    const buttonWidth = 50 // 按钮宽度50px

    // 计算边界
    const minX = 0
    const maxX = screenWidth - buttonWidth
    const minY = 0
    const maxY = screenHeight - buttonWidth

    // 限制范围
    const limitedX = Math.max(minX, Math.min(maxX, x))
    const limitedY = Math.max(minY, Math.min(maxY, y))

    this.setData({
      fabPosition: { x: limitedX, y: limitedY }
    })
  },

  // 新增按钮触摸结束
  onFabTouchEnd(e) {
    if (!this.data.isDragging) return

    this.setData({
      isDragging: false,
      scrollDisabled: false
    })

    // 保存位置到本地存储
    try {
      wx.setStorageSync('category_fab_position', this.data.fabPosition)
    } catch (err) {
      console.error('保存按钮位置失败：', err)
    }
  }
})
