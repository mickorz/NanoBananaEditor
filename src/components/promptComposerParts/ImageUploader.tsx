/**
 * 图片上传组件
 *
 * ImageUploader 处理图片上传:
 *   ├─> 生成模式: 上传参考图片
 *   ├─> 编辑模式: 上传编辑图片或参考图
 *   └─> 蒙版模式: 上传待编辑图片
 */

import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { blobToBase64 } from '../../utils/imageUtils';

type ToolId = 'generate' | 'edit' | 'mask';

interface ImageUploaderProps {
  selectedTool: ToolId;
  uploadedImages: string[];
  editReferenceImages: string[];
  canvasImage: string | null;
  onAddUploadedImage: (image: string) => void;
  onRemoveUploadedImage: (index: number) => void;
  onAddEditReferenceImage: (image: string) => void;
  onRemoveEditReferenceImage: (index: number) => void;
  onSetCanvasImage: (image: string | null) => void;
  onClearUploadedImages: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  selectedTool,
  uploadedImages,
  editReferenceImages,
  canvasImage,
  onAddUploadedImage,
  onRemoveUploadedImage,
  onAddEditReferenceImage,
  onRemoveEditReferenceImage,
  onSetCanvasImage,
  onClearUploadedImages,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      event.target.value = '';
      return;
    }

    try {
      const base64 = await blobToBase64(file);
      const dataUrl = `data:${file.type};base64,${base64}`;

      if (selectedTool === 'generate') {
        if (uploadedImages.length < 2) {
          onAddUploadedImage(dataUrl);
        }
      } else if (selectedTool === 'edit') {
        if (!canvasImage) {
          onSetCanvasImage(dataUrl);
        } else if (editReferenceImages.length < 2) {
          onAddEditReferenceImage(dataUrl);
        }
      } else {
        onClearUploadedImages();
        onAddUploadedImage(dataUrl);
        onSetCanvasImage(dataUrl);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      event.target.value = '';
    }
  };

  const currentImages = selectedTool === 'generate' ? uploadedImages : editReferenceImages;
  const removeImage = selectedTool === 'generate' ? onRemoveUploadedImage : onRemoveEditReferenceImage;
  const isUploadDisabled =
    (selectedTool === 'generate' && uploadedImages.length >= 2) ||
    (selectedTool === 'edit' && canvasImage !== null && editReferenceImages.length >= 2);

  return (
    <div>
      <label className="text-sm font-medium text-gray-300 mb-1 block">
        {selectedTool === 'generate'
          ? t('promptComposer.referenceImages')
          : selectedTool === 'edit'
            ? t('promptComposer.editImage')
            : t('promptComposer.uploadImage')}
      </label>

      {selectedTool === 'mask' && (
        <p className="text-xs text-gray-400 mb-3">{t('promptComposer.maskHint')}</p>
      )}
      {selectedTool === 'generate' && (
        <p className="text-xs text-gray-500 mb-3">{t('promptComposer.generateHint')}</p>
      )}
      {selectedTool === 'edit' && (
        <p className="text-xs text-gray-500 mb-3">
          {canvasImage
            ? t('promptComposer.editHintWithCanvas')
            : t('promptComposer.editHintNoCanvas')}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
        disabled={isUploadDisabled}
      >
        <Upload className="h-4 w-4 mr-2" />
        {t('promptComposer.upload')}
      </Button>

      {currentImages.length > 0 && (
        <div className="mt-3 space-y-2">
          {currentImages.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image}
                alt={`${t('promptComposer.reference')} ${index + 1}`}
                className="w-full h-20 object-cover rounded-lg border border-gray-700"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-gray-900/80 text-gray-400 hover:text-gray-200 rounded-full p-1 transition-colors"
              >
                x
              </button>
              <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-2 py-1 rounded text-gray-300">
                {t('promptComposer.reference')} {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
