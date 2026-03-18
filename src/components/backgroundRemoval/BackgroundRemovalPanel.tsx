/**
 * 背景移除面板组件
 *
 * BackgroundRemovalPanel 状态流:
 *   idle -> loading -> processing -> completed
 *                      └-> error
 *
 * 功能:
 *   ├─> 上传图片
 *   ├─> 移除背景
 *   ├─> 对比查看结果
 *   └─> 下载处理后的图片
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Eraser, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { ImageUploader } from './ImageUploader';
import { ImageCompareResult } from './ImageCompareResult';
import { ProcessingLoader } from './ProcessingLoader';
import { useBackgroundRemoval } from '../../hooks/useBackgroundRemoval';

interface BackgroundRemovalPanelProps {
  className?: string;
}

export const BackgroundRemovalPanel: React.FC<BackgroundRemovalPanelProps> = ({
  className,
}) => {
  const { t } = useTranslation();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const {
    state,
    progress,
    result,
    error,
    isIdle,
    isLoading,
    isProcessing,
    isCompleted,
    hasError,
    progressPercentage,
    removeBackground,
    downloadResult,
    reset,
  } = useBackgroundRemoval({
    showToast: true,
  });

  // 处理图片选择
  const handleImageSelect = useCallback(
    async (file: File) => {
      // 创建预览 URL
      const previewUrl = URL.createObjectURL(file);
      setSelectedImageUrl(previewUrl);

      // 开始处理
      await removeBackground(file);
    },
    [removeBackground]
  );

  // 清除选择
  const handleClear = useCallback(() => {
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    setSelectedImageUrl(null);
    reset();
  }, [selectedImageUrl, reset]);

  // 重新处理
  const handleReset = useCallback(() => {
    handleClear();
  }, [handleClear]);

  const isWorking = isLoading || isProcessing;

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Eraser className="w-6 h-6" />
          {t('backgroundRemoval.title', '背景移除')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t(
            'backgroundRemoval.description',
            '上传图片，AI 自动移除背景，生成透明 PNG'
          )}
        </p>
      </div>

      {/* 错误提示 */}
      {hasError && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {t('backgroundRemoval.errorTitle', '处理失败')}
            </p>
            <p className="text-sm opacity-80">
              {error?.message || t('backgroundRemoval.unknownError', '未知错误')}
            </p>
          </div>
        </div>
      )}

      {/* 处理中状态 */}
      {isWorking && (
        <ProcessingLoader
          state={state}
          progress={progress}
          progressPercentage={progressPercentage}
        />
      )}

      {/* 结果展示 */}
      {isCompleted && result && (
        <ImageCompareResult
          result={result}
          onDownload={downloadResult}
          onReset={handleReset}
          disabled={isWorking}
        />
      )}

      {/* 上传区域 - 只在空闲或有错误时显示 */}
      {(isIdle || hasError) && !isCompleted && (
        <ImageUploader
          onImageSelect={handleImageSelect}
          currentImage={selectedImageUrl}
          onClear={handleClear}
          disabled={isWorking}
        />
      )}

      {/* 开始处理按钮 */}
      {isIdle && selectedImageUrl && !isWorking && (
        <Button
          onClick={() => {
            // 重新获取文件并处理
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files && files[0]) {
                await handleImageSelect(files[0]);
              }
            };
            input.click();
          }}
          className="w-full mt-4"
          size="lg"
        >
          <Eraser className="w-4 h-4 mr-2" />
          {t('backgroundRemoval.start', '开始移除背景')}
        </Button>
      )}
    </div>
  );
};
