/**
 * QRGuard Deterministic QR Reputation & Signal Combination Engine
 *
 * Evaluates historical community report telemetry, calculates persistent QR reputation,
 * and combines historical reputation with current destination analysis.
 */

import { PrismaClient, QrCodeIdentity, CommunityReport } from '@prisma/client';
import { DestinationHistoryResult } from './destinationDrift';
import { AnalysisResult } from '../..//services/urlService';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export type QrReputationLevel =
  | 'UNKNOWN'
  | 'LOW_RISK'
  | 'WATCH'
  | 'SUSPICIOUS'
  | 'HIGH_RISK'
  | 'CRITICAL';

export interface HistoricalReputationResult {
  reputationLevel: QrReputationLevel;
  reputationScore: number;
  totalReports: number;
  confirmedReports: number;
  pendingReports: number;
  categories: string[];
  firstReportedAt: Date | null;
  lastReportedAt: Date | null;
  hasCriticalHistory: boolean;
  criticalReason: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  totalObservations: number;
  reportExplanations: string[];
}

export type ScenarioClassification =
  | 'SCENARIO_A_FIRST_OBSERVATION'
  | 'SCENARIO_B_PREVIOUSLY_SEEN_UNCHANGED'
  | 'SCENARIO_C_PREVIOUSLY_REPORTED'
  | 'SCENARIO_D_PREVIOUSLY_CRITICAL'
  | 'SCENARIO_E_REPORTED_AND_DESTINATION_CHANGED'
  | 'SCENARIO_F_DESTINATION_CHANGED_NO_REPORTS'
  | 'SCENARIO_G_REPORTED_CURRENT_DESTINATION_SAFE';

export interface CombinedSignalResult {
  scenario: ScenarioClassification;
  historicalReputation: HistoricalReputationResult;
  destinationHistory: DestinationHistoryResult;
  currentRiskScore: number;
  currentRiskLevel: string;
  combinedRiskScore: number;
  combinedRiskLevel: string;
  primaryWarningTitle: string;
  primaryWarningMessage: string;
  historicalWarningActive: boolean;
  destinationChangeWarningActive: boolean;
  isSafeToAutoOpen: boolean;
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  PHISHING: 35,
  FAKE_PAYMENT: 35,
  MALWARE: 35,
  FAKE_LOGIN: 30,
  IMPERSONATION: 25,
  SCAM: 25,
  SUSPICIOUS_REDIRECT: 20,
  DESTINATION_CHANGED: 20,
  OTHER: 10,
};

/**
 * Computes deterministic reputation metrics for a QR code from its stored reports and history.
 */
export async function calculateQrReputation(qrCodeId: string): Promise<HistoricalReputationResult> {
  const qrIdentity = await prisma.qrCodeIdentity.findUnique({
    where: { id: qrCodeId },
    include: {
      communityReports: {
        where: { status: { in: ['CONFIRMED', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!qrIdentity) {
    return {
      reputationLevel: 'UNKNOWN',
      reputationScore: 0,
      totalReports: 0,
      confirmedReports: 0,
      pendingReports: 0,
      categories: [],
      firstReportedAt: null,
      lastReportedAt: null,
      hasCriticalHistory: false,
      criticalReason: null,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      totalObservations: 0,
      reportExplanations: [],
    };
  }

  const reports = qrIdentity.communityReports;
  const totalReports = reports.length;
  const confirmedReports = reports.filter(r => r.status === 'CONFIRMED').length;
  const pendingReports = reports.filter(r => r.status === 'PENDING').length;

  const categories = Array.from(new Set(reports.map(r => r.category)));
  const explanations = reports
    .map(r => r.description?.trim())
    .filter((d): d is string => Boolean(d))
    .slice(0, 5);

  const dates = reports.map(r => r.createdAt.getTime());
  const firstReportedAt = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const lastReportedAt = dates.length > 0 ? new Date(Math.max(...dates)) : null;

  // Calculate weighted reputation score
  let weightedScore = 0;
  for (const report of reports) {
    const baseWeight = CATEGORY_WEIGHTS[report.category] || 15;
    const statusMultiplier = report.status === 'CONFIRMED' ? 1.5 : 1.0;
    weightedScore += baseWeight * statusMultiplier;
  }

  // Normalize by diminishing returns
  let rawReputationScore = totalReports === 0 ? 0 : Math.min(Math.round(Math.log2(totalReports + 1) * 30 + (confirmedReports * 15)), 100);

  // If marked critical in past or has confirmed threat reports / severe categories
  const hasCriticalCategory = categories.some(c => ['PHISHING', 'FAKE_PAYMENT', 'MALWARE', 'FAKE_LOGIN'].includes(c));
  const hasCriticalHistory = qrIdentity.hasCriticalHistory || rawReputationScore >= 75 || confirmedReports >= 1 || (totalReports >= 2 && hasCriticalCategory);
  const criticalReason = qrIdentity.criticalReason || (hasCriticalHistory ? `Confirmed reports in: ${categories.join(', ')}` : null);

  let finalReputationScore = Math.max(rawReputationScore, qrIdentity.reputationScore);
  if (hasCriticalHistory) {
    finalReputationScore = Math.max(finalReputationScore, 85);
  }

  let reputationLevel: QrReputationLevel = 'UNKNOWN';
  if (finalReputationScore >= 75 || hasCriticalHistory) {
    reputationLevel = 'CRITICAL';
  } else if (finalReputationScore >= 50) {
    reputationLevel = 'HIGH_RISK';
  } else if (finalReputationScore >= 30) {
    reputationLevel = 'SUSPICIOUS';
  } else if (finalReputationScore >= 15) {
    reputationLevel = 'WATCH';
  } else if (finalReputationScore > 0) {
    reputationLevel = 'LOW_RISK';
  }

  // Update QR Identity in database
  await prisma.qrCodeIdentity.update({
    where: { id: qrCodeId },
    data: {
      reportCount: totalReports,
      reputationScore: finalReputationScore,
      reputationLevel,
      hasCriticalHistory,
      criticalReason,
      firstReportedAt,
      lastReportedAt,
    },
  });

  return {
    reputationLevel,
    reputationScore: finalReputationScore,
    totalReports,
    confirmedReports,
    pendingReports,
    categories,
    firstReportedAt,
    lastReportedAt,
    hasCriticalHistory,
    criticalReason,
    firstSeenAt: qrIdentity.firstSeenAt,
    lastSeenAt: qrIdentity.lastSeenAt,
    totalObservations: qrIdentity.scanCount,
    reportExplanations: explanations,
  };
}

/**
 * Combines historical QR reputation, destination drift signals, and current destination analysis.
 */
export function combineSignals(
  historical: HistoricalReputationResult,
  drift: DestinationHistoryResult,
  current: { riskScore: number; riskLevel: string; blocked: boolean }
): CombinedSignalResult {
  const hasHistoricalReports = historical.totalReports > 0;
  const hasCriticalHistory = historical.hasCriticalHistory || historical.reputationLevel === 'CRITICAL';
  const destinationChanged = drift.destinationChanged;
  const isFirstObservation = drift.firstObservation;
  const isCurrentDestinationSafe = current.riskScore < 30 && !current.blocked;

  let scenario: ScenarioClassification = 'SCENARIO_B_PREVIOUSLY_SEEN_UNCHANGED';
  let primaryWarningTitle = 'Destination Unchanged';
  let primaryWarningMessage = 'This QR is pointing to the same destination previously observed.';
  let historicalWarningActive = false;
  let destinationChangeWarningActive = false;

  // Scenario matching
  if (isFirstObservation && !hasHistoricalReports && !hasCriticalHistory) {
    scenario = 'SCENARIO_A_FIRST_OBSERVATION';
    primaryWarningTitle = 'First Observation';
    primaryWarningMessage = 'This QR code has not been observed by QRGuard before.';
  } else if (hasCriticalHistory && destinationChanged) {
    scenario = 'SCENARIO_E_REPORTED_AND_DESTINATION_CHANGED';
    primaryWarningTitle = 'Community Warning & Destination Changed';
    primaryWarningMessage = `This QR was previously identified as a critical risk (${historical.totalReports} reports) and its destination has changed.`;
    historicalWarningActive = true;
    destinationChangeWarningActive = true;
  } else if (hasHistoricalReports && destinationChanged) {
    scenario = 'SCENARIO_E_REPORTED_AND_DESTINATION_CHANGED';
    primaryWarningTitle = 'Community Warning & Destination Changed';
    primaryWarningMessage = `This QR was previously reported by the community and its destination has changed from ${drift.previousDomain || 'previous host'} to ${drift.currentDomain}.`;
    historicalWarningActive = true;
    destinationChangeWarningActive = true;
  } else if (hasCriticalHistory) {
    scenario = 'SCENARIO_D_PREVIOUSLY_CRITICAL';
    primaryWarningTitle = 'Previously Identified as Critical';
    primaryWarningMessage = `This QR code has previously been identified as a critical security risk: ${historical.criticalReason || 'High-severity community reports'}.`;
    historicalWarningActive = true;
  } else if (hasHistoricalReports && isCurrentDestinationSafe) {
    scenario = 'SCENARIO_G_REPORTED_CURRENT_DESTINATION_SAFE';
    primaryWarningTitle = 'Historical Community Warning';
    primaryWarningMessage = `This QR was previously reported by the community (${historical.totalReports} reports), but its current destination appears technically safe.`;
    historicalWarningActive = true;
  } else if (hasHistoricalReports) {
    scenario = 'SCENARIO_C_PREVIOUSLY_REPORTED';
    primaryWarningTitle = 'Community Warning';
    primaryWarningMessage = `This QR has previously been reported by ${historical.totalReports} community members for ${historical.categories.join(', ') || 'suspicious activity'}.`;
    historicalWarningActive = true;
  } else if (destinationChanged) {
    scenario = 'SCENARIO_F_DESTINATION_CHANGED_NO_REPORTS';
    primaryWarningTitle = 'Destination Changed';
    primaryWarningMessage = `This QR's destination has changed from ${drift.previousDomain || 'previous target'} to ${drift.currentDomain}. Destination changes can be legitimate, but verify before continuing.`;
    destinationChangeWarningActive = true;
  } else {
    scenario = 'SCENARIO_B_PREVIOUSLY_SEEN_UNCHANGED';
    primaryWarningTitle = 'Destination Unchanged';
    primaryWarningMessage = 'This QR is pointing to the same destination previously observed.';
  }

  // Combined risk calculation
  let combinedRiskScore = Math.max(current.riskScore, hasCriticalHistory ? 85 : historical.reputationScore);
  if (destinationChanged && drift.domainChanged) {
    combinedRiskScore = Math.min(Math.max(combinedRiskScore, current.riskScore + 15), 100);
  }

  let combinedRiskLevel = 'LOW';
  if (current.blocked || combinedRiskScore >= 70 || hasCriticalHistory) {
    combinedRiskLevel = 'CRITICAL';
  } else if (combinedRiskScore >= 50) {
    combinedRiskLevel = 'HIGH';
  } else if (combinedRiskScore >= 30) {
    combinedRiskLevel = 'MEDIUM';
  }

  const isSafeToAutoOpen = combinedRiskScore < 30 && !current.blocked && !hasCriticalHistory && !hasHistoricalReports && !destinationChanged;

  return {
    scenario,
    historicalReputation: historical,
    destinationHistory: drift,
    currentRiskScore: current.riskScore,
    currentRiskLevel: current.riskLevel,
    combinedRiskScore,
    combinedRiskLevel,
    primaryWarningTitle,
    primaryWarningMessage,
    historicalWarningActive,
    destinationChangeWarningActive,
    isSafeToAutoOpen,
  };
}
