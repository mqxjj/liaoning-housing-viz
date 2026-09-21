/* ===================================================================
 * 六大区域中心配置
 * 全国作战地图 - 公司六大区域中心分组
 * 主色与 theme.css 中 --center-N 变量严格对应
 * =================================================================== */

window.CENTERS = [
  {
    key: '1',
    name: '一中心',
    fullName: '一中心（华北）',
    color: '#fbbf24',
    colorDim: '#92660a',
    grad: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    capital: [116.40, 39.90],
    capitalName: '北京',
    provinces: ['北京', '天津', '河北', '山西', '山东', '河南']
  },
  {
    key: '2',
    name: '二中心',
    fullName: '二中心（华东）',
    color: '#22d3ee',
    colorDim: '#0e7490',
    grad: 'linear-gradient(135deg, #22d3ee, #0891b2)',
    capital: [121.47, 31.23],
    capitalName: '上海',
    provinces: ['上海', '江苏', '浙江', '安徽', '福建']
  },
  {
    key: '3',
    name: '三中心',
    fullName: '三中心（西南）',
    color: '#a78bfa',
    colorDim: '#6d28d9',
    grad: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    capital: [104.07, 30.67],
    capitalName: '成都',
    provinces: ['四川', '重庆', '贵州', '云南', '西藏']
  },
  {
    key: '4',
    name: '四中心',
    fullName: '四中心（东北）',
    color: '#60a5fa',
    colorDim: '#1e40af',
    grad: 'linear-gradient(135deg, #60a5fa, #2563eb)',
    capital: [123.43, 41.80],
    capitalName: '沈阳',
    provinces: ['内蒙古', '辽宁', '吉林', '黑龙江']
  },
  {
    key: '5',
    name: '五中心',
    fullName: '五中心（华中南）',
    color: '#34d399',
    colorDim: '#047857',
    grad: 'linear-gradient(135deg, #34d399, #059669)',
    capital: [114.30, 30.59],
    capitalName: '武汉',
    provinces: ['湖北', '湖南', '江西', '广东', '广西', '海南']
  },
  {
    key: '6',
    name: '六中心',
    fullName: '六中心（西北）',
    color: '#f87171',
    colorDim: '#b91c1c',
    grad: 'linear-gradient(135deg, #f87171, #dc2626)',
    capital: [108.95, 34.27],
    capitalName: '西安',
    provinces: ['陕西', '甘肃', '青海', '宁夏', '新疆']
  }
];

/* 工具函数：按省名查询所属中心 */
window.findCenterByProvince = function(provinceName) {
  for (var i = 0; i < window.CENTERS.length; i++) {
    if (window.CENTERS[i].provinces.indexOf(provinceName) >= 0) return window.CENTERS[i];
  }
  return null;
};

/* 工具函数：按 key 查询中心 */
window.findCenterByKey = function(key) {
  for (var i = 0; i < window.CENTERS.length; i++) {
    if (window.CENTERS[i].key === key) return window.CENTERS[i];
  }
  return null;
};
