import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { Layers, X, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface JiraConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
  initialConfig?: any;
}

export const JiraConfigModal: React.FC<JiraConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  initialConfig
}) => {
  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Available options fetched directly from Jira Cloud
  const [projects, setProjects] = useState<Array<{ id: string; key: string; name: string; avatarUrl?: string }>>([]);
  const [issueTypes, setIssueTypes] = useState<Array<{ id: string; name: string; iconUrl?: string }>>([]);
  const [users, setUsers] = useState<Array<{ accountId: string; displayName: string; avatarUrl?: string }>>([]);

  // Selected form values
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProjectKey, setSelectedProjectKey] = useState('');
  const [selectedIssueTypeId, setSelectedIssueTypeId] = useState('');
  const [defaultPriority, setDefaultPriority] = useState('Medium');
  const [defaultAssignee, setDefaultAssignee] = useState('');
  const [defaultLabel, setDefaultLabel] = useState('meeting-action-item');

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const res = await api.jira.getProjects();
      setProjects(res.projects || []);

      if (res.projects && res.projects.length > 0) {
        const preselected = initialConfig?.projectId
          ? res.projects.find(p => p.id === initialConfig.projectId || p.key === initialConfig.projectKey)
          : res.projects[0];

        const targetProj = preselected || res.projects[0];
        setSelectedProjectId(targetProj.id);
        setSelectedProjectKey(targetProj.key);
        await loadProjectDetails(targetProj.id, targetProj.key);
      }
    } catch (err: any) {
      error('Failed to load Jira projects', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectDetails = async (projId: string, projKey: string) => {
    try {
      const [itRes, usersRes] = await Promise.all([
        api.jira.getIssueTypes(projId),
        api.jira.getUsers(projKey).catch(() => ({ users: [] }))
      ]);

      setIssueTypes(itRes.issueTypes || []);
      setUsers(usersRes.users || []);

      if (itRes.issueTypes && itRes.issueTypes.length > 0) {
        const preselectedType = initialConfig?.issueTypeId
          ? itRes.issueTypes.find(t => t.id === initialConfig.issueTypeId)
          : itRes.issueTypes.find(t => t.name.toLowerCase() === 'task' || t.name.toLowerCase() === 'story');

        setSelectedIssueTypeId(preselectedType ? preselectedType.id : itRes.issueTypes[0].id);
      }

      if (initialConfig?.defaultPriority) {
        setDefaultPriority(initialConfig.defaultPriority);
      }
      if (initialConfig?.defaultAssignee) {
        setDefaultAssignee(initialConfig.defaultAssignee);
      }
      if (initialConfig?.defaultLabel) {
        setDefaultLabel(initialConfig.defaultLabel);
      }
    } catch (err: any) {
      error('Failed to load project details', err.message);
    }
  };

  const handleProjectChange = async (newProjId: string) => {
    const proj = projects.find(p => p.id === newProjId);
    if (!proj) return;
    setSelectedProjectId(proj.id);
    setSelectedProjectKey(proj.key);
    await loadProjectDetails(proj.id, proj.key);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedProjectKey || !selectedIssueTypeId) {
      error('Incomplete Configuration', 'Please select both a Jira project and an issue type.');
      return;
    }

    setIsSaving(true);
    const chosenProj = projects.find(p => p.id === selectedProjectId);
    const chosenType = issueTypes.find(t => t.id === selectedIssueTypeId);
    const chosenUser = users.find(u => u.accountId === defaultAssignee);

    try {
      await api.jira.saveConfig({
        projectId: selectedProjectId,
        projectKey: selectedProjectKey,
        projectName: chosenProj?.name,
        projectAvatarUrl: chosenProj?.avatarUrl,
        issueTypeId: selectedIssueTypeId,
        issueTypeName: chosenType?.name,
        issueTypeIconUrl: chosenType?.iconUrl,
        defaultPriority,
        defaultAssignee: defaultAssignee || undefined,
        defaultAssigneeName: chosenUser?.displayName || undefined,
        defaultLabel
      });

      success('Jira Configured', `Default project set to ${selectedProjectKey} (${chosenType?.name || 'Task'}).`);
      onConfigSaved();
      onClose();
    } catch (err: any) {
      error('Failed to save Jira configuration', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#EAE4DC] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EAE4DC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF1EF] border border-[#FFD4CF] flex items-center justify-center text-[#E85555]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#181D1A]">Jira Cloud Configuration</h3>
              <p className="text-xs text-[#6B7280]">Select project and defaults for meeting action items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C948F] hover:text-[#181D1A] transition-colors p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#E85555] animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#6B7280]">Fetching Jira Cloud projects & metadata...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#D97706] mx-auto" />
            <h4 className="text-sm font-bold text-[#181D1A]">No Jira Projects Found</h4>
            <p className="text-xs text-[#6B7280]">
              Your authenticated Atlassian account does not have access to any projects in this site.
            </p>
            <Button size="sm" variant="outline" onClick={loadProjects}>
              Retry
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
            {/* 1. Project Selection */}
            <div>
              <label className="block text-xs font-bold text-[#181D1A] mb-1.5">
                Default Jira Project <span className="text-[#E85555]">*</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl text-[#181D1A] font-medium focus:outline-none focus:ring-1 focus:ring-[#E85555]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B7280] mt-1">
                New action items will be created within this Jira project.
              </p>
            </div>

            {/* 2. Issue Type */}
            <div>
              <label className="block text-xs font-bold text-[#181D1A] mb-1.5">
                Default Issue Type <span className="text-[#E85555]">*</span>
              </label>
              <select
                value={selectedIssueTypeId}
                onChange={(e) => setSelectedIssueTypeId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl text-[#181D1A] font-medium focus:outline-none focus:ring-1 focus:ring-[#E85555]"
              >
                {issueTypes.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B7280] mt-1">
                Dynamically retrieved from {selectedProjectKey}.
              </p>
            </div>

            {/* 3. Priority & Assignee Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#181D1A] mb-1.5">
                  Default Priority
                </label>
                <select
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl text-[#181D1A] font-medium focus:outline-none focus:ring-1 focus:ring-[#E85555]"
                >
                  <option value="Highest">Highest</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Lowest">Lowest</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#181D1A] mb-1.5">
                  Default Assignee
                </label>
                <select
                  value={defaultAssignee}
                  onChange={(e) => setDefaultAssignee(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl text-[#181D1A] font-medium focus:outline-none focus:ring-1 focus:ring-[#E85555]"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.accountId} value={u.accountId}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Default Label */}
            <div>
              <label className="block text-xs font-bold text-[#181D1A] mb-1.5">
                Default Label
              </label>
              <input
                type="text"
                value={defaultLabel}
                onChange={(e) => setDefaultLabel(e.target.value)}
                placeholder="e.g. meetingflow"
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl text-[#181D1A] font-mono focus:outline-none focus:ring-1 focus:ring-[#E85555]"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#EAE4DC] flex items-center justify-end gap-2.5">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="coral" size="sm" isLoading={isSaving} className="gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Save Jira Configuration
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
