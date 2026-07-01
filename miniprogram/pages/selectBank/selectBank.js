/**
 * 选择银行页面（重构版）
 * 优化布局、折叠功能、搜索体验
 */
const app = getApp()

// 分类配置
const CATEGORIES = [
  { key: 'state-owned', name: '国有银行', icon: '🏦', color: '#E3F2FD' },
  { key: 'joint-stock', name: '股份制银行', icon: '🏬', color: '#E8F5E9' },
  { key: 'city-commercial', name: '城市商业银行', icon: '🏙️', color: '#FFF3E0' },
  { key: 'rural-commercial', name: '农村商业银行', icon: '🌾', color: '#F3E5F5' },
  { key: 'foreign', name: '外资银行', icon: '🌍', color: '#E0F7FA' },
  { key: 'other', name: '其他银行', icon: '📁', color: '#F5F5F5' }
]

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

    // 热门银行
    hotBanks: [],

    // 分类银行（按分类分组）
    categoryBanks: {},

    // 分类配置
    categories: CATEGORIES,

    // 展开的分类（记录哪些分类是展开的）
    expandedCategories: {},

    // 搜索
    searchText: '',
    searchResults: [],
    isSearching: false,

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

    this.loadData()
  },

  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true })

    try {
      // 并行加载热门银行和分类银行
      await Promise.all([
        this.loadHotBanks(),
        this.loadAllCategories()
      ])
    } catch (err) {
      console.error('加载银行数据失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 加载热门银行
   */
  async loadHotBanks() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'bankFunctions',
        data: {
          action: 'getHot'
        }
      })

      if (res.result.success) {
        this.setData({
          hotBanks: res.result.data || []
        })
      }
    } catch (err) {
      console.error('加载热门银行失败：', err)
    }
  },

  /**
   * 加载所有分类银行（每分类前8个）
   */
  async loadAllCategories() {
    const categoryBanks = {}

    for (const category of CATEGORIES) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'bankFunctions',
          data: {
            action: 'listByCategory',
            data: {
              category: category.key,
              page: 1,
              pageSize: 8
            }
          }
        })

        if (res.result.success) {
          categoryBanks[category.key] = {
            banks: res.result.data || [],
            total: res.result.total || 0,
            hasMore: res.result.hasMore || false
          }
        }
      } catch (err) {
        console.error(`加载${category.name}失败：`, err)
        categoryBanks[category.key] = {
          banks: [],
          total: 0,
          hasMore: false
        }
      }
    }

    this.setData({ categoryBanks })
  },

  /**
   * 搜索银行
   */
  onSearchInput(e) {
    const searchText = (e.detail.value || '').trim()
    this.setData({ searchText })

    if (!searchText) {
      this.setData({
        isSearching: false,
        searchResults: []
      })
      return
    }

    this.setData({ isSearching: true })

    wx.cloud.callFunction({
      name: 'bankFunctions',
      data: {
        action: 'search',
        data: {
          keyword: searchText,
          limit: 30
        }
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          searchResults: res.result.data || []
        })
      }
    }).catch(err => {
      console.error('搜索银行失败：', err)
    })
  },

  /**
   * 清空搜索
   */
  clearSearch() {
    this.setData({
      searchText: '',
      isSearching: false,
      searchResults: []
    })
  },

  /**
   * 展开/折叠分类
   */
  async toggleCategory(e) {
    const { category } = e.currentTarget.dataset
    const expandedCategories = { ...this.data.expandedCategories }
    const categoryBanks = { ...this.data.categoryBanks }

    // 切换展开状态
    const isExpanding = !expandedCategories[category]
    expandedCategories[category] = isExpanding

    // 展开时加载该分类的所有银行
    if (isExpanding && categoryBanks[category]) {
      const currentBanks = categoryBanks[category].banks || []
      const total = categoryBanks[category].total || 0

      // 如果当前加载的数量小于总数，需要加载更多
      if (currentBanks.length < total) {
        try {
          const res = await wx.cloud.callFunction({
            name: 'bankFunctions',
            data: {
              action: 'listByCategory',
              data: {
                category: category,
                page: 1,
                pageSize: total  // 加载该分类所有银行
              }
            }
          })

          if (res.result.success) {
            categoryBanks[category] = {
              banks: res.result.data || [],
              total: res.result.total || 0,
              hasMore: false  // 已加载全部，不再显示"查看更多"
            }
          }
        } catch (err) {
          console.error(`加载${category}银行失败：`, err)
        }
      }
    }

    this.setData({ expandedCategories, categoryBanks })
  },

  /**
   * 选择银行
   */
  selectBank(e) {
    const { id, name, icon } = e.currentTarget.dataset

    const url = `/pages/accountDetail/accountDetail` +
      `?type=${this.data.accountType}` +
      `&name=${encodeURIComponent(name)}` +
      `&icon=${encodeURIComponent(icon || '')}` +
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
