// auth.js - 认证模块

import { auth, handleFirebaseError } from './firebase.js';
import { ADMIN_UIDS } from './config.js';

// 当前用户状态
let currentUser = null;
let authStateListeners = [];

// 监听认证状态变化
auth.onAuthStateChanged((user) => {
  currentUser = user;
  authStateListeners.forEach(callback => callback(user));
});

// 订阅认证状态变化
export function onAuthChange(callback) {
  authStateListeners.push(callback);
  // 立即调用一次，传入当前用户状态
  callback(currentUser);
  
  // 返回取消订阅函数
  return () => {
    const index = authStateListeners.indexOf(callback);
    if (index > -1) {
      authStateListeners.splice(index, 1);
    }
  };
}

// 获取当前用户
export function getCurrentUser() {
  return currentUser;
}

// GitHub 登录
export async function signInWithGitHub() {
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    provider.addScope('user:email');
    
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 邮箱密码登录
export async function signInWithEmail(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 邮箱密码注册
export async function signUpWithEmail(email, password) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 发送密码重置邮件
export async function sendPasswordResetEmail(email) {
  try {
    await auth.sendPasswordResetEmail(email);
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 登出
export async function signOut() {
  try {
    await auth.signOut();
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 判断是否为管理员
export function isAdmin(user = currentUser) {
  if (!user) return false;
  return ADMIN_UIDS.includes(user.uid);
}

// 判断是否已登录
export function isAuthenticated() {
  return !!currentUser;
}

// 获取用户显示名称
export function getUserDisplayName(user = currentUser) {
  if (!user) return '';
  return user.displayName || user.email || 'Anonymous';
}

// 获取用户头像
export function getUserPhotoURL(user = currentUser) {
  if (!user) return '';
  return user.photoURL || '';
}

// 等待认证状态初始化
export function waitForAuthInit() {
  return new Promise((resolve) => {
    if (auth.currentUser !== undefined) {
      resolve(auth.currentUser);
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    }
  });
}

// 认证守卫 - 确保用户已登录
export async function requireAuth() {
  const user = await waitForAuthInit();
  if (!user) {
    throw new Error('需要登录');
  }
  return user;
}

// 管理员守卫 - 确保用户是管理员
export async function requireAdmin() {
  const user = await requireAuth();
  if (!isAdmin(user)) {
    throw new Error('需要管理员权限');
  }
  return user;
}
