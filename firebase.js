// firebase.js - Firebase 初始化模块

import { firebaseConfig } from './config.js';

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 导出 Firebase 服务
export const auth = firebase.auth();
export const db = firebase.firestore();

// 配置 Firestore 设置
db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// 启用离线持久化
db.enablePersistence().catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});

// 导出常用的 Firebase 工具
export const timestamp = firebase.firestore.Timestamp;
export const fieldValue = firebase.firestore.FieldValue;

// 错误处理工具
export function handleFirebaseError(error) {
  console.error('Firebase Error:', error);
  
  const errorMessages = {
    'auth/user-not-found': '用户不存在',
    'auth/wrong-password': '密码错误',
    'auth/email-already-in-use': '邮箱已被使用',
    'auth/weak-password': '密码强度不够',
    'auth/invalid-email': '邮箱格式无效',
    'auth/user-disabled': '用户账户已被禁用',
    'auth/too-many-requests': '请求过于频繁，请稍后再试',
    'permission-denied': '权限不足',
    'unavailable': '服务暂时不可用',
    'failed-precondition': '需要创建索引',
    'not-found': '文档不存在'
  };
  
  return errorMessages[error.code] || error.message || '操作失败';
}
