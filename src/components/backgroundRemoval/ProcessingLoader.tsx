/**
 * 背景移除处理加载组件
 *
 * ProcessingLoader 显示状态:
 *   ├─> loading      加载模型中
 *   ├─> processing   处理图片中
 *   └─> 进度条显示
 */

import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { BackgroundRemovalProgress, ProcessingState } from '../../services/backgroundRemoval';

interface ProcessingLoaderProps {
  state: ProcessingState;
  progress: BackgroundRemovalProgress | null;
  progressPercentage: number;
}

export const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({
  state,
  progress,
  progressPercentage,
}) => {
  const { t } = useTranslation();

  if (state !== 'loading' && state !== 'processing') {
    return null;
  }

  const getStatusText = () => {
    if (state === 'loading') {
      return t('backgroundRemoval.loading', 'Loading model...');
    }
    if (progress?.key === 'compute:inference') {
      return t('backgroundRemoval.processing', 'Processing image...');
    }
    return t('backgroundRemoval.preparing', 'Preparing...');
  };

  const getProgressKey = () => {
    if (!progress) return '';

    const keyMap: Record<string, string> = {
      'fetch:model': t('backgroundRemoval.progress.fetchModel', 'Fetching model'),
      'compute:inference': t('backgroundRemoval.progress.inference', 'AI inference'),
      'encode': t('backgroundRemoval.progress.encode', 'Encoding image'),
      'decode': t('backgroundRemoval.progress.decode', 'Decoding image'),
    };

    return keyMap[progress.key] || progress.key;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-gray-800/50 rounded-lg">
      <Loader2 className="w-10 h-10 animate-spin text-yellow-400" />
      <p className="text-lg font-medium text-gray-200">{getStatusText()}</p>
      {progress && (
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{getProgressKey()}</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
