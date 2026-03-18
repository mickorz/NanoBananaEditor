/**
 * 提示词输入组件
 *
 * PromptInput 处理提示词输入:
 *   ├─> 文本输入区域
 *   ├─> 长度指示器
 *   └─> 帮助提示
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { Textarea } from '../ui/Textarea';
import { cn } from '../../utils/cn';

type ToolId = 'generate' | 'edit' | 'mask';

interface PromptInputProps {
  selectedTool: ToolId;
  currentPrompt: string;
  onPromptChange: (prompt: string) => void;
  onHelpClick: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  selectedTool,
  currentPrompt,
  onPromptChange,
  onHelpClick,
}) => {
  const { t } = useTranslation();

  const getPromptStatus = () => {
    if (currentPrompt.length < 20) {
      return { color: 'text-red-500', bgColor: 'bg-red-500', key: 'promptTooShort' };
    }
    if (currentPrompt.length < 50) {
      return { color: 'text-yellow-500', bgColor: 'bg-yellow-500', key: 'promptGood' };
    }
    return { color: 'text-green-500', bgColor: 'bg-green-500', key: 'promptExcellent' };
  };

  const status = getPromptStatus();

  return (
    <div>
      <label className="text-sm font-medium text-gray-300 mb-3 block">
        {selectedTool === 'generate' ? t('promptComposer.describeGenerate') : t('promptComposer.describeEdit')}
      </label>
      <Textarea
        value={currentPrompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={
          selectedTool === 'generate'
            ? t('promptComposer.placeholderGenerate')
            : t('promptComposer.placeholderEdit')
        }
        className="min-h-[120px] resize-none"
      />

      <button
        onClick={onHelpClick}
        className="mt-2 flex items-center text-xs hover:text-gray-400 transition-colors group"
      >
        {currentPrompt.length < 20 ? (
          <HelpCircle className="h-3 w-3 mr-2 text-red-500 group-hover:text-red-400" />
        ) : (
          <div className={cn('h-2 w-2 rounded-full mr-2', status.bgColor)} />
        )}
        <span className="text-gray-500 group-hover:text-gray-400">
          {t(`promptComposer.${status.key}`)}
        </span>
      </button>
    </div>
  );
};
