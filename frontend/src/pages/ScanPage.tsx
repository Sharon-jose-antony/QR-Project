import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import jsQR from 'jsqr';
import { qrApi, urlApi } from '../lib/api';
import type { QrAnalysisResult, AnalysisResult } from '../lib/api';
import AnalysisCard from '../components/AnalysisCard';
import ReportModal from '../components/ReportModal';
import {
  QrCode, Upload, ImageIcon, X, AlertCircle, Camera,
  VideoOff, RefreshCw, Shield, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function ScanPage() {
  const { user } = useAuth();
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Analysis result state
  const [loading, setLoading] = useState(false);
  const [analyzingMessage, setAnalyzingMessage] = useState<string>('Analyzing QR Code…');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rawPayload, setRawPayload] = useState<string | null>(null);
  const [payloadType, setPayloadType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // ── 1. Camera Lifecycle & Scanning Loop ──────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleDecodedQR = useCallback(async (decodedText: string) => {
    stopCamera();
    setRawPayload(decodedText);
    setLoading(true);
    setError(null);
    setResult(null);

    // Check if payload is a URL
    const isUrl = /^https?:\/\//i.test(decodedText.trim());
    if (isUrl) {
      setPayloadType('URL');
      setAnalyzingMessage('Inspecting decoded URL destination…');
      try {
        const res = await urlApi.analyze(decodedText.trim());
        setResult(res.data.data);
      } catch (err: any) {
        const msg = err?.response?.data?.error?.message || 'Security analysis failed for decoded URL.';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    } else {
      setPayloadType('TEXT / UPI');
      setLoading(false);
    }
  }, [stopCamera]);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data && code.data.trim()) {
        // QR Code detected
        toast.success('QR Code detected!');
        handleDecodedQR(code.data);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleDecodedQR]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraActive(true);
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      console.error('Camera access error:', err);
      const msg = err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings or use image upload.'
        : 'Could not start camera. Please check camera hardware or switch to file upload.';
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [facingMode, scanFrame]);

  // Auto-start camera when in camera mode and no result
  useEffect(() => {
    if (scanMode === 'camera' && !result && !loading && !rawPayload) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scanMode, result, loading, rawPayload, startCamera, stopCamera]);

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // ── 2. File Upload Handling ──────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setRawPayload(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [], 'image/gif': [], 'image/webp': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDropRejected: () => toast.error('Invalid file. Use PNG, JPG, GIF or WebP under 5MB.'),
  });

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setRawPayload(null);
    setPayloadType(null);
    setError(null);
    if (scanMode === 'camera') {
      startCamera();
    }
  };

  const handleUploadScan = async () => {
    if (!file) return;
    setLoading(true);
    setAnalyzingMessage('Decoding QR image & running security gateway…');
    setError(null);
    setResult(null);
    setRawPayload(null);

    try {
      const res = await qrApi.analyze(file);
      const data: QrAnalysisResult = res.data.data;
      setRawPayload(data.payload);
      setPayloadType(data.payloadType);
      if (data.analysis) {
        setResult(data.analysis);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Scan failed. Please verify that the image contains a clear QR code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 840 }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '1.75rem' }}>
          <div className="section-tag">
            <QrCode size={12} /> Digital Safety Gateway
          </div>
          <h1>QR Code Security Scanner</h1>
          <p className="text-secondary">
            Scan using your camera or upload an image. QRGuard inspects the decoded destination before you open it.
          </p>
        </div>

        {/* Scan Mode Toggle */}
        {!result && !rawPayload && (
          <div className="flex gap-2 mb-6 justify-center">
            <button
              onClick={() => { setScanMode('camera'); clearAll(); }}
              className={`btn ${scanMode === 'camera' ? 'btn-primary' : 'btn-secondary'} btn-md flex items-center gap-2`}
            >
              <Camera size={16} /> Live Camera Scanner
            </button>
            <button
              onClick={() => { setScanMode('upload'); clearAll(); }}
              className={`btn ${scanMode === 'upload' ? 'btn-primary' : 'btn-secondary'} btn-md flex items-center gap-2`}
            >
              <Upload size={16} /> Upload QR Image
            </button>
          </div>
        )}

        {/* ── CAMERA SCANNER VIEW ────────────────────────────────────────────── */}
        {scanMode === 'camera' && !result && !rawPayload && !loading && (
          <div className="glass-card p-4 animate-fade-up" style={{ maxWidth: 640, margin: '0 auto', overflow: 'hidden' }}>
            <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center"
                 style={{ minHeight: 380, position: 'relative' }}>
              {/* Live Video Element */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ width: '100%', height: 380, display: cameraActive ? 'block' : 'none' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Viewfinder overlay */}
              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                     style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  <div className="scanner-frame" style={{ width: 240, height: 240, margin: 'auto' }}>
                    <div className="scanner-corners">
                      <span /><span /><span /><span />
                    </div>
                    <div className="scanner-line" />
                  </div>
                </div>
              )}

              {/* Camera Offline / Permission Error State */}
              {!cameraActive && (
                <div className="p-8 text-center text-secondary flex flex-col items-center gap-3">
                  <VideoOff size={44} style={{ color: 'var(--color-warning)' }} />
                  <h4>Camera Inactive</h4>
                  <p className="text-xs text-muted" style={{ maxWidth: 360 }}>
                    {cameraError || 'Camera is currently off. Click below to grant access and start live scanning.'}
                  </p>
                  <button onClick={startCamera} className="btn btn-primary btn-sm flex items-center gap-2 mt-2">
                    <Camera size={14} /> Enable Camera
                  </button>
                </div>
              )}
            </div>

            {/* Camera controls footer */}
            <div className="flex items-center justify-between p-3 mt-2">
              <div className="flex items-center gap-2 text-xs text-secondary">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{cameraActive ? 'Point camera at any QR code' : 'Camera standby'}</span>
              </div>
              {cameraActive && (
                <div className="flex gap-2">
                  <button
                    onClick={toggleCameraFacing}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    title="Switch Camera (Front/Back)"
                  >
                    <RefreshCw size={13} /> Switch Camera
                  </button>
                  <button
                    onClick={stopCamera}
                    className="btn btn-outline btn-sm flex items-center gap-1.5 text-danger"
                  >
                    <VideoOff size={13} /> Pause
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FILE UPLOAD VIEW ───────────────────────────────────────────────── */}
        {scanMode === 'upload' && !result && !rawPayload && !loading && (
          <div>
            {!preview ? (
              <div
                {...getRootProps()}
                id="qr-dropzone"
                className={`dropzone glass-card ${isDragActive ? 'drag-active' : ''}`}
              >
                <input {...getInputProps()} id="qr-file-input" />
                <div className="dropzone-inner">
                  <div className="dropzone-icon">
                    {isDragActive ? <Upload size={40} /> : <ImageIcon size={40} />}
                  </div>
                  <h3>{isDragActive ? 'Drop image here!' : 'Drop QR code image'}</h3>
                  <p className="text-secondary text-sm">
                    PNG, JPG, GIF or WebP · Max 5MB · Signature Verified
                  </p>
                  <button type="button" className="btn btn-primary mt-4 flex items-center gap-2">
                    <Upload size={16} /> Browse Files
                  </button>
                </div>
              </div>
            ) : (
              <div className="preview-card glass-card animate-fade-up">
                <div className="preview-header">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} />
                    <span className="text-sm">{file?.name}</span>
                  </div>
                  <button className="btn-icon btn-secondary btn btn-sm" onClick={clearAll} aria-label="Remove">
                    <X size={16} />
                  </button>
                </div>
                <div className="preview-img-wrap">
                  <img src={preview} alt="QR code preview" className="preview-img" />
                </div>
                <div className="preview-actions">
                  <button
                    id="scan-btn"
                    className="btn btn-primary w-full btn-lg flex items-center justify-center gap-2"
                    onClick={handleUploadScan}
                    disabled={loading}
                  >
                    <QrCode size={18} /> Inspect QR Code
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="glass-card p-12 text-center my-6 animate-fade-up">
            <span className="spinner" style={{ width: 42, height: 42, borderWidth: 3, margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem' }}>{analyzingMessage}</h3>
            <p className="text-secondary text-xs mt-2 font-mono">
              Decoding Matrix ➔ SSRF Gateway ➔ DNS Resolution ➔ Redirect Trace
            </p>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="alert alert-danger mt-4 animate-fade-up flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button onClick={clearAll} className="btn btn-secondary btn-sm">Try Again</button>
          </div>
        )}

        {/* Decoded Plain Text / Non-URL Payload Result */}
        {rawPayload && payloadType !== 'URL' && !loading && (
          <div className="glass-card p-8 mt-6 animate-fade-up">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={22} style={{ color: 'var(--color-risk-low)' }} />
              <h3 style={{ margin: 0 }}>QR Code Decoded (Non-Web Destination)</h3>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
              Decoded Content ({payloadType})
            </label>
            <div className="code-block p-4 font-mono text-sm break-all mb-4" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
              {rawPayload}
            </div>
            <div className="flex justify-between items-center mt-6">
              <span className="badge badge-outline text-xs">No External Web Redirects</span>
              <button onClick={clearAll} className="btn btn-primary btn-sm flex items-center gap-2">
                <QrCode size={14} /> Scan Another QR
              </button>
            </div>
          </div>
        )}

        {/* URL Analysis Result Gateway */}
        {result && (
          <div className="mt-6">
            <AnalysisCard
              result={result}
              onReport={() => setShowReport(true)}
              onGoBack={clearAll}
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

        {/* Sample Test QR Codes Tray */}
        {!result && !rawPayload && !loading && (
          <div className="glass-card p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Sample Test QR Codes (Scan or Click to Test)</h3>
                <p className="text-secondary text-xs mt-0.5">
                  Point your camera at these QR codes on your screen or click "Test URL" to test gateway detections.
                </p>
              </div>
              <span className="badge badge-outline text-xs">Security Testbench</span>
            </div>

            <div className="grid-2" style={{ gap: '1rem' }}>
              {[
                {
                  title: 'Fake Payment QR (Quishing)',
                  image: '/test_qrs/fake_payment_quishing.png',
                  url: 'http://pay-tm-verify-account.net/login.php?store=4920',
                  risk: 'CRITICAL',
                  detection: 'Brand Impersonation (paytm) + Unencrypted HTTP + Credential Path',
                },
                {
                  title: 'Fake Electricity Bill Phishing',
                  image: '/test_qrs/fake_electricity_phishing.png',
                  url: 'http://tneb-bill-update-payment.xyz/pay',
                  risk: 'HIGH',
                  detection: 'Brand Impersonation (tneb) + Suspicious TLD (.xyz)',
                },
                {
                  title: 'SSRF Loopback Attack',
                  image: '/test_qrs/ssrf_loopback_exploit.png',
                  url: 'http://127.0.0.1:3001/api/admin/users',
                  risk: 'BLOCKED',
                  detection: 'Blocked: Loopback 127.0.0.1 + Unusual Port 3001',
                },
                {
                  title: 'Legitimate Safe Website',
                  image: '/test_qrs/safe_github.png',
                  url: 'https://github.com',
                  risk: 'SAFE',
                  detection: 'Clean TLS + Clean Dual-Stack DNS Resolution',
                },
              ].map((sample, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg flex items-center gap-3 transition-all"
                  style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)' }}
                >
                  <img
                    src={sample.image}
                    alt={sample.title}
                    className="w-16 h-16 rounded bg-white p-1 flex-shrink-0"
                    style={{ width: 64, height: 64 }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`risk-badge ${sample.risk === 'SAFE' ? 'LOW' : sample.risk === 'BLOCKED' ? 'HIGH' : sample.risk}`}
                            style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                        {sample.risk}
                      </span>
                      <h5 className="text-xs font-semibold truncate" style={{ margin: 0 }}>{sample.title}</h5>
                    </div>
                    <p className="text-muted text-xs truncate font-mono" title={sample.url}>
                      {sample.url}
                    </p>
                    <p className="text-xs text-secondary mt-1">
                      <strong>Detection:</strong> {sample.detection}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDecodedQR(sample.url)}
                    className="btn btn-secondary btn-sm flex-shrink-0"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    Test URL
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        {!user && !result && (
          <div className="alert alert-info mt-6">
            <Shield size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Zero-Trust Guarantee:</strong> QRGuard never automatically opens links upon scanning. You always review the destination first.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
