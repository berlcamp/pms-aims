"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-start justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <div
              key={step.id}
              className="flex flex-1 items-start min-w-0"
              style={{ flexBasis: "0%" }}
            >
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(index)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all shrink-0",
                    isCompleted &&
                      "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-primary/10 border-primary text-primary",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-background border-muted-foreground/30 text-muted-foreground",
                    isClickable && "cursor-pointer hover:scale-105",
                    !isClickable && "cursor-not-allowed"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </button>
                {/* Step Label */}
                <div className="mt-2 text-center min-w-0 w-full px-1">
                  <p
                    className={cn(
                      "text-xs font-medium truncate",
                      isCurrent && "text-primary",
                      !isCurrent && "text-muted-foreground"
                    )}
                    title={step.label}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p
                      className="text-[10px] text-muted-foreground mt-0.5 truncate"
                      title={step.description}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 mt-4 transition-colors shrink-0",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
