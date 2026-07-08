# 项目架构

## 目录结构

```
SpendNote/
├── cloudfunctions/          # 云函数目录
│   └── quickstartFunctions/ # 云函数集合
│       ├── index.js         # 云函数入口
│       ├── config.json      # 云函数配置
│       └── package.json     # 依赖管理
├── miniprogram/             # 小程序前端目录
│   ├── app.js               # 应用入口
│   ├── app.json             # 应用配置
│   ├── app.wxss             # 全局样式
│   ├── envList.js           # 环境配置
│   ├── components/          # 公共组件
│   ├── images/              # 静态资源
│   ├── pages/               # 页面目录
│   │   ├── index/           # 首页
│   │   └── example/         # 示例页
│   └── sitemap.json         # 小程序索引配置
├── project.config.json      # 项目配置
├── uploadCloudFunction.sh   # 云函数部署脚本
└── docs/                    # 开发文档
```

## 架构概览

```
┌─────────────────────────────────────────────┐
│                  用户界面                    │
│         (miniprogram/pages/)                │
├─────────────────────────────────────────────┤
│               小程序逻辑层                    │
│         (miniprogram/app.js)                │
├─────────────────────────────────────────────┤
│              云开发 SDK                      │
│         (wx.cloud.*)                        │
├──────────┬──────────────┬───────────────────┤
│  云函数   │   云数据库    │     云存储        │
│ (Cloud   │  (Cloud      │   (Cloud         │
│ Function)│  Database)   │   Storage)       │
└──────────┴──────────────┴───────────────────┘
```

## 云函数说明

### quickstartFunctions

统一的云函数入口，通过 `action` 参数区分不同操作：

- `getOpenId` - 获取用户 OpenID
- `getUserInfo` - 获取用户信息
- `addRecord` - 添加记账记录
- `getRecords` - 查询记账记录
- ... (根据实际功能扩展)

## 页面说明

| 页面 | 路径 | 功能 |
|------|------|------|
| 首页 | /pages/index | 应用主页 |
| 示例 | /pages/example | 功能示例展示 |
