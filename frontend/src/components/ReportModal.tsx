import { useState } from 'react';
import { communityApi } from '../lib/api';
import { X, Flag } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  targetUrl: string;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'PHISHING', label: 'Phishing Campaign' },
  { value: 'SCAM', label: 'Fraudulent Scam' },
  { value: 'FAKE_LOGIN', label: 'Fake Login Page' },
  { value: 'FAKE_SCHOLARSHIP', label: 'Fake Scholarship / Grant' },
  { value: 'FAKE_PAYMENT', label: 'Fake Payment / Quishing' },
  { value: 'MALWARE', label: 'Malware / Exploit Link' },
  { value: 'IMPERSONATION', label: 'Brand Impersonation' },
  { value: 'SUSPICIOUS_QR', label: 'Malicious QR Code' },
  { value: 'SUSPICIOUS_ADVERTISEMENT', label: 'Suspicious Advertisement' },
  { value: 'SUSPICIOUS_URL', label: 'Suspicious URL / Redirector' },
  { value: 'OTHER', label: 'Other Security Threat' },
];

export default function ReportModal({ targetUrl, onClose }: Props) {
  const [category, setCategory] = useState('PHISHING');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await communityApi.report({ targetUrl, category, description: description || undefined });
      toast.success('Report submitted. Thank you!');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to submit report';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Flag size={18} style={{ color: 'var(--color-risk-high)' }} />
            <h3 style={{ margin: 0 }}>Report URL</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="code-block mb-4" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
            {targetUrl.length > 100 ? targetUrl.slice(0, 100) + '…' : targetUrl}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-4">
              <label className="form-label">Category</label>
              <select
                id="report-category"
                className="form-input"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Description <span className="text-muted">(optional)</span></label>
              <textarea
                id="report-description"
                className="form-input"
                rows={3}
                maxLength={1000}
                placeholder="Describe why this is suspicious..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="flex gap-3">
              <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Submitting…</> : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
