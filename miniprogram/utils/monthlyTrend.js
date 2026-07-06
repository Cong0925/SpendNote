/**
 * 月度趋势数据处理工具
 * 负责云函数调用和柱状图数据计算
 */
const { formatAmount } = require('./formatAmount')

/**
 * 从云函数加载月度趋势数据
 * @param {number} year - 年份
 * @returns {Promise<Object>} { monthlyTrend, maxMonthlyAmount }
 */
async function loadMonthlyTrendData(year) {
  const res = await wx.cloud.callFunction({
    name: 'billFunctions',
    data: { action: 'getMonthlyTrend', data: { year } }
  })

  if (!res.result.success) {
    return { monthlyTrend: [], maxMonthlyAmount: 0 }
  }

  const trend = res.result.data || []
  let maxAmount = 0
  trend.forEach(item => {
    const total = (item.expense || 0) + (item.income || 0)
    if (total > maxAmount) maxAmount = total
  })

  const monthlyTrend = trend.map(item => ({
    ...item,
    expenseHeight: maxAmount > 0 ? ((item.expense || 0) / maxAmount * 100).toFixed(1) : '0',
    incomeHeight: maxAmount > 0 ? ((item.income || 0) / maxAmount * 100).toFixed(1) : '0',
    expenseStr: formatAmount(item.expense || 0),
    incomeStr: formatAmount(item.income || 0)
  }))

  return { monthlyTrend, maxMonthlyAmount: maxAmount }
}

module.exports = { loadMonthlyTrendData }
