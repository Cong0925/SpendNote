// 云函数：categoryFunctions
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  switch (action) {
    case 'getList':
      return await getList(wxContext.OPENID)
    case 'add':
      return await addCategory(wxContext.OPENID, data)
    case 'update':
      return await updateCategory(wxContext.OPENID, data)
    case 'delete':
      return await deleteCategory(wxContext.OPENID, data)
    case 'move':
      return await moveCategory(wxContext.OPENID, data)
    case 'updateSort':
      return await updateSort(wxContext.OPENID, data)
    case 'initDefaultCategories':
      return await initDefaultCategories(wxContext.OPENID)
    default:
      return { success: false, error: '未知操作' }
  }
}

// 获取分类列表
async function getList(openid) {
  try {
    const expenseRes = await db.collection('categories')
      .where({ _openid: openid, type: 'expense' })
      .orderBy('sort', 'asc')
      .get()

    const incomeRes = await db.collection('categories')
      .where({ _openid: openid, type: 'income' })
      .orderBy('sort', 'asc')
      .get()

    return {
      success: true,
      data: {
        expense: expenseRes.data,
        income: incomeRes.data
      }
    }
  } catch (err) {
    console.error('获取分类列表失败：', err)
    return { success: false, error: err.message }
  }
}

// 添加分类
async function addCategory(openid, data) {
  try {
    const { name, type, icon } = data

    // 验证参数
    if (!name || !type || !icon) {
      return { success: false, error: '请填写完整信息' }
    }

    // 验证类型
    if (!['expense', 'income'].includes(type)) {
      return { success: false, error: '无效的分类类型' }
    }

    // 检查同名分类
    const existingRes = await db.collection('categories')
      .where({ _openid: openid, name: name, type: type })
      .count()

    if (existingRes.total > 0) {
      return { success: false, error: '该分类已存在' }
    }

    // 获取当前最大排序值
    const maxSortRes = await db.collection('categories')
      .where({ _openid: openid, type: type })
      .orderBy('sort', 'desc')
      .limit(1)
      .get()

    const maxSort = maxSortRes.data.length > 0 ? maxSortRes.data[0].sort : 0

    // 添加分类
    const result = await db.collection('categories').add({
      data: {
        _openid: openid,
        name,
        type,
        icon,
        sort: maxSort + 1,
        isBuiltin: false,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    return { success: true, data: { id: result._id } }
  } catch (err) {
    console.error('添加分类失败：', err)
    return { success: false, error: err.message }
  }
}

// 更新分类
async function updateCategory(openid, data) {
  try {
    const { id, name, icon } = data

    // 验证参数
    if (!id) {
      return { success: false, error: '分类ID不能为空' }
    }

    // 验证分类是否存在
    const categoryRes = await db.collection('categories').doc(id).get()

    if (!categoryRes.data) {
      return { success: false, error: '分类不存在' }
    }

    if (categoryRes.data._openid !== openid) {
      return { success: false, error: '无权修改此分类' }
    }

    // 更新分类
    await db.collection('categories').doc(id).update({
      data: {
        name: name || categoryRes.data.name,
        icon: icon || categoryRes.data.icon,
        updateTime: db.serverDate()
      }
    })

    return { success: true, message: '修改成功' }
  } catch (err) {
    console.error('更新分类失败：', err)
    return { success: false, error: err.message }
  }
}

// 删除分类
async function deleteCategory(openid, data) {
  try {
    const { id } = data

    // 验证参数
    if (!id) {
      return { success: false, error: '分类ID不能为空' }
    }

    // 验证分类是否存在
    const categoryRes = await db.collection('categories').doc(id).get()

    if (!categoryRes.data) {
      return { success: false, error: '分类不存在' }
    }

    if (categoryRes.data._openid !== openid) {
      return { success: false, error: '无权删除此分类' }
    }

    // 删除分类
    await db.collection('categories').doc(id).remove()

    return { success: true, message: '删除成功' }
  } catch (err) {
    console.error('删除分类失败：', err)
    return { success: false, error: err.message }
  }
}

// 移动分类顺序
async function moveCategory(openid, data) {
  try {
    const { id, type, direction } = data

    // 验证参数
    if (!id || !type || !direction) {
      return { success: false, error: '参数不完整' }
    }

    // 获取当前分类
    const categoryRes = await db.collection('categories').doc(id).get()

    if (!categoryRes.data) {
      return { success: false, error: '分类不存在' }
    }

    if (categoryRes.data._openid !== openid) {
      return { success: false, error: '无权操作此分类' }
    }

    const currentSort = categoryRes.data.sort

    // 获取同类型的所有分类
    const allCategoriesRes = await db.collection('categories')
      .where({ _openid: openid, type: type })
      .orderBy('sort', 'asc')
      .get()

    const allCategories = allCategoriesRes.data

    // 找到当前分类的索引
    const currentIndex = allCategories.findIndex(c => c._id === id)

    if (currentIndex === -1) {
      return { success: false, error: '分类不存在' }
    }

    // 判断是否可以移动
    if (direction === 'up' && currentIndex === 0) {
      return { success: false, error: '已经是第一个了' }
    }

    if (direction === 'down' && currentIndex === allCategories.length - 1) {
      return { success: false, error: '已经是最后一个了' }
    }

    // 获取要交换的分类
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const targetCategory = allCategories[targetIndex]

    // 交换排序值
    await db.collection('categories').doc(id).update({
      data: { sort: targetCategory.sort }
    })

    await db.collection('categories').doc(targetCategory._id).update({
      data: { sort: currentSort }
    })

    return { success: true, message: '移动成功' }
  } catch (err) {
    console.error('移动分类失败：', err)
    return { success: false, error: err.message }
  }
}

// 批量更新分类排序
async function updateSort(openid, data) {
  try {
    const { type, ids } = data

    // 验证参数
    if (!type || !ids || !Array.isArray(ids)) {
      return { success: false, error: '参数不完整' }
    }

    // 批量更新排序
    const updatePromises = ids.map((id, index) => {
      return db.collection('categories').doc(id).update({
        data: { sort: index + 1 }
      })
    })

    await Promise.all(updatePromises)

    return { success: true, message: '排序更新成功' }
  } catch (err) {
    console.error('更新分类排序失败：', err)
    return { success: false, error: err.message }
  }
}

// 初始化默认分类（新用户首次使用时调用）
async function initDefaultCategories(openid) {
  try {
    // 检查是否已有分类，避免重复初始化
    const existingRes = await db.collection('categories')
      .where({ _openid: openid })
      .count()

    if (existingRes.total > 0) {
      return { success: true, message: '分类已存在，跳过初始化' }
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

    // 合并所有默认分类
    const allCategories = [...expenseCategories, ...incomeCategories]

    // 批量添加到数据库
    const addPromises = allCategories.map(category => {
      return db.collection('categories').add({
        data: {
          _openid: openid,
          name: category.name,
          type: category.type,
          icon: category.icon,
          sort: category.sort,
          isBuiltin: true,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    })

    await Promise.all(addPromises)

    console.log(`初始化默认分类成功，共添加 ${allCategories.length} 个分类`)
    return { success: true, message: '初始化默认分类成功' }
  } catch (err) {
    console.error('初始化默认分类失败：', err)
    return { success: false, error: err.message }
  }
}
