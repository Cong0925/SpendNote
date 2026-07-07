// 云函数：转账管理
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 转账记录集合名
const TRANSFERS_COLLECTION = 'transfers'

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
        return await addTransfer(OPENID, data)
      case 'list':
        return await listTransfers(OPENID, data)
      case 'get':
        return await getTransfer(OPENID, data.id)
      case 'update':
        return await updateTransfer(OPENID, data)
      case 'delete':
        return await deleteTransfer(OPENID, data.id)
      default:
        return { success: false, error: '未知操作类型' }
    }
  } catch (err) {
    console.error('转账操作失败：', err)
    return { success: false, error: err.message || '操作失败' }
  }
}

/**
 * 添加转账记录
 */
async function addTransfer(openid, data) {
  const { fromAccountId, toAccountId, amount, date, remark } = data

  // 参数校验
  if (!fromAccountId || !toAccountId || !amount || !date) {
    return { success: false, error: '缺少必填参数' }
  }

  if (fromAccountId === toAccountId) {
    return { success: false, error: '转出和转入账户不能相同' }
  }

  const amountNum = Math.abs(Number(amount))
  if (isNaN(amountNum) || amountNum <= 0) {
    return { success: false, error: '金额必须大于0' }
  }

  const now = db.serverDate()
  const transfer = {
    _openid: openid,
    fromAccountId,
    toAccountId,
    amount: amountNum,
    date,
    remark: remark || '',
    createdAt: now
  }

  const result = await db.collection(TRANSFERS_COLLECTION).add({ data: transfer })

  // 获取两个账户的信息，判断是否为负债账户
  const fromAccount = await getAccount(fromAccountId)
  const toAccount = await getAccount(toAccountId)

  if (!fromAccount || !toAccount) {
    console.error('转账账户不存在，回滚已创建的转账记录')
    await db.collection(TRANSFERS_COLLECTION).doc(result._id).remove()
    return { success: false, error: '转账账户不存在' }
  }

  // 更新账户余额（需要考虑负债账户的特殊逻辑）
  // 资产账户：余额为正数，转出减少，转入增加
  // 负债账户：余额为正数表示欠款，转出增加（欠款减少），转入减少（欠款增加）
  try {
    // 转出账户：资产账户减少，负债账户增加
    const fromChange = fromAccount.isDebt ? amountNum : -amountNum
    await updateAccountBalance(fromAccountId, fromChange)
  } catch (err) {
    console.error('转账后更新转出账户余额失败，回滚已创建的转账记录：', err)
    await db.collection(TRANSFERS_COLLECTION).doc(result._id).remove()
    return { success: false, error: '转出账户余额更新失败，请重试' }
  }

  try {
    // 转入账户：资产账户增加，负债账户减少
    const toChange = toAccount.isDebt ? -amountNum : amountNum
    await updateAccountBalance(toAccountId, toChange)
  } catch (err) {
    console.error('转账后更新转入账户余额失败，回滚已创建的转账记录和转出账户余额：', err)
    // 回滚：恢复转出账户余额 + 删除已创建的转账记录
    const fromChange = fromAccount.isDebt ? -amountNum : amountNum
    await updateAccountBalance(fromAccountId, fromChange)
    await db.collection(TRANSFERS_COLLECTION).doc(result._id).remove()
    return { success: false, error: '转入账户余额更新失败，请重试' }
  }

  return {
    success: true,
    data: { _id: result._id }
  }
}

/**
 * 获取转账记录列表
 */
async function listTransfers(openid, params = {}) {
  const { accountId, page = 1, pageSize = 50 } = params

  let whereCondition = { _openid: openid }

  // 如果指定了账户ID，查询与该账户相关的转账记录
  if (accountId) {
    whereCondition = {
      _openid: openid,
      $or: [
        { fromAccountId: accountId },
        { toAccountId: accountId }
      ]
    }
  }

  const result = await db.collection(TRANSFERS_COLLECTION)
    .where(whereCondition)
    .orderBy('date', 'desc')
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: result.data
  }
}

/**
 * 获取单个转账记录
 */
async function getTransfer(openid, id) {
  if (!id) {
    return { success: false, error: '缺少转账记录ID' }
  }

  const result = await db.collection(TRANSFERS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (result.data.length === 0) {
    return { success: false, error: '转账记录不存在' }
  }

  return {
    success: true,
    data: result.data[0]
  }
}

/**
 * 更新转账记录（含余额调整）
 */
async function updateTransfer(openid, data) {
  const { id, fromAccountId, toAccountId, amount, date, remark } = data

  // 参数校验
  if (!id) {
    return { success: false, error: '缺少转账记录ID' }
  }

  if (!fromAccountId || !toAccountId || !amount || !date) {
    return { success: false, error: '缺少必填参数' }
  }

  if (fromAccountId === toAccountId) {
    return { success: false, error: '转出和转入账户不能相同' }
  }

  const amountNum = Math.abs(Number(amount))
  if (isNaN(amountNum) || amountNum <= 0) {
    return { success: false, error: '金额必须大于0' }
  }

  // 获取原转账记录
  const transferResult = await db.collection(TRANSFERS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (transferResult.data.length === 0) {
    return { success: false, error: '转账记录不存在' }
  }

  const oldTransfer = transferResult.data[0]

  // 获取账户信息
  const oldFromAccount = await getAccount(oldTransfer.fromAccountId)
  const oldToAccount = await getAccount(oldTransfer.toAccountId)
  const newFromAccount = await getAccount(fromAccountId)
  const newToAccount = await getAccount(toAccountId)

  if (!newFromAccount || !newToAccount) {
    return { success: false, error: '转账账户不存在' }
  }

  // 步骤1：恢复原账户余额（与原金额相反）
  try {
    // 恢复转出账户：资产账户加回，负债账户减去
    const oldFromChange = oldFromAccount && oldFromAccount.isDebt ? -oldTransfer.amount : oldTransfer.amount
    await updateAccountBalance(oldTransfer.fromAccountId, oldFromChange)

    // 恢复转入账户：资产账户减去，负债账户加回
    const oldToChange = oldToAccount && oldToAccount.isDebt ? oldTransfer.amount : -oldTransfer.amount
    await updateAccountBalance(oldTransfer.toAccountId, oldToChange)
  } catch (err) {
    console.error('更新转账记录时恢复原账户余额失败：', err)
    return { success: false, error: '余额恢复失败，请重试' }
  }

  // 步骤2：应用新账户余额（与新金额相同）
  try {
    // 转出账户：资产账户减少，负债账户增加
    const newFromChange = newFromAccount.isDebt ? amountNum : -amountNum
    await updateAccountBalance(fromAccountId, newFromChange)

    // 转入账户：资产账户增加，负债账户减少
    const newToChange = newToAccount.isDebt ? -amountNum : amountNum
    await updateAccountBalance(toAccountId, newToChange)
  } catch (err) {
    console.error('更新转账记录时应用新账户余额失败，恢复原余额：', err)
    // 回滚：恢复原账户余额
    try {
      const rollbackFromChange = oldFromAccount && oldFromAccount.isDebt ? oldTransfer.amount : -oldTransfer.amount
      await updateAccountBalance(oldTransfer.fromAccountId, rollbackFromChange)

      const rollbackToChange = oldToAccount && oldToAccount.isDebt ? -oldTransfer.amount : oldTransfer.amount
      await updateAccountBalance(oldTransfer.toAccountId, rollbackToChange)
    } catch (rollbackErr) {
      console.error('回滚原账户余额失败：', rollbackErr)
    }
    return { success: false, error: '余额更新失败，请重试' }
  }

  // 步骤3：更新转账记录
  const updateData = {
    fromAccountId,
    toAccountId,
    amount: amountNum,
    date,
    remark: remark || '',
    updatedAt: db.serverDate()
  }

  const result = await db.collection(TRANSFERS_COLLECTION)
    .doc(id)
    .update({ data: updateData })

  return {
    success: true,
    data: { updated: result.stats.updated }
  }
}

/**
 * 删除转账记录（含余额恢复）
 */
async function deleteTransfer(openid, id) {
  if (!id) {
    return { success: false, error: '缺少转账记录ID' }
  }

  // 获取转账记录，用于恢复账户余额
  const transferResult = await db.collection(TRANSFERS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (transferResult.data.length === 0) {
    return { success: false, error: '转账记录不存在' }
  }

  const transfer = transferResult.data[0]

  // 获取两个账户的信息，判断是否为负债账户
  const fromAccount = await getAccount(transfer.fromAccountId)
  const toAccount = await getAccount(transfer.toAccountId)

  // 恢复账户余额（需要考虑负债账户的特殊逻辑）
  // 恢复操作与添加操作相反
  // 转出账户：资产账户加回，负债账户减去
  const fromChange = fromAccount && fromAccount.isDebt ? -transfer.amount : transfer.amount
  await updateAccountBalance(transfer.fromAccountId, fromChange)

  // 转入账户：资产账户减去，负债账户加回
  const toChange = toAccount && toAccount.isDebt ? transfer.amount : -transfer.amount
  await updateAccountBalance(transfer.toAccountId, toChange)

  // 余额恢复成功后，删除转账记录
  const result = await db.collection(TRANSFERS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .remove()

  return {
    success: true,
    data: { removed: result.stats.removed }
  }
}

/**
 * 更新账户余额
 * @throws {Error} 余额更新失败时抛出异常
 */
async function updateAccountBalance(accountId, amountChange) {
  const amountNum = Number(amountChange)
  if (isNaN(amountNum) || amountNum === 0) {
    return
  }

  const result = await db.collection('accounts')
    .doc(accountId)
    .update({
      data: {
        balance: _.inc(amountNum),
        updatedAt: db.serverDate()
      }
    })

  if (result.stats.updated === 0) {
    throw new Error(`账户 ${accountId} 不存在或更新失败`)
  }
}

/**
 * 获取单个账户信息
 */
async function getAccount(accountId) {
  if (!accountId) {
    return null
  }

  const result = await db.collection('accounts')
    .doc(accountId)
    .get()

  return result.data || null
}
