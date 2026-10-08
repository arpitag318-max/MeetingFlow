import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Copy, Check, ExternalLink, HelpCircle, ShieldCheck, Layers } from 'lucide-react';

interface JiraOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: (authUrl: string) => void;
  initialRedirectUri?: string;
}

export const JiraOAuthModal: React.FC<JiraOAuthModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
  initialRedirectUri,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri] = useState(() => {
    if (initialRedirectUri && !initialRedirectUri.includes('localhost:5000')) {
      return initialRedirectUri;
    }
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (apiUrl && apiUrl.startsWith('http')) {
      return `${apiUrl.replace(/\/$/, '')}/api/jira/oauth/callback`;
    }
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return `${window.location.origin}/api/jira/oauth/callback`;
    }
    return initialRedirectUri || 'http://localhost:5000/api/jira/oauth/callback';
  });
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      error('Missing Credentials', 'Please enter both your Atlassian Client ID and Client Secret.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.jira.saveOAuthConfig({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUri: redirectUri.trim(),
      });

      success('Jira OAuth Configured', 'Credentials saved securely to server environment.');

      if (res.authUrl) {
        if (onConfigured) {
          onConfigured(res.authUrl);
        } else {
          window.location.href = res.authUrl;
        }
      } else {
        onClose();
      }
    } catch (err: any) {
      error('Configuration Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Atlassian Jira OAuth 2.0"
      description="Connect your Jira Cloud instance securely using official OAuth 2.0 (3LO) authorization."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Enterprise Security Banner */}
        <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE4DC] flex items-start gap-2.5 text-xs text-[#181D1A]">
          <ShieldCheck className="w-4 h-4 text-accent-forest shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Credentials are automatically encrypted and saved to the server environment. Secrets are never exposed to the frontend or client code.
          </span>
        </div>

        {/* 1. Authorized Redirect URI (Read-only with Copy) */}
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Authorized Redirect Callback URL (Required by Atlassian)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={redirectUri}
              className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary font-mono select-all"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-semantic-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-[11px] text-secondary mt-1">
            Add this exact callback URL under <strong>OAuth 2.0 (3LO) → Authorization</strong> in the Atlassian Developer Console.
          </p>
        </div>

        {/* 2. Atlassian Client ID */}
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Atlassian Client ID <span className="text-semantic-error">*</span>
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="e.g. 7X3kL9mOpQrStUvWxYz..."
            required
            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>

        {/* 3. Atlassian Client Secret */}
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Atlassian Client Secret <span className="text-semantic-error">*</span>
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="••••••••••••••••••••••••••••••••"
            required
            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>

        {/* Setup Guide Accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs text-secondary hover:text-primary flex items-center gap-1 font-medium transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-secondary" />
            {showGuide ? 'Hide instructions' : 'Where do I get Atlassian OAuth credentials?'}
          </button>

          {showGuide && (
            <div className="mt-2 p-3.5 rounded-xl bg-background border border-border text-xs text-secondary space-y-2 leading-relaxed">
              <p className="font-semibold text-primary">Quick Atlassian Cloud setup:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px]">
                <li>
                  Open{' '}
                  <a
                    href="https://developer.atlassian.com/console/myapps"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-primary inline-flex items-center gap-0.5"
                  >
                    Atlassian Developer Console <ExternalLink className="w-3 h-3" />
                  </a>
                  .
                </li>
                <li>Click <strong>Create</strong> → <strong>OAuth 2.0 (3LO) integration</strong> and enter an app name.</li>
                <li>Under <strong>Permissions</strong>, add <strong>Jira platform REST API</strong> (select <em>read:jira-user</em>, <em>read:jira-work</em>, <em>write:jira-work</em>).</li>
                <li>Under <strong>Authorization</strong>, paste the Callback URL: <code>{redirectUri}</code>.</li>
                <li>Under <strong>Settings</strong>, copy the <strong>Client ID</strong> & <strong>Secret</strong> and paste them above.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="font-semibold gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Save & Connect Jira
          </Button>
        </div>
      </form>
    </Modal>
  );
};
