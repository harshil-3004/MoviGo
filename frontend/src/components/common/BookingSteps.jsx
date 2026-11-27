import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Showtime' },
  { id: 2, label: 'Seats' },
  { id: 3, label: 'Checkout' },
];

const BookingSteps = ({ currentStep = 1 }) => {
  return (
    <nav aria-label="Booking progress" className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--mg-success)'
                    : isCurrent
                      ? 'var(--mg-accent)'
                      : 'var(--mg-surface-2)',
                  color: isCompleted || isCurrent ? '#ffffff' : 'var(--mg-ink-3)',
                  border: isCompleted || isCurrent ? 'none' : '1px solid var(--mg-border)',
                }}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
              </span>
              <span
                className="text-xs font-semibold hidden sm:inline"
                style={{
                  color: isCurrent
                    ? 'var(--mg-ink)'
                    : isCompleted
                      ? 'var(--mg-ink-2)'
                      : 'var(--mg-ink-3)',
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="w-5 sm:w-8 h-px"
                style={{
                  backgroundColor: isCompleted ? 'var(--mg-success)' : 'var(--mg-border-strong)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default BookingSteps;
