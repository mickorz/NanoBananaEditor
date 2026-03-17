/**
 * AI 服务工厂
 *
 * AIServiceFactory 工厂模式:
 *   ├─> getService(provider)
 *   │     ├─> provider === 'gemini'
 *   │     │     └─> return geminiService
 *   │     └─> provider === 'ai-studio'
 *   │           └─> return aiStudioService
 *   └─> getCurrentService()
 *         └─> 从 store 获取当前 provider
 *               └─> return getService(provider)
 */

import type { AIServiceInterface } from './aiServiceInterface';
import { geminiService } from './geminiService';
import { aiStudioService } from './aiStudioService';
import type { AIProvider } from '../types';
import { useAppStore } from '../store/useAppStore';

// 服务实例映射
const services: Record<AIProvider, AIServiceInterface> = {
  gemini: geminiService,
  'ai-studio': aiStudioService,
};

/**
 * 根据 provider 类型获取对应的 AI 服务实例
 */
export function getAIService(provider: AIProvider): AIServiceInterface {
  const service = services[provider];
  if (!service) {
    console.warn(`未知的 AI Provider: ${provider}, 回退到 ai-studio`);
    return services['ai-studio'];
  }
  return service;
}

/**
 * 获取当前 store 中配置的 AI 服务实例
 */
export function getCurrentAIService(): AIServiceInterface {
  const provider = useAppStore.getState().aiProvider;
  return getAIService(provider);
}

/**
 * 获取所有可用的 AI Provider 列表
 */
export function getAvailableProviders(): Array<{ id: AIProvider; name: string; description: string }> {
  return [
    {
      id: 'ai-studio',
      name: 'AIStudioToAPI',
      description: '本地代理服务 (localhost:7860)',
    },
    {
      id: 'gemini',
      name: 'Gemini API',
      description: 'Google 官方 API',
    },
  ];
}
