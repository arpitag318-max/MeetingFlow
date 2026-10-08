import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Copy, Check, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: (authUrl: string) => void;
}

export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri] = useState(() => {
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (apiUrl && apiUrl.startsWith('http')) {
      return `${apiUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    }
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return `${window.location.origin}/api/auth/google/callback`;
    }
    return 'http://localhost:5000/api/auth/google/callback';
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
      error('Missing credentials', 'Please enter both Google Client ID and Google Client Secret.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.auth.saveGoogleConfig({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUri: redirectUri.trim(),
      });

      success('Google OAuth Configured', 'Credentials saved to server environment.');

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
      title="Configure Real Google OAuth"
      description="Connect live Google Workspace to fetch calendar meetings and Meet transcripts."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Security Note */}
        <div className="p-3 rounded-xl bg-pastel-sage/30 border border-[#BFD6C5] flex items-start gap-2.5 text-xs text-[#2C4A3A]">
          <ShieldCheck className="w-4 h-4 text-semantic-success shrink-0 mt-0.5" />
          <span>
            Credentials are saved to the server environment (<code>server/.env</code>) and are never exposed to client code.
          </span>
        </div>

        {/* 1. Authorized Redirect URI (Read-only with Copy) */}
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Authorized Redirect URI (Required by Google Cloud)
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
            Paste this exact URL into Google Cloud Console under <strong>Authorized redirect URIs</strong>.
          </p>
        </div>

        {/* 2. Google Client ID */}
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Google Client ID <span className="text-semantic-error">*</span>
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
            required
            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>

        {/* 3. Google Client Secret */}
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Google Client Secret <span className="text-semantic-error">*</span>
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
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
            {showGuide ? 'Hide instructions' : 'Where do I get Google OAuth credentials?'}
          </button>

          {showGuide && (
            <div className="mt-2 p-3.5 rounded-xl bg-background border border-border text-xs text-secondary space-y-2 leading-relaxed">
              <p className="font-semibold text-primary">3-step Google Cloud setup:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px]">
                <li>
                  Open{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-primary inline-flex items-center gap-0.5"
                  >
                    Google Cloud Credentials <ExternalLink className="w-3 h-3" />
                  </a>
                  .
                </li>
                <li>Click <strong>Create Credentials</strong> → <strong>OAuth client ID</strong> (Web application).</li>
                <li>Add <code>{redirectUri}</code> to <strong>Authorized redirect URIs</strong>.</li>
                <li>Copy the Client ID & Secret and paste them above.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="font-semibold">
            Save & Continue with Google
          </Button>
        </div>
      </form>
    </Modal>
  );
};
