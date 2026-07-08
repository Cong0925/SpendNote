// 云函数：批量导入银行数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 银行集合名
const BANKS_COLLECTION = 'banks'

/**
 * 批量导入银行数据
 * @param {Array} banks - 银行数据数组
 */
exports.main = async (event, context) => {
  const { banks = [] } = event

  if (!banks || banks.length === 0) {
    return { success: false, error: '没有需要导入的数据' }
  }

  try {
    // 清空现有数据
    const existingBanks = await db.collection(BANKS_COLLECTION).get()
    if (existingBanks.data.length > 0) {
      const deletePromises = existingBanks.data.map(bank => {
        return db.collection(BANKS_COLLECTION).doc(bank._id).remove()
      })
      await Promise.all(deletePromises)
    }

    // 批量插入新数据
    const insertPromises = banks.map((bank, index) => {
      return db.collection(BANKS_COLLECTION).add({
        data: {
          ...bank,
          sortOrder: index + 1,
          createdAt: db.serverDate()
        }
      })
    })

    await Promise.all(insertPromises)

    return {
      success: true,
      message: `成功导入 ${banks.length} 家银行`,
      data: { count: banks.length }
    }
  } catch (err) {
    console.error('批量导入失败：', err)
    return { success: false, error: err.message || '导入失败' }
  }
}
