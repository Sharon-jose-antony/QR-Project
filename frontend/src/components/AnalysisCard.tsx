import { useState, useEffect } from 'react';
import type { AnalysisResult } from '../lib/api';
import {
  AlertTriangle, XCircle, CheckCircle,
  ExternalLink, ChevronRight, Bot, Flag, Users,
  Lock, ArrowLeft, ChevronDown, ChevronUp, AlertOctagon, Shield,
  CheckCircle2, Sparkles, Pause, Play
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  result: AnalysisResult;
  onReport?: () => void;
  onGoBack?: () => void;
  autoOpenSafe?: boolean;
}

export default function AnalysisCard({ result, onReport, onGoBack, autoOpenSafe = true }: Props) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Auto-open countdown state for safe URLs
  const [countdown, setCountdown] = useState<number>(3);
  const [autoOpenPaused, setAutoOpenPaused] = useState<boolean>(false);
  const [hasAutoOpened, setHasAutoOpened] = useState<boolean>(false);

  const score = result.riskScore;
  const isSafe = score < 30 && !result.blocked;
  const isSuspicious = score >= 30 && score < 60 && !result.blocked;
  const isHighRisk = score >= 60 || result.blocked;

  const destinationUrl = result.finalUrl || result.url;

  const handleSafeOpen = () => {
    if (destinationUrl.startsWith('javascript:') || destinationUrl.startsWith('data:') || destinationUrl.startsWith('file:')) {
      toast.error('Cannot open dangerous URL scheme.');
      return;
    }
    window.open(destinationUrl, '_blank', 'noopener,noreferrer');
  };

  // Auto-open countdown effect when destination is verified safe
  useEffect(() => {
    if (!isSafe || !autoOpenSafe || autoOpenPaused || hasAutoOpened) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setHasAutoOpened(true);
      toast.success(`Opening verified safe website: ${result.domain}`, { icon: '🟢' });
      handleSafeOpen();
    }
  }, [isSafe, autoOpenSafe, countdown, autoOpenPaused, hasAutoOpened, destinationUrl, result.domain]);

  const handleOpenAnyway = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmOpen = () => {
    setShowConfirmModal(false);
    handleSafeOpen();
  };

  return (
    <div className="analysis-card glass-card animate-fade-up">
      {/* ── 1. GATEWAY DECISION BANNER ───────────────────────────────────────── */}
      <div className={`p-6 border-b ${
        isSafe ? 'bg-emerald-950/20 border-emerald-500/30' :
        isSuspicious ? 'bg-amber-950/20 border-amber-500/30' :
        'bg-rose-950/20 border-rose-500/30'
      }`} style={{ borderRadius: '12px 12px 0 0' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              isSafe ? 'bg-emerald-500/20 text-emerald-400' :
              isSuspicious ? 'bg-amber-500/20 text-amber-400' :
              'bg-rose-500/20 text-rose-400'
            }`}>
              {isSafe && <CheckCircle size={28} />}
              {isSuspicious && <AlertTriangle size={28} />}
              {isHighRisk && <AlertOctagon size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`risk-badge ${isSafe ? 'LOW' : isSuspicious ? 'MEDIUM' : 'CRITICAL'}`}>
                  {isSafe ? '🟢 VERIFIED SAFE' : isSuspicious ? '🟡 SUSPICIOUS LINK' : '🔴 HIGH RISK / BLOCKED'}
                </span>
                {result.communityReports > 0 && (
                  <span className="community-flag">
                    <Flag size={11} /> {result.communityReports} Community Flags
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold mt-1">
                {isSafe && 'Destination verified safe to open.'}
                {isSuspicious && `QRGuard detected ${result.indicators.length || 1} indicators that may indicate this link is unsafe.`}
                {isHighRisk && (result.blocked ? 'QRGuard blocked this destination before connection.' : 'High probability of malicious intent, phishing, or fraud.')}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted">Risk Score</div>
            <div className={`text-2xl font-bold font-mono ${
              isSafe ? 'text-emerald-400' : isSuspicious ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {score}<span className="text-xs text-muted">/100</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="score-bar mt-4">
          <div
            className={`score-bar-fill ${isSafe ? 'LOW' : isSuspicious ? 'MEDIUM' : 'CRITICAL'}`}
            style={{ width: `${Math.max(score, 5)}%` }}
          />
        </div>
      </div>

      {/* ── 2. AUTO-OPEN POPUP BANNER FOR SAFE DESTINATIONS ──────────────────── */}
      {isSafe && (
        <div className="p-4 mx-6 mt-6 rounded-xl flex flex-wrap items-center justify-between gap-4"
             style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-emerald-400 text-sm">Verified URL Auto-Open</strong>
                <span className="badge badge-outline text-xs text-emerald-300">Clean DNS &amp; TLS</span>
              </div>
              <p className="text-secondary text-xs mt-0.5">
                {hasAutoOpened
                  ? 'Website was opened in a new tab.'
                  : autoOpenPaused
                  ? 'Auto-open paused. Click "Open Website" whenever you are ready.'
                  : `Opening verified destination automatically in ${countdown}s…`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!hasAutoOpened && (
              <button
                type="button"
                onClick={() => setAutoOpenPaused(v => !v)}
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
              >
                {autoOpenPaused ? <><Play size={13} /> Resume Timer</> : <><Pause size={13} /> Pause</>}
              </button>
            )}
            <button
              type="button"
              onClick={handleSafeOpen}
              className="btn btn-primary btn-sm flex items-center gap-1.5 animate-glow"
            >
              <ExternalLink size={14} /> Open Website Now
            </button>
          </div>
        </div>
      )}

      {/* ── 3. EXPLICIT YES/NO PERMISSION PROMPT FOR UNSAFE / SUSPICIOUS LINKS ─ */}
      {(isSuspicious || isHighRisk) && (
        <div className="p-5 mx-6 mt-6 rounded-xl"
             style={{
               background: isSuspicious ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
               border: `1px solid ${isSuspicious ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
             }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={18} style={{ color: isSuspicious ? 'var(--color-warning)' : 'var(--color-risk-critical)' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', color: isSuspicious ? 'var(--color-warning)' : 'var(--color-risk-critical)' }}>
                  Permission Required: Do you want to visit this website?
                </h4>
              </div>
              <p className="text-secondary text-xs mt-1" style={{ maxWidth: 600, lineHeight: 1.5 }}>
                QRGuard detected security anomalies on this link ({score}/100 Risk Score). Visiting unknown or flagged 
                destinations may expose you to login credential theft, malware downloads, or payment scams.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onGoBack && (
                <button
                  type="button"
                  onClick={onGoBack}
                  className="btn btn-secondary btn-md flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <XCircle size={16} /> No, Keep Me Safe
                </button>
              )}
              {!result.blocked && (
                <button
                  type="button"
                  onClick={handleOpenAnyway}
                  className="btn btn-outline btn-md flex items-center gap-1.5"
                  style={{
                    borderColor: isSuspicious ? 'var(--color-warning)' : 'var(--color-risk-critical)',
                    color: isSuspicious ? 'var(--color-warning)' : 'var(--color-risk-critical)'
                  }}
                >
                  <AlertOctagon size={16} /> Yes, Proceed (Caution)
                </button>
              )}
              {result.blocked && (
                <span className="badge badge-outline text-xs text-danger flex items-center gap-1">
                  <XCircle size={12} /> Server Blocked SSRF
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. DESTINATION INFORMATION ────────────────────────────────────────── */}
      <div className="p-6">
        <div className="mb-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
            Destination URL (Inspected)
          </label>
          <div className="p-3 rounded-lg font-mono text-sm break-all flex items-center justify-between gap-2"
               style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--color-border)' }}>
            <span className="text-primary">{result.url}</span>
            <span className="text-xs text-muted flex-shrink-0">{result.scheme.toUpperCase()}</span>
          </div>
        </div>

        {/* AI & Security Summary */}
        {result.aiSummary && (
          <div className="ai-summary-block mb-6">
            <div className="ai-label">
              <Bot size={14} /> AI Plain-Language Explanation
            </div>
            <p className="ai-text">{result.aiSummary}</p>
          </div>
        )}

        {/* Core Security Stats Grid */}
        <div className="stats-grid mb-6">
          <div className="stat-item">
            <span className="stat-label">Domain</span>
            <span className="stat-value font-mono text-sm">{result.domain}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Encryption (TLS)</span>
            <span className={`stat-value flex items-center gap-1 ${result.scheme === 'https' ? 'text-success' : 'text-warning'}`}>
              <Lock size={12} /> {result.scheme === 'https' ? 'HTTPS Encrypted' : 'Unencrypted HTTP'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Redirect Hops</span>
            <span className={`stat-value ${result.redirectCount > 2 ? 'text-warning' : ''}`}>
              {result.redirectCount} {result.redirectCount === 1 ? 'Hop' : 'Hops'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Community Reputation</span>
            <span className="stat-value flex items-center gap-1">
              <Users size={12} /> {result.communityReports} Flags
            </span>
          </div>
        </div>

        {/* Risk Indicators / Why it was flagged */}
        {result.indicators.length > 0 && (
          <div className="mb-6">
            <h5 className="section-subtitle mb-2">Security Indicators Detected ({result.indicators.length})</h5>
            <div className="flex flex-col gap-2">
              {result.indicators.map((ind, i) => (
                <div key={i} className="p-2.5 rounded flex items-center gap-2 text-sm"
                     style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                  <span>{ind}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redirect chain */}
        {result.redirectChain.length > 0 && (
          <div className="mb-6">
            <h5 className="section-subtitle mb-2">Redirect Trace Path</h5>
            <div className="flex flex-col gap-2">
              {result.redirectChain.map((step, i) => (
                <div key={i} className="p-2.5 rounded flex items-center gap-2 text-xs font-mono"
                     style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--color-border)' }}>
                  <span className="text-muted">Hop {i + 1}:</span>
                  <span className="truncate" style={{ maxWidth: '40%' }}>{step.from}</span>
                  <ChevronRight size={14} className="text-muted flex-shrink-0" />
                  <span className="text-primary truncate" style={{ maxWidth: '40%' }}>{step.to}</span>
                  <span className="ml-auto badge badge-outline">{step.statusCode}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. SECONDARY ACTIONS ────────────────────────────────────────────── */}
        <div className="p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 mt-6"
             style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            {onGoBack && (
              <button onClick={onGoBack} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                <ArrowLeft size={15} /> Check Another
              </button>
            )}
            {onReport && (
              <button onClick={onReport} className="btn btn-outline btn-sm flex items-center gap-1.5" title="Report this link to the community">
                <Flag size={14} /> Report This Link
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted flex items-center gap-1">
              <CheckCircle2 size={13} style={{ color: 'var(--color-risk-low)' }} /> QRGuard Gateway Verified
            </span>
          </div>
        </div>

        {/* ── 6. TECHNICAL SECURITY DETAILS ACCORDION ─────────────────────────── */}
        <div className="mt-8 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setShowTechDetails(v => !v)}
            className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <Shield size={14} /> Technical Security Details (Reviewer / Audit View)
            </span>
            {showTechDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTechDetails && (
            <div className="mt-4 p-4 rounded-lg text-xs font-mono space-y-2.5"
                 style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--color-border)' }}>
              <div className="flex justify-between">
                <span className="text-muted">SSRF Protection:</span>
                <span className="text-emerald-400">Enforced (Dual-Stack RFC1918/6598/Link-Local/Metadata CIDR)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">DNS Pinning:</span>
                <span className="text-emerald-400">Enabled (Direct Socket Bind to Resolved IP)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Scheme Validation:</span>
                <span className="text-emerald-400">Strict HTTP/HTTPS Allowlist</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Redirect Policy:</span>
                <span className="text-emerald-400">Manual Hop Validation (Max 5, Public-to-Private Blocked)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Buffer &amp; Time Limits:</span>
                <span className="text-emerald-400">1MB Max Body, 10,000ms Timeout</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Resolved IP(s):</span>
                <span className="text-primary">{result.resolvedIPs?.join(', ') || 'Classified Pre-Socket'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Analysis Status:</span>
                <span className="text-primary">{result.status || 'COMPLETED'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 7. "OPEN ANYWAY" CONFIRMATION MODAL FOR UNSAFE DESTINATIONS ──────── */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-rose-500/20 text-rose-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Proceed to Unsafe Website?</h3>
                <span className="text-xs text-muted">Explicit Security Consent Required</span>
              </div>
            </div>

            <p className="text-secondary text-sm mb-4" style={{ lineHeight: 1.6 }}>
              This destination has been flagged as <strong>{result.riskLevel}</strong> risk ({result.riskScore}/100). 
              Opening it may expose your device to credential phishing, malware downloads, or payment fraud.
            </p>

            <div className="p-3 rounded font-mono text-xs break-all mb-6 text-primary"
                 style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--color-border)' }}>
              {destinationUrl}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary flex-1"
              >
                No, Stay Safe
              </button>
              <button
                type="button"
                onClick={handleConfirmOpen}
                className="btn btn-primary flex-1 text-danger"
                style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'var(--color-risk-critical)' }}
              >
                Yes, Open Website
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
