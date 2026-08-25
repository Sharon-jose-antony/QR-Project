import React, { useEffect, useState } from 'react';
import { communityApi, authApi } from '../lib/api';
import type { CommunityData } from '../lib/api';
import {
  Users,
  Flag,
  BarChart2,
  ExternalLink,
  TrendingUp,
  Shield,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Search,
  Zap,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';

const RISK_COLOR: Record<string, string> = {
  LOW: 'var(--color-risk-low)',
  MEDIUM: 'var(--color-risk-medium)',
  HIGH: 'var(--color-risk-high)',
  CRITICAL: 'var(--color-risk-critical)',
};

const CATEGORY_LABELS: Record<string, string> = {
  SUSPICIOUS_URL: 'Suspicious URL',
  SUSPICIOUS_QR: 'Malicious QR Code',
  PHISHING: 'Phishing Campaign',
  FAKE_PAYMENT: 'Fake Payment / Quishing',
  IMPERSONATION: 'Brand Impersonation',
  SCAM: 'Fraudulent Scam',
  SUSPICIOUS_ADVERTISEMENT: 'Malvertising',
  OTHER: 'Other Threat',
};

const COMMUNITY_CODE_ITEMS = [
  {
    icon: <Shield size={18} style={{ color: 'var(--color-primary)' }} />,
    title: 'Responsible Disclosure & Rapid Defense',
    desc: 'All community threat intelligence is processed through automated risk pipelines to immediately protect global QRGuard users before attacks spread.',
  },
  {
    icon: <LockShieldIcon />,
    title: 'Zero-PII & Privacy-First Telemetry',
    desc: 'Submitted payloads are automatically scrubbed of personal query parameters, session tokens, and credentials prior to domain-level aggregation.',
  },
  {
    icon: <CheckCircle2 size={18} style={{ color: 'var(--color-risk-low)' }} />,
    title: 'Objective Heuristic Verification',
    desc: 'Reports require technical verification (DNS resolution, ASN mapping, redirect inspection, and AI heuristic scoring) to eliminate bias.',
  },
  {
    icon: <Users size={18} style={{ color: 'var(--color-accent)' }} />,
    title: 'Anti-Doxxing & False-Positive Contestation',
    desc: 'Legitimate webmasters can contest domain flags with automated dispute reassessments, ensuring fair and transparent community governance.',
  },
];

function LockShieldIcon() {
  return <Zap size={18} style={{ color: 'var(--color-warning)' }} />;
}

export default function CommunityPage() {
  const [data, setData] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'code' | 'submit'>('feed');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Submit report state
  const [user, setUser] = useState<any>(null);
  const [reportUrl, setReportUrl] = useState('');
  const [reportCategory, setReportCategory] = useState('PHISHING');
  const [reportDescription, setReportDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadCommunityData();
    authApi.me()
      .then(res => setUser(res.data.data.user))
      .catch(() => setUser(null));
  }, []);

  const loadCommunityData = () => {
    communityApi.get()
      .then(res => setData(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportUrl) return;

    setSubmitting(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      await communityApi.report({
        targetUrl: reportUrl,
        category: reportCategory,
        description: reportDescription || undefined,
      });

      setSubmitSuccess('Thank you! Your threat intelligence report has been submitted for automated heuristic verification.');
      setReportUrl('');
      setReportDescription('');
      loadCommunityData();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to submit report. Please ensure you are logged in.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <p className="text-secondary">Loading community intelligence feed…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page flex items-center justify-center">
        <div className="glass-card p-8 text-center" style={{ maxWidth: 400 }}>
          <Shield size={40} style={{ color: 'var(--color-risk-critical)', margin: '0 auto 1rem' }} />
          <h3>Could not load data</h3>
          <p className="text-secondary text-sm mt-2">Community data is unavailable right now.</p>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Filtered domains
  const filteredDomains = data.topDomains.filter(d => {
    const matchesSearch = d.hostname.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div className="section-tag">
            <Users size={12} /> Community Intelligence Network
          </div>
          <h1>Community Threat Defense</h1>
          <p className="text-secondary" style={{ maxWidth: 650 }}>
            Crowdsourced telemetry, real-time threat intelligence, and community-driven protection against malicious QR codes and deceptive links.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('feed')}
            className={`btn ${activeTab === 'feed' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            <BarChart2 size={14} /> Threat Radar
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`btn ${activeTab === 'code' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            <BookOpen size={14} /> Code of Community Ethics
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`btn ${activeTab === 'submit' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            <PlusCircle size={14} /> Submit Threat Report
          </button>
        </div>

        {/* Global Impact Stats */}
        <div className="grid-4 mb-8">
          {[
            { icon: <BarChart2 size={18} />, val: (data.stats.totalAnalyses || 0).toLocaleString(), label: 'URLs Analyzed' },
            { icon: <Flag size={18} />, val: (data.stats.totalReports || 0).toLocaleString(), label: 'Community Reports' },
            { icon: <TrendingUp size={18} />, val: data.topDomains.length.toLocaleString(), label: 'Flagged Domains' },
            { icon: <Globe size={18} />, val: '100% Verified', label: 'Telemetry Integrity' },
          ].map((s, i) => (
            <div key={i} className="glass-card p-4 text-center">
              <div style={{ color: 'var(--color-primary)', marginBottom: 8 }}>{s.icon}</div>
              <div className="stat-value-big">{s.val}</div>
              <div className="stat-label-big">{s.label}</div>
            </div>
          ))}
        </div>

        {/* TAB 1: THREAT RADAR FEED */}
        {activeTab === 'feed' && (
          <div>
            {/* Search & Filter Bar */}
            <div className="glass-card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 260 }}>
                <Search size={16} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search flagged domain (e.g. login-secure.com)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.4rem 0.75rem' }}
                />
              </div>
              <button
                onClick={() => setActiveTab('submit')}
                className="btn btn-primary btn-sm flex items-center gap-1"
              >
                <PlusCircle size={14} /> Report New Threat
              </button>
            </div>

            <div className="grid-2" style={{ gap: '2rem' }}>
              {/* Top Reported Domains */}
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div className="card-header flex justify-between items-center">
                  <h3>Flagged High-Risk Domains</h3>
                  <span className="text-xs text-muted">Real-time heuristics</span>
                </div>
                {filteredDomains.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">
                    {searchQuery ? 'No domains matched your search.' : 'No community-flagged domains yet.'}
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Domain</th>
                        <th>Risk</th>
                        <th>Reports</th>
                        <th>Scan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDomains.slice(0, 10).map((d, i) => (
                        <tr key={i}>
                          <td>
                            <span className="font-mono text-sm">{d.hostname}</span>
                          </td>
                          <td>
                            <span
                              className={`risk-badge ${d.riskLevel || 'LOW'}`}
                              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                            >
                              {d.riskLevel || 'SUSPICIOUS'}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm font-bold" style={{ color: RISK_COLOR[d.riskLevel] || 'inherit' }}>
                              {d.communityReportCount ?? (d as any).reportCount ?? 0}
                            </span>
                          </td>
                          <td>
                            <Link
                              to={`/analyze`}
                              state={{ url: `https://${d.hostname}` }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                              title="Re-verify domain in analyzer"
                            >
                              <ExternalLink size={11} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Threat Category Breakdown */}
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3>Threat Classification Distribution</h3>
                  <span className="text-xs text-muted">Aggregated categories</span>
                </div>
                {(!data.categoryStats || data.categoryStats.length === 0) ? (
                  <p className="text-muted text-sm text-center py-6">No threat classification telemetry recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {data.categoryStats.map((c: any, i) => {
                      const count = c._count?.category ?? c.count ?? 1;
                      const max = (data.categoryStats[0] as any)?._count?.category ?? (data.categoryStats[0] as any)?.count ?? 1;
                      const pct = Math.round((count / Math.max(max, 1)) * 100);
                      return (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{CATEGORY_LABELS[c.category] || c.category}</span>
                            <span className="text-xs font-mono text-muted">{count} incidents</span>
                          </div>
                          <div className="score-bar">
                            <div
                              className="score-bar-fill HIGH"
                              style={{
                                width: `${pct}%`,
                                background: i === 0 ? 'var(--color-risk-critical)' : 'var(--color-primary)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Community Feed */}
            {data.recentReports.length > 0 && (
              <div className="glass-card mt-8" style={{ overflow: 'hidden' }}>
                <div className="card-header flex justify-between items-center">
                  <h3>Recent Community Threat Submissions</h3>
                  <span className="badge badge-outline text-xs">Privacy-Scrubbed Telemetry</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Target Domain</th>
                      <th>Category</th>
                      <th>Verification Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentReports.map((r, i) => (
                      <tr key={i}>
                        <td className="font-mono text-sm">{r.targetDomain}</td>
                        <td>
                          <span className="indicator-pill">{CATEGORY_LABELS[r.category] || r.category}</span>
                        </td>
                        <td>
                          <span
                            className={`risk-badge ${r.status === 'CONFIRMED' ? 'CRITICAL' : 'MEDIUM'}`}
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                          >
                            {r.status === 'CONFIRMED' ? 'Verified Malicious' : 'Under Review'}
                          </span>
                        </td>
                        <td className="text-sm text-muted">
                          {new Date(r.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CODE OF COMMUNITY ETHICS */}
        {activeTab === 'code' && (
          <div>
            <div className="glass-card p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Shield size={28} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.4rem' }}>QRGuard Community Defense Protocol & Ethics</h2>
                  <p className="text-secondary text-sm">
                    Guiding principles ensuring crowdsourced security remains ethical, transparent, and legally sound.
                  </p>
                </div>
              </div>

              <div className="grid-2 mt-6" style={{ gap: '1.5rem' }}>
                {COMMUNITY_CODE_ITEMS.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {item.icon}
                      <h4 style={{ fontSize: '1rem' }}>{item.title}</h4>
                    </div>
                    <p className="text-secondary text-sm" style={{ lineHeight: 1.6 }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Tiers */}
            <div className="glass-card p-6">
              <h3 className="mb-4">Community Threat Verification Stages</h3>
              <div className="grid-3" style={{ gap: '1.25rem' }}>
                <div className="p-4" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="risk-badge CRITICAL" style={{ fontSize: '0.7rem' }}>VERIFIED</span>
                    <strong>Confirmed Threat</strong>
                  </div>
                  <p className="text-secondary text-xs">
                    Multi-source corroboration, confirmed malicious payload, or established credential phishing signatures.
                  </p>
                </div>
                <div className="p-4" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="risk-badge HIGH" style={{ fontSize: '0.7rem' }}>FLAGGED</span>
                    <strong>Community Alert</strong>
                  </div>
                  <p className="text-secondary text-xs">
                    Reported by community sentinels; undergoing sandbox and heuristic IP/DNS verification.
                  </p>
                </div>
                <div className="p-4" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="risk-badge LOW" style={{ fontSize: '0.7rem' }}>CLEAR</span>
                    <strong>Verified Safe / Cleared</strong>
                  </div>
                  <p className="text-secondary text-xs">
                    Analyzed destination verified clean or validated via successful false-positive contestation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUBMIT THREAT REPORT */}
        {activeTab === 'submit' && (
          <div className="glass-card p-8" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="flex items-center gap-3 mb-6">
              <Flag size={24} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h2>Submit Threat Intelligence</h2>
                <p className="text-secondary text-sm">
                  Report a suspicious QR code destination, phishing attack, or deceptive impersonation URL.
                </p>
              </div>
            </div>

            {submitSuccess && (
              <div className="p-4 mb-6 flex items-start gap-3" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-risk-low)', borderRadius: 8 }}>
                <CheckCircle2 size={20} style={{ color: 'var(--color-risk-low)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ color: 'var(--color-risk-low)', fontSize: '0.95rem' }}>Report Successfully Submitted</h4>
                  <p className="text-secondary text-xs mt-1">{submitSuccess}</p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="p-4 mb-6 flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-risk-critical)', borderRadius: 8 }}>
                <AlertTriangle size={20} style={{ color: 'var(--color-risk-critical)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ color: 'var(--color-risk-critical)', fontSize: '0.95rem' }}>Submission Failed</h4>
                  <p className="text-secondary text-xs mt-1">{submitError}</p>
                  {!user && (
                    <Link to="/login" className="btn btn-secondary btn-sm mt-3 inline-block">
                      Log In to Report
                    </Link>
                  )}
                </div>
              </div>
            )}

            {!user && (
              <div className="p-4 mb-6 flex items-center justify-between" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 8 }}>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Shield size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>Sign in to submit reports and earn Community Sentinel trust points.</span>
                </div>
                <Link to="/login" className="btn btn-primary btn-sm">
                  Sign In
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmitReport}>
              <div className="form-group mb-4">
                <label className="form-label font-medium">Suspicious Destination URL *</label>
                <input
                  type="url"
                  placeholder="https://malicious-login-target.com/verify"
                  value={reportUrl}
                  onChange={(e) => setReportUrl(e.target.value)}
                  className="input-field"
                  required
                  disabled={submitting}
                />
                <span className="text-xs text-muted mt-1 block">
                  Enter the full URL discovered inside the QR code or link.
                </span>
              </div>

              <div className="form-group mb-4">
                <label className="form-label font-medium">Threat Category *</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="input-field"
                  disabled={submitting}
                >
                  <option value="PHISHING">Phishing Campaign</option>
                  <option value="SUSPICIOUS_QR">Malicious QR Code (Quishing)</option>
                  <option value="FAKE_PAYMENT">Fake Payment / Invoicing</option>
                  <option value="IMPERSONATION">Brand Impersonation</option>
                  <option value="SUSPICIOUS_URL">Suspicious URL / Redirector</option>
                  <option value="SUSPICIOUS_ADVERTISEMENT">Malvertising / Popup</option>
                  <option value="SCAM">Fraudulent Scam</option>
                  <option value="OTHER">Other Security Threat</option>
                </select>
              </div>

              <div className="form-group mb-6">
                <label className="form-label font-medium">Description & Context (Optional)</label>
                <textarea
                  placeholder="Where did you encounter this QR code or link? (e.g. Physical parking meter sticker, phishing SMS, fake bank email)"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="input-field"
                  rows={4}
                  maxLength={1000}
                  disabled={submitting}
                />
                <span className="text-xs text-muted mt-1 block">
                  Max 1,000 characters. Personal info will be automatically filtered.
                </span>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-2"
                  disabled={submitting || !reportUrl}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      Submitting Report…
                    </>
                  ) : (
                    <>
                      <Flag size={16} />
                      Submit Threat Intelligence
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
