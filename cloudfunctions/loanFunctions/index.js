// 云函数：借款管理
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 借款集合名
const LOANS_COLLECTION = 'loans'

/**
 * 云函数入口
 * @param {Object} event - 事件参数
 * @param {string} event.action - 操作类型：add/update/delete/get/list/getSummary/updatePaid
 * @param {Object} event.data - 操作数据
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, data } = event

  try {
    switch (action) {
      case 'add':
        return await addLoan(OPENID, data)
      case 'update':
        return await updateLoan(OPENID, data)
      case 'delete':
        return await deleteLoan(OPENID, data.id)
      case 'get':
        return await getLoan(OPENID, data.id)
      case 'list':
        return await listLoans(OPENID, data)
      case 'getSummary':
        return await getLoanSummary(OPENID)
      case 'updatePaid':
        return await updatePaidAmount(OPENID, data.id, data.amount)
      default:
        return { success: false, error: '未知操作类型' }
    }
  } catch (err) {
    console.error('借款操作失败：', err)
    return { success: false, error: err.message || '操作失败' }
  }
}

/**
 * 添加借款记录
 */
async function addLoan(openid, data) {
  const {
    type,
    amount,
    personName,
    accountId,
    loanDate,
    dueDate,
    remark,
    images = []
  } = data

  // 参数校验
  if (!type || !amount || !personName || !loanDate) {
    return { success: false, error: '缺少必填参数' }
  }

  if (!['lend', 'borrow'].includes(type)) {
    return { success: false, error: '无效的借款类型' }
  }

  if (amount <= 0) {
    return { success: false, error: '金额必须大于0' }
  }

  // 限制图片数量
  if (images.length > 4) {
    return { success: false, error: '图片最多4张' }
  }

  const now = db.serverDate()
  const loan = {
    _openid: openid,
    type,
    amount: Math.abs(amount),
    paidAmount: 0,
    personName,
    accountId: accountId || '',
    loanDate: new Date(loanDate),
    dueDate: dueDate ? new Date(dueDate) : null,
    remark: remark || '',
    images,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  }

  const result = await db.collection(LOANS_COLLECTION).add({ data: loan })

  return {
    success: true,
    data: { _id: result._id }
  }
}

/**
 * 更新借款记录
 */
async function updateLoan(openid, data) {
  const { id, ...updateData } = data

  if (!id) {
    return { success: false, error: '缺少借款ID' }
  }

  // 移除不允许更新的字段
  delete updateData._id
  delete updateData._openid
  delete updateData.createdAt
  delete updateData.paidAmount // 已收/已还金额通过专用接口更新

  // 处理日期字段
  if (updateData.loanDate) {
    updateData.loanDate = new Date(updateData.loanDate)
  }
  if (updateData.dueDate) {
    updateData.dueDate = new Date(updateData.dueDate)
  }

  updateData.updatedAt = db.serverDate()

  const result = await db.collection(LOANS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .update({ data: updateData })

  return {
    success: true,
    data: { updated: result.stats.updated }
  }
}

/**
 * 删除借款记录
 */
async function deleteLoan(openid, id) {
  if (!id) {
    return { success: false, error: '缺少借款ID' }
  }

  const result = await db.collection(LOANS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .remove()

  return {
    success: true,
    data: { removed: result.stats.removed }
  }
}

/**
 * 获取单条借款记录
 */
async function getLoan(openid, id) {
  if (!id) {
    return { success: false, error: '缺少借款ID' }
  }

  const result = await db.collection(LOANS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (result.data.length === 0) {
    return { success: false, error: '借款记录不存在' }
  }

  return {
    success: true,
    data: result.data[0]
  }
}

/**
 * 获取借款记录列表
 */
async function listLoans(openid, params = {}) {
  const { type, status, page = 1, pageSize = 50 } = params

  let whereCondition = { _openid: openid }

  if (type) {
    whereCondition.type = type
  }

  if (status) {
    whereCondition.status = status
  } else {
    // 默认只显示进行中的
    whereCondition.status = 'pending'
  }

  const result = await db.collection(LOANS_COLLECTION)
    .where(whereCondition)
    .orderBy('loanDate', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: result.data
  }
}

/**
 * 获取借款汇总（借出应收、借入应还）
 */
async function getLoanSummary(openid) {
  // 获取所有进行中的借出记录
  const lendResult = await db.collection(LOANS_COLLECTION)
    .where({
      _openid: openid,
      type: 'lend',
      status: 'pending'
    })
    .field({ amount: true, paidAmount: true })
    .get()

  // 获取所有进行中的借入记录
  const borrowResult = await db.collection(LOANS_COLLECTION)
    .where({
      _openid: openid,
      type: 'borrow',
      status: 'pending'
    })
    .field({ amount: true, paidAmount: true })
    .get()

  // 计算借出应收
  const lendReceivable = lendResult.data.reduce((sum, item) => {
    return sum + (item.amount - (item.paidAmount || 0))
  }, 0)

  // 计算借入应还
  const borrowRepayable = borrowResult.data.reduce((sum, item) => {
    return sum + (item.amount - (item.paidAmount || 0))
  }, 0)

  return {
    success: true,
    data: {
      lendReceivable,
      borrowRepayable,
      lendCount: lendResult.data.length,
      borrowCount: borrowResult.data.length
    }
  }
}

/**
 * 更新已收/已还金额
 */
async function updatePaidAmount(openid, id, amount) {
  if (!id || amount === undefined) {
    return { success: false, error: '缺少参数' }
  }

  if (amount < 0) {
    return { success: false, error: '金额不能为负数' }
  }

  // 先获取当前记录
  const loanResult = await db.collection(LOANS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (loanResult.data.length === 0) {
    return { success: false, error: '借款记录不存在' }
  }

  const loan = loanResult.data[0]
  const newPaidAmount = loan.paidAmount + amount

  // 检查是否超过总额
  if (newPaidAmount > loan.amount) {
    return { success: false, error: '已收/已还金额不能超过总额' }
  }

  // 更新状态
  const newStatus = newPaidAmount >= loan.amount ? 'completed' : 'pending'

  const result = await db.collection(LOANS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .update({
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        updatedAt: db.serverDate()
      }
    })

  return {
    success: true,
    data: {
      updated: result.stats.updated,
      paidAmount: newPaidAmount,
      status: newStatus
    }
  }
}
