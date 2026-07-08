# 快速启动指南

## 5 分钟快速开始

### 第 1 步：获取图标（2 分钟）

1. 访问 [iconfont.cn](https://www.iconfont.cn/)
2. 搜索并下载以下图标（81x81 像素 PNG）：
   - `bill` - 账单图标
   - `chart` - 统计图标
   - `user` - 用户图标
3. 将图标放入 `miniprogram/images/icons/` 目录
4. 重命名为：
   - `bill.png` 和 `bill-active.png`
   - `stats.png` 和 `stats-active.png`
   - `mine.png` 和 `mine-active.png`

### 第 2 步：配置环境（1 分钟）

1. 打开 `miniprogram/app.js`
2. 找到 `env: ""` 部分
3. 填入你的云开发环境 ID

```javascript
env: 'your-env-id'  // 替换为你的环境 ID
```

### 第 3 步：部署云函数（1 分钟）

1. 打开微信开发者工具
2. 导入项目
3. 右键 `cloudfunctions/billFunctions` 目录
4. 选择「上传并部署：云端安装依赖」

### 第 4 步：创建数据库（1 分钟）

1. 在微信开发者工具中点击「云开发」
2. 进入「数据库」
3. 创建两个集合：
   - `bills`
   - `categories`

### 第 5 步：运行项目

1. 点击「预览」按钮
2. 扫码在手机上测试

---

## 常见问题

### Q: 没有图标怎么办？

A: 可以临时在 `app.json` 中移除 `iconPath` 和 `selectedIconPath` 配置，tabBar 会只显示文字。

### Q: 云开发环境 ID 在哪里获取？

A: 在微信开发者工具中，点击「云开发」按钮，在右上角可以看到环境 ID。

### Q: 数据库集合创建失败？

A: 确保已开通云开发，并且有数据库操作权限。

---

## 下一步

- [ ] 测试记账功能
- [ ] 测试统计功能
- [ ] 测试数据管理
- [ ] 优化 UI 细节
- [ ] 提交审核上线
