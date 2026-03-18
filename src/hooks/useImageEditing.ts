/**
 * 图片编辑 Hook
 *
 * useImageEditing 处理图片编辑逻辑:
 *   ├─> edit()              执行编辑操作
 *   ├─> isEditing           编辑状态
 *   └─> error               错误信息
 */

import { useMutation } from '@tanstack/react-query';
import { getCurrentAIService } from '../services/ai';
import { GEMINI_IMAGE_MODEL } from '../services/ai/geminiService';
import { useAppStore } from '../store/useAppStore';
import { createAsset, extractBase64, createProject } from '../utils/assetUtils';
import { generateId } from '../utils/imageUtils';
import { useMaskDrawing } from './useMaskDrawing';
import type { EditRequest, Edit } from '../types';

/**
 * 图片编辑 Hook
 */
export const useImageEditing = () => {
  const { hasMaskStrokes, generateMaskData } = useMaskDrawing();

  const editMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const {
        canvasImage,
        uploadedImages,
        editReferenceImages,
        brushStrokes,
        seed,
        temperature,
      } = useAppStore.getState();

      const sourceImage = canvasImage || uploadedImages[0];
      if (!sourceImage) {
        throw new Error('No image to edit');
      }

      const base64Image = extractBase64(sourceImage);
      let referenceImages = editReferenceImages.map(extractBase64);
      let maskImage: string | undefined;
      let maskedReferenceImage: string | undefined;

      // 如果有蒙版笔触，生成蒙版数据
      if (brushStrokes.length > 0) {
        const maskData = await generateMaskData(sourceImage);
        maskImage = maskData.maskImage;
        maskedReferenceImage = maskData.maskedReferenceImage;
        referenceImages = [maskedReferenceImage, ...referenceImages];
      }

      const request: EditRequest = {
        instruction,
        originalImage: base64Image,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        maskImage,
        temperature,
        seed: seed ?? undefined,
      };

      const images = await getCurrentAIService().editImage(request);
      return { images, maskedReferenceImage };
    },
    onMutate: () => {
      useAppStore.getState().setIsGenerating(true);
    },
    onSuccess: ({ images, maskedReferenceImage }, instruction) => {
      const state = useAppStore.getState();

      if (images.length === 0) {
        state.setIsGenerating(false);
        return;
      }

      const outputAssets = images.map((base64) => createAsset(base64, 'output'));
      const maskReferenceAsset = maskedReferenceImage
        ? createAsset(maskedReferenceImage, 'mask')
        : undefined;

      const currentProject = state.currentProject;
      const lastGeneration =
        currentProject && currentProject.generations.length > 0
          ? currentProject.generations[currentProject.generations.length - 1]
          : undefined;

      const edit: Edit = {
        id: generateId(),
        parentGenerationId: state.selectedGenerationId || lastGeneration?.id || '',
        maskAssetId: maskReferenceAsset?.id,
        maskReferenceAsset,
        instruction,
        outputAssets,
        timestamp: Date.now(),
      };

      if (currentProject) {
        state.addEdit(edit);
      } else {
        state.setCurrentProject(
          createProject({
            generations: [],
            edits: [edit],
          })
        );
      }

      state.setCanvasImage(outputAssets[0].url);
      state.selectEdit(edit.id);
      state.selectGeneration(null);
      state.setIsGenerating(false);
    },
    onError: (error) => {
      console.error('编辑图片失败:', error);
      useAppStore.getState().setIsGenerating(false);
    },
  });

  return {
    edit: editMutation.mutate,
    isEditing: editMutation.isPending,
    error: editMutation.error,
    hasMaskStrokes,
  };
};
