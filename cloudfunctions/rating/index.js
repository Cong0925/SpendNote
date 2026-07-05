// 云函数：rating
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const ratingsCollection = db.collection('ratings')

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, rating, selectedTags, comment, images, page = 1, pageSize = 10 } = event

  try {
    switch (action) {
      case 'getMyRating':
        return await getMyRating(OPENID)

      case 'submitRating':
        return await submitRating(OPENID, { rating, selectedTags, comment, images })

      case 'listRatings':
        return await listRatings(page, pageSize)

      default:
        return { success: false, error: '未知操作' }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return { success: false, error: error.message || '服务器错误' }
  }
}

// 获取用户自己的评价
async function getMyRating(openid) {
  try {
    const res = await ratingsCollection
      .where({ openid })
      .limit(1)
      .get()

    return {
      success: true,
      data: res.data.length > 0 ? res.data[0] : null
    }
  } catch (error) {
    console.error('获取评价失败:', error)
    return { success: false, error: '获取失败' }
  }
}

// 提交或更新评价（每用户只能评一次，可修改）
async function submitRating(openid, data) {
  try {
    const { rating, selectedTags, comment, images } = data

    // 验证数据
    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: '评分无效' }
    }

    if (comment && comment.length > 200) {
      return { success: false, error: '评价内容过长' }
    }

    // 检查是否已有评价
    const existing = await ratingsCollection
      .where({ openid })
      .limit(1)
      .get()

    const now = new Date()
    const ratingData = {
      openid,
      rating,
      selectedTags: selectedTags || [],
      comment: comment || '',
      images: images || [],
      updateTime: now
    }

    if (existing.data.length > 0) {
      // 更新已有评价
      await ratingsCollection.doc(existing.data[0]._id).update({
        data: ratingData
      })
    } else {
      // 新增评价
      ratingData.createTime = now
      await ratingsCollection.add({ data: ratingData })
    }

    return { success: true }
  } catch (error) {
    console.error('提交评价失败:', error)
    return { success: false, error: '提交失败' }
  }
}

// 获取评价列表（分页，显示所有用户的评价）
async function listRatings(page, pageSize) {
  try {
    const { OPENID } = cloud.getWXContext()
    const skip = (page - 1) * pageSize

    // 获取总数（显示所有评价）
    const countRes = await ratingsCollection.count()

    // 获取列表（显示所有评价，按时间倒序）
    const listRes = await ratingsCollection
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    // 计算平均分和各类型数量（显示所有评价）
    const allRatings = await ratingsCollection
      .field({ rating: true, images: true })
      .get()

    let avgRating = 0
    let goodCount = 0
    let midCount = 0
    let badCount = 0
    let hasImageCount = 0

    if (allRatings.data.length > 0) {
      const sum = allRatings.data.reduce((acc, item) => acc + item.rating, 0)
      avgRating = sum / allRatings.data.length

      allRatings.data.forEach(item => {
        if (item.rating >= 4) goodCount++
        else if (item.rating === 3) midCount++
        else badCount++

        if (item.images && item.images.length > 0) hasImageCount++
      })
    }

    // 移除 openid 和其他敏感信息，标记自己的评价
    const safeList = listRes.data.map(item => ({
      _id: item._id,
      rating: item.rating,
      selectedTags: item.selectedTags,
      comment: item.comment,
      images: item.images,
      createTime: item.createTime,
      isMine: item.openid === OPENID,
      // 使用默认头像和昵称
      avatarUrl: '',
      nickName: '用户'
    }))

    return {
      success: true,
      data: {
        list: safeList,
        total: countRes.total,
        avgRating,
        goodCount,
        midCount,
        badCount,
        hasImageCount
      }
    }
  } catch (error) {
    console.error('获取评价列表失败:', error)
    return { success: false, error: '获取失败' }
  }
}