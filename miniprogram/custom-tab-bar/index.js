Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "账单",
        iconPath: "/images/icons/bill.png",
        selectedIconPath: "/images/icons/bill-active.png"
      },
      {
        pagePath: "/pages/stats/stats",
        text: "统计",
        iconPath: "/images/icons/stats.png",
        selectedIconPath: "/images/icons/stats-active.png"
      },
      {
        pagePath: "/pages/add/add",
        text: "",
        iconPath: "",
        selectedIconPath: "",
        isCenter: true
      },
      {
        pagePath: "/pages/account/account",
        text: "账户",
        iconPath: "/images/icons/account.png",
        selectedIconPath: "/images/icons/account-active.png"
      },
      {
        pagePath: "/pages/mine/mine",
        text: "我的",
        iconPath: "/images/icons/mine.png",
        selectedIconPath: "/images/icons/mine-active.png"
      }
    ]
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;

      // 中间凸起按钮跳转到记账页面（非 tabBar 页面，使用 navigateTo）
      if (data.iscenter) {
        wx.navigateTo({ url });
        return;
      }

      // 其他按钮使用 switchTab
      wx.switchTab({ url });
    }
  }
});
