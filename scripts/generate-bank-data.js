/**
 * 银行数据生成脚本
 * 从图标文件生成银行数据库初始数据
 */

const fs = require('fs');
const path = require('path');

// 银行图标目录
const BANKS_DIR = path.join(__dirname, '../miniprogram/images/banks');

// 银行分类规则
const CATEGORY_RULES = {
  // 国有银行
  'state-owned': [
    '中国工商银行', '中国农业银行', '中国银行', '中国建设银行',
    '交通银行', '中国邮政储蓄银行'
  ],
  // 股份制银行
  'joint-stock': [
    '招商银行', '中信银行', '中国光大银行', '华夏银行',
    '民生银行', '广发银行', '平安银行', '浦发银行',
    '兴业银行', '浙商银行', '渤海银行', '恒丰银行'
  ],
  // 外资银行
  'foreign': [
    '汇丰银行', '花旗银行', '渣打银行', '东亚银行',
    '恒生银行', '星展银行', '瑞穗银行', '三菱日联银行'
  ]
};

// 热门银行（前30家）
const HOT_BANKS = [
  '中国工商银行', '中国农业银行', '中国银行', '中国建设银行',
  '交通银行', '中国邮政储蓄银行', '招商银行', '中信银行',
  '中国光大银行', '华夏银行', '民生银行', '广发银行',
  '平安银行', '浦发银行', '兴业银行', '北京银行',
  '上海银行', '南京银行', '宁波银行', '江苏银行',
  '杭州银行', '成都银行', '广州银行', '深圳发展银行',
  '渤海银行', '恒丰银行', '浙商银行', '花旗银行',
  '汇丰银行', '渣打银行'
];

/**
 * 从文件名提取银行名称
 */
function extractBankName(filename) {
  // 移除 .png 后缀
  let name = filename.replace('.png', '');

  // 移除 logo 后缀
  name = name.replace(/logo$/i, '');

  // 移除 icon_ 前缀（如果有）
  name = name.replace(/^icon_/i, '');

  // 将拼音转换为中文（简化处理）
  // 这里需要一个拼音转中文的映射，或者从文件名推断
  return name;
}

/**
 * 判断银行分类
 */
function getBankCategory(name, filename) {
  // 检查是否在预定义分类中
  for (const [category, banks] of Object.entries(CATEGORY_RULES)) {
    for (const bank of banks) {
      if (name.includes(bank) || filename.includes(bank)) {
        return category;
      }
    }
  }

  // 根据文件名特征判断
  const lowerFilename = filename.toLowerCase();

  // 城市商业银行
  if (lowerFilename.includes('shangyeyinhang') || lowerFilename.includes('shangye')) {
    return 'city-commercial';
  }

  // 农村商业银行
  if (lowerFilename.includes('nongshang') || lowerFilename.includes('nongcun')) {
    return 'rural-commercial';
  }

  // 默认分类
  return 'other';
}

/**
 * 生成拼音标识
 */
function generatePinyinId(name, filename) {
  // 从文件名提取拼音标识
  let id = filename.replace('.png', '').replace(/logo$/i, '');

  // 如果id太长，截取前20个字符
  if (id.length > 20) {
    id = id.substring(0, 20);
  }

  return id;
}

/**
 * 主函数
 */
function generateBankData() {
  const banks = [];
  let sortOrder = 1;

  // 读取所有图标文件
  const files = fs.readdirSync(BANKS_DIR).filter(f => f.endsWith('.png'));

  console.log(`找到 ${files.length} 个银行图标`);

  // 为每个图标生成数据
  for (const file of files) {
    const name = extractBankName(file);
    const category = getBankCategory(name, file);
    const isHot = HOT_BANKS.some(bank => name.includes(bank) || file.includes(bank));
    const pinyinId = generatePinyinId(name, file);

    banks.push({
      name: name,
      shortName: name,
      pinyin: pinyinId,
      category: category,
      isHot: isHot,
      sortOrder: sortOrder,
      icon: `/images/banks/${file}`
    });

    sortOrder++;
  }

  // 按分类和排序序号排序
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

    // 最后按排序序号
    return a.sortOrder - b.sortOrder;
  });

  // 重新分配排序序号
  banks.forEach((bank, index) => {
    bank.sortOrder = index + 1;
  });

  // 输出JSON
  const output = {
    success: true,
    data: banks,
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
  const outputPath = path.join(__dirname, '../docs/银行数据.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n生成完成！`);
  console.log(`总计: ${banks.length} 家银行`);
  console.log(`热门: ${output.stats.hot} 家`);
  console.log(`分类统计:`, output.stats.categories);
  console.log(`输出文件: ${outputPath}`);

  return output;
}

// 执行
generateBankData();
