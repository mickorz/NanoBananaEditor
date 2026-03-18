/**
 * 图片对比结果组件
 *
 * ImageCompareResult 功能:
 *   ├─> 使用 react-compare-slider 对比原图和处理后图片
 *   ├─> 下载处理结果
 *   └─> 重新处理按钮
 */

import { useTranslation } from 'react-i18next';
import { Download, RotateCcw } from 'lucide-react';
import { ReactCompareSlider } from 'react-compare-slider';
import { Button } from '../ui/Button';
import type { BackgroundRemovalResult } from '../../services/backgroundRemoval';

interface ImageCompareResultProps {
  result: BackgroundRemovalResult;
  onDownload: (fileName?: string) => void;
  onReset: () => void;
  disabled?: boolean;
  className?: string;
}

export const ImageCompareResult: React.FC<ImageCompareResultProps> = ({
  result,
  onDownload,
  onReset,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation();

  const handleDownload = () => {
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const fileName = `bg-removed-${timestamp}.png`;
    onDownload(fileName);
  };

  return (
    <div className={className}>
      {/* 图片对比滑块 */}
      <div className="relative rounded-lg overflow-hidden border border-gray-700">
        <ReactCompareSlider
          itemOne={
            <div className="relative w-full h-full">
              <img
                src={result.originalUrl}
                alt={t('backgroundRemoval.original', 'Original')}
                className="w-full h-auto object-contain"
              />
              <span className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                {t('backgroundRemoval.original', 'Original')}
              </span>
            </div>
          }
          itemTwo={
            <div className="relative w-full h-full" style={{ background: 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 16px 16px' }}>
              <img
                src={result.processedUrl}
                alt={t('backgroundRemoval.processed', 'Processed')}
                className="w-full h-auto object-contain"
              />
              <span className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                {t('backgroundRemoval.processed', 'Processed')}
              </span>
            </div>
          }
          className="w-full h-auto"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-4">
        <Button
          onClick={handleDownload}
          disabled={disabled}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          {t('backgroundRemoval.download', 'Download Result')}
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
          disabled={disabled}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {t('backgroundRemoval.newImage', 'Process New Image')}
        </Button>
      </div>

      {/* 文件信息 */}
      <div className="mt-4 text-sm text-gray-400">
        <p>
          {t('backgroundRemoval.fileSize', 'File Size')}:{' '}
          {(result.blob.size / 1024).toFixed(2)} KB
        </p>
      </div>
    </div>
  );
};
