// 湖北省地图叠加层数据：路网、水系、管网、设施（骨架版，可扩展）
window.HB_OVERLAYS = {
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
    { name: '武汉', coord: [114.30, 30.59] },
    { name: '黄石', coord: [115.04, 30.20] },
    { name: '十堰', coord: [110.80, 32.65] },
    { name: '宜昌', coord: [111.29, 30.70] },
    { name: '襄阳', coord: [112.14, 32.04] },
    { name: '鄂州', coord: [114.89, 30.39] },
    { name: '荆门', coord: [112.20, 31.04] },
    { name: '孝感', coord: [113.92, 30.92] },
    { name: '荆州', coord: [112.24, 30.33] },
    { name: '黄冈', coord: [114.87, 30.44] },
    { name: '咸宁', coord: [114.32, 29.84] },
    { name: '随州', coord: [113.38, 31.71] },
    { name: '恩施', coord: [109.49, 30.27] }
  ]
};
window.PROVINCE_OVERLAYS = window.PROVINCE_OVERLAYS || {};
window.PROVINCE_OVERLAYS['hubei'] = window.HB_OVERLAYS;
