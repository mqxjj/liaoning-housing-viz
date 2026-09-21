/* ===================================================================
 * 全国总览首页 A - 主 App
 *
 * 依赖：
 *   - theme.css / home-overview.css
 *   - echarts@5.4.3
 *   - centers.config.js / provinces.config.js / domains.config.js
 *   - 5 省 data 文件（liaoning/fujian/hubei/shaanxi/sichuan-data.js）
 *   - data/national-summary.js
 *
 * 功能：
 *   - Header: 搜索框（datalist）+ 下拉菜单（6 中心 optgroup）+ 中心 Tab（6 色按钮）+ 切换 B 版链接
 *   - 左栏：六大中心卡片
 *   - 中栏：ECharts 全国矢量地图（DataV 100000_full.json），按 center 主色填充 + effectScatter 中心光环
 *   - 右栏：中心统计环形图 + 省份列表
 *   - 底部：商机汇总条（数字滚动）
 *   - 点击省份 → 跳转 provinces/{key}.html；未启用省 toast 提示
 * =================================================================== */

(function () {
  'use strict';

  // ============== 工具 ==============
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function showToast(msg, duration) {
    var t = $('#home-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, duration || 2400);
  }

  function numAnimate(el, target, duration) {
    if (!el) return;
    target = Number(target) || 0;
    duration = duration || 1200;
    var start = 0;
    var startTime = 0;
    function step(t) {
      if (!startTime) startTime = t;
      var p = Math.min(1, (t - startTime) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(start + (target - start) * eased);
      el.textContent = val;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function centerColorVar(centerKey) {
    return '--center-' + centerKey;
  }

  // ============== App 主对象 ==============
  var NationalApp = {
    state: {
      selectedCenter: null,  // 当前选中中心 key（null=全国）
      geoJsonLoaded: false,
      geoJsonData: null,
      chart: null
    },

    init: function () {
      this.cacheDom();
      this.renderHeader();
      this.renderCenterCards();
      this.initMap();
      this.bindEvents();
      this.refreshAll();
    },

    cacheDom: function () {
      this.$searchInput = $('#home-search-input');
      this.$searchList = $('#home-search-list');
      this.$select = $('#home-select');
      this.$centerTabs = $('#home-center-tabs');
      this.$centers = $('#home-centers');
      this.$mapContainer = $('#home-map');
      this.$sideHead = $('#home-side-head');
      this.$sideBody = $('#home-side-body');
      this.$footStats = $('#home-foot-stats');
      this.$tooltip = $('#home-map-tooltip');
    },

    // ============== Header ==============
    renderHeader: function () {
      this.renderSearchList();
      this.renderSelect();
      this.renderCenterTabs();
    },

    renderSearchList: function () {
      var html = '';
      var list = window.PROVINCES || [];
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var c = window.findCenterByProvince ? window.findCenterByProvince(p.name) : null;
        var color = c ? c.color : '#38bdf8';
        var status = p.enabled ? '已部署' : '敬请期待';
        html += '<div class="home-search-item' + (p.enabled ? '' : ' disabled') + '" data-key="' + p.key + '" data-enabled="' + (p.enabled ? '1' : '0') + '">' +
                  '<span>' + p.name + ' <span style="color:var(--text-faint);font-size:10px;">' + (p.capital || '') + '</span></span>' +
                  '<span class="center-tag" style="background:' + color + ';">' + status + '</span>' +
                '</div>';
      }
      this.$searchList.innerHTML = html;
    },

    renderSelect: function () {
      var html = '<option value="">▼ 选择省份</option>';
      var centers = window.CENTERS || [];
      for (var i = 0; i < centers.length; i++) {
        var c = centers[i];
        html += '<optgroup label="' + c.fullName + '">';
        for (var j = 0; j < c.provinces.length; j++) {
          var pName = c.provinces[j];
          var p = window.findProvinceByName ? window.findProvinceByName(pName) : null;
          if (!p) continue;
          html += '<option value="' + p.key + '"' + (p.enabled ? '' : ' disabled') + '>' + p.name + (p.enabled ? '' : '（敬请期待）') + '</option>';
        }
        html += '</optgroup>';
      }
      this.$select.innerHTML = html;
    },

    renderCenterTabs: function () {
      var html = '';
      var centers = window.CENTERS || [];
      // 全部 Tab
      html += '<button class="home-center-tab active" data-center="" style="--center-c:var(--cyan);">' +
                '<span class="dot"></span>全部</button>';
      for (var i = 0; i < centers.length; i++) {
        var c = centers[i];
        html += '<button class="home-center-tab" data-center="' + c.key + '" style="--center-c:' + c.color + ';">' +
                  '<span class="dot"></span>' + c.name + '</button>';
      }
      this.$centerTabs.innerHTML = html;
    },

    // ============== 左栏：六大中心卡片 ==============
    renderCenterCards: function () {
      var summary = window.NationalSummary.getSummary();
      var html = '';
      for (var i = 0; i < summary.centers.length; i++) {
        var c = summary.centers[i];
        var active = (this.state.selectedCenter === c.key) ? ' active' : '';
        html += '<div class="home-center-card' + active + '" data-center="' + c.key + '" ' +
                  'style="--c-color:' + c.color + '; --c-grad:' + c.grad + ';">' +
                  '<div class="cc-head">' +
                    '<span class="cc-name">' + c.fullName + '</span>' +
                    '<span class="cc-num"><b>' + c.enabledProvinceCount + '</b>/' + c.provinceCount + ' 省</span>' +
                  '</div>' +
                  '<div class="cc-body">' +
                    '<div class="cc-stat"><div class="lab">机会点</div><div class="val">' + c.oppCount + '</div></div>' +
                    '<div class="cc-stat"><div class="lab">五星商机</div><div class="val">' + c.fiveStarCount + '</div></div>' +
                    '<div class="cc-stat full"><div class="lab">分布 · 生命线/燃气/排水/CIM</div>' +
                      '<div class="val small">' + c.byDomain.lifeline + ' / ' + c.byDomain.gas + ' / ' + c.byDomain.flood + ' / ' + c.byDomain.cim + '</div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="cc-foot">驻地：<b>' + c.capitalName + '</b></div>' +
                '</div>';
      }
      this.$centers.innerHTML = html;
    },

    // ============== 中栏：全国矢量地图 ==============
    initMap: function () {
      var chart = echarts.init(this.$mapContainer);
      this.state.chart = chart;
      this.showLoading();
      var self = this;
      var url = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
      fetch(url).then(function (r) { return r.json(); }).then(function (geo) {
        self.state.geoJsonData = geo;
        self.state.geoJsonLoaded = true;
        echarts.registerMap('china', geo);
        self.renderMap();
      }).catch(function (err) {
        self.hideLoading();
        self.$mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:13px;">⚠ 全国地图加载失败，请检查网络</div>';
        console.error('[NationalApp] GeoJSON load failed:', err);
      });
      window.addEventListener('resize', function () { chart.resize(); });
    },

    showLoading: function () {
      var el = $('#home-map-loading');
      if (el) el.style.display = 'flex';
    },
    hideLoading: function () {
      var el = $('#home-map-loading');
      if (el) el.style.display = 'none';
    },

    renderMap: function () {
      if (!this.state.geoJsonLoaded) return;
      var summary = window.NationalSummary.getSummary();
      var provinces = summary.provinces;
      var centers = summary.centers;
      var self = this;

      // 各省数据 map
      var dataMap = {};
      for (var i = 0; i < provinces.length; i++) {
        var p = provinces[i];
        dataMap[p.name] = p;
      }

      // series.data
      var mapData = [];
      for (var name in dataMap) {
        if (!dataMap.hasOwnProperty(name)) continue;
        var d = dataMap[name];
        var c = window.findCenterByProvince ? window.findCenterByProvince(name) : null;
        mapData.push({
          name: name,
          value: d.oppCount,
          fiveStar: d.fiveStarCount,
          enabled: d.enabled,
          centerKey: c ? c.key : '',
          centerColor: c ? c.color : '#38bdf8',
          itemStyle: {
            areaColor: d.enabled ? c.color : 'rgba(40,72,116,0.45)',
            borderColor: 'rgba(125,211,252,0.45)',
            borderWidth: d.enabled ? 1.2 : 0.6,
            shadowColor: d.enabled ? c.color : 'transparent',
            shadowBlur: d.enabled ? 14 : 0
          },
          emphasis: {
            itemStyle: {
              areaColor: d.enabled ? c.color : 'rgba(56,189,248,0.35)',
              borderColor: '#7dd3fc',
              borderWidth: 1.5,
              shadowBlur: 22
            }
          }
        });
      }

      // 中心驻地 effectScatter
      var centerScatter = [];
      for (var k = 0; k < centers.length; k++) {
        var cen = centers[k];
        var isSel = (this.state.selectedCenter === cen.key);
        centerScatter.push({
          name: cen.fullName,
          value: [cen.capital[0], cen.capital[1], cen.oppCount],
          itemStyle: { color: cen.color, shadowBlur: 18, shadowColor: cen.color },
          symbolSize: isSel ? 18 : 14,
          label: {
            show: true,
            position: 'right',
            color: cen.color,
            fontSize: 11,
            fontWeight: 700,
            formatter: '{b}',
            textShadowColor: cen.color,
            textShadowBlur: 6
          }
        });
      }

      var option = {
        backgroundColor: 'transparent',
        grid: { left:0, right:0, top:0, bottom:0, containLabel:false },
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(17,36,61,0.95)',
          borderColor: 'rgba(56,189,248,0.55)',
          borderWidth: 1,
          padding: 10,
          textStyle: { color: '#e6f2ff', fontSize: 12 },
          formatter: function (p) {
            if (!p.data) return p.name;
            var d = p.data;
            if (p.seriesType === 'effectScatter') {
              return '<div style="font-weight:700;color:' + d.itemStyle.color + ';">' + p.name + '</div>' +
                     '<div style="margin-top:4px;font-size:11px;color:#a8bcd4;">机会点：<b style="color:#e6f2ff;">' + (p.value[2] || 0) + '</b></div>';
            }
            var status = d.enabled ? '<span style="color:#34d399;">● 已部署</span>' : '<span style="color:#7a90ad;">○ 敬请期待</span>';
            return '<div style="font-weight:700;color:#bae6fd;">' + p.name + '</div>' +
                   '<div style="margin-top:4px;font-size:11px;color:#a8bcd4;">机会点：<b style="color:#e6f2ff;">' + (d.value || 0) + '</b> · 五星：<b style="color:#fbbf24;">' + (d.fiveStar || 0) + '</b></div>' +
                   '<div style="margin-top:2px;font-size:10px;">' + status + '</div>';
          }
        },
        series: [
          {
            name: '全国',
            type: 'map',
            map: 'china',
            roam: true,
            scaleLimit: { min: 0.9, max: 3.5 },
            zoom: 1.18,
            label: { show: false },
            itemStyle: {
              areaColor: 'rgba(40,72,116,0.45)',
              borderColor: 'rgba(125,211,252,0.35)',
              borderWidth: 0.6
            },
            emphasis: {
              label: {
                show: true,
                color: '#f8fbff',
                fontSize: 12,
                fontWeight: 700,
                textShadowColor: '#000',
                textShadowBlur: 4
              }
            },
            data: mapData
          },
          {
            name: '中心驻地',
            type: 'effectScatter',
            coordinateSystem: 'geo',
            geoIndex: 0,
            rippleEffect: { period: 4, scale: 6, brushType: 'stroke' },
            symbol: 'circle',
            symbolSize: 14,
            data: centerScatter,
            zlevel: 2
          }
        ]
      };

      // 中心连线光带（series.lines）—— 全国总览页只画主干 6 条，B 版才画全
      var lines = [
        { coords: [[116.40,39.90],[121.47,31.23]], color: '#fbbf24' }, // 京-沪
        { coords: [[116.40,39.90],[114.30,30.59]], color: '#fbbf24' }, // 京-汉
        { coords: [[114.30,30.59],[104.07,30.67]], color: '#34d399' }, // 汉-蓉
        { coords: [[114.30,30.59],[108.95,34.27]], color: '#34d399' }, // 汉-陕
        { coords: [[123.43,41.80],[116.40,39.90]], color: '#60a5fa' }, // 沈-京
        { coords: [[114.30,30.59],[113.27,23.13]], color: '#34d399' }  // 汉-穗（虚拟：广州虽未启用，仍画视觉）
      ];
      option.series.push({
        name: '中心光带',
        type: 'lines',
        coordinateSystem: 'geo',
        geoIndex: 0,
        zlevel: 1,
        effect: {
          show: true,
          period: 6,
          trailLength: 0.6,
          symbol: 'arrow',
          symbolSize: 5,
          color: '#ffffff'
        },
        lineStyle: {
          color: '#7dd3fc',
          width: 1.2,
          opacity: 0.55,
          curveness: 0.3,
          type: 'dashed'
        },
        data: lines.map(function (l) {
          return { coords: l.coords, lineStyle: { color: l.color, opacity: 0.55 } };
        })
      });

      // 点击省份
      this.state.chart.off('click');
      this.state.chart.on('click', function (params) {
        if (params.seriesType !== 'map') return;
        var name = params.name;
        var p = window.findProvinceByName ? window.findProvinceByName(name) : null;
        if (!p) {
          showToast('未识别该区域：' + name);
          return;
        }
        if (!p.enabled) {
          showToast(p.name + ' · 敬请期待，将在后续版本部署');
          return;
        }
        window.location.href = './provinces/' + p.key + '.html';
      });

      this.state.chart.setOption(option, true);
      this.hideLoading();
    },

    // ============== 右栏：中心统计 + 省份列表 ==============
    renderSide: function () {
      var summary = window.NationalSummary.getSummary();
      var selKey = this.state.selectedCenter;
      var c = selKey ? window.NationalSummary.getCenterSummary(selKey) : null;

      // 头
      var head = '<div class="title">' + (c ? c.fullName : '全国总览') + '</div>' +
                 '<span class="badge" style="background:' + (c ? c.color : 'var(--cyan)') + ';">' +
                   (c ? c.oppCount + ' 机会点' : summary.totalOpp + ' 机会点') +
                 '</span>';
      this.$sideHead.innerHTML = head;
      this.$sideHead.style.setProperty('--center-c', c ? c.color : 'var(--cyan)');

      // 体
      var body = '';
      // 环形图 + 总览数据
      var ringColor = c ? c.color : '#38bdf8';
      var totalOpp = c ? c.oppCount : summary.totalOpp;
      var totalFive = c ? c.fiveStarCount : summary.totalFive;
      var enabledCount = c ? c.enabledProvinceCount : summary.enabledProvinceCount;
      var totalCount = c ? c.provinceCount : 31;
      var ratio = totalCount > 0 ? (enabledCount / totalCount * 100).toFixed(0) : 0;
      var ringArc = 2 * Math.PI * 36 * (ratio / 100);
      var dashArray = ringArc + ' ' + (2 * Math.PI * 36 - ringArc);

      body += '<div class="center-stat-ring" style="--center-c:' + ringColor + ';">' +
                '<div class="ring-canvas">' +
                  '<svg viewBox="0 0 84 84">' +
                    '<circle cx="42" cy="42" r="36" stroke="rgba(56,189,248,0.10)" stroke-width="4" fill="none" />' +
                    '<circle cx="42" cy="42" r="36" stroke="' + ringColor + '" stroke-width="4" fill="none" ' +
                            'stroke-dasharray="' + dashArray + '" stroke-linecap="round" ' +
                            'transform="rotate(-90 42 42)" ' +
                            'style="filter:drop-shadow(0 0 6px ' + ringColor + ');transition:stroke-dasharray 1s;" />' +
                  '</svg>' +
                  '<div class="ring-text"><div class="ring-val">' + ratio + '%</div><div class="ring-lab">部署率</div></div>' +
                '</div>' +
                '<div class="ring-info">' +
                  '<div class="ri-row"><span>总机会点</span><b>' + totalOpp + '</b></div>' +
                  '<div class="ri-row"><span>五星商机</span><b class="star">★ ' + totalFive + '</b></div>' +
                  '<div class="ri-row"><span>已部署省份</span><b>' + enabledCount + ' / ' + totalCount + '</b></div>' +
                '</div>' +
              '</div>';

      // 省份列表
      body += '<div class="province-list">';
      var list = c ? c.provinces : summary.provinces;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var pc = window.findCenterByProvince ? window.findCenterByProvince(p.name) : null;
        var pcolor = pc ? pc.color : '#38bdf8';
        body += '<div class="province-item ' + (p.enabled ? 'enabled' : 'disabled') + '" data-key="' + p.key + '" data-enabled="' + (p.enabled ? '1' : '0') + '" ' +
                  'style="--center-c:' + pcolor + ';">' +
                  '<div class="pi-left">' +
                    '<span class="pi-name">' + p.name + '</span>' +
                    '<span class="pi-capital">' + (p.capital || '') + '</span>' +
                  '</div>' +
                  '<div class="pi-right">' +
                    (p.enabled ? '<b>' + p.oppCount + '</b><span class="pi-status online">在线</span>' : '<span class="pi-status offline">待部署</span>') +
                    '<span class="pi-arrow">›</span>' +
                  '</div>' +
                '</div>';
      }
      body += '</div>';

      this.$sideBody.innerHTML = body;
      this.$sideBody.style.setProperty('--center-c', ringColor);
    },

    // ============== 底部汇总条 ==============
    renderFooter: function () {
      var summary = window.NationalSummary.getSummary();
      this.$footStats.innerHTML =
        '<div class="home-foot-stat"><div class="ff-val" id="ff-total-opp">0</div><div class="ff-lab">全国总机会点</div></div>' +
        '<div class="home-foot-stat amber"><div class="ff-val" id="ff-total-five">0</div><div class="ff-lab">五星商机</div></div>' +
        '<div class="home-foot-stat green"><div class="ff-val" id="ff-enabled">0</div><div class="ff-lab">已部署省份</div></div>' +
        '<div class="home-foot-stat"><div class="ff-val" id="ff-centers">0</div><div class="ff-lab">中心覆盖</div></div>';
      // 数字滚动
      numAnimate($('#ff-total-opp'), summary.totalOpp, 1400);
      numAnimate($('#ff-total-five'), summary.totalFive, 1400);
      numAnimate($('#ff-enabled'), summary.enabledProvinceCount, 1400);
      numAnimate($('#ff-centers'), summary.centerCount, 1000);
    },

    // ============== 事件绑定 ==============
    bindEvents: function () {
      var self = this;

      // 搜索
      this.$searchInput.addEventListener('input', function () {
        var v = this.value.trim().toLowerCase();
        if (!v) { self.$searchList.classList.remove('show'); return; }
        $$('.home-search-item').forEach(function (it) {
          var key = it.dataset.key;
          var p = window.findProvinceByKey ? window.findProvinceByKey(key) : null;
          if (!p) { it.style.display = 'none'; return; }
          var hit = false;
          for (var i = 0; i < p.aliases.length; i++) {
            if (p.aliases[i].toLowerCase().indexOf(v) === 0) { hit = true; break; }
          }
          it.style.display = hit ? '' : 'none';
        });
        self.$searchList.classList.add('show');
      });
      this.$searchInput.addEventListener('focus', function () {
        if (this.value.trim()) self.$searchList.classList.add('show');
      });
      document.addEventListener('click', function (e) {
        if (!e.target.closest('.home-search')) self.$searchList.classList.remove('show');
      });
      this.$searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var v = this.value.trim().toLowerCase();
          if (!v) return;
          var p = (window.searchProvinces ? window.searchProvinces(v) : [])[0];
          if (p) {
            if (!p.enabled) { showToast(p.name + ' · 敬请期待'); return; }
            window.location.href = './provinces/' + p.key + '.html';
          } else {
            showToast('未找到匹配的省份：' + v);
          }
        }
      });
      // 点击搜索结果项
      this.$searchList.addEventListener('click', function (e) {
        var it = e.target.closest('.home-search-item');
        if (!it) return;
        var key = it.dataset.key;
        var enabled = it.dataset.enabled === '1';
        if (!enabled) { showToast('该省敬请期待'); return; }
        window.location.href = './provinces/' + key + '.html';
      });

      // 下拉菜单
      this.$select.addEventListener('change', function () {
        var key = this.value;
        if (!key) return;
        var p = window.findProvinceByKey ? window.findProvinceByKey(key) : null;
        if (!p || !p.enabled) { showToast('该省敬请期待'); this.value = ''; return; }
        window.location.href = './provinces/' + key + '.html';
      });

      // 中心 Tab
      this.$centerTabs.addEventListener('click', function (e) {
        var btn = e.target.closest('.home-center-tab');
        if (!btn) return;
        $$('.home-center-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.state.selectedCenter = btn.dataset.center || null;
        self.renderCenterCards();
        self.renderSide();
        // 地图视觉强调：选中中心省加粗
        self.renderMap();
      });

      // 中心卡片点击
      this.$centers.addEventListener('click', function (e) {
        var card = e.target.closest('.home-center-card');
        if (!card) return;
        var key = card.dataset.center;
        // 切换 Tab 同步
        $$('.home-center-tab').forEach(function (b) {
          b.classList.toggle('active', b.dataset.center === key);
        });
        self.state.selectedCenter = key || null;
        self.renderCenterCards();
        self.renderSide();
        self.renderMap();
      });

      // 右栏省份项点击
      this.$sideBody.addEventListener('click', function (e) {
        var it = e.target.closest('.province-item');
        if (!it) return;
        var key = it.dataset.key;
        var enabled = it.dataset.enabled === '1';
        if (!enabled) { showToast('该省敬请期待'); return; }
        window.location.href = './provinces/' + key + '.html';
      });
    },

    // ============== 全量刷新（数据导入后调用） ==============
    refreshAll: function () {
      if (window.NationalSummary) window.NationalSummary.refresh();
      this.renderCenterCards();
      this.renderSide();
      this.renderFooter();
      if (this.state.geoJsonLoaded) this.renderMap();
    }
  };

  // 暴露给全局以便 data-importer 调用
  window.NationalApp = NationalApp;

  // 启动
  document.addEventListener('DOMContentLoaded', function () {
    NationalApp.init();
  });
})();
