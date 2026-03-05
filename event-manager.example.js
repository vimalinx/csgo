/**
 * 事件管理器使用示例
 * 
 * 这个文件展示如何在 CSGO 项目中使用 EventManager
 */

// 示例 1: 基本使用
import { EventManager } from './event-manager.js';

const evtMgr = new EventManager();

// 添加监听器
const id1 = evtMgr.add(window, 'resize', () => {
  console.log('Window resized');
});

// 移除单个监听器
evtMgr.remove(id1);

// 示例 2: 使用命名空间
const id2 = evtMgr.add(document, 'keydown', (e) => {
  console.log('Key pressed:', e.code);
}, {}, 'keyboard');

const id3 = evtMgr.add(document, 'keyup', (e) => {
  console.log('Key released:', e.code);
}, {}, 'keyboard');

// 清理特定命名空间
evtMgr.clear('keyboard'); // 移除 id2 和 id3

// 示例 3: 带选项的监听器
const id4 = evtMgr.add(
  window,
  'keydown',
  (e) => {
    e.preventDefault();
    console.log('Captured keydown');
  },
  { capture: true, passive: false },
  'capture'
);

// 示例 4: 在游戏清理时使用
function cleanupGame() {
  // 清理所有 window 相关的监听器
  evtMgr.clear('window');
  
  // 清理所有 document 相关的监听器
  evtMgr.clear('document');
  
  // 或者清理所有监听器
  evtMgr.clear();
}

// 示例 5: 检查监听器状态
console.log('Total listeners:', evtMgr.count());
console.log('Window listeners:', evtMgr.count('window'));
console.log('Document listeners:', evtMgr.count('document'));
console.log('Has listener id4:', evtMgr.has(id4));

// 示例 6: 完全销毁管理器
function destroyGame() {
  evtMgr.destroy(); // 清理所有监听器并重置管理器
}
