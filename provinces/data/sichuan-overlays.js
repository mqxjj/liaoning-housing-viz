// 四川省地图叠加层数据：路网、水系、管网、设施（骨架版，可扩展）
window.SC_OVERLAYS = {
  // 主要高速公路
  roads: [],

  // 主要河流水系
  rivers: [],

  // 燃气管网（完整输配网络：气源 → 门站 → 储配站 → 调压站 → 终端用户）
  gasPipes: [],
  gasFacilities: [],

  // 供水管网
  waterPipes: [],
  waterFacilities: [],

  // 供热管网
  heatPipes: [],
  heatFacilities: [],

  // 排水管网
  drainagePipes: [],
  drainageFacilities: [],

  // 主要城市坐标
  cities: [
    { name: '成都', coord: [104.07, 30.67] },
    { name: '自贡', coord: [104.78, 29.36] },
    { name: '攀枝花', coord: [101.72, 26.87] },
    { name: '泸州', coord: [105.44, 28.87] },
    { name: '德阳', coord: [104.40, 31.13] },
    { name: '绵阳', coord: [104.73, 31.48] },
    { name: '广元', coord: [105.84, 32.44] },
    { name: '遂宁', coord: [105.57, 30.52] },
    { name: '内江', coord: [105.06, 29.58] },
    { name: '乐山', coord: [103.77, 29.55] },
    { name: '南充', coord: [106.11, 30.84] },
    { name: '眉山', coord: [103.85, 30.08] },
    { name: '宜宾', coord: [104.64, 28.75] },
    { name: '广安', coord: [106.61, 30.47] },
    { name: '达州', coord: [107.47, 31.21] },
    { name: '雅安', coord: [103.04, 29.99] },
    { name: '巴中', coord: [106.74, 31.86] },
    { name: '资阳', coord: [104.64, 30.13] },
    { name: '阿坝', coord: [102.22, 31.92] },
    { name: '甘孜', coord: [101.96, 30.05] },
    { name: '凉山', coord: [102.26, 27.90] }
  ]
};
window.PROVINCE_OVERLAYS = window.PROVINCE_OVERLAYS || {};
window.PROVINCE_OVERLAYS['sichuan'] = window.SC_OVERLAYS;
