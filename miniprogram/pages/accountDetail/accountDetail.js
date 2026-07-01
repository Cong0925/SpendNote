/**
 * 账户详情页面
 * 填写或编辑账户信息
 */
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 是否为编辑模式
    isEdit: false,
    // 账户ID（编辑模式）
    accountId: '',
    // 表单数据
    form: {
      name: '',
      type: '',
      icon: '',
      isDebt: false,
      balance: '',
      bankName: '',
      bankId: '',
      bankCardLast4: '',
      remark: ''
    },
    // 原始数据（用于编辑模式）
    originalData: null,
    // 负债类账户的默认备注
    debtDefaultRemark: '',
    // 资产类银行卡的默认备注
    assetBankDefaultRemark: '工资卡'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id, type, name, icon, isDebt, bankId, bankName } = options

    if (id) {
      // 编辑模式
      this.setData({ isEdit: true, accountId: id })
      this.loadAccountData(id)
    } else {
      // 新增模式
      const isDebtBool = isDebt === 'true'
      this.setData({
        'form.type': type,
        'form.name': decodeURIComponent(name || ''),
        'form.icon': decodeURIComponent(icon || ''),
        'form.isDebt': isDebtBool,
        'form.bankName': bankName ? decodeURIComponent(bankName) : '',
        'form.bankId': bankId || '',
        'form.remark': isDebtBool ? '' : (bankName ? '工资卡' : '')
      })
    }
  },

  /**
   * 加载账户数据（编辑模式）
   */
  async loadAccountData(id) {
    wx.showLoading({ title: '加载中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'get',
          data: { id }
        }
      })

      if (res.result.success) {
        const account = res.result.data
        this.setData({
          form: {
            name: account.name,
            type: account.type,
            icon: account.icon,
            isDebt: account.isDebt,
            balance: account.balance.toString(),
            bankName: account.bankName || '',
            bankCardLast4: account.bankCardLast4 || '',
            remark: account.remark || ''
          },
          originalData: account
        })
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('加载账户数据失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 输入账户名称
   */
  onNameInput(e) {
    this.setData({
      'form.name': e.detail.value.trim()
    })
  },

  /**
   * 输入余额/应还金额
   */
  onBalanceInput(e) {
    this.setData({
      'form.balance': e.detail.value
    })
  },

  /**
   * 输入银行卡号后四位
   */
  onCardLast4Input(e) {
    const value = e.detail.value.replace(/\D/g, '').slice(0, 4)
    this.setData({
      'form.bankCardLast4': value
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
   * 保存账户
   */
  async saveAccount() {
    const { form, isEdit, accountId } = this.data

    // 参数校验
    if (!form.name) {
      wx.showToast({
        title: '请输入账户名称',
        icon: 'none'
      })
      return
    }

    if (form.balance === '' || isNaN(Number(form.balance))) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const data = {
        name: form.name,
        type: form.type,
        icon: form.icon,
        isDebt: form.isDebt,
        balance: Math.abs(Number(form.balance)),
        bankName: form.bankName,
        bankCardLast4: form.bankCardLast4,
        remark: form.remark
      }

      let res

      if (isEdit) {
        // 编辑模式
        data.id = accountId
        res = await wx.cloud.callFunction({
          name: 'accountFunctions',
          data: {
            action: 'update',
            data
          }
        })
      } else {
        // 新增模式
        res = await wx.cloud.callFunction({
          name: 'accountFunctions',
          data: {
            action: 'add',
            data
          }
        })
      }

      if (res.result.success) {
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        // 跳转到账户主页（tabBar页面需要使用switchTab）
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/account/account'
          })
        }, 1500)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: res.result.error || '保存失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('保存账户失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  /**
   * 删除账户
   */
  async deleteAccount() {
    const { accountId, isEdit } = this.data

    if (!isEdit) return

    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个账户吗？',
        success: (res) => {
          resolve(res.confirm)
        }
      })
    })

    if (!confirmed) return

    wx.showLoading({ title: '删除中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: {
          action: 'delete',
          data: { id: accountId }
        }
      })

      if (res.result.success) {
        wx.hideLoading()
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        // 跳转到账户主页（tabBar页面需要使用switchTab）
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/account/account'
          })
        }, 1500)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('删除账户失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  }
})
