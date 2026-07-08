/**
 * 从iconfont.json生成正确的银行数据
 */

const fs = require('fs');
const path = require('path');

// 读取iconfont.json
const iconfontPath = 'C:\\user-xhc\\download\\download\\font_5203189_nm23pa2ogd\\iconfont.json';
const iconfontData = JSON.parse(fs.readFileSync(iconfontPath, 'utf-8'));

// 读取银行图标目录
const BANKS_DIR = path.join(__dirname, '../miniprogram/images/banks');
const bankFiles = fs.readdirSync(BANKS_DIR).filter(f => f.endsWith('.png'));

console.log(`iconfont.json 中有 ${iconfontData.glyphs.length} 个图标`);
console.log(`banks 目录中有 ${bankFiles.length} 个图标文件`);

// 分类规则
const CATEGORY_KEYWORDS = {
  'state-owned': ['工商银行', '农业银行', '中国银行', '建设银行', '交通银行', '邮储'],
  'joint-stock': ['招商', '中信', '光大', '华夏', '民生', '广发', '平安', '浦发', '兴业', '浙商', '渤海', '恒丰'],
  'foreign': ['汇丰', '花旗', '渣打', '东亚', '恒生', '星展', '瑞穗', '三菱', '摩根', '高盛', '德意志', '巴克莱', '法国巴黎', '法国兴业', '瑞士信贷', '瑞士联合', '荷兰', '比利时', '澳大利亚', '加拿大', '新加坡', '菲律宾', '泰国', '马来西亚', '印尼', '印度', '韩国', '日本', '美国', '英国', '德国', '法国', '意大利', '西班牙', '荷兰', '比利时', '瑞士', '奥地利', '瑞典', '挪威', '丹麦', '芬兰', '爱尔兰', '卢森堡', '葡萄牙', '希腊', '波兰', '匈牙利', '捷克', '斯洛伐克', '斯洛文尼亚', '爱沙尼亚', '拉脱维亚', '立陶宛', '马耳他', '塞浦路斯', '保加利亚', '罗马尼亚', '克罗地亚', '塞尔维亚', '波斯尼亚', '黑山', '北马其顿', '阿尔巴尼亚', '摩尔多瓦', '乌克兰', '白俄罗斯', '俄罗斯', '格鲁吉亚', '亚美尼亚', '阿塞拜疆', '哈萨克斯坦', '乌兹别克斯坦', '土库曼斯坦', '塔吉克斯坦', '吉尔吉斯斯坦', '蒙古', '朝鲜', '越南', '老挝', '柬埔寨', '缅甸', '泰国', '马来西亚', '新加坡', '印度尼西亚', '菲律宾', '文莱', '东帝汶', '澳大利亚', '新西兰', '巴布亚新几内亚', '斐济', '所罗门群岛', '瓦努阿图', '萨摩亚', '汤加', '基里巴斯', '密克罗尼西亚', '马绍尔群岛', '帕劳', '瑙鲁', '图瓦卢', '加拿大', '美国', '墨西哥', '巴西', '阿根廷', '智利', '秘鲁', '哥伦比亚', '委内瑞拉', '厄瓜多尔', '玻利维亚', '巴拉圭', '乌拉圭', '圭亚那', '苏里南', '伯利兹', '哥斯达黎加', '巴拿马', '洪都拉斯', '危地马拉', '萨尔瓦多', '尼加拉瓜', '古巴', '牙买加', '海地', '多米尼加', '特立尼达和多巴巴', '巴巴多斯', '安提瓜和巴布达', '多米尼克', '圣卢西亚', '圣文森特和格林纳丁斯', '格林纳达', '圣基茨和尼维斯', '英国', '法国', '德国', '意大利', '西班牙', '葡萄牙', '荷兰', '比利时', '卢森堡', '瑞士', '奥地利', '列支敦士登', '摩纳哥', '安道尔', '圣马力诺', '梵蒂冈', '马耳他', '塞浦路斯', '希腊', '保加利亚', '罗马尼亚', '匈牙利', '捷克', '斯洛伐克', '斯洛文尼亚', '克罗地亚', '波斯尼亚', '黑山', '塞尔维亚', '北马其顿', '阿尔巴尼亚', '摩尔多瓦', '乌克兰', '白俄罗斯', '立陶宛', '拉脱维亚', '爱沙尼亚', '芬兰', '瑞典', '挪威', '丹麦', '冰岛', '爱尔兰', '波兰', '俄罗斯', '格鲁吉亚', '亚美尼亚', '阿塞拜疆', '哈萨克斯坦', '乌兹别克斯坦', '土库曼斯坦', '塔吉克斯坦', '吉尔吉斯斯坦', '蒙古', '日本', '韩国', '朝鲜', '中国', '台湾', '香港', '澳门'],
  'rural-commercial': ['农商', '农村', '农信', '农合']
};

/**
 * 判断银行分类
 */
function getBankCategory(name) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return category;
      }
    }
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
 * 从font_class生成拼音标识
 */
function generatePinyin(fontClass) {
  return fontClass.replace(/logo$/i, '').replace(/yinhang$/i, '');
}

// 生成银行数据
const banks = [];
let sortOrder = 1;

// 遍历iconfont.json中的图标
for (const glyph of iconfontData.glyphs) {
  const name = glyph.name.replace('logo', '').trim();
  const fontClass = glyph.font_class;

  // 查找对应的PNG文件
  const pngFile = bankFiles.find(file => {
    const fileWithoutExt = file.replace('.png', '');
    return fileWithoutExt === fontClass || fileWithoutExt.includes(fontClass);
  });

  if (pngFile) {
    const category = getBankCategory(name);
    const hot = isHotBank(name);
    const pinyin = generatePinyin(fontClass);

    banks.push({
      name: name,
      shortName: name.replace('中国', '').replace('银行', '银行'),
      pinyin: pinyin,
      category: category,
      isHot: hot,
      icon: `/images/banks/${pngFile}`
    });

    sortOrder++;
  }
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

// 重新分配排序序号
banks.forEach((bank, index) => {
  bank.sortOrder = index + 1;
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
const outputPath = path.join(__dirname, '../docs/bank-import-data-fixed.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`\n生成完成！`);
console.log(`总计: ${banks.length} 家银行`);
console.log(`热门: ${output.stats.hot} 家`);
console.log(`分类统计:`, output.stats.categories);
console.log(`输出文件: ${outputPath}`);

// 打印前20条数据预览
console.log(`\n前20条数据预览:`);
banks.slice(0, 20).forEach((bank, index) => {
  console.log(`${index + 1}. ${bank.name} (${bank.pinyin}) - ${bank.category}${bank.isHot ? ' 🔥' : ''}`);
});
