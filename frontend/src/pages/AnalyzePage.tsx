import { useState, useRef, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { urlApi } from '../lib/api';
import type { AnalysisResult } from '../lib/api';
import AnalysisCard from '../components/AnalysisCard';
import ReportModal from '../components/ReportModal';
import { Link2, Search, AlertCircle, X, Shield } from 'lucide-react';
import { sounds } from '../lib/soundEffects';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const EXAMPLES = [
  'https://google.com',
  'https://github.com',
  'http://tneb-bill-update-payment.xyz/pay',
  'http://127.0.0.1:3001/api/admin/users',
];

export default function AnalyzePage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check incoming URL from navigation state or query params (?url=...)
  useEffect(() => {
    const incomingUrl = location.state?.url || searchParams.get('url');
    if (incomingUrl && typeof incomingUrl === 'string') {
      setUrl(incomingUrl);
      executeAnalysis(incomingUrl);
    }
  }, [location.state, searchParams]);

  const executeAnalysis = async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) {
      toast.error('Please enter a URL to check');
      inputRef.current?.focus();
      return;
    }
    sounds.playScanBeam();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await urlApi.analyze(trimmed);
      const data = res.data.data;
      setResult(data);
      if (data.riskLevel === 'LOW' || data.riskScore < 25) {
        sounds.playSuccess();
      } else {
        sounds.playWarning();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        'Analysis failed. Please ensure the URL is valid.';
      setError(msg);
      toast.error(msg);
      sounds.playWarning();
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (e?: React.FormEvent) => {
    e?.preventDefault();
    executeAnalysis(url);
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 840 }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div className="section-tag">
            <Shield size={12} /> Digital Safety Gateway
          </div>
          <h1>Link &amp; Destination Check</h1>
          <p className="text-secondary" style={{ maxWidth: 520, margin: '0 auto' }}>
            Inspect any link before opening it. Scanzo verifies DNS, detects deceptive redirects, checks SSRF boundaries, and assesses community reputation.
          </p>
        </div>

        {/* Input form */}
        {!result && (
          <div className="animate-fade-up">
            <form onSubmit={handleAnalyze} className="url-form glass-card p-2">
              <div className="url-input-wrap">
                <Link2 size={18} className="url-input-icon" />
                <input
                  id="url-input"
                  ref={inputRef}
                  type="text"
                  className="url-input"
                  placeholder="Paste destination link (e.g. https://suspicious-domain.com/login)"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(null); }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {url && (
                  <button
                    type="button"
                    className="url-clear"
                    onClick={() => { setUrl(''); setResult(null); setError(null); }}
                    aria-label="Clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                id="analyze-btn"
                type="submit"
                className="btn btn-primary"
                disabled={loading || !url.trim()}
              >
                {loading ? (
                  <><span className="spinner" style={{ width: 16, height: 16 }} /> Checking…</>
                ) : (
                  <><Search size={16} /> Check Link</>
                )}
              </button>
            </form>

            {/* Quick test examples */}
            <div className="examples-row mt-4">
              <span className="text-xs text-muted font-medium">Quick Test:</span>
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  className="example-chip"
                  onClick={() => { setUrl(ex); executeAnalysis(ex); }}
                >
                  {ex.replace('https://', '').replace('http://', '').slice(0, 36)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-danger mt-4 animate-fade-up">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton Indicator */}
        {loading && (
          <div className="glass-card p-12 text-center my-6 animate-fade-up">
            <span className="spinner" style={{ width: 42, height: 42, borderWidth: 3, margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Running Multi-Stage Security Analysis…</h3>
            <p className="text-secondary text-xs mt-2 font-mono">
              DNS Resolution ➔ Pinned IP Classification ➔ SSRF Check ➔ Hop-by-Hop Redirect Inspection
            </p>
          </div>
        )}

        {/* Result Decision Card */}
        {result && (
          <div className="mt-4">
            <AnalysisCard
              result={result}
              onReport={() => setShowReport(true)}
              onGoBack={() => { setResult(null); setUrl(''); }}
            />
          </div>
        )}

        {/* Report modal */}
        {showReport && result && (
          <ReportModal
            targetUrl={result.url}
            onClose={() => setShowReport(false)}
          />
        )}

        {!user && !result && (
          <div className="alert alert-info mt-6">
            <Shield size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Community Protection:</strong> Logged-in users can save scans, track domain histories, and earn Community Sentinel trust scores.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
