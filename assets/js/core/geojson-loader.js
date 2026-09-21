/* ===================================================================
 * 省份 GeoJSON 加载器
 * 全国作战地图 - 4 个新省在线 fetch DataV，避免本地大文件
 *
 * 用法：
 *   loadProvinceGeoJSON(provinceKey, adcode).then(geo => {
 *     window.PROVINCE_GEOJSON = window.PROVINCE_GEOJSON || {};
 *     window.PROVINCE_GEOJSON[provinceKey] = geo;
 *     // 然后启动 provinceApp
 *   });
 *
 * DataV 行政区划 GeoJSON 接口：
 *   https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json
 * =================================================================== */

(function(global) {
  'use strict';

  /**
   * 加载省份 GeoJSON
   * @param {string} provinceKey - 省份 URL key（如 'fujian'）
   * @param {number} adcode - 民政部行政区划代码（如 350000）
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  function loadProvinceGeoJSON(provinceKey, adcode) {
    var cacheKey = 'geo_' + provinceKey;
    if (global[cacheKey]) return Promise.resolve(global[cacheKey]);

    var url = 'https://geo.datav.aliyun.com/areas_v3/bound/' + adcode + '_full.json';

    return fetch(url, { mode: 'cors', credentials: 'omit' })
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' 加载 ' + provinceKey + ' GeoJSON 失败');
        return resp.json();
      })
      .then(function(geo) {
        if (!geo || !geo.features || !geo.features.length) {
          throw new Error(provinceKey + ' GeoJSON 数据为空或格式异常');
        }
        global[cacheKey] = geo;
        global.PROVINCE_GEOJSON = global.PROVINCE_GEOJSON || {};
        global.PROVINCE_GEOJSON[provinceKey] = geo;
        return geo;
      });
  }

  /**
   * 同步检查 GeoJSON 是否已加载（用于调试）
   */
  function isGeoLoaded(provinceKey) {
    return !!(global.PROVINCE_GEOJSON && global.PROVINCE_GEOJSON[provinceKey]);
  }

  global.loadProvinceGeoJSON = loadProvinceGeoJSON;
  global.isGeoLoaded = isGeoLoaded;
})(window);
