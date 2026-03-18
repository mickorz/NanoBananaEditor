/**
 * 向后兼容导出 - 从新的 ai/ 模块重新导出
 * @deprecated 请直接从 './ai' 或 './ai/geminiService' 导入
 */

export {
  GeminiService,
  geminiService,
  GEMINI_IMAGE_MODEL,
} from './ai/geminiService';

export type {
  GenerationRequest,
  EditRequest,
  SegmentationRequest,
  SegmentationResult,
} from './ai/types';
