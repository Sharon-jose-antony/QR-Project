import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analysesApi } from '../lib/api';
import type { AnalysisHistoryItem } from '../lib/api';
import { History, ChevronRight, Clock, ChevronLeft, Shield } from 'lucide-react';

function RiskBadge({ level }: { level: string }) {
  return <span className={`risk-badge ${level}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{level}</span>;
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; pages: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    analysesApi.list(page, 20)
      .then(res => {
        setAnalyses(res.data.data.analyses);
        setMeta(res.data.meta);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="page">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <div className="section-tag" style={{ display: 'inline-flex' }}>
            <History size={12} /> Analysis History
          </div>
          <h1>Your Scan History</h1>
          {meta && (
            <p className="text-secondary">{meta.total.toLocaleString()} total analyses</p>
          )}
        </div>

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div className="p-8 flex justify-center">
              <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            </div>
          ) : analyses.length === 0 ? (
            <div className="p-8 text-center">
              <Shield size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
              <p className="text-secondary">No analyses yet.</p>
              <div className="flex gap-3 justify-center mt-4">
                <Link to="/scan" className="btn btn-primary btn-sm">Scan a QR code</Link>
                <Link to="/analyze" className="btn btn-secondary btn-sm">Analyze a URL</Link>
              </div>
            </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>URL / Domain</th>
                    <th>Risk</th>
                    <th>Score</th>
                    <th>Redirects</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div>
                          <div
                            className="font-mono text-sm truncate"
                            style={{ maxWidth: 280 }}
                            title={a.url}
                          >
                            {a.url}
                          </div>
                          <div className="text-xs text-muted">{a.domain}</div>
                        </div>
                      </td>
                      <td><RiskBadge level={a.riskLevel} /></td>
                      <td>
                        <span style={{
                          color: a.riskScore > 70 ? 'var(--color-risk-critical)'
                            : a.riskScore > 40 ? 'var(--color-risk-high)'
                            : 'var(--text-primary)'
                        }}>
                          {a.riskScore}
                        </span>
                      </td>
                      <td className="text-sm">{a.redirectCount}</td>
                      <td>
                        <span className={`indicator-pill ${a.ssrfBlocked ? 'text-warning' : ''}`}
                          style={{ fontSize: '0.75rem' }}>
                          {a.ssrfBlocked ? 'BLOCKED' : a.status}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm text-muted flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(a.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <Link to={`/analyses/${a.id}`} className="btn btn-secondary btn-sm">
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {meta && meta.pages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span className="text-sm text-muted">
                    Page {page} of {meta.pages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page === meta.pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
