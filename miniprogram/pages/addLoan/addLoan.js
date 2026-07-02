/**
 * 新建借款页面
 * 填写借款信息
 */
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 是否为编辑模式
    isEdit: false,
    // 借款ID（编辑模式）
    loanId: '',
    // 当前类型：lend（借出）/ borrow（借入）
    currentType: 'lend',
    // 表单数据
    form: {
      amount: '',
      personName: '',
      loanDate: '',
      accountId: '',
      accountName: '',
      remark: '',
      images: []
    },
    // 账户列表
    accountList: [],
    // 最大图片数量
    maxImages: 4
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id, type } = options

    if (id) {
      // 编辑模式
      this.setData({ isEdit: true, loanId: id })
      this.loadLoanData(id)
    } else {
      // 新增模式
      this.setData({
        currentType: type || 'lend',
        'form.loanDate': this.formatDate(new Date())
      })
    }

    this.loadAccountList()
  },

  /**
   * 加载借款数据（编辑模式）
   */
  async loadLoanData(id) {
    wx.showLoading({ title: '加载中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'loanFunctions',
        data: {
          action: 'get',
          data: { id }
        }
      })

      if (res.result.success) {
        const loan = res.result.data
        this.setData({
          currentType: loan.type,
          form: {
            amount: loan.amount.toString(),
            personName: loan.personName,
            loanDate: this.formatDate(new Date(loan.loanDate)),
            accountId: loan.accountId || '',
            remark: loan.remark || '',
            images: loan.images || []
          }
        })
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('加载借款数据失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 加载账户列表
   */
  async loadAccountList() {
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
      console.error('加载账户列表失败：', err)
    }
  },

  /**
   * 切换类型
   */
  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ currentType: type })
  },

  /**
   * 输入金额
   */
  onAmountInput(e) {
    this.setData({
      'form.amount': e.detail.value
    })
  },

  /**
   * 输入姓名
   */
  onPersonNameInput(e) {
    this.setData({
      'form.personName': e.detail.value.trim()
    })
  },

  /**
   * 选择日期
   */
  onDateChange(e) {
    this.setData({
      'form.loanDate': e.detail.value
    })
  },

  /**
   * 选择账户
   */
  onAccountChange(e) {
    const index = e.detail.value
    const account = this.data.accountList[index]

    this.setData({
      'form.accountId': account._id,
      'form.accountName': account.name
    })
  },

  /**
   * 输入备注
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
    const remaining = this.data.maxImages - this.data.form.images.length

    if (remaining <= 0) {
      wx.showToast({
        title: `最多上传${this.data.maxImages}张图片`,
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
  removeImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.form.images]
    images.splice(index, 1)
    this.setData({
      'form.images': images
    })
  },

  /**
   * 保存借款
   */
  async saveLoan() {
    const { form, isEdit, loanId, currentType } = this.data

    // 参数校验
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    if (!form.personName) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    if (!form.loanDate) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })
      return
    }

    // 校验是否选择了账户
    if (!form.accountId) {
      wx.showToast({
        title: '请选择账户',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      // 上传图片
      const imageUrls = await this.uploadImages(form.images)

      const data = {
        type: currentType,
        amount: Math.abs(Number(form.amount)),
        personName: form.personName,
        loanDate: form.loanDate,
        accountId: form.accountId,
        remark: form.remark,
        images: imageUrls
      }

      let res

      if (isEdit) {
        // 编辑模式
        data.id = loanId
        res = await wx.cloud.callFunction({
          name: 'loanFunctions',
          data: {
            action: 'update',
            data
          }
        })
      } else {
        // 新增模式 - 创建借出/借入记录
        res = await wx.cloud.callFunction({
          name: 'loanFunctions',
          data: {
            action: 'add',
            data
          }
        })

        // 创建成功后，联动更新账户余额
        if (res.result.success && form.accountId) {
          const amount = Math.abs(Number(form.amount))
          // 借出：减少账户余额（负数）；借入：增加账户余额（正数）
          const balanceChange = currentType === 'lend' ? -amount : amount

          const updateRes = await wx.cloud.callFunction({
            name: 'accountFunctions',
            data: {
              action: 'updateBalance',
              data: {
                id: form.accountId,
                amount: balanceChange
              }
            }
          })

          if (!updateRes.result.success) {
            console.error('更新账户余额失败：', updateRes.result.error)
            // 即使余额更新失败，借出/借入记录已创建，提示用户
            wx.showToast({
              title: '记录已保存，但余额更新失败',
              icon: 'none'
            })
          }
        }
      }

      if (res.result.success) {
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: res.result.error || '保存失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('保存借款失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  /**
   * 上传图片到云存储
   */
  async uploadImages(images) {
    if (!images || images.length === 0) {
      return []
    }

    const uploadPromises = images.map((image, index) => {
      const cloudPath = `loan-images/${Date.now()}-${index}.jpg`
      return wx.cloud.uploadFile({
        cloudPath,
        filePath: image
      })
    })

    const results = await Promise.all(uploadPromises)
    return results.map(result => result.fileID)
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
