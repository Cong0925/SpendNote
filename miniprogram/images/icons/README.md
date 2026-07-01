# TabBar 图标说明

## 需要的图标文件

以下图标需要放置在 `miniprogram/images/icons/` 目录下：

### 账单页面
- `bill.png` - 账单图标（未选中状态）
- `bill-active.png` - 账单图标（选中状态）

### 统计页面
- `stats.png` - 统计图标（未选中状态）
- `stats-active.png` - 统计图标（选中状态）

### 我的页面
- `mine.png` - 我的图标（未选中状态）
- `mine-active.png` - 我的图标（选中状态）

## 图标规格

- 尺寸：81px × 81px
- 格式：PNG
- 颜色：未选中 #999999，选中 #FF6B6B

## 推荐图标资源

1. [阿里巴巴 iconfont](https://www.iconfont.cn/)
2. [IconPark](https://iconpark.oceanengine.com/)
3. [Flaticon](https://www.flaticon.com/)

## 临时解决方案

如果暂时没有图标，可以使用以下方法：

1. 在 `app.json` 中移除 `iconPath` 和 `selectedIconPath` 配置
2. 或者使用纯色块作为临时图标

注意：移除图标配置后，tabBar 将只显示文字，不影响功能使用。
