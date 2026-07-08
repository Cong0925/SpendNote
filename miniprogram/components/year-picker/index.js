Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    currentYear: {
      type: Number,
      value: new Date().getFullYear()
    },
    yearList: {
      type: Array,
      value: []
    }
  },

  data: {},

  methods: {
    // 关闭弹窗
    onClose() {
      this.triggerEvent('close')
    },

    // 选择年度
    onSelectYear(e) {
      const year = e.currentTarget.dataset.year
      this.triggerEvent('select', { year })
    },

    // 阻止滚动穿透
    preventMove() {
      return
    }
  }
})
