// api.profile.js - 资料 API 模块

import { db, timestamp, handleFirebaseError } from './firebase.js';
import { requireAuth } from './auth.js';
import { APP_CONFIG } from './config.js';

// 获取用户资料
export async function getProfile(uid) {
  try {
    const doc = await db.collection('profiles').doc(uid).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 更新我的资料
export async function updateMyProfile(profileData) {
  try {
    const user = await requireAuth();
    
    // 数据验证
    const validatedData = validateProfileData(profileData);
    
    // 添加更新时间
    validatedData.updatedAt = timestamp.now();
    
    // 更新到 Firestore
    await db.collection('profiles').doc(user.uid).set(validatedData, { merge: true });
    
    return validatedData;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 创建初始资料
export async function createInitialProfile(user) {
  try {
    const profileData = {
      displayName: user.displayName || '',
      nickname: '',
      bio: '',
      tags: [],
      photoURL: user.photoURL || '',
      siteBgUrl: '',
      authorBgUrl: '',
      createdAt: timestamp.now(),
      updatedAt: timestamp.now()
    };
    
    await db.collection('profiles').doc(user.uid).set(profileData);
    return profileData;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 验证资料数据
function validateProfileData(data) {
  const validated = {};
  
  // 显示名称验证
  if (data.displayName !== undefined) {
    if (typeof data.displayName !== 'string') {
      throw new Error('显示名称必须是字符串');
    }
    if (data.displayName.length > APP_CONFIG.maxDisplayNameLength) {
      throw new Error(`显示名称不能超过 ${APP_CONFIG.maxDisplayNameLength} 个字符`);
    }
    validated.displayName = data.displayName.trim();
  }
  
  // 昵称验证
  if (data.nickname !== undefined) {
    if (typeof data.nickname !== 'string') {
      throw new Error('昵称必须是字符串');
    }
    if (data.nickname.length > APP_CONFIG.maxDisplayNameLength) {
      throw new Error(`昵称不能超过 ${APP_CONFIG.maxDisplayNameLength} 个字符`);
    }
    validated.nickname = data.nickname.trim();
  }
  
  // 简介验证
  if (data.bio !== undefined) {
    if (typeof data.bio !== 'string') {
      throw new Error('简介必须是字符串');
    }
    if (data.bio.length > 500) {
      throw new Error('简介不能超过 500 个字符');
    }
    validated.bio = data.bio.trim();
  }
  
  // 标签验证
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      throw new Error('标签必须是数组');
    }
    if (data.tags.length > APP_CONFIG.maxTagCount) {
      throw new Error(`标签数量不能超过 ${APP_CONFIG.maxTagCount} 个`);
    }
    
    validated.tags = data.tags
      .map(tag => {
        if (typeof tag !== 'string') {
          throw new Error('标签必须是字符串');
        }
        const trimmed = tag.trim();
        if (trimmed.length === 0) {
          return null;
        }
        if (trimmed.length > APP_CONFIG.maxTagLength) {
          throw new Error(`标签长度不能超过 ${APP_CONFIG.maxTagLength} 个字符`);
        }
        return trimmed;
      })
      .filter(tag => tag !== null)
      .slice(0, APP_CONFIG.maxTagCount);
  }
  
  // URL 验证
  const urlFields = ['photoURL', 'siteBgUrl', 'authorBgUrl'];
  urlFields.forEach(field => {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'string') {
        throw new Error(`${field} 必须是字符串`);
      }
      const url = data[field].trim();
      if (url && !isValidURL(url)) {
        throw new Error(`${field} 必须是有效的 URL`);
      }
      validated[field] = url;
    }
  });
  
  return validated;
}

// URL 验证
function isValidURL(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// 获取或创建用户资料
export async function getOrCreateProfile(user) {
  try {
    let profile = await getProfile(user.uid);
    if (!profile) {
      profile = await createInitialProfile(user);
    }
    return profile;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 检查资料是否完整
export function isProfileComplete(profile) {
  return !!(profile?.displayName && profile?.bio);
}

// 格式化标签输入
export function formatTagsInput(input) {
  if (!input || typeof input !== 'string') return [];
  
  return input
    .split(/[,，\s]+/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, APP_CONFIG.maxTagCount);
}

// 标签数组转字符串
export function tagsToString(tags) {
  if (!Array.isArray(tags)) return '';
  return tags.join(', ');
}
