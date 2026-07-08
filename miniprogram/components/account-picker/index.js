// components/account-picker/index.js
Component({
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false
    },
    // 账户列表
    accountList: {
      type: Array,
      value: []
    },
    // 当前选中的账户ID
    selectedId: {
      type: String,
      value: ''
    },
    // 加载状态
    loading: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    // 关闭弹窗
    onClose() {
      this.triggerEvent('close')
    },

    // 阻止冒泡（点击内容区域不关闭）
    onStopPropagation() {
      // 阻止事件冒泡，点击内容区域不关闭弹窗
    },

    // 选择不关联账户
    onSelectNone() {
      this.triggerEvent('select', { id: '', name: '' })
    },

    // 选择账户
    onSelectAccount(e) {
      const { id, name } = e.currentTarget.dataset
      this.triggerEvent('select', { id, name })
    }
  }
})
