// render.js - 渲染工具模块

import { APP_CONFIG } from './config.js';

// DOM 查询简化
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

// HTML 转义
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 去除 HTML 标签
export function stripTags(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// 格式化日期
export function formatDate(timestamp, options = {}) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  return date.toLocaleDateString('zh-CN', { ...defaultOptions, ...options });
}

// 相对时间格式化
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < week) return `${Math.floor(diff / day)} 天前`;
  if (diff < month) return `${Math.floor(diff / week)} 周前`;
  if (diff < year) return `${Math.floor(diff / month)} 个月前`;
  return `${Math.floor(diff / year)} 年前`;
}

// 计算阅读时长
export function calculateReadingTime(content) {
  if (!content) return '1 分钟阅读';
  
  const text = stripTags(content);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(wordCount / APP_CONFIG.wordsPerMinute));
  
  return `${minutes} 分钟阅读`;
}

// 生成文章摘要
export function generateExcerpt(content, length = APP_CONFIG.previewLength) {
  if (!content) return '';
  
  const text = stripTags(content).trim();
  if (text.length <= length) return text;
  
  return text.substring(0, length) + '…';
}

// 渲染标签
export function renderTags(tags, className = 'tag') {
  if (!Array.isArray(tags) || tags.length === 0) return '';
  
  return tags
    .map(tag => `<span class="${className}">${escapeHtml(tag)}</span>`)
    .join('');
}

// 应用站点背景
export function applySiteBg(bgUrl) {
  if (!bgUrl) return;
  
  document.body.style.background = `
    linear-gradient(120deg, rgba(150,102,255,.10), rgba(109,150,255,.10)), 
    url('${bgUrl}') center/cover fixed no-repeat, 
    #0b0b12
  `;
}

// Hash 路由管理
export class HashRouter {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.init();
  }
  
  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }
  
  addRoute(pattern, handler) {
    this.routes.set(pattern, handler);
  }
  
  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    
    for (const [pattern, handler] of this.routes) {
      const match = this.matchRoute(pattern, hash);
      if (match) {
        this.currentRoute = { pattern, params: match.params };
        handler(match.params);
        return;
      }
    }
    
    // 默认路由
    if (this.routes.has('/')) {
      this.routes.get('/')({}); 
    }
  }
  
  matchRoute(pattern, path) {
    if (pattern === path) {
      return { params: {} };
    }
    
    // 支持参数路由，如 /post/:id
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) {
      return null;
    }
    
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      
      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }
    
    return { params };
  }
  
  navigate(path) {
    window.location.hash = path;
  }
}

// 显示 Toast 消息
export function showToast(message, type = 'success', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

// 显示加载状态
export function showLoading(container, message = '加载中...') {
  if (typeof container === 'string') {
    container = $(container);
  }
  
  if (container) {
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        ${message}
      </div>
    `;
  }
}

// 显示错误状态
export function showError(container, message, showRetry = false, retryCallback = null) {
  if (typeof container === 'string') {
    container = $(container);
  }
  
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>出错了</h3>
        <p>${escapeHtml(message)}</p>
        ${showRetry && retryCallback ? `<button class="btn" onclick="(${retryCallback})()">重试</button>` : ''}
      </div>
    `;
  }
}

// 显示空状态
export function showEmpty(container, title = '暂无内容', description = '') {
  if (typeof container === 'string') {
    container = $(container);
  }
  
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>${escapeHtml(title)}</h3>
        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
      </div>
    `;
  }
}

// 防抖函数
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// 节流函数
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 格式化文件大小
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 复制到剪贴板
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板');
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('已复制到剪贴板');
  }
}

// 确认对话框
export function confirm(message, onConfirm, onCancel = null) {
  const result = window.confirm(message);
  if (result && onConfirm) {
    onConfirm();
  } else if (!result && onCancel) {
    onCancel();
  }
  return result;
}

// 设置页面标题
export function setPageTitle(title, siteName = APP_CONFIG.siteName) {
  document.title = title ? `${title} - ${siteName}` : siteName;
}

// 设置页面元数据
export function setPageMeta(meta = {}) {
  const { title, description, image, url } = meta;
  
  // 基本 meta 标签
  if (title) {
    let titleTag = $('meta[property="og:title"]');
    if (!titleTag) {
      titleTag = document.createElement('meta');
      titleTag.setAttribute('property', 'og:title');
      document.head.appendChild(titleTag);
    }
    titleTag.setAttribute('content', title);
  }
  
  if (description) {
    let descTag = $('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', description);
    
    let ogDescTag = $('meta[property="og:description"]');
    if (!ogDescTag) {
      ogDescTag = document.createElement('meta');
      ogDescTag.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescTag);
    }
    ogDescTag.setAttribute('content', description);
  }
  
  if (image) {
    let imgTag = $('meta[property="og:image"]');
    if (!imgTag) {
      imgTag = document.createElement('meta');
      imgTag.setAttribute('property', 'og:image');
      document.head.appendChild(imgTag);
    }
    imgTag.setAttribute('content', image);
  }
  
  if (url) {
    let urlTag = $('meta[property="og:url"]');
    if (!urlTag) {
      urlTag = document.createElement('meta');
      urlTag.setAttribute('property', 'og:url');
      document.head.appendChild(urlTag);
    }
    urlTag.setAttribute('content', url);
  }
}

// 懒加载图片
export function lazyLoadImages(container = document) {
  const images = $$('img[data-src]', container);
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  } else {
    // 降级方案
    images.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}
