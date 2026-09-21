// 陕西省地图叠加层数据：路网、水系、管网、设施（骨架版，可扩展）
window.SX_OVERLAYS = {
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
    { name: '西安', coord: [108.95, 34.27] },
    { name: '铜川', coord: [109.03, 35.10] },
    { name: '宝鸡', coord: [107.24, 34.36] },
    { name: '咸阳', coord: [108.71, 34.33] },
    { name: '渭南', coord: [109.51, 34.50] },
    { name: '延安', coord: [109.49, 36.60] },
    { name: '汉中', coord: [107.03, 33.07] },
    { name: '榆林', coord: [109.73, 38.28] },
    { name: '安康', coord: [108.95, 32.68] },
    { name: '商洛', coord: [109.94, 33.87] }
  ]
};
window.PROVINCE_OVERLAYS = window.PROVINCE_OVERLAYS || {};
window.PROVINCE_OVERLAYS['shaanxi'] = window.SX_OVERLAYS;
