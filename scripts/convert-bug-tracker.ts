import ExcelJS from 'exceljs';

const TABLE_HEADERS = ['#', '模块', '严重度', 'Bug 描述', '复现步骤', '发现日期', '状态', '修复人', '修复确认', '二次验收'];

// All bugs in order (copied from BUG-TRACKER.md)
const BUG_ROWS = [
  ['1', 'M2养成', '🟠 严重', '地图地点行动执行后按钮变为不可点击，玩家无法再次执行同一行动', '1. 进入养成阶段，打开地图\n2. 选择任意地点\n3. 点击执行一个行动\n4. 行动完成后，该行动按钮变灰/不可点击，无法再次执行', '05/17', '待验收', 'Claude', '[x]', '[ ]'],
  ['2', 'M2养成', '🟡 一般', '在"基时公司"地点执行行动后，AI完成行动直接跳回地图界面，应返回该地点的行动列表页面', '1. 打开地图，进入"基时公司"\n2. 选择并执行一个行动（如检修）\n3. AI叙述完成后，界面直接跳转到地图总览，而非回到基时公司的行动列表', '05/17', '待验收', 'Claude', '[x]', '[ ]'],
  ['3', 'M1开场', '🟠 严重', '在新游戏创建时设置的AI名字，进入游戏后被覆盖为"小星"，玩家输入的名字没有正确保存', '1. 开始新游戏\n2. 在角色创建页面设置AI名字（如"小明"）\n3. 确认并进入游戏\n4. 查看游戏内AI名字，发现显示为"小星"而非设置的名字', '05/17', '待修复', '', '[ ]', '[ ]'],
  ['4', 'M3事件', '🟡 一般', '触发特殊事件时没有前摇动画，直接跳转到事件对话页面，应先显示"AI正在xxx中..."进度条再进入事件', '1. 在养成阶段执行某个行动（如在公司检修）\n2. 行动完成后直接弹出事件对话窗口\n3. 缺少中间的"AI正在xxx中..."进度过渡页面', '05/17', '待修复', '', '[ ]', '[ ]'],
  ['5', 'M3事件', '🟠 严重', 'AI对话结束后没有过渡提示，直接跳回原界面，应显示"结束对话"确认或过渡动画让玩家有心理准备', '1. 进入事件对话页面\n2. 与AI完成所有对话内容\n3. 对话结束后界面没有任何提示，直接跳转回上一个页面', '05/17', '待修复', '', '[ ]', '[ ]'],
  ['6', 'M2养成', '🟡 一般', '"AI正在xxx中..."进度条不实时更新，每次都要等到进度到100%才突然显示完整进度条动画', '1. 在任意地点执行行动\n2. 观察行动进度页面中的进度条\n3. 进度条不随百分比实时增长，只在最后一刻突然跳满', '05/17', '待验收', 'Claude', '[x]', '[ ]'],
  ['7', 'M2养成', '🔵 轻微', '"AI正在xxx中..."进度条持续时间过长，默认3秒过长，应调整为1-1.5秒', '1. 执行任意行动\n2. 观察行动进度页面的持续时间\n3. 当前持续约3秒，建议缩短到1-1.5秒以提升流畅感', '05/17', '待验收', 'Claude', '[x]', '[ ]'],
  ['8', 'M4经济', '🔴 致命', '【功能缺失/设计待实现】资金无限透支，缺乏预警与强制结束机制\n\n设计规格：\n① 资金首次变为负值时，弹出警告："请控制好资金，若负债超过500，您的AI将被强制收回"\n② 若玩家继续消耗资金，当负债达到-500时，触发强制结局"AI强制回收结局"\n③ 强制结局仅显示一张CG + 游戏结束提示："记得要管控好自己的资金，欢迎您下次来参与我们的志愿活动"，然后直接结束', '/ /', '待修复', '', '[ ]', '[ ]'],
  ['9', 'M3事件', '🟠 严重', '事件描述文本中AI名字硬编码为"小星"，未使用玩家设置的AI名称，应统一替换为动态AI名或通用称呼"AI伙伴"', '1. 进入养成阶段\n2. 触发任意事件\n3. 查看事件对话内容，发现AI自称为"小星"而非玩家设置的名字', '05/17', '待修复', '', '[ ]', '[ ]'],
  ['10', 'M2养成', '🟡 一般', '行动执行完成后缺少结果反馈弹窗，应在进度条结束后显示一个总结弹窗，展示本次行动的：属性变化、消耗资金、磨损值等详细信息', '1. 在任意地点执行一个行动\n2. 等待"AI正在xxx中..."进度条结束\n3. 缺少行动结果反馈，直接跳转到下一界面\n4. 玩家无法获知本次行动对属性的影响', '05/17', '待修复', '', '[ ]', '[ ]'],
  ['11', 'M2养成', '🟠 严重', '地点行动缺少属性要求提示，按照策划文档设计，部分行动（如打工/工作类）应有最低属性门槛显示在行动卡片上，但目前行动卡片上完全没有属性要求信息', '1. 进入养成阶段，打开地图\n2. 进入任意有工作类行动的地点（如公司）\n3. 查看行动列表中的工作类行动\n4. 发现行动卡片上没有显示任何属性要求/门槛信息', '05/17', '待验收', 'Claude', '[x]', '[ ]'],
  ['12', 'M2养成', '🟠 严重', '第6个月AI例行体检通知后，加载回家界面（IdlePage）时布局完全错乱，元素位置不正确', '1. 开始新游戏，正常推进至第6个月\n2. 收到AI例行体检通知\n3. 确认通知后进入主界面\n4. 发现界面排版错乱，元素堆叠位置不对', '05/17', '待修复', '', '[ ]', '[ ]'],
];

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jarvis Life';
  workbook.created = new Date();

  // === Sheet 1: Bug 列表 ===
  const worksheet = workbook.addWorksheet('Bug 列表');

  // Set column widths
  worksheet.getColumn(1).width = 5;   // #
  worksheet.getColumn(2).width = 12;  // 模块
  worksheet.getColumn(3).width = 10;  // 严重度
  worksheet.getColumn(4).width = 55;  // Bug 描述
  worksheet.getColumn(5).width = 50;  // 复现步骤
  worksheet.getColumn(6).width = 12;  // 发现日期
  worksheet.getColumn(7).width = 12;  // 状态
  worksheet.getColumn(8).width = 10;  // 修复人
  worksheet.getColumn(9).width = 12;  // 修复确认
  worksheet.getColumn(10).width = 12; // 二次验收

  // Header row
  const headerRow = worksheet.addRow(TABLE_HEADERS);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF236B91' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Data rows
  for (const row of BUG_ROWS) {
    const dataRow = worksheet.addRow(row);

    const status = row[6] || '';
    if (status === '待验收') {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF3CD' },
      };
    } else if (status === '已关闭') {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4EDDA' },
      };
    }

    // Checkbox cells -> green checkmark
    for (let i = 0; i < row.length; i++) {
      const cell = dataRow.getCell(i + 1);
      cell.alignment = { vertical: 'middle', wrapText: true };

      if (i === 8 || i === 9) {
        const value = row[i] || '';
        if (value === '[x]') {
          cell.value = '✓';
          cell.font = { color: { argb: 'FF28A745' }, bold: true, size: 14 };
          cell.alignment = { horizontal: 'center' };
        }
      }
    }
  }

  // Borders
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Freeze header
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // === Sheet 2: 已关闭归档 ===
  const archivedSheet = workbook.addWorksheet('已关闭归档');

  archivedSheet.getColumn(1).width = 8;
  archivedSheet.getColumn(2).width = 12;
  archivedSheet.getColumn(3).width = 55;
  archivedSheet.getColumn(4).width = 12;
  archivedSheet.getColumn(5).width = 12;

  const archHeader = archivedSheet.addRow(['#', '模块', 'Bug 描述', '修复人', '关闭日期']);
  archHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  archHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF28A745' },
  };
  archHeader.alignment = { horizontal: 'center', vertical: 'middle' };

  archivedSheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // === Save ===
  const fs = await import('fs');
  const tempPath = './docs/BUG-TRACKER-new.xlsx';
  await workbook.xlsx.writeFile(tempPath);

  // Replace old file if it exists and not locked
  try {
    const outputPath = './docs/BUG-TRACKER.xlsx';
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch { /* locked */ }
    }
    fs.renameSync(tempPath, outputPath);
    console.log(`✅ 已生成: ${outputPath}`);
  } catch {
    // If replace fails, just leave the new file
    console.log(`✅ 已生成: ${tempPath}`);
  }
}

generateExcel().catch(console.error);