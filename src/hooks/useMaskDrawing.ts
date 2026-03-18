/**
 * 蒙版绘制 Hook
 *
 * useMaskDrawing 处理蒙版绘制逻辑:
 *   ├─> createMaskCanvas()      创建蒙版画布
 *   ├─> createPreviewCanvas()   创建预览画布
 *   └─> generateMaskData()      生成蒙版数据
 */

import { useAppStore } from '../store/useAppStore';
import { loadImage } from '../utils/assetUtils';

interface MaskData {
  maskImage: string;
  maskedReferenceImage: string;
}

/**
 * 蒙版绘制 Hook
 */
export const useMaskDrawing = () => {
  const { brushStrokes } = useAppStore();

  /**
   * 检查是否有蒙版笔触
   */
  const hasMaskStrokes = brushStrokes.length > 0;

  /**
   * 生成蒙版数据
   */
  const generateMaskData = async (sourceImage: string): Promise<MaskData> => {
    const tempImage = await loadImage(sourceImage);

    // 创建蒙版画布
    const maskCanvas = document.createElement('canvas');
    const maskContext = maskCanvas.getContext('2d');
    if (!maskContext) {
      throw new Error('无法创建蒙版画布');
    }

    maskCanvas.width = tempImage.width;
    maskCanvas.height = tempImage.height;
    maskContext.fillStyle = 'black';
    maskContext.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskContext.strokeStyle = 'white';
    maskContext.lineCap = 'round';
    maskContext.lineJoin = 'round';

    // 绘制蒙版笔触
    brushStrokes.forEach((stroke) => {
      if (stroke.points.length < 4) return;

      maskContext.lineWidth = stroke.brushSize;
      maskContext.beginPath();
      maskContext.moveTo(stroke.points[0], stroke.points[1]);

      for (let i = 2; i < stroke.points.length; i += 2) {
        maskContext.lineTo(stroke.points[i], stroke.points[i + 1]);
      }

      maskContext.stroke();
    });

    const maskImage = maskCanvas.toDataURL('image/png').split('base64,')[1];

    // 创建预览画布
    const previewCanvas = document.createElement('canvas');
    const previewContext = previewCanvas.getContext('2d');
    if (!previewContext) {
      throw new Error('无法创建预览画布');
    }

    previewCanvas.width = tempImage.width;
    previewCanvas.height = tempImage.height;
    previewContext.drawImage(tempImage, 0, 0);
    previewContext.globalAlpha = 0.4;
    previewContext.strokeStyle = '#A855F7';
    previewContext.lineCap = 'round';
    previewContext.lineJoin = 'round';

    // 绘制预览笔触
    brushStrokes.forEach((stroke) => {
      if (stroke.points.length < 4) return;

      previewContext.lineWidth = stroke.brushSize;
      previewContext.beginPath();
      previewContext.moveTo(stroke.points[0], stroke.points[1]);

      for (let i = 2; i < stroke.points.length; i += 2) {
        previewContext.lineTo(stroke.points[i], stroke.points[i + 1]);
      }

      previewContext.stroke();
    });

    previewContext.globalAlpha = 1;
    const maskedReferenceImage = previewCanvas.toDataURL('image/png').split('base64,')[1];

    return { maskImage, maskedReferenceImage };
  };

  return {
    hasMaskStrokes,
    generateMaskData,
  };
};
