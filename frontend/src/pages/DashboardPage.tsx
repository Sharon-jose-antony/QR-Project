import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { analysesApi } from '../lib/api';
import type { AnalysisHistoryItem } from '../lib/api';
import {
  BarChart2, QrCode, Link2, TrendingUp,
  Shield, Clock, ChevronRight, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

function RiskBadge({ level }: { level: string }) {
  return <span className={`risk-badge ${level}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{level}</span>;
}

function DashboardSkeleton() {
  return (
    <div className="page">
      <div className="container">
        {[0,1,2].map(i => (
          <div key={i} className="skeleton mb-4" style={{ height: 80, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysesApi.list(1, 50)
      .then(res => setAnalyses(res.data.data.analyses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  // Stats
  const total = analyses.length;
  const critical = analyses.filter(a => a.riskLevel === 'CRITICAL').length;
  const high = analyses.filter(a => a.riskLevel === 'HIGH').length;
  const blocked = analyses.filter(a => a.ssrfBlocked).length;
  const avgScore = total > 0
    ? Math.round(analyses.reduce((s, a) => s + a.riskScore, 0) / total)
    : 0;

  // Chart data — last 7 days
  const byDay: Record<string, { date: string; count: number; avgScore: number }> = {};
  analyses.forEach(a => {
    const day = new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!byDay[day]) byDay[day] = { date: day, count: 0, avgScore: 0 };
    byDay[day].count++;
    byDay[day].avgScore += a.riskScore;
  });
  const chartData = Object.values(byDay)
    .slice(-7)
    .map(d => ({ ...d, avgScore: Math.round(d.avgScore / d.count) }));

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header mb-8">
          <div>
            <h1>Dashboard</h1>
            <p className="text-secondary">Welcome back, <strong>{user?.username}</strong></p>
          </div>
          <div className="flex gap-3">
            <Link to="/scan" className="btn btn-primary btn-sm">
              <QrCode size={15} /> Scan QR
            </Link>
            <Link to="/analyze" className="btn btn-secondary btn-sm">
              <Link2 size={15} /> Analyze URL
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4 mb-8">
          {[
            { icon: <Activity size={18} />, val: total, label: 'Total Analyses', color: 'primary' },
            { icon: <Shield size={18} />, val: critical + high, label: 'High/Critical', color: 'danger' },
            { icon: <TrendingUp size={18} />, val: avgScore, label: 'Avg Risk Score', color: 'warning' },
            { icon: <BarChart2 size={18} />, val: blocked, label: 'Blocked', color: 'accent' },
          ].map((s, i) => (
            <div key={i} className={`glass-card p-5 dashboard-stat stat-${s.color}`}>
              <div className={`stat-icon-wrap stat-icon-${s.color}`}>{s.icon}</div>
              <div className="stat-number">{s.val}</div>
              <div className="text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="glass-card p-6 mb-8">
            <h3 className="mb-4">Scan Activity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#6366f1"
                  fill="url(#colorScore)"
                  strokeWidth={2}
                  name="Avg Risk Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent analyses */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <h3>Recent Analyses</h3>
            <Link to="/history" className="btn btn-secondary btn-sm">
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {analyses.length === 0 ? (
            <div className="p-8 text-center">
              <Shield size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
              <p className="text-secondary">No analyses yet.</p>
              <div className="flex gap-3 justify-center mt-4">
                <Link to="/scan" className="btn btn-primary btn-sm">Scan a QR</Link>
                <Link to="/analyze" className="btn btn-secondary btn-sm">Analyze a URL</Link>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Risk</th>
                  <th>Score</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {analyses.slice(0, 10).map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="font-mono text-sm truncate" style={{ maxWidth: 300 }} title={a.url}>
                        {a.url}
                      </div>
                    </td>
                    <td><RiskBadge level={a.riskLevel} /></td>
                    <td>
                      <span style={{ color: a.riskScore > 60 ? 'var(--color-risk-critical)' : 'var(--text-primary)' }}>
                        {a.riskScore}
                      </span>
                    </td>
                    <td className="text-sm text-muted flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(a.createdAt).toLocaleDateString()}
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
          )}
        </div>
      </div>
    </div>
  );
}
