/* ===================================================================
 * 四大核心领域配置（DOMAINS / DOMAIN_CAPS / DOMAIN_ARCH）
 * 全国作战地图 - 所有省份共享
 * 直接抽离自原辽宁省 index.html
 * =================================================================== */

window.DOMAINS = [
  { key:'lifeline', name:'城市地下管网综合监测', short:'城市生命线', color:'#38bdf8', icon:'🌐',
    desc:'燃气/供水/供热/排水/桥梁一体化监测预警' },
  { key:'gas', name:'燃气安全监管', short:'智慧燃气', color:'#fbbf24', icon:'🔥',
    desc:'智能燃气表+NB-IoT+管网安全监测' },
  { key:'flood', name:'城市防汛排涝', short:'智慧排水/海绵城市', color:'#34d399', icon:'🌊',
    desc:'内涝预警+排水管网物联感知+数字孪生' },
  { key:'cim', name:'地下管网数字化底座', short:'CIM+一张图', color:'#a78bfa', icon:'🗺️',
    desc:'CIM平台+数字孪生+九天大模型+数据要素' }
];

window.DOMAIN_CAPS = {
  lifeline: [
    { name:'城市生命线安全监测平台', desc:'燃气/供水/排水/热力/桥梁一体化监测预警', tag:'核心产品', icon:'🛡️' },
    { name:'城市运管服平台', desc:'城市运行管理服务平台，集成公司产品', tag:'平台', icon:'🏢' },
    { name:'供水漏损分析+管网监测', desc:'NB-IoT智能水表+漏损分析+管网GIS', tag:'物联感知', icon:'💧' },
    { name:'智慧供热平台', desc:'热源/管网/室温监测+AI调度，温暖工程配套', tag:'行业应用', icon:'🌡️' },
    { name:'城市更新全过程管理平台', desc:'体检评估→方案编制→实施监管→效果评价', tag:'管理平台', icon:'🔄' },
    { name:'老旧小区改造智慧化包', desc:'NB-IoT燃气表/烟感/门禁+智慧物业SaaS', tag:'集成包', icon:'🏘️' },
    { name:'灯联网', desc:'智慧照明+单灯控制+城市感知节点', tag:'物联感知', icon:'💡' },
    { name:'5G+无人机巡检', desc:'排水管网/桥梁巡检，5G+AI识别', tag:'5G应用', icon:'🚁' }
  ],
  gas: [
    { name:'智能燃气表+NB-IoT+OneNET', desc:'燃气安全监测，近31万户已安装', tag:'核心产品', icon:'📊', url:'https://mqxjj.github.io/ranqibiao/' },
    { name:'老旧燃气管网安全监测', desc:'报警器/自闭阀/物联网监管', tag:'安全监测', icon:'⚠️' },
    { name:'城市生命线安全监测平台', desc:'燃气安全一体化监测预警', tag:'平台', icon:'🛡️', url:'https://mqxjj.github.io/gas-supervision-demo/' },
    { name:'OneNET物联网平台', desc:'感知终端接入与管理，海量连接', tag:'物联网', icon:'📡' },
    { name:'NB-IoT燃气表/烟感/水表', desc:'多表合一，物联网远传', tag:'终端', icon:'📟' },
    { name:'智慧燃气平台', desc:'NB-IoT+瓶改管信息化管理', tag:'行业应用', icon:'🔥' },
    { name:'5G+应急通信保障', desc:'多灾种应急指挥，燃气事故应急', tag:'5G应用', icon:'🚨' }
  ],
  flood: [
    { name:'海绵城市内涝预警系统', desc:'物联感知+数字孪生，实时内涝预警', tag:'核心产品', icon:'🌊' },
    { name:'排水管网信息平台', desc:'GIS+物联感知+CCTV检测数据管理', tag:'平台', icon:'🔗' },
    { name:'地下管网GIS+防汛指挥调度', desc:'管网数字化+防汛调度一体化', tag:'GIS', icon:'🗺️' },
    { name:'市政管网监测系统', desc:'供水/燃气/供热/排水/污水管网数字化', tag:'监测', icon:'🔧' },
    { name:'智慧水务平台', desc:'漏损分析+管网监测+水质检测', tag:'行业应用', icon:'💧' },
    { name:'建制镇污水处理设施智慧监管', desc:'污水处理设施远程监管平台', tag:'监管', icon:'🏭' },
    { name:'5G+无人机巡检', desc:'排水管网/桥梁巡检', tag:'5G应用', icon:'🚁' }
  ],
  cim: [
    { name:'OneCity智慧城市平台+CIM底座', desc:'CIM/数字孪生底座，集成公司产品', tag:'核心产品', icon:'🏙️' },
    { name:'九天大模型', desc:'住建行业知识库+高质量数据集训练', tag:'AI引擎', icon:'🧠' },
    { name:'移动云政务云+智算中心', desc:'政务云+边缘计算+智算中心', tag:'基础设施', icon:'☁️' },
    { name:'可信数据空间/隐私计算底座', desc:'数据要素授权运营，安全共享', tag:'数据要素', icon:'🔒' },
    { name:'住建高质量数据集', desc:'服务行业大模型训练，数据汇聚治理', tag:'数据', icon:'📦' },
    { name:'BIM+CIM融通联动', desc:'BIM与CIM平台融通，全要素数字化', tag:'技术', icon:'📐' },
    { name:'数字孪生引擎', desc:'城市基础设施三维可视化', tag:'引擎', icon:'🔮' },
    { name:'住建行业数据中台', desc:'数据汇聚+治理+共享+开放', tag:'中台', icon:'🗄️' }
  ]
};

window.DOMAIN_ARCH = {
  lifeline: {
    layers: [
      { label:'感知层', color:'#38bdf8', boxes: [ {icon:'📡',text:'NB-IoT物联感知'},{icon:'🌡️',text:'温度/压力传感'},{icon:'📹',text:'AI视频监控'},{icon:'🚁',text:'5G无人机巡检'} ] },
      { label:'网络层', color:'#818cf8', boxes: [ {icon:'📶',text:'5G/NB-IoT'},{icon:'☁️',text:'移动云/OneNET'},{icon:'🔗',text:'边缘计算'} ] },
      { label:'平台层', color:'#a78bfa', boxes: [ {icon:'🛡️',text:'生命线监测平台'},{icon:'🏢',text:'运管服平台'},{icon:'💧',text:'漏损分析引擎'} ] },
      { label:'应用层', color:'#f472b6', boxes: [ {icon:'⚠️',text:'监测预警'},{icon:'📊',text:'综合评估'},{icon:'🚨',text:'应急指挥'} ] }
    ]
  },
  gas: {
    layers: [
      { label:'感知层', color:'#fbbf24', boxes: [ {icon:'📊',text:'智能燃气表'},{icon:'⚠️',text:'报警器/自闭阀'},{icon:'🔍',text:'管网哨兵'} ] },
      { label:'网络层', color:'#f59e0b', boxes: [ {icon:'📶',text:'NB-IoT'},{icon:'☁️',text:'OneNET平台'},{icon:'🔗',text:'移动云'} ] },
      { label:'平台层', color:'#fbbf24', boxes: [ {icon:'🛡️',text:'燃气安全监测'},{icon:'🏭',text:'瓶改管管理'},{icon:'📊',text:'数据分析'} ] },
      { label:'应用层', color:'#f97316', boxes: [ {icon:'🚨',text:'安全预警'},{icon:'📋',text:'监管执法'},{icon:'📈',text:'运营分析'} ] }
    ]
  },
  flood: {
    layers: [
      { label:'感知层', color:'#34d399', boxes: [ {icon:'🌧️',text:'雨量计'},{icon:'📏',text:'水位计'},{icon:'🚁',text:'5G无人机'},{icon:'📹',text:'AI视频'} ] },
      { label:'网络层', color:'#10b981', boxes: [ {icon:'📶',text:'NB-IoT/5G'},{icon:'☁️',text:'OneNET'},{icon:'🔗',text:'边缘计算'} ] },
      { label:'平台层', color:'#34d399', boxes: [ {icon:'🌊',text:'内涝预警系统'},{icon:'🗺️',text:'排水管网GIS'},{icon:'🔮',text:'数字孪生'} ] },
      { label:'应用层', color:'#059669', boxes: [ {icon:'🚨',text:'防汛指挥'},{icon:'📊',text:'风险评估'},{icon:'🏙️',text:'海绵城市管理'} ] }
    ]
  },
  cim: {
    layers: [
      { label:'基础设施', color:'#a78bfa', boxes: [ {icon:'☁️',text:'移动云/智算'},{icon:'🔐',text:'可信数据空间'},{icon:'📡',text:'物联感知'} ] },
      { label:'数据底座', color:'#8b5cf6', boxes: [ {icon:'🗺️',text:'CIM平台'},{icon:'📦',text:'高质量数据集'},{icon:'🗄️',text:'数据中台'},{icon:'📐',text:'BIM引擎'} ] },
      { label:'AI引擎', color:'#a78bfa', boxes: [ {icon:'🧠',text:'九天大模型'},{icon:'🔮',text:'数字孪生'},{icon:'🤖',text:'AI+应用'} ] },
      { label:'CIM+应用', color:'#7c3aed', boxes: [ {icon:'🏗️',text:'智能建造'},{icon:'🏘️',text:'智慧住建'},{icon:'📊',text:'数据要素运营'} ] }
    ]
  }
};
