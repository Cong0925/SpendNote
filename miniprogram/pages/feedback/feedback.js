// pages/feedback/feedback.js
Page({
  data: {
    feedbackList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad() {
    this.loadFeedbackList()
  },

  onShow() {
    // 从新增反馈页面返回时刷新列表
    if (this.needRefresh) {
      this.needRefresh = false
      this.refreshList()
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 跳转到新增反馈页面
  goToAddFeedback() {
    this.needRefresh = true
    wx.navigateTo({ url: '/pages/feedback/add/add' })
  },

  // 刷新列表
  refreshList() {
    this.setData({
      feedbackList: [],
      page: 1,
      hasMore: true
    })
    this.loadFeedbackList()
  },

  // 加载反馈列表
  async loadFeedbackList() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: {
          action: 'getList',
          data: {
            page: this.data.page,
            pageSize: this.data.pageSize
          }
        }
      })

      if (res.result.success) {
        const { list, total } = res.result.data

        // 格式化数据
        const formattedList = list.map(item => this.formatFeedbackItem(item))

        this.setData({
          feedbackList: [...this.data.feedbackList, ...formattedList],
          page: this.data.page + 1,
          hasMore: this.data.feedbackList.length + list.length < total
        })
      }
    } catch (err) {
      console.error('加载反馈列表失败：', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 格式化反馈项
  formatFeedbackItem(item) {
    const typeMap = {
      'bug': { name: '问题反馈', icon: '🐛' },
      'feature': { name: '功能建议', icon: '💡' },
      'other': { name: '其他', icon: '📝' }
    }

    const typeInfo = typeMap[item.type] || { name: '其他', icon: '📝' }

    // 生成短编号
    const shortId = item._id ? item._id.slice(-8).toUpperCase() : 'UNKNOWN'

    // 格式化时间
    const createTimeText = this.formatTime(item.createTime)

    return {
      ...item,
      typeName: typeInfo.name,
      typeIcon: typeInfo.icon,
      shortId,
      createTimeText
    }
  },

  // 格式化时间
  formatTime(time) {
    if (!time) return ''

    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 小于1分钟
    if (diff < 60 * 1000) {
      return '刚刚'
    }

    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}分钟前`
    }

    // 小于24小时
    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
    }

    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`
    }

    // 超过7天显示具体日期
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({
      current: url,
      urls: urls
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshList()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadFeedbackList()
  }
})
