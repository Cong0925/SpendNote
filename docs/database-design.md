# 数据库设计

## bills 表（账单记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成的唯一ID |
| _openid | string | 用户openid（自动注入） |
| type | string | 类型：expense（支出）/ income（收入） |
| amount | number | 金额（单位：元） |
| category | string | 分类名称 |
| icon | string | 分类图标 |
| note | string | 备注（可选） |
| date | string | 日期：YYYY-MM-DD |
| created_at | date | 创建时间 |

## categories 表（分类管理）

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成的唯一ID |
| _openid | string | 用户openid（分类属于用户） |
| name | string | 分类名称 |
| icon | string | 图标（emoji） |
| type | string | 类型：expense / income |
| sort | number | 排序号（越小越靠前） |

## 默认分类

### 支出分类
- 🍜 餐饮
- 🚗 交通
- 🛒 购物
- 🎬 娱乐
- 💡 居住
- 📱 通讯
- 🏥 医疗
- 📚 教育
- 👕 服饰
- 💰 其他

### 收入分类
- 💵 工资
- 💰 奖金
- 🎁 红包
- 💹 投资
- 💼 兼职
- 📝 其他
