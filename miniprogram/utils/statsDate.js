/**
 * 统计页面日期工具函数
 * 负责日期格式化、显示、范围计算
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 根据视图模式获取日期显示文本
 * @param {string} dateStr - 日期字符串
 * @param {string} mode - 视图模式 (day/month/quarter/year)
 * @returns {string} 显示文本
 */
function getDisplayDate(dateStr, mode) {
  const parts = dateStr.split('-')
  const y = parts[0]
  const m = parts[1] || '01'
  switch (mode) {
    case 'day': return dateStr
    case 'month': return `${y}-${m}`
    case 'quarter': return `${y} Q${Math.ceil(parseInt(m) / 3)}`
    case 'year': return `${y}`
    default: return dateStr
  }
}

/**
 * 根据日期字符串和模式计算日期范围
 * @param {string} dateStr - 日期字符串
 * @param {string} mode - 视图模式
 * @returns {Object} { start, end }
 */
function getDateRange(dateStr, mode) {
  const parts = dateStr.split('-')
  const y = parseInt(parts[0])
  const m = parseInt(parts[1]) || 1
  switch (mode) {
    case 'day':
      return { start: dateStr, end: dateStr }
    case 'month':
      return {
        start: `${y}-${String(m).padStart(2, '0')}-01`,
        end: `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`
      }
    case 'quarter': {
      const q = Math.ceil(m / 3)
      const qStart = (q - 1) * 3 + 1
      const qEnd = q * 3
      return {
        start: `${y}-${String(qStart).padStart(2, '0')}-01`,
        end: `${y}-${String(qEnd).padStart(2, '0')}-${new Date(y, qEnd, 0).getDate()}`
      }
    }
    case 'year':
      return { start: `${y}-01-01`, end: `${y}-12-31` }
    default:
      return { start: dateStr, end: dateStr }
  }
}

/**
 * 根据快捷标签获取日期范围
 * @param {string} value - 标签值 (day/month/quarter/year)
 * @returns {Object} { newDate, rangeStartDate, rangeEndDate }
 */
function getQuickTabDateRange(value) {
  const now = new Date()
  const realYear = now.getFullYear()
  const realMonth = now.getMonth() + 1
  const realDay = now.getDate()
  const realMonthStr = String(realMonth).padStart(2, '0')
  const realDayStr = String(realDay).padStart(2, '0')

  let newDate = ''
  let rangeStartDate = ''
  let rangeEndDate = ''

  if (value === 'day') {
    newDate = `${realYear}-${realMonthStr}-${realDayStr}`
    rangeStartDate = newDate
    rangeEndDate = newDate
  } else if (value === 'month') {
    newDate = `${realYear}-${realMonthStr}`
    rangeStartDate = `${realYear}-${realMonthStr}-01`
    const lastDay = new Date(realYear, realMonth, 0).getDate()
    rangeEndDate = `${realYear}-${realMonthStr}-${String(lastDay).padStart(2, '0')}`
  } else if (value === 'quarter') {
    const currentQuarter = Math.ceil(realMonth / 3) - 1
    const startMonth = currentQuarter * 3 + 1
    const endMonth = (currentQuarter + 1) * 3
    newDate = `${realYear}-${String(startMonth).padStart(2, '0')}-01`
    rangeStartDate = `${realYear}-${String(startMonth).padStart(2, '0')}-01`
    const lastDay = new Date(realYear, endMonth, 0).getDate()
    rangeEndDate = `${realYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  } else if (value === 'year') {
    newDate = `${realYear}`
    rangeStartDate = `${realYear}-01-01`
    rangeEndDate = `${realYear}-12-31`
  }

  return { newDate, rangeStartDate, rangeEndDate }
}

module.exports = { formatDate, getDisplayDate, getDateRange, getQuickTabDateRange }
