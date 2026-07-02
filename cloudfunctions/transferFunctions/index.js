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

  // 更新账户余额（转出扣减、转入增加）
  try {
    await updateAccountBalance(fromAccountId, -amountNum)
  } catch (err) {
    console.error('转账后更新转出账户余额失败，回滚已创建的转账记录：', err)
    await db.collection(TRANSFERS_COLLECTION).doc(result._id).remove()
    return { success: false, error: '转出账户余额更新失败，请重试' }
  }

  try {
    await updateAccountBalance(toAccountId, amountNum)
  } catch (err) {
    console.error('转账后更新转入账户余额失败，回滚已创建的转账记录和转出账户余额：', err)
    // 回滚：恢复转出账户余额 + 删除已创建的转账记录
    await updateAccountBalance(fromAccountId, amountNum)
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

  // 恢复账户余额（转出加回、转入减去）
  await updateAccountBalance(transfer.fromAccountId, transfer.amount)
  await updateAccountBalance(transfer.toAccountId, -transfer.amount)

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
