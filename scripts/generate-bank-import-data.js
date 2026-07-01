/**
 * 银行数据批量导入脚本
 * 从图标文件生成银行数据JSON
 */

const fs = require('fs');
const path = require('path');

// 银行图标目录
const BANKS_DIR = path.join(__dirname, '../miniprogram/images/banks');

// 银行名称映射（拼音文件名 -> 中文名称）
const BANK_NAME_MAP = {
  // 国有银行
  'icbc': '中国工商银行',
  'abc': '中国农业银行',
  'boc': '中国银行',
  'ccb': '中国建设银行',
  'bankcomm': '交通银行',
  'psbc': '中国邮政储蓄银行',

  // 股份制银行
  'cmb': '招商银行',
  'citic': '中信银行',
  'cebb': '中国光大银行',
  'huaxia': '华夏银行',
  'cmbc': '民生银行',
  'gdb': '广发银行',
  'pab': '平安银行',
  'spdb': '浦发银行',
  'cib': '兴业银行',
  'czbank': '浙商银行',
  'cbhb': '渤海银行',
  'egbank': '恒丰银行',

  // 城市商业银行
  'bob': '北京银行',
  'bos': '上海银行',
  'njcb': '南京银行',
  'nbcb': '宁波银行',
  'jsb': '江苏银行',
  'hzcb': '杭州银行',

  // 外资银行
  'hsbc': '汇丰银行',
  'citi': '花旗银行',
  'scb': '渣打银行'
};

// 分类规则
const CATEGORY_KEYWORDS = {
  'state-owned': ['工商银行', '农业银行', '中国银行', '建设银行', '交通银行', '邮储'],
  'joint-stock': ['招商', '中信', '光大', '华夏', '民生', '广发', '平安', '浦发', '兴业', '浙商', '渤海', '恒丰'],
  'foreign': ['汇丰', '花旗', '渣打', '东亚', '恒生', '星展'],
  'rural-commercial': ['农商', '农村', '农信']
};

/**
 * 从文件名提取银行信息
 */
function extractBankInfo(filename) {
  // 移除 .png 后缀
  let name = filename.replace('.png', '');

  // 移除 logo 后缀
  name = name.replace(/logo$/i, '');

  // 移除 icon_ 前缀（如果有）
  name = name.replace(/^icon_/i, '');

  // 尝试从映射表获取中文名称
  let chineseName = BANK_NAME_MAP[name];

  // 如果没有映射，从拼音推断
  if (!chineseName) {
    // 移除常见的拼音后缀
    chineseName = name
      .replace(/yinhang$/i, '银行')
      .replace(/shangyeyinhang$/i, '商业银行')
      .replace(/shangye$/i, '商业银行')
      .replace(/nongshang$/i, '农商银行')
      .replace(/nongcun$/i, '农村')
      .replace(/rongxin$/i, '融信')
      .replace(/logo$/i, '');

    // 添加"银行"后缀（如果没有）
    if (!chineseName.includes('银行') && !chineseName.includes('商行')) {
      chineseName = chineseName + '银行';
    }
  }

  return {
    pinyin: name,
    name: chineseName,
    shortName: chineseName.replace('中国', '').replace('银行', '银行')
  };
}

/**
 * 判断银行分类
 */
function getBankCategory(name, filename) {
  // 检查是否在预定义分类中
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword) || filename.includes(keyword)) {
        return category;
      }
    }
  }

  // 根据文件名特征判断
  const lowerFilename = filename.toLowerCase();

  if (lowerFilename.includes('nongshang') || lowerFilename.includes('nongcun')) {
    return 'rural-commercial';
  }

  if (lowerFilename.includes('shangye')) {
    return 'city-commercial';
  }

  return 'other';
}

/**
 * 判断是否为热门银行
 */
function isHotBank(name) {
  const hotKeywords = [
    '工商银行', '农业银行', '中国银行', '建设银行', '交通银行', '邮储',
    '招商', '中信', '光大', '华夏', '民生', '广发', '平安', '浦发', '兴业',
    '北京银行', '上海银行', '南京银行', '宁波银行', '江苏银行', '杭州银行'
  ];

  return hotKeywords.some(keyword => name.includes(keyword));
}

/**
 * 主函数
 */
function generateBankData() {
  const banks = [];

  // 读取所有图标文件
  const files = fs.readdirSync(BANKS_DIR).filter(f => f.endsWith('.png'));

  console.log(`找到 ${files.length} 个银行图标`);

  // 为每个图标生成数据
  for (const file of files) {
    const info = extractBankInfo(file);
    const category = getBankCategory(info.name, file);
    const hot = isHotBank(info.name);

    banks.push({
      name: info.name,
      shortName: info.shortName,
      pinyin: info.pinyin,
      category: category,
      isHot: hot,
      icon: `/images/banks/${file}`
    });
  }

  // 按分类和热度排序
  banks.sort((a, b) => {
    // 热门银行优先
    if (a.isHot && !b.isHot) return -1;
    if (!a.isHot && b.isHot) return 1;

    // 然后按分类排序
    const categoryOrder = {
      'state-owned': 1,
      'joint-stock': 2,
      'city-commercial': 3,
      'rural-commercial': 4,
      'foreign': 5,
      'other': 6
    };

    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }

    // 最后按名称排序
    return a.name.localeCompare(b.name, 'zh-CN');
  });

  // 输出JSON
  const output = {
    banks: banks,
    stats: {
      total: banks.length,
      hot: banks.filter(b => b.isHot).length,
      categories: {
        'state-owned': banks.filter(b => b.category === 'state-owned').length,
        'joint-stock': banks.filter(b => b.category === 'joint-stock').length,
        'city-commercial': banks.filter(b => b.category === 'city-commercial').length,
        'rural-commercial': banks.filter(b => b.category === 'rural-commercial').length,
        'foreign': banks.filter(b => b.category === 'foreign').length,
        'other': banks.filter(b => b.category === 'other').length
      }
    }
  };

  // 写入JSON文件
  const outputPath = path.join(__dirname, '../docs/bank-import-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n生成完成！`);
  console.log(`总计: ${banks.length} 家银行`);
  console.log(`热门: ${output.stats.hot} 家`);
  console.log(`分类统计:`, output.stats.categories);
  console.log(`输出文件: ${outputPath}`);

  // 打印前10条数据预览
  console.log(`\n前10条数据预览:`);
  banks.slice(0, 10).forEach((bank, index) => {
    console.log(`${index + 1}. ${bank.name} (${bank.pinyin}) - ${bank.category}${bank.isHot ? ' 🔥' : ''}`);
  });

  return output;
}

// 执行
generateBankData();
