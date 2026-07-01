---
description: 测试数据目录说明文档
created: 2026-07-01
last_modified: 2026-07-01
---

# 测试数据目录说明

## 目录结构

```
docs/测试数据/
├── README.md                 # 本说明文档
├── bills/                    # 账单记录测试数据
│   └── test-bills.json
├── categories/               # 分类管理测试数据
│   └── test-categories.json
├── accounts/                 # 账户表测试数据
│   └── test-accounts.json
├── banks/                    # 银行表测试数据
│   └── test-banks.json
└── loans/                    # 借款记录表测试数据
    └── test-loans.json
```

## 数据库集合说明

### 1. bills（账单记录表）
存储用户的收支记录

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成的唯一ID |
| _openid | string | 用户openid |
| type | string | 类型：expense（支出）/ income（收入） |
| amount | number | 金额（单位：元） |
| category | string | 分类名称 |
| icon | string | 分类图标 |
| note | string | 备注（可选） |
| date | string | 日期：YYYY-MM-DD |
| created_at | date | 创建时间 |

### 2. categories（分类管理表）
存储用户的收支分类

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成的唯一ID |
| _openid | string | 用户openid |
| name | string | 分类名称 |
| icon | string | 图标（emoji） |
| type | string | 类型：expense / income |
| sort | number | 排序号（越小越靠前） |

### 3. accounts（账户表）
存储用户的资产和负债账户

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成的唯一ID |
| _openid | string | 用户openid |
| name | string | 账户名称 |
| type | string | 账户类型：cash/wechat/alipay/savings/credit等 |
| icon | string | 图标路径 |
| balance | number | 余额（资产类）或应还金额（负债类） |
| isDebt | boolean | 是否为负债类账户 |
| bankName | string | 银行名称（仅银行卡类） |
| bankCardLast4 | string | 银行卡号后四位 |
| remark | string | 备注 |
| sortOrder | number | 排序顺序 |
| createdAt | date | 创建时间 |
| updatedAt | date | 更新时间 |

### 4. banks（银行表）
存储银行列表信息

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成的唯一ID |
| name | string | 银行名称 |
| shortName | string | 银行简称 |
| icon | string | 银行图标路径 |
| category | string | 分类：state-owned/joint-stock/city-commercial等 |
| isHot | boolean | 是否为热门银行 |
| pinyin | string | 拼音（用于搜索） |
| createdAt | date | 创建时间 |

### 5. loans（借款记录表）
存储用户的借出/借入记录

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成的唯一ID |
| _openid | string | 用户openid |
| type | string | 借款类型：lend（借出）/ borrow（借入） |
| amount | number | 借款总金额 |
| paidAmount | number | 已收/已还金额 |
| personName | string | 借给谁/谁借的 |
| accountId | string | 关联账户ID |
| loanDate | date | 借款日期 |
| dueDate | date | 预计还款日期 |
| remark | string | 备注 |
| images | array | 图片列表 |
| status | string | 状态：pending/completed/cancelled |
| createdAt | date | 创建时间 |
| updatedAt | date | 更新时间 |

## 测试数据说明

### 测试用户
- **_openid**: test_user_001

### 账户测试数据
1. **微信** - 资产类，余额 5,000
2. **建设银行** - 资产类，余额 50,000
3. **支付宝** - 资产类，余额 8,000
4. **信用卡** - 负债类，应还 3,000
5. **花呗** - 负债类，应还 1,500

### 借款测试数据
**借出记录：**
1. 张三 - 借出 5,000，已收 2,000（进行中）
2. 李四 - 借出 10,000，已收 0（进行中）
3. 王五 - 借出 3,000，已收 3,000（已完成）

**借入记录：**
1. 赵六 - 借入 8,000，已还 3,000（进行中）
2. 孙七 - 借入 2,000，已还 2,000（已完成）

## 使用方法

### 导入测试数据到微信云开发控制台

1. 登录微信开发者工具
2. 打开云开发控制台
3. 选择对应的集合
4. 点击"导入"按钮
5. 选择对应的JSON文件
6. 确认导入

### 注意事项

1. 导入前请确保集合已创建
2. 导入时会覆盖同ID的数据
3. 建议先备份现有数据
4. 测试数据中的openid需要替换为实际用户的openid
