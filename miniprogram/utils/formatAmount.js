/**
 * 金额格式化工具函数
 * 支持自动单位换算：元、万、百万、千万、亿、百亿、千亿
 */

/**
 * 金额单位换算
 * @param {number} amount - 金额（元）
 * @returns {{ value: string, unit: string }} 换算后的值和单位
 */
function formatAmountWithUnit(amount) {
  const num = parseFloat(amount) || 0
  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  // 梯度：元、万、百万、千万、亿、百亿、千亿
  if (absNum >= 100000000000) {
    // 千亿：>= 1000亿
    return { value: sign + (absNum / 100000000000).toFixed(2), unit: '千亿' }
  } else if (absNum >= 10000000000) {
    // 百亿：>= 100亿
    return { value: sign + (absNum / 10000000000).toFixed(2), unit: '百亿' }
  } else if (absNum >= 100000000) {
    // 亿：>= 1亿
    return { value: sign + (absNum / 100000000).toFixed(2), unit: '亿' }
  } else if (absNum >= 10000000) {
    // 千万：>= 1000万
    return { value: sign + (absNum / 10000000).toFixed(2), unit: '千万' }
  } else if (absNum >= 1000000) {
    // 百万：>= 100万
    return { value: sign + (absNum / 1000000).toFixed(2), unit: '百万' }
  } else if (absNum >= 10000) {
    // 万：>= 1万
    return { value: sign + (absNum / 10000).toFixed(2), unit: '万' }
  } else {
    // 元：< 1万
    return { value: sign + absNum.toFixed(2), unit: '元' }
  }
}

/**
 * 格式化金额显示（带千分位，元为单位）
 * @param {number} amount - 金额
 * @returns {string} 格式化后的金额字符串，如 '1,234,567.89'
 */
function formatAmount(amount) {
  const num = parseFloat(amount) || 0
  const parts = num.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

/**
 * 格式化金额显示（不带千分位，元为单位）
 * @param {number} amount - 金额
 * @returns {string} 格式化后的金额字符串，如 '1234567.89'
 */
function formatAmountRaw(amount) {
  return (parseFloat(amount) || 0).toFixed(2)
}

module.exports = {
  formatAmountWithUnit,
  formatAmount,
  formatAmountRaw
}
