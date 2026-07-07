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
    currentFilter: 'all',
    showSkeleton: true,  // 初次加载骨架屏显示状态
    showListSkeleton: false  // 切换筛选时列表骨架屏显示状态
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
    // 数据加载完成后隐藏骨架屏
    this.setData({ showSkeleton: false })
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
          pageSize: this.data.pageSize,
          filter: this.data.currentFilter
        }
      })

      if (res.result.success) {
        const { list, total, avgRating, goodCount, midCount, badCount, hasImageCount } = res.result.data

        const formattedList = list.map(item => ({
          ...item,
          tags: this.formatTags(item.selectedTags),
          images: this.fixImagePaths(item.images),
          createTimeStr: this.formatTime(item.createTime)
        }))

        let allReviews = append ? [...this.data.reviews, ...formattedList] : formattedList

        // 后端已处理我的评价置顶逻辑，这里直接使用返回的数据
        this.setData({
          reviews: allReviews,
          filteredReviews: allReviews,
          totalCount: total,
          goodCount,
          midCount,
          badCount,
          hasImageCount,
          avgRating: avgRating.toFixed(1),
          hasMore: formattedList.length === this.data.pageSize,
          showSkeleton: false,  // 初次加载完成后隐藏骨架屏
          showListSkeleton: false  // 列表数据加载完成后隐藏列表骨架屏
        })
      }
    } catch (error) {
      console.error('加载评价列表失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ showSkeleton: false, showListSkeleton: false })  // 加载失败也隐藏骨架屏
    } finally {
      this.setData({ loading: false })
    }
  },

  // 筛选评价（保留兼容性，但主要逻辑已在后端）
  filterReviews(reviews, filter) {
    return reviews
  },

  // 筛选切换
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter
    if (filter === this.data.currentFilter) return

    this.setData({
      currentFilter: filter,
      page: 1,
      reviews: [],
      filteredReviews: [],
      hasMore: true,
      showListSkeleton: true  // 切换筛选时显示列表骨架屏
    })
    this.loadReviews()
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
        // 重置所有状态，回到初始展示界面
        this.setData({
          hasSubmitted: true,
          isEditing: false,
          page: 1,
          currentFilter: 'all',
          userRating: 0,
          ratingText: '',
          selectedTags: [],
          comment: '',
          uploadedImages: []
        })
        this.updateTagsActiveState()
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

  // 获取标签文本（保留兼容性）
  getTagText(tagId) {
    const tag = tagList.find(t => t.id === tagId)
    return tag ? tag.text : tagId
  },

  // 获取标签图标（保留兼容性）
  getTagIcon(tagId) {
    const tag = tagList.find(t => t.id === tagId)
    return tag ? tag.icon : '🏷️'
  },

  // 预处理标签数据，将 tagId 转换为完整对象
  formatTags(tagIds) {
    if (!tagIds || !Array.isArray(tagIds)) return []
    return tagIds.map(tagId => {
      const tag = tagList.find(t => t.id === tagId)
      return tag ? { id: tag.id, icon: tag.icon, text: tag.text } : { id: tagId, icon: '🏷️', text: tagId }
    })
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

    // 防止重复点击
    if (this._likeAnimating) return
    this._likeAnimating = true
    setTimeout(() => { this._likeAnimating = false }, 400)

    // 先找到当前项，获取旧状态
    const { filteredReviews, reviews } = this.data
    const likeIndex = filteredReviews.findIndex(item => item._id === ratingId)
    if (likeIndex < 0) return

    const currentItem = filteredReviews[likeIndex]
    const wasLiked = currentItem.isLiked
    const wasDisliked = currentItem.isDisliked
    const newIsLiked = !wasLiked

    // 乐观UI更新：使用路径语法只更新具体项，避免整个列表重绘
    const updateData = {
      [`filteredReviews[${likeIndex}].isLiked`]: newIsLiked,
      [`filteredReviews[${likeIndex}].likes`]: currentItem.likes + (newIsLiked ? 1 : -1),
      [`filteredReviews[${likeIndex}].isDisliked`]: false,
      [`filteredReviews[${likeIndex}].dislikes`]: wasDisliked ? currentItem.dislikes - 1 : currentItem.dislikes
    }

    // 同步更新 reviews 数组中对应项
    const reviewsIndex = reviews.findIndex(item => item._id === ratingId)
    if (reviewsIndex >= 0) {
      updateData[`reviews[${reviewsIndex}].isLiked`] = newIsLiked
      updateData[`reviews[${reviewsIndex}].likes`] = currentItem.likes + (newIsLiked ? 1 : -1)
      updateData[`reviews[${reviewsIndex}].isDisliked`] = false
      updateData[`reviews[${reviewsIndex}].dislikes`] = wasDisliked ? currentItem.dislikes - 1 : currentItem.dislikes
    }

    this.setData(updateData)

    // 异步调用云函数
    try {
      const res = await wx.cloud.callFunction({
        name: 'rating',
        data: {
          action: 'likeRating',
          ratingId
        }
      })

      if (!res.result.success) {
        // 失败时回滚本地状态
        const revertData = {
          [`filteredReviews[${likeIndex}].isLiked`]: wasLiked,
          [`filteredReviews[${likeIndex}].likes`]: currentItem.likes + (wasLiked ? 1 : -1),
          [`filteredReviews[${likeIndex}].isDisliked`]: wasDisliked,
          [`filteredReviews[${likeIndex}].dislikes`]: wasDisliked ? currentItem.dislikes + 1 : currentItem.dislikes
        }
        if (reviewsIndex >= 0) {
          revertData[`reviews[${reviewsIndex}].isLiked`] = wasLiked
          revertData[`reviews[${reviewsIndex}].likes`] = currentItem.likes + (wasLiked ? 1 : -1)
          revertData[`reviews[${reviewsIndex}].isDisliked`] = wasDisliked
          revertData[`reviews[${reviewsIndex}].dislikes`] = wasDisliked ? currentItem.dislikes + 1 : currentItem.dislikes
        }
        this.setData(revertData)
        wx.showToast({ title: res.result.error || '操作失败', icon: 'none' })
      }
    } catch (error) {
      console.error('点赞失败:', error)
      // 失败时回滚
      const revertData = {
        [`filteredReviews[${likeIndex}].isLiked`]: wasLiked,
        [`filteredReviews[${likeIndex}].likes`]: currentItem.likes + (wasLiked ? 1 : -1),
        [`filteredReviews[${likeIndex}].isDisliked`]: wasDisliked,
        [`filteredReviews[${likeIndex}].dislikes`]: wasDisliked ? currentItem.dislikes + 1 : currentItem.dislikes
      }
      if (reviewsIndex >= 0) {
        revertData[`reviews[${reviewsIndex}].isLiked`] = wasLiked
        revertData[`reviews[${reviewsIndex}].likes`] = currentItem.likes + (wasLiked ? 1 : -1)
        revertData[`reviews[${reviewsIndex}].isDisliked`] = wasDisliked
        revertData[`reviews[${reviewsIndex}].dislikes`] = wasDisliked ? currentItem.dislikes + 1 : currentItem.dislikes
      }
      this.setData(revertData)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 踩
  async onDislike(e) {
    const ratingId = e.currentTarget.dataset.id

    // 防止重复点击
    if (this._dislikeAnimating) return
    this._dislikeAnimating = true
    setTimeout(() => { this._dislikeAnimating = false }, 400)

    // 先找到当前项，获取旧状态
    const { filteredReviews, reviews } = this.data
    const dislikeIndex = filteredReviews.findIndex(item => item._id === ratingId)
    if (dislikeIndex < 0) return

    const currentItem = filteredReviews[dislikeIndex]
    const wasLiked = currentItem.isLiked
    const wasDisliked = currentItem.isDisliked
    const newIsDisliked = !wasDisliked

    // 乐观UI更新：使用路径语法只更新具体项，避免整个列表重绘
    const updateData = {
      [`filteredReviews[${dislikeIndex}].isDisliked`]: newIsDisliked,
      [`filteredReviews[${dislikeIndex}].dislikes`]: currentItem.dislikes + (newIsDisliked ? 1 : -1),
      [`filteredReviews[${dislikeIndex}].isLiked`]: false,
      [`filteredReviews[${dislikeIndex}].likes`]: wasLiked ? currentItem.likes - 1 : currentItem.likes
    }

    // 同步更新 reviews 数组中对应项
    const reviewsIndex = reviews.findIndex(item => item._id === ratingId)
    if (reviewsIndex >= 0) {
      updateData[`reviews[${reviewsIndex}].isDisliked`] = newIsDisliked
      updateData[`reviews[${reviewsIndex}].dislikes`] = currentItem.dislikes + (newIsDisliked ? 1 : -1)
      updateData[`reviews[${reviewsIndex}].isLiked`] = false
      updateData[`reviews[${reviewsIndex}].likes`] = wasLiked ? currentItem.likes - 1 : currentItem.likes
    }

    this.setData(updateData)

    // 异步调用云函数
    try {
      const res = await wx.cloud.callFunction({
        name: 'rating',
        data: {
          action: 'dislikeRating',
          ratingId
        }
      })

      if (!res.result.success) {
        // 失败时回滚本地状态
        const revertData = {
          [`filteredReviews[${dislikeIndex}].isDisliked`]: wasDisliked,
          [`filteredReviews[${dislikeIndex}].dislikes`]: currentItem.dislikes + (wasDisliked ? 1 : -1),
          [`filteredReviews[${dislikeIndex}].isLiked`]: wasLiked,
          [`filteredReviews[${dislikeIndex}].likes`]: wasLiked ? currentItem.likes + 1 : currentItem.likes
        }
        if (reviewsIndex >= 0) {
          revertData[`reviews[${reviewsIndex}].isDisliked`] = wasDisliked
          revertData[`reviews[${reviewsIndex}].dislikes`] = currentItem.dislikes + (wasDisliked ? 1 : -1)
          revertData[`reviews[${reviewsIndex}].isLiked`] = wasLiked
          revertData[`reviews[${reviewsIndex}].likes`] = wasLiked ? currentItem.likes + 1 : currentItem.likes
        }
        this.setData(revertData)
        wx.showToast({ title: res.result.error || '操作失败', icon: 'none' })
      }
    } catch (error) {
      console.error('踩失败:', error)
      // 失败时回滚
      const revertData = {
        [`filteredReviews[${dislikeIndex}].isDisliked`]: wasDisliked,
        [`filteredReviews[${dislikeIndex}].dislikes`]: currentItem.dislikes + (wasDisliked ? 1 : -1),
        [`filteredReviews[${dislikeIndex}].isLiked`]: wasLiked,
        [`filteredReviews[${dislikeIndex}].likes`]: wasLiked ? currentItem.likes + 1 : currentItem.likes
      }
      if (reviewsIndex >= 0) {
        revertData[`reviews[${reviewsIndex}].isDisliked`] = wasDisliked
        revertData[`reviews[${reviewsIndex}].dislikes`] = currentItem.dislikes + (wasDisliked ? 1 : -1)
        revertData[`reviews[${reviewsIndex}].isLiked`] = wasLiked
        revertData[`reviews[${reviewsIndex}].likes`] = wasLiked ? currentItem.likes + 1 : currentItem.likes
      }
      this.setData(revertData)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})