import React, { useEffect, useState } from 'react';
import { X, KeyRound, CheckCircle2, Loader2, Save } from 'lucide-react';
import { getElectronAPI } from '../utils/media';

interface SettingsModalProps {
  onClose: () => void;
  onSaved?: (hasKey: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSaved }) => {
  const api = getElectronAPI();
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [status, setStatus] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api?.settings?.get().then((s: any) => {
      setHasKey(!!s.hasOpenAIKey);
      setModel(s.openaiModel);
      if (!s.encryptionAvailable) {
        setStatus({ kind: 'info', text: 'Windows secure storage is unavailable; the key will be saved unencrypted.' });
      }
    });
  }, []);

  if (!api?.settings) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            <div className="notice">Settings are only available in the desktop app.</div>
          </div>
        </div>
      </div>
    );
  }

  const save = async () => {
    setBusy(true);
    setStatus(null);
    const updates: Record<string, string> = { openaiModel: model };
    if (keyInput.trim()) updates.openaiKey = keyInput.trim();
    const s = await api.settings.update(updates);
    setHasKey(!!s.hasOpenAIKey);
    setKeyInput('');
    onSaved?.(!!s.hasOpenAIKey);

    if (s.hasOpenAIKey) {
      const test = await api.ai.test();
      setStatus(
        test.success
          ? { kind: 'success', text: `Connected. Model "${test.model}" is available.` }
          : { kind: 'error', text: test.error }
      );
    } else {
      setStatus({ kind: 'info', text: 'Saved.' });
    }
    setBusy(false);
  };

  const removeKey = async () => {
    const s = await api.settings.update({ openaiKey: '' });
    setHasKey(!!s.hasOpenAIKey);
    onSaved?.(false);
    setStatus({ kind: 'info', text: 'API key removed.' });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={18} color="#818cf8" />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>AI Settings</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>OpenAI API Key</div>
            <input
              type="password"
              placeholder={hasKey ? '•••••••• (saved — type to replace)' : 'Enter OpenAI API Key (sk-...)'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoComplete="off"
            />
            <div className="lib-hint" style={{ marginTop: 6 }}>
              Stored safely on your computer and used for smart auto-editing.
            </div>
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>OpenAI Model</div>
            <input 
              type="text" 
              value={model} 
              onChange={(e) => setModel(e.target.value)} 
              placeholder="gpt-4o or gpt-4o-mini"
            />
            <div className="lib-hint" style={{ marginTop: 6 }}>
              Preferred model for auto-generating timeline cuts and style plans.
            </div>
          </div>

          {hasKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#a7f3d0' }}>
              <CheckCircle2 size={15} /> API key saved
              <button className="btn-secondary" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11 }} onClick={removeKey}>
                Remove key
              </button>
            </div>
          )}

          {status && <div className={`notice ${status.kind === 'info' ? '' : status.kind}`}>{status.text}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save & Test
          </button>
        </div>
      </div>
    </div>
  );
};
