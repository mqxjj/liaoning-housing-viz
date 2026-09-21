/* ===================================================================
 * 省页通用 app 工厂 - createProvinceApp(provinceConfig)
 * 全国作战地图 - 各省页共享（辽宁/福建/湖北/陕西/四川...）
 * 
 * provinceConfig 参数：
 * { key:'liaoning', label:'辽', shortLabel:'辽宁', fullTitle:'辽宁省住建厅机会点作战地图',
 *   subtitle:'LIAONING HOUSING & CONSTRUCTION OPPORTUNITY MAP',
 *   adcode:210000, center:[123.43,41.80], capital:'沈阳' }
 * 
 * 由 provinces/{key}.html 在 load 时调用：
 *   const provinceApp = createProvinceApp(PROVINCE_META);
 *   provinceApp.init();
 * =================================================================== */

function createProvinceApp(provinceConfig) {
  'use strict';

  const app = {
  state: { view:'home', city:null, selectedDomain:'lifeline', battleDomain:null, battleLevel:'province', drilledCity:null, mapCity:null },
  data: (window.PROVINCE_DATA[provinceConfig.key] || []).filter(d => d.category && d.category.trim()),
  geo: window.PROVINCE_GEOJSON[provinceConfig.key],
  ov: window.PROVINCE_OVERLAYS[provinceConfig.key] || {},
  map: null,
  mapLayers: {},
  cityGeoLayer: null,
  cityLabels: {},
  layerStates: {},
  cityData: {},
  flowAnimations: [],
  _flowRAF: null,

  // 叠加层数据为 [lng,lat]，Leaflet 需 [lat,lng]
  LL(c) { return [c[1], c[0]]; },
  LLPath(p) { return p.map(pt => [pt[1], pt[0]]); },

  init() {
    this.getCityOpportunityCounts();
    this.renderDomainCards();
    this.renderCapPanel();
    this.renderMapBottomBar();
    this.initMap();
    this.highlightDomainCities(this.state.selectedDomain);
    window.addEventListener('resize', () => { if(this.map) this.map.invalidateSize(); if(this.battleMap) this.battleMap.resize(); });
  },

  go(view, opts={}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if(view === 'home') {
      document.getElementById('page-home').classList.add('active');
      this.state.view = 'home';
      setTimeout(() => { if(this.map) this.map.invalidateSize(); }, 50);
    } else if(view === 'battle') {
      document.getElementById('page-battle').classList.add('active');
      this.state.view = 'battle';
      this.state.battleLevel = opts.level || 'province';
      this.state.city = opts.city || null;
      this.state.battleDomain = null;
      this.renderBattle();
    }
  },

  getDomainCounts(items) {
    const counts = {};
    DOMAINS.forEach(d => counts[d.key] = 0);
    items.forEach(it => { (it.domains||[]).forEach(d => { if(counts[d]!==undefined) counts[d]++; }); });
    return counts;
  },

  getCityOpportunityCounts() {
    const cityData = {};
    this.data.filter(d => d.level==='municipal').forEach(d => {
      if(d.city) cityData[d.city] = (cityData[d.city]||0) + 1;
    });
    this.cityData = cityData;
    return cityData;
  },

  // Cities that have opportunities for a given domain
  getDomainCities(domainKey) {
    const cities = new Set();
    this.data.filter(d => d.level==='municipal' && (d.domains||[]).includes(domainKey))
      .forEach(d => d.city && cities.add(d.city));
    return cities;
  },

  // ===== Domain cards =====
  renderDomainCards() {
    const counts = this.getDomainCounts(this.data);
    const max = Math.max(...Object.values(counts), 1);
    document.getElementById('domainCards').innerHTML = DOMAINS.map(d => {
      const pct = Math.round(counts[d.key]/max*100);
      const active = this.state.selectedDomain === d.key ? 'active' : '';
      return `<div class="domain-card ${active}" style="border-left-color:${d.color}" onclick="app.selectDomain('${d.key}')">
        <div class="dc-count" style="color:${d.color}">${counts[d.key]}</div>
        <div class="dc-icon">${d.icon}</div>
        <div class="dc-name" style="color:${d.color}">${d.name}</div>
        <div class="dc-short">${d.short}</div>
        <div class="dc-desc">${d.desc}</div>
        <div class="dc-bar"><span style="width:${pct}%;background:${d.color};box-shadow:0 0 6px ${d.color}"></span></div>
      </div>`;
    }).join('');
  },

  selectDomain(key) {
    this.state.selectedDomain = key;
    this.renderDomainCards();
    this.renderCapPanel();
    this.renderMapBottomBar();
    this.highlightDomainCities(key);
  },

  // ===== Capability panel (right) =====
  renderCapPanel() {
    const d = DOMAINS.find(x => x.key === this.state.selectedDomain);
    if(!d) return;
    document.getElementById('capTitle').textContent = `${d.icon} ${d.name}`;
    document.getElementById('capTag').textContent = d.short.toUpperCase();
    const caps = DOMAIN_CAPS[d.key] || [];
    const arch = DOMAIN_ARCH[d.key];

    let archHtml = '<div class="cap-section"><div class="cap-section-title">🏗️ 产品架构</div><div class="arch-diagram">';
    arch.layers.forEach(layer => {
      archHtml += `<div class="arch-layer">
        <div class="arch-layer-label" style="background:${layer.color}22;color:${layer.color};border:1px solid ${layer.color}55;">${layer.label}</div>
        <div class="arch-layer-content" style="background:${layer.color}0a;border:1px solid ${layer.color}33;border-left:none;">`;
      layer.boxes.forEach(b => {
        archHtml += `<div class="arch-box" style="border-color:${layer.color}55;background:${layer.color}0d;color:${layer.color};">
          <div class="ab-icon">${b.icon}</div><div>${b.text}</div></div>`;
      });
      archHtml += '</div></div>';
    });
    archHtml += '</div></div>';

    let capHtml = '<div class="cap-section"><div class="cap-section-title">⚡ 核心产品能力</div>';
    caps.forEach(c => {
      const clickable = c.url ? `onclick="window.open('${c.url}','_blank')" style="cursor:pointer;"` : '';
      const demoBadge = c.url ? '<span class="demo-badge" title="点击查看Demo">🔗 Demo</span>' : '';
      capHtml += `<div class="cap-item" ${clickable} style="border-left:2px solid ${d.color};">
        <div class="ci-name">${c.icon} ${c.name} ${demoBadge}</div>
        <div class="ci-desc">${c.desc}</div>
        <div style="margin-top:3px;"><span class="ci-tag" style="background:${d.color}22;color:${d.color};">${c.tag}</span></div>
      </div>`;
    });
    capHtml += '</div>';
    document.getElementById('capPanel').innerHTML = archHtml + capHtml;
  },

  // ===== Map bottom bar (domain stats + battle entry) =====
  renderMapBottomBar() {
    const d = DOMAINS.find(x => x.key === this.state.selectedDomain);
    if(!d) return;
    const city = this.state.mapCity;

    if(city) {
      // 地市视图：展示该市商机统计，卡片可点击进入该市作战页
      const cityItems = this.data.filter(it => it.level==='municipal' && it.city===city);
      const total = cityItems.length;
      const domCounts = this.getDomainCounts(cityItems);
      const highCount = cityItems.filter(i => (i.priority||'').includes('★★★★★')).length;

      let domChips = DOMAINS.map(dm => {
        if(domCounts[dm.key] === 0) return '';
        return `<span class="dom-chip" style="border-color:${dm.color}55;background:${dm.color}1a;color:${dm.color};">
          ${dm.icon} ${dm.short} <b>${domCounts[dm.key]}</b></span>`;
      }).join('');
      if(!domChips) domChips = '<span style="color:var(--text-faint);font-size:11px;">暂无该地市机会点</span>';

      const html = `
        <div class="city-stat-card">
          <div class="csc-left">
            <div class="csc-city-name">📍 ${city}</div>
            <div class="csc-desc">地市级商机总览</div>
          </div>
          <div class="csc-stats">
            <div class="csc-stat"><div class="csc-num" style="color:var(--cyan)">${total}</div><div class="csc-lbl">机会点</div></div>
            <div class="csc-stat"><div class="csc-num" style="color:var(--amber)">${highCount}</div><div class="csc-lbl">五星级</div></div>
            <div class="csc-stat"><div class="csc-num" style="color:var(--purple)">${Object.values(domCounts).filter(v=>v>0).length}</div><div class="csc-lbl">涉及领域</div></div>
          </div>
          <div class="csc-doms">${domChips}</div>
          <div class="csc-actions">
            <div class="csc-btn primary" onclick="app.go('battle',{level:'city',city:'${city}'})">📋 查看${city}作战地图 →</div>
            <div class="csc-btn ghost" onclick="app.clearCitySelection()">✕ 清除选择</div>
          </div>
        </div>
      `;
      document.getElementById('mapBottomBar').innerHTML = html;
    } else {
      // 省级总览视图
      const provCount = this.data.filter(it => it.level==='provincial' && (it.domains||[]).includes(d.key)).length;
      const cityCount = this.data.filter(it => it.level==='municipal' && (it.domains||[]).includes(d.key)).length;
      const cities = this.getDomainCities(d.key);

      const html = `
        <div class="prov-stat-bar">
          <div class="psb-domain">
            <span class="psb-icon">${d.icon}</span>
            <div><div class="psb-name" style="color:${d.color}">${d.short}</div><div class="psb-sub">当前领域商机分布</div></div>
          </div>
          <div class="psb-stats">
            <div class="psb-stat"><div class="psb-num" style="color:${d.color}">${provCount}</div><div class="psb-lbl">省级机会</div></div>
            <div class="psb-sep"></div>
            <div class="psb-stat"><div class="psb-num" style="color:${d.color}">${cityCount}</div><div class="psb-lbl">地市级机会</div></div>
            <div class="psb-sep"></div>
            <div class="psb-stat"><div class="psb-num" style="color:${d.color}">${cities.size}</div><div class="psb-lbl">覆盖地市</div></div>
          </div>
          <div class="back-btn" onclick="app.go('battle',{level:'province'})">📋 查看省级作战地图 →</div>
        </div>
      `;
      document.getElementById('mapBottomBar').innerHTML = html;
    }
  },

  // 地图上选中地市：高亮 + 下钻矢量图 + 底部展示该市商机 + 仅展示该市管网
  selectCityOnMap(name) {
    this.state.mapCity = name;
    this.renderMapBottomBar();
    const feature = this.geo.features.find(f => f.properties.name === name);
    if(feature) {
      // 计算城市边界，过滤管网仅显示该市
      const bounds = L.geoJSON(feature).getBounds();
      this.rebuildPipeLayers(bounds);
      this.drillDownCity(name, feature);
    }
  },

  clearCitySelection() {
    this.state.mapCity = null;
    this.renderMapBottomBar();
    this.exitDrill();
  },

  // ===== Leaflet Map =====
  initMap() {
    const ov = this.ov;
    this.map = L.map('leafletMap', { zoomControl:false, attributionControl:false, minZoom:6, maxZoom:14 }).setView([41.5, 122.5], 7);

    // 地形起伏DOM阴影层（Esri World Hillshade），模拟山区地形起伏感
    const terrain = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16, className: 'terrain-tile', opacity: 0.85
    });
    terrain.addTo(this.map);
    this.mapLayers.terrain = terrain;

    // Satellite base (移除ArcGIS英文标注图层，避免与中文标注冲突)
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:18 });
    sat.addTo(this.map);
    this.mapLayers.sat = sat;

    // Province boundary (outer, dashed)
    L.geoJSON(this.geo, {
      style: { color:'#38bdf8', weight:2.5, fillColor:'transparent', fillOpacity:0, dashArray:'6 4' }
    }).addTo(this.map);

    // City boundaries with hover highlight + click drill
    const cityGeoLayer = L.geoJSON(this.geo, {
      style: (feature) => this.getCityStyle(feature.properties.name),
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const cnt = this.cityData[name] || 0;

        // Permanent Chinese label — 绑定到图层，自动居中显示
        layer.bindTooltip(name, {
          permanent: true, direction: 'center', className: 'city-label',
          offset: [0, 0], opacity: 1
        });
        this.cityLabels[name] = layer.getTooltip();

        layer.on('mouseover', (e) => {
          layer.setStyle({ weight:3, color:'#38bdf8', fillColor:'rgba(56,189,248,0.35)', fillOpacity:0.7 });
          const lbl = this.cityLabels[name];
          if(lbl) { const el = lbl.getElement(); if(el) el.classList.add('highlight'); }
          this.map.getContainer().style.cursor = 'pointer';
        });
        layer.on('mouseout', (e) => {
          cityGeoLayer.resetStyle(layer);
          const lbl = this.cityLabels[name];
          if(lbl) { const el = lbl.getElement(); if(el) el.classList.remove('highlight'); }
          this.map.getContainer().style.cursor = '';
        });
        layer.on('click', (e) => {
          this.selectCityOnMap(name);
        });

        // Popup
        const cityItems = this.data.filter(d => d.level==='municipal' && d.city===name);
        const doms = {};
        cityItems.forEach(it => (it.domains||[]).forEach(d => doms[d]=(doms[d]||0)+1));
        const domStr = Object.entries(doms).map(([k,v])=>{
          const dom = DOMAINS.find(x=>x.key===k);
          return `<span style="color:${dom?dom.color:'#94a3b8'}">${dom?dom.short:k}:${v}</span>`;
        }).join(' · ');
        layer.bindPopup(`
          <div class="popup-title">${name}</div>
          <div class="popup-row">机会点数量：<b style="color:#38bdf8">${cnt}</b> 项</div>
          ${domStr?`<div class="popup-row" style="font-size:10px;">${domStr}</div>`:''}
          <div class="popup-action" onclick="app.go('battle',{level:'city',city:'${name}'})">📋 查看${name}作战地图</div>
        `, { className:'city-popup', closeButton:false });
      }
    }).addTo(this.map);
    this.cityGeoLayer = cityGeoLayer;
    // 提升标注层级，确保不被其他图层遮挡
    if(cityGeoLayer.getPane()) cityGeoLayer.getPane().style.zIndex = 450;

    // Roads
    const roads = L.layerGroup(ov.roads.map(r =>
      L.polyline(this.LLPath(r.path), { color:'#94a3b8', weight:2, opacity:0.55 }).bindTooltip(r.name, {sticky:true})
    ));
    this.mapLayers.roads = roads;

    // Rivers
    const rivers = L.layerGroup(ov.rivers.map(r =>
      L.polyline(this.LLPath(r.path), { color:'#0ea5e9', weight:3.5, opacity:0.6 }).bindTooltip(r.name, {sticky:true})
    ));
    this.mapLayers.rivers = rivers;

    // Pipe layers + facilities
    this.createPipeLayer('gasPipes', 'gasFacilities', '#fbbf24', '燃气管网');
    this.createPipeLayer('waterPipes', 'waterFacilities', '#38bdf8', '供水管网');
    this.createPipeLayer('heatPipes', 'heatFacilities', '#f87171', '供热管网');

    // City opportunity markers
    const markers = L.layerGroup();
    Object.entries(ov.cityCenters).forEach(([name, coord]) => {
      const cnt = this.cityData[name] || 0;
      if(cnt === 0) return;
      const color = cnt > 2 ? '#a78bfa' : (cnt > 1 ? '#38bdf8' : '#34d399');
      const marker = L.circleMarker(this.LL(coord), {
        radius: 5 + cnt*2, fillColor:color, fillOpacity:0.7, color:'#fff', weight:1.5
      });
      marker.addTo(markers);
    });
    markers.addTo(this.map);
    this.mapLayers.markers = markers;

    // Default visible layers
    roads.addTo(this.map);
    rivers.addTo(this.map);

    // Controls
    const controls = [
      { key:'sat', label:'🛰️ 卫星影像', on:true },
      { key:'terrain', label:'⛰️ 地形起伏', on:true },
      { key:'gasPipes', label:'🔥 燃气管网', on:false },
      { key:'waterPipes', label:'💧 供水管网', on:false },
      { key:'heatPipes', label:'🌡️ 供热管网', on:false },
    ];
    document.getElementById('mapControls').innerHTML = controls.map(c =>
      `<div class="map-layer-toggle ${c.on?'on':''}" id="toggle_${c.key}" onclick="app.toggleLayer('${c.key}')">${c.label}</div>`
    ).join('');
    this.layerStates = {};
    controls.forEach(c => this.layerStates[c.key] = c.on);

    // Legend：只保留设施类型
    const fc = ov.facilityConfig;
    document.getElementById('mapLegend').innerHTML = `
      <div class="leg-title">⚡ 设施类型图例</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.source.color};box-shadow:0 0 6px ${fc.source.color};"></div> ${fc.source.label}（气源/水源/热源）</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.door.color};box-shadow:0 0 6px ${fc.door.color};"></div> ${fc.door.label}（门站/净水厂/换热首站）</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.storage.color};box-shadow:0 0 6px ${fc.storage.color};"></div> ${fc.storage.label}（储配站）</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.pressure.color};box-shadow:0 0 6px ${fc.pressure.color};"></div> ${fc.pressure.label}（调压/加压/换热站）</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.user.color};box-shadow:0 0 6px ${fc.user.color};"></div> ${fc.user.label}（居民/工业/商业）</div>
    `;

    // 启动管网流动粒子动画
    this.startFlowAnimation();
  },

  getCityStyle(name) {
    const d = DOMAINS.find(x => x.key === this.state.selectedDomain);
    const domainCities = this.getDomainCities(this.state.selectedDomain);
    const inDomain = domainCities.has(name);
    const satOn = this.layerStates.sat !== false; // default true
    // 卫星图开启时矢量更透明，露出底图；关闭时矢量底色更实，凸显行政区划
    const baseOpacity = satOn ? 0.18 : 0.42;
    const domainOpacity = satOn ? 0.42 : 0.62;
    return {
      color: inDomain ? d.color : 'rgba(125,211,252,0.55)',
      weight: inDomain ? 2.2 : 1.2,
      fillColor: inDomain ? d.color : 'rgba(56,189,248,0.22)',
      fillOpacity: inDomain ? domainOpacity : baseOpacity
    };
  },

  createPipeLayer(pipeKey, facKey, color, label, bounds) {
    const ov = this.ov;
    const group = L.layerGroup();
    const fc = ov.facilityConfig;
    const flowColor = (ov.pipeFlowColors && ov.pipeFlowColors[pipeKey]) || color;

    // 管道按层级区分粗细：主干线最粗
    const weightByLevel = { 'trunk': 6, 'source-door': 5, 'door-storage': 4.5, 'storage-pressure': 4, 'pressure-user': 3.5, 'door-pressure':4 };

    const inBounds = (coord) => {
      if(!bounds) return true;
      const ll = L.latLng(coord[1], coord[0]);
      return bounds.contains(ll);
    };

    (ov[pipeKey]||[]).forEach(p => {
      // 过滤：管道至少有一个端点在城市范围内才显示
      if(bounds) {
        const hasPointInBounds = p.path.some(pt => inBounds(pt));
        if(!hasPointInBounds) return;
      }
      const latlngs = this.LLPath(p.path);
      const w = weightByLevel[p.level] || 4;

      // 第1层：外圈光晕（粗大模糊发光）
      const haloLine = L.polyline(latlngs, {
        color: color, weight: w + 8, opacity: 0.18, className: 'pipe-flow-glow',
        lineCap: 'round', lineJoin: 'round'
      });
      group.addLayer(haloLine);

      // 第2层：中层光带（中等粗细，带颜色）
      const midLine = L.polyline(latlngs, {
        color: color, weight: w + 2, opacity: 0.55, className: 'pipe-flow',
        lineCap: 'round', lineJoin: 'round'
      }).bindTooltip(`${label}: ${p.name}`, {sticky:true});
      group.addLayer(midLine);

      // 第3层：核心实线（细，明亮）
      const coreLine = L.polyline(latlngs, {
        color: '#ffffff', weight: Math.max(1.5, w - 2.5), opacity: 0.92, className: 'pipe-flow-core',
        lineCap: 'round', lineJoin: 'round'
      });
      group.addLayer(coreLine);

      // 第4层：流动虚线（颜色覆盖在白核心之上）
      const dashLine = L.polyline(latlngs, {
        color: flowColor, weight: Math.max(1.2, w - 3.5), opacity: 0.9,
        className: 'pipe-flow-dash', lineCap: 'round', lineJoin: 'round'
      });
      group.addLayer(dashLine);

      // 流动粒子：每条管道2-3个发光点沿路径流动（强化发光感）
      const particleCount = p.level === 'trunk' ? 4 : (p.level === 'source-door' ? 3 : 2);
      for(let i = 0; i < particleCount; i++) {
        const icon = L.divIcon({
          className:'',
          html:`<div class="flow-particle" style="background:${flowColor};color:${flowColor};box-shadow:0 0 10px ${flowColor},0 0 18px ${flowColor},0 0 28px ${flowColor};"></div>`,
          iconSize:[10,10]
        });
        const marker = L.marker(latlngs[0], { icon, interactive:false, keyboard:false });
        marker.addTo(group);
        const offset = i / particleCount;
        this.flowAnimations.push({
          marker, latlngs, progress: offset,
          speed: p.level === 'trunk' ? 0.0008 : 0.0012
        });
      }
    });

    // 设施点（仅显示在城市范围内的）—— 强化发光感与光环
    (ov[facKey]||[]).forEach(f => {
      if(bounds && !inBounds(f.coord)) return;
      const cfg = fc[f.type];
      const size = cfg.size * 2.4;
      const icon = L.divIcon({
        className:'',
        html:`<div style="position:relative;">
          <div class="facility-aura" style="color:${cfg.color};"></div>
          <div class="facility-marker" style="width:${size}px;height:${size}px;background:${cfg.color};color:${cfg.color};box-shadow:0 0 12px ${cfg.color},0 0 22px ${cfg.color},0 0 32px ${cfg.color}88;">${cfg.icon}</div>
        </div>`,
        iconSize:[size, size]
      });
      const marker = L.marker(this.LL(f.coord), { icon })
        .bindTooltip(`${cfg.label}: ${f.name}`, { sticky:true, className:'facility-label' });
      group.addLayer(marker);
    });

    this.mapLayers[pipeKey] = group;
  },

  // 按城市边界重建管网图层（bounds=null 时恢复全省）
  rebuildPipeLayers(bounds) {
    // 清除旧的流动粒子动画
    this.flowAnimations = [];
    const pipeKeys = [['gasPipes','gasFacilities','#fbbf24','燃气管网'],
                      ['waterPipes','waterFacilities','#38bdf8','供水管网'],
                      ['heatPipes','heatFacilities','#f87171','供热管网']];
    pipeKeys.forEach(([pk,fk,color,label]) => {
      // 记录原有可见状态
      const wasOn = this.layerStates[pk];
      if(this.mapLayers[pk]) {
        this.map.removeLayer(this.mapLayers[pk]);
      }
      this.createPipeLayer(pk, fk, color, label, bounds);
      // 恢复可见状态
      if(wasOn) this.mapLayers[pk].addTo(this.map);
    });
  },

  // ===== 管网流动粒子动画 =====
  startFlowAnimation() {
    if(this._flowRAF) return;
    const step = () => {
      this.flowAnimations.forEach(fa => {
        fa.progress += fa.speed;
        if(fa.progress > 1) fa.progress -= 1;
        const pt = this.pointAlongPath(fa.latlngs, fa.progress);
        fa.marker.setLatLng(pt);
      });
      this._flowRAF = requestAnimationFrame(step);
    };
    this._flowRAF = requestAnimationFrame(step);
  },
  stopFlowAnimation() {
    if(this._flowRAF) { cancelAnimationFrame(this._flowRAF); this._flowRAF = null; }
  },
  // 沿路径插值取点（progress 0~1）
  pointAlongPath(latlngs, progress) {
    if(latlngs.length < 2) return latlngs[0];
    // 计算各段长度
    const segs = [];
    let total = 0;
    for(let i = 1; i < latlngs.length; i++) {
      const d = Math.hypot(latlngs[i][0]-latlngs[i-1][0], latlngs[i][1]-latlngs[i-1][1]);
      segs.push(d); total += d;
    }
    let target = progress * total;
    for(let i = 0; i < segs.length; i++) {
      if(target <= segs[i] || i === segs.length-1) {
        const t = segs[i] === 0 ? 0 : target / segs[i];
        return [
          latlngs[i][0] + (latlngs[i+1][0]-latlngs[i][0]) * t,
          latlngs[i][1] + (latlngs[i+1][1]-latlngs[i][1]) * t
        ];
      }
      target -= segs[i];
    }
    return latlngs[latlngs.length-1];
  },

  toggleLayer(key) {
    const layer = this.mapLayers[key];
    if(!layer) return;
    if(this.layerStates[key]) {
      this.map.removeLayer(layer);
      this.layerStates[key] = false;
      document.getElementById('toggle_'+key)?.classList.remove('on');
    } else {
      layer.addTo(this.map);
      this.layerStates[key] = true;
      document.getElementById('toggle_'+key)?.classList.add('on');
    }
    // 卫星图层切换时，同步刷新矢量地图透明度，让切换效果可见
    if(key === 'sat' && this.cityGeoLayer) {
      this.cityGeoLayer.setStyle((feature) => this.getCityStyle(feature.properties.name));
    }
  },

  highlightDomainCities(domainKey) {
    const d = DOMAINS.find(x => x.key === domainKey);
    const domainCities = this.getDomainCities(domainKey);
    if(this.cityGeoLayer) {
      this.cityGeoLayer.setStyle((feature) => this.getCityStyle(feature.properties.name));
    }
    // 领域相关地市的标签变色突出
    Object.entries(this.cityLabels).forEach(([name, label]) => {
      const el = label.getElement();
      if(!el) return;
      if(domainCities.has(name)) {
        el.style.color = d ? d.color : '#fbbf24';
        el.style.fontWeight = '700';
        el.style.textShadow = `0 0 6px ${d?d.color:'#fbbf24'}, 0 0 10px rgba(0,0,0,0.9)`;
      } else {
        el.style.color = '#f0f9ff';
        el.style.fontWeight = '600';
        el.style.textShadow = '0 0 4px #000, 0 0 8px rgba(0,0,0,0.8)';
      }
    });
    // Also auto-show relevant pipe layers
    const showPipes = { lifeline:['gasPipes','waterPipes','heatPipes'], gas:['gasPipes'], flood:['waterPipes'], cim:['gasPipes','waterPipes','heatPipes'] };
    const toShow = showPipes[domainKey] || [];
    ['gasPipes','waterPipes','heatPipes'].forEach(k => {
      const shouldShow = toShow.includes(k);
      if(shouldShow && !this.layerStates[k]) this.toggleLayer(k);
      else if(!shouldShow && this.layerStates[k]) this.toggleLayer(k);
    });
  },

  drillDownCity(name, feature) {
    this.state.drilledCity = name;
    document.getElementById('drillStatus').style.display = 'block';

    // First fit bounds to the city
    const bounds = L.geoJSON(feature).getBounds();
    this.map.fitBounds(bounds, { padding:[40,40], maxZoom:10 });

    // 首页不加载区县，只高亮该地市（区县在二级页面显示）
    if(this._cityDrillLayer) { this.map.removeLayer(this._cityDrillLayer); this._cityDrillLayer = null; }
    this.cityGeoLayer.setStyle((f) => f.properties.name === name
      ? { color:'#7dd3fc', weight:3, fillColor:'rgba(56,189,248,0.4)', fillOpacity:0.6 }
      : { color:'rgba(125,211,252,0.18)', weight:1, fillColor:'rgba(56,189,248,0.05)', fillOpacity:0.25 });

    // 按城市边界重建管网，仅显示该市的管网与设施
    this.rebuildPipeLayers(bounds);

    document.getElementById('drillStatus').textContent = `📍 ${name} · 已聚焦管网视图（点击进入作战地图查看区县）`;
  },

  exitDrill() {
    if(this._cityDrillLayer) { this.map.removeLayer(this._cityDrillLayer); this._cityDrillLayer = null; }
    this.state.drilledCity = null;
    this.state.mapCity = null;
    document.getElementById('drillStatus').style.display = 'none';
    this.map.setView([41.5, 122.5], 7);
    // 恢复全省管网
    this.rebuildPipeLayers(null);
    this.highlightDomainCities(this.state.selectedDomain);
    this.renderMapBottomBar();
  },

  // ===== Battle page =====
  renderBattle() {
    const level = this.state.battleLevel;
    const city = this.state.city;
    const isProvince = level === 'province';

    document.getElementById('battleTitle').textContent = isProvince ? '省级作战地图 · 省住建厅' : `地市级作战地图 · ${city}`;
    document.getElementById('battleSubtitle').textContent = isProvince ? 'PROVINCIAL BATTLE MAP' : `${city.toUpperCase()} BATTLE MAP`;
    document.getElementById('battleCrumb').textContent = isProvince ? '省级作战地图' : city;

    let items = isProvince
      ? this.data.filter(d => d.level==='provincial')
      : this.data.filter(d => d.level==='municipal' && d.city===city);

    const counts = this.getDomainCounts(items);

    document.getElementById('battleTabs').innerHTML =
      `<div class="domain-tab ${!this.state.battleDomain?'active':''}" onclick="app.selectBattleDomain(null)">
        <span class="dot" style="background:var(--cyan)"></span>全部 (${items.length})</div>` +
      DOMAINS.map(d => `<div class="domain-tab ${this.state.battleDomain===d.key?'active':''}" onclick="app.selectBattleDomain('${d.key}')">
        <span class="dot" style="background:${d.color}"></span>${d.icon} ${d.short} (${counts[d.key]})</div>`).join('');

    const filtered = this.state.battleDomain
      ? items.filter(it => (it.domains||[]).includes(this.state.battleDomain))
      : items;

    const concernsHtml = this.renderConcernMatrix(filtered);
    // 地市级用Leaflet真实地图（带地形+管网+设施），省级用ECharts省地图
    const mapHtml = isProvince
      ? '<div class="anno-map"><div id="battleMap"></div></div>'
      : '<div class="anno-map"><div id="battleLeaflet"></div><div class="map-controls" id="battleMapControls"></div><div class="map-legend" id="battleMapLegend"></div></div>';
    const highCount = items.filter(i => (i.priority||'').includes('★★★★★')).length;

    // 领域商机分布：仪表盘布局（左侧环形图 + 右侧领域卡片 + 底部优先级条）
    const totalCount = items.length;
    const domainDistHtml = this.renderDomainDistribution(counts, totalCount, items);

    // 机会点详情：新分层瀑布式卡片
    const cards = filtered.length ? filtered.map(it => this.renderOppCardNew(it)).join('')
      : `<div class="opp-empty"><div class="oe-icon">📭</div><div>${isProvince?'省级':city}暂无该领域机会点数据</div></div>`;

    document.getElementById('battleContent').innerHTML = `
      <div class="battle-stats-row">
        <div class="bst-item"><div class="bst-num" style="color:var(--cyan)">${items.length}</div><div class="bst-lbl">机会点总数</div></div>
        <div class="bst-item"><div class="bst-num" style="color:var(--amber)">${highCount}</div><div class="bst-lbl">五星级商机</div></div>
        <div class="bst-item"><div class="bst-num" style="color:var(--green)">${filtered.length}</div><div class="bst-lbl">当前筛选数</div></div>
        <div class="bst-item"><div class="bst-num" style="color:var(--purple)">${isProvince?'全省':city}</div><div class="bst-lbl">作战范围</div></div>
      </div>
      <div class="two-col">
        <div class="col-panel">
          <div class="col-panel-head"><h3>🎯 客户关注重点</h3><span class="tag" style="font-size:10px;color:var(--text-faint);">${filtered.length}项</span></div>
          <div class="col-panel-body">${concernsHtml}</div>
        </div>
        <div class="col-panel">
          <div class="col-panel-head"><h3>${isProvince?'🗺️ 省级商机地图标注':'🗺️ '+city+'地图 · 管网输配网络'}</h3></div>
          <div class="col-panel-body">${mapHtml}</div>
        </div>
      </div>
      <div class="col-panel" style="margin-bottom:16px;">
        <div class="col-panel-head"><h3>📊 领域商机分布</h3><span class="tag" style="font-size:10px;color:var(--text-faint);">仪表盘视图</span></div>
        <div class="col-panel-body">${domainDistHtml}</div>
      </div>
      <div style="margin-bottom:12px;font-size:14px;font-weight:600;color:var(--cyan-light);display:flex;align-items:center;gap:8px;">
        <span style="display:inline-block;width:3px;height:14px;background:var(--cyan);border-radius:2px;box-shadow:0 0 6px var(--cyan);"></span>
        📋 机会点详情 <span style="font-size:11px;color:var(--text-faint);font-weight:400;">(${filtered.length}项 · 点击领域标签筛选)</span>
      </div>
      <div class="opp-grid-new">${cards}</div>
    `;

    setTimeout(() => {
      this.initDomainChart(items);
      if(isProvince) {
        this.initBattleMap(filtered, isProvince, city);
      } else {
        this.initCityBattleLeaflet(city, filtered);
      }
    }, 50);
  },

  // 领域商机分布仪表盘：左侧环形图占位 + 右侧领域卡片 + 底部优先级条
  renderDomainDistribution(counts, totalCount, items) {
    const priorityBuckets = { high:0, mid:0, low:0 };
    items.forEach(it => {
      const p = it.priority || '';
      if(p.includes('★★★★★')) priorityBuckets.high++;
      else if(p.includes('★★')) priorityBuckets.mid++;
      else priorityBuckets.low++;
    });

    // 优先级条
    const segColors = { high:'#fbbf24', mid:'#38bdf8', low:'#64748b' };
    const segLabels = { high:'五星级', mid:'二~四星', low:'普通' };
    const total = priorityBuckets.high + priorityBuckets.mid + priorityBuckets.low || 1;
    const prioritySegs = Object.entries(priorityBuckets).map(([k,v]) => {
      const w = (v/total*100).toFixed(1);
      if(v === 0) return '';
      return `<div class="dd-priority-seg" style="width:${w}%;background:${segColors[k]};box-shadow:0 0 6px ${segColors[k]}88;">${v>0?`<span>${v}</span>`:''}</div>`;
    }).join('');
    const legendHtml = Object.entries(segColors).map(([k,c]) =>
      `<i style="background:${c}"></i>${segLabels[k]}`).join('');

    // 领域卡片
    const maxCount = Math.max(...Object.values(counts), 1);
    const cards = DOMAINS.map(d => {
      const c = counts[d.key] || 0;
      const pct = totalCount ? (c/totalCount*100).toFixed(0) : 0;
      const widthPct = (c/maxCount*100).toFixed(0);
      const highInDomain = items.filter(it =>
        (it.domains||[]).includes(d.key) && (it.priority||'').includes('★★★★★')).length;
      return `<div class="dd-card" style="border-color:${d.color}33;border-left-color:${d.color};"
        onclick="app.selectBattleDomain('${d.key}')">
        <div class="ddc-head">
          <span class="ddc-icon">${d.icon}</span>
          <span class="ddc-name">${d.short}</span>
          <span class="ddc-pct" style="color:${d.color};">${pct}%</span>
        </div>
        <div class="ddc-stats">
          <div class="ddc-stat"><div class="n" style="color:${d.color};">${c}</div><div class="l">总数</div></div>
          <div class="ddc-stat"><div class="n" style="color:var(--amber);">${highInDomain}</div><div class="l">五星级</div></div>
        </div>
        <div class="ddc-bar"><span style="width:${widthPct}%;background:${d.color};box-shadow:0 0 6px ${d.color}"></span></div>
      </div>`;
    }).join('');

    return `
      <div class="domain-distribution">
        <div class="dd-chart">
          <div class="dd-chart-title">🌐 领域占比</div>
          <div id="domainChart"></div>
          <div class="dd-chart-center">
            <div class="ddc-num">${totalCount}</div>
            <div class="ddc-lbl">总数</div>
          </div>
        </div>
        <div class="dd-cards">${cards}</div>
        <div class="dd-priority-row">
          <span class="pr-lbl">⭐ 优先级</span>
          <div class="dd-priority-segs">${prioritySegs}</div>
          <span class="dd-priority-legend">${legendHtml}</span>
        </div>
      </div>
    `;
  },

  // 新版机会点卡片：分层瀑布式布局（4 个独立 block + 展开按钮）
  renderOppCardNew(it) {
    const cardId = 'oppcard_' + Math.random().toString(36).slice(2,9);
    const domTags = (it.domains||[]).map(k => {
      const d = DOMAINS.find(x=>x.key===k);
      return d ? `<span class="ocn-tag" style="background:${d.color}1a;color:${d.color};border-color:${d.color}55;">${d.icon} ${d.short}</span>` : '';
    }).join('');
    const title = it.target.split('<br>')[0].replace(/\s*职责：.*/,'').trim();
    const dutyMatch = it.target.match(/职责：(.+)/);
    const duty = dutyMatch ? dutyMatch[1] : '';

    const pri = it.priority || '';
    const isHigh = pri.includes('★★★★★');
    const isMid = !isHigh && pri.includes('★★');
    const priClass = isHigh ? 'high' : (isMid ? 'mid' : 'low');
    const priLabel = pri.replace('立即深耕','⭐立即深耕').replace('★★★★★','5★').replace('★★★★','4★').replace('★★★','3★').replace('★★','2★') || '普通';

    // 主领域色（用第一个领域，否则用 cyan）
    const mainDomain = (it.domains||[])[0];
    const mainColor = mainDomain ? (DOMAINS.find(d=>d.key===mainDomain)?.color || '#38bdf8') : '#38bdf8';

    // === 职责 block（带展开） ===
    let dutyBlock = '';
    if(duty) {
      const needExpand = duty.length > 110;
      const short = needExpand ? duty.substring(0,110)+'...' : duty;
      dutyBlock = `
      <div class="ocn-block full">
        <div class="ob-label"><span class="ob-dot" style="background:${mainColor};box-shadow:0 0 4px ${mainColor};"></span>📋 职责</div>
        <div class="ob-content ob-collapsed-hint">${short}</div>
        ${needExpand ? `<div class="ob-content ob-full">${duty}</div>
          <div class="ob-expand" onclick="this.closest('.opp-card-new').classList.toggle('expanded')"><span>查看完整职责</span><span class="ob-arrow">▼</span></div>` : ''}
      </div>`;
    }

    // === 关注点 block（带展开） ===
    let concernBlock = '';
    if(it.concernList && it.concernList.length) {
      const all = it.concernList;
      const visible = all.slice(0,2);
      const hidden = all.slice(2);
      const needExpand = all.length > 2;
      concernBlock = `
      <div class="ocn-block">
        <div class="ob-label"><span class="ob-dot" style="background:#a78bfa;box-shadow:0 0 4px #a78bfa;"></span>🎯 关注点<span class="ob-count">${all.length}项</span></div>
        <div class="ob-content">
          ${visible.map(c => `<div class="ob-listitem"><span class="ob-bul" style="color:#a78bfa;">▸</span><div>${c.length>70 ? c.substring(0,70)+'...' : c}</div></div>`).join('')}
          ${hidden.map(c => `<div class="ob-listitem collapsed"><span class="ob-bul" style="color:#a78bfa;">▸</span><div>${c}</div></div>`).join('')}
        </div>
        ${needExpand ? `<div class="ob-expand" onclick="this.closest('.opp-card-new').classList.toggle('expanded')"><span>展开剩余 ${hidden.length} 项</span><span class="ob-arrow">▼</span></div>` : ''}
      </div>`;
    }

    // === 能力点 block（带展开） ===
    let capBlock = '';
    if(it.capabilityList && it.capabilityList.length) {
      const all = it.capabilityList;
      const visible = all.slice(0,2);
      const hidden = all.slice(2);
      const needExpand = all.length > 2;
      capBlock = `
      <div class="ocn-block">
        <div class="ob-label"><span class="ob-dot" style="background:#34d399;box-shadow:0 0 4px #34d399;"></span>⚡ 能力点<span class="ob-count">${all.length}项</span></div>
        <div class="ob-content">
          ${visible.map(c => `<div class="ob-listitem"><span class="ob-bul" style="color:#34d399;">▸</span><div>${c.replace(/^\d+\./,'').substring(0,60)}${c.length>60?'...':''}</div></div>`).join('')}
          ${hidden.map(c => `<div class="ob-listitem collapsed"><span class="ob-bul" style="color:#34d399;">▸</span><div>${c.replace(/^\d+\./,'')}</div></div>`).join('')}
        </div>
        ${needExpand ? `<div class="ob-expand" onclick="this.closest('.opp-card-new').classList.toggle('expanded')"><span>展开剩余 ${hidden.length} 项</span><span class="ob-arrow">▼</span></div>` : ''}
      </div>`;
    }

    // === 商机 block（带展开） ===
    let oppBlock = '';
    if(it.opportunities) {
      const opp = it.opportunities.replace(/<br>/g,' ');
      const needExpand = opp.length > 120;
      const short = needExpand ? opp.substring(0,120)+'...' : opp;
      oppBlock = `
      <div class="ocn-block full">
        <div class="ob-label"><span class="ob-dot" style="background:#fbbf24;box-shadow:0 0 4px #fbbf24;"></span>💰 商机</div>
        <div class="ob-content ob-collapsed-hint">${short}</div>
        ${needExpand ? `<div class="ob-content ob-full">${opp}</div>
          <div class="ob-expand" onclick="this.closest('.opp-card-new').classList.toggle('expanded')"><span>查看完整商机描述</span><span class="ob-arrow">▼</span></div>` : ''}
      </div>`;
    }

    // 章节数量统计
    const blockCount = [dutyBlock, concernBlock, capBlock, oppBlock].filter(x=>x).length;

    return `<div class="opp-card-new" id="${cardId}" style="--card-color:${mainColor};">
      <div class="ocn-side" style="background:linear-gradient(180deg, ${mainColor}, ${mainColor}55);"></div>
      <div class="ocn-head">
        <div style="display:flex;align-items:center;gap:6px;flex:1;">
          <span class="ocn-id">#${it.id||'-'}</span>
          <span class="ocn-title">${title}</span>
        </div>
        <span class="ocn-pri ${priClass}">${priLabel}</span>
      </div>
      <div class="ocn-body">
        ${dutyBlock}${concernBlock}${capBlock}${oppBlock}
      </div>
      <div class="ocn-footer">
        <div class="ocn-tags">${domTags}</div>
        <div class="ocn-meta">${blockCount} 项 · ${it.category||''}</div>
      </div>
    </div>`;
  },

  // 二级页面地市级 Leaflet 地图：地形+卫星图+该市边界+管网+设施
  initCityBattleLeaflet(city, items) {
    // 销毁旧地图
    if(this._battleLeaflet) { this._battleLeaflet.remove(); this._battleLeaflet = null; }
    if(this._battleFlowRAF) { cancelAnimationFrame(this._battleFlowRAF); this._battleFlowRAF = null; }
    this._battleFlowAnims = [];

    const cityFeature = this.geo.features.find(f => f.properties.name === city);
    if(!cityFeature) return;
    const cityBounds = L.geoJSON(cityFeature).getBounds();
    const center = cityBounds.getCenter();

    const map = L.map('battleLeaflet', { zoomControl:false, attributionControl:false, minZoom:6, maxZoom:16 })
      .setView([center.lat, center.lng], 9);
    map.fitBounds(cityBounds, { padding:[20,20], maxZoom:11 });

    // 地形起伏DOM阴影层
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16, className: 'terrain-tile', opacity: 0.85
    }).addTo(map);

    // 卫星图
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:18 }).addTo(map);

    // 加载该地市的区县GeoJSON并叠加
    const adcode = this.ov.cityAdcodes[city];
    if(adcode) {
      fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`)
        .then(r => r.json())
        .then(geo => {
          L.geoJSON(geo, {
            style: { color:'#38bdf8', weight:1.5, fillColor:'rgba(56,189,248,0.18)', fillOpacity:0.5, dashArray:'4 3' },
            onEachFeature: (f, layer) => {
              layer.bindTooltip(f.properties.name, { sticky:true, className:'city-label' });
              layer.on('mouseover', () => layer.setStyle({ fillColor:'rgba(56,189,248,0.4)', weight:2.5, color:'#7dd3fc' }));
              layer.on('mouseout', () => layer.setStyle({ color:'#38bdf8', weight:1.5, fillColor:'rgba(56,189,248,0.18)', fillOpacity:0.5, dashArray:'4 3' }));
            }
          }).addTo(map);
        }).catch(()=>{});
    }

    // 该市外边界（高亮）
    L.geoJSON(cityFeature, {
      style: { color:'#7dd3fc', weight:3, fillColor:'transparent', fillOpacity:0, dashArray:'8 4' }
    }).addTo(map);

    // 该市的管网和设施（按城市边界过滤）
    const ov = this.ov;
    const fc = ov.facilityConfig;
    const pipeKeys = [
      ['gasPipes','gasFacilities','#fbbf24','燃气管网', ov.pipeFlowColors.gasPipes],
      ['waterPipes','waterFacilities','#38bdf8','供水管网', ov.pipeFlowColors.waterPipes],
      ['heatPipes','heatFacilities','#f87171','供热管网', ov.pipeFlowColors.heatPipes],
    ];

    const battleLayerStates = { gasPipes:true, waterPipes:true, heatPipes:true };
    const battleLayers = {};

    const weightByLevel = { 'trunk': 6, 'source-door': 5, 'door-storage': 4.5, 'storage-pressure': 4, 'pressure-user': 3.5, 'door-pressure':4 };
    const inBounds = (coord) => {
      const ll = L.latLng(coord[1], coord[0]);
      return cityBounds.contains(ll);
    };

    pipeKeys.forEach(([pk,fk,color,label,flowColor]) => {
      const group = L.layerGroup();

      (ov[pk]||[]).forEach(p => {
        const hasPointInBounds = p.path.some(pt => inBounds(pt));
        if(!hasPointInBounds) return;
        const latlngs = this.LLPath(p.path);
        const w = weightByLevel[p.level] || 4;

        // 4层发光光带：光晕+中带+核心+流动
        L.polyline(latlngs, { color, weight:w+8, opacity:0.18, className:'pipe-flow-glow', lineCap:'round', lineJoin:'round' }).addTo(group);
        L.polyline(latlngs, { color, weight:w+2, opacity:0.55, className:'pipe-flow', lineCap:'round', lineJoin:'round' })
          .bindTooltip(`${label}: ${p.name}`, {sticky:true}).addTo(group);
        L.polyline(latlngs, { color:'#ffffff', weight:Math.max(1.5, w-2.5), opacity:0.92, className:'pipe-flow-core', lineCap:'round', lineJoin:'round' }).addTo(group);
        L.polyline(latlngs, { color:flowColor, weight:Math.max(1.2, w-3.5), opacity:0.9, className:'pipe-flow-dash', lineCap:'round', lineJoin:'round' }).addTo(group);

        const particleCount = p.level === 'trunk' ? 4 : (p.level === 'source-door' ? 3 : 2);
        for(let i = 0; i < particleCount; i++) {
          const icon = L.divIcon({
            className:'',
            html:`<div class="flow-particle" style="background:${flowColor};color:${flowColor};box-shadow:0 0 10px ${flowColor},0 0 18px ${flowColor},0 0 28px ${flowColor};"></div>`,
            iconSize:[10,10]
          });
          const marker = L.marker(latlngs[0], { icon, interactive:false, keyboard:false }).addTo(group);
          this._battleFlowAnims.push({
            marker, latlngs, progress: i/particleCount,
            speed: p.level === 'trunk' ? 0.0008 : 0.0012
          });
        }
      });

      // 设施点
      (ov[fk]||[]).forEach(f => {
        if(!inBounds(f.coord)) return;
        const cfg = fc[f.type];
        const size = cfg.size * 2.4;
        const icon = L.divIcon({
          className:'',
          html:`<div style="position:relative;">
            <div class="facility-aura" style="color:${cfg.color};"></div>
            <div class="facility-marker" style="width:${size}px;height:${size}px;background:${cfg.color};color:${cfg.color};box-shadow:0 0 12px ${cfg.color},0 0 22px ${cfg.color},0 0 32px ${cfg.color}88;">${cfg.icon}</div>
          </div>`,
          iconSize:[size, size]
        });
        L.marker(this.LL(f.coord), { icon }).bindTooltip(`${cfg.label}: ${f.name}`, { sticky:true, className:'facility-label' }).addTo(group);
      });

      battleLayers[pk] = group;
      group.addTo(map);
    });

    // 商机点标记
    const oppMarkers = L.layerGroup();
    const cityCenter = this.ov.cityCenters[city] || [center.lng, center.lat];
    items.forEach((it, i) => {
      // 在该市中心附近随机偏移展示商机点
      const offset = Math.sin(i*1.7) * 0.08;
      const lng = cityCenter[0] + offset * 1.4;
      const lat = cityCenter[1] + Math.cos(i*1.3) * 0.06;
      const isHigh = (it.priority||'').includes('★★★★★');
      const color = isHigh ? '#fde047' : '#a78bfa';
      const icon = L.divIcon({
        className:'',
        html:`<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 10px ${color},0 0 18px ${color};animation:pulse 2s ease-in-out infinite;"></div>`,
        iconSize:[14,14]
      });
      L.marker([lat, lng], { icon }).bindTooltip(
        `<b style="color:#7dd3fc">${(it.target||'').split('<br>')[0].substring(0,30)}</b><br/>${it.priority||''}`,
        { sticky:true, className:'facility-label' }
      ).addTo(oppMarkers);
    });
    oppMarkers.addTo(map);

    // 控件
    const controls = [
      { key:'gasPipes', label:'🔥 燃气管网', on:true },
      { key:'waterPipes', label:'💧 供水管网', on:true },
      { key:'heatPipes', label:'🌡️ 供热管网', on:true },
    ];
    document.getElementById('battleMapControls').innerHTML = controls.map(c =>
      `<div class="map-layer-toggle ${c.on?'on':''}" id="btoggle_${c.key}" onclick="app.toggleBattleLayer('${c.key}')">${c.label}</div>`
    ).join('');

    // 图例（只保留设施类型）
    document.getElementById('battleMapLegend').innerHTML = `
      <div class="leg-title">⚡ 设施类型</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.source.color};box-shadow:0 0 6px ${fc.source.color};"></div> ${fc.source.label}</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.door.color};box-shadow:0 0 6px ${fc.door.color};"></div> ${fc.door.label}</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.storage.color};box-shadow:0 0 6px ${fc.storage.color};"></div> ${fc.storage.label}</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.pressure.color};box-shadow:0 0 6px ${fc.pressure.color};"></div> ${fc.pressure.label}</div>
      <div class="leg-item"><div class="leg-circle" style="background:${fc.user.color};box-shadow:0 0 6px ${fc.user.color};"></div> ${fc.user.label}</div>
    `;

    this._battleLeaflet = map;
    this._battleLayers = battleLayers;
    this._battleLayerStates = battleLayerStates;

    // 启动流动粒子动画
    const step = () => {
      this._battleFlowAnims.forEach(fa => {
        fa.progress += fa.speed;
        if(fa.progress > 1) fa.progress -= 1;
        fa.marker.setLatLng(this.pointAlongPath(fa.latlngs, fa.progress));
      });
      this._battleFlowRAF = requestAnimationFrame(step);
    };
    this._battleFlowRAF = requestAnimationFrame(step);

    // resize 时刷新
    setTimeout(() => map.invalidateSize(), 100);
  },

  toggleBattleLayer(key) {
    if(!this._battleLayers || !this._battleLayers[key]) return;
    const layer = this._battleLayers[key];
    if(this._battleLayerStates[key]) {
      this._battleLeaflet.removeLayer(layer);
      this._battleLayerStates[key] = false;
      document.getElementById('btoggle_'+key)?.classList.remove('on');
    } else {
      layer.addTo(this._battleLeaflet);
      this._battleLayerStates[key] = true;
      document.getElementById('btoggle_'+key)?.classList.add('on');
    }
  },

  selectBattleDomain(key) {
    this.state.battleDomain = key;
    this.renderBattle();
  },

  renderConcernMatrix(items) {
    const allConcerns = [];
    items.forEach(it => {
      (it.concernList || []).forEach(c => {
        if(c && !c.startsWith('注')) {
          allConcerns.push({ text: c, priority: it.priority || '' });
        }
      });
    });
    if(!allConcerns.length) return '<div class="empty-state">暂无客户关注点数据</div>';
    return allConcerns.slice(0, 14).map((c, i) => {
      const isHigh = c.priority.includes('★★★★★');
      const priColor = isHigh ? '#fbbf24' : 'rgba(56,189,248,0.5)';
      return `<div class="concern-item">
        <div class="concern-priority" style="background:${priColor}22;color:${priColor};border:1px solid ${priColor}55;">${isHigh?'★':(i+1)}</div>
        <div class="concern-text">
          <div class="ct-title">${c.text.length > 90 ? c.text.substring(0,90)+'...' : c.text}</div>
          ${isHigh?'<div class="ct-tag" style="color:#fbbf24;">⭐ 五星级商机</div>':''}
        </div>
      </div>`;
    }).join('');
  },

  initDomainChart(items) {
    const chart = echarts.init(document.getElementById('domainChart'));
    const counts = this.getDomainCounts(items);
    chart.setOption({
      backgroundColor:'transparent',
      tooltip: { trigger:'item', backgroundColor:'rgba(22,44,74,0.95)', borderColor:'#38bdf8', textStyle:{color:'#dbeafe',fontSize:11},
        formatter: p => `<b style="color:${p.color}">${p.name}</b><br/>商机数: <b>${p.value}</b>项` },
      legend: { bottom:2, textStyle:{color:'#94a3b8',fontSize:9}, itemWidth:8, itemHeight:8, itemGap:6 },
      series: [{
        type:'pie', radius:['55%','78%'], center:['50%','48%'],
        avoidLabelOverlap: true,
        label: { show:false },
        labelLine: { show:false },
        itemStyle: { borderColor:'#0a1a2f', borderWidth:3 },
        emphasis: { scaleSize: 8, label:{ show:true, position:'center', color:'#fff', fontSize:11, fontWeight:600, formatter:'{b}\n{c}项' } },
        data: DOMAINS.map(d => ({ name:d.short, value:counts[d.key], itemStyle:{color:d.color} }))
      }]
    });
    this._battleChart = chart;
  },

  initBattleMap(items, isProvince, city) {
    const chart = echarts.init(document.getElementById('battleMap'));
    echarts.registerMap('liaoning_mini', this.geo);
    const cityData = {};
    items.filter(d => d.level==='municipal').forEach(d => {
      if(d.city) cityData[d.city] = (cityData[d.city]||0) + 1;
    });
    const allCities = this.geo.features.map(f => f.properties.name);
    const seriesData = allCities.map(name => ({ name, value: cityData[name] || 0 }));
    const selDomain = this.state.battleDomain;
    const domInfo = selDomain ? DOMAINS.find(d=>d.key===selDomain) : null;
    const colorRange = domInfo
      ? ['rgba(15,31,55,0.5)', domInfo.color+'22', domInfo.color+'55', domInfo.color+'88']
      : ['rgba(15,31,55,0.5)', '#38bdf822', '#38bdf844', '#38bdf888'];
    chart.setOption({
      backgroundColor:'transparent',
      visualMap: { show:false, min:0, max:3, inRange:{ color: colorRange } },
      tooltip: { trigger:'item', backgroundColor:'rgba(22,44,74,0.95)', borderColor:'#38bdf8', textStyle:{color:'#dbeafe',fontSize:10},
        formatter: p => { const c = cityData[p.name]||0; return `<b style="color:#7dd3fc">${p.name}</b><br/>机会点: ${c}项`; } },
      series: [{
        type:'map', map:'liaoning_mini', roam:false, zoom:1.15,
        label: { show:true, color:'#dbeafe', fontSize:9,
          formatter: p => { const c = cityData[p.name]||0; return c>0?`${p.name}\n${c}`:p.name; } },
        itemStyle: { borderColor:'rgba(56,189,248,0.3)', borderWidth:1 },
        emphasis: { label:{color:'#fff',fontSize:10,fontWeight:600}, itemStyle:{areaColor: domInfo?domInfo.color+'44':'rgba(56,189,248,0.3)', borderColor:domInfo?domInfo.color:'#38bdf8', borderWidth:2} },
        data: seriesData
      }]
    });
    this.battleMap = chart;
  },

  renderOppCard(it) {
    const domTags = (it.domains||[]).map(k => {
      const d = DOMAINS.find(x=>x.key===k);
      return d ? `<span class="domain-tag" style="background:${d.color}22;color:${d.color};border:1px solid ${d.color}44;">${d.short}</span>` : '';
    }).join('');
    const title = it.target.split('<br>')[0].replace(/\s*职责：.*/,'').trim();
    const dutyMatch = it.target.match(/职责：(.+)/);
    const duty = dutyMatch ? dutyMatch[1] : '';
    const pri = (it.priority||'').replace('立即深耕','⭐立即深耕');
    return `<div class="opp-card">
      <div class="oc-head"><span class="oc-title">${title}</span><span class="oc-pri">${pri}</span></div>
      <div class="oc-body">
        ${duty?`<div class="oc-row"><div class="oc-label">📋 职责</div><div class="oc-val">${duty.length>70?duty.substring(0,70)+'...':duty}</div></div>`:''}
        <div class="oc-row"><div class="oc-label">🎯 关注点</div><div class="oc-val">${(it.concernList||[]).slice(0,2).map(c=>'<b>•</b> '+c.substring(0,55)).join('<br>')}</div></div>
        <div class="oc-row"><div class="oc-label">⚡ 能力点</div><div class="oc-val">${(it.capabilityList||[]).slice(0,3).map(c=>'<b>•</b> '+c.replace(/^\d+\./,'').substring(0,48)).join('<br>')}</div></div>
        <div class="oc-row"><div class="oc-label">💰 商机</div><div class="oc-val">${(it.opportunities||'').replace(/<br>/g,' ').substring(0,85)}...</div></div>
        <div class="oc-row"><div style="margin-top:4px;">${domTags}</div></div>
      </div>
    </div>`;
  }
};

  return app;
}
