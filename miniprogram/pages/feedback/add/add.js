// pages/feedback/add/add.js
const app = getApp()

Page({
  data: {
    feedbackId: '', // 反馈ID（编辑模式）
    isEdit: false, // 是否为编辑模式
    feedbackType: '',
    content: '',
    images: [],
    contact: '',
    canSubmit: false,
    submitting: false
  },

  onLoad(options) {
    // 判断是否为编辑模式
    if (options.id) {
      this.setData({
        feedbackId: options.id,
        isEdit: true
      })
      // 加载反馈详情
      this.loadFeedbackDetail(options.id)
      // 设置页面标题
      wx.setNavigationBarTitle({ title: '修改反馈' })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 选择问题类型
  selectType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ feedbackType: type })
    this.updateCanSubmit()
  },

  // 输入问题描述
  onInputContent(e) {
    this.setData({ content: e.detail.value })
    this.updateCanSubmit()
  },

  // 输入联系方式
  onInputContact(e) {
    this.setData({ contact: e.detail.value })
  },

  // 更新提交按钮状态
  updateCanSubmit() {
    const { feedbackType, content } = this.data
    const canSubmit = !!(feedbackType && content.trim())
    this.setData({ canSubmit })
  },

  // 加载反馈详情（编辑模式）
  async loadFeedbackDetail(feedbackId) {
    try {
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: {
          action: 'getDetail',
          data: { feedbackId }
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        const feedback = res.result.data
        this.setData({
          feedbackType: feedback.type,
          content: feedback.content,
          images: feedback.images || [],
          contact: feedback.contact || ''
        })
        this.updateCanSubmit()
      } else {
        wx.showToast({ title: res.result.error || '加载失败', icon: 'none' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (err) {
      wx.hideLoading()
      console.error('加载反馈详情失败：', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 选择图片
  chooseImage() {
    const remaining = 3 - this.data.images.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传3张图片', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath)
        this.setData({
          images: [...this.data.images, ...newImages]
        })
      }
    })
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 提交反馈
  async onSubmit() {
    if (this.data.submitting) return

    const { feedbackType, content, images, contact } = this.data

    // 验证
    if (!feedbackType) {
      wx.showToast({ title: '请选择问题类型', icon: 'none' })
      return
    }

    if (!content.trim()) {
      wx.showToast({ title: '请输入问题描述', icon: 'none' })
      return
    }

    // 内容安全检测
    wx.showLoading({ title: '检测中...' })
    try {
      const checkResult = await this.checkContentSafe(content)
      if (!checkResult) {
        wx.hideLoading()
        wx.showModal({
          title: '内容不合规',
          content: '您提交的内容包含违规信息，请修改后重试',
          showCancel: false
        })
        return
      }
    } catch (err) {
      wx.hideLoading()
      console.error('内容检测失败：', err)
      // 检测失败时允许提交，由后台再次审核
    }

    // 上传图片
    wx.showLoading({ title: '上传中...' })
    let uploadedImages = []
    if (images.length > 0) {
      uploadedImages = await this.uploadImages(images)
    }

    // 提交反馈
    wx.showLoading({ title: '提交中...' })
    try {
      const { isEdit, feedbackId } = this.data
      const action = isEdit ? 'update' : 'create'
      const actionData = isEdit
        ? {
            feedbackId,
            type: feedbackType,
            content: content.trim(),
            images: uploadedImages,
            contact: contact.trim()
          }
        : {
            type: feedbackType,
            content: content.trim(),
            images: uploadedImages,
            contact: contact.trim()
          }

      const res = await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: {
          action,
          data: actionData
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({ title: isEdit ? '修改成功' : '提交成功', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: res.result.error || '提交失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('提交反馈失败：', err)
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    }
  },

  // 内容安全检测
  async checkContentSafe(content) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'feedbackFunctions',
        data: {
          action: 'checkSafe',
          data: { content }
        }
      })
      return res.result.safe
    } catch (err) {
      console.error('内容检测失败：', err)
      return true // 检测失败时允许提交
    }
  },

  // 上传图片
  async uploadImages(images) {
    const uploadPromises = images.map(async (imagePath, index) => {
      try {
        const cloudPath = `feedback-images/${Date.now()}-${index}.png`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: imagePath
        })
        return uploadRes.fileID
      } catch (err) {
        console.error('上传图片失败：', err)
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    return results.filter(url => url !== null)
  }
})
