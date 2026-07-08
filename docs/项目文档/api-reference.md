# API 参考

## 云函数接口

所有云函数通过 `quickstartFunctions` 统一入口调用，使用 `action` 参数区分不同接口。

### 调用方式

```javascript
wx.cloud.callFunction({
  name: 'quickstartFunctions',
  data: {
    action: '<action-name>',
    ...params
  }
})
```

---

### getOpenId

获取当前用户的 OpenID。

**参数**: 无

**返回值**:

| 字段 | 类型 | 说明 |
|------|------|------|
| openid | string | 用户 OpenID |

**示例**:

```javascript
wx.cloud.callFunction({
  name: 'quickstartFunctions',
  data: { action: 'getOpenId' },
  success(res) {
    console.log('OpenID:', res.result.openid)
  }
})
```

---

### getUserInfo

获取用户详细信息。

**参数**: 无

**返回值**:

| 字段 | 类型 | 说明 |
|------|------|------|
| userInfo | object | 用户信息对象 |

---

<!-- 在此添加更多接口文档 -->

---

## 小程序端 API

### wx.cloud.callFunction

调用云函数。

**参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 云函数名称 |
| data | object | 否 | 传递给云函数的参数 |
| success | function | 否 | 成功回调 |
| fail | function | 否 | 失败回调 |

### wx.cloud.database

获取数据库引用。

```javascript
const db = wx.cloud.database()
```

### wx.cloud.uploadFile

上传文件到云存储。

**参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cloudPath | string | 是 | 上传路径 |
| filePath | string | 是 | 本地文件路径 |
| success | function | 否 | 成功回调 |
| fail | function | 否 | 失败回调 |
