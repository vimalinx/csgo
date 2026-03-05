/**
 * 事件监听器管理器
 * 用于统一管理和清理事件监听器，防止内存泄漏
 *
 * 使用方式：
 *   const evtMgr = new EventManager();
 *   evtMgr.add(target, 'click', handler);
 *   evtMgr.add(target, 'keydown', handler, { capture: true });
 *   evtMgr.clear(); // 清理所有监听器
 *   evtMgr.clear('namespace'); // 清理特定命名空间
 */

class EventManager {
  constructor() {
    // 存储所有监听器：{ id: { target, type, handler, options, namespace } }
    this.listeners = new Map();
    this.nextId = 0;
  }

  /**
   * 添加事件监听器
   * @param {EventTarget} target - 目标对象 (window, document, element等)
   * @param {string} type - 事件类型
   * @param {Function} handler - 事件处理函数
   * @param {Object} [options] - addEventListener 选项
   * @param {string} [namespace] - 命名空间，用于批量清理
   * @returns {number} 监听器ID，可用于单独移除
   */
  add(target, type, handler, options = {}, namespace = 'default') {
    const id = this.nextId++;

    // 注册监听器
    target.addEventListener(type, handler, options);

    // 存储监听器信息
    this.listeners.set(id, {
      target,
      type,
      handler,
      options,
      namespace
    });

    return id;
  }

  /**
   * 移除单个监听器
   * @param {number} id - 监听器ID
   * @returns {boolean} 是否成功移除
   */
  remove(id) {
    const listener = this.listeners.get(id);
    if (!listener) return false;

    const { target, type, handler, options } = listener;
    target.removeEventListener(type, handler, options);
    this.listeners.delete(id);

    return true;
  }

  /**
   * 清理指定命名空间的所有监听器
   * @param {string} [namespace] - 命名空间，不指定则清理所有
   * @returns {number} 清理的监听器数量
   */
  clear(namespace = null) {
    let count = 0;

    for (const [id, listener] of this.listeners.entries()) {
      if (namespace === null || listener.namespace === namespace) {
        const { target, type, handler, options } = listener;
        target.removeEventListener(type, handler, options);
        this.listeners.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取当前注册的监听器数量
   * @param {string} [namespace] - 可选，按命名空间过滤
   * @returns {number} 监听器数量
   */
  count(namespace = null) {
    if (namespace === null) {
      return this.listeners.size;
    }

    let count = 0;
    for (const listener of this.listeners.values()) {
      if (listener.namespace === namespace) count++;
    }
    return count;
  }

  /**
   * 检查监听器是否存在
   * @param {number} id - 监听器ID
   * @returns {boolean}
   */
  has(id) {
    return this.listeners.has(id);
  }

  /**
   * 销毁管理器，清理所有监听器
   */
  destroy() {
    this.clear();
    this.listeners.clear();
  }
}

// ES6 模块导出
export { EventManager };
