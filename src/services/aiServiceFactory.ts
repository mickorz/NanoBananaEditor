/**
 * 向后兼容导出 - 从新的 ai/ 模块重新导出
 * @deprecated 请直接从 './ai' 或 './ai/factory' 导入
 */

export {
  getAIService,
  getCurrentAIService,
  getAvailableProviders,
  testAIStudioConnection,
  testGeminiConnection,
  testProviderConnection,
} from './ai/factory';
