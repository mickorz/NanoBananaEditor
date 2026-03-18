/**
 * 图片上传组件
 *
 * ImageUploader 功能:
 *   ├─> 拖拽上传
 *   ├─> 点击选择文件
 *   └─> 预览已选图片
 */

import { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, ImageIcon, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  currentImage: string | null;
  onClear?: () => void;
  disabled?: boolean;
  accept?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelect,
  currentImage,
  onClear,
  disabled = false,
  accept = 'image/*',
  className,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        onImageSelect(files[0]);
      }
    },
    [disabled, onImageSelect]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onImageSelect(files[0]);
      }
      // 重置 input 以允许选择相同文件
      e.target.value = '';
    },
    [onImageSelect]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear?.();
    },
    [onClear]
  );

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg transition-colors cursor-pointer',
        isDragging ? 'border-yellow-400 bg-yellow-400/5' : 'border-gray-600 hover:border-yellow-400/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {currentImage ? (
        <div className="relative p-4">
          <img
            src={currentImage}
            alt={t('backgroundRemoval.preview', 'Preview')}
            className="w-full h-auto max-h-64 object-contain rounded"
          />
          {onClear && !disabled && (
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              title={t('backgroundRemoval.clear', 'Clear')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="p-4 bg-gray-700 rounded-full mb-4">
            {isDragging ? (
              <ImageIcon className="w-8 h-8 text-yellow-400" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-400 text-center">
            {isDragging
              ? t('backgroundRemoval.dropHere', 'Drop to upload')
              : t(
                  'backgroundRemoval.dragOrClick',
                  'Drag image here, or click to select'
                )}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {t('backgroundRemoval.supportedFormats', 'Supports PNG, JPG, WEBP formats')}
          </p>
        </div>
      )}
    </div>
  );
};
