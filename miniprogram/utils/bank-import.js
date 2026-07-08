/**
 * 银行数据导入工具
 * 在微信开发者工具控制台中运行
 */

// 银行数据（从生成的JSON文件导入）
const bankData = require('../../docs/bank-import-data.json');

/**
 * 导入银行数据到云数据库
 */
async function importBanks() {
  console.log('开始导入银行数据...');

  try {
    // 调用云函数批量导入
    const res = await wx.cloud.callFunction({
      name: 'bankFunctions',
      data: {
        action: 'batchImport',
        data: {
          banks: bankData.banks
        }
      }
    });

    if (res.result.success) {
      console.log(`✅ 导入成功！共 ${res.result.data.count} 家银行`);
      console.log('分类统计:', bankData.stats.categories);
    } else {
      console.error('❌ 导入失败:', res.result.error);
    }
  } catch (err) {
    console.error('❌ 导入异常:', err);
  }
}

/**
 * 测试搜索功能
 */
async function testSearch(keyword) {
  console.log(`搜索: ${keyword}`);

  const res = await wx.cloud.callFunction({
    name: 'bankFunctions',
    data: {
      action: 'search',
      data: {
        keyword: keyword,
        limit: 10
      }
    }
  });

  if (res.result.success) {
    console.log(`找到 ${res.result.data.length} 条结果:`);
    res.result.data.forEach((bank, index) => {
      console.log(`${index + 1}. ${bank.name} (${bank.pinyin})`);
    });
  }

  return res.result.data;
}

// 导出函数
module.exports = {
  importBanks,
  testSearch
};

// 如果直接运行，执行导入
if (typeof wx !== 'undefined') {
  console.log('=== 银行数据导入工具 ===');
  console.log('使用方法:');
  console.log('1. importBanks() - 导入银行数据');
  console.log('2. testSearch("招商") - 测试搜索');
}
