'use client';

import React, { useState, useCallback, useEffect } from 'react';

export interface WizardStep {
  id: string;
  title: string;
  shortTitle?: string;
  description?: string;
  icon?: React.ReactNode;
  validate?: () => boolean | Promise<boolean>;
}

interface FullscreenWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  children: React.ReactNode;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  nextLabel?: string;
  prevLabel?: string;
  darkMode?: boolean;
  showStepNumbers?: boolean;
}

const FullscreenWizard: React.FC<FullscreenWizardProps> = ({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  title,
  children,
  isSubmitting = false,
  submitLabel = 'Complete',
  cancelLabel = 'Cancel',
  nextLabel = 'Next',
  prevLabel = 'Back',
  darkMode = false,
  showStepNumbers = true,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleNext = useCallback(async () => {
    const step = steps[currentStep];
    
    if (step.validate) {
      try {
        const isValid = await step.validate();
        if (!isValid) {
          setValidationError('Please complete all required fields');
          return;
        }
      } catch (error) {
        setValidationError('Validation error occurred');
        return;
      }
    }
    
    setValidationError(null);
    
    if (isLastStep) {
      await onComplete();
    } else {
      onStepChange(currentStep + 1);
    }
  }, [currentStep, steps, isLastStep, onComplete, onStepChange]);

  const handlePrev = useCallback(() => {
    setValidationError(null);
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, isFirstStep, onStepChange]);

  const handleStepClick = useCallback((index: number) => {
    // Only allow going back, not forward
    if (index < currentStep) {
      setValidationError(null);
      onStepChange(index);
    }
  }, [currentStep, onStepChange]);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header */}
      <header className={`shrink-0 border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
        {/* Mobile Header */}
        <div className="sm:hidden px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onCancel}
              className={`p-2 -ml-2 rounded-lg ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {showStepNumbers && `${currentStep + 1}/${steps.length}`}
            </span>
            <div className="w-9" /> {/* Spacer for alignment */}
          </div>
          
          {/* Progress Bar */}
          <div className={`h-1 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div
              className="h-full bg-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Step Title */}
          <h2 className={`mt-3 text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentStepData?.title}
          </h2>
          {currentStepData?.description && (
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentStepData.description}
            </p>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden sm:block px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h1>
            <button
              onClick={onCancel}
              className={`p-2 rounded-lg ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isClickable = index < currentStep;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => handleStepClick(index)}
                    disabled={!isClickable}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                      ${isCurrent
                        ? darkMode
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-emerald-50 text-emerald-600'
                        : isCompleted
                        ? darkMode
                          ? 'text-emerald-400 hover:bg-slate-700'
                          : 'text-emerald-600 hover:bg-slate-50'
                        : darkMode
                        ? 'text-slate-500'
                        : 'text-slate-400'
                      }
                    `}
                  >
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${isCurrent
                        ? darkMode
                          ? 'bg-emerald-500 text-black'
                          : 'bg-emerald-500 text-white'
                        : isCompleted
                        ? darkMode
                          ? 'bg-emerald-500/30 text-emerald-400'
                          : 'bg-emerald-100 text-emerald-600'
                        : darkMode
                        ? 'bg-slate-700 text-slate-500'
                        : 'bg-slate-200 text-slate-400'
                      }
                    `}>
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        showStepNumbers ? index + 1 : step.icon
                      )}
                    </span>
                    <span className="hidden lg:inline">{step.shortTitle || step.title}</span>
                  </button>
                  
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 ${isCompleted ? 'bg-emerald-500' : darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Validation Error */}
          {validationError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
              {validationError}
            </div>
          )}
          
          {/* Step Content */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`shrink-0 border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Left: Cancel/Back */}
          <div className="flex items-center gap-3">
            {isFirstStep ? (
              <button
                onClick={onCancel}
                className={`
                  px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]
                  ${darkMode
                    ? 'text-slate-400 hover:bg-slate-700'
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                {cancelLabel}
              </button>
            ) : (
              <button
                onClick={handlePrev}
                className={`
                  px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]
                  flex items-center gap-2
                  ${darkMode
                    ? 'text-slate-400 hover:bg-slate-700'
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">{prevLabel}</span>
              </button>
            )}
          </div>

          {/* Right: Next/Complete */}
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`
              px-6 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px]
              flex items-center gap-2
              ${isSubmitting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isLastStep ? submitLabel : nextLabel}</span>
                {!isLastStep && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default FullscreenWizard;
export { FullscreenWizard };
export type { FullscreenWizardProps, WizardStep };
