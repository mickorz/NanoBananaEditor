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

import type { AIServiceInterface } from './interface';
import { geminiService } from './geminiService';
import { aiStudioService } from './aiStudioService';
import type { AIProvider } from '../../types';
import { useAppStore } from '../../store/useAppStore';

// 可用模型配置
export interface AIModel {
  id: string;
  name: string;
  description: string;
}

// 各 Provider 支持的模型
export const AVAILABLE_MODELS: Record<AIProvider, AIModel[]> = {
  'ai-studio': [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: '快速图像生成' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', description: '实验版本' },
  ],
  'gemini': [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: '快速图像生成' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', description: '实验版本' },
  ],
};

/**
 * 获取当前选择的模型
 */
export function getCurrentModel(): string {
  return useAppStore.getState().aiModel;
}

/**
 * 获取指定 Provider 可用的模型列表
 */
export function getAvailableModels(provider: AIProvider): AIModel[] {
  return AVAILABLE_MODELS[provider] || [];
}

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

// AIStudioToAPI 端点
const AI_STUDIO_ENDPOINT = 'http://localhost:7860';

/**
 * 测试 AIStudioToAPI 连接
 */
export async function testAIStudioConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // 使用根路径测试服务是否响应
    const response = await fetch(`${AI_STUDIO_ENDPOINT}/`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // 只要服务响应就认为连接成功（不管返回什么状态码）
    return true;
  } catch (error) {
    console.warn('AIStudioToAPI 连接测试失败:', error);
    return false;
  }
}

/**
 * 测试 Gemini API 连接（通过发送简单请求验证）
 */
export async function testGeminiConnection(): Promise<boolean> {
  // Gemini API 需要 API Key，如果没有配置则返回 true（假设可用）
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'demo-key') {
    return true; // 没有配置 API Key 时不测试
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );
    return response.ok;
  } catch (error) {
    console.warn('Gemini API 连接测试失败:', error);
    return false;
  }
}

/**
 * 测试指定 Provider 的连接
 */
export async function testProviderConnection(provider: AIProvider): Promise<boolean> {
  if (provider === 'ai-studio') {
    return testAIStudioConnection();
  } else if (provider === 'gemini') {
    return testGeminiConnection();
  }
  return false;
}
