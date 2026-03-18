/**
 * AI 渠道选择器组件
 *
 * AIChannelSelector 处理 AI 服务渠道和模型选择:
 *   ├─> Gemini API
 *   ├─> AIStudioToAPI
 *   ├─> 模型选择
 *   └─> 连接状态指示器
 */

import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { AIProvider } from '../../types';
import { getAvailableProviders, getAvailableModels, testProviderConnection } from '../../services/ai';
import { useAppStore, ConnectionStatus } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

interface AIChannelSelectorProps {
  aiProvider: AIProvider;
  aiModel: string;
  onProviderChange: (provider: AIProvider) => void;
  onModelChange: (model: string) => void;
}

// 状态颜色映射
const statusColors: Record<ConnectionStatus, string> = {
  idle: 'bg-gray-500',
  testing: 'bg-yellow-500 animate-pulse',
  connected: 'bg-green-500',
  disconnected: 'bg-red-500',
};

// 状态文字映射
const statusTexts: Record<ConnectionStatus, string> = {
  idle: '未测试',
  testing: '测试中',
  connected: '已连接',
  disconnected: '连接失败',
};

export const AIChannelSelector: React.FC<AIChannelSelectorProps> = ({
  aiProvider,
  aiModel,
  onProviderChange,
  onModelChange,
}) => {
  const { t } = useTranslation();
  const providers = getAvailableProviders();
  const models = getAvailableModels(aiProvider);
  const { connectionStatus, setConnectionStatus } = useAppStore();
  const currentStatus = connectionStatus[aiProvider];

  // 测试当前 Provider 连接
  const testConnection = useCallback(async (provider: AIProvider) => {
    setConnectionStatus(provider, 'testing');

    const isConnected = await testProviderConnection(provider);
    setConnectionStatus(provider, isConnected ? 'connected' : 'disconnected');
  }, [setConnectionStatus]);

  // 初始化时测试当前选择的 Provider
  useEffect(() => {
    testConnection(aiProvider);
  }, []); // 只在组件挂载时执行一次

  // 切换 Provider 时测试连接
  const handleProviderChange = (provider: AIProvider) => {
    onProviderChange(provider);
    // 切换 provider 时，自动选择第一个可用模型
    const newModels = getAvailableModels(provider);
    if (newModels.length > 0) {
      onModelChange(newModels[0].id);
    }
    // 如果该 provider 还没有测试过，则测试连接
    if (connectionStatus[provider] === 'idle') {
      testConnection(provider);
    }
  };

  return (
    <div className="space-y-3">
      {/* AI 渠道选择 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            {t('promptComposer.aiChannel')}
          </label>
          <button
            onClick={() => testConnection(aiProvider)}
            className="flex items-center text-xs text-gray-400 hover:text-gray-300 transition-colors"
            title="重新测试连接"
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', currentStatus === 'testing' && 'animate-spin')} />
            测试
          </button>
        </div>

        <div className="relative">
          <select
            value={aiProvider}
            onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
            className="w-full h-10 px-3 pr-10 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 appearance-none cursor-pointer"
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>

          {/* 状态指示器 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <div
              className={cn('w-2 h-2 rounded-full', statusColors[currentStatus])}
              title={statusTexts[currentStatus]}
            />
          </div>
        </div>

        {/* 状态文字 */}
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            {providers.find((p) => p.id === aiProvider)?.description}
          </p>
          <p className={cn(
            'text-xs',
            currentStatus === 'connected' && 'text-green-400',
            currentStatus === 'disconnected' && 'text-red-400',
            currentStatus === 'testing' && 'text-yellow-400',
            currentStatus === 'idle' && 'text-gray-500',
          )}>
            {statusTexts[currentStatus]}
          </p>
        </div>
      </div>

      {/* 模型选择 */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 block">
          {t('promptComposer.aiModel') || 'AI 模型'}
        </label>
        <select
          value={aiModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 appearance-none cursor-pointer"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {models.find((m) => m.id === aiModel)?.description}
        </p>
      </div>
    </div>
  );
};
