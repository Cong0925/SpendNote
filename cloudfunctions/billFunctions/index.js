// 云函数入口文件 - billFunctions
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const billsCollection = db.collection('bills')
const categoriesCollection = db.collection('categories')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  switch (event.action) {
    case 'addBill':
      return await addBill(OPENID, event.data)
    case 'getBills':
      return await getBills(OPENID, event.data)
    case 'getBillsByDateRange':
      return await getBillsByDateRange(OPENID, event.data)
    case 'deleteBill':
      return await deleteBill(OPENID, event.billId)
    case 'getStats':
      return await getStats(OPENID, event.data)
    case 'getStatsByDateRange':
      return await getStatsByDateRange(OPENID, event.data)
    case 'initCategories':
      return await initCategories(OPENID)
    case 'getCategories':
      return await getCategories(OPENID, event.data)
    default:
      return { success: false, error: 'Unknown action' }
  }
}

// 添加账单
async function addBill(openid, data) {
  try {
    const { type, amount, category, icon, note, date } = data

    if (!type || !amount || !category || !date) {
      return { success: false, error: '缺少必要参数' }
    }

    const result = await billsCollection.add({
      data: {
        _openid: openid,
        type: type,
        amount: parseFloat(amount),
        category: category,
        icon: icon || '',
        note: note || '',
        date: date,
        created_at: db.serverDate()
      }
    })

    return { success: true, id: result._id }
  } catch (error) {
    console.error('添加账单失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取账单列表
async function getBills(openid, data = {}) {
  try {
    const { page = 1, pageSize = 20, month } = data

    let query = billsCollection.where({
      _openid: openid
    })

    // 按月筛选
    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31`
      query = billsCollection.where({
        _openid: openid,
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total

    // 分页查询
    const skip = (page - 1) * pageSize
    const result = await query
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: result.data,
      total: total,
      page: page,
      pageSize: pageSize
    }
  } catch (error) {
    console.error('获取账单失败:', error)
    return { success: false, error: error.message }
  }
}

// 删除账单
async function deleteBill(openid, billId) {
  try {
    if (!billId) {
      return { success: false, error: '缺少账单ID' }
    }

    const result = await billsCollection.doc(billId).remove()

    return { success: true, deleted: result.stats.removed }
  } catch (error) {
    console.error('删除账单失败:', error)
    return { success: false, error: error.message }
  }
}

// 按日期范围获取账单
async function getBillsByDateRange(openid, data = {}) {
  try {
    const { startDate, endDate, page = 1, pageSize = 50 } = data

    if (!startDate || !endDate) {
      return { success: false, error: '缺少日期参数' }
    }

    let query = billsCollection.where({
      _openid: openid,
      date: db.command.gte(startDate).and(db.command.lte(endDate))
    })

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total

    // 分页查询
    const skip = (page - 1) * pageSize
    const result = await query
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: result.data,
      total: total,
      page: page,
      pageSize: pageSize
    }
  } catch (error) {
    console.error('获取账单失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取统计数据
async function getStats(openid, data = {}) {
  try {
    const { month } = data

    let query = billsCollection.where({
      _openid: openid
    })

    // 按月筛选
    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31`
      query = billsCollection.where({
        _openid: openid,
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }

    const result = await query.get()
    const bills = result.data

    // 计算总支出和总收入
    let totalExpense = 0
    let totalIncome = 0

    // 按分类统计
    const categoryStats = {}

    bills.forEach(bill => {
      if (bill.type === 'expense') {
        totalExpense += bill.amount
      } else {
        totalIncome += bill.amount
      }

      const key = `${bill.type}_${bill.category}`
      if (!categoryStats[key]) {
        categoryStats[key] = {
          type: bill.type,
          category: bill.category,
          icon: bill.icon,
          amount: 0,
          count: 0
        }
      }
      categoryStats[key].amount += bill.amount
      categoryStats[key].count++
    })

    // 转换为数组并排序
    const categoryArray = Object.values(categoryStats).sort((a, b) => b.amount - a.amount)

    return {
      success: true,
      data: {
        totalExpense: totalExpense,
        totalIncome: totalIncome,
        balance: totalIncome - totalExpense,
        categoryStats: categoryArray,
        billCount: bills.length
      }
    }
  } catch (error) {
    console.error('获取统计失败:', error)
    return { success: false, error: error.message }
  }
}

// 按日期范围获取统计数据
async function getStatsByDateRange(openid, data = {}) {
  try {
    const { startDate, endDate } = data

    if (!startDate || !endDate) {
      return { success: false, error: '缺少日期参数' }
    }

    let query = billsCollection.where({
      _openid: openid,
      date: db.command.gte(startDate).and(db.command.lte(endDate))
    })

    const result = await query.get()
    const bills = result.data

    // 计算总支出和总收入
    let totalExpense = 0
    let totalIncome = 0

    // 按分类统计
    const categoryStats = {}

    bills.forEach(bill => {
      const amount = parseFloat(bill.amount) || 0
      if (bill.type === 'expense') {
        totalExpense += amount
      } else {
        totalIncome += amount
      }

      const key = `${bill.type}_${bill.category}`
      if (!categoryStats[key]) {
        categoryStats[key] = {
          type: bill.type,
          category: bill.category,
          icon: bill.icon,
          amount: 0,
          count: 0
        }
      }
      categoryStats[key].amount += amount
      categoryStats[key].count++
    })

    // 转换为数组并排序
    const categoryArray = Object.values(categoryStats).sort((a, b) => b.amount - a.amount)

    return {
      success: true,
      data: {
        totalExpense: totalExpense,
        totalIncome: totalIncome,
        balance: totalIncome - totalExpense,
        categoryStats: categoryArray,
        billCount: bills.length
      }
    }
  } catch (error) {
    console.error('获取统计失败:', error)
    return { success: false, error: error.message }
  }
}

// 初始化默认分类
async function initCategories(openid) {
  try {
    // 检查是否已初始化
    const existing = await categoriesCollection.where({
      _openid: openid
    }).count()

    if (existing.total > 0) {
      return { success: true, message: '分类已存在' }
    }

    // 默认支出分类
    const expenseCategories = [
      { name: '餐饮', icon: '🍜', type: 'expense', sort: 1 },
      { name: '交通', icon: '🚗', type: 'expense', sort: 2 },
      { name: '购物', icon: '🛒', type: 'expense', sort: 3 },
      { name: '娱乐', icon: '🎬', type: 'expense', sort: 4 },
      { name: '居住', icon: '💡', type: 'expense', sort: 5 },
      { name: '通讯', icon: '📱', type: 'expense', sort: 6 },
      { name: '医疗', icon: '🏥', type: 'expense', sort: 7 },
      { name: '教育', icon: '📚', type: 'expense', sort: 8 },
      { name: '服饰', icon: '👕', type: 'expense', sort: 9 },
      { name: '其他', icon: '💰', type: 'expense', sort: 10 }
    ]

    // 默认收入分类
    const incomeCategories = [
      { name: '工资', icon: '💵', type: 'income', sort: 1 },
      { name: '奖金', icon: '💰', type: 'income', sort: 2 },
      { name: '红包', icon: '🎁', type: 'income', sort: 3 },
      { name: '投资', icon: '💹', type: 'income', sort: 4 },
      { name: '兼职', icon: '💼', type: 'income', sort: 5 },
      { name: '其他', icon: '📝', type: 'income', sort: 6 }
    ]

    const allCategories = [...expenseCategories, ...incomeCategories]

    // 批量添加
    const addPromises = allCategories.map(cat => {
      return categoriesCollection.add({
        data: {
          _openid: openid,
          ...cat
        }
      })
    })

    await Promise.all(addPromises)

    return { success: true, message: '初始化分类成功' }
  } catch (error) {
    console.error('初始化分类失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取分类列表
async function getCategories(openid, data = {}) {
  try {
    const { type } = data

    let query = categoriesCollection.where({
      _openid: openid
    })

    if (type) {
      query = categoriesCollection.where({
        _openid: openid,
        type: type
      })
    }

    const result = await query.orderBy('sort', 'asc').get()

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('获取分类失败:', error)
    return { success: false, error: error.message }
  }
}
