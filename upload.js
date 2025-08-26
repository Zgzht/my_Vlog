// upload.js - Cloudinary 上传模块

import { CLOUDINARY, APP_CONFIG } from './config.js';
import { getCurrentUser } from './auth.js';

// 上传图片到 Cloudinary
export async function uploadImage(file, folder = 'uploads') {
  try {
    // 验证文件
    validateImageFile(file);
    
    // 构建上传 URL
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/upload`;
    
    // 获取当前用户 ID 用于文件夹命名
    const user = getCurrentUser();
    const userFolder = user ? `${folder}/${user.uid}` : folder;
    
    // 构建 FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY.unsignedPreset);
    formData.append('folder', userFolder);
    formData.append('resource_type', 'image');
    
    // 添加转换参数以优化图片
    formData.append('transformation', 'q_auto,f_auto');
    
    // 发送上传请求
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `上传失败: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.secure_url) {
      throw new Error('上传响应中缺少图片 URL');
    }
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
    
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(error.message || '图片上传失败');
  }
}

// 上传头像
export async function uploadAvatar(file) {
  return uploadImage(file, 'avatars');
}

// 上传背景图片
export async function uploadBackground(file) {
  return uploadImage(file, 'backgrounds');
}

// 上传文章图片
export async function uploadPostImage(file) {
  return uploadImage(file, 'posts');
}

// 上传封面图片
export async function uploadCover(file) {
  return uploadImage(file, 'covers');
}

// 验证图片文件
function validateImageFile(file) {
  if (!file) {
    throw new Error('请选择文件');
  }
  
  // 检查文件类型
  if (!APP_CONFIG.allowedImageTypes.includes(file.type)) {
    throw new Error(`不支持的文件类型。支持的格式：${APP_CONFIG.allowedImageTypes.join(', ')}`);
  }
  
  // 检查文件大小
  if (file.size > APP_CONFIG.maxImageSize) {
    const maxSizeMB = Math.round(APP_CONFIG.maxImageSize / 1024 / 1024);
    throw new Error(`文件大小不能超过 ${maxSizeMB}MB`);
  }
}

// 创建图片预览
export function createImagePreview(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('不是有效的图片文件'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

// 压缩图片（客户端压缩，减少上传时间）
export function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // 计算新尺寸
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      // 设置画布尺寸
      canvas.width = width;
      canvas.height = height;
      
      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, width, height);
      
      // 转换为 Blob
      canvas.toBlob(resolve, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// 批量上传图片
export async function uploadMultipleImages(files, folder = 'uploads', onProgress = null) {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadImage(files[i], folder);
      results.push(result);
      
      if (onProgress) {
        onProgress({
          completed: i + 1,
          total: files.length,
          current: result
        });
      }
    } catch (error) {
      errors.push({
        file: files[i].name,
        error: error.message
      });
    }
  }
  
  return { results, errors };
}

// 生成 Cloudinary 变换 URL
export function generateTransformUrl(publicId, transformations = {}) {
  if (!publicId || !CLOUDINARY.cloudName) {
    return '';
  }
  
  const baseUrl = `https://res.cloudinary.com/${CLOUDINARY.cloudName}/image/upload`;
  const transforms = [];
  
  // 常用变换
  if (transformations.width) transforms.push(`w_${transformations.width}`);
  if (transformations.height) transforms.push(`h_${transformations.height}`);
  if (transformations.crop) transforms.push(`c_${transformations.crop}`);
  if (transformations.quality) transforms.push(`q_${transformations.quality}`);
  if (transformations.format) transforms.push(`f_${transformations.format}`);
  
  // 默认优化
  if (transforms.length === 0) {
    transforms.push('q_auto', 'f_auto');
  }
  
  const transformString = transforms.join(',');
  return `${baseUrl}/${transformString}/${publicId}`;
}

// 获取图片缩略图 URL
export function getThumbnailUrl(url, size = 200) {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }
  
  // 提取 public_id
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return url;
  
  const publicId = match[1];
  return generateTransformUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  });
}

// 文件选择器辅助函数
export function selectImageFile(options = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = APP_CONFIG.allowedImageTypes.join(',');
    input.multiple = options.multiple || false;
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) {
        reject(new Error('未选择文件'));
        return;
      }
      
      if (options.multiple) {
        resolve(files);
      } else {
        resolve(files[0]);
      }
    };
    
    input.click();
  });
}
