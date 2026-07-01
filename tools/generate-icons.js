/**
 * 图标生成工具
 *
 * 使用方法：
 * 1. 安装依赖：npm install canvas
 * 2. 运行脚本：node tools/generate-icons.js
 *
 * 注意：此脚本需要 Node.js 环境，并且需要安装 canvas 模块
 */

const fs = require('fs');
const path = require('path');

// 图标配置
const icons = [
  {
    name: 'bill',
    activeName: 'bill-active',
    draw: (ctx, color) => {
      // 账单图标 - 简单的文档图标
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(20, 10);
      ctx.lineTo(61, 10);
      ctx.lineTo(61, 71);
      ctx.lineTo(20, 71);
      ctx.closePath();
      ctx.fill();

      // 内部线条
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(28, 22, 25, 4);
      ctx.fillRect(28, 34, 25, 4);
      ctx.fillRect(28, 46, 25, 4);
    }
  },
  {
    name: 'stats',
    activeName: 'stats-active',
    draw: (ctx, color) => {
      // 统计图标 - 柱状图
      ctx.fillStyle = color;

      // 柱子
      ctx.fillRect(15, 45, 12, 26);
      ctx.fillRect(34, 30, 12, 41);
      ctx.fillRect(53, 15, 12, 56);

      // 底部线条
      ctx.fillRect(10, 71, 61, 3);
    }
  },
  {
    name: 'mine',
    activeName: 'mine-active',
    draw: (ctx, color) => {
      // 我的图标 - 人头
      ctx.fillStyle = color;

      // 头部
      ctx.beginPath();
      ctx.arc(40.5, 25, 15, 0, Math.PI * 2);
      ctx.fill();

      // 身体
      ctx.beginPath();
      ctx.moveTo(15, 71);
      ctx.quadraticCurveTo(15, 48, 40.5, 48);
      ctx.quadraticCurveTo(66, 48, 66, 71);
      ctx.closePath();
      ctx.fill();
    }
  }
];

// 默认颜色
const defaultColor = '#999999';
const activeColor = '#FF6B6B';

console.log('图标生成工具');
console.log('============');
console.log('');
console.log('由于 canvas 模块依赖系统原生库，建议使用以下方式获取图标：');
console.log('');
console.log('1. 访问 https://www.iconfont.cn/ 搜索以下关键词：');
console.log('   - bill / 账单');
console.log('   - chart / 统计');
console.log('   - user / 我的');
console.log('');
console.log('2. 下载 81x81 像素的 PNG 图标');
console.log('');
console.log('3. 将图标放入 miniprogram/images/icons/ 目录');
console.log('');
console.log('4. 命名规范：');
icons.forEach(icon => {
  console.log(`   - ${icon.name}.png (未选中)`);
  console.log(`   - ${icon.activeName}.png (选中)`);
});
console.log('');
console.log('5. 选中状态使用颜色：#FF6B6B');
console.log('   未选中状态使用颜色：#999999');
