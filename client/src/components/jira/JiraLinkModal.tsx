import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import {
  Layers,
  X,
  Search,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Link2,
  PlusCircle
} from 'lucide-react';

interface JiraIssueSummary {
  id: string;
  key: string;
  summary: string;
  status: string;
  statusCategory?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  url: string;
}

interface JiraLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionItemId: string;
  actionItemTitle: string;
  meetingId?: string;
  meetingTitle?: string;
  initialProjectKey?: string;
  // If triggered by duplicate check during creation
  duplicateMatch?: {
    matchType: 'EXISTING_ISSUE_MATCH' | 'CREATE_NEW_ISSUE';
    matchedIssue?: JiraIssueSummary;
    candidateIssues?: JiraIssueSummary[];
    confidence: number;
    reason: string;
  } | null;
  onLinked: (issueKey: string, issueUrl: string) => void;
  onProceedCreateNew?: () => void;
}

export const JiraLinkModal: React.FC<JiraLinkModalProps> = ({
  isOpen,
  onClose,
  actionItemId,
  actionItemTitle,
  meetingId,
  meetingTitle,
  initialProjectKey,
  duplicateMatch,
  onLinked,
  onProceedCreateNew
}) => {
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [searchResults, setSearchResults] = useState<JiraIssueSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // If duplicateMatch is provided, use candidate issues or matched issue as initial view
  useEffect(() => {
    if (duplicateMatch?.candidateIssues && duplicateMatch.candidateIssues.length > 0) {
      setSearchResults(duplicateMatch.candidateIssues);
      setHasSearched(true);
    } else if (isOpen && !duplicateMatch) {
      // Auto pre-populate search query with key terms from task
      const simplifiedQuery = actionItemTitle.slice(0, 40).trim();
      setSearchQuery(simplifiedQuery);
      handleSearch(simplifiedQuery);
    }
  }, [isOpen, duplicateMatch]);

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await api.jira.searchIssues(queryText.trim(), initialProjectKey);
      setSearchResults(res.issues || []);
    } catch (err: any) {
      error('Jira Search Failed', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkIssue = async (issueKey: string, issueUrl: string) => {
    setIsLinking(true);
    try {
      await api.jira.linkIssue({
        actionItemId,
        issueKey,
        meetingId,
        meetingTitle
      });

      success('Linked to Jira Issue', `Action item is now synced with ${issueKey}.`);
      onLinked(issueKey, issueUrl);
      onClose();
    } catch (err: any) {
      error('Failed to Link Jira Issue', err.message);
    } finally {
      setIsLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#EAE4DC] shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EAE4DC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF1EF] border border-[#FFD4CF] flex items-center justify-center text-[#E85555]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#181D1A]">
                {duplicateMatch ? 'Existing Jira Issue Detected' : 'Link to Jira Issue'}
              </h3>
              <p className="text-xs text-[#6B7280]">
                {duplicateMatch
                  ? 'Gemini evaluated this action item against your active Jira backlog'
                  : 'Search and link this meeting action item to an active Jira issue'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C948F] hover:text-[#181D1A] transition-colors p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Action Item Reference Context */}
          <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE4DC] text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Meeting Action Item
            </span>
            <p className="font-semibold text-[#181D1A] mt-0.5">{actionItemTitle}</p>
          </div>

          {/* Duplicate Match Alert Banner (if applicable) */}
          {duplicateMatch && (
            <div className="p-3.5 rounded-xl bg-[#FFF8E6] border border-[#FDE68A] flex items-start gap-2.5 text-xs text-[#92400E]">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Duplicate / Similar Work Identified</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3C7] border border-[#FCD34D] font-bold">
                    {Math.round(duplicateMatch.confidence * 100)}% match
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#78350F]">{duplicateMatch.reason}</p>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchQuery);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#8C948F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues by summary or key (e.g. PROJ-12)..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl text-[#181D1A] focus:outline-none focus:ring-1 focus:ring-[#E85555]"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              isLoading={isSearching}
              className="text-xs shrink-0"
            >
              Search
            </Button>
          </form>

          {/* Search Results / Candidate Issues List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#6B7280]">
              <span>Available Jira Issues ({searchResults.length})</span>
              {isSearching && (
                <span className="flex items-center gap-1 text-[#E85555]">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Searching...
                </span>
              )}
            </div>

            {searchResults.length === 0 && hasSearched && !isSearching ? (
              <div className="p-6 text-center border border-dashed border-[#EAE4DC] rounded-xl text-xs text-[#6B7280] space-y-1">
                <p className="font-semibold text-[#181D1A]">No matching Jira issues found</p>
                <p className="text-[11px]">Try modifying your search query or create a new issue instead.</p>
              </div>
            ) : null}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {searchResults.map((issue) => {
                const isMatchedPrimary = duplicateMatch?.matchedIssue?.key === issue.key;

                return (
                  <div
                    key={issue.id || issue.key}
                    className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-2 ${
                      isMatchedPrimary
                        ? 'border-[#D97706] bg-[#FFFDF5] shadow-xs'
                        : 'border-[#EAE4DC] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-[#181D1A] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#EAE4DC]">
                          {issue.key}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                          {issue.status}
                        </span>
                        {isMatchedPrimary && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Best Match
                          </span>
                        )}
                      </div>

                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6B7280] hover:text-[#181D1A] p-0.5 rounded transition-colors"
                        title="View in Jira"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <p className="font-semibold text-[#181D1A] text-xs leading-snug">{issue.summary}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F6] text-[11px] text-[#6B7280]">
                      <span>Assignee: <span className="font-medium text-[#181D1A]">{issue.assignee || 'Unassigned'}</span></span>
                      <Button
                        size="sm"
                        variant={isMatchedPrimary ? 'coral' : 'outline'}
                        onClick={() => handleLinkIssue(issue.key, issue.url)}
                        isLoading={isLinking}
                        className="text-xs h-7 px-2.5 gap-1"
                      >
                        <Link2 className="w-3 h-3" />
                        Link to This
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#EAE4DC] flex items-center justify-between gap-2 bg-[#FAF7F2]/50">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>

          {duplicateMatch && onProceedCreateNew && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onProceedCreateNew();
              }}
              className="text-xs gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Ignore & Create New Jira Issue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
