/**
 * 工作流步骤器组件
 *
 * WorkflowStepper 功能:
 *   ├─> 显示多步骤工作流
 *   ├─> 步骤导航
 *   ├─> 完成状态显示
 *   └─> 步骤描述
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Circle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface WorkflowStep {
  id: string;
  title: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowNavigation?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = false,
  orientation = 'vertical',
  className,
}) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const getStepIcon = (status: WorkflowStep['status'], stepIndex: number) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
        );
      case 'active':
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center ring-4 ring-yellow-500/30">
            <span className="text-sm font-bold text-gray-900">{stepIndex + 1}</span>
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">!</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <Circle className="w-4 h-4 text-gray-400" />
          </div>
        );
    }
  };

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex items-start space-x-2', className)}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* 步骤 */}
            <div
              className={cn(
                'flex flex-col items-center',
                allowNavigation && 'cursor-pointer'
              )}
              onClick={() => allowNavigation && onStepClick?.(index)}
            >
              {getStepIcon(step.status, index)}
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    'text-xs font-medium',
                    step.status === 'active'
                      ? 'text-yellow-400'
                      : step.status === 'completed'
                        ? 'text-green-400'
                        : 'text-gray-400'
                  )}
                >
                  {isZh && step.titleZh ? step.titleZh : step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-500 mt-0.5 hidden md:block">
                    {isZh && step.descriptionZh ? step.descriptionZh : step.description}
                  </p>
                )}
              </div>
            </div>

            {/* 连接线 */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mt-4',
                  step.status === 'completed' ? 'bg-green-500' : 'bg-gray-700'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // 垂直布局
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* 步骤 */}
          <div
            className={cn(
              'flex items-start space-x-3',
              allowNavigation && 'cursor-pointer'
            )}
            onClick={() => allowNavigation && onStepClick?.(index)}
          >
            {/* 图标 */}
            <div className="flex-shrink-0">{getStepIcon(step.status, index)}</div>

            {/* 内容 */}
            <div className="flex-1 min-w-0 pb-4">
              <p
                className={cn(
                  'text-sm font-medium',
                  step.status === 'active'
                    ? 'text-yellow-400'
                    : step.status === 'completed'
                      ? 'text-green-400'
                      : 'text-gray-400'
                )}
              >
                {isZh && step.titleZh ? step.titleZh : step.title}
              </p>
              {step.description && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {isZh && step.descriptionZh ? step.descriptionZh : step.description}
                </p>
              )}
            </div>
          </div>

          {/* 连接线 */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                'ml-4 w-0.5 h-6',
                step.status === 'completed' ? 'bg-green-500' : 'bg-gray-700'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
