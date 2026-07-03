// 云函数：user
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { action, userInfo } = event
  const wxContext = cloud.getWXContext()

  // 保存用户信息
  if (action === 'save') {
    try {
      // 查询是否已存在用户
      const userRes = await db.collection('users')
        .where({ _openid: wxContext.OPENID })
        .get()

      if (userRes.data.length > 0) {
        // 更新用户信息
        await db.collection('users')
          .where({ _openid: wxContext.OPENID })
          .update({
            data: {
              avatarUrl: userInfo.avatarUrl,
              nickName: userInfo.nickName,
              lastLoginTime: db.serverDate()
            }
          })
      } else {
        // 新增用户
        await db.collection('users').add({
          data: {
            _openid: wxContext.OPENID,
            avatarUrl: userInfo.avatarUrl,
            nickName: userInfo.nickName,
            createTime: db.serverDate(),
            lastLoginTime: db.serverDate()
          }
        })
      }

      return { success: true }
    } catch (err) {
      console.error('保存用户信息失败：', err)
      return { success: false, error: err }
    }
  }

  // 获取用户信息
  if (action === 'get') {
    try {
      const userRes = await db.collection('users')
        .where({ _openid: wxContext.OPENID })
        .get()

      return { success: true, data: userRes.data[0] || null }
    } catch (err) {
      console.error('获取用户信息失败：', err)
      return { success: false, error: err }
    }
  }

  // 删除用户数据（用于清除用户数据功能）
  if (action === 'clear') {
    try {
      // 删除用户所有账单
      await db.collection('bills')
        .where({ _openid: wxContext.OPENID })
        .remove()

      // 删除用户所有账户
      await db.collection('accounts')
        .where({ _openid: wxContext.OPENID })
        .remove()

      // 删除用户所有借贷记录
      await db.collection('loans')
        .where({ _openid: wxContext.OPENID })
        .remove()

      // 删除用户记录
      await db.collection('users')
        .where({ _openid: wxContext.OPENID })
        .remove()

      return { success: true }
    } catch (err) {
      console.error('清除用户数据失败：', err)
      return { success: false, error: err }
    }
  }

  // 修改头像
  if (action === 'updateAvatar') {
    const { avatarUrl } = event
    try {
      await db.collection('users')
        .where({ _openid: wxContext.OPENID })
        .update({
          data: {
            avatarUrl: avatarUrl,
            updateTime: db.serverDate()
          }
        })

      return { success: true }
    } catch (err) {
      console.error('修改头像失败：', err)
      return { success: false, error: err }
    }
  }

  // 修改昵称
  if (action === 'updateNickname') {
    const { nickName } = event
    try {
      await db.collection('users')
        .where({ _openid: wxContext.OPENID })
        .update({
          data: {
            nickName: nickName,
            updateTime: db.serverDate()
          }
        })

      return { success: true }
    } catch (err) {
      console.error('修改昵称失败：', err)
      return { success: false, error: err }
    }
  }

  return { success: false, error: '未知操作' }
}
