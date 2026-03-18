/**
 * 资产创建工具函数
 *
 * 资产工具:
 *   ├─> createAsset()        创建资产对象
 *   ├─> extractBase64()      提取 Base64 数据
 *   ├─> createProject()      创建项目对象
 *   └─> loadImage()          加载图片
 */

import { generateId } from './imageUtils';
import type { Asset, Project } from '../types';

const DEFAULT_IMAGE_SIZE = 1024;

/**
 * 创建资产对象
 */
export const createAsset = (base64: string, type: Asset['type']): Asset => ({
  id: generateId(),
  type,
  url: `data:image/png;base64,${base64}`,
  mime: 'image/png',
  width: DEFAULT_IMAGE_SIZE,
  height: DEFAULT_IMAGE_SIZE,
  checksum: base64.slice(0, 32),
});

/**
 * 从 Data URL 中提取 Base64 数据
 */
export const extractBase64 = (value: string): string =>
  value.includes('base64,') ? value.split('base64,')[1] : value;

/**
 * 创建项目对象
 */
export const createProject = (project: Pick<Project, 'generations' | 'edits'>): Project => ({
  id: generateId(),
  title: 'Untitled Project',
  generations: project.generations,
  edits: project.edits,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/**
 * 加载图片
 */
export const loadImage = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = source;
  });
