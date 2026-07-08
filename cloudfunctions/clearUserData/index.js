// 云函数：clearUserData
// 功能：清除当前用户的所有个人数据（账单、账户、借款、转账）

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 集合名称
const BILLS_COLLECTION = 'bills'
const ACCOUNTS_COLLECTION = 'accounts'
const LOANS_COLLECTION = 'loans'
const TRANSFERS_COLLECTION = 'transfers'

/**
 * 获取用户数据统计
 * @param {string} openid - 用户openid
 * @returns {object} 数据统计
 */
async function getUserDataStats(openid) {
  try {
    console.log('获取用户数据统计，openid:', openid)

    // 并行查询各集合的数据数量
    const [billsCount, accountsCount, loansCount, transfersCount] = await Promise.all([
      db.collection(BILLS_COLLECTION).where({ _openid: openid }).count(),
      db.collection(ACCOUNTS_COLLECTION).where({ _openid: openid }).count(),
      db.collection(LOANS_COLLECTION).where({ _openid: openid }).count(),
      db.collection(TRANSFERS_COLLECTION).where({ _openid: openid }).count()
    ])

    const stats = {
      bills: billsCount.total,
      accounts: accountsCount.total,
      loans: loansCount.total,
      transfers: transfersCount.total,
      total: billsCount.total + accountsCount.total + loansCount.total + transfersCount.total
    }

    console.log('数据统计结果:', stats)
    return stats
  } catch (err) {
    console.error('获取用户数据统计失败：', err)
    throw err
  }
}

/**
 * 清除用户所有数据
 * @param {string} openid - 用户openid
 * @returns {object} 删除结果
 */
async function clearAllUserData(openid) {
  console.log('开始清除用户数据，openid:', openid)

  const results = {
    bills: 0,
    accounts: 0,
    loans: 0,
    transfers: 0,
    total: 0
  }

  try {
    // 1. 删除账单（先删账单，因为账单关联账户）
    console.log('删除账单...')
    let hasMore = true
    while (hasMore) {
      const batch = await db.collection(BILLS_COLLECTION)
        .where({ _openid: openid })
        .limit(100)
        .get()

      if (batch.data.length === 0) {
        hasMore = false
      } else {
        const deletePromises = batch.data.map(doc => {
          return db.collection(BILLS_COLLECTION).doc(doc._id).remove()
        })
        const deleteResults = await Promise.all(deletePromises)
        results.bills += deleteResults.length
        console.log('删除账单批次完成，当前已删除:', results.bills)
      }
    }
    console.log('删除账单完成，总计:', results.bills)

    // 2. 删除转账记录
    console.log('删除转账记录...')
    hasMore = true
    while (hasMore) {
      const batch = await db.collection(TRANSFERS_COLLECTION)
        .where({ _openid: openid })
        .limit(100)
        .get()

      if (batch.data.length === 0) {
        hasMore = false
      } else {
        const deletePromises = batch.data.map(doc => {
          return db.collection(TRANSFERS_COLLECTION).doc(doc._id).remove()
        })
        const deleteResults = await Promise.all(deletePromises)
        results.transfers += deleteResults.length
        console.log('删除转账记录批次完成，当前已删除:', results.transfers)
      }
    }
    console.log('删除转账记录完成，总计:', results.transfers)

    // 3. 删除借款记录
    console.log('删除借款记录...')
    hasMore = true
    while (hasMore) {
      const batch = await db.collection(LOANS_COLLECTION)
        .where({ _openid: openid })
        .limit(100)
        .get()

      if (batch.data.length === 0) {
        hasMore = false
      } else {
        const deletePromises = batch.data.map(doc => {
          return db.collection(LOANS_COLLECTION).doc(doc._id).remove()
        })
        const deleteResults = await Promise.all(deletePromises)
        results.loans += deleteResults.length
        console.log('删除借款记录批次完成，当前已删除:', results.loans)
      }
    }
    console.log('删除借款记录完成，总计:', results.loans)

    // 4. 删除账户（最后删账户）
    console.log('删除账户...')
    hasMore = true
    while (hasMore) {
      const batch = await db.collection(ACCOUNTS_COLLECTION)
        .where({ _openid: openid })
        .limit(100)
        .get()

      if (batch.data.length === 0) {
        hasMore = false
      } else {
        const deletePromises = batch.data.map(doc => {
          return db.collection(ACCOUNTS_COLLECTION).doc(doc._id).remove()
        })
        const deleteResults = await Promise.all(deletePromises)
        results.accounts += deleteResults.length
        console.log('删除账户批次完成，当前已删除:', results.accounts)
      }
    }
    console.log('删除账户完成，总计:', results.accounts)

    results.total = results.bills + results.accounts + results.loans + results.transfers
    console.log('清除完成，总计删除:', results.total, '条数据')

    return {
      success: true,
      data: results
    }
  } catch (err) {
    console.error('清除用户数据失败：', err)
    return {
      success: false,
      error: err.message || '清除数据失败'
    }
  }
}

/**
 * 导出用户数据
 * @param {string} openid - 用户openid
 * @returns {object} 导出数据
 */
async function exportUserData(openid) {
  try {
    console.log('导出用户数据，openid:', openid)

    // 并行查询所有数据
    const [bills, accounts, loans, transfers] = await Promise.all([
      db.collection(BILLS_COLLECTION)
        .where({ _openid: openid })
        .orderBy('date', 'desc')
        .get(),
      db.collection(ACCOUNTS_COLLECTION)
        .where({ _openid: openid })
        .get(),
      db.collection(LOANS_COLLECTION)
        .where({ _openid: openid })
        .orderBy('loanDate', 'desc')
        .get(),
      db.collection(TRANSFERS_COLLECTION)
        .where({ _openid: openid })
        .orderBy('date', 'desc')
        .get()
    ])

    console.log('导出数据完成')
    return {
      success: true,
      data: {
        bills: bills.data,
        accounts: accounts.data,
        loans: loans.data,
        transfers: transfers.data,
        exportTime: new Date().toISOString()
      }
    }
  } catch (err) {
    console.error('导出用户数据失败：', err)
    return {
      success: false,
      error: err.message || '导出数据失败'
    }
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  console.log('clearUserData 云函数被调用，action:', action, 'openid:', OPENID)

  switch (action) {
    case 'getStats':
      // 获取用户数据统计
      const stats = await getUserDataStats(OPENID)
      return {
        success: true,
        data: stats
      }

    case 'clearAll':
      // 清除所有数据
      const clearResult = await clearAllUserData(OPENID)
      return clearResult

    case 'export':
      // 导出数据
      const exportResult = await exportUserData(OPENID)
      return exportResult

    default:
      return {
        success: false,
        error: '未知操作'
      }
  }
}
