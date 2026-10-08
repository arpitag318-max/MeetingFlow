import React, { useState } from 'react';
import { Search, UserCircle, Clock } from 'lucide-react';
import { TranscriptEntry } from '../../types';

interface TranscriptViewerProps {
  transcripts: TranscriptEntry[];
  highlightTimestamp?: string | null;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcripts,
  highlightTimestamp
}) => {
  const [search, setSearch] = useState('');

  const filtered = transcripts.filter(t =>
    t.speaker.toLowerCase().includes(search.toLowerCase()) ||
    t.text.toLowerCase().includes(search.toLowerCase()) ||
    t.timestamp.includes(search)
  );

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-border bg-surface-white flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transcript by speaker or quote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-primary placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-xs text-secondary font-mono">
          {filtered.length} entries
        </span>
      </div>

      {/* Transcript Timeline */}
      <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto p-4 space-y-4">
        {filtered.length === 0 ? (
          <p className="text-xs text-secondary text-center py-8">No transcript entries found matching search.</p>
        ) : (
          filtered.map((entry) => {
            const isHighlighted = highlightTimestamp && entry.timestamp === highlightTimestamp;

            return (
              <div
                key={entry.id}
                className={`pt-3 first:pt-0 transition-colors rounded-lg p-2.5 ${
                  isHighlighted ? 'bg-accent-amber/15 border border-accent-amber/35' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-semibold text-secondary flex items-center gap-1 bg-background px-2 py-0.5 rounded border border-border/70">
                    <Clock className="w-3 h-3 text-secondary/70" />
                    {entry.timestamp}
                  </span>
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <UserCircle className="w-3.5 h-3.5 text-secondary" />
                    {entry.speaker}
                  </span>
                </div>
                <blockquote className="text-sm text-primary/90 pl-3 border-l-2 border-border italic leading-relaxed">
                  "{entry.text}"
                </blockquote>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
