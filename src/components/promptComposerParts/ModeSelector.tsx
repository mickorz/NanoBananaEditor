/**
 * 模式选择器组件
 *
 * ModeSelector 渲染模式按钮:
 *   ├─> generate  生成模式
 *   ├─> edit      编辑模式
 *   └─> mask      蒙版模式
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, Edit3, MousePointer } from 'lucide-react';
import { cn } from '../../utils/cn';

type ToolId = 'generate' | 'edit' | 'mask';

interface ModeSelectorProps {
  selectedTool: ToolId;
  onToolChange: (tool: ToolId) => void;
  onHelpClick: () => void;
  onHidePanel: () => void;
}

const tools = [
  { id: 'generate' as const, icon: Wand2 },
  { id: 'edit' as const, icon: Edit3 },
  { id: 'mask' as const, icon: MousePointer },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  selectedTool,
  onToolChange,
  onHelpClick,
  onHidePanel,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">{t('promptComposer.mode')}</h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={onHelpClick}
            className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-300 rounded transition-colors"
          >
            ?
          </button>
          <button
            onClick={onHidePanel}
            className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-300 rounded transition-colors"
            title={t('promptComposer.hidePromptPanel')}
          >
            x
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={t(`promptComposer.tools.${tool.id}Desc`)}
            className={cn(
              'flex flex-col items-center p-3 rounded-lg border transition-all duration-200',
              selectedTool === tool.id
                ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
            )}
          >
            <tool.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{t(`promptComposer.tools.${tool.id}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
