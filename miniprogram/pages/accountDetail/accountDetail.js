/**
 * 账户详情页面 - 完全重构
 * 从零开始设计，参考账单详情和统计页面
 * 功能：显示/编辑账户信息，删除账户
 */
const app = getApp()

Page({
  data: {
    isEdit: false,
    accountId: '',
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
    }
  },

  onLoad(options) {
    const { id, type, name, icon, isDebt, bankId, bankName } = options

    if (id) {
      this.setData({ isEdit: true, accountId: id })
      this.loadAccount(id)
    } else {
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

  async loadAccount(id) {
    wx.showLoading({ title: '加载中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: { action: 'get', data: { id } }
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
          }
        })
      }
    } catch (err) {
      console.error('加载账户失败：', err)
    } finally {
      wx.hideLoading()
    }
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value.trim() })
  },

  onBalanceInput(e) {
    this.setData({ 'form.balance': e.detail.value })
  },

  onCardLast4Input(e) {
    this.setData({ 'form.bankCardLast4': e.detail.value.replace(/\D/g, '').slice(0, 4) })
  },

  onRemarkInput(e) {
    this.setData({ 'form.remark': e.detail.value })
  },

  async saveAccount() {
    const { form, isEdit, accountId } = this.data

    if (!form.name) {
      wx.showToast({ title: '请输入账户名称', icon: 'none' })
      return
    }

    if (form.balance === '' || isNaN(Number(form.balance))) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
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
        data.id = accountId
        res = await wx.cloud.callFunction({
          name: 'accountFunctions',
          data: { action: 'update', data }
        })
      } else {
        res = await wx.cloud.callFunction({
          name: 'accountFunctions',
          data: { action: 'add', data }
        })
      }

      if (res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/account/account' })
        }, 1500)
      } else {
        wx.showToast({ title: res.result.error || '保存失败', icon: 'none' })
      }
    } catch (err) {
      console.error('保存账户失败：', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async deleteAccount() {
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个账户吗？',
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirmed) return

    wx.showLoading({ title: '删除中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'accountFunctions',
        data: { action: 'delete', data: { id: this.data.accountId } }
      })

      if (res.result.success) {
        wx.showToast({ title: '删除成功', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/account/account' })
        }, 1500)
      } else {
        wx.showToast({ title: '删除失败', icon: 'none' })
      }
    } catch (err) {
      console.error('删除账户失败：', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  }
})
