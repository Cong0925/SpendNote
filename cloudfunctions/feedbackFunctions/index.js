// 云函数：feedbackFunctions
const cloud = require('wx-server-sdk')
const nodemailer = require('nodemailer')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 邮件配置
const EMAIL_CONFIG = {
  receiver: '18515155921@163.com',
  senderName: 'SpendNote反馈系统',
  maxFeedbacksPerEmail: 50  // 每封邮件最多50条反馈
}

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  switch (action) {
    case 'getList':
      return await getList(wxContext.OPENID, data)
    case 'create':
      return await create(wxContext.OPENID, data)
    case 'checkSafe':
      return await checkSafe(data.content)
    case 'sendPendingEmails':
      return await sendPendingEmails()
    default:
      return { success: false, error: '未知操作' }
  }
}

// 获取反馈列表
async function getList(openid, data) {
  try {
    const { page = 1, pageSize = 20 } = data
    const skip = (page - 1) * pageSize

    const countRes = await db.collection('feedbacks')
      .where({ _openid: openid })
      .count()

    const listRes = await db.collection('feedbacks')
      .where({ _openid: openid })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: {
        list: listRes.data,
        total: countRes.total
      }
    }
  } catch (err) {
    console.error('获取反馈列表失败：', err)
    return { success: false, error: err.message }
  }
}

// 创建反馈
async function create(openid, data) {
  try {
    const { type, content, images = [], contact = '' } = data

    // 验证必填字段
    if (!type || !content) {
      return { success: false, error: '请填写完整信息' }
    }

    // 验证类型
    const validTypes = ['bug', 'feature', 'other']
    if (!validTypes.includes(type)) {
      return { success: false, error: '无效的反馈类型' }
    }

    // 验证内容长度
    if (content.length > 500) {
      return { success: false, error: '内容不能超过500字' }
    }

    // 验证图片数量
    if (images.length > 3) {
      return { success: false, error: '最多上传3张图片' }
    }

    // 创建反馈记录
    const result = await db.collection('feedbacks').add({
      data: {
        _openid: openid,
        type,
        content,
        images,
        contact,
        status: 'submitted',
        emailSent: false,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    return { success: true, data: { id: result._id } }
  } catch (err) {
    console.error('创建反馈失败：', err)
    return { success: false, error: err.message }
  }
}

// 内容安全检测
async function checkSafe(content) {
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      content: content,
      openid: '',
      scene: 2,
      version: 2
    })

    const safe = result.result && result.result.suggest === 'pass'
    return { success: true, safe }
  } catch (err) {
    console.error('内容安全检测失败：', err)
    return { success: true, safe: true }
  }
}

// 发送未发送的反馈邮件
async function sendPendingEmails() {
  try {
    // 获取未发送邮件的反馈
    const feedbacksRes = await db.collection('feedbacks')
      .where({ emailSent: false })
      .orderBy('createTime', 'asc')
      .limit(100)  // 一次最多获取100条
      .get()

    if (feedbacksRes.data.length === 0) {
      return { success: true, message: '没有待发送的反馈' }
    }

    // 按用户分组
    const groupedFeedbacks = {}
    for (const feedback of feedbacksRes.data) {
      const openid = feedback._openid
      if (!groupedFeedbacks[openid]) {
        groupedFeedbacks[openid] = []
      }
      groupedFeedbacks[openid].push(feedback)
    }

    // 发送邮件（每封邮件最多30条）
    const sentIds = []
    let emailCount = 0

    for (const openid in groupedFeedbacks) {
      const userFeedbacks = groupedFeedbacks[openid]

      // 获取用户信息
      let userInfo = { nickName: '未知用户', avatarUrl: '' }
      try {
        const userRes = await db.collection('users')
          .where({ _openid: openid })
          .limit(1)
          .get()
        if (userRes.data.length > 0) {
          userInfo = userRes.data[0]
        }
      } catch (err) {
        console.error('获取用户信息失败：', err)
      }

      // 分批发送（每封邮件最多30条）
      for (let i = 0; i < userFeedbacks.length; i += EMAIL_CONFIG.maxFeedbacksPerEmail) {
        const batchFeedbacks = userFeedbacks.slice(i, i + EMAIL_CONFIG.maxFeedbacksPerEmail)

        // 转换图片为base64
        const feedbacksWithBase64 = await convertImagesToBase64(batchFeedbacks)

        // 生成邮件内容
        const emailContent = generateEmailContent(userInfo, feedbacksWithBase64)

        // 发送邮件
        try {
          await sendEmailViaSendGrid(emailContent, batchFeedbacks.length)
          // 标记为已发送
          for (const feedback of batchFeedbacks) {
            sentIds.push(feedback._id)
          }
          emailCount++
        } catch (err) {
          console.error('发送邮件失败：', err)
          // 邮件发送失败，不标记为已发送，下次重试
        }
      }
    }

    // 批量更新发送状态
    if (sentIds.length > 0) {
      for (const id of sentIds) {
        await db.collection('feedbacks')
          .doc(id)
          .update({
            data: {
              emailSent: true,
              emailSendTime: db.serverDate()
            }
          })
      }
    }

    return {
      success: true,
      data: {
        sentCount: sentIds.length,
        emailCount: emailCount
      }
    }
  } catch (err) {
    console.error('发送反馈邮件失败：', err)
    return { success: false, error: err.message }
  }
}

// 转换图片为base64
async function convertImagesToBase64(feedbacks) {
  const result = []

  for (const feedback of feedbacks) {
    const newFeedback = { ...feedback }

    if (feedback.images && feedback.images.length > 0) {
      const base64Images = []

      for (const imageUrl of feedback.images) {
        try {
          // 从云存储下载图片
          const fileRes = await cloud.downloadFile({
            fileID: imageUrl
          })

          // 转换为base64
          const base64 = fileRes.fileContent.toString('base64')
          const mimeType = getMimeType(imageUrl)
          base64Images.push(`data:${mimeType};base64,${base64}`)
        } catch (err) {
          console.error('下载图片失败：', imageUrl, err)
          // 下载失败时跳过该图片
        }
      }

      newFeedback.imagesBase64 = base64Images
    }

    result.push(newFeedback)
  }

  return result
}

// 获取MIME类型
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const mimeTypes = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp'
  }
  return mimeTypes[ext] || 'image/png'
}

// 通过163邮箱SMTP发送邮件
async function sendEmailViaSendGrid(htmlContent, count) {
  const emailUser = process.env.SMTP_USER
  const emailPass = process.env.SMTP_PASS

  if (!emailUser || !emailPass) {
    throw new Error('SMTP邮箱或授权密码未配置')
  }

  // 创建SMTP传输器
  const transporter = nodemailer.createTransport({
    host: 'smtp.163.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  })

  // 发送邮件
  const result = await transporter.sendMail({
    from: `"${EMAIL_CONFIG.senderName}" <${emailUser}>`,
    to: EMAIL_CONFIG.receiver,
    subject: `【SpendNote】收到 ${count} 条新的用户反馈`,
    html: htmlContent
  })

  return result
}

// 生成邮件内容
function generateEmailContent(userInfo, feedbacks) {
  const typeNameMap = {
    'bug': '问题反馈',
    'feature': '功能建议',
    'other': '其他'
  }

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SpendNote 用户反馈</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: white; padding: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .user-info { background: #f8faf9; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .user-info h2 { margin: 0 0 15px; font-size: 18px; color: #333; }
    .user-detail { display: flex; align-items: center; margin-bottom: 10px; }
    .user-avatar { width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; }
    .feedback-item { background: white; border: 1px solid #e8e8e8; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .feedback-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .feedback-type { background: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
    .feedback-content { margin-bottom: 15px; white-space: pre-wrap; }
    .feedback-images { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
    .feedback-image { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; }
    .feedback-meta { font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
    .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SpendNote 用户反馈</h1>
      <p>收到 ${feedbacks.length} 条新的用户反馈</p>
    </div>
    <div class="content">
      <div class="user-info">
        <h2>用户信息</h2>
        <div class="user-detail">
          ${userInfo.avatarUrl ? `<img class="user-avatar" src="${userInfo.avatarUrl}" alt="用户头像">` : ''}
          <div>
            <div><strong>昵称：</strong>${userInfo.nickName || '未知用户'}</div>
            <div><strong>用户ID：</strong>${feedbacks[0]._openid.slice(-8).toUpperCase()}</div>
          </div>
        </div>
      </div>

      ${feedbacks.map((feedback, index) => `
        <div class="feedback-item">
          <div class="feedback-header">
            <span class="feedback-type">${typeNameMap[feedback.type] || '其他'}</span>
          </div>
          <div class="feedback-content">${feedback.content}</div>
          ${feedback.imagesBase64 && feedback.imagesBase64.length > 0 ? `
            <div class="feedback-images">
              ${feedback.imagesBase64.map((img, idx) => `<img class="feedback-image" src="${img}" alt="反馈截图${idx + 1}">`).join('')}
            </div>
          ` : ''}
          <div class="feedback-meta">
            <div>反馈编号：${feedback._id.slice(-8).toUpperCase()}</div>
            <div>提交时间：${formatDate(feedback.createTime)}</div>
            ${feedback.contact ? `<div>联系方式：${feedback.contact}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="footer">
      <p>此邮件由 SpendNote 反馈系统自动发送</p>
      <p>如需回复用户，请通过小程序后台联系</p>
    </div>
  </div>
</body>
</html>
  `

  return html
}

// 格式化日期
function formatDate(date) {
  if (!date) return '未知时间'
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}
