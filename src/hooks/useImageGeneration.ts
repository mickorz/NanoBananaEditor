import { useMutation } from '@tanstack/react-query';
import {
  GEMINI_IMAGE_MODEL,
  type EditRequest,
  type GenerationRequest,
} from '../services/geminiService';
import { getCurrentAIService } from '../services/aiServiceFactory';
import { useAppStore } from '../store/useAppStore';
import { generateId } from '../utils/imageUtils';
import type { Asset, Edit, Generation, Project } from '../types';

const DEFAULT_IMAGE_SIZE = 1024;

const createAsset = (base64: string, type: Asset['type']): Asset => ({
  id: generateId(),
  type,
  url: `data:image/png;base64,${base64}`,
  mime: 'image/png',
  width: DEFAULT_IMAGE_SIZE,
  height: DEFAULT_IMAGE_SIZE,
  checksum: base64.slice(0, 32),
});

const extractBase64 = (value: string) => (value.includes('base64,') ? value.split('base64,')[1] : value);

const createProject = (project: Pick<Project, 'generations' | 'edits'>): Project => ({
  id: generateId(),
  title: 'Untitled Project',
  generations: project.generations,
  edits: project.edits,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = source;
  });

export const useImageGeneration = () => {
  const generateMutation = useMutation({
    mutationFn: async (request: GenerationRequest) => {
      const service = getCurrentAIService();
      return service.generateImage(request);
    },
    onMutate: () => {
      useAppStore.getState().setIsGenerating(true);
    },
    onSuccess: (images, request) => {
      const state = useAppStore.getState();

      if (images.length === 0) {
        state.setIsGenerating(false);
        return;
      }

      const outputAssets = images.map((base64) => createAsset(base64, 'output'));
      const sourceAssets = (request.referenceImages ?? []).map((base64) => createAsset(base64, 'original'));

      const generation: Generation = {
        id: generateId(),
        prompt: request.prompt,
        parameters: {
          seed: request.seed,
          temperature: request.temperature,
        },
        sourceAssets,
        outputAssets,
        modelVersion: `${GEMINI_IMAGE_MODEL} (${useAppStore.getState().aiProvider})`,
        timestamp: Date.now(),
      };

      if (state.currentProject) {
        state.addGeneration(generation);
      } else {
        state.setCurrentProject(
          createProject({
            generations: [generation],
            edits: [],
          })
        );
      }

      state.setCanvasImage(outputAssets[0].url);
      state.selectGeneration(generation.id);
      state.selectEdit(null);
      state.setIsGenerating(false);
    },
    onError: (error) => {
      console.error('生成图片失败:', error);
      useAppStore.getState().setIsGenerating(false);
    },
  });

  return {
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    error: generateMutation.error,
  };
};

export const useImageEditing = () => {
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

      if (brushStrokes.length > 0) {
        const tempImage = await loadImage(sourceImage);

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

        brushStrokes.forEach((stroke) => {
          if (stroke.points.length < 4) {
            return;
          }

          maskContext.lineWidth = stroke.brushSize;
          maskContext.beginPath();
          maskContext.moveTo(stroke.points[0], stroke.points[1]);

          for (let i = 2; i < stroke.points.length; i += 2) {
            maskContext.lineTo(stroke.points[i], stroke.points[i + 1]);
          }

          maskContext.stroke();
        });

        maskImage = maskCanvas.toDataURL('image/png').split('base64,')[1];

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

        brushStrokes.forEach((stroke) => {
          if (stroke.points.length < 4) {
            return;
          }

          previewContext.lineWidth = stroke.brushSize;
          previewContext.beginPath();
          previewContext.moveTo(stroke.points[0], stroke.points[1]);

          for (let i = 2; i < stroke.points.length; i += 2) {
            previewContext.lineTo(stroke.points[i], stroke.points[i + 1]);
          }

          previewContext.stroke();
        });

        previewContext.globalAlpha = 1;
        maskedReferenceImage = previewCanvas.toDataURL('image/png').split('base64,')[1];
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
  };
};
