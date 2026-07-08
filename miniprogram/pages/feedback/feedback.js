// pages/feedback/feedback.js
Page({
  data: {
    feedbackList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    showSkeleton: true  // 骨架屏显示状态
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

  // 跳转到修改反馈页面
  editFeedback(e) {
    const { id } = e.currentTarget.dataset
    this.needRefresh = true
    wx.navigateTo({ url: `/pages/feedback/add/add?id=${id}` })
  },

  // 刷新列表
  refreshList() {
    this.setData({
      feedbackList: [],
      page: 1,
      hasMore: true,
      showSkeleton: true  // 刷新时显示骨架屏
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
      this.setData({
        loading: false,
        showSkeleton: false  // 数据加载完成后隐藏骨架屏
      })
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

    // 判断是否已发送（已上报）
    const isReported = item.emailSent === true

    return {
      ...item,
      typeName: typeInfo.name,
      typeIcon: typeInfo.icon,
      shortId,
      createTimeText,
      isReported
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

  // 删除反馈
  deleteFeedback(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条反馈吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            const result = await wx.cloud.callFunction({
              name: 'feedbackFunctions',
              data: {
                action: 'delete',
                data: { feedbackId: id }
              }
            })

            if (result.result.success) {
              // 从列表中移除
              const newList = [...this.data.feedbackList]
              newList.splice(index, 1)
              this.setData({
                feedbackList: newList
              })

              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
            } else {
              wx.showToast({
                title: result.result.error || '删除失败',
                icon: 'none'
              })
            }
          } catch (err) {
            console.error('删除反馈失败：', err)
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
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
