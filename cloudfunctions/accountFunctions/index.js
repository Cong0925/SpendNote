// 云函数：账户管理
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 账户集合名
const ACCOUNTS_COLLECTION = 'accounts'

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
 * @param {string} event.action - 操作类型：add/update/delete/get/list/getSummary
 * @param {Object} event.data - 操作数据
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, data } = event

  try {
    switch (action) {
      case 'add':
        return await addAccount(OPENID, data)
      case 'update':
        return await updateAccount(OPENID, data)
      case 'delete':
        return await deleteAccount(OPENID, data.id)
      case 'get':
        return await getAccount(OPENID, data.id)
      case 'list':
        return await listAccounts(OPENID, data)
      case 'getSummary':
        return await getAccountSummary(OPENID)
      case 'updateBalance':
        return await updateBalance(OPENID, data.id, data.amount)
      default:
        return { success: false, error: '未知操作类型' }
    }
  } catch (err) {
    console.error('账户操作失败：', err)
    return { success: false, error: err.message || '操作失败' }
  }
}

/**
 * 添加账户
 */
async function addAccount(openid, data) {
  const { name, type, icon, balance = 0, isDebt, bankName, bankCardLast4, remark, sortOrder = 0 } = data

  // 参数校验
  if (!name || !type || !icon) {
    return { success: false, error: '缺少必填参数' }
  }

  // 校验余额是否为有效数字
  const balanceNum = Number(balance)
  if (isNaN(balanceNum)) {
    return { success: false, error: '余额必须为有效数字' }
  }

  const now = db.serverDate()
  const account = {
    _openid: openid,
    name,
    type,
    icon,
    balance: isDebt ? Math.abs(balanceNum) : balanceNum,
    isDebt: !!isDebt,
    bankName: bankName || '',
    bankCardLast4: bankCardLast4 || '',
    remark: remark || '',
    sortOrder,
    createdAt: now,
    updatedAt: now
  }

  const result = await db.collection(ACCOUNTS_COLLECTION).add({ data: account })

  return {
    success: true,
    data: { _id: result._id }
  }
}

/**
 * 更新账户
 */
async function updateAccount(openid, data) {
  const { id, ...updateData } = data

  if (!id) {
    return { success: false, error: '缺少账户ID' }
  }

  // 如果更新了余额，校验是否为有效数字
  if (updateData.balance !== undefined) {
    const balanceNum = Number(updateData.balance)
    if (isNaN(balanceNum)) {
      return { success: false, error: '余额必须为有效数字' }
    }
    updateData.balance = balanceNum
  }

  // 移除不允许更新的字段
  delete updateData._id
  delete updateData._openid
  delete updateData.createdAt

  updateData.updatedAt = db.serverDate()

  const result = await db.collection(ACCOUNTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .update({ data: updateData })

  return {
    success: true,
    data: { updated: result.stats.updated }
  }
}

/**
 * 删除账户（含级联检查）
 */
async function deleteAccount(openid, id) {
  if (!id) {
    return { success: false, error: '缺少账户ID' }
  }

  // 检查是否有关联的账单记录
  const billsResult = await db.collection('bills')
    .where({ _openid: openid, accountId: id })
    .limit(1)
    .get()

  if (billsResult.data.length > 0) {
    return { success: false, error: '该账户下存在账单记录，请先删除相关账单后再删除账户' }
  }

  // 检查是否有关联的转账记录（作为转出或转入方）
  const transfersResult = await db.collection('transfers')
    .where({
      _openid: openid,
      $or: [
        { fromAccountId: id },
        { toAccountId: id }
      ]
    })
    .limit(1)
    .get()

  if (transfersResult.data.length > 0) {
    return { success: false, error: '该账户存在关联的转账记录，请先删除相关转账后再删除账户' }
  }

  const result = await db.collection(ACCOUNTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .remove()

  return {
    success: true,
    data: { removed: result.stats.removed }
  }
}

/**
 * 获取单个账户
 */
async function getAccount(openid, id) {
  if (!id) {
    return { success: false, error: '缺少账户ID' }
  }

  const result = await db.collection(ACCOUNTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (result.data.length === 0) {
    return { success: false, error: '账户不存在' }
  }

  return {
    success: true,
    data: result.data[0]
  }
}

/**
 * 获取账户列表
 */
async function listAccounts(openid, params = {}) {
  const { isDebt, type, page = 1, pageSize = 50 } = params

  let whereCondition = { _openid: openid }

  if (isDebt !== undefined) {
    whereCondition.isDebt = isDebt
  }

  if (type) {
    whereCondition.type = type
  }

  const result = await db.collection(ACCOUNTS_COLLECTION)
    .where(whereCondition)
    .orderBy('sortOrder', 'asc')
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
 * 获取账户汇总（总资产、总负债、净资产）
 */
async function getAccountSummary(openid) {
  // 获取所有资产类账户
  const assetResult = await db.collection(ACCOUNTS_COLLECTION)
    .where({ _openid: openid, isDebt: false })
    .field({ balance: true })
    .get()

  // 获取所有负债类账户
  const debtResult = await db.collection(ACCOUNTS_COLLECTION)
    .where({ _openid: openid, isDebt: true })
    .field({ balance: true })
    .get()

  // 计算总资产（精确处理浮点数精度）
  const totalAsset = roundNumber(assetResult.data.reduce((sum, item) => sum + (item.balance || 0), 0))

  // 计算总负债
  const totalDebt = roundNumber(debtResult.data.reduce((sum, item) => sum + (item.balance || 0), 0))

  // 计算净资产
  const netAsset = roundNumber(totalAsset - totalDebt)

  return {
    success: true,
    data: {
      totalAsset,
      totalDebt,
      netAsset,
      assetCount: assetResult.data.length,
      debtCount: debtResult.data.length
    }
  }
}

/**
 * 更新账户余额
 */
async function updateBalance(openid, id, amount) {
  if (!id || amount === undefined) {
    return { success: false, error: '缺少参数' }
  }

  const amountNum = Number(amount)
  if (isNaN(amountNum)) {
    return { success: false, error: '金额必须为有效数字' }
  }

  const result = await db.collection(ACCOUNTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .update({
      data: {
        balance: _.inc(amountNum),
        updatedAt: db.serverDate()
      }
    })

  return {
    success: true,
    data: { updated: result.stats.updated }
  }
}
