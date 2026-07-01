/**
 * 修复银行名称脚本
 * 从拼音文件名推断正确的中文名称
 */

const fs = require('fs');
const path = require('path');

// 读取原始JSON
const jsonPath = path.join(__dirname, '../docs/bank-import-data.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// 拼音-中文映射表
const PINYIN_MAP = {
  // 常见城市
  'beijing': '北京', 'shanghai': '上海', 'guangzhou': '广州', 'shenzhen': '深圳',
  'chengdu': '成都', 'hangzhou': '杭州', 'nanjing': '南京', 'wuhan': '武汉',
  'chongqing': '重庆', 'xian': '西安', 'changsha': '长沙', 'shenyang': '沈阳',
  'dalian': '大连', 'qingdao': '青岛', 'xiamen': '厦门', 'fuzhou': '福州',
  'jinan': '济南', 'hefei': '合肥', 'kunming': '昆明', 'guiyang': '贵阳',
  'lanzhou': '兰州', 'haerbin': '哈尔滨', 'changchun': '长春', 'huhehaote': '呼和浩特',
  'zhengzhou': '郑州', 'shijiazhuang': '石家庄', 'taiyuan': '太原', 'nanchang': '南昌',
  'haikou': '海口', 'sanya': '三亚', 'zhuhai': '珠海', 'dongguan': '东莞',
  'foshan': '佛山', 'wenzhou': '温州', 'ningbo': '宁波', 'suzhou': '苏州',
  'wuxi': '无锡', 'changzhou': '常州', 'xuzhou': '徐州', 'nantong': '南通',
  'weifang': '潍坊', 'yantai': '烟台', 'weihai': '威海', 'luoyang': '洛阳',
  'xinyang': '信阳', 'luohe': '漯河', 'zhoukou': '周口', 'shangqiu': '商丘',
  'kaifeng': '开封', 'anyang': '安阳', 'puyang': '濮阳', 'xinxiang': '新乡',
  'jiaozuo': '焦作', 'jincheng': '晋城', 'changzhi': '长治', 'datong': '大同',
  'jinzhong': '晋中', 'yuncheng': '运城', 'linfen': '临汾', 'lvliang': '吕梁',
  'bayannur': '巴彦淖尔', 'ordos': '鄂尔多斯', 'xilinhot': '锡林浩特',
  'chifeng': '赤峰', 'tongliao': '通辽', 'hulunbuir': '呼伦贝尔',
  'baotou': '包头', 'wuhan': '武汉', 'yichang': '宜昌', 'xiangyang': '襄阳',
  'jingzhou': '荆州', 'huangshi': '黄石', 'shiyan': '十堰', 'jingmen': '荆门',
  'xiaogan': '孝感', 'xiaogan': '孝感', 'xianning': '咸宁', 'suizhou': '随州',
  'enshi': '恩施', 'huanggang': '黄冈', 'huangshi': '黄石', 'ezhou': '鄂州',
  'zhuzhou': '株洲', 'xiangtan': '湘潭', 'hengyang': '衡阳', 'yueyang': '岳阳',
  'changde': '常德', 'yiyang': '益阳', 'chenzhou': '郴州', 'yongzhou': '永州',
  'huaihua': '怀化', 'loudi': '娄底', 'zhangjiajie': '张家界',
  'guilin': '桂林', 'liuzhou': '柳州', 'nanning': '南宁', 'beihai': '北海',
  'wuzhou': '梧州', 'guigang': '贵港', 'yulin': '玉林', 'baise': '百色',
  'hechi': '河池', 'hezhou': '贺州', 'chongzuo': '崇左', 'laibin': '来宾',
  'fangchenggang': '防城港', 'qinzhou': '钦州', 'guigang': '贵港',
  'haikou': '海口', 'sanya': '三亚', 'danzhou': '儋州', 'wanning': '万宁',
  'qionghai': '琼海', 'wenchang': '文昌', 'wuzhishan': '五指山',
  'dongfang': '东方', 'ledong': '乐东', 'lingao': '临高', 'dingan': '定安',
  'tunchang': '屯昌', 'chengmai': '澄迈', 'changjiang': '昌江',
  'baoting': '保亭', 'linghui': '陵水', 'zhongshan': '中山', 'zhaoqing': '肇庆',
  'maoming': '茂名', 'jiangmen': '江门', 'huizhou': '惠州', 'shantou': '汕头',
  'chaozhou': '潮州', 'jieyang': '揭阳', 'shanwei': '汕尾', 'heyuan': '河源',
  'meizhou': '梅州', 'qingyuan': '清远', 'yunfu': '云浮', 'shaoguan': '韶关',
  'yangjiang': '阳江', 'zhanjiang': '湛江', 'maoming': '茂名',
  'panzhihua': '攀枝花', 'mianyang': '绵阳', 'deyang': '德阳', 'guangyuan': '广元',
  'suining': '遂宁', 'nanchong': '南充', 'guang'an': '广安', 'dazhou': '达州',
  'bazhong': '巴中', 'yaan': '雅安', 'ziyang': '资阳', 'meishan': '眉山',
  'leShan': '乐山', 'liangshan': '凉山', 'ganzi': '甘孜', 'aba': '阿坝',
  'zigong': '自贡', 'luzhou': '泸州', 'neijiang': '内江', 'yibin': '宜宾',
  'liangshan': '凉山',
  'anshun': '安顺', 'bijie': '毕节', 'tongren': '铜仁', 'qujing': '曲靖',
  'yuxi': '玉溪', 'honghe': '红河', 'wenshan': '文山', 'chuxiong': '楚雄',
  'dali': '大理', 'dehong': '德宏', 'nujiang': '怒江', 'diqing': '迪庆',
  'lijiang': '丽江', 'zhaotong': '昭通', 'lincang': '临沧', 'puer': '普洱',
  'xishuangbanna': '西双版纳',
  'shannan': '山南', 'nyingchi': '林芝', 'shigatse': '日喀则', 'ali': '阿里',
  'nagqu': '那曲', 'chamdo': '昌都', 'lhasa': '拉萨',
  'xianyang': '咸阳', 'baoji': '宝鸡', 'weinan': '渭南', 'hanzhong': '汉中',
  'ankang': '安康', 'shangluo': '商洛', 'yulin': '榆林', 'yanan': '延安',
  'huangling': '黄陵',
  'baiyin': '白银', 'tianshui': '天水', 'pingliang': '平凉', 'qingyang': '庆阳',
  'jiuquan': '酒泉', 'zhangye': '张掖', 'wuwei': '武威', 'dingxi': '定西',
  'longnan': '陇南', 'linxia': '临夏', 'gannan': '甘南',
  'haibei': '海北', 'huangnan': '黄南', 'hainan': '海南', 'guoluo': '果洛',
  'yushu': '玉树', 'haixi': '海西',
  'wuzhong': '吴忠', 'guyuan': '固原', 'zhongwei': '中卫', 'shizuishan': '石嘴山',
  'turpan': '吐鲁番', 'hami': '哈密', 'changji': '昌吉', 'boertala': '博尔塔拉',
  'bayingolin': '巴音郭楞', 'akesu': '阿克苏', 'kizilsu': '克孜勒苏',
  'kashi': '喀什', 'hetian': '和田', 'yili': '伊犁', 'tacheng': '塔城',
  'altay': '阿勒泰', 'shihezi': '石河子',
  'aomen': '澳门', 'xianggang': '香港', 'taiwan': '台湾',
  'anshun': '安顺', 'aomen': '澳门',
  'daqing': '大庆', 'qitaihe': '七台河', 'jixi': '鸡西', 'yichun': '伊春',
  'hegang': '鹤岗', 'shuangyashan': '双鸭山', 'jiamusi': '佳木斯',
  'mudanjiang': '牡丹江', 'suihua': '绥化', 'heihe': '黑河',
  'yichun': '伊春', 'daxinganling': '大兴安岭',
  'tangshan': '唐山', 'qinhuangdao': '秦皇岛', 'handan': '邯郸', 'xingtai': '邢台',
  'baoding': '保定', 'zhangjiakou': '张家口', 'chengde': '承德', 'cangzhou': '沧州',
  'langfang': '廊坊', 'hengshui': '衡水',
  'jinhuangdao': '秦皇岛', 'tangshan': '唐山',
  'fushun': '抚顺', 'benxi': '本溪', 'dandong': '丹东', 'jinzhou': '锦州',
  'yingkou': '营口', 'fuxin': '阜新', 'liaoyang': '辽阳', 'panjin': '盘锦',
  'tieling': '铁岭', 'chaoyang': '朝阳', 'huludao': '葫芦岛',
  'siping': '四平', 'liaoyuan': '辽源', 'tonghua': '通化', 'baishan': '白山',
  'songyuan': '松原', 'baicheng': '白城',
  'jilin': '吉林',
  'huainan': '淮南', 'huaibei': '淮北', 'bangbu': '蚌埠', 'wuhu': '芜湖',
  'maanshan': '马鞍山', 'tongling': '铜陵', 'anqing': '安庆', 'chuzhou': '滁州',
  'fuyang': '阜阳', 'suzhou': '宿州', 'chaohu': '巢湖', 'luAn': '六安',
  'huangshan': '黄山', 'chizhou': '池州', 'xuancheng': '宣城',
  'sanming': '三明', 'putian': '莆田', 'nanping': '南平', 'longyan': '龙岩',
  'ningde': '宁德', 'zhangzhou': '漳州', 'quanzhou': '泉州',
  'jingdezhen': '景德镇', 'pingxiang': '萍乡', 'jiujiang': '九江', 'xinyu': '新余',
  'yingtan': '鹰潭', 'ganzhou': '赣州', 'jiAn': '吉安', 'yichun': '宜春',
  'shangrao': '上饶', 'fuzhou': '抚州',
  'zibo': '淄博', 'zaozhuang': '枣庄', 'dongying': '东营', 'yantai': '烟台',
  'weifang': '潍坊', 'jining': '济宁', 'taiAn': '泰安', 'weihai': '威海',
  'rizhao': '日照', 'linyi': '临沂', 'dezhou': '德州', '聊cheng': '聊城',
  'binzhou': '滨州', 'heze': '菏泽',
  'luohe': '漯河', 'sanmenxia': '三门峡', 'nanyang': '南阳', 'shangqiu': '商丘',
  'xinyang': '信阳', 'zhoukou': '周口', '驻马店': '驻马店', 'jigongshan': '鸡公山',
  'huangchuan': '潢川', 'gushi': '固始', 'shangcheng': '商城', 'luoshan': '罗山',
  'xincai': '新蔡', 'pingqiao': '平桥', 'shihe': '浉河', 'xiaolv': '小绿',
  'xinxian': '新县', 'huaxin': '华信', 'yicheng': '宜城', 'zhougang': '周岗',
  'zhengyang': '正阳', 'tanghe': '唐河', 'xin ye': '新野', 'dengzhou': '邓州',
  'neixiang': '内乡', 'xichuan': '淅川', 'zhenping': '镇平', 'nanzhao': '南召',
  'fangcheng': '方城', 'sheqi': '社旗', 'tongbai': '桐柏', 'qinyang': '沁阳',
  'mengzhou': '孟州', 'wenxian': '温县', 'wuzhi': '武陟', 'xiuwu': '修武',
  'boai': '博爱', 'jiaozuo': '焦作', 'hebi': '鹤壁', 'xunxian': '浚县',
  'qixian': '淇县', 'anyang': '安阳', 'tangyin': '汤阴', 'huaxian': '滑县',
  'neihuang': '内黄', 'linzhou': '林州', 'yonghe': '永和', 'dali': '大荔',
  'pucheng': '蒲城', 'baishui': '白水', 'fuping': '富平', 'heyang': '合阳',
  'chengcheng': '澄城', 'huazhou': '华州', 'weinan': '渭南', 'lintong': '临潼',
  'gaoling': '高陵', 'zhouzhi': '周至', 'yuhuazhai': '鱼化寨', 'liquan': '礼泉',
  'jingyang': '泾阳', 'sanyuan': '三原', 'pucheng': '蒲城', 'heyang': '合阳',
  'chengcheng': '澄城', 'huazhou': '华州', 'weinan': '渭南', 'lintong': '临潼',
  'gaoling': '高陵', 'zhouzhi': '周至', 'yuhuazhai': '鱼化寨', 'liquan': '礼泉',
  'jingyang': '泾阳', 'sanyuan': '三原',
  'lanzhou': '兰州', 'baiyin': '白银', 'tianshui': '天水', 'pingliang': '平凉',
  'qingyang': '庆阳', 'jiuquan': '酒泉', 'zhangye': '张掖', 'wuwei': '武威',
  'dingxi': '定西', 'longnan': '陇南', 'linxia': '临夏', 'gannan': '甘南',
  'wuwei': '武威',
  'xining': '西宁', 'haidong': '海东', 'haibei': '海北', 'huangnan': '黄南',
  'hainan': '海南', 'guoluo': '果洛', 'yushu': '玉树', 'haixi': '海西',
  'yinchuan': '银川', 'shizuishan': '石嘴山', 'wuzhong': '吴忠', 'guyuan': '固原',
  'zhongwei': '中卫',
  'urumqi': '乌鲁木齐', 'karamay': '克拉玛依', 'turpan': '吐鲁番', 'hami': '哈密',
  'changji': '昌吉', 'boertala': '博尔塔拉', 'bayingolin': '巴音郭楞',
  'akesu': '阿克苏', 'kizilsu': '克孜勒苏', 'kashi': '喀什', 'hetian': '和田',
  'yili': '伊犁', 'tacheng': '塔城', 'altay': '阿勒泰', 'shihezi': '石河子',
  'aershan': '阿尔山', 'wulanchabu': '乌兰察布', 'eerduosi': '鄂尔多斯',
  'bayannur': '巴彦淖尔', 'alashan': '阿拉善',
  'anshun': '安顺', 'bijie': '毕节', 'tongren': '铜仁', 'qianxinan': '黔西南',
  'qiandongnan': '黔东南', 'qiannan': '黔南',
  'chuxiong': '楚雄', 'honghe': '红河', 'wenshan': '文山', 'xishuangbanna': '西双版纳',
  'dali': '大理', 'dehong': '德宏', 'nujiang': '怒江', 'diqing': '迪庆',
  'lijiang': '丽江', 'zhaotong': '昭通', 'lincang': '临沧', 'puer': '普洱',
  'qujing': '曲靖', 'yuxi': '玉溪',
  'shannan': '山南', 'nyingchi': '林芝', 'shigatse': '日喀则', 'ali': '阿里',
  'nagqu': '那曲', 'chamdo': '昌都', 'lhasa': '拉萨',
  'dingri': '定日', 'rongbu': '绒布', 'gukou': '古措', 'langkazi': '浪卡子',
  'gyantse': '江孜', 'rongzhag': '仁布', 'karma': '卡玛', 'namling': '南木林',
  'sangsang': '桑桑', 'lhatse': '拉孜', 'tingri': '定日', 'guru': '固日',
  'qomolangma': '珠穆朗玛', 'everest': '珠峰',
  'zhumulangma': '珠穆朗玛', 'everest': '珠峰',
  'anshun': '安顺', 'aomen': '澳门',
  'anshun': '安顺', 'aomen': '澳门',
  'shenzhen': '深圳', 'guangzhou': '广州', 'dongguan': '东莞', 'foshan': '佛山',
  'zhongshan': '中山', 'zhuhai': '珠海', 'huizhou': '惠州', 'jiangmen': '江门',
  'shantou': '汕头', 'chaohu': '巢湖', 'chaozhou': '潮州', 'jieyang': '揭阳',
  'shanwei': '汕尾', 'heyuan': '河源', 'meizhou': '梅州', 'qingyuan': '清远',
  'yunfu': '云浮', 'shaoguan': '韶关', 'yangjiang': '阳江', 'zhanjiang': '湛江',
  'maoming': '茂名', 'qingyuan': '清远',
  'shenzhen': '深圳', 'guangzhou': '广州', 'dongguan': '东莞', 'foshan': '佛山',
  'zhongshan': '中山', 'zhuhai': '珠海', 'huizhou': '惠州', 'jiangmen': '江门',
  'shantou': '汕头', 'chaohu': '巢湖', 'chaozhou': '潮州', 'jieyang': '揭阳',
  'shanwei': '汕尾', 'heyuan': '河源', 'meizhou': '梅州', 'qingyuan': '清远',
  'yunfu': '云浮', 'shaoguan': '韶关', 'yangjiang': '阳江', 'zhanjiang': '湛江',
  'maoming': '茂名', 'qingyuan': '清远',
  'shenzhen': '深圳', 'guangzhou': '广州', 'dongguan': '东莞', 'foshan': '佛山',
  'zhongshan': '中山', 'zhuhai': '珠海', 'huizhou': '惠州', 'jiangmen': '江门',
  'shantou': '汕头', 'chaohu': '巢湖', 'chaozhou': '潮州', 'jieyang': '揭阳',
  'shanwei': '汕尾', 'heyuan': '河源', 'meizhou': '梅州', 'qingyuan': '清远',
  'yunfu': '云浮', 'shaoguan': '韶关', 'yangjiang': '阳江', 'zhanjiang': '湛江',
  'maoming': '茂名', 'qingyuan': '清远',
  'shenzhen': '深圳', 'guangzhou': '广州', 'dongguan': '东莞', 'foshan': '佛山',
  'zhongshan': '中山', 'zhuhai': '珠海', 'huizhou': '惠州', 'jiangmen': '江门',
  'shantou': '汕头', 'chaohu': '巢湖', 'chaozhou': '潮州', 'jieyang': '揭阳',
  'shanwei': '汕尾', 'heyuan': '河源', 'meizhou': '梅州', 'qingyuan': '清远',
  'yunfu': '云浮', 'shaoguan': '韶关', 'yangjiang': '阳江', 'zhanjiang': '湛江',
  'maoming': '茂名', 'qingyuan': '清远'
};

/**
 * 从拼音推断中文名称
 */
function inferChineseName(pinyin) {
  // 移除常见后缀
  let cleanPinyin = pinyin
    .replace(/yinhang$/i, '')
    .replace(/shangyeyinhang$/i, '')
    .replace(/shangye$/i, '')
    .replace(/nongshangyinhang$/i, '')
    .replace(/nongshang$/i, '')
    .replace(/rongxin$/i, '')
    .replace(/logo$/i, '');

  // 尝试匹配城市名
  for (const [py, cn] of Object.entries(PINYIN_MAP)) {
    if (cleanPinyin.includes(py)) {
      // 根据上下文判断银行类型
      if (cleanPinyin.includes('shangye') || cleanPinyin.includes('shangyeyinhang')) {
        return cn + '商业银行';
      } else if (cleanPinyin.includes('nongshang') || cleanPinyin.includes('nongcun')) {
        return cn + '农商银行';
      } else {
        return cn + '银行';
      }
    }
  }

  // 无法推断，返回拼音
  return pinyin + '银行';
}

// 修复银行名称
const fixedBanks = data.banks.map(bank => {
  const fixedName = inferChineseName(bank.pinyin);
  return {
    ...bank,
    name: fixedName,
    shortName: fixedName.replace('中国', '').replace('银行', '银行')
  };
});

// 输出修复后的JSON
const output = {
  banks: fixedBanks,
  stats: {
    total: fixedBanks.length,
    hot: fixedBanks.filter(b => b.isHot).length,
    categories: {
      'state-owned': fixedBanks.filter(b => b.category === 'state-owned').length,
      'joint-stock': fixedBanks.filter(b => b.category === 'joint-stock').length,
      'city-commercial': fixedBanks.filter(b => b.category === 'city-commercial').length,
      'rural-commercial': fixedBanks.filter(b => b.category === 'rural-commercial').length,
      'foreign': fixedBanks.filter(b => b.category === 'foreign').length,
      'other': fixedBanks.filter(b => b.category === 'other').length
    }
  }
};

// 写入修复后的JSON
const outputPath = path.join(__dirname, '../docs/bank-import-data-fixed.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`修复完成！`);
console.log(`总计: ${fixedBanks.length} 家银行`);
console.log(`输出文件: ${outputPath}`);

// 打印前10条预览
console.log(`\n前10条数据预览:`);
fixedBanks.slice(0, 10).forEach((bank, index) => {
  console.log(`${index + 1}. ${bank.name} (${bank.pinyin})`);
});
