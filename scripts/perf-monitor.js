/**
 * 浏览器端性能监测脚本
 * 在浏览器控制台中粘贴运行，或通过 Vite 注入到页面中
 *
 * 用法：在浏览器 DevTools Console 中粘贴运行
 */
(function monitorPerformance() {
  const results = {};

  // 1. Navigation Timing (页面加载性能)
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) {
    results.navigation = {
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      tcp: nav.connectEnd - nav.connectStart,
      ttfb: nav.responseStart - nav.requestStart,
      domParse: nav.domContentLoadedEventEnd - nav.domInteractive,
      domComplete: nav.domComplete,
      loadComplete: nav.loadEventEnd,
    };
  }

  // 2. Paint Timing (首次渲染)
  const fp = performance.getEntriesByType('paint').find((e) => e.name === 'first-paint');
  const fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
  results.paint = {
    firstPaint: fp?.startTime ?? null,
    firstContentfulPaint: fcp?.startTime ?? null,
  };

  // 3. Memory (JS 堆内存)
  if (performance.memory) {
    results.memory = {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(1) + ' MB',
      limitJSHeapSize: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1) + ' MB',
    };
  }

  // 4. Resource Timing (资源加载统计)
  const resources = performance.getEntriesByType('resource');
  const byType = {};
  let totalSize = 0;
  resources.forEach((r) => {
    const type = r.initiatorType || 'other';
    byType[type] = (byType[type] || 0) + 1;
    totalSize += r.transferSize || 0;
  });
  results.resources = {
    total: resources.length,
    totalTransferSize: (totalSize / 1024).toFixed(1) + ' KB',
    byType,
  };

  // 5. Long Tasks (长任务检测，阻塞主线程 >50ms)
  const longTasks = performance.getEntriesByType('longtask');
  results.longTasks = {
    count: longTasks.length,
    totalDuration: longTasks.reduce((sum, t) => sum + t.duration, 0).toFixed(1) + ' ms',
  };

  // 6. Layout Shift (CLS)
  let cls = 0;
  const layoutShifts = performance.getEntriesByType('layout-shift');
  layoutShifts.forEach((entry) => {
    if (!entry.hadRecentInput) cls += entry.value;
  });
  results.cls = cls.toFixed(4);

  // 7. DOM 节点数
  results.domNodes = document.querySelectorAll('*').length;

  // 8. React 组件数（通过 __REACT_DEVTOOLS_GLOBAL_HOOK__ 获取）
  const fiberRoots = document.querySelectorAll('[data-reactroot], #root');
  results.reactRoots = fiberRoots.length;

  // 打印报告
  console.group('%c🔍 Jarvis Life 性能监测报告', 'font-size:16px; font-weight:bold;');
  console.log('%c📡 Navigation Timing', 'font-weight:bold;');
  console.table(results.navigation);
  console.log('%c🎨 Paint Timing', 'font-weight:bold;');
  console.table(results.paint);
  if (results.memory) {
    console.log('%c💾 JS Heap Memory', 'font-weight:bold;');
    console.table(results.memory);
  }
  console.log('%c📦 Resources', 'font-weight:bold;');
  console.log(`  Total: ${results.resources.total} requests, ${results.resources.totalTransferSize}`);
  console.table(results.resources.byType);
  console.log('%c⏱️ Long Tasks (>50ms)', 'font-weight:bold;');
  console.table(results.longTasks);
  console.log('%c📐 Cumulative Layout Shift (CLS)', 'font-weight:bold;');
  console.log(`  CLS: ${results.cls}`);
  console.log('%c🌳 DOM Nodes', 'font-weight:bold;');
  console.log(`  Total: ${results.domNodes}`);
  console.groupEnd();

  // 返回原始数据供进一步分析
  return results;
})();
