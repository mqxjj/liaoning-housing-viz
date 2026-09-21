/* ===================================================================
 * 数据导入模块 - 全国作战地图
 *
 * 依赖：
 *   - SheetJS (assets/js/vendor/sheetjs.min.js 或 CDN 备选)
 *   - provinces.config.js / national-summary.js / 省页 province-app.js
 *
 * 功能：
 *   - 模态框（拖拽区 + 文件选择 + 省份下拉 + 说明）
 *   - SheetJS XLSX.read 解析 "作战地图" sheet
 *   - mapRowsToOpportunities 字段映射
 *   - 预览前 5 行（异常高亮红框）
 *   - 确认 → app.data append（全国页）/ 替换（省页）
 *   - 即时调用 app 刷新方法 + toast 提示
 *
 * 字段映射与 src-data/generate_province_data.py 一致
 * =================================================================== */

window.DataImporter = (function () {
  'use strict';

  // ============== 配置 ==============
  var FIELD_MAP = {
    '序号': 'id',
    '领域分类': 'domains',
    '客户层级': 'level',
    '目标客户': 'target',
    '客户主要关注点': 'concerns',
    '行业高价值场景': 'scenes',
    '中国移动能力点': 'capabilities',
    '切入话术': 'talk',
    '政策依据': 'policy',
    '商机与历史招采': 'opportunities',
    '商机优先级': 'priority'
  };

  // ============== 状态 ==============
  var state = {
    modal: null,
    parsedData: null,
    selectedProvince: null
  };

  // ============== 工具 ==============
  function $(s) { return document.querySelector(s); }

  function toast(msg, type) {
    type = type || 'info';
    var t = $('#data-import-toast') || createToastEl();
    t.textContent = msg;
    t.className = 'data-import-toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }
  function createToastEl() {
    var t = document.createElement('div');
    t.id = 'data-import-toast';
    t.className = 'data-import-toast';
    document.body.appendChild(t);
    return t;
  }

  // —— 领域映射 ——
  function mapDomains(raw) {
    if (!raw) return [];
    var s = String(raw).trim();
    var arr = [];
    if (s.indexOf('城市生命线') >= 0 || s.indexOf('生命线') >= 0) arr.push('lifeline');
    if (s.indexOf('燃气') >= 0) arr.push('gas');
    if (s.indexOf('防汛') >= 0 || s.indexOf('排涝') >= 0 || s.indexOf('排水') >= 0) arr.push('flood');
    if (s.indexOf('CIM') >= 0 || s.indexOf('一张图') >= 0) arr.push('cim');
    return arr;
  }

  // —— 客户层级 + 城市 ——
  function mapLevel(raw) {
    if (!raw) return { level: 'provincial', city: '' };
    var s = String(raw).trim();
    if (s.indexOf('省级') === 0) {
      return { level: 'provincial', city: '' };
    }
    // 地市级 或 地市级(武汉市)
    var m = s.match(/地市级\s*[（(]([^）)]+)[）)]/);
    if (m) {
      return { level: 'municipal', city: m[1] };
    }
    if (s.indexOf('地市级') >= 0) {
      return { level: 'municipal', city: null };
    }
    return { level: 'provincial', city: '' };
  }

  function nl2br(s) {
    if (s == null) return '';
    return String(s).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  }

  function splitByBr(s) {
    if (!s) return [];
    var html = nl2br(s);
    return html.split(/<br\s*\/?>/i).map(function (it) { return it.trim(); }).filter(Boolean);
  }

  function autoCategory(level, target) {
    if (level === 'provincial') {
      return '政府-省级（省住建厅）';
    }
    // 地市级：取目标客户首个机构名
    var first = String(target || '').split(/[<\n，,]/)[0].replace(/-.*$/, '').trim();
    return '政府-地市级（' + first + '）';
  }

  // ============== 主流程 ==============

  /**
   * 打开导入模态框
   */
  function openModal(opts) {
    opts = opts || {};
    state.selectedProvince = opts.provinceKey || null; // 省页传入指定 key
    if (state.modal) {
      closeModal();
      return;
    }
    var overlay = document.createElement('div');
    overlay.className = 'data-import-overlay';
    overlay.innerHTML = buildModalHTML(opts);
    document.body.appendChild(overlay);
    state.modal = overlay;
    bindModalEvents(overlay, opts);
  }

  function closeModal() {
    if (state.modal) {
      state.modal.remove();
      state.modal = null;
      state.parsedData = null;
    }
  }

  function buildModalHTML(opts) {
    var provSelect = '';
    if (!opts.provinceKey) {
      // 全国页：让用户选省份
      var list = window.PROVINCES || [];
      var optgroups = '';
      var byCenter = {};
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var c = window.findCenterByProvince ? window.findCenterByProvince(p.name) : null;
        var cKey = c ? c.key : 'unknown';
        if (!byCenter[cKey]) byCenter[cKey] = { c: c, list: [] };
        byCenter[cKey].list.push(p);
      }
      Object.keys(byCenter).forEach(function (k) {
        var g = byCenter[k];
        optgroups += '<optgroup label="' + (g.c ? g.c.fullName : '未分组') + '">';
        for (var j = 0; j < g.list.length; j++) {
          var pp = g.list[j];
          optgroups += '<option value="' + pp.key + '"' + (pp.enabled ? '' : ' disabled') + '>' + pp.name + (pp.enabled ? '' : '（未部署）') + '</option>';
        }
        optgroups += '</optgroup>';
      });
      provSelect = '<div class="di-field">' +
                     '<label>导入到省份：</label>' +
                     '<select id="di-province" class="di-input">' +
                       '<option value="">▼ 选择目标省份</option>' +
                       optgroups +
                     '</select>' +
                   '</div>';
    } else {
      var p = window.findProvinceByKey ? window.findProvinceByKey(opts.provinceKey) : null;
      provSelect = '<div class="di-field">' +
                     '<label>导入到省份：</label>' +
                     '<input type="text" value="' + (p ? p.name : opts.provinceKey) + '" readonly class="di-input" />' +
                     '<input type="hidden" id="di-province" value="' + opts.provinceKey + '" />' +
                   '</div>';
    }

    return '' +
    '<div class="di-modal">' +
      '<div class="di-head">' +
        '<h3>📥 导入商机数据</h3>' +
        '<button class="di-close" id="di-close-btn" title="关闭">✕</button>' +
      '</div>' +
      '<div class="di-body">' +
        provSelect +
        '<div class="di-field">' +
          '<label>选择文件：</label>' +
          '<div class="di-dropzone" id="di-dropzone">' +
            '<div class="dz-icon">📁</div>' +
            '<div class="dz-text">点击选择或拖拽 .xlsx 文件到这里</div>' +
            '<div class="dz-hint">支持 Excel 2007+ 格式，sheet 名建议为「作战地图」或「XX省作战地图」</div>' +
            '<input type="file" id="di-file" accept=".xlsx,.xls" style="display:none" />' +
          '</div>' +
        '</div>' +
        '<div class="di-preview" id="di-preview" style="display:none;">' +
          '<div class="pv-head">解析预览（前 5 行）<span class="pv-count" id="pv-count"></span></div>' +
          '<div class="pv-table-wrap"><table class="pv-table" id="pv-table"></table></div>' +
        '</div>' +
        '<div class="di-actions">' +
          '<button class="di-btn di-btn-secondary" id="di-cancel">取消</button>' +
          '<button class="di-btn di-btn-primary" id="di-confirm" disabled>确认导入</button>' +
        '</div>' +
        '<div class="di-tip" id="di-tip"></div>' +
      '</div>' +
    '</div>';
  }

  function bindModalEvents(overlay, opts) {
    var $drop = overlay.querySelector('#di-dropzone');
    var $file = overlay.querySelector('#di-file');
    var $close = overlay.querySelector('#di-close-btn');
    var $cancel = overlay.querySelector('#di-cancel');
    var $confirm = overlay.querySelector('#di-confirm');

    $drop.addEventListener('click', function () { $file.click(); });
    $drop.addEventListener('dragover', function (e) {
      e.preventDefault(); $drop.classList.add('drag-over');
    });
    $drop.addEventListener('dragleave', function () {
      $drop.classList.remove('drag-over');
    });
    $drop.addEventListener('drop', function (e) {
      e.preventDefault();
      $drop.classList.remove('drag-over');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    $file.addEventListener('change', function () {
      if (this.files.length) handleFile(this.files[0]);
    });
    $close.addEventListener('click', closeModal);
    $cancel.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    $confirm.addEventListener('click', function () {
      applyImport(opts);
    });
  }

  function handleFile(file) {
    var $dropzone = state.modal.querySelector('#di-dropzone');
    $dropzone.querySelector('.dz-text').textContent = file.name + ' · 解析中...';
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        var wb = XLSX.read(data, { type: 'array' });
        // 找作战地图 sheet
        var sheetName = wb.SheetNames.find(function (n) { return n.indexOf('作战地图') >= 0; }) || wb.SheetNames[0];
        var sheet = wb.Sheets[sheetName];
        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        var mapped = parseRows(rows);
        state.parsedData = mapped;
        renderPreview(mapped);
      } catch (err) {
        console.error('[DataImporter] parse error:', err);
        toast('文件解析失败：' + err.message, 'error');
        $dropzone.querySelector('.dz-text').textContent = '点击选择或拖拽 .xlsx 文件到这里';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ============== 字段映射 ==============
  function parseRows(rows) {
    if (!rows || rows.length < 2) return [];
    // 找表头
    var header = rows[0];
    var colIdx = {};
    for (var c = 0; c < header.length; c++) {
      var h = String(header[c]).trim();
      // 匹配同义词
      Object.keys(FIELD_MAP).forEach(function (k) {
        if (h.indexOf(k) >= 0) colIdx[FIELD_MAP[k]] = c;
      });
    }

    var result = [];
    var autoId = 1;
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row || row.length === 0) continue;
      // 跳过分隔行
      if (String(row[0] || '').indexOf('—') === 0) continue;
      // 跳过没填字段值的
      if (!row[colIdx.target] && !row[colIdx.concerns]) continue;

      var lvl = mapLevel(row[colIdx.level]);
      var target = nl2br(row[colIdx.target]);
      var concerns = nl2br(row[colIdx.concerns]);
      var scenes = nl2br(row[colIdx.scenes]);
      var capabilities = nl2br(row[colIdx.capabilities]);
      var policy = nl2br(row[colIdx.policy]);
      var opportunities = nl2br(row[colIdx.opportunities]);
      var priority = String(row[colIdx.priority] || '');

      var item = {
        id: parseInt(row[colIdx.id]) || autoId,
        category: autoCategory(lvl.level, target),
        domains: mapDomains(row[colIdx.domains]),
        level: lvl.level,
        city: lvl.city || '',
        target: target,
        concerns: concerns,
        concernList: splitByBr(row[colIdx.concerns]),
        scenes: scenes,
        capabilities: capabilities,
        capabilityList: splitByBr(row[colIdx.capabilities]),
        talk: String(row[colIdx.talk] || ''),
        policy: policy,
        opportunities: opportunities,
        priority: priority
      };
      result.push(item);
      autoId++;
    }
    return result;
  }

  // ============== 预览 ==============
  function renderPreview(data) {
    var $preview = state.modal.querySelector('#di-preview');
    var $table = state.modal.querySelector('#pv-table');
    var $count = state.modal.querySelector('#pv-count');
    var $confirm = state.modal.querySelector('#di-confirm');
    var $tip = state.modal.querySelector('#di-tip');

    if (!data.length) {
      $preview.style.display = 'block';
      $table.innerHTML = '<tr><td style="padding:24px;text-align:center;color:var(--text-faint);">⚠ 未能从该文件解析到任何商机数据</td></tr>';
      $confirm.disabled = true;
      return;
    }

    $preview.style.display = 'block';
    $count.textContent = '（共 ' + data.length + ' 条，预览前 5 条）';

    var cols = ['ID', '领域', '层级', '目标客户', '五星', '关注点摘要'];
    var html = '<thead><tr>';
    for (var i = 0; i < cols.length; i++) html += '<th>' + cols[i] + '</th>';
    html += '</tr></thead><tbody>';

    var previewCount = Math.min(5, data.length);
    for (var j = 0; j < previewCount; j++) {
      var it = data[j];
      var isWarn = (!it.domains.length || !it.priority);
      html += '<tr class="' + (isWarn ? 'row-warn' : '') + '">';
      html += '<td>' + it.id + '</td>';
      html += '<td>' + (it.domains.length ? it.domains.join('/') : '<span class="warn">⚠ 空</span>') + '</td>';
      html += '<td>' + (it.level === 'provincial' ? '省级' : ('地市级' + (it.city ? '(' + it.city + ')' : ''))) + '</td>';
      var target = it.target.replace(/<br>/g, ' ').slice(0, 24);
      html += '<td>' + target + (it.target.length > 24 ? '...' : '') + '</td>';
      var hasFive = it.priority.indexOf('★★★★★') >= 0;
      html += '<td>' + (hasFive ? '<span class="star">★★★★★</span>' : '<span class="dim">' + (it.priority.slice(0, 5) || '-') + '</span>') + '</td>';
      var concerns = it.concerns.replace(/<br>/g, ' ').slice(0, 30);
      html += '<td>' + concerns + (it.concerns.length > 30 ? '...' : '') + '</td>';
      html += '</tr>';
    }
    html += '</tbody>';
    $table.innerHTML = html;

    $tip.innerHTML = '已解析 <b>' + data.length + '</b> 条商机数据 · 五星 <b>' + data.filter(function (d) { return d.priority.indexOf('★★★★★') >= 0; }).length + '</b> 条';
    $confirm.disabled = false;
  }

  // ============== 确认导入：写入 app 数据 ==============
  function applyImport(opts) {
    var provinceKey = (state.modal.querySelector('#di-province') || {}).value;
    if (!provinceKey) {
      toast('请先选择目标省份', 'error');
      return;
    }
    if (!state.parsedData || !state.parsedData.length) {
      toast('没有可导入的数据', 'error');
      return;
    }

    // 1. 写入 window.PROVINCE_DATA
    if (!window.PROVINCE_DATA) window.PROVINCE_DATA = {};
    // 全国页 → append 到已有数据；省页 → 替换
    if (opts.provinceKey) {
      window.PROVINCE_DATA[provinceKey] = state.parsedData;
    } else {
      var existing = window.PROVINCE_DATA[provinceKey] || [];
      window.PROVINCE_DATA[provinceKey] = existing.concat(state.parsedData);
    }

    // 2. 刷新 NationalSummary 缓存
    if (window.NationalSummary) window.NationalSummary.refresh();

    // 3. 调用当前页 app 的刷新方法
    if (opts.onApply) {
      // 调用方自定义刷新
      opts.onApply(provinceKey, state.parsedData);
    } else if (window.NationalApp) {
      window.NationalApp.refreshAll();
    } else if (window.ImmersiveApp) {
      window.ImmersiveApp.refreshAll();
    } else if (window.ProvinceApp) {
      // 省页：如果当前页是该 province，则刷新
      if (window.ProvinceApp.state && window.ProvinceApp.state.provinceKey === provinceKey) {
        window.ProvinceApp.refreshAll();
      }
    }

    toast('✓ 已导入 ' + state.parsedData.length + ' 条 ' + (window.findProvinceByKey(provinceKey) ? window.findProvinceByKey(provinceKey).name : '') + ' 商机数据', 'success');
    closeModal();
  }

  // ============== 注入按钮 ==============
  /**
   * 在指定元素旁插入"导入数据"按钮
   * @param {string} containerSelector - 按钮容器选择器
   * @param {object} opts - { provinceKey, onApply }
   */
  function injectButton(containerSelector, opts) {
    var $c = $(containerSelector);
    if (!$c) return;
    var btn = document.createElement('button');
    btn.className = 'di-trigger-btn';
    btn.innerHTML = '📥 导入数据';
    btn.addEventListener('click', function () { openModal(opts); });
    $c.appendChild(btn);
  }

  return {
    openModal: openModal,
    closeModal: closeModal,
    injectButton: injectButton,
    parseRows: parseRows
  };
})();

// ============== 注入按钮到全国页 Header ==============
document.addEventListener('DOMContentLoaded', function () {
  // A 版
  var $aHeader = document.querySelector('.home-header-right');
  if ($aHeader && !document.querySelector('.di-trigger-btn')) {
    var aBtn = document.createElement('button');
    aBtn.className = 'di-trigger-btn';
    aBtn.innerHTML = '📥 导入数据';
    aBtn.addEventListener('click', function () { window.DataImporter.openModal(); });
    $aHeader.insertBefore(aBtn, $aHeader.firstChild);
  }
  // B 版
  var $bHeader = document.querySelector('.imm-hud-right');
  if ($bHeader && !document.querySelector('.imm-hud-right .di-trigger-btn')) {
    var bBtn = document.createElement('button');
    bBtn.className = 'di-trigger-btn';
    bBtn.innerHTML = '📥 导入';
    bBtn.addEventListener('click', function () { window.DataImporter.openModal(); });
    $bHeader.insertBefore(bBtn, $bHeader.firstChild);
  }
  // 省页 header
  var $pHeader = document.querySelector('.header-right');
  if ($pHeader && window.ProvinceApp && window.ProvinceApp.state && !document.querySelector('.header-right .di-trigger-btn')) {
    var pBtn = document.createElement('button');
    pBtn.className = 'di-trigger-btn';
    pBtn.innerHTML = '📥 导入数据';
    pBtn.addEventListener('click', function () {
      window.DataImporter.openModal({
        provinceKey: window.ProvinceApp.state.provinceKey,
        onApply: function (key, data) {
          // 省页 ProvinceApp 提供 refreshAll 或类似刷新方法
          if (window.ProvinceApp.refreshAll) {
            window.ProvinceApp.refreshAll();
          } else if (window.ProvinceApp.init) {
            // 重新初始化
            window.ProvinceApp.init();
          }
        }
      });
    });
    $pHeader.appendChild(pBtn);
  }
});
