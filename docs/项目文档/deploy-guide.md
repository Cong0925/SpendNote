# SpendNote 部署指南

## 前置条件

1. 微信开发者工具
2. 微信小程序账号
3. 已开通云开发

## 部署步骤

### 1. 配置小程序 AppID

1. 打开微信开发者工具
2. 导入项目
3. 在 `miniprogram/app.js` 中配置云开发环境 ID

```javascript
App({
  onLaunch: function () {
    this.globalData = {
      env: 'your-env-id'  // 替换为你的云开发环境 ID
    };
    // ...
  }
});
```

### 2. 创建云数据库集合

在云开发控制台创建以下集合：

- `bills` - 账单记录
- `categories` - 分类管理

### 3. 上传云函数

在微信开发者工具中：

1. 右键点击 `cloudfunctions/billFunctions` 目录
2. 选择「上传并部署：云端安装依赖」

### 4. 获取图标

1. 访问 [iconfont.cn](https://www.iconfont.cn/)
2. 搜索并下载以下图标：
   - bill（账单）
   - chart（统计）
   - user（用户）
3. 下载 81x81 像素的 PNG 格式
4. 将图标放入 `miniprogram/images/icons/` 目录
5. 按照以下命名：
   - `bill.png`（未选中）
   - `bill-active.png`（选中）
   - `stats.png`（未选中）
   - `stats-active.png`（选中）
   - `mine.png`（未选中）
   - `mine-active.png`（选中）

### 5. 预览和调试

1. 在微信开发者工具中点击「预览」
2. 扫码在手机上测试

### 6. 发布上线

1. 在微信开发者工具中点击「上传」
2. 填写版本号和描述
3. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) 提交审核

## 目录结构

```
SpendNote/
├── cloudfunctions/          # 云函数目录
│   └── billFunctions/       # 账单相关云函数
│       ├── index.js         # 云函数入口
│       └── package.json     # 依赖管理
├── miniprogram/             # 小程序前端目录
│   ├── app.js               # 应用入口
│   ├── app.json             # 应用配置
│   ├── app.wxss             # 全局样式
│   ├── images/              # 静态资源
│   │   └── icons/           # tabBar 图标
│   ├── pages/               # 页面目录
│   │   ├── index/           # 首页（账单列表）
│   │   ├── add/             # 记账页面
│   │   ├── stats/           # 统计页面
│   │   └── mine/            # 我的页面
│   └── sitemap.json         # 小程序索引配置
├── docs/                    # 开发文档
│   ├── architecture.md      # 架构说明
│   ├── database-design.md   # 数据库设计
│   └── deploy-guide.md      # 部署指南
└── tools/                   # 工具脚本
    └── generate-icons.js    # 图标生成工具
```

## 功能说明

### 核心功能

1. **记账** - 支持收入和支出记录
2. **分类** - 预设常用分类，支持自定义
3. **统计** - 按月统计收支情况
4. **管理** - 查看、删除账单记录

### 页面说明

| 页面 | 功能 |
|------|------|
| 首页 | 显示当月账单列表，支持按月筛选 |
| 记账 | 添加新的收入或支出记录 |
| 统计 | 查看收支统计和分类明细 |
| 我的 | 查看总览数据、设置、关于我们 |

## 常见问题

### Q: 云函数部署失败怎么办？

A: 检查以下几点：
1. 确保已开通云开发
2. 检查环境 ID 是否正确
3. 确保网络连接正常

### Q: 数据库查询失败？

A: 检查以下几点：
1. 确保已创建 `bills` 和 `categories` 集合
2. 检查数据库权限设置
3. 确保云函数有数据库操作权限

### Q: tabBar 图标不显示？

A: 检查以下几点：
1. 确保图标文件存在于 `miniprogram/images/icons/` 目录
2. 检查 `app.json` 中的图标路径是否正确
3. 确保图标文件格式为 PNG

## 技术支持

如有问题，请查看：
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/)
- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
