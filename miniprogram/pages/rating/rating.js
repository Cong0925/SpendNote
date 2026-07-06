// pages/rating/rating.js - Premium Rating Experience
const ratingTexts = {
  1: '非常不满意',
  2: '不太满意',
  3: '一般般',
  4: '比较满意',
  5: '非常满意'
}

const tagList = [
  { id: 'ui', icon: '🎨', text: '界面美观', desc: '界面设计精美，配色舒适，看着就很舒服！' },
  { id: 'easy', icon: '✨', text: '操作简单', desc: '操作简单易上手，功能一目了然，非常方便！' },
  { id: 'feature', icon: '🚀', text: '功能实用', desc: '功能实用又齐全，记账需求都能满足！' },
  { id: 'speed', icon: '⚡', text: '运行流畅', desc: '运行流畅不卡顿，使用体验非常顺畅！' },
  { id: 'safe', icon: '🔒', text: '数据安全', desc: '数据安全有保障，隐私保护做得很好！' },
  { id: 'free', icon: '🆓', text: '完全免费', desc: '完全免费无广告，良心软件必须支持！' }
]

Page({
  data: {
    hasSubmitted: false,
    isEditing: false,
    userRating: 0,
    ratingText: '',
    ratingTexts: ratingTexts,
    tags: [],
    selectedTags: [],
    comment: '',
    uploadedImages: [],
    isSubmitting: false,
    myRating: null,
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
    this.initTags()
    this.loadData()
  },

  // 初始化标签列表，添加选中状态
  initTags() {
    const tags = tagList.map(tag => ({
      ...tag,
      isActive: false
    }))
    this.setData({ tags })
  },

  // 更新标签选中状态
  updateTagsActiveState() {
    const { selectedTags } = this.data
    const tags = tagList.map(tag => ({
      ...tag,
      isActive: selectedTags.includes(tag.id)
    }))
    this.setData({ tags })
  },

  // 加载数据
  async loadData() {
    await this.loadExistingRating()
    await this.loadReviews()
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
          myRating: existing,
          userRating: existing.rating,
          ratingText: ratingTexts[existing.rating] || '',
          selectedTags: existing.selectedTags || [],
          comment: existing.comment || '',
          uploadedImages: this.fixImagePaths(existing.images)
        })
        this.updateTagsActiveState()
      } else {
        this.setData({
          hasSubmitted: false,
          myRating: null,
          userRating: 0,
          ratingText: '',
          selectedTags: [],
          comment: '',
          uploadedImages: []
        })
      }
    } catch (error) {
      console.error('加载已有评价失败:', error)
      this.setData({
        hasSubmitted: false,
        myRating: null
      })
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
          images: this.fixImagePaths(item.images),
          createTimeStr: this.formatTime(item.createTime)
        }))

        let allReviews = append ? [...this.data.reviews, ...formattedList] : formattedList

        // 确保我的评价始终在列表顶部（去重）
        const { myRating } = this.data
        if (myRating) {
          const myReviewInList = allReviews.find(item => item.isMine)
          if (!myReviewInList) {
            // 如果当前列表中没有我的评价，添加到顶部
            const myReview = {
              _id: myRating._id,
              rating: myRating.rating,
              selectedTags: myRating.selectedTags,
              comment: myRating.comment,
              images: this.fixImagePaths(myRating.images),
              createTime: myRating.createTime,
              likes: myRating.likes || 0,
              dislikes: myRating.dislikes || 0,
              isMine: true,
              isLiked: false,
              isDisliked: false,
              avatarUrl: '',
              nickName: '用户',
              createTimeStr: this.formatTime(myRating.createTime)
            }
            allReviews.unshift(myReview)
          } else {
            // 如果列表中有我的评价，确保它在顶部
            allReviews = allReviews.filter(item => !item.isMine)
            allReviews.unshift(myReviewInList)
          }
        }

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

  // 点击标签 - 切换选中状态并更新评论
  onTapTag(e) {
    const tagId = e.currentTarget.dataset.id
    let selectedTags = [...this.data.selectedTags]
    let comment = this.data.comment || ''

    // 获取标签描述
    const tag = tagList.find(t => t.id === tagId)
    if (!tag) return

    if (selectedTags.includes(tagId)) {
      // 取消选中：移除标签描述
      selectedTags = selectedTags.filter(id => id !== tagId)
      comment = this.removeTagDesc(comment, tag.desc)
    } else {
      // 选中：添加标签描述
      selectedTags.push(tagId)
      comment = this.addTagDesc(comment, tag.desc)
    }

    this.setData({ selectedTags, comment })
    this.updateTagsActiveState()
  },

  // 添加标签描述到评论
  addTagDesc(comment, desc) {
    if (!comment) return desc
    // 检查是否已存在
    if (comment.includes(desc)) return comment
    // 换行添加
    return comment + '\n' + desc
  },

  // 从评论中移除标签描述
  removeTagDesc(comment, desc) {
    if (!comment) return ''
    // 移除描述及前面的换行符
    let newComment = comment.replace('\n' + desc, '')
    // 如果描述在开头
    if (newComment === comment) {
      newComment = comment.replace(desc, '')
    }
    // 清理多余的换行符
    newComment = newComment.replace(/^\n+|\n+$/g, '').replace(/\n{2,}/g, '\n')
    return newComment
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
    const { userRating, selectedTags, comment, uploadedImages, isEditing, myRating } = this.data

    if (!userRating) {
      wx.showToast({ title: '请先评分', icon: 'none' })
      return
    }

    this.setData({ isSubmitting: true })

    try {
      // 如果是修改模式且有评价记录，则更新；否则新增
      const action = (isEditing && myRating) ? 'updateRating' : 'submitRating'
      const res = await wx.cloud.callFunction({
        name: 'rating',
        data: {
          action,
          ratingId: myRating?._id,
          rating: userRating,
          selectedTags,
          comment: comment.trim(),
          images: uploadedImages
        }
      })

      if (res.result.success) {
        wx.showToast({ title: action === 'updateRating' ? '修改成功' : '评价成功', icon: 'success' })
        this.setData({
          hasSubmitted: true,
          isEditing: false,
          page: 1
        })
        this.loadData()
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

  // 进入添加评价模式
  onAddRating() {
    this.setData({
      isEditing: true,
      userRating: 0,
      ratingText: '',
      selectedTags: [],
      comment: '',
      uploadedImages: []
    })
    this.updateTagsActiveState()
  },

  // 进入修改评价模式
  onModifyRating() {
    this.setData({ isEditing: true })
  },

  // 取消编辑
  onCancelEdit() {
    this.setData({ isEditing: false })
    this.loadData()
  },

  // 删除评价
  onDeleteRating() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除我的评价吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const { myRating } = this.data
            const result = await wx.cloud.callFunction({
              name: 'rating',
              data: {
                action: 'deleteRating',
                ratingId: myRating._id
              }
            })

            if (result.result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              this.setData({
                hasSubmitted: false,
                isEditing: false,
                myRating: null,
                page: 1
              })
              this.loadData()
            } else {
              wx.showToast({ title: result.result.error || '删除失败', icon: 'none' })
            }
          } catch (error) {
            console.error('删除评价失败:', error)
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
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

  // 修复图片路径，确保是云存储格式
  fixImagePaths(images) {
    if (!images || !Array.isArray(images)) return []
    return images.map(img => {
      if (!img) return ''
      // 如果路径包含/cloud://但前面有其他内容，提取cloud://部分
      if (img.includes('cloud://') && !img.startsWith('cloud://')) {
        const cloudIndex = img.indexOf('cloud://')
        return img.substring(cloudIndex)
      }
      return img
    }).filter(img => img)
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
  },

  // 点赞
  async onLike(e) {
    const ratingId = e.currentTarget.dataset.id
    try {
      const res = await wx.cloud.callFunction({
        name: 'rating',
        data: {
          action: 'likeRating',
          ratingId
        }
      })

      if (res.result.success) {
        // 只更新本地状态，不重新加载列表
        const { filteredReviews, reviews } = this.data
        const updateList = (list) => list.map(item => {
          if (item._id === ratingId) {
            const isLiked = res.result.isLiked
            return {
              ...item,
              isLiked,
              likes: item.likes + (isLiked ? 1 : -1),
              isDisliked: false,
              dislikes: item.isDisliked ? item.dislikes - 1 : item.dislikes
            }
          }
          return item
        })
        this.setData({
          filteredReviews: updateList(filteredReviews),
          reviews: updateList(reviews)
        })
      } else {
        wx.showToast({ title: res.result.error || '操作失败', icon: 'none' })
      }
    } catch (error) {
      console.error('点赞失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 踩
  async onDislike(e) {
    const ratingId = e.currentTarget.dataset.id
    try {
      const res = await wx.cloud.callFunction({
        name: 'rating',
        data: {
          action: 'dislikeRating',
          ratingId
        }
      })

      if (res.result.success) {
        // 只更新本地状态，不重新加载列表
        const { filteredReviews, reviews } = this.data
        const updateList = (list) => list.map(item => {
          if (item._id === ratingId) {
            const isDisliked = res.result.isDisliked
            return {
              ...item,
              isDisliked,
              dislikes: item.dislikes + (isDisliked ? 1 : -1),
              isLiked: false,
              likes: item.isLiked ? item.likes - 1 : item.likes
            }
          }
          return item
        })
        this.setData({
          filteredReviews: updateList(filteredReviews),
          reviews: updateList(reviews)
        })
      } else {
        wx.showToast({ title: res.result.error || '操作失败', icon: 'none' })
      }
    } catch (error) {
      console.error('踩失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})