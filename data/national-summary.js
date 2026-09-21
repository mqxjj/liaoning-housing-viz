/* ===================================================================
 * 全国作战地图 - 全国汇总统计
 *
 * 设计说明：
 *   - 不预存静态数值，全部由 computeNationalSummary() 在运行时遍历
 *     window.PROVINCES (config) 与 window.PROVINCE_DATA (5 省 data 文件)
 *     动态聚合，便于 data-importer.js 导入新数据后即时刷新
 *   - 全国页 index.html 需先同步加载 5 省 data 文件再加载本文件
 *   - 提供 getSummary() / getCenterSummary(centerKey) / getProvinceSummary(key)
 *     三个核心访问器，national-app.js 直接调用
 * =================================================================== */

window.NationalSummary = (function () {
  'use strict';

  // —— 内部缓存 ——
  var _cache = null;
  var _centerCache = {};
  var _provinceCache = {};

  // —— 工具：判断是否五星 ——
  function isFiveStar(priority) {
    if (!priority) return false;
    return String(priority).indexOf('★★★★★') >= 0;
  }

  // —— 工具：从 PROVINCE_DATA 取某省数据 ——
  function getProvinceData(provinceKey) {
    if (!window.PROVINCE_DATA) return [];
    var d = window.PROVINCE_DATA[provinceKey];
    return Array.isArray(d) ? d : [];
  }

  // —— 工具：按 domains 字段拆分（兼容字符串/数组） ——
  function normalizeDomains(d) {
    if (Array.isArray(d)) return d;
    if (typeof d === 'string' && d) return d.split(/[，,、\s]+/).filter(Boolean);
    return [];
  }

  // —— 工具：单省聚合 ——
  function summarizeProvince(prov) {
    var data = getProvinceData(prov.key);
    var total = data.length;
    var fiveStar = 0;
    var byDomain = { lifeline: 0, gas: 0, flood: 0, cim: 0 };
    var byLevel = { provincial: 0, municipal: 0 };

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (isFiveStar(row.priority)) fiveStar++;
      var doms = normalizeDomains(row.domains);
      for (var j = 0; j < doms.length; j++) {
        if (byDomain.hasOwnProperty(doms[j])) byDomain[doms[j]]++;
      }
      if (row.level === 'provincial') byLevel.provincial++;
      else if (row.level === 'municipal') byLevel.municipal++;
    }

    return {
      key: prov.key,
      name: prov.name,
      adcode: prov.adcode,
      center: prov.center,
      capital: prov.capital,
      enabled: !!prov.enabled,
      oppCount: total,
      fiveStarCount: fiveStar,
      byDomain: byDomain,
      byLevel: byLevel
    };
  }

  // —— 工具：单中心聚合 ——
  function summarizeCenter(c) {
    var provinces = [];
    var oppCount = 0;
    var fiveStarCount = 0;
    var enabledCount = 0;
    var byDomain = { lifeline: 0, gas: 0, flood: 0, cim: 0 };

    for (var i = 0; i < c.provinces.length; i++) {
      var pName = c.provinces[i];
      var prov = window.findProvinceByName ? window.findProvinceByName(pName) : null;
      if (!prov) {
        // 没找到元数据时仍记录占位
        provinces.push({
          key: '', name: pName, enabled: false,
          oppCount: 0, fiveStarCount: 0, byDomain: { lifeline:0,gas:0,flood:0,cim:0 }
        });
        continue;
      }
      var ps = summarizeProvince(prov);
      oppCount += ps.oppCount;
      fiveStarCount += ps.fiveStarCount;
      if (ps.enabled) enabledCount++;
      for (var k in byDomain) if (byDomain.hasOwnProperty(k)) byDomain[k] += ps.byDomain[k];
      provinces.push(ps);
    }

    return {
      key: c.key,
      name: c.name,
      fullName: c.fullName,
      color: c.color,
      colorDim: c.colorDim,
      grad: c.grad,
      capital: c.capital,
      capitalName: c.capitalName,
      provinceCount: c.provinces.length,
      enabledProvinceCount: enabledCount,
      oppCount: oppCount,
      fiveStarCount: fiveStarCount,
      byDomain: byDomain,
      provinces: provinces
    };
  }

  // —— 主聚合：全国 ——
  function computeNationalSummary() {
    var centers = (window.CENTERS || []).map(summarizeCenter);
    var provinces = [];
    var totalOpp = 0;
    var totalFive = 0;
    var enabledProvinceCount = 0;

    for (var i = 0; i < centers.length; i++) {
      var c = centers[i];
      totalOpp += c.oppCount;
      totalFive += c.fiveStarCount;
      enabledProvinceCount += c.enabledProvinceCount;
      for (var j = 0; j < c.provinces.length; j++) provinces.push(c.provinces[j]);
    }

    return {
      totalOpp: totalOpp,
      totalFive: totalFive,
      totalProvince: 31,
      enabledProvinceCount: enabledProvinceCount,
      centerCount: centers.length,
      centers: centers,
      provinces: provinces
    };
  }

  // —— 对外 API ——
  return {
    /**
     * 取全国汇总（带缓存，刷新可调 refresh()）
     */
    getSummary: function () {
      if (!_cache) _cache = computeNationalSummary();
      return _cache;
    },
    /**
     * 取某中心汇总
     */
    getCenterSummary: function (centerKey) {
      if (!_centerCache[centerKey]) {
        var c = window.findCenterByKey ? window.findCenterByKey(centerKey) : null;
        if (!c) return null;
        _centerCache[centerKey] = summarizeCenter(c);
      }
      return _centerCache[centerKey];
    },
    /**
     * 取某省汇总
     */
    getProvinceSummary: function (provinceKey) {
      if (!_provinceCache[provinceKey]) {
        var p = window.findProvinceByKey ? window.findProvinceByKey(provinceKey) : null;
        if (!p) return null;
        _provinceCache[provinceKey] = summarizeProvince(p);
      }
      return _provinceCache[provinceKey];
    },
    /**
     * 刷新缓存（数据导入后调用）
     */
    refresh: function () {
      _cache = null;
      _centerCache = {};
      _provinceCache = {};
      return this.getSummary();
    }
  };
})();
