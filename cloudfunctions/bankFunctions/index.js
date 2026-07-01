// 云函数：银行管理
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 银行集合名
const BANKS_COLLECTION = 'banks'

// 预设银行数据
const DEFAULT_BANKS = [
  { name: '中国工商银行', shortName: '工商银行', icon: 'bank-icbc.png' },
  { name: '中国农业银行', shortName: '农业银行', icon: 'bank-abc.png' },
  { name: '中国银行', shortName: '中国银行', icon: 'bank-boc.png' },
  { name: '中国建设银行', shortName: '建设银行', icon: 'bank-ccb.png' },
  { name: '交通银行', shortName: '交通银行', icon: 'bank-comm.png' },
  { name: '招商银行', shortName: '招商银行', icon: 'bank-cmb.png' },
  { name: '中信银行', shortName: '中信银行', icon: 'bank-citic.png' },
  { name: '中国光大银行', shortName: '光大银行', icon: 'bank-cebb.png' },
  { name: '华夏银行', shortName: '华夏银行', icon: 'bank-huaxia.png' },
  { name: '民生银行', shortName: '民生银行', icon: 'bank-cmbc.png' },
  { name: '广发银行', shortName: '广发银行', icon: 'bank-gdb.png' },
  { name: '平安银行', shortName: '平安银行', icon: 'bank-pab.png' },
  { name: '浦发银行', shortName: '浦发银行', icon: 'bank-spdb.png' },
  { name: '兴业银行', shortName: '兴业银行', icon: 'bank-cib.png' },
  { name: '邮政储蓄银行', shortName: '邮储银行', icon: 'bank-psbc.png' },
  { name: '北京银行', shortName: '北京银行', icon: 'bank-bob.png' },
  { name: '上海银行', shortName: '上海银行', icon: 'bank-bos.png' },
  { name: '南京银行', shortName: '南京银行', icon: 'bank-njcb.png' },
  { name: '宁波银行', shortName: '宁波银行', icon: 'bank-nbcb.png' },
  { name: '江苏银行', shortName: '江苏银行', icon: 'bank-jsb.png' },
  { name: '杭州银行', shortName: '杭州银行', icon: 'bank-hzcb.png' },
  { name: '其他银行', shortName: '其他', icon: 'bank-other.png' }
]

/**
 * 云函数入口
 * @param {Object} event - 事件参数
 * @param {string} event.action - 操作类型：list/init/add
 * @param {Object} event.data - 操作数据
 */
exports.main = async (event, context) => {
  const { action, data } = event

  try {
    switch (action) {
      case 'list':
        return await listBanks()
      case 'init':
        return await initBanks()
      case 'add':
        return await addBank(data)
      default:
        return { success: false, error: '未知操作类型' }
    }
  } catch (err) {
    console.error('银行操作失败：', err)
    return { success: false, error: err.message || '操作失败' }
  }
}

/**
 * 获取银行列表
 */
async function listBanks() {
  const result = await db.collection(BANKS_COLLECTION)
    .orderBy('name', 'asc')
    .get()

  return {
    success: true,
    data: result.data
  }
}

/**
 * 初始化银行数据（仅首次调用）
 */
async function initBanks() {
  // 检查是否已初始化
  const countResult = await db.collection(BANKS_COLLECTION).count()
  if (countResult.total > 0) {
    return {
      success: true,
      message: '银行数据已存在',
      data: { count: countResult.total }
    }
  }

  // 批量插入预设银行
  const insertPromises = DEFAULT_BANKS.map(bank => {
    return db.collection(BANKS_COLLECTION).add({
      data: {
        ...bank,
        createdAt: db.serverDate()
      }
    })
  })

  await Promise.all(insertPromises)

  return {
    success: true,
    message: '银行数据初始化成功',
    data: { count: DEFAULT_BANKS.length }
  }
}

/**
 * 添加银行（用户自定义）
 */
async function addBank(data) {
  const { name, shortName, icon } = data

  if (!name || !shortName) {
    return { success: false, error: '缺少必填参数' }
  }

  // 检查是否已存在
  const existResult = await db.collection(BANKS_COLLECTION)
    .where({ name })
    .count()

  if (existResult.total > 0) {
    return { success: false, error: '银行已存在' }
  }

  const result = await db.collection(BANKS_COLLECTION).add({
    data: {
      name,
      shortName,
      icon: icon || 'bank-other.png',
      createdAt: db.serverDate()
    }
  })

  return {
    success: true,
    data: { _id: result._id }
  }
}
