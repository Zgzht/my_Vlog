// api.posts.js - 文章 API 模块

import { db, timestamp, handleFirebaseError } from './firebase.js';
import { requireAdmin } from './auth.js';
import { APP_CONFIG } from './config.js';

// 获取已发布的文章列表
export async function listPublished({ limit = APP_CONFIG.postsPerPage, startAfter = null, tag = null } = {}) {
  try {
    let query = db.collection('posts')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc');
    
    if (tag) {
      query = query.where('tags', 'array-contains', tag);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 通过 ID 或 slug 获取文章
export async function getPostByIdOrSlug(key) {
  try {
    // 首先尝试通过 ID 获取
    let doc = await db.collection('posts').doc(key).get();
    
    if (!doc.exists && key.length > 20) {
      // 如果不存在且 key 不像 Firestore ID，尝试通过 slug 查询
      const snapshot = await db.collection('posts')
        .where('slug', '==', key)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        doc = snapshot.docs[0];
      }
    }
    
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    
    return null;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 获取我的文章列表
export async function listMine({ limit = APP_CONFIG.postsPerPage, startAfter = null } = {}) {
  try {
    const user = await requireAdmin();
    
    let query = db.collection('posts')
      .where('authorId', '==', user.uid)
      .orderBy('createdAt', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 创建文章
export async function createPost({ title, contentHtml, tags = [], status = 'draft', coverUrl = '', slug = '' }) {
  try {
    const user = await requireAdmin();
    
    // 验证数据
    const validatedData = validatePostData({ title, contentHtml, tags, status, coverUrl, slug });
    
    // 如果提供了 slug，检查唯一性
    if (validatedData.slug) {
      const existingPost = await getPostBySlug(validatedData.slug);
      if (existingPost) {
        throw new Error('该 URL 标识已存在，请使用其他标识');
      }
    }
    
    const postData = {
      ...validatedData,
      authorId: user.uid,
      createdAt: timestamp.now(),
      updatedAt: timestamp.now()
    };
    
    const docRef = await db.collection('posts').add(postData);
    return { id: docRef.id, ...postData };
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 更新文章
export async function updatePost(id, patch) {
  try {
    const user = await requireAdmin();
    
    // 获取现有文章
    const existingPost = await getPostByIdOrSlug(id);
    if (!existingPost) {
      throw new Error('文章不存在');
    }
    
    if (existingPost.authorId !== user.uid) {
      throw new Error('只能编辑自己的文章');
    }
    
    // 验证更新数据
    const validatedPatch = validatePostData(patch, true);
    
    // 如果更新了 slug，检查唯一性
    if (validatedPatch.slug && validatedPatch.slug !== existingPost.slug) {
      const existingWithSlug = await getPostBySlug(validatedPatch.slug);
      if (existingWithSlug && existingWithSlug.id !== id) {
        throw new Error('该 URL 标识已存在，请使用其他标识');
      }
    }
    
    validatedPatch.updatedAt = timestamp.now();
    
    await db.collection('posts').doc(id).update(validatedPatch);
    return { id, ...existingPost, ...validatedPatch };
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 发布文章
export async function publishPost(id) {
  return updatePost(id, { status: 'published' });
}

// 撤回文章
export async function unpublishPost(id) {
  return updatePost(id, { status: 'draft' });
}

// 删除文章
export async function deletePost(id) {
  try {
    const user = await requireAdmin();
    
    // 获取现有文章
    const existingPost = await getPostByIdOrSlug(id);
    if (!existingPost) {
      throw new Error('文章不存在');
    }
    
    if (existingPost.authorId !== user.uid) {
      throw new Error('只能删除自己的文章');
    }
    
    await db.collection('posts').doc(id).delete();
    return true;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 通过 slug 获取文章
async function getPostBySlug(slug) {
  try {
    const snapshot = await db.collection('posts')
      .where('slug', '==', slug)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}

// 验证文章数据
function validatePostData(data, isUpdate = false) {
  const validated = {};
  
  // 标题验证
  if (data.title !== undefined) {
    if (!isUpdate && !data.title) {
      throw new Error('标题不能为空');
    }
    if (typeof data.title !== 'string') {
      throw new Error('标题必须是字符串');
    }
    if (data.title.length > APP_CONFIG.maxTitleLength) {
      throw new Error(`标题不能超过 ${APP_CONFIG.maxTitleLength} 个字符`);
    }
    validated.title = data.title.trim();
  }
  
  // 内容验证
  if (data.contentHtml !== undefined) {
    if (!isUpdate && !data.contentHtml) {
      throw new Error('内容不能为空');
    }
    if (typeof data.contentHtml !== 'string') {
      throw new Error('内容必须是字符串');
    }
    validated.contentHtml = data.contentHtml.trim();
  }
  
  // 状态验证
  if (data.status !== undefined) {
    if (!['draft', 'published'].includes(data.status)) {
      throw new Error('状态必须是 draft 或 published');
    }
    validated.status = data.status;
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
  
  // 封面 URL 验证
  if (data.coverUrl !== undefined) {
    if (typeof data.coverUrl !== 'string') {
      throw new Error('封面 URL 必须是字符串');
    }
    const url = data.coverUrl.trim();
    if (url && !isValidURL(url)) {
      throw new Error('封面 URL 必须是有效的 URL');
    }
    validated.coverUrl = url;
  }
  
  // Slug 验证
  if (data.slug !== undefined) {
    if (typeof data.slug !== 'string') {
      throw new Error('URL 标识必须是字符串');
    }
    const slug = data.slug.trim();
    if (slug && !isValidSlug(slug)) {
      throw new Error('URL 标识只能包含字母、数字和连字符，且不能以连字符开头或结尾');
    }
    validated.slug = slug;
  }
  
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

// Slug 验证
function isValidSlug(slug) {
  return /^[a-zA-Z0-9]+([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(slug);
}

// 生成 slug
export function generateSlug(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/[\s_-]+/g, '-') // 替换空格和下划线为连字符
    .replace(/^-+|-+$/g, '') // 移除开头和结尾的连字符
    .substring(0, 50); // 限制长度
}

// 获取所有标签
export async function getAllTags() {
  try {
    const snapshot = await db.collection('posts')
      .where('status', '==', 'published')
      .get();
    
    const tagSet = new Set();
    snapshot.docs.forEach(doc => {
      const tags = doc.data().tags || [];
      tags.forEach(tag => tagSet.add(tag));
    });
    
    return Array.from(tagSet).sort();
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
}
