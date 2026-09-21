// 福建省地图叠加层数据：路网、水系、管网、设施（骨架版，可扩展）
window.FJ_OVERLAYS = {
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
    { name: '福州', coord: [119.30, 26.08] },
    { name: '厦门', coord: [118.09, 24.48] },
    { name: '莆田', coord: [119.00, 24.36] },
    { name: '三明', coord: [117.64, 26.27] },
    { name: '泉州', coord: [118.67, 24.87] },
    { name: '漳州', coord: [117.65, 24.51] },
    { name: '南平', coord: [118.18, 26.64] },
    { name: '龙岩', coord: [117.01, 25.10] },
    { name: '宁德', coord: [119.53, 26.66] }
  ]
};
window.PROVINCE_OVERLAYS = window.PROVINCE_OVERLAYS || {};
window.PROVINCE_OVERLAYS['fujian'] = window.FJ_OVERLAYS;
