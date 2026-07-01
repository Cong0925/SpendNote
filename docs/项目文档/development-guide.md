# 开发指南

## 环境要求

- 微信开发者工具（最新稳定版）
- Node.js >= 12.0.0
- 微信小程序账号（已开通云开发）

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd SpendNote
```

### 2. 导入微信开发者工具

1. 打开微信开发者工具
2. 选择「导入项目」
3. 项目目录选择 `SpendNote` 根目录
4. AppID 填写你的小程序 AppID

### 3. 开通云开发

1. 在开发者工具中点击「云开发」按钮
2. 开通云开发环境
3. 记录环境 ID，填入 `miniprogram/envList.js`

### 4. 部署云函数

```bash
# 方式一：使用部署脚本
./uploadCloudFunction.sh

# 方式二：在开发者工具中右键 cloudfunctions/quickstartFunctions -> 上传并部署
```

## 开发流程

### 前端开发

1. 页面文件位于 `miniprogram/pages/` 目录
2. 每个页面包含四个文件：
   - `.js` - 页面逻辑
   - `.json` - 页面配置
   - `.wxml` - 页面模板
   - `.wxss` - 页面样式

### 云函数开发

1. 云函数位于 `cloudfunctions/quickstartFunctions/`
2. 在 `index.js` 中添加新的 action 处理
3. 部署后即可在前端调用

### 调用云函数

```javascript
// 前端调用示例
wx.cloud.callFunction({
  name: 'quickstartFunctions',
  data: {
    action: 'getOpenId'
  },
  success(res) {
    console.log(res.result)
  },
  fail(err) {
    console.error(err)
  }
})
```

## 常用命令

```bash
# 部署所有云函数
./uploadCloudFunction.sh

# 部署指定云函数
tcb fn deploy quickstartFunctions
```

## 注意事项

1. 云函数修改后需要重新部署才能生效
2. 云数据库需要在云开发控制台中创建集合
3. 生产环境与开发环境的环境 ID 不同，注意区分
4. 云函数有执行次数和时长限制，注意优化性能
