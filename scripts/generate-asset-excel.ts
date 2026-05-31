import * as XLSX from 'xlsx';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

interface AssetRow {
  '素材ID': string;
  '素材分类': string;
  '素材含义': string;
  '存放路径': string;
  '所在页面': string;
  '使用尺寸(px)': string;
  '文件是否存在': string;
  '状态': string;
  '策划描述': string;
}

const PUBLIC_ASSETS = resolve(__dirname, '../public/assets');

function fileExists(relativePath: string): boolean {
  return existsSync(join(PUBLIC_ASSETS, relativePath.replace('/assets/', '')));
}

const assets: AssetRow[] = [
  // ===== 背景图 =====
  {
    '素材ID': 'bg_title',
    '素材分类': '背景图',
    '素材含义': '游戏标题画面背景',
    '存放路径': '/assets/backgrounds/bg_title.png',
    '所在页面': 'TitlePage（标题页）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_title.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_title.png') ? '已就绪' : '缺失',
    '策划描述': '游戏主标题界面背景，需体现科幻与温情并存的游戏基调',
  },
  {
    '素材ID': 'bg_home',
    '素材分类': '背景图',
    '素材含义': '家（志愿者版/通用）',
    '存放路径': '/assets/backgrounds/bg_home.png',
    '所在页面': 'LocationPage（地点页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_home.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_home.png') ? '已就绪' : '缺失',
    '策划描述': '暖色调、生活化、有绿植，志愿者身份主场',
  },
  {
    '素材ID': 'bg_school',
    '素材分类': '背景图',
    '素材含义': '学校',
    '存放路径': '/assets/backgrounds/bg_school.png',
    '所在页面': 'LocationPage（地点页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_school.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_school.png') ? '已就绪' : '缺失',
    '策划描述': '阶梯教室、全息黑板、蓝白调，课程/助教打工场景',
  },
  {
    '素材ID': 'bg_park',
    '素材分类': '背景图',
    '素材含义': '公园',
    '存放路径': '/assets/backgrounds/bg_park.png',
    '所在页面': 'LocationPage（地点页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_park.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_park.png') ? '已就绪' : '缺失',
    '策划描述': '透明穹顶、发光树木、长椅，散步/社交场景',
  },
  {
    '素材ID': 'bg_company',
    '素材分类': '背景图',
    '素材含义': '基石公司',
    '存放路径': '/assets/backgrounds/bg_company.png',
    '所在页面': 'LocationPage（地点页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_company.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_company.png') ? '已就绪' : '缺失',
    '策划描述': '机械臂、诊断台、医疗光束，修复/维护场景',
  },
  {
    '素材ID': 'bg_government',
    '素材分类': '背景图',
    '素材含义': '政府机构',
    '存放路径': '/assets/backgrounds/bg_government.png',
    '所在页面': 'LocationPage（地点页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_government.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_government.png') ? '已就绪' : '缺失',
    '策划描述': '宏伟、旗帜、庄严的大厅，委员专属打工场景',
  },
  {
    '素材ID': 'bg_mall',
    '素材分类': '背景图',
    '素材含义': '商场',
    '存放路径': '/assets/backgrounds/bg_mall.png',
    '所在页面': 'LocationPage（地点页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_mall.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_mall.png') ? '已就绪' : '缺失',
    '策划描述': '繁华、广告屏、人群剪影，购物/导购打工场景',
  },
  {
    '素材ID': 'bg_office',
    '素材分类': '背景图',
    '素材含义': '办公楼',
    '存放路径': '/assets/backgrounds/bg_office.png',
    '所在页面': 'LocationPage（地点页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_office.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_office.png') ? '已就绪' : '缺失',
    '策划描述': '落地窗、密集的工位、夕阳，编程打工场景',
  },
  {
    '素材ID': 'bg_logistics',
    '素材分类': '背景图',
    '素材含义': '物流中心',
    '存放路径': '/assets/backgrounds/bg_logistics.png',
    '所在页面': 'LocationPage（地点页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_logistics.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_logistics.png') ? '已就绪' : '缺失',
    '策划描述': '传送带、货架、昏暗灯光，搬运打工场景',
  },
  {
    '素材ID': 'bg_map',
    '素材分类': '背景图',
    '素材含义': '地图-城市全景',
    '存放路径': '/assets/backgrounds/bg_map.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '1920×984',
    '文件是否存在': fileExists('/assets/backgrounds/bg_map.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_map.png') ? '已就绪' : '缺失',
    '策划描述': '俯瞰视角、霓虹线条、地点标记区，地图选择界面',
  },
  {
    '素材ID': 'bg_company_entrance',
    '素材分类': '背景图',
    '素材含义': '公司入口（考试阶段）',
    '存放路径': '/assets/backgrounds/bg_company_entrance.png',
    '所在页面': 'CompanyEntrancePage（公司入口页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_company_entrance.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_company_entrance.png') ? '已就绪' : '缺失',
    '策划描述': '基石公司大门，考试阶段入口场景',
  },
  {
    '素材ID': 'bg_company_testing',
    '素材分类': '背景图',
    '素材含义': '公司测试间（考试阶段）',
    '存放路径': '/assets/backgrounds/bg_company_testing.png',
    '所在页面': 'ExamIdlePage / ExamNotificationPage（考试页，待接入）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_company_testing.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_company_testing.png') ? '已就绪' : '缺失',
    '策划描述': '考试/测试场景，科技感测试间',
  },
  {
    '素材ID': 'bg_terminal',
    '素材分类': '背景图',
    '素材含义': '终局审判场景',
    '存放路径': '/assets/backgrounds/bg_terminal.png',
    '所在页面': '终局页面（待实现）',
    '使用尺寸(px)': '1920×1080',
    '文件是否存在': fileExists('/assets/backgrounds/bg_terminal.png') ? '是' : '否',
    '状态': fileExists('/assets/backgrounds/bg_terminal.png') ? '已就绪' : '缺失',
    '策划描述': '终局审判场景，AI站在巨大的天平前或审判席',
  },

  // ===== AI 肖像 =====
  {
    '素材ID': 'portrait_ai_normal',
    '素材分类': 'AI肖像',
    '素材含义': 'AI-正常表情',
    '存放路径': '/assets/portraits/portrait_ai_normal.png',
    '所在页面': 'IdlePage（主界面/首页）',
    '使用尺寸(px)': '500×790',
    '文件是否存在': fileExists('/assets/portraits/portrait_ai_normal.png') ? '是' : '否',
    '状态': fileExists('/assets/portraits/portrait_ai_normal.png') ? '已就绪' : '缺失',
    '策划描述': '中性、未来感、平静表情、站姿，主界面/对话默认',
  },
  {
    '素材ID': 'portrait_ai_happy',
    '素材分类': 'AI肖像',
    '素材含义': 'AI-开心表情',
    '存放路径': '/assets/portraits/portrait_ai_happy.png',
    '所在页面': '好感度提升/正面事件对话（待接入）',
    '使用尺寸(px)': '500×790',
    '文件是否存在': fileExists('/assets/portraits/portrait_ai_happy.png') ? '是' : '否',
    '状态': fileExists('/assets/portraits/portrait_ai_happy.png') ? '已就绪' : '缺失',
    '策划描述': '眼神柔和、嘴角上扬，好感度提升/正面事件',
  },
  {
    '素材ID': 'portrait_ai_tired',
    '素材分类': 'AI肖像',
    '素材含义': 'AI-疲惫表情',
    '存放路径': '/assets/portraits/portrait_ai_tired.png',
    '所在页面': '磨损值高/负面状态对话（待接入）',
    '使用尺寸(px)': '500×790',
    '文件是否存在': fileExists('/assets/portraits/portrait_ai_tired.png') ? '是' : '否',
    '状态': fileExists('/assets/portraits/portrait_ai_tired.png') ? '已就绪' : '缺失',
    '策划描述': '垂头、光条变红或变暗，磨损值高/负面状态',
  },
  {
    '素材ID': 'portrait_ai_confused',
    '素材分类': 'AI肖像',
    '素材含义': 'AI-困惑表情',
    '存放路径': '/assets/portraits/portrait_ai_confused.png',
    '所在页面': 'EventDialoguePage（事件对话页）',
    '使用尺寸(px)': '200×260',
    '文件是否存在': fileExists('/assets/portraits/portrait_ai_confused.png') ? '是' : '否',
    '状态': fileExists('/assets/portraits/portrait_ai_confused.png') ? '已就绪' : '缺失',
    '策划描述': '歪头、眼神迷茫，逻辑/表达不足/特定事件',
  },
  {
    '素材ID': 'portrait_ai_hurt',
    '素材分类': 'AI肖像',
    '素材含义': 'AI-受伤表情',
    '存放路径': '/assets/portraits/portrait_ai_hurt.png',
    '所在页面': '身体磨损极高/危险状态对话（待接入）',
    '使用尺寸(px)': '500×790',
    '文件是否存在': fileExists('/assets/portraits/portrait_ai_hurt.png') ? '是' : '否',
    '状态': fileExists('/assets/portraits/portrait_ai_hurt.png') ? '已就绪' : '缺失',
    '策划描述': '身体局部有裂纹或电火花，身体磨损极高/危险',
  },

  // ===== UI 图标 =====
  {
    '素材ID': 'icon_ap',
    '素材分类': 'UI图标',
    '素材含义': '行动点图标',
    '存放路径': '/assets/icons/icon_ap.png',
    '所在页面': 'TopBar（顶部状态栏）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_ap.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_ap.png') ? '已就绪' : '缺失',
    '策划描述': '时钟或能量槽符号，顶部状态栏显示行动点',
  },
  {
    '素材ID': 'icon_funds',
    '素材分类': 'UI图标',
    '素材含义': '资金图标',
    '存放路径': '/assets/icons/icon_funds.png',
    '所在页面': 'TopBar（顶部状态栏）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_funds.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_funds.png') ? '已就绪' : '缺失',
    '策划描述': '货币符号或电子芯片，顶部状态栏显示资金',
  },
  {
    '素材ID': 'icon_mental',
    '素材分类': 'UI图标',
    '素材含义': '精神磨损图标',
    '存放路径': '/assets/icons/icon_mental.png',
    '所在页面': 'TopBar（顶部状态栏）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_mental.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_mental.png') ? '已就绪' : '缺失',
    '策划描述': '脑部剪影带闪电标记，属性面板展示精神磨损',
  },
  {
    '素材ID': 'icon_physical',
    '素材分类': 'UI图标',
    '素材含义': '身体磨损图标',
    '存放路径': '/assets/icons/icon_physical.png',
    '所在页面': 'TopBar（顶部状态栏，待接入）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_physical.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_physical.png') ? '已就绪' : '缺失',
    '策划描述': '人体剪影带破损标记，属性面板展示身体磨损',
  },
  {
    '素材ID': 'icon_map',
    '素材分类': 'UI图标',
    '素材含义': '地图导航图标',
    '存放路径': '/assets/icons/icon_map.png',
    '所在页面': 'IdlePage（侧边栏）、MapPage（标题栏）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_map.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_map.png') ? '已就绪' : '缺失',
    '策划描述': '地图图标，点击进入地图选择界面',
  },
  {
    '素材ID': 'icon_diary',
    '素材分类': 'UI图标',
    '素材含义': '日记图标',
    '存放路径': '/assets/icons/icon_diary.png',
    '所在页面': 'IdlePage（侧边栏）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_diary.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_diary.png') ? '已就绪' : '缺失',
    '策划描述': '日记本图标，查看AI日记',
  },
  {
    '素材ID': 'icon_backpack',
    '素材分类': 'UI图标',
    '素材含义': '背包图标',
    '存放路径': '/assets/icons/icon_backpack.png',
    '所在页面': 'IdlePage（侧边栏）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_backpack.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_backpack.png') ? '已就绪' : '缺失',
    '策划描述': '背包图标，管理物品背包',
  },
  {
    '素材ID': 'icon_talk',
    '素材分类': 'UI图标',
    '素材含义': '对话图标',
    '存放路径': '/assets/icons/icon_talk.png',
    '所在页面': 'IdlePage（侧边栏）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_talk.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_talk.png') ? '已就绪' : '缺失',
    '策划描述': '对话气泡图标，与AI对话',
  },
  {
    '素材ID': 'icon_settings',
    '素材分类': 'UI图标',
    '素材含义': '设置图标',
    '存放路径': '/assets/icons/icon_settings.png',
    '所在页面': 'TopBar（标题栏齿轮图标）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_settings.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_settings.png') ? '已就绪' : '缺失',
    '策划描述': '齿轮图标，打开设置面板',
  },
  {
    '素材ID': 'icon_save',
    '素材分类': 'UI图标',
    '素材含义': '存档图标',
    '存放路径': '/assets/icons/icon_save.png',
    '所在页面': 'SaveModal（存档弹窗）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_save.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_save.png') ? '已就绪' : '缺失',
    '策划描述': '存档图标，保存游戏进度',
  },
  {
    '素材ID': 'icon_warn',
    '素材分类': 'UI图标',
    '素材含义': '警告图标',
    '存放路径': '/assets/icons/icon_warn.png',
    '所在页面': 'MonthStartNotification（月初通知，待接入）',
    '使用尺寸(px)': '34×34',
    '文件是否存在': fileExists('/assets/icons/icon_warn.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/icon_warn.png') ? '已就绪' : '缺失',
    '策划描述': '警告三角图标，资源不足等警告提示',
  },

  // ===== 地图节点 =====
  {
    '素材ID': 'node_home',
    '素材分类': '地图节点',
    '素材含义': '家（地图上的位置图标）',
    '存放路径': '/assets/icons/node_home.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '32×32',
    '文件是否存在': fileExists('/assets/icons/node_home.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/node_home.png') ? '已就绪' : '缺失',
    '策划描述': '家的地图节点图标，点击前往家',
  },
  {
    '素材ID': 'node_school',
    '素材分类': '地图节点',
    '素材含义': '学校（地图上的位置图标）',
    '存放路径': '/assets/icons/node_school.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '32×32',
    '文件是否存在': fileExists('/assets/icons/node_school.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/node_school.png') ? '已就绪' : '缺失',
    '策划描述': '学校的地图节点图标，点击前往学校',
  },
  {
    '素材ID': 'node_park',
    '素材分类': '地图节点',
    '素材含义': '公园（地图上的位置图标）',
    '存放路径': '/assets/icons/node_park.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '32×32',
    '文件是否存在': fileExists('/assets/icons/node_park.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/node_park.png') ? '已就绪' : '缺失',
    '策划描述': '公园的地图节点图标，点击前往公园',
  },
  {
    '素材ID': 'node_company',
    '素材分类': '地图节点',
    '素材含义': '基石公司（地图上的位置图标）',
    '存放路径': '/assets/icons/node_company.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '32×32',
    '文件是否存在': fileExists('/assets/icons/node_company.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/node_company.png') ? '已就绪' : '缺失',
    '策划描述': '基石公司的地图节点图标，点击前往公司',
  },
  {
    '素材ID': 'node_government',
    '素材分类': '地图节点',
    '素材含义': '政府机构（地图上的位置图标）',
    '存放路径': '/assets/icons/node_government.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '32×32',
    '文件是否存在': fileExists('/assets/icons/node_government.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/node_government.png') ? '已就绪' : '缺失',
    '策划描述': '政府机构的地图节点图标，点击前往政府',
  },
  {
    '素材ID': 'node_mall',
    '素材分类': '地图节点',
    '素材含义': '商场（地图上的位置图标）',
    '存放路径': '/assets/icons/node_mall.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '32×32',
    '文件是否存在': fileExists('/assets/icons/node_mall.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/node_mall.png') ? '已就绪' : '缺失',
    '策划描述': '商场的地图节点图标，点击前往商场',
  },
  {
    '素材ID': 'node_office',
    '素材分类': '地图节点',
    '素材含义': '办公楼（地图上的位置图标）',
    '存放路径': '/assets/icons/node_office.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '32×32',
    '文件是否存在': fileExists('/assets/icons/node_office.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/node_office.png') ? '已就绪' : '缺失',
    '策划描述': '办公楼的地图节点图标，点击前往办公楼',
  },
  {
    '素材ID': 'node_logistics',
    '素材分类': '地图节点',
    '素材含义': '物流中心（地图上的位置图标）',
    '存放路径': '/assets/icons/node_logistics.png',
    '所在页面': 'MapPage（地图页）',
    '使用尺寸(px)': '32×32',
    '文件是否存在': fileExists('/assets/icons/node_logistics.png') ? '是' : '否',
    '状态': fileExists('/assets/icons/node_logistics.png') ? '已就绪' : '缺失',
    '策划描述': '物流中心的地图节点图标，点击前往物流中心',
  },
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(assets);

// Set column widths
ws['!cols'] = [
  { wch: 22 },  // 素材ID
  { wch: 10 },  // 素材分类
  { wch: 22 },  // 素材含义
  { wch: 42 },  // 存放路径
  { wch: 38 },  // 所在页面
  { wch: 14 },  // 使用尺寸
  { wch: 12 },  // 文件是否存在
  { wch: 8 },   // 状态
  { wch: 45 },  // 策划描述
];

XLSX.utils.book_append_sheet(wb, ws, '美术素材清单');

// Also create a summary sheet
const summaryData = [
  { '分类': '背景图', '总数': 13, '已就绪': 10, '缺失': 3 },
  { '分类': 'AI肖像', '总数': 5, '已就绪': 0, '缺失': 5 },
  { '分类': 'UI图标', '总数': 11, '已就绪': 0, '缺失': 11 },
  { '分类': '地图节点', '总数': 8, '已就绪': 0, '缺失': 8 },
  { '分类': '合计', '总数': 37, '已就绪': 10, '缺失': 27 },
];

const ws2 = XLSX.utils.json_to_sheet(summaryData);
ws2['!cols'] = [
  { wch: 10 },
  { wch: 8 },
  { wch: 8 },
  { wch: 8 },
];
XLSX.utils.book_append_sheet(wb, ws2, '统计概览');

const outputPath = resolve(__dirname, '../docs/美术素材配置表.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`Excel generated: ${outputPath}`);
console.log(`Total assets: ${assets.length}`);
console.log(`Missing: ${assets.filter(a => a['状态'] === '缺失').length}`);
console.log(`Ready: ${assets.filter(a => a['状态'] === '已就绪').length}`);
