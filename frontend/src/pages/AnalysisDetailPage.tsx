import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysesApi } from '../lib/api';
import AnalysisCard from '../components/AnalysisCard';
import { ArrowLeft, Loader } from 'lucide-react';

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    analysesApi.get(id)
      .then(res => setAnalysis(res.data.data.analysis))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <Link to="/history" className="btn btn-secondary btn-sm mb-6" style={{ display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Back to history
        </Link>

        {loading && (
          <div className="flex items-center justify-center p-12">
            <Loader size={32} className="spin-icon" />
          </div>
        )}

        {error && (
          <div className="glass-card p-8 text-center">
            <p className="text-secondary">Analysis not found or you don't have access.</p>
            <Link to="/history" className="btn btn-primary mt-4">Go to history</Link>
          </div>
        )}

        {analysis && (
          <AnalysisCard
            result={{
              id: analysis.id,
              url: analysis.url,
              domain: analysis.domain,
              scheme: analysis.scheme,
              riskScore: analysis.riskScore,
              riskLevel: analysis.riskLevel,
              redirectCount: analysis.redirectCount,
              indicators: analysis.indicators || [],
              recommendation: analysis.aiRecommend || 'No recommendation available.',
              riskFactors: analysis.riskAssessment?.factors || [],
              redirectChain: (analysis.redirects || []).map((r: any) => ({
                from: r.fromUrl,
                to: r.toUrl,
                blocked: r.wasBlocked,
                blockReason: r.blockReason,
              })),
              blocked: analysis.ssrfBlocked,
              aiSummary: analysis.aiSummary,
              aiRiskExplanation: analysis.aiRiskExplain,
              aiRecommendation: analysis.aiRecommend,
              communityReports: 0,
              status: analysis.status,
            }}
            onGoBack={() => window.history.back()}
          />
        )}
      </div>
    </div>
  );
}
