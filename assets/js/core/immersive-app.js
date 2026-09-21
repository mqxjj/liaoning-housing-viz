/* ===================================================================
 * 沉浸式大屏 B 版 - 主 App
 *
 * 实现：
 *   1. 全屏星空粒子 Canvas2D（自适应 hardwareConcurrency）
 *   2. 全国矢量地图发光边界（ECharts + CSS drop-shadow 呼吸）
 *   3. 中心光环 effectScatter + SVG 同心圆 stroke-dashoffset 旋转
 *   4. 3D 地形立体（perspective + rotateX/Z + 鼠标微调）
 *   5. 动态光带 series.lines 连接六中心
 *   6. 鼠标视差三层 z 轴（mousemove 偏移）
 *   7. 数据数字滚动 + HUD 装饰 + 实时时钟
 *   8. 抽屉式中心信息面板（点击展开）
 * =================================================================== */

(function () {
  'use strict';

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  function showToast(msg, dur) {
    var t = $('#imm-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, dur || 2400);
  }

  function numAnimate(el, target, dur) {
    if (!el) return;
    target = Number(target) || 0;
    dur = dur || 1800;
    var startTime = 0;
    function step(t) {
      if (!startTime) startTime = t;
      var p = Math.min(1, (t - startTime) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // 判断 prefers-reduced-motion
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 性能档位
  var cpu = navigator.hardwareConcurrency || 4;
  var PARTICLE_COUNT = reduceMotion ? 0 : (cpu >= 8 ? 1300 : (cpu >= 4 ? 800 : 500));

  var ImmersiveApp = {
    state: {
      geoLoaded: false,
      geoData: null,
      chart: null,
      selectedCenter: null,    // 当前抽屉展示中心 key
      mouseBase: { x: 0.5, y: 0.5 }
    },

    init: function () {
      this.cacheDom();
      this.startStarfield();
      this.startClock();
      this.renderCenterChips();
      this.renderDrawer();
      this.renderFooter();
      this.initMap();
      this.bindEvents();
    },

    cacheDom: function () {
      this.$starfield = $('#imm-starfield');
      this.$stageBack = $('#imm-layer-back');
      this.$stageMid  = $('#imm-layer-mid');
      this.$stageFront = $('#imm-layer-front');
      this.$mapStage = $('#imm-map-stage');
      this.$mapContainer = $('#imm-map');
      this.$haloLayer = $('#imm-halo-layer');
      this.$drawer = $('#imm-drawer');
      this.$drawerBody = $('#imm-drawer-body');
      this.$drawerToggle = $('#imm-drawer-toggle');
      this.$chips = $('#imm-center-bar');
      this.$clock = $('#imm-clock');
      this.$loading = $('#imm-loading');
    },

    // ============== 1. 星空粒子 ==============
    startStarfield: function () {
      if (!this.$starfield || PARTICLE_COUNT === 0) return;
      var canvas = this.$starfield;
      var ctx = canvas.getContext('2d');
      var self = this;
      var stars = [];
      var centerColors = (window.CENTERS || []).map(function (c) { return c.color; });
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
      }
      resize();
      window.addEventListener('resize', resize);

      // 初始化粒子
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        var isNear = Math.random() < 0.2; // 20% 近景流光
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: isNear ? (1.5 + Math.random() * 1.5) : (0.5 + Math.random() * 0.7),
          vx: (Math.random() - 0.5) * 0.15 * dpr,
          vy: (Math.random() - 0.5) * 0.15 * dpr,
          alpha: 0.3 + Math.random() * 0.7,
          phase: Math.random() * Math.PI * 2,
          isNear: isNear,
          color: isNear ? centerColors[Math.floor(Math.random() * centerColors.length)] : '#bae6fd',
          trail: isNear ? [] : null
        });
      }

      var frame = 0;
      function loop() {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          s.x += s.vx;
          s.y += s.vy;
          // 边界回绕
          if (s.x < 0) s.x = canvas.width;
          if (s.x > canvas.width) s.x = 0;
          if (s.y < 0) s.y = canvas.height;
          if (s.y > canvas.height) s.y = 0;

          // 闪烁
          var a = s.alpha * (0.4 + 0.6 * Math.sin(frame * 0.04 + s.phase));
          if (a < 0) a = 0;
          if (a > 1) a = 1;

          if (s.isNear) {
            // 拖尾
            s.trail.push({ x: s.x, y: s.y });
            if (s.trail.length > 6) s.trail.shift();
            for (var t = 0; t < s.trail.length - 1; t++) {
              ctx.strokeStyle = s.color;
              ctx.globalAlpha = a * (t / s.trail.length) * 0.5;
              ctx.lineWidth = s.r * 0.6;
              ctx.beginPath();
              ctx.moveTo(s.trail[t].x, s.trail[t].y);
              ctx.lineTo(s.trail[t+1].x, s.trail[t+1].y);
              ctx.stroke();
            }
            ctx.globalAlpha = a;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            // 光晕
            ctx.globalAlpha = a * 0.3;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // 远景星点
            ctx.globalAlpha = a;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    },

    // ============== 7. 实时时钟 ==============
    startClock: function () {
      var self = this;
      function pad(n) { return n < 10 ? '0' + n : n; }
      function update() {
        var d = new Date();
        var time = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
        var date = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
                   ' · ' + ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
        if (self.$clock) {
          self.$clock.innerHTML = '<span class="time">' + time + '</span><span class="date">' + date + '</span>';
        }
      }
      update();
      setInterval(update, 1000);
    },

    // ============== 8. 左下角 6 中心徽标 ==============
    renderCenterChips: function () {
      var html = '';
      var centers = window.CENTERS || [];
      for (var i = 0; i < centers.length; i++) {
        var c = centers[i];
        html += '<div class="imm-center-chip" data-center="' + c.key + '" ' +
                  'style="--chip-c:' + c.color + '; --chip-grad:' + c.grad + ';" ' +
                  'title="' + c.fullName + '（' + c.provinces.length + ' 省）">' +
                  '<div class="cc-num">' + c.key + '</div>' +
                  '<div class="cc-name">' + c.name.replace('中心','中心') + '</div>' +
                '</div>';
      }
      this.$chips.innerHTML = html;
    },

    // ============== 抽屉 ==============
    renderDrawer: function (centerKey) {
      // 默认显示一中心
      if (!centerKey) centerKey = '1';
      var c = window.findCenterByKey ? window.findCenterByKey(centerKey) : null;
      if (!c) return;
      this.state.selectedCenter = centerKey;

      // 抽屉主题色
      this.$drawer.style.setProperty('--imm-center-c', c.color);

      // 头
      var head = '<div class="imm-drawer-head" id="imm-drawer-head">' +
                   '<span class="dt-title">' + c.fullName + ' · 中心 ' + c.key + '</span>' +
                   '<button class="dt-close" id="imm-drawer-close" title="收起">✕</button>' +
                 '</div>';
      // 体
      var summary = window.NationalSummary.getCenterSummary(centerKey);
      var body = '';
      body += '<div class="imm-dw-stats">' +
                '<div class="imm-dw-stat"><div class="lab">机会点</div><div class="val">' + summary.oppCount + '</div></div>' +
                '<div class="imm-dw-stat"><div class="lab">五星商机</div><div class="val">★ ' + summary.fiveStarCount + '</div></div>' +
                '<div class="imm-dw-stat"><div class="lab">已部署</div><div class="val">' + summary.enabledProvinceCount + ' / ' + summary.provinceCount + '</div></div>' +
                '<div class="imm-dw-stat"><div class="lab">驻地</div><div class="val small">' + c.capitalName + '</div></div>' +
                '<div class="imm-dw-stat full"><div class="lab">领域分布 · 生命线 / 燃气 / 排水 / CIM</div>' +
                  '<div class="val small">' + summary.byDomain.lifeline + ' / ' + summary.byDomain.gas + ' / ' + summary.byDomain.flood + ' / ' + summary.byDomain.cim + '</div>' +
                '</div>' +
              '</div>';

      body += '<div class="imm-dw-provinces">';
      for (var i = 0; i < summary.provinces.length; i++) {
        var p = summary.provinces[i];
        body += '<div class="imm-dw-province' + (p.enabled ? '' : ' disabled') + '" data-key="' + p.key + '" data-enabled="' + (p.enabled ? 1 : 0) + '">' +
                  '<div><div class="dw-pname">' + p.name + '</div><div class="dw-pcapital">' + (p.capital || '') + '</div></div>' +
                  '<div class="dw-right">' +
                    (p.enabled ? '<span class="dw-opp">' + p.oppCount + '</span>' : '<span style="color:var(--text-faint);font-size:10px;">待部署</span>') +
                    '<span class="dw-arrow">›</span>' +
                  '</div>' +
                '</div>';
      }
      body += '</div>';

      this.$drawer.innerHTML = head + '<div class="imm-drawer-body" id="imm-drawer-body">' + body + '</div>';
      // 重新绑定 toggle
      this._bindDrawerToggle();
      // 中心徽标 active
      $$('.imm-center-chip').forEach(function (chip) {
        chip.classList.toggle('active', chip.dataset.center === centerKey);
      });
      // 中心光环更新
      this.renderHaloLayer();
      // 地图视觉更新
      if (this.state.geoLoaded) this.renderMap();
    },

    _bindDrawerToggle: function () {
      var self = this;
      var closeBtn = $('#imm-drawer-close');
      if (closeBtn) {
        closeBtn.onclick = function () {
          self.$drawer.classList.remove('open');
          $$('.imm-center-chip').forEach(function (c) { c.classList.remove('active'); });
          self.state.selectedCenter = null;
          self.renderHaloLayer();
          if (self.state.geoLoaded) self.renderMap();
        };
      }
      // 省份点击
      var body = $('#imm-drawer-body');
      if (body) {
        body.onclick = function (e) {
          var it = e.target.closest('.imm-dw-province');
          if (!it) return;
          if (it.dataset.enabled !== '1') {
            showToast('该省敬请期待');
            return;
          }
          window.location.href = './provinces/' + it.dataset.key + '.html';
        };
      }
    },

    openDrawer: function (centerKey) {
      this.renderDrawer(centerKey);
      this.$drawer.classList.add('open');
    },

    // ============== 6. 中心光环 SVG 同心圆 ==============
    renderHaloLayer: function () {
      if (!this.$haloLayer) return;
      var html = '';
      var centers = window.CENTERS || [];
      var selKey = this.state.selectedCenter;
      for (var i = 0; i < centers.length; i++) {
        var c = centers[i];
        // 通过地图经纬度转换为像素：此处简化为地图 stage 中央偏移
        // 真实定位由 ECharts effectScatter 完成，此处 SVG 仅作装饰
      }
      this.$haloLayer.innerHTML = html;
    },

    // ============== 底部数据 ==============
    renderFooter: function () {
      var summary = window.NationalSummary.getSummary();
      numAnimate($('#imm-ff-total'), summary.totalOpp, 1800);
      numAnimate($('#imm-ff-five'), summary.totalFive, 1800);
      numAnimate($('#imm-ff-enabled'), summary.enabledProvinceCount, 1800);
      numAnimate($('#imm-ff-centers'), summary.centerCount, 1200);
    },

    // ============== 2-5. 全国地图 ==============
    initMap: function () {
      var chart = echarts.init(this.$mapContainer);
      this.state.chart = chart;
      var self = this;
      var url = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
      fetch(url).then(function (r) { return r.json(); }).then(function (geo) {
        self.state.geoData = geo;
        self.state.geoLoaded = true;
        echarts.registerMap('china_imm', geo);
        self.renderMap();
        self.renderHaloLayer();
        // 隐藏 loading
        if (self.$loading) self.$loading.classList.add('hide');
        // 自动打开一中心抽屉
        setTimeout(function () { self.openDrawer('1'); }, 400);
      }).catch(function (err) {
        if (self.$loading) self.$loading.classList.add('hide');
        self.$mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);">⚠ 全国地图加载失败</div>';
        console.error('[ImmersiveApp] GeoJSON load failed:', err);
      });
      window.addEventListener('resize', function () { chart.resize(); });
    },

    renderMap: function () {
      if (!this.state.geoLoaded) return;
      var summary = window.NationalSummary.getSummary();
      var centers = summary.centers;
      var provinces = summary.provinces;
      var self = this;
      var selKey = this.state.selectedCenter;

      // 各省数据
      var mapData = [];
      for (var i = 0; i < provinces.length; i++) {
        var p = provinces[i];
        var c = window.findCenterByProvince ? window.findCenterByProvince(p.name) : null;
        var isSel = selKey && c && c.key === selKey;
        var enabled = p.enabled;
        mapData.push({
          name: p.name,
          value: p.oppCount,
          fiveStar: p.fiveStarCount,
          enabled: enabled,
          centerKey: c ? c.key : '',
          centerColor: c ? c.color : '#38bdf8',
          itemStyle: {
            areaColor: enabled ? (isSel ? c.color : this.hexA(c.color, 0.65)) : 'rgba(40,72,116,0.40)',
            borderColor: isSel ? '#ffffff' : 'rgba(125,211,252,0.45)',
            borderWidth: isSel ? 1.6 : (enabled ? 1.0 : 0.5),
            shadowColor: enabled ? c.color : 'transparent',
            shadowBlur: isSel ? 26 : (enabled ? 14 : 0)
          },
          emphasis: {
            itemStyle: {
              areaColor: enabled ? c.color : 'rgba(56,189,248,0.35)',
              borderColor: '#ffffff',
              borderWidth: 2,
              shadowBlur: 30
            }
          }
        });
      }

      // 中心 effectScatter
      var centerScatter = [];
      for (var k = 0; k < centers.length; k++) {
        var cen = centers[k];
        var isSelC = selKey === cen.key;
        centerScatter.push({
          name: cen.fullName,
          value: [cen.capital[0], cen.capital[1], cen.oppCount],
          itemStyle: {
            color: cen.color,
            shadowBlur: isSelC ? 28 : 16,
            shadowColor: cen.color
          },
          symbolSize: isSelC ? 22 : 14,
          label: {
            show: true,
            position: 'right',
            color: cen.color,
            fontSize: 12,
            fontWeight: 700,
            formatter: '{b}',
            textShadowColor: cen.color,
            textShadowBlur: 8
          }
        });
      }

      // 光带 series.lines
      var lines = [
        { coords: [[116.40,39.90],[121.47,31.23]], color: '#fbbf24' }, // 京-沪
        { coords: [[116.40,39.90],[114.30,30.59]], color: '#fbbf24' }, // 京-汉
        { coords: [[114.30,30.59],[104.07,30.67]], color: '#34d399' }, // 汉-蓉
        { coords: [[114.30,30.59],[108.95,34.27]], color: '#34d399' }, // 汉-陕
        { coords: [[123.43,41.80],[116.40,39.90]], color: '#60a5fa' }, // 沈-京
        { coords: [[114.30,30.59],[113.27,23.13]], color: '#34d399' }, // 汉-穗
        { coords: [[108.95,34.27],[103.83,36.06]], color: '#f87171' }, // 西安-兰州
        { coords: [[104.07,30.67],[91.13,29.65]], color: '#a78bfa' }   // 成都-拉萨
      ];

      var option = {
        backgroundColor: 'transparent',
        geo: {
          map: 'china_imm',
          roam: true,
          zoom: 1.25,
          scaleLimit: { min: 0.9, max: 3.5 },
          label: { show: false },
          itemStyle: {
            areaColor: 'rgba(40,72,116,0.40)',
            borderColor: 'rgba(125,211,252,0.40)',
            borderWidth: 0.6,
            shadowColor: 'rgba(56,189,248,0.55)',
            shadowBlur: 18
          },
          emphasis: {
            label: {
              show: true,
              color: '#f8fbff',
              fontSize: 13,
              fontWeight: 700,
              textShadowColor: '#000',
              textShadowBlur: 5
            }
          }
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(17,36,61,0.95)',
          borderColor: 'rgba(56,189,248,0.55)',
          borderWidth: 1,
          padding: 12,
          textStyle: { color: '#e6f2ff', fontSize: 12 },
          formatter: function (p) {
            if (!p.data) return p.name;
            if (p.seriesType === 'effectScatter') {
              return '<div style="font-weight:700;color:' + p.data.itemStyle.color + ';font-size:14px;">' + p.name + '</div>' +
                     '<div style="margin-top:6px;font-size:11px;color:#a8bcd4;">中心驻地 · 机会点：<b style="color:#e6f2ff;">' + (p.value[2] || 0) + '</b></div>';
            }
            var d = p.data;
            var status = d.enabled ? '<span style="color:#34d399;">● 已部署</span>' : '<span style="color:#7a90ad;">○ 敬请期待</span>';
            return '<div style="font-weight:700;color:#bae6fd;font-size:14px;">' + p.name + '</div>' +
                   '<div style="margin-top:6px;font-size:11px;color:#a8bcd4;">机会点：<b style="color:#e6f2ff;font-size:13px;">' + (d.value || 0) + '</b> · 五星：<b style="color:#fbbf24;">' + (d.fiveStar || 0) + '</b></div>' +
                   '<div style="margin-top:4px;font-size:10px;">' + status + '</div>';
          }
        },
        series: [
          {
            name: '全国',
            type: 'map',
            geoIndex: 0,
            data: mapData
          },
          {
            name: '中心驻地',
            type: 'effectScatter',
            coordinateSystem: 'geo',
            rippleEffect: { period: 4, scale: 7, brushType: 'stroke' },
            symbol: 'circle',
            symbolSize: 14,
            data: centerScatter,
            zlevel: 3
          },
          {
            name: '中心光带',
            type: 'lines',
            coordinateSystem: 'geo',
            zlevel: 2,
            effect: {
              show: true,
              period: 6,
              trailLength: 0.65,
              symbol: 'arrow',
              symbolSize: 6,
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
              return { coords: l.coords, lineStyle: { color: l.color, opacity: 0.6 } };
            })
          }
        ]
      };

      this.state.chart.off('click');
      this.state.chart.on('click', function (params) {
        if (params.seriesType === 'effectScatter') {
          // 点击中心驻地 → 打开抽屉
          var name = params.name;
          var c = (window.CENTERS || []).filter(function (c) { return c.fullName === name; })[0];
          if (c) self.openDrawer(c.key);
          return;
        }
        if (params.seriesType !== 'map') return;
        var pName = params.name;
        var p = window.findProvinceByName ? window.findProvinceByName(pName) : null;
        if (!p) {
          showToast('未识别该区域：' + pName);
          return;
        }
        if (!p.enabled) {
          showToast(p.name + ' · 敬请期待');
          return;
        }
        window.location.href = './provinces/' + p.key + '.html';
      });

      this.state.chart.setOption(option, true);
    },

    // ============== 6. 鼠标视差三层 z 轴 ==============
    bindParallax: function () {
      var self = this;
      document.addEventListener('mousemove', function (e) {
        var mx = e.clientX / window.innerWidth;
        var my = e.clientY / window.innerHeight;
        self.state.mouseBase.x = mx;
        self.state.mouseBase.y = my;

        // 三层偏移
        var backX = (mx - 0.5) * 16;
        var backY = (my - 0.5) * 16;
        if (self.$stageBack) {
          self.$stageBack.style.transform = 'translate3d(' + (-backX) + 'px, ' + (-backY) + 'px, 0)';
        }

        // 地图 perspective 微调
        var rxX = (my - 0.5) * 3;
        var rxZ = (mx - 0.5) * 2;
        if (self.$mapStage) {
          self.$mapStage.style.transform = 'translate(-50%, -50%) perspective(1500px) rotateX(' + (8 + rxX) + 'deg) rotateZ(' + (-1 + rxZ) + 'deg)';
        }

        // 前景 HUD 微调
        var frontX = (mx - 0.5) * 6;
        var frontY = (my - 0.5) * 6;
        if (self.$stageFront) {
          self.$stageFront.style.transform = 'translate3d(' + frontX + 'px, ' + frontY + 'px, 0)';
        }
      });
    },

    // ============== 事件绑定 ==============
    bindEvents: function () {
      var self = this;

      // 中心徽标点击
      this.$chips.addEventListener('click', function (e) {
        var chip = e.target.closest('.imm-center-chip');
        if (!chip) return;
        var key = chip.dataset.center;
        self.openDrawer(key);
      });

      // 抽屉 toggle 按钮点击（默认 40px 边条点击展开/收起）
      this.$drawer.addEventListener('click', function (e) {
        if (e.target === this && !self.state.selectedCenter) {
          self.openDrawer('1');
        }
      });

      // 视差
      if (!reduceMotion) {
        this.bindParallax();
      }

      // 切换 A 版
      var backLink = $('#imm-back-link');
      if (backLink) {
        backLink.addEventListener('click', function (e) {
          // 直接跳转，无须 preventDefault
        });
      }
    },

    // ============== 工具：颜色加 alpha ==============
    hexA: function (hex, alpha) {
      if (!hex || hex[0] !== '#') return hex;
      var h = hex.slice(1);
      if (h.length === 3) h = h[0]+h[0] + h[1]+h[1] + h[2]+h[2];
      var r = parseInt(h.slice(0,2), 16);
      var g = parseInt(h.slice(2,4), 16);
      var b = parseInt(h.slice(4,6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    },

    // ============== 全量刷新（数据导入后调用） ==============
    refreshAll: function () {
      if (window.NationalSummary) window.NationalSummary.refresh();
      this.renderFooter();
      if (this.state.selectedCenter) {
        this.renderDrawer(this.state.selectedCenter);
      }
      if (this.state.geoLoaded) this.renderMap();
    }
  };

  window.ImmersiveApp = ImmersiveApp;
  document.addEventListener('DOMContentLoaded', function () { ImmersiveApp.init(); });
})();
