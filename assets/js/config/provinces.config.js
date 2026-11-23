/* ===================================================================
 * 31 省/直辖市/自治区元数据
 * 全国作战地图 - 全国总览页 + 省页路由
 *
 * adcode: 民政部行政区划代码（DataV GeoJSON 接口所需）
 *         GeoJSON URL = https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json
 * key:    URL 路由键（provinces/{key}.html）
 * center: 省会坐标 [lng, lat]（用于 effectScatter 标点 + fitBounds）
 * aliases: 搜索匹配关键词（拼音/简称/全称）
 * enabled: true=已部署省页，false=显示"敬请期待"提示
 * =================================================================== */

window.PROVINCES = [
  /* —— 一中心（华北） —— */
  { key:'beijing',    name:'北京',   adcode:110000, center:[116.40,39.90],  capital:'北京',   enabled:false, aliases:['北京','beijing','bj','京','北京市'] },
  { key:'tianjin',    name:'天津',   adcode:120000, center:[117.20,39.13],  capital:'天津',   enabled:false, aliases:['天津','tianjin','tj','津','天津市'] },
  { key:'hebei',      name:'河北',   adcode:130000, center:[114.51,38.04],  capital:'石家庄', enabled:false, aliases:['河北','hebei','hb','冀','石家庄','河北省'] },
  { key:'shanxi',     name:'山西',   adcode:140000, center:[112.55,37.87],  capital:'太原',   enabled:false, aliases:['山西','shanxi','sx','晋','太原','山西省'] },
  { key:'shandong',   name:'山东',   adcode:370000, center:[117.00,36.65],  capital:'济南',   enabled:false, aliases:['山东','shandong','sd','鲁','济南','山东省'] },
  { key:'henan',      name:'河南',   adcode:410000, center:[113.65,34.76],  capital:'郑州',   enabled:false, aliases:['河南','henan','hn','豫','郑州','河南省'] },

  /* —— 二中心（华东） —— */
  { key:'shanghai',   name:'上海',   adcode:310000, center:[121.47,31.23],  capital:'上海',   enabled:false, aliases:['上海','shanghai','sh','沪','上海市'] },
  { key:'jiangsu',    name:'江苏',   adcode:320000, center:[118.78,32.07],  capital:'南京',   enabled:false, aliases:['江苏','jiangsu','js','苏','南京','江苏省'] },
  { key:'zhejiang',   name:'浙江',   adcode:330000, center:[120.16,30.27],  capital:'杭州',   enabled:false, aliases:['浙江','zhejiang','zj','浙','杭州','浙江省'] },
  { key:'anhui',      name:'安徽',   adcode:340000, center:[117.27,31.86],  capital:'合肥',   enabled:false, aliases:['安徽','anhui','ah','皖','合肥','安徽省'] },
  { key:'fujian',     name:'福建',   adcode:350000, center:[119.30,26.08],  capital:'福州',   enabled:true,  aliases:['福建','fujian','fj','闽','福州','福建省'] },

  /* —— 三中心（西南） —— */
  { key:'sichuan',    name:'四川',   adcode:510000, center:[104.07,30.67],  capital:'成都',   enabled:true,  aliases:['四川','sichuan','sc','蜀','成都','四川省'] },
  { key:'chongqing',  name:'重庆',   adcode:500000, center:[106.55,29.56],  capital:'重庆',   enabled:false, aliases:['重庆','chongqing','cq','渝','重庆市'] },
  { key:'guizhou',    name:'贵州',   adcode:520000, center:[106.71,26.60],  capital:'贵阳',   enabled:false, aliases:['贵州','guizhou','gz','黔','贵阳','贵州省'] },
  { key:'yunnan',     name:'云南',   adcode:530000, center:[102.72,25.04],  capital:'昆明',   enabled:false, aliases:['云南','yunnan','yn','滇','昆明','云南省'] },
  { key:'xizang',     name:'西藏',   adcode:540000, center:[91.13,29.65],   capital:'拉萨',   enabled:false, aliases:['西藏','xizang','xz','藏','拉萨','西藏自治区'] },

  /* —— 四中心（东北） —— */
  { key:'neimenggu',  name:'内蒙古', adcode:150000, center:[111.75,40.84],  capital:'呼和浩特', enabled:false, aliases:['内蒙古','neimenggu','nmg','蒙','呼和浩特','内蒙古自治区'] },
  { key:'liaoning',   name:'辽宁',   adcode:210000, center:[123.43,41.80],  capital:'沈阳',   enabled:true,  aliases:['辽宁','liaoning','ln','辽','沈阳','辽宁省'] },
  { key:'jilin',      name:'吉林',   adcode:220000, center:[125.32,43.90],  capital:'长春',   enabled:true,  aliases:['吉林','jilin','jl','吉','长春','吉林省'] },
  { key:'heilongjiang', name:'黑龙江', adcode:230000, center:[126.64,45.75], capital:'哈尔滨', enabled:false, aliases:['黑龙江','heilongjiang','hlj','黑','哈尔滨','黑龙江省'] },

  /* —— 五中心（华中南） —— */
  { key:'hubei',      name:'湖北',   adcode:420000, center:[114.30,30.59],  capital:'武汉',   enabled:true,  aliases:['湖北','hubei','hb','鄂','武汉','湖北省'] },
  { key:'hunan',      name:'湖南',   adcode:430000, center:[112.94,28.23],  capital:'长沙',   enabled:false, aliases:['湖南','hunan','hn','湘','长沙','湖南省'] },
  { key:'jiangxi',    name:'江西',   adcode:360000, center:[115.89,28.68],  capital:'南昌',   enabled:false, aliases:['江西','jiangxi','jx','赣','南昌','江西省'] },
  { key:'guangdong',  name:'广东',   adcode:440000, center:[113.27,23.13],  capital:'广州',   enabled:false, aliases:['广东','guangdong','gd','粤','广州','广东省'] },
  { key:'guangxi',    name:'广西',   adcode:450000, center:[108.37,22.82],  capital:'南宁',   enabled:false, aliases:['广西','guangxi','gx','桂','南宁','广西壮族自治区'] },
  { key:'hainan',     name:'海南',   adcode:460000, center:[110.32,20.04],  capital:'海口',   enabled:false, aliases:['海南','hainan','hi','琼','海口','海南省'] },

  /* —— 六中心（西北） —— */
  { key:'shaanxi',    name:'陕西',   adcode:610000, center:[108.95,34.27],  capital:'西安',   enabled:true,  aliases:['陕西','shaanxi','sx2','陕','秦','西安','陕西省'] },
  { key:'gansu',      name:'甘肃',   adcode:620000, center:[103.83,36.06],  capital:'兰州',   enabled:false, aliases:['甘肃','gansu','gs','陇','兰州','甘肃省'] },
  { key:'qinghai',    name:'青海',   adcode:630000, center:[101.78,36.62],  capital:'西宁',   enabled:false, aliases:['青海','qinghai','qh','青','西宁','青海省'] },
  { key:'ningxia',    name:'宁夏',   adcode:640000, center:[106.23,38.49],  capital:'银川',   enabled:false, aliases:['宁夏','ningxia','nx','宁','银川','宁夏回族自治区'] },
  { key:'xinjiang',   name:'新疆',   adcode:650000, center:[87.62,43.83],   capital:'乌鲁木齐', enabled:false, aliases:['新疆','xinjiang','xj','新','乌鲁木齐','新疆维吾尔自治区'] }
];

/* —— 工具函数 —— */

/* 按省名查询省份元数据 */
window.findProvinceByName = function(name) {
  for (var i = 0; i < window.PROVINCES.length; i++) {
    if (window.PROVINCES[i].name === name) return window.PROVINCES[i];
  }
  return null;
};

/* 按 URL key 查询省份元数据 */
window.findProvinceByKey = function(key) {
  for (var i = 0; i < window.PROVINCES.length; i++) {
    if (window.PROVINCES[i].key === key) return window.PROVINCES[i];
  }
  return null;
};

/* 按 adcode 查询省份元数据 */
window.findProvinceByAdcode = function(adcode) {
  adcode = parseInt(adcode);
  for (var i = 0; i < window.PROVINCES.length; i++) {
    if (window.PROVINCES[i].adcode === adcode) return window.PROVINCES[i];
  }
  return null;
};

/* 搜索匹配：返回符合 alias 的省份列表 */
window.searchProvinces = function(query) {
  if (!query) return [];
  query = String(query).toLowerCase().trim();
  if (!query) return [];
  var matched = [];
  for (var i = 0; i < window.PROVINCES.length; i++) {
    var p = window.PROVINCES[i];
    for (var j = 0; j < p.aliases.length; j++) {
      if (p.aliases[j].toLowerCase().indexOf(query) === 0) {
        matched.push(p);
        break;
      }
    }
  }
  return matched;
};

/* 获取已启用省份（已部署省页） */
window.getEnabledProvinces = function() {
  return window.PROVINCES.filter(function(p) { return p.enabled; });
};
