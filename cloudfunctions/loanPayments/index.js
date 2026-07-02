// 云函数：借款操作记录管理
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 集合名
const LOANS_COLLECTION = 'loans'
const LOAN_PAYMENTS_COLLECTION = 'loanPayments'

/**
 * 精确四舍五入到两位小数，避免浮点数精度问题
 */
function roundNumber(num) {
  return Math.round(num * 100) / 100
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, data } = event

  try {
    switch (action) {
      case 'add':
        return await addPayment(OPENID, data)
      case 'update':
        return await updatePayment(OPENID, data)
      case 'delete':
        return await deletePayment(OPENID, data.id, data.loanId)
      case 'get':
        return await getPayment(OPENID, data.id)
      case 'list':
        return await listPayments(OPENID, data.loanId)
      default:
        return { success: false, error: '未知操作类型' }
    }
  } catch (err) {
    console.error('借款操作记录操作失败：', err)
    return { success: false, error: err.message || '操作失败' }
  }
}

/**
 * 添加操作记录
 */
async function addPayment(openid, data) {
  const {
    loanId,
    type, // initial=初始借出/借入, receive=收款, repay=还款
    amount,
    date,
    accountId,
    accountName,
    remark,
    images = []
  } = data

  // 参数校验
  if (!loanId || !type || !amount || !date) {
    return { success: false, error: '缺少必填参数' }
  }

  if (!['initial', 'receive', 'repay'].includes(type)) {
    return { success: false, error: '无效的操作类型' }
  }

  if (amount <= 0) {
    return { success: false, error: '金额必须大于0' }
  }

  // 限制图片数量
  if (images.length > 4) {
    return { success: false, error: '图片最多4张' }
  }

  // 验证借款记录存在
  const loanResult = await db.collection(LOANS_COLLECTION)
    .where({ _id: loanId, _openid: openid })
    .get()

  if (loanResult.data.length === 0) {
    return { success: false, error: '借款记录不存在' }
  }

  const loan = loanResult.data[0]

  // 如果是操作记录（非初始），检查金额是否超过剩余
  if (type !== 'initial') {
    const remaining = loan.amount - (loan.paidAmount || 0)
    if (roundNumber(amount) > roundNumber(remaining)) {
      return { success: false, error: '金额不能超过剩余未还金额' }
    }
  }

  const now = db.serverDate()
  const payment = {
    _openid: openid,
    loanId,
    type,
    amount: Math.abs(amount),
    date: new Date(date),
    accountId: accountId || '',
    accountName: accountName || '',
    remark: remark || '',
    images,
    createdAt: now,
    updatedAt: now
  }

  const result = await db.collection(LOAN_PAYMENTS_COLLECTION).add({ data: payment })

  // 如果是操作记录（收款/还款），更新主记录的 paidAmount
  if (type !== 'initial') {
    await updateLoanPaidAmount(openid, loanId, amount, loan)
  }

  return {
    success: true,
    data: { _id: result._id }
  }
}

/**
 * 更新操作记录
 */
async function updatePayment(openid, data) {
  const { id, ...updateData } = data

  if (!id) {
    return { success: false, error: '缺少记录ID' }
  }

  // 获取原记录
  const paymentResult = await db.collection(LOAN_PAYMENTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (paymentResult.data.length === 0) {
    return { success: false, error: '记录不存在' }
  }

  const oldPayment = paymentResult.data[0]

  // 不允许修改初始记录
  if (oldPayment.type === 'initial') {
    return { success: false, error: '初始记录不允许修改' }
  }

  // 不允许修改类型和关联的借款ID
  delete updateData.type
  delete updateData.loanId
  delete updateData._id
  delete updateData._openid
  delete updateData.createdAt

  // 处理日期字段
  if (updateData.date) {
    updateData.date = new Date(updateData.date)
  }

  // 如果金额变化，需要更新主记录
  if (updateData.amount && updateData.amount !== oldPayment.amount) {
    const loanResult = await db.collection(LOANS_COLLECTION)
      .where({ _id: oldPayment.loanId, _openid: openid })
      .get()

    if (loanResult.data.length === 0) {
      return { success: false, error: '关联的借款记录不存在' }
    }

    const loan = loanResult.data[0]
    const amountDiff = updateData.amount - oldPayment.amount

    // 检查更新后的金额是否超过剩余
    const newPaidAmount = loan.paidAmount + amountDiff
    if (roundNumber(newPaidAmount) > roundNumber(loan.amount)) {
      return { success: false, error: '金额不能超过借款总额' }
    }

    // 检查是否还清
    const newStatus = roundNumber(newPaidAmount) >= roundNumber(loan.amount) ? 'completed' : 'pending'

    // 更新主记录
    await db.collection(LOANS_COLLECTION)
      .where({ _id: oldPayment.loanId, _openid: openid })
      .update({
        data: {
          paidAmount: roundNumber(newPaidAmount),
          status: newStatus,
          updatedAt: db.serverDate()
        }
      })

    // 联动更新账户余额
    if (oldPayment.accountId && amountDiff !== 0) {
      let balanceChange = 0
      if (oldPayment.type === 'receive') {
        // 收款：金额增加，账户余额增加
        balanceChange = amountDiff
      } else if (oldPayment.type === 'repay') {
        // 还款：金额增加，账户余额减少
        balanceChange = -amountDiff
      }

      if (balanceChange !== 0) {
        try {
          await db.collection('accounts')
            .where({ _id: oldPayment.accountId, _openid: openid })
            .update({
              data: {
                balance: _.inc(balanceChange),
                updatedAt: db.serverDate()
              }
            })
        } catch (err) {
          console.error('更新账户余额异常：', err)
        }
      }
    }
  }

  updateData.updatedAt = db.serverDate()

  const result = await db.collection(LOAN_PAYMENTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .update({ data: updateData })

  return {
    success: true,
    data: { updated: result.stats.updated }
  }
}

/**
 * 删除操作记录
 */
async function deletePayment(openid, id, loanId) {
  if (!id) {
    return { success: false, error: '缺少记录ID' }
  }

  // 获取要删除的记录
  const paymentResult = await db.collection(LOAN_PAYMENTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (paymentResult.data.length === 0) {
    return { success: false, error: '记录不存在' }
  }

  const payment = paymentResult.data[0]

  // 不允许删除初始记录
  if (payment.type === 'initial') {
    return { success: false, error: '初始记录不允许删除' }
  }

  // 删除记录
  const result = await db.collection(LOAN_PAYMENTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .remove()

  // 更新主记录的 paidAmount
  const loanResult = await db.collection(LOANS_COLLECTION)
    .where({ _id: payment.loanId, _openid: openid })
    .get()

  if (loanResult.data.length > 0) {
    const loan = loanResult.data[0]
    const newPaidAmount = loan.paidAmount - payment.amount

    // 检查是否还清
    const newStatus = roundNumber(newPaidAmount) >= roundNumber(loan.amount) ? 'completed' : 'pending'

    await db.collection(LOANS_COLLECTION)
      .where({ _id: payment.loanId, _openid: openid })
      .update({
        data: {
          paidAmount: roundNumber(Math.max(0, newPaidAmount)),
          status: newStatus,
          updatedAt: db.serverDate()
        }
      })

    // 联动更新账户余额
    if (payment.accountId && payment.amount !== 0) {
      let balanceChange = 0
      if (payment.type === 'receive') {
        // 删除收款：金额减少，账户余额减少
        balanceChange = -payment.amount
      } else if (payment.type === 'repay') {
        // 删除还款：金额减少，账户余额增加
        balanceChange = payment.amount
      }

      if (balanceChange !== 0) {
        try {
          await db.collection('accounts')
            .where({ _id: payment.accountId, _openid: openid })
            .update({
              data: {
                balance: _.inc(balanceChange),
                updatedAt: db.serverDate()
              }
            })
        } catch (err) {
          console.error('更新账户余额异常：', err)
        }
      }
    }
  }

  return {
    success: true,
    data: { removed: result.stats.removed }
  }
}

/**
 * 获取单条操作记录
 */
async function getPayment(openid, id) {
  if (!id) {
    return { success: false, error: '缺少记录ID' }
  }

  const result = await db.collection(LOAN_PAYMENTS_COLLECTION)
    .where({ _id: id, _openid: openid })
    .get()

  if (result.data.length === 0) {
    return { success: false, error: '记录不存在' }
  }

  return {
    success: true,
    data: result.data[0]
  }
}

/**
 * 获取操作记录列表
 */
async function listPayments(openid, loanId) {
  if (!loanId) {
    return { success: false, error: '缺少借款ID' }
  }

  const result = await db.collection(LOAN_PAYMENTS_COLLECTION)
    .where({ _openid: openid, loanId })
    .orderBy('createdAt', 'asc')
    .get()

  return {
    success: true,
    data: result.data
  }
}

/**
 * 更新主记录的 paidAmount（内部方法）
 */
async function updateLoanPaidAmount(openid, loanId, amount, loan) {
  const amountNum = Number(amount)
  const newPaidAmount = loan.paidAmount + amountNum

  // 检查是否还清
  const newStatus = roundNumber(newPaidAmount) >= roundNumber(loan.amount) ? 'completed' : 'pending'

  await db.collection(LOANS_COLLECTION)
    .where({ _id: loanId, _openid: openid })
    .update({
      data: {
        paidAmount: roundNumber(newPaidAmount),
        status: newStatus,
        updatedAt: db.serverDate()
      }
    })

  // 联动更新账户余额
  let balanceChange = 0
  if (loan.type === 'lend') {
    // 借出：收到还款，增加账户余额
    balanceChange = amountNum
  } else if (loan.type === 'borrow') {
    // 借入：还给别人，减少账户余额
    balanceChange = -amountNum
  }

  if (loan.accountId && balanceChange !== 0) {
    try {
      await db.collection('accounts')
        .where({ _id: loan.accountId, _openid: openid })
        .update({
          data: {
            balance: _.inc(balanceChange),
            updatedAt: db.serverDate()
          }
        })
    } catch (err) {
      console.error('更新账户余额异常：', err)
    }
  }
}
