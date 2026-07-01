# SpendNote MVP 实施计划

## 已完成 ✅

### 数据库设计
- [x] bills 表结构设计
- [x] categories 表结构设计
- [x] 默认分类设计

### 云函数开发
- [x] billFunctions 云函数
- [x] addBill - 添加账单
- [x] getBills - 获取账单列表
- [x] deleteBill - 删除账单
- [x] getStats - 获取统计数据
- [x] initCategories - 初始化默认分类

### 页面开发
- [x] 首页（账单列表） - pages/index
- [x] 记账页面 - pages/add
- [x] 统计页面 - pages/stats
- [x] 我的页面 - pages/mine

### 样式开发
- [x] 全局样式 (app.wxss)
- [x] 首页样式
- [x] 记账页面样式
- [x] 统计页面样式
- [x] 我的页面样式

### 文档编写
- [x] 数据库设计文档
- [x] 部署指南
- [x] 图标获取说明
- [x] README 更新

## 待完成 ⏳

### 时间范围选择器修改
- [x] 修改首页时间选择器为范围选择器
- [x] 修改统计页时间选择器为范围选择器
- [x] 修改自定义导航组件支持范围显示
- [x] 添加日期验证逻辑（结束日期不早于开始日期）
- [ ] 测试不同粒度下的时间范围选择功能

### 图标资源
- [ ] 获取 tabBar 图标（bill, stats, mine）
- [ ] 放置到 miniprogram/images/icons/ 目录

### 测试和优化
- [ ] 功能测试
- [ ] 性能优化
- [ ] UI 细节调整

### 上线准备
- [ ] 申请小程序账号
- [ ] 开通云开发
- [ ] 提交审核

## 快速开始

### 1. 获取图标
参考 [图标说明](miniprogram/images/icons/README.md)

### 2. 配置环境
在 `miniprogram/app.js` 中配置云开发环境 ID

### 3. 部署云函数
在微信开发者工具中右键 `cloudfunctions/billFunctions` → 上传并部署

### 4. 创建数据库集合
在云开发控制台创建 `bills` 和 `categories` 集合

### 5. 运行项目
使用微信开发者工具打开项目，点击预览
