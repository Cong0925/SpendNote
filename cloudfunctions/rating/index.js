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
  const { action, rating, selectedTags, comment, images, ratingId, page = 1, pageSize = 10 } = event

  try {
    switch (action) {
      case 'getMyRating':
        return await getMyRating(OPENID)

      case 'submitRating':
        return await submitRating(OPENID, { rating, selectedTags, comment, images })

      case 'updateRating':
        return await updateRating(OPENID, { ratingId, rating, selectedTags, comment, images })

      case 'deleteRating':
        return await deleteRating(OPENID, ratingId)

      case 'listRatings':
        return await listRatings(OPENID, page, pageSize)

      case 'likeRating':
        return await likeRating(OPENID, ratingId)

      case 'dislikeRating':
        return await dislikeRating(OPENID, ratingId)

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

// 提交评价（每用户只能评一次）
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

    if (existing.data.length > 0) {
      return { success: false, error: '您已评价过，请使用修改功能' }
    }

    // 新增评价
    const now = new Date()
    const ratingData = {
      openid,
      rating,
      selectedTags: selectedTags || [],
      comment: comment || '',
      images: images || [],
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      createTime: now,
      updateTime: now
    }

    await ratingsCollection.add({ data: ratingData })

    return { success: true }
  } catch (error) {
    console.error('提交评价失败:', error)
    return { success: false, error: '提交失败' }
  }
}

// 更新评价
async function updateRating(openid, data) {
  try {
    const { ratingId, rating, selectedTags, comment, images } = data

    // 验证数据
    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: '评分无效' }
    }

    if (comment && comment.length > 200) {
      return { success: false, error: '评价内容过长' }
    }

    // 验证是否是自己的评价
    const existing = await ratingsCollection.doc(ratingId).get()
    if (!existing.data || existing.data.openid !== openid) {
      return { success: false, error: '无权修改此评价' }
    }

    // 更新评价
    await ratingsCollection.doc(ratingId).update({
      data: {
        rating,
        selectedTags: selectedTags || [],
        comment: comment || '',
        images: images || [],
        updateTime: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error('更新评价失败:', error)
    return { success: false, error: '更新失败' }
  }
}

// 删除评价
async function deleteRating(openid, ratingId) {
  try {
    if (!ratingId) {
      return { success: false, error: '评价ID无效' }
    }

    // 验证是否是自己的评价
    const existing = await ratingsCollection.doc(ratingId).get()
    if (!existing.data || existing.data.openid !== openid) {
      return { success: false, error: '无权删除此评价' }
    }

    // 删除评价
    await ratingsCollection.doc(ratingId).remove()

    return { success: true }
  } catch (error) {
    console.error('删除评价失败:', error)
    return { success: false, error: '删除失败' }
  }
}

// 获取评价列表（分页，我的评价置顶）
async function listRatings(openid, page, pageSize) {
  try {
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

    // 处理列表数据，标记自己的评价和点赞/踩状态
    let safeList = listRes.data.map(item => ({
      _id: item._id,
      rating: item.rating,
      selectedTags: item.selectedTags,
      comment: item.comment,
      images: item.images,
      createTime: item.createTime,
      likes: item.likes || 0,
      dislikes: item.dislikes || 0,
      isMine: item.openid === openid,
      isLiked: (item.likedBy || []).includes(openid),
      isDisliked: (item.dislikedBy || []).includes(openid),
      avatarUrl: '',
      nickName: '用户'
    }))

    // 将我的评价置顶
    const myReview = safeList.find(item => item.isMine)
    if (myReview) {
      safeList = safeList.filter(item => !item.isMine)
      safeList.unshift(myReview)
    }

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

// 点赞评价
async function likeRating(openid, ratingId) {
  try {
    if (!ratingId) {
      return { success: false, error: '评价ID无效' }
    }

    const ratingDoc = await ratingsCollection.doc(ratingId).get()
    if (!ratingDoc.data) {
      return { success: false, error: '评价不存在' }
    }

    const rating = ratingDoc.data
    const likedBy = rating.likedBy || []
    const dislikedBy = rating.dislikedBy || []
    const isLiked = likedBy.includes(openid)

    let updateData = {}

    if (isLiked) {
      // 取消点赞
      updateData = {
        likes: _.inc(-1),
        likedBy: _.pull(openid)
      }
    } else {
      // 点赞（同时取消踩）
      updateData = {
        likes: _.inc(1),
        likedBy: _.push(openid),
        dislikes: dislikedBy.includes(openid) ? _.inc(-1) : _.inc(0),
        dislikedBy: _.pull(openid)
      }
    }

    await ratingsCollection.doc(ratingId).update({ data: updateData })

    return { success: true, isLiked: !isLiked }
  } catch (error) {
    console.error('点赞失败:', error)
    return { success: false, error: '点赞失败' }
  }
}

// 踩评价
async function dislikeRating(openid, ratingId) {
  try {
    if (!ratingId) {
      return { success: false, error: '评价ID无效' }
    }

    const ratingDoc = await ratingsCollection.doc(ratingId).get()
    if (!ratingDoc.data) {
      return { success: false, error: '评价不存在' }
    }

    const rating = ratingDoc.data
    const likedBy = rating.likedBy || []
    const dislikedBy = rating.dislikedBy || []
    const isDisliked = dislikedBy.includes(openid)

    let updateData = {}

    if (isDisliked) {
      // 取消踩
      updateData = {
        dislikes: _.inc(-1),
        dislikedBy: _.pull(openid)
      }
    } else {
      // 踩（同时取消点赞）
      updateData = {
        dislikes: _.inc(1),
        dislikedBy: _.push(openid),
        likes: likedBy.includes(openid) ? _.inc(-1) : _.inc(0),
        likedBy: _.pull(openid)
      }
    }

    await ratingsCollection.doc(ratingId).update({ data: updateData })

    return { success: true, isDisliked: !isDisliked }
  } catch (error) {
    console.error('踩失败:', error)
    return { success: false, error: '踩失败' }
  }
}