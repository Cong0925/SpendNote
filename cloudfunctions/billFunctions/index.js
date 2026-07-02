// 云函数：账单管理
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 账单集合名
const BILLS_COLLECTION = 'bills'

/**
 * 云函数入口
 * @param {Object} event - 事件参数
 * @param {string} event.action - 操作类型
 * @param {Object} event.data - 操作数据
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, data } = event

  try {
    switch (action) {
      case 'add':
        return await addBill(OPENID, data)
      case 'update':
        return await updateBill(OPENID, data)
      case 'delete':
        return await deleteBill(OPENID, data.id)
      case 'get':
        return await getBill(OPENID, data.id)
      case 'list':
        return await listBills(OPENID, data)
      case 'listByAccount':
        return await listBillsByAccount(OPENID, data.accountId)
      case 'getStats':
        return await getBillStats(OPENID, data)
      case 'getBillsByDateRange':
        return await listBills(OPENID, data)
      case 'getStatsByDateRange':
        return await getStatsByDateRange(OPENID, data)
      default:
        return { success: false, error: '未知操作类型' }
    }
  } catch (err) {
    console.error('账单操作失败：', err)
    return { success: false, error: err.message || '操作失败' }
  }
}

/**
 * 添加账单
 */
async function addBill(openid, data) {
  const { type, amount, category, icon, note, date, accountId } = data

  // 参数校验
  if (!type || !amount || !category || !date) {
    return { success: false, error: '缺少必填参数' }
  }

  const now = db.serverDate()
  const bill = {
    _openid: openid,
    type,
    amount: Math.abs(Number(amount)),
    category,
    icon: icon || '',
    note: note || '',
    date,
    accountId: accountId || '',
    created_at: now
  }

  const result = await db.collection(BILLS_COLLECTION).add({ data: bill })

  // 如果有关联账户，更新账户余额
  if (accountId) {
    await updateAccountBalance(accountId, type, amount)
  }

  return {
    success: true,
    data: { _id: result._id }
  }
}

/**
 * 更新账单
 */
async function updateBill(openid, data) {
  const { id, ...updateData } = data

  if (!id) {
    return { success: false, error: '缺少账单ID' }
  }

  // 移除不允许更新的字段
  delete updateData._id
  delete updateData._openid
  delete updateData.created_at

  const result = await db.collection(BILLS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .update({ data: updateData })

  return {
    success: true,
    data: { updated: result.stats.updated }
  }
}

/**
 * 删除账单
 */
async function deleteBill(openid, id) {
  if (!id) {
    return { success: false, error: '缺少账单ID' }
  }

  const result = await db.collection(BILLS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .remove()

  return {
    success: true,
    data: { removed: result.stats.removed }
  }
}

/**
 * 获取单个账单
 */
async function getBill(openid, id) {
  if (!id) {
    return { success: false, error: '缺少账单ID' }
  }

  const result = await db.collection(BILLS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (result.data.length === 0) {
    return { success: false, error: '账单不存在' }
  }

  return {
    success: true,
    data: result.data[0]
  }
}

/**
 * 获取账单列表
 */
async function listBills(openid, params = {}) {
  const { startDate, endDate, type, page = 1, pageSize = 50 } = params

  let whereCondition = { _openid: openid }

  if (startDate && endDate) {
    whereCondition.date = _.gte(startDate).and(_.lte(endDate))
  }

  if (type) {
    whereCondition.type = type
  }

  const result = await db.collection(BILLS_COLLECTION)
    .where(whereCondition)
    .orderBy('date', 'desc')
    .orderBy('created_at', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: result.data
  }
}

/**
 * 根据账户ID获取账单列表
 */
async function listBillsByAccount(openid, accountId) {
  if (!accountId) {
    return { success: false, error: '缺少账户ID' }
  }

  const result = await db.collection(BILLS_COLLECTION)
    .where({ _openid: openid, accountId })
    .orderBy('date', 'desc')
    .orderBy('created_at', 'desc')
    .limit(100)
    .get()

  return {
    success: true,
    data: result.data
  }
}

/**
 * 获取账单统计
 */
async function getBillStats(openid, params = {}) {
  const { startDate, endDate } = params

  let whereCondition = { _openid: openid }

  if (startDate && endDate) {
    whereCondition.date = _.gte(startDate).and(_.lte(endDate))
  }

  // 获取所有账单
  const result = await db.collection(BILLS_COLLECTION)
    .where(whereCondition)
    .field({ type: true, amount: true })
    .get()

  // 计算统计
  let income = 0
  let expense = 0

  result.data.forEach(bill => {
    if (bill.type === 'income') {
      income += bill.amount
    } else {
      expense += bill.amount
    }
  })

  return {
    success: true,
    data: {
      income,
      expense,
      total: income - expense
    }
  }
}

/**
 * 更新账户余额
 */
async function updateAccountBalance(accountId, billType, amount) {
  try {
    const amountNum = Math.abs(Number(amount))

    // 先获取账户信息，判断是否为负债账户
    const accountRes = await db.collection('accounts').doc(accountId).get()
    const account = accountRes.data

    let balanceChange = 0

    if (account.isDebt) {
      // 负债账户：支出时负债增多（余额增加），收入已在前端过滤不允许选择
      balanceChange = amountNum
    } else {
      // 普通账户：收入增加余额，支出减少余额（可为负数，允许透支）
      balanceChange = billType === 'income' ? amountNum : -amountNum
    }

    await db.collection('accounts')
      .doc(accountId)
      .update({
        data: {
          balance: _.inc(balanceChange),
          updatedAt: db.serverDate()
        }
      })
  } catch (err) {
    console.error('更新账户余额失败：', err)
  }
}

/**
 * 按日期范围获取统计（支持分类统计）
 */
async function getStatsByDateRange(openid, params = {}) {
  const { startDate, endDate } = params

  let whereCondition = { _openid: openid }

  if (startDate && endDate) {
    whereCondition.date = _.gte(startDate).and(_.lte(endDate))
  }

  // 获取所有账单（包含分类信息）
  const result = await db.collection(BILLS_COLLECTION)
    .where(whereCondition)
    .field({ type: true, amount: true, category: true, icon: true })
    .get()

  // 计算统计
  let totalIncome = 0
  let totalExpense = 0
  const categoryMap = {}

  result.data.forEach(bill => {
    if (bill.type === 'income') {
      totalIncome += bill.amount
    } else {
      totalExpense += bill.amount
    }

    // 按分类统计
    const key = `${bill.type}_${bill.category}`
    if (!categoryMap[key]) {
      categoryMap[key] = {
        type: bill.type,
        category: bill.category,
        icon: bill.icon,
        amount: 0,
        count: 0
      }
    }
    categoryMap[key].amount += bill.amount
    categoryMap[key].count += 1
  })

  // 转换为数组
  const categoryStats = Object.values(categoryMap)

  return {
    success: true,
    data: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categoryStats
    }
  }
}
