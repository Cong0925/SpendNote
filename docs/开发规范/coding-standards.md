---
description: 微信小程序代码开发规范 - 强制模块化开发标准与异常处理日志规范
created: 2026-06-16
last_modified: 2026-07-01
---

# 微信小程序代码开发规范（强制执行）

> 本规范是 Claude Code 在 SpendNote 小程序项目中的强制约束，所有代码修改必须遵守。

---

## 一、核心原则

1. **单一职责**：每个文件只做一件事
2. **模块化**：功能按领域拆分，禁止堆砌
3. **组件化**：UI 逻辑拆分为独立组件 + 工具函数
4. **可维护性**：文件必须保持可读、可定位、可修改
5. **性能优先**：遵循小程序性能优化最佳实践

---

## 二、文件行数上限

| 文件类型 | 上限 | 超出处理 |
|----------|------|----------|
| `.wxml` 模板文件 | **300 行** | 拆分为子组件 |
| `.wxss` 样式文件 | **300 行** | 拆分为子组件样式 |
| `.js` 页面/组件逻辑 | **300 行** | 拆分为工具函数 |
| `.js` 云函数 | **500 行** | 按职责拆分模块 |
| `.json` 配置文件 | **100 行** | 按需拆分 |

> **例外**：纯类型定义文件（types.js）可放宽至 400 行，但应考虑按子领域拆分。

---

## 三、项目目录结构规范

```
SpendNote/
├── miniprogram/                    # 小程序前端代码
│   ├── app.js                      # 小程序入口
│   ├── app.json                    # 全局配置
│   ├── app.wxss                    # 全局样式
│   ├── pages/                      # 页面目录
│   │   ├── index/                  # 首页
│   │   │   ├── index.js
│   │   │   ├── index.json
│   │   │   ├── index.wxml
│   │   │   └── index.wxss
│   │   ├── add/                    # 添加账单页
│   │   └── ...                     # 其他页面
│   ├── components/                 # 公共组件
│   │   ├── BillItem/
│   │   │   ├── BillItem.js
│   │   │   ├── BillItem.json
│   │   │   ├── BillItem.wxml
│   │   │   └── BillItem.wxss
│   │   └── ...
│   ├── utils/                      # 工具函数
│   │   ├── util.js
│   │   ├── date.js
│   │   └── ...
│   ├── images/                     # 静态图片资源
│   └── styles/                     # 公共样式
│       ├── common.wxss
│       └── variables.wxss
├── cloudfunctions/                 # 云函数目录
│   ├── billFunctions/              # 账单相关云函数
│   │   ├── index.js
│   │   └── package.json
│   └── ...
└── docs/                           # 文档目录
```

---

## 四、WXML 模板规范

### 4.1 基础结构

```html
<view class="container">
  <!-- 页面内容 -->
</view>
```

### 4.2 数据绑定

```javascript
// 正确：使用数据绑定
<view>{{userName}}</view>

// 错误：禁止直接操作 DOM
<view id="test">静态内容</view>
```

### 4.3 条件渲染

```html
<!-- 正确：使用 wx:if -->
<view wx:if="{{isLoading}}">加载中...</view>

<!-- 错误：禁止使用 display:none 模拟隐藏 -->
<view style="display:{{isLoading ? 'block' : 'none'}}">加载中...</view>
```

### 4.4 列表渲染

```html
<!-- 正确：使用 wx:for -->
<view wx:for="{{billList}}" wx:key="id">
  {{item.name}}
</view>

<!-- 错误：禁止手动复制 -->
<view>账单1</view>
<view>账单2</view>
```

### 4.5 事件绑定

```html
<!-- 正确：事件绑定 -->
<button bindtap="handleSubmit" data-id="{{item.id}}">提交</button>

<!-- 错误：禁止内联事件 -->
<button bindtap="handleSubmit({{item.id}})">提交</button>
```

### 4.6 组件使用

```html
<!-- 正确：在 JSON 中注册组件 -->
{
  "usingComponents": {
    "bill-item": "/components/BillItem/BillItem"
  }
}

<!-- 模板中使用 -->
<bill-item bill="{{billData}}" bind:tap="handleBillTap"></bill-item>
```

---

## 五、WXSS 样式规范

### 5.1 单位使用

```css
/* 正确：使用 rpx 作为尺寸单位 */
.container {
  width: 100rpx;
  height: 200rpx;
  padding: 20rpx;
}

/* 错误：禁止使用 px */
.container {
  width: 100px;
}
```

### 5.2 样式导入

```css
/* 正确：使用 @import 导入公共样式 */
@import "../styles/common.wxss";

/* 禁止重复定义公共样式 */
```

### 5.3 选择器规范

```css
/* 正确：使用 class 选择器 */
.container {
  color: #333;
}

/* 错误：禁止使用 id 选择器 */
#container {
  color: #333;
}

/* 错误：禁止使用通配符选择器 */
* {
  margin: 0;
  padding: 0;
}
```

### 5.4 样式类命名

```css
/* 正确：使用 kebab-case */
.bill-item {
  display: flex;
}

.bill-item-title {
  font-size: 28rpx;
}

/* 错误：禁止使用驼峰 */
.billItem {
  display: flex;
}
```

---

## 六、JavaScript 规范

### 6.1 页面结构

```javascript
// 正确：标准页面结构
Page({
  data: {
    // 页面数据
  },

  onLoad(options) {
    // 生命周期：页面加载
  },

  onShow() {
    // 生命周期：页面显示
  },

  // 事件处理函数
  handleTap() {
    // ...
  },

  // 自定义方法
  fetchData() {
    // ...
  }
})
```

### 6.2 数据操作

```javascript
// 正确：使用 setData 更新数据
this.setData({
  userName: '张三'
})

// 正确：更新数组中的某一项
this.setData({
  [`list[${index}].name`]: '新名称'
})

// 错误：禁止直接修改 data
this.data.userName = '张三'  // 不会触发视图更新
```

### 6.3 异步操作

```javascript
// 正确：使用 async/await
async fetchData() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'billFunctions',
      data: { action: 'getBillList' }
    })
    this.setData({ billList: res.result.data })
  } catch (err) {
    console.error('【获取账单列表】云函数调用失败', err)
    wx.showToast({ title: '加载失败' })
  }
}

// 错误：禁止裸写 Promise
wx.cloud.callFunction({...}).then(res => {...})  // 缺少 catch
```

### 6.4 命名规范

```javascript
// 正确：变量命名
const userName = '张三'           // 小驼峰
const MAX_BILL_COUNT = 100        // 常量：全大写+下划线
const isShowDialog = true         // 布尔值：is/has/should 前缀

// 正确：函数命名
function getBillList() {}         // 动词开头，见名知意
function formatDate(date) {}      // 工具函数

// 错误：禁止无意义命名
const a = '张三'
const data = {}
function fn() {}
```

---

## 七、云函数规范

### 7.1 云函数结构

```javascript
// cloudfunctions/billFunctions/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { action, data } = event

  // 路由分发
  switch (action) {
    case 'getBillList':
      return await getBillList(data)
    case 'addBill':
      return await addBill(data)
    default:
      return { code: -1, message: '未知操作' }
  }
}

// 业务逻辑函数
async function getBillList(data) {
  const db = cloud.database()
  try {
    const res = await db.collection('bills').where({
      userId: data.userId
    }).get()
    return { code: 0, data: res.data }
  } catch (err) {
    console.error('【获取账单列表】数据库查询失败', err)
    return { code: -1, message: '查询失败' }
  }
}
```

### 7.2 数据库操作规范

```javascript
// 正确：使用 try/catch 包裹数据库操作
try {
  const res = await db.collection('bills').add({
    data: {
      amount: 100,
      category: '餐饮',
      createTime: db.serverDate()
    }
  })
  return { code: 0, data: res }
} catch (err) {
  console.error('【添加账单】数据库写入失败', err)
  return { code: -1, message: '添加失败' }
}

// 错误：禁止无异常处理
const res = await db.collection('bills').add({...})  // 缺少 try/catch
```

### 7.3 云函数错误码规范

```javascript
// 正确：统一错误码格式
return {
  code: 0,      // 0 成功，-1 失败，其他自定义错误码
  message: '操作成功',
  data: null
}
```

---

## 八、组件化开发规范

### 8.1 组件结构

```
components/
└── BillItem/
    ├── BillItem.js         # 组件逻辑
    ├── BillItem.json       # 组件配置
    ├── BillItem.wxml       # 组件模板
    └── BillItem.wxss       # 组件样式
```

### 8.2 组件定义

```javascript
// components/BillItem/BillItem.js
Component({
  properties: {
    bill: {
      type: Object,
      value: {}
    }
  },

  data: {
    // 组件内部数据
  },

  methods: {
    handleTap() {
      this.triggerEvent('tap', { id: this.data.bill.id })
    }
  }
})
```

### 8.3 组件通信

```javascript
// 正确：使用 triggerEvent 通信
this.triggerEvent('delete', { id: billId })

// 父组件监听
<bill-item bind:delete="handleDelete"></bill-item>

// 正确：使用 slots 扩展
<slot name="footer"></slot>

// 错误：禁止直接操作父组件
this.$parent.setData({...})  // 禁止
```

---

## 九、异常捕获 try/catch 强制规范（全部强制）

### 9.1 同步代码 try/catch 规则

1. 所有有执行风险的同步代码（JSON.parse 解析、本地缓存读写、复杂计算）**必须**包裹 try/catch，禁止裸奔执行风险代码。
2. catch 块**必须**使用 `console.error` 打印错误信息，禁止使用 `console.log`、`console.warn` 打印异常，禁止空 catch 块。
3. 日志**必须**包含中文业务场景描述 + 原始错误对象。

✅ 正确示例：

```javascript
try {
  const userInfo = JSON.parse(wx.getStorageSync('user') || '{}')
} catch (err) {
  console.error('【用户信息本地缓存解析失败】', err)
}
```

❌ 错误示例（评审直接驳回）：

```javascript
// 错误1：catch 空块，吞掉报错
try { ... } catch (err) {}

// 错误2：使用 log/warn 打印异常
try { ... } catch (err) { console.log('解析失败', err) }

// 错误3：无中文描述，无法定位业务场景
try { ... } catch (err) { console.error(err) }
```

### 9.2 异步代码 try/catch 规则（async/await）

1. 所有 async/await 异步请求、异步逻辑，**必须**外层包裹 try/catch。
2. catch 内**必须**使用 `console.error`，补充中文接口/业务场景说明。

✅ 正确示例：

```javascript
async function getBillList() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'billFunctions',
      data: { action: 'getBillList' }
    })
    return res.result
  } catch (err) {
    console.error('【获取账单列表】云函数调用失败', err)
    wx.showToast({ title: '加载失败' })
  }
}
```

### 9.3 Promise 链式调用异常规范

不使用 async/await 的原生 Promise，**必须**末尾添加 `.catch()` 捕获异常，catch 内遵循中文说明 + `console.error` 规则。

```javascript
wx.cloud.callFunction({
  name: 'billFunctions',
  data: { action: 'getBillList' }
})
  .then(res => { ... })
  .catch(err => {
    console.error('【获取账单列表】云函数调用失败', err)
  })
```

---

## 十、全局日志打印 console 统一规范（全部强制）

### 10.1 统一日志分级规则

| 级别 | 用途 | 使用场景 |
|------|------|----------|
| `console.error` | 业务报错、接口异常、try/catch 捕获异常 | **固定使用** |
| `console.warn` | 业务告警、参数缺失、兜底降级提示 | 非致命错误 |
| `console.log` | **禁止提交到线上**，仅用于本地临时调试 | 上线前必须清除 |

### 10.2 日志文案强制要求

1. 所有业务日志**必须**使用中文描述，禁止纯英文、拼音、缩写、无意义变量打印。
2. 日志文案格式：`【模块/业务场景】+ 具体说明`，一眼定位代码位置。
3. 日志**必须**携带原始变量/错误对象，不可只打印静态文案。

✅ 正确示例：

```javascript
console.warn('【表单提交】金额参数为空，触发参数校验降级', amountValue)
console.error('【账单添加】数据库写入失败', err)
```

❌ 错误示例（评审驳回）：

```javascript
console.log('amount is empty', amount)   // 禁止纯英文
console.warn(amount)                     // 禁止无中文场景说明
console.error('db error', err)           // 禁止缩写/拼音
```

### 10.3 线上环境日志约束

所有业务代码禁止遗留无用调试 `console.log`，上线前必须清空调试日志。需要保留线上监控日志时，统一使用 `error`/`warn` 分级日志。

---

## 十一、变量与函数编码规范（强制）

### 11.1 变量命名

- 统一使用小驼峰命名法，禁止拼音、中文、无意义单字母变量（`a`、`b`、`c`、`tmp`）
- 常量全大写 + 下划线分割：`const MAX_UPLOAD_SIZE = 1024`
- 布尔值统一以 `is`/`has`/`should` 开头：`isShowDialog`、`hasPermission`

### 11.2 函数规范

- 函数名见名知意，动词开头：`getUserInfo`、`submitForm`、`checkParams`
- 工具函数、公共方法**必须**添加中文注释，说明入参、出参、功能
- 禁止过长函数，单个函数代码行数不超过 50 行，单一职责原则

### 11.3 空值判断规范

禁止使用 `==`、`!=` 做判断，统一使用 `===`、`!==`。空字符串、`undefined`、`null` 做精准判断，避免隐式类型转换带来的隐性 bug。

```javascript
// 正确
if (userName === '') { ... }
if (data === null) { ... }
if (typeof value === 'undefined') { ... }

// 错误
if (userName == '') { ... }
if (data == null) { ... }
```

---

## 十二、注释编写规范（强制）

1. 所有业务复杂逻辑、特殊兜底逻辑、第三方兼容代码，**必须**添加中文单行注释，说明代码编写原因
2. 公共组件、公共工具函数、云函数接口，**必须**添加块级中文注释
3. 禁止堆码无注释，禁止过期无效注释遗留代码中
4. 注释**统一使用中文**编写

✅ 正确示例：

```javascript
/**
 * 计算账单总额
 * @param {Array} billList - 账单列表
 * @returns {Number} 总金额
 */
function calcTotalAmount(billList) {
  // 使用 reduce 累加，避免 for 循环的 index 错误
  return billList.reduce((sum, bill) => sum + bill.amount, 0)
}
```

---

## 十三、性能优化规范（强制）

### 13.1 setData 优化

```javascript
// 正确：只更新需要变化的数据
this.setData({
  'list[0].name': '新名称'
})

// 错误：禁止整页数据刷新
this.setData(this.data)
```

### 13.2 图片优化

```html
<!-- 正确：使用 lazy-load 懒加载 -->
<image src="{{imageUrl}}" lazy-load mode="aspectFill"></image>

<!-- 错误：禁止加载大图 -->
<image src="{{largeImageUrl}}"></image>
```

### 13.3 列表优化

```html
<!-- 正确：使用 wx:key 提高性能 -->
<view wx:for="{{list}}" wx:key="id">{{item.name}}</view>

<!-- 错误：禁止不使用 wx:key -->
<view wx:for="{{list}}">{{item.name}}</view>
```

### 13.4 定时器清理

```javascript
// 正确：页面卸载时清理定时器
onUnload() {
  if (this.timer) {
    clearInterval(this.timer)
    this.timer = null
  }
}
```

---

## 十四、安全规范（强制）

### 14.1 数据校验

```javascript
// 正确：云函数入口校验参数
exports.main = async (event, context) => {
  const { action, data } = event

  // 参数校验
  if (!data || !data.userId) {
    return { code: -1, message: '参数错误' }
  }
  // ...
}
```

### 14.2 数据库权限

```javascript
// 正确：云函数中使用管理员权限
const db = cloud.database()
const _ = db.command
const res = await db.collection('bills').where({
  userId: _.eq(data.userId)
}).get()

// 错误：禁止在前端直接操作敏感数据
```

### 14.3 敏感信息

```javascript
// 正确：敏感配置放在云函数环境变量
const apiKey = process.env.API_KEY

// 错误：禁止硬编码密钥
const apiKey = 'sk-xxxxxxxxxxxx'  // 禁止
```

---

## 十五、代码审查检查清单

每次代码修改后，Claude Code **必须**自检以下项：

### 架构与结构

- [ ] 所有新增/修改的 `.js` 文件不超过 300 行
- [ ] 所有新增/修改的 `.wxml` 文件不超过 300 行
- [ ] 页面/组件职责单一，可复用部分已抽取
- [ ] 复杂逻辑已抽取为工具函数
- [ ] 代码符合目录结构规范

### 异常捕获与日志

- [ ] 所有风险代码均有 try/catch 捕获，无空 catch 块
- [ ] catch 内统一使用 `console.error`，携带中文场景描述 + 原始错误
- [ ] 所有日志均为中文说明，无英文/无意义日志
- [ ] 无遗留 `console.log` 调试代码
- [ ] async/await、Promise 均完整捕获异常

### 编码规范

- [ ] 变量函数命名规范，无无意义变量、拼音命名
- [ ] 复杂逻辑、公共方法补充中文注释
- [ ] 使用 `===`/`!==` 而非 `==`/`!=`
- [ ] 使用 `let`/`const` 而非 `var`
- [ ] 使用 rpx 单位，不使用 px

### 性能与安全

- [ ] setData 只更新必要数据
- [ ] 图片使用 lazy-load 懒加载
- [ ] 列表渲染使用 wx:key
- [ ] 定时器在 onUnload 中清理
- [ ] 云函数入口有参数校验
- [ ] 敏感信息不硬编码

---

## 十六、补充说明

1. **历史存量旧代码**：无需大规模重构，新增代码、修改代码必须严格遵守本规范
2. **紧急热更代码**：也必须遵守异常捕获和日志打印两条红线规则
3. **后续可配套 eslint 规则**，自动校验空 catch 块、非法日志、英文日志，减少人工评审成本
