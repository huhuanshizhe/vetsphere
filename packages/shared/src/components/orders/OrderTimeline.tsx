'use client';

import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

/**
 * Order Timeline Step Configuration
 */
export interface TimelineStep {
  key: string;
  label: string;
  date?: string | null;
  completed: boolean;
  current: boolean;
}

export interface OrderTimelineProps {
  steps: TimelineStep[];
  className?: string;
  compact?: boolean;
}

/**
 * OrderTimeline - Professional order progress timeline
 * Displays order status progression with visual indicators
 */
export function OrderTimeline({ steps, className = '', compact = false }: OrderTimelineProps) {
  if (compact) {
    // Compact horizontal timeline for cards/widgets
    return (
      <div className={`flex items-center justify-between ${className}`}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  step.completed
                    ? 'bg-emerald-500 text-white'
                    : step.current
                    ? 'bg-blue-500 text-white ring-2 ring-blue-200'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
              </div>
              <p
                className={`mt-1 text-xs font-medium ${
                  step.completed || step.current ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {step.label}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded ${
                  step.completed ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                style={{ minWidth: '40px' }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Full vertical timeline for detail pages
  return (
    <div className={`relative ${className}`}>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex gap-4">
            {/* Timeline marker */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step.completed
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : step.current
                    ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="font-bold">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 h-8 rounded ${
                    step.completed ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <h4
                  className={`font-semibold ${
                    step.completed || step.current ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </h4>
                {step.date && (
                  <span className="text-sm text-slate-500">
                    {new Date(step.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              {step.current && !step.completed && (
                <p className="mt-1 text-sm text-blue-600 font-medium">In Progress</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Generate timeline steps from order data
 */
export function generateTimelineSteps(
  status: string,
  dates: {
    created_at?: string;
    paid_at?: string;
    shipped_at?: string;
    delivered_at?: string;
  },
  labels: {
    placed: string;
    confirmed: string;
    shipped: string;
    delivered: string;
  }
): TimelineStep[] {
  const statusOrder = ['pending', 'paid', 'shipped', 'delivered', 'completed'];
  const currentIndex = statusOrder.indexOf(status);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  const steps: TimelineStep[] = [
    {
      key: 'pending',
      label: labels.placed,
      date: dates.created_at,
      completed: activeIndex >= 0,
      current: status === 'pending',
    },
    {
      key: 'paid',
      label: labels.confirmed,
      date: dates.paid_at,
      completed: activeIndex >= 1,
      current: status === 'paid',
    },
    {
      key: 'shipped',
      label: labels.shipped,
      date: dates.shipped_at,
      completed: activeIndex >= 2,
      current: status === 'shipped' || status === 'processing',
    },
    {
      key: 'delivered',
      label: labels.delivered,
      date: dates.delivered_at,
      completed: activeIndex >= 3 || status === 'completed',
      current: status === 'delivered' || status === 'completed',
    },
  ];

  return steps;
}

export default OrderTimeline;