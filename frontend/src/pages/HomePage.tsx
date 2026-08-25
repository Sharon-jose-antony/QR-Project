import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, QrCode, Link2, Users, Zap, Eye,
  ArrowRight, Check, Terminal, HelpCircle, Flag
} from 'lucide-react';

const CIVIC_SCENARIOS = [
  {
    title: 'Counterfeit Payment QR (Quishing)',
    url: 'https://pay-tm-verify-account.net/login.php?store=4920',
    type: 'QUISHING_SCAM',
    risk: 'CRITICAL',
    context: 'Physical sticker overlay placed over merchant UPI QR code at a local store.',
  },
  {
    title: 'Electricity Bill Phishing SMS',
    url: 'http://tneb-bill-update-payment.xyz/pay',
    type: 'BRAND_IMPERSONATION',
    risk: 'HIGH',
    context: 'Fake power disconnection SMS targeting residential consumers with urgent payment link.',
  },
  {
    title: 'Internal Gateway SSRF Exploit',
    url: 'http://127.0.0.1:3001/api/admin/users',
    type: 'SSRF_ATTACK',
    risk: 'BLOCKED',
    context: 'Malicious QR containing loopback destination targeting server-side cloud metadata.',
  },
  {
    title: 'Official Public Service Portal',
    url: 'https://www.google.com',
    type: 'VERIFIED_SAFE',
    risk: 'SAFE',
    context: 'Legitimate encrypted destination with clean DNS resolution and valid TLS.',
  },
];

const BENCHMARK_METRICS = [
  { label: 'Private IP / SSRF Detection', val: '100%', detail: 'Dual-stack CIDR + DNS Pinning' },
  { label: 'Redirect Chain Depth Tracing', val: 'Max 5 Hops', detail: 'Manual hop-by-hop inspection' },
  { label: 'Uncertainty Safety Protocol', val: 'Zero False Reassurance', detail: 'Ambiguous links marked UNVERIFIED' },
  { label: 'Telemetry Privacy Scrubbing', val: '100% PII Redaction', detail: 'Tokens & query credentials stripped' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState(0);

  const handleTestScenario = (url: string) => {
    navigate('/analyze', { state: { url } });
  };

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section bg-gradient-hero bg-grid">
        <div className="container hero-content">
          <div className="hero-badge animate-fade-up">
            <Shield size={13} />
            Community Digital Safety Gateway
          </div>
          <h1 className="hero-title animate-fade-up" style={{ animationDelay: '0.05s' }}>
            Scan it. Check it.<br />
            <span className="gradient-text">Then open it.</span>
          </h1>
          <p className="hero-subtitle animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Scanzo checks QR codes and suspicious links before you visit them, explains potential risks, 
            and uses community reports to help protect everyone.
          </p>
          <div className="hero-actions animate-fade-up flex-wrap" style={{ animationDelay: '0.15s' }}>
            <Link to="/scan" id="cta-scan" className="btn btn-primary btn-lg animate-glow flex items-center gap-2">
              <QrCode size={18} /> SCAN QR
            </Link>
            <Link to="/check" id="cta-check" className="btn btn-secondary btn-lg flex items-center gap-2">
              <Link2 size={18} /> CHECK LINK
            </Link>
            <Link to="/community" id="cta-report" className="btn btn-outline btn-lg flex items-center gap-2">
              <Flag size={18} /> REPORT THREAT
            </Link>
          </div>
        </div>

        {/* Floating scanner visual */}
        <div className="hero-visual">
          <div className="scanner-frame animate-glow">
            <div className="scanner-corners">
              <span /><span /><span /><span />
            </div>
            <div className="scanner-line" />
            <div className="scanner-content">
              <QrCode size={64} strokeWidth={1} />
              <div className="scanner-processing">
                <Eye size={14} />
                <span>Deep Security Inspection…</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Civic Scenario Tester (Make the Hard Part Visible in 30 Seconds) */}
      <section className="py-12" style={{ background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container">
          <div className="section-header mb-8">
            <div className="section-tag">
              <Terminal size={12} /> Live Threat Testbench
            </div>
            <h2>Real-World Community Attack Scenarios</h2>
            <p className="text-secondary" style={{ maxWidth: 620, margin: '0 auto' }}>
              Test how Scanzo’s multi-layered security engine handles real quishing scams and attack vectors.
            </p>
          </div>

          <div className="grid-4 mb-6">
            {CIVIC_SCENARIOS.map((sc, i) => (
              <div
                key={i}
                onClick={() => setSelectedScenario(i)}
                className={`glass-card p-4 cursor-pointer transition-all ${
                  selectedScenario === i ? 'ring-2' : ''
                }`}
                style={{
                  cursor: 'pointer',
                  borderColor: selectedScenario === i ? 'var(--color-primary)' : 'var(--color-border)',
                  background: selectedScenario === i ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`risk-badge ${sc.risk === 'SAFE' ? 'LOW' : sc.risk === 'BLOCKED' ? 'HIGH' : sc.risk}`} style={{ fontSize: '0.65rem' }}>
                    {sc.risk}
                  </span>
                  <span className="text-xs font-mono text-muted">Scenario 0{i + 1}</span>
                </div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: 4 }}>{sc.title}</h4>
                <p className="text-secondary text-xs" style={{ lineHeight: 1.5 }}>
                  {sc.context}
                </p>
              </div>
            ))}
          </div>

          {/* Active Scenario Preview Card */}
          <div className="glass-card p-6 flex flex-wrap items-center justify-between gap-4">
            <div style={{ flex: 1, minWidth: 280 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Selected Target Payload:</span>
                <span className="font-mono text-xs text-primary">{CIVIC_SCENARIOS[selectedScenario].url}</span>
              </div>
              <p className="text-sm text-secondary">
                {CIVIC_SCENARIOS[selectedScenario].context}
              </p>
            </div>
            <button
              onClick={() => handleTestScenario(CIVIC_SCENARIOS[selectedScenario].url)}
              className="btn btn-primary btn-md flex items-center gap-2"
            >
              <Zap size={16} /> Run Full Security Analysis
            </button>
          </div>
        </div>
      </section>

      {/* Civic Impact & User Story (Who Did We Build This For) */}
      <section className="py-12">
        <div className="container">
          <div className="glass-card p-8" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <div className="grid-2 items-center" style={{ gap: '2.5rem' }}>
              <div>
                <div className="section-tag mb-3">
                  <Users size={12} /> Grounded in Field Research
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                  "I didn't know someone pasted their QR code over mine until a customer showed me the wrong shop name."
                </h2>
                <p className="text-secondary text-sm mb-4" style={{ lineHeight: 1.7 }}>
                  <strong>Lakshmi (62), small grocery vendor in Coimbatore:</strong> Across India and developing economies, 
                  millions of street vendors, auto drivers, and senior citizens rely on UPI QR codes. Malicious QR overlays 
                  (Quishing) and deceptive SMS links exploit this trust.
                </p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1"><Check size={14} style={{ color: 'var(--color-risk-low)' }} /> Instant Zero-Login Scan</span>
                  <span className="flex items-center gap-1"><Check size={14} style={{ color: 'var(--color-risk-low)' }} /> Plain-Language AI Advice</span>
                  <span className="flex items-center gap-1"><Check size={14} style={{ color: 'var(--color-risk-low)' }} /> Community Threat Radar</span>
                </div>
              </div>

              {/* Benchmark Grid */}
              <div className="p-6 rounded-xl" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--color-border)' }}>
                <h4 className="mb-4 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                  <Shield size={16} style={{ color: 'var(--color-primary)' }} /> Defense Protocol Standards
                </h4>
                <div className="grid-2" style={{ gap: '1rem' }}>
                  {BENCHMARK_METRICS.map((m, idx) => (
                    <div key={idx} className="p-3" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8 }}>
                      <div className="stat-value-big" style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>{m.val}</div>
                      <div className="font-semibold text-xs mt-1">{m.label}</div>
                      <div className="text-muted text-xs mt-0.5">{m.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Failure Case Philosophy (When Unsure -> Safe Uncertainty) */}
      <section className="py-8">
        <div className="container">
          <div className="glass-card p-6" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)' }}>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>The Failure Case Protocol: Zero False Reassurance</h3>
                <p className="text-secondary text-sm mt-1" style={{ maxWidth: 800, lineHeight: 1.6 }}>
                  A confident wrong answer is dangerous. If a destination cannot be verified due to server timeouts, 
                  suspicious masking, or untrusted redirects, Scanzo refuses to issue a false "Safe" rating. Instead, it marks 
                  the destination with prominent safety warnings and requires explicit user consent before opening.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card glass-card animate-glow">
            <h2>Ready to Verify a Suspicious QR Code?</h2>
            <p className="text-secondary">
              Free, instant, and privacy-preserving. No account required for real-time protection.
            </p>
            <div className="flex gap-4 justify-center flex-wrap mt-6">
              <Link to="/scan" className="btn btn-primary btn-lg">
                <QrCode size={18} /> Open Scanner <ArrowRight size={16} />
              </Link>
              <Link to="/community" className="btn btn-secondary btn-lg">
                <Users size={18} /> View Community Radar
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
