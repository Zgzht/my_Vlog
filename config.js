// config.js - 统一配置文件

// Firebase 配置
export const firebaseConfig = {
  apiKey: "AIzaSyBR1V5u3zvZIQ-_7jNl8WfdzEmHsuB8vqo",
  authDomain: "project-9037683069333256481.firebaseapp.com",
  projectId: "project-9037683069333256481",
  appId: "1:256096740039:web:875a84e72fb0858354d4e2"
};

// 管理员配置
export const ADMIN_UIDS = ["SjLJvvCJciUyhwWR6vaJnqQXUpx2"];
export const ADMIN_UID = "SjLJvvCJciUyhwWR6vaJnqQXUpx2"; // 公众端读取资料用

// Cloudinary 配置
export const CLOUDINARY = {
  cloudName: "你的CloudName", // 需要替换为实际的 Cloud Name
  unsignedPreset: "blog_unsigned"
};

// 应用配置
export const APP_CONFIG = {
  siteName: "我的博客",
  siteDescription: "记录学习与生活",
  postsPerPage: 10,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxTitleLength: 120,
  maxTagLength: 16,
  maxTagCount: 10,
  maxDisplayNameLength: 40,
  previewLength: 150,
  wordsPerMinute: 400 // 阅读时长计算
};
