// 云函数：银行管理（支持200+银行）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 银行集合名
const BANKS_COLLECTION = 'banks'

/**
 * 云函数入口
 * @param {Object} event - 事件参数
 * @param {string} event.action - 操作类型
 * @param {Object} event.data - 操作数据
 */
exports.main = async (event, context) => {
  const { action, data = {} } = event

  try {
    switch (action) {
      case 'list':
        return await listBanks(data)
      case 'listByCategory':
        return await listByCategory(data)
      case 'search':
        return await searchBanks(data)
      case 'getHot':
        return await getHotBanks()
      case 'init':
        return await initBanks()
      case 'add':
        return await addBank(data)
      case 'batchImport':
        return await batchImport(data)
      default:
        return { success: false, error: '未知操作类型' }
    }
  } catch (err) {
    console.error('银行操作失败：', err)
    return { success: false, error: err.message || '操作失败' }
  }
}

/**
 * 获取热门银行（首屏加载）
 */
async function getHotBanks() {
  const result = await db.collection(BANKS_COLLECTION)
    .where({ isHot: true })
    .orderBy('sortOrder', 'asc')
    .limit(30)
    .get()

  return {
    success: true,
    data: result.data
  }
}

/**
 * 按分类获取银行
 */
async function listByCategory(data) {
  const { category, page = 1, pageSize = 50 } = data

  if (!category) {
    return { success: false, error: '缺少分类参数' }
  }

  const result = await db.collection(BANKS_COLLECTION)
    .where({ category })
    .orderBy('sortOrder', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 获取该分类总数
  const countResult = await db.collection(BANKS_COLLECTION)
    .where({ category })
    .count()

  return {
    success: true,
    data: result.data,
    total: countResult.total,
    hasMore: result.data.length === pageSize
  }
}

/**
 * 搜索银行
 */
async function searchBanks(data) {
  const { keyword, limit = 20 } = data

  if (!keyword || keyword.trim() === '') {
    return { success: true, data: [] }
  }

  const searchKeyword = keyword.trim().toLowerCase()

  // 使用正则表达式进行模糊匹配
  const regex = db.RegExp({
    regexp: searchKeyword,
    options: 'i'
  })

  const result = await db.collection(BANKS_COLLECTION)
    .where(_.or([
      { name: regex },
      { shortName: regex },
      { pinyin: regex }
    ]))
    .orderBy('sortOrder', 'asc')
    .limit(limit)
    .get()

  return {
    success: true,
    data: result.data
  }
}

/**
 * 获取银行列表（分页）
 */
async function listBanks(data) {
  const { page = 1, pageSize = 50, category } = data

  let whereCondition = {}

  if (category) {
    whereCondition.category = category
  }

  const result = await db.collection(BANKS_COLLECTION)
    .where(whereCondition)
    .orderBy('sortOrder', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 获取总数
  const countResult = await db.collection(BANKS_COLLECTION)
    .where(whereCondition)
    .count()

  return {
    success: true,
    data: result.data,
    total: countResult.total,
    hasMore: result.data.length === pageSize
  }
}

/**
 * 初始化银行数据
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

  // 预设银行数据（核心银行）
  const defaultBanks = [
    // 国有银行
    { name: '中国工商银行', shortName: '工商银行', pinyin: 'icbc', category: 'state-owned', isHot: true, icon: '/images/banks/icbc.png' },
    { name: '中国农业银行', shortName: '农业银行', pinyin: 'abc', category: 'state-owned', isHot: true, icon: '/images/banks/abc.png' },
    { name: '中国银行', shortName: '中国银行', pinyin: 'boc', category: 'state-owned', isHot: true, icon: '/images/banks/boc.png' },
    { name: '中国建设银行', shortName: '建设银行', pinyin: 'ccb', category: 'state-owned', isHot: true, icon: '/images/banks/ccb.png' },
    { name: '交通银行', shortName: '交通银行', pinyin: 'bankcomm', category: 'state-owned', isHot: true, icon: '/images/banks/bankcomm.png' },
    { name: '中国邮政储蓄银行', shortName: '邮储银行', pinyin: 'psbc', category: 'state-owned', isHot: true, icon: '/images/banks/psbc.png' },

    // 股份制银行
    { name: '招商银行', shortName: '招商银行', pinyin: 'cmb', category: 'joint-stock', isHot: true, icon: '/images/banks/cmb.png' },
    { name: '中信银行', shortName: '中信银行', pinyin: 'citic', category: 'joint-stock', isHot: true, icon: '/images/banks/citic.png' },
    { name: '中国光大银行', shortName: '光大银行', pinyin: 'cebb', category: 'joint-stock', isHot: true, icon: '/images/banks/cebb.png' },
    { name: '华夏银行', shortName: '华夏银行', pinyin: 'huaxia', category: 'joint-stock', isHot: true, icon: '/images/banks/huaxia.png' },
    { name: '民生银行', shortName: '民生银行', pinyin: 'cmbc', category: 'joint-stock', isHot: true, icon: '/images/banks/cmbc.png' },
    { name: '广发银行', shortName: '广发银行', pinyin: 'gdb', category: 'joint-stock', isHot: true, icon: '/images/banks/gdb.png' },
    { name: '平安银行', shortName: '平安银行', pinyin: 'pab', category: 'joint-stock', isHot: true, icon: '/images/banks/pab.png' },
    { name: '浦发银行', shortName: '浦发银行', pinyin: 'spdb', category: 'joint-stock', isHot: true, icon: '/images/banks/spdb.png' },
    { name: '兴业银行', shortName: '兴业银行', pinyin: 'cib', category: 'joint-stock', isHot: true, icon: '/images/banks/cib.png' },
    { name: '浙商银行', shortName: '浙商银行', pinyin: 'czbank', category: 'joint-stock', isHot: false, icon: '/images/banks/czbank.png' },
    { name: '渤海银行', shortName: '渤海银行', pinyin: 'cbhb', category: 'joint-stock', isHot: false, icon: '/images/banks/cbhb.png' },
    { name: '恒丰银行', shortName: '恒丰银行', pinyin: 'egbank', category: 'joint-stock', isHot: false, icon: '/images/banks/egbank.png' },

    // 城市商业银行（示例）
    { name: '北京银行', shortName: '北京银行', pinyin: 'bob', category: 'city-commercial', isHot: true, icon: '/images/banks/bob.png' },
    { name: '上海银行', shortName: '上海银行', pinyin: 'bos', category: 'city-commercial', isHot: true, icon: '/images/banks/bos.png' },
    { name: '南京银行', shortName: '南京银行', pinyin: 'njcb', category: 'city-commercial', isHot: true, icon: '/images/banks/njcb.png' },
    { name: '宁波银行', shortName: '宁波银行', pinyin: 'nbcb', category: 'city-commercial', isHot: true, icon: '/images/banks/nbcb.png' },
    { name: '江苏银行', shortName: '江苏银行', pinyin: 'jsb', category: 'city-commercial', isHot: true, icon: '/images/banks/jsb.png' },
    { name: '杭州银行', shortName: '杭州银行', pinyin: 'hzcb', category: 'city-commercial', isHot: true, icon: '/images/banks/hzcb.png' },

    // 外资银行（示例）
    { name: '汇丰银行', shortName: '汇丰银行', pinyin: 'hsbc', category: 'foreign', isHot: false, icon: '/images/banks/hsbc.png' },
    { name: '花旗银行', shortName: '花旗银行', pinyin: 'citi', category: 'foreign', isHot: false, icon: '/images/banks/citi.png' },
    { name: '渣打银行', shortName: '渣打银行', pinyin: 'scb', category: 'foreign', isHot: false, icon: '/images/banks/scb.png' }
  ]

  // 批量插入
  const insertPromises = defaultBanks.map((bank, index) => {
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
    message: '银行数据初始化成功',
    data: { count: defaultBanks.length }
  }
}

/**
 * 添加银行（用户自定义）
 */
async function addBank(data) {
  const { name, shortName, pinyin, category = 'other', icon } = data

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

  // 获取当前最大排序号
  const maxSortResult = await db.collection(BANKS_COLLECTION)
    .orderBy('sortOrder', 'desc')
    .limit(1)
    .get()

  const maxSort = maxSortResult.data.length > 0 ? maxSortResult.data[0].sortOrder : 0

  const result = await db.collection(BANKS_COLLECTION).add({
    data: {
      name,
      shortName,
      pinyin: pinyin || name,
      category,
      isHot: false,
      sortOrder: maxSort + 1,
      icon: icon || '/images/banks/other.png',
      createdAt: db.serverDate()
    }
  })

  return {
    success: true,
    data: { _id: result._id }
  }
}

/**
 * 批量导入银行数据
 */
async function batchImport(data) {
  const { banks = [] } = data

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

    // 批量插入新数据（分批插入，每批100条）
    const batchSize = 100
    for (let i = 0; i < banks.length; i += batchSize) {
      const batch = banks.slice(i, i + batchSize)
      const insertPromises = batch.map((bank, index) => {
        return db.collection(BANKS_COLLECTION).add({
          data: {
            ...bank,
            sortOrder: i + index + 1,
            createdAt: db.serverDate()
          }
        })
      })
      await Promise.all(insertPromises)
    }

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
