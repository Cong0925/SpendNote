/**
 * 收款/还款操作页面
 */
const app = getApp()
const { formatAmount } = require('../../utils/formatAmount')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 借款ID
    loanId: '',
    // 操作类型：receive=收款, repay=还款
    type: 'receive',
    // 借款信息
    loanInfo: null,
    // 表单数据
    form: {
      amount: '',
      date: '',
      accountId: '',
      accountName: '',
      remark: '',
      images: []
    },
    // 最大可操作金额
    maxAmount: 0,
    // 页面标题
    pageTitle: '收款',
    // 账户选择相关
    showAccountPicker: false,
    accountList: [],
    loadingAccounts: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.loanId && options.type) {
      this.setData({
        loanId: options.loanId,
        type: options.type
      })

      // 设置默认日期为今天
      const today = this.formatDate(new Date())
      this.setData({
        'form.date': today,
        'form.accountName': '不关联账户'
      })

      // 更新页面标题
      this.updatePageTitle()

      // 加载借款信息和账户列表
      this.loadLoanInfo()
      this.loadAccountList()
    }
  },

  /**
   * 加载借款信息
   */
  async loadLoanInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'loanFunctions',
        data: {
          action: 'get',
          data: { id: this.data.loanId }
        }
      })

      if (res.result.success) {
        const loan = res.result.data
        const remaining = loan.amount - (loan.paidAmount || 0)

        this.setData({
          loanInfo: {
            ...loan,
            amountStr: formatAmount(loan.amount),
            paidAmountStr: formatAmount(loan.paidAmount),
            remainingStr: formatAmount(remaining)
          },
          maxAmount: remaining
        })
      }
    } catch (err) {
      console.error('获取借款信息失败：', err)
    }
  },

  /**
   * 更新页面标题
   */
  updatePageTitle() {
    const title = this.data.type === 'receive' ? '收款' : '还款'
    this.setData({ pageTitle: title })
  },

  /**
   * 加载账户列表
   */
  async loadAccountList() {
    this.setData({ loadingAccounts: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'list'
        }
      })
      if (res.result.success) {
        this.setData({
          accountList: res.result.data || []
        })
      }
    } catch (err) {
      console.error('获取账户列表失败：', err)
    } finally {
      this.setData({ loadingAccounts: false })
    }
  },

  /**
   * 打开账户选择弹窗
   */
  openAccountPicker() {
    this.setData({ showAccountPicker: true })
  },

  /**
   * 关闭账户选择弹窗
   */
  onAccountPickerClose() {
    this.setData({ showAccountPicker: false })
  },

  /**
   * 账户选择
   */
  onAccountSelect(e) {
    const { id, name } = e.detail
    this.setData({
      'form.accountId': id,
      'form.accountName': name,
      showAccountPicker: false
    })
  },

  /**
   * 金额输入
   */
  onAmountInput(e) {
    const value = e.detail.value
    this.setData({
      'form.amount': value
    })
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    this.setData({
      'form.date': e.detail.value
    })
  },

  /**
   * 账户选择
   */
  onAccountSelect(e) {
    const account = e.detail
    this.setData({
      'form.accountId': account._id,
      'form.accountName': account.name
    })
  },

  /**
   * 备注输入
   */
  onRemarkInput(e) {
    this.setData({
      'form.remark': e.detail.value
    })
  },

  /**
   * 选择图片
   */
  chooseImage() {
    const remaining = 4 - this.data.form.images.length
    if (remaining <= 0) {
      wx.showToast({
        title: '最多上传4张图片',
        icon: 'none'
      })
      return
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath)
        this.setData({
          'form.images': [...this.data.form.images, ...newImages]
        })
      }
    })
  },

  /**
   * 删除图片
   */
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.form.images]
    images.splice(index, 1)
    this.setData({
      'form.images': images
    })
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.form.images
    })
  },

  /**
   * 保存
   */
  async save() {
    const { amount, date, accountId, remark, images } = this.data.form

    // 参数校验
    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    // 精度处理，避免浮点数精度问题
    const roundedAmount = Math.round(amountNum * 100) / 100
    const roundedMax = Math.round(this.data.maxAmount * 100) / 100

    if (roundedAmount > roundedMax) {
      wx.showToast({
        title: `金额不能超过${formatAmount(roundedMax)}元`,
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

    try {
      wx.showLoading({ title: '保存中...' })

      // 上传图片
      const uploadedImages = await this.uploadImages(images)

      // 添加操作记录
      const res = await wx.cloud.callFunction({
        name: 'loanPayments',
        data: {
          action: 'add',
          data: {
            loanId: this.data.loanId,
            type: this.data.type,
            amount: roundedAmount,
            date: date,
            accountId: accountId,
            accountName: this.data.form.accountName,
            remark: remark,
            images: uploadedImages
          }
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.error || '保存失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败：', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  /**
   * 上传图片
   */
  async uploadImages(images) {
    if (!images || images.length === 0) return []

    const uploadedUrls = []

    for (const image of images) {
      try {
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 1000)
        const cloudPath = `loan-payment-images/${timestamp}_${random}.jpg`

        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: image
        })

        uploadedUrls.push(uploadRes.fileID)
      } catch (err) {
        console.error('上传图片失败：', err)
      }
    }

    return uploadedUrls
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
