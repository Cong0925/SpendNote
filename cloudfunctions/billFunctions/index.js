// 云函数：账单管理
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 账单集合名
const BILLS_COLLECTION = 'bills'

/**
 * 精确四舍五入到两位小数，避免浮点数精度问题
 * @param {number} num - 要处理的数字
 * @returns {number} 四舍五入后的数字
 */
function roundNumber(num) {
  return Math.round(num * 100) / 100
}

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
    try {
      await updateAccountBalance(accountId, type, amount)
    } catch (err) {
      console.error('新增账单后更新余额失败，回滚已创建的账单：', err)
      // 回滚：删除已创建的账单
      await db.collection(BILLS_COLLECTION).doc(result._id).remove()
      return { success: false, error: '账户余额更新失败，请重试' }
    }
  }

  return {
    success: true,
    data: { _id: result._id }
  }
}

/**
 * 更新账单（含账户余额同步）
 */
async function updateBill(openid, data) {
  const { id, ...updateData } = data

  if (!id) {
    return { success: false, error: '缺少账单ID' }
  }

  // 先获取旧账单，用于计算余额差值
  const oldBillResult = await db.collection(BILLS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (oldBillResult.data.length === 0) {
    return { success: false, error: '账单不存在' }
  }

  const oldBill = oldBillResult.data[0]

  // 移除不允许更新的字段
  delete updateData._id
  delete updateData._openid
  delete updateData.created_at

  const result = await db.collection(BILLS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .update({ data: updateData })

  // 如果有关联账户，同步账户余额差值
  const newAccountId = updateData.accountId !== undefined ? updateData.accountId : oldBill.accountId
  const newType = updateData.type || oldBill.type
  const newAmount = updateData.amount !== undefined ? Math.abs(Number(updateData.amount)) : oldBill.amount
  const oldAmount = oldBill.amount
  const oldType = oldBill.type
  const oldAccountId = oldBill.accountId

  // 判断是否需要更新余额
  const amountChanged = updateData.amount !== undefined && Math.abs(Number(updateData.amount)) !== oldAmount
  const typeChanged = updateData.type && updateData.type !== oldType
  const accountChanged = updateData.accountId !== undefined && updateData.accountId !== oldAccountId

  if (amountChanged || typeChanged || accountChanged) {
    // 如果账户改变了，需要分别处理旧账户和新账户
    if (accountChanged) {
      // 恢复旧账户余额（反向操作）
      if (oldAccountId) {
        try {
          const oldBalanceChange = oldType === 'income' ? -oldAmount : oldAmount
          await updateAccountBalanceByAmount(oldAccountId, oldBalanceChange)
        } catch (err) {
          console.error('编辑账单时恢复旧账户余额失败：', err)
        }
      }
      // 更新新账户余额
      if (newAccountId) {
        try {
          const newBalanceChange = newType === 'income' ? newAmount : -newAmount
          await updateAccountBalanceByAmount(newAccountId, newBalanceChange)
        } catch (err) {
          console.error('编辑账单时更新新账户余额失败：', err)
        }
      }
    } else {
      // 同一账户内修改金额或类型，计算差值
      if (newAccountId) {
        try {
          // 旧操作的反向 + 新操作的正向 = 差值
          const oldChange = oldType === 'income' ? -oldAmount : oldAmount
          const newChange = newType === 'income' ? newAmount : -newAmount
          const diff = newChange + oldChange
          if (diff !== 0) {
            await updateAccountBalanceByAmount(newAccountId, diff)
          }
        } catch (err) {
          console.error('编辑账单时同步余额失败：', err)
        }
      }
    }
  }

  return {
    success: true,
    data: { updated: result.stats.updated }
  }
}

/**
 * 删除账单（含账户余额恢复）
 */
async function deleteBill(openid, id) {
  if (!id) {
    return { success: false, error: '缺少账单ID' }
  }

  // 先查询账单详情，用于恢复账户余额
  const billResult = await db.collection(BILLS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (billResult.data.length === 0) {
    return { success: false, error: '账单不存在' }
  }

  const bill = billResult.data[0]

  // 删除账单
  const result = await db.collection(BILLS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .remove()

  // 验证是否真正删除了记录
  if (result.stats.removed === 0) {
    return { success: false, error: '删除失败，账单可能已被删除' }
  }

  // 恢复关联账户余额（反向操作）
  if (bill.accountId) {
    try {
      // 收入账单：删除时扣减余额；支出账单：删除时增加余额
      const balanceChange = bill.type === 'income' ? -bill.amount : bill.amount
      await updateAccountBalanceByAmount(bill.accountId, balanceChange)
    } catch (err) {
      console.error('删除账单后恢复余额失败：', err)
    }
  }

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
      income: roundNumber(income),
      expense: roundNumber(expense),
      total: roundNumber(income - expense)
    }
  }
}

/**
 * 更新账户余额（通过金额变化量）
 * @param {string} accountId - 账户ID
 * @param {number} amountChange - 余额变化量（正数增加，负数减少）
 */
async function updateAccountBalanceByAmount(accountId, amountChange) {
  const amountNum = Number(amountChange)
  if (isNaN(amountNum) || amountNum === 0) {
    return
  }

  // 获取账户信息，判断是否为负债账户
  const accountRes = await db.collection('accounts').doc(accountId).get()
  const account = accountRes.data

  let finalChange = 0

  if (account.isDebt) {
    // 负债账户：负债增加时余额增加（支出时负债增多）
    // amountChange 已经是调用方计算好的差值，直接使用
    finalChange = amountNum
  } else {
    // 普通账户：直接使用传入的变化量
    finalChange = amountNum
  }

  await db.collection('accounts')
    .doc(accountId)
    .update({
      data: {
        balance: _.inc(finalChange),
        updatedAt: db.serverDate()
      }
    })
}

/**
 * 更新账户余额（兼容旧接口，供 addBill 使用）
 */
async function updateAccountBalance(accountId, billType, amount) {
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

  // 转换为数组，精确处理金额精度
  const categoryStats = Object.values(categoryMap).map(item => ({
    ...item,
    amount: roundNumber(item.amount)
  }))

  return {
    success: true,
    data: {
      totalIncome: roundNumber(totalIncome),
      totalExpense: roundNumber(totalExpense),
      balance: roundNumber(totalIncome - totalExpense),
      categoryStats
    }
  }
}
