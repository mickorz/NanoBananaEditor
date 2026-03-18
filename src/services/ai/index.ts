/**
 * AI 服务模块导出
 */

// 类型
export type {
  GenerationRequest,
  EditRequest,
  SegmentationRequest,
  SegmentationResult,
  GeminiAPIResponse,
} from './types';

// 接口
export type { AIServiceInterface } from './interface';

// 基类
export { BaseAIService } from './baseService';

// 服务实例
export { geminiService, GEMINI_IMAGE_MODEL } from './geminiService';
export { aiStudioService } from './aiStudioService';

// 工厂函数
export {
  getAIService,
  getCurrentAIService,
  getAvailableProviders,
  getAvailableModels,
  getCurrentModel,
  testAIStudioConnection,
  testGeminiConnection,
  testProviderConnection,
  AVAILABLE_MODELS,
} from './factory';
export type { AIModel } from './factory';
