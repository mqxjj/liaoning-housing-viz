# -*- coding: utf-8 -*-
"""
generate_province_data.py
=========================

读取 5 省 xlsx (福建 / 湖北 / 陕西 / 四川 / 吉林) 的"作战地图" sheet,
按全国作战地图实施方案的字段映射规则, 生成结构化的省页数据 JS 文件。

产物:
  provinces/data/fujian-data.js
  provinces/data/hubei-data.js
  provinces/data/shaanxi-data.js
  provinces/data/sichuan-data.js

字段映射 (xlsx 列 -> JS 字段):
  序号               -> id           (parseInt)
  领域分类           -> domains      (字符串映射 -> 数组)
  客户层级           -> level + city (省级/地市级 + 正则提取 city)
  目标客户           -> target       (\n -> <br>)
  客户主要关注点     -> concerns + concernList  (<br> 拼接 + 数组)
  行业高价值场景     -> scenes       (\n -> <br>)
  中国移动能力点     -> capabilities + capabilityList (同 concerns)
  切入话题/话术示例   -> talk         (字符串)
  政策依据           -> policy       (\n -> <br>)
  商机与历史招采     -> opportunities (\n -> <br>)
  商机优先级         -> priority     (保留 ★★★★★, \n -> 空格)

category 自动生成:
  省级   -> 政府-省级（省住建厅）
  地市级 -> 政府-地市级（首个机构名）

可重复运行: python src-data/generate_province_data.py
"""

import json
import os
import re
import sys

from openpyxl import load_workbook


# ----------------------------------------------------------------------------
# 配置
# ----------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(BASE_DIR, 'src-data')
OUT_DIR = os.path.join(BASE_DIR, 'provinces', 'data')

# (province_key, 中文名, xlsx 文件名, 作战地图 sheet 名)
PROVINCES = [
    ('fujian',  '福建', 'fujian.xlsx',  '作战地图'),
    ('hubei',   '湖北', 'hubei.xlsx',   '湖北省作战地图'),
    ('shaanxi', '陕西', 'shaanxi.xlsx', '作战地图'),
    ('sichuan', '四川', 'sichuan.xlsx', '作战地图'),
    ('jilin',   '吉林', 'jilin.xlsx',   '作战地图'),
]


# ----------------------------------------------------------------------------
# 字段转换工具
# ----------------------------------------------------------------------------
def to_text(value):
    """把单元格值转为文本, None/空 -> ''"""
    if value is None:
        return ''
    return str(value).strip()


def nl_to_br(text):
    """\n -> <br> (其他空白保留)"""
    return text.replace('\r\n', '\n').replace('\r', '\n').replace('\n', '<br>')


def nl_to_space(text):
    """\n -> 空格 (用于 priority 等保持单行的字段)"""
    return re.sub(r'\s*\n\s*', ' ', text).strip()


def split_lines(text):
    """按 \n 拆分为数组, 去掉首尾空白与空项"""
    parts = re.split(r'\r\n|\r|\n', text)
    out = []
    for p in parts:
        p = p.strip()
        if p:
            out.append(p)
    return out


def map_domains(category_text):
    """
    领域分类 -> domains 数组
    规则 (按方案文档):
      城市生命线 -> 'lifeline'
      燃气       -> 'gas'
      防汛排涝   -> 'flood'   (智慧排水/海绵城市/防涝 也归 flood)
      CIM+一张图 -> 'cim'     (地下管网数字化底座 也归 cim)
    跨多领域时拆数组, 顺序: lifeline, gas, flood, cim
    """
    text = category_text or ''
    domains = []
    if '生命线' in text:
        domains.append('lifeline')
    if '燃气' in text:
        domains.append('gas')
    if '防汛排涝' in text or '排水' in text or '防涝' in text or '海绵' in text:
        domains.append('flood')
    if 'CIM' in text.upper() or '一张图' in text or '底座' in text or '数字化底座' in text:
        domains.append('cim')
    if not domains:
        # 兜底: 综合监测归 lifeline
        domains = ['lifeline']
    return domains


def parse_level_city(level_text):
    """
    客户层级 -> (level, city)
      省级                 -> ('provincial', '')
      地市级               -> ('municipal', None)
      地市级\n（武汉市）    -> ('municipal', '武汉市')
    """
    text = to_text(level_text)
    if '省级' in text:
        return 'provincial', ''
    # 地市级
    # 尝试从括号中提取城市名 (支持全角/半角, 单层/嵌套)
    m = re.search(r'[（(]\s*([^（）()]+?)\s*[）)]', text)
    if m:
        city = m.group(1).strip()
        # 去掉可能的"市"以外描述, 但保留"市"字
        return 'municipal', city
    return 'municipal', None


def extract_first_org(target_text):
    """
    从 target 字段提取首个机构名, 用于 category 自动生成:
      1. 取第一行
      2. 去掉括号及之后内容
      3. 按 / 、 切分取第一个
      4. 按 - 切分取第一个 (去子部门)
    """
    first_line = to_text(target_text).split('\n')[0].strip()
    # 去括号及之后
    first_line = re.split(r'[（(]', first_line)[0].strip()
    # 按 / 、 切分
    first_line = re.split(r'[/、]', first_line)[0].strip()
    # 按 - 切分 (省住建厅-城市建设处 -> 省住建厅)
    first_line = first_line.split('-')[0].strip()
    return first_line


def make_category(level, target_text):
    """自动生成 category"""
    if level == 'provincial':
        return '政府-省级（省住建厅）'
    org = extract_first_org(target_text)
    if org:
        return '政府-地市级（%s）' % org
    return '政府-地市级'


# ----------------------------------------------------------------------------
# 行解析
# ----------------------------------------------------------------------------
# 列序号 (0-indexed), 与 xlsx "作战地图" sheet 的列顺序对应:
# 0:序号 1:领域分类 2:客户层级 3:目标客户 4:客户主要关注点
# 5:行业高价值场景 6:中国移动能力点 7:切入话题/话术示例
# 8:政策依据 9:商机与历史招采 10:商机优先级
COL = {
    'id':            0,
    'domains':       1,
    'level':         2,
    'target':        3,
    'concerns':      4,
    'scenes':        5,
    'capabilities':  6,
    'talk':          7,
    'policy':        8,
    'opportunities': 9,
    'priority':      10,
}
NCOLS = 11


def is_data_row(row):
    """判断是否为数据行: 第 1 列(序号)能 parseInt"""
    raw = row[COL['id']] if len(row) > COL['id'] else None
    if raw is None:
        return False
    s = str(raw).strip()
    if not s:
        return False
    try:
        int(float(s))
        return True
    except (ValueError, TypeError):
        return False


def parse_row(row):
    """把一行 xlsx 数据解析为 JS 对象 (Python dict)"""
    def cell(key):
        idx = COL[key]
        return row[idx] if len(row) > idx else None

    # id
    id_val = int(float(str(cell('id')).strip()))

    # domains
    domains = map_domains(to_text(cell('domains')))

    # level + city
    level, city = parse_level_city(cell('level'))

    # target
    target = nl_to_br(to_text(cell('target')))

    # category
    category = make_category(level, to_text(cell('target')))

    # concerns + concernList
    concerns_raw = to_text(cell('concerns'))
    concerns = nl_to_br(concerns_raw)
    concern_list = split_lines(concerns_raw)

    # scenes
    scenes = nl_to_br(to_text(cell('scenes')))

    # capabilities + capabilityList
    caps_raw = to_text(cell('capabilities'))
    capabilities = nl_to_br(caps_raw)
    capability_list = split_lines(caps_raw)

    # talk (字符串, 保持原样, 不转 <br>)
    talk = to_text(cell('talk'))

    # policy
    policy = nl_to_br(to_text(cell('policy')))

    # opportunities
    opportunities = nl_to_br(to_text(cell('opportunities')))

    # priority (保留 ★★★★★, \n -> 空格, 与辽宁数据风格一致)
    priority = nl_to_space(to_text(cell('priority')))

    # 按方案文档示例的字段顺序输出
    return {
        'id': id_val,
        'category': category,
        'domains': domains,
        'level': level,
        'city': city,
        'target': target,
        'concerns': concerns,
        'concernList': concern_list,
        'scenes': scenes,
        'capabilities': capabilities,
        'capabilityList': capability_list,
        'talk': talk,
        'policy': policy,
        'opportunities': opportunities,
        'priority': priority,
    }


# ----------------------------------------------------------------------------
# xlsx 读取
# ----------------------------------------------------------------------------
def read_battle_map(xlsx_path, sheet_name):
    """
    读取 xlsx 作战地图 sheet, 返回数据行列表。
    跳过: 章节标题行(只有第 1 列有非数字文本)、表头行、空行。
    """
    wb = load_workbook(xlsx_path, data_only=True)
    if sheet_name not in wb.sheetnames:
        raise RuntimeError(
            'Sheet "%s" 不存在于 %s, 实际 sheets: %s'
            % (sheet_name, xlsx_path, wb.sheetnames)
        )
    ws = wb[sheet_name]

    rows_out = []
    skipped = []
    for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        # 补齐到 NCOLS
        row = list(row) + [None] * (NCOLS - len(row)) if len(row) < NCOLS else list(row)
        if not any(c is not None and str(c).strip() != '' for c in row[:NCOLS]):
            skipped.append((r_idx, 'empty'))
            continue
        if not is_data_row(row):
            first = str(row[0])[:40] if row[0] is not None else ''
            skipped.append((r_idx, 'non-data: ' + first))
            continue
        rows_out.append(parse_row(row))
    return rows_out, skipped


# ----------------------------------------------------------------------------
# JS 文件输出
# ----------------------------------------------------------------------------
def render_js(province_key, province_cn, xlsx_name, sheet_name, rows):
    """
    渲染 JS 文件内容:
      // 注释
      window.PROVINCE_DATA = window.PROVINCE_DATA || {};
      window.PROVINCE_DATA['<key>'] = [ ... ];
    """
    header = (
        '// %(cn)s省机会点数据 - 由 src-data/generate_province_data.py 生成\n'
        '// 源：src-data/%(xlsx)s "%(sheet)s" sheet\n'
        '// 共 %(n)d 条数据\n'
        'window.PROVINCE_DATA = window.PROVINCE_DATA || {};\n'
        "window.PROVINCE_DATA['%(key)s'] = %(json)s;\n"
    ) % {
        'cn': province_cn,
        'xlsx': xlsx_name,
        'sheet': sheet_name,
        'n': len(rows),
        'key': province_key,
        'json': json.dumps(rows, ensure_ascii=False, indent=2),
    }
    return header


def write_js(path, content):
    # 确保目录存在
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # UTF-8 无 BOM, 末尾换行
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(content)
    # 文件大小
    return os.path.getsize(path)


# ----------------------------------------------------------------------------
# 主流程
# ----------------------------------------------------------------------------
def main():
    print('=' * 60)
    print('generate_province_data.py - 5 省数据生成')
    print('=' * 60)

    # 检查 openpyxl
    try:
        import openpyxl  # noqa: F401
    except ImportError:
        print('[install] openpyxl 未安装, 正在 pip install ...')
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'openpyxl'])

    summary = []
    for key, cn, xlsx_name, sheet_name in PROVINCES:
        xlsx_path = os.path.join(SRC_DIR, xlsx_name)
        print('\n[%s] %s%s' % (key, cn, '省'))
        print('  xlsx: %s' % xlsx_path)
        print('  sheet: "%s"' % sheet_name)
        if not os.path.exists(xlsx_path):
            print('  !! xlsx 不存在, 跳过')
            continue

        rows, skipped = read_battle_map(xlsx_path, sheet_name)
        print('  数据行: %d' % len(rows))
        print('  跳过行: %d' % len(skipped))
        for r_idx, why in skipped[:6]:
            print('    R%d -> %s' % (r_idx, why))

        out_path = os.path.join(OUT_DIR, '%s-data.js' % key)
        content = render_js(key, cn, xlsx_name, sheet_name, rows)
        size = write_js(out_path, content)
        print('  输出: %s' % out_path)
        print('  大小: %d bytes' % size)

        summary.append((key, cn, out_path, size, len(rows)))

    # 汇总
    print('\n' + '=' * 60)
    print('汇总:')
    print('%-10s %-8s %-8s %-12s' % ('省份', 'key', '行数', '大小(B)'))
    for key, cn, path, size, n in summary:
        print('%-10s %-8s %-8d %-12d' % (cn + '省', key, n, size))
    print('=' * 60)


if __name__ == '__main__':
    main()
