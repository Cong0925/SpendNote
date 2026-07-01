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

  const now = db.serverDate()
  const transfer = {
    _openid: openid,
    fromAccountId,
    toAccountId,
    amount: Math.abs(Number(amount)),
    date,
    remark: remark || '',
    createdAt: now
  }

  const result = await db.collection(TRANSFERS_COLLECTION).add({ data: transfer })

  // 更新账户余额
  await updateAccountBalance(fromAccountId, -Number(amount))
  await updateAccountBalance(toAccountId, Number(amount))

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
 * 删除转账记录
 */
async function deleteTransfer(openid, id) {
  if (!id) {
    return { success: false, error: '缺少转账记录ID' }
  }

  // 获取转账记录，用于恢复账户余额
  const transferResult = await db.collection(TRANSFERS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (transferResult.data.length > 0) {
    const transfer = transferResult.data[0]
    // 恢复账户余额
    await updateAccountBalance(transfer.fromAccountId, transfer.amount)
    await updateAccountBalance(transfer.toAccountId, -transfer.amount)
  }

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
 */
async function updateAccountBalance(accountId, amountChange) {
  try {
    await db.collection('accounts')
      .doc(accountId)
      .update({
        data: {
          balance: _.inc(amountChange),
          updatedAt: db.serverDate()
        }
      })
  } catch (err) {
    console.error('更新账户余额失败：', err)
  }
}
