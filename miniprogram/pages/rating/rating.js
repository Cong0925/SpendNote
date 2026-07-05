// pages/rating/rating.js - Premium Rating Experience
const ratingTexts = {
  1: '非常不满意',
  2: '不太满意',
  3: '一般般',
  4: '比较满意',
  5: '非常满意'
}

const tagList = [
  { id: 'ui', icon: '🎨', text: '界面美观' },
  { id: 'easy', icon: '✨', text: '操作简单' },
  { id: 'feature', icon: '🚀', text: '功能实用' },
  { id: 'speed', icon: '⚡', text: '运行流畅' },
  { id: 'safe', icon: '🔒', text: '数据安全' },
  { id: 'free', icon: '🆓', text: '完全免费' }
]

Page({
  data: {
    hasSubmitted: false,
    userRating: 0,
    ratingText: '',
    tags: tagList,
    selectedTags: [],
    comment: '',
    uploadedImages: [],
    isSubmitting: false,
    reviews: [],
    filteredReviews: [],
    totalCount: 0,
    goodCount: 0,
    midCount: 0,
    badCount: 0,
    hasImageCount: 0,
    avgRating: 0,
    hasMore: true,
    loading: false,
    page: 1,
    pageSize: 10,
    currentFilter: 'all'
  },

  onLoad() {
    this.loadExistingRating()
  },

  onShow() {
    if (this.needRefresh) {
      this.needRefresh = false
      this.setData({ hasSubmitted: false, page: 1 })
      this.loadExistingRating()
    }
  },

  // 加载用户已有的评价
  async loadExistingRating() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'rating',
        data: { action: 'getMyRating' }
      })

      if (res.result.success && res.result.data) {
        const existing = res.result.data
        this.setData({
          hasSubmitted: true,
          userRating: existing.rating,
          ratingText: ratingTexts[existing.rating] || '',
          selectedTags: existing.selectedTags || [],
          comment: existing.comment || '',
          uploadedImages: existing.images || []
        })
        this.loadReviews()
      } else {
        this.setData({ hasSubmitted: false })
      }
    } catch (error) {
      console.error('加载已有评价失败:', error)
      this.setData({ hasSubmitted: false })
    }
  },

  // 加载评价列表
  async loadReviews(append = false) {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'rating',
        data: {
          action: 'listRatings',
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      })

      if (res.result.success) {
        const { list, total, avgRating, goodCount, midCount, badCount, hasImageCount } = res.result.data

        const formattedList = list.map(item => ({
          ...item,
          createTimeStr: this.formatTime(item.createTime)
        }))

        const allReviews = append ? [...this.data.reviews, ...formattedList] : formattedList

        this.setData({
          reviews: allReviews,
          filteredReviews: this.filterReviews(allReviews, this.data.currentFilter),
          totalCount: total,
          goodCount,
          midCount,
          badCount,
          hasImageCount,
          avgRating: avgRating.toFixed(1),
          hasMore: formattedList.length === this.data.pageSize
        })
      }
    } catch (error) {
      console.error('加载评价列表失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 筛选评价
  filterReviews(reviews, filter) {
    if (filter === 'all') return reviews
    if (filter === 'good') return reviews.filter(r => r.rating >= 4)
    if (filter === 'mid') return reviews.filter(r => r.rating === 3)
    if (filter === 'bad') return reviews.filter(r => r.rating <= 2)
    if (filter === 'hasImage') return reviews.filter(r => r.images && r.images.length > 0)
    return reviews
  },

  // 筛选切换
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({
      currentFilter: filter,
      filteredReviews: this.filterReviews(this.data.reviews, filter)
    })
  },

  // 点击星星
  onTapStar(e) {
    const star = e.currentTarget.dataset.star
    this.setData({
      userRating: star,
      ratingText: ratingTexts[star]
    })
  },

  // 点击标签 - 只切换选中状态
  onTapTag(e) {
    const tagId = e.currentTarget.dataset.id
    let selectedTags = [...this.data.selectedTags]

    if (selectedTags.includes(tagId)) {
      selectedTags = selectedTags.filter(id => id !== tagId)
    } else {
      selectedTags.push(tagId)
    }

    this.setData({ selectedTags })
  },

  // 输入评论
  onCommentInput(e) {
    this.setData({ comment: e.detail.value })
  },

  // 选择图片
  async onChooseImage() {
    const remaining = 3 - this.data.uploadedImages.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传3张图片', icon: 'none' })
      return
    }

    try {
      const res = await wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })

      const tempFiles = res.tempFiles
      wx.showLoading({ title: '上传中...' })

      const uploadPromises = tempFiles.map(async (file) => {
        const cloudPath = `rating-images/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: file.tempFilePath
        })
        return uploadRes.fileID
      })

      const newImages = await Promise.all(uploadPromises)

      this.setData({
        uploadedImages: [...this.data.uploadedImages, ...newImages]
      })

      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
    } catch (error) {
      wx.hideLoading()
      if (error.errMsg !== 'chooseMedia:fail cancel') {
        console.error('选择图片失败:', error)
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  },

  // 预览图片
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.uploadedImages
    })
  },

  // 删除图片
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          const images = [...this.data.uploadedImages]
          images.splice(index, 1)
          this.setData({ uploadedImages: images })
        }
      }
    })
  },

  // 提交评价
  async onSubmit() {
    const { userRating, selectedTags, comment, uploadedImages } = this.data

    if (!userRating) {
      wx.showToast({ title: '请先评分', icon: 'none' })
      return
    }

    this.setData({ isSubmitting: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'rating',
        data: {
          action: 'submitRating',
          rating: userRating,
          selectedTags,
          comment: comment.trim(),
          images: uploadedImages
        }
      })

      if (res.result.success) {
        wx.showToast({ title: '评价成功', icon: 'success' })
        this.setData({ hasSubmitted: true, page: 1 })
        this.loadReviews()
      } else {
        wx.showToast({ title: res.result.error || '提交失败', icon: 'none' })
      }
    } catch (error) {
      console.error('提交评价失败:', error)
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  // 修改评价
  onModifyRating() {
    this.setData({ hasSubmitted: false })
  },

  // 加载更多
  onLoadMore() {
    this.setData({
      page: this.data.page + 1
    })
    this.loadReviews(true)
  },

  // 预览评价图片
  onPreviewReviewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.reviews.reduce((acc, item) => acc.concat(item.images || []), [])
    })
  },

  // 获取标签文本
  getTagText(tagId) {
    const tag = tagList.find(t => t.id === tagId)
    return tag ? tag.text : tagId
  },

  // 获取标签图标
  getTagIcon(tagId) {
    const tag = tagList.find(t => t.id === tagId)
    return tag ? tag.icon : '🏷️'
  },

  // 格式化时间
  formatTime(time) {
    if (!time) return ''
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60 * 1000) return '刚刚'
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
    if (diff < 30 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})