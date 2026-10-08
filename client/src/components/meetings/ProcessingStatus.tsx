import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, Clock, RotateCcw } from 'lucide-react';
import { ProcessingJob } from '../../types';
import { Button } from '../ui/Button';

interface ProcessingStatusProps {
  job?: ProcessingJob;
  onRetry?: () => void;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ job, onRetry }) => {
  if (!job) return null;

  const { status, stage, retryCount } = job;

  // Compute status step flags
  const isTranscriptPending = status === 'TRANSCRIPT_PENDING';
  const isTranscriptDone = ['TRANSCRIPT_FETCHED', 'ANALYZING', 'COMPLETED'].includes(status);
  const isAnalyzing = status === 'ANALYZING';
  const isAnalysisDone = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-primary tracking-tight">AI Pipeline Processing</h4>
        <span className="text-xs text-secondary font-mono">
          {status === 'COMPLETED' ? '100%' : `${job.progress}%`}
        </span>
      </div>

      <div className="space-y-3">
        {/* Step 1: Meeting completed */}
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-primary">Meeting completed</p>
          </div>
        </div>

        {/* Step 2: Transcript availability & retrieval */}
        <div className="flex items-start gap-3">
          {isTranscriptDone ? (
            <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
          ) : isTranscriptPending ? (
            <Clock className="w-5 h-5 text-semantic-warning shrink-0 mt-0.5" />
          ) : (
            <Loader2 className="w-5 h-5 text-secondary animate-spin shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-primary">
                {isTranscriptDone ? 'Transcript received & normalized' : 'Checking transcript availability...'}
              </p>
            </div>
            {isTranscriptPending && (
              <div className="mt-2 p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-xs text-primary">
                <p className="font-semibold text-primary">Transcript not available yet.</p>
                <p className="text-[11px] mt-0.5 text-secondary">Google Meet is still finalizing the audio conference record.</p>
                {onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="mt-2.5 text-xs py-1 h-7 gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Check Again ({retryCount})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Gemini Analysis */}
        <div className="flex items-center gap-3">
          {isAnalysisDone ? (
            <CheckCircle2 className="w-5 h-5 text-accent-forest shrink-0" />
          ) : isAnalyzing ? (
            <Loader2 className="w-5 h-5 text-accent-violet animate-spin shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
            </div>
          )}
          <div className="flex-1">
            <p className={`text-xs font-semibold ${isAnalyzing ? 'text-primary' : isAnalysisDone ? 'text-primary' : 'text-secondary/60'}`}>
              {isAnalysisDone ? 'Analysis complete with Gemini' : isAnalyzing ? 'Analyzing meeting with Gemini...' : 'Analyze meeting'}
            </p>
          </div>
        </div>

        {/* Step 4: Action Items Extracted */}
        <div className="flex items-center gap-3">
          {isAnalysisDone ? (
            <CheckCircle2 className="w-5 h-5 text-accent-forest shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
            </div>
          )}
          <div className="flex-1">
            <p className={`text-xs font-semibold ${isAnalysisDone ? 'text-primary' : 'text-secondary/60'}`}>
              {isAnalysisDone ? 'Action items & to-dos generated' : 'Extract action items & personal to-dos'}
            </p>
          </div>
        </div>

        {/* Failure state */}
        {isFailed && (
          <div className="p-3.5 rounded-xl bg-accent-coral/10 border border-accent-coral/30 text-xs text-primary flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-accent-coral shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-primary">AI processing failed.</p>
              <p className="text-[11px] mt-0.5 text-secondary">{job.error || 'Unexpected error during extraction.'}</p>
              {onRetry && (
                <Button size="sm" variant="danger" onClick={onRetry} className="mt-2 text-xs py-1 h-7">
                  Retry Analysis
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border text-[11px] text-secondary flex items-center justify-between">
        <span>Current stage: {stage}</span>
      </div>
    </div>
  );
};
