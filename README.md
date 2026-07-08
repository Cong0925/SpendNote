# 开销随手记 SpendNote

一款基于微信小程序云开发的记账应用，主打轻量、纯净、数据自主。

> 🚀 开源项目 · 体验版（7月15日前有效）

## 功能特性

### 核心功能
- **极简记账** - 3步完成一笔记账：金额 → 分类 → 完成
- **收支管理** - 支持收入和支出记录，预设常用分类
- **多账户管理** - 现金、微信、支付宝、储蓄卡、信用卡、花呗等多种账户类型
- **转账功能** - 账户间转账，支持不同币种
- **借款管理** - 借出/借入记录，收款/还款追踪
- **分类管理** - 自定义分类，拖拽排序，内置图标

### 统计分析
- **多维度统计** - 日/月/季/年维度查看收支概览
- **收支趋势** - 月度趋势图表，可视化消费习惯
- **年度总结** - 年度收支汇总，月度趋势分析
- **分类统计** - 按分类查看支出明细

### 账户体系
- **资产账户** - 现金、微信、支付宝、储蓄卡
- **负债账户** - 信用卡、花呗、京东白条、美团月付
- **净资产计算** - 自动计算净资产、总资产、总负债
- **账户详情** - 查看账户收支记录、转账记录

### 其他功能
- **搜索功能** - 按关键词、日期、分类筛选账单
- **评分系统** - 用户评分、评价展示
- **反馈系统** - 用户反馈、反馈列表
- **帮助中心** - 在线帮助文档
- **隐私保护** - 数据存储在微信云开发，安全可靠

## 技术栈

| 类型 | 技术 |
|------|------|
| 前端 | 微信小程序原生开发（WXML + WXSS + JavaScript） |
| 后端 | 微信云开发（云函数 + 云数据库） |
| UI 组件库 | Vant Weapp |
| 架构 | Serverless |

## 项目结构

```
SpendNote/
├── cloudfunctions/              # 云函数目录
│   ├── accountFunctions/        # 账户相关云函数
│   ├── bankFunctions/           # 银行相关云函数
│   ├── billFunctions/           # 账单相关云函数
│   ├── categoryFunctions/       # 分类相关云函数
│   ├── loanFunctions/           # 借款相关云函数
│   ├── loanPayments/            # 还款相关云函数
│   ├── transferFunctions/       # 转账相关云函数
│   ├── feedbackFunctions/       # 反馈相关云函数
│   ├── rating/                  # 评分相关云函数
│   ├── yearlySummary/           # 年度总结云函数
│   ├── login/                   # 登录云函数
│   ├── user/                    # 用户云函数
│   └── clearUserData/           # 清除用户数据云函数
├── miniprogram/                 # 小程序前端目录
│   ├── pages/                   # 页面目录
│   │   ├── index/               # 首页（账单列表）
│   │   ├── add/                 # 记账页面
│   │   ├── stats/               # 统计页面
│   │   ├── account/             # 账户页面
│   │   ├── mine/                # 我的页面
│   │   ├── search/              # 搜索页面
│   │   ├── detail/              # 账单详情
│   │   ├── accountDetail/       # 账户详情
│   │   ├── accountInfo/         # 账户信息
│   │   ├── addAccount/          # 添加账户
│   │   ├── selectBank/          # 选择银行
│   │   ├── transfer/            # 转账页面
│   │   ├── loan/                # 借款页面
│   │   ├── addLoan/             # 添加借款
│   │   ├── loanDetail/          # 借款详情
│   │   ├── loanPayment/         # 还款记录
│   │   ├── paymentDetail/       # 还款详情
│   │   ├── category/            # 分类管理
│   │   ├── yearly-summary/      # 年度总结
│   │   ├── rating/              # 评分页面
│   │   ├── feedback/            # 反馈页面
│   │   ├── help/                # 帮助页面
│   │   ├── login/               # 登录页面
│   │   ├── agreement/           # 用户协议
│   │   └── privacy/             # 隐私政策
│   ├── components/              # 组件目录
│   │   ├── custom-nav/          # 自定义导航栏
│   │   ├── account-picker/      # 账户选择器
│   │   └── year-picker/         # 年份选择器
│   ├── images/                  # 静态资源
│   ├── utils/                   # 工具函数
│   ├── app.js                   # 小程序入口
│   ├── app.json                 # 小程序配置
│   └── app.wxss                 # 全局样式
├── docs/                        # 开发文档
├── scripts/                     # 工具脚本
└── tools/                       # 辅助工具
```

## 快速开始

### 1. 环境准备

- 微信开发者工具
- 微信小程序账号
- 开通云开发

### 2. 项目配置

```bash
# 克隆项目
git clone https://github.com/Cong0925/SpendNote.git

# 进入项目目录
cd SpendNote
```

### 3. 配置云开发

1. 在 `miniprogram/app.js` 中配置云开发环境 ID
2. 在云开发控制台创建以下数据库集合：
   - `bills` - 账单表
   - `categories` - 分类表
   - `accounts` - 账户表
   - `loans` - 借款表
   - `loanPayments` - 还款记录表
   - `transfers` - 转账记录表
   - `feedback` - 反馈表
   - `ratings` - 评分表
   - `users` - 用户表

### 4. 部署云函数

在微信开发者工具中，右键点击 `cloudfunctions/` 下的每个云函数目录，选择「上传并部署：云端安装依赖」。

### 5. 运行项目

1. 使用微信开发者工具打开项目
2. 点击「预览」或「真机调试」

## 数据库设计

详细数据库设计请参考 [数据库设计文档](docs/数据库设计/database-design.md)

### 主要集合

| 集合名 | 说明 |
|--------|------|
| bills | 账单记录 |
| categories | 分类配置 |
| accounts | 用户账户 |
| loans | 借款记录 |
| loanPayments | 还款记录 |
| transfers | 转账记录 |
| feedback | 用户反馈 |
| ratings | 用户评分 |
| users | 用户信息 |

## 开发文档

- [数据库设计](docs/数据库设计/database-design.md)
- [开发规范](docs/开发规范/coding-standards.md)
- [架构说明](docs/项目文档/architecture.md)
- [部署指南](docs/项目文档/deploy-guide.md)
- [开发指南](docs/项目文档/development-guide.md)
- [API 参考](docs/项目文档/api-reference.md)

## 体验版本

扫描下方二维码体验小程序（7月15日前有效）：

![体验版二维码](docs/git-page/imgs/Snipaste_2026-07-08_11-26-37.png)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

MIT License

## 联系方式

- GitHub: [Cong0925](https://github.com/Cong0925)
- 项目地址: [SpendNote](https://github.com/Cong0925/SpendNote)
