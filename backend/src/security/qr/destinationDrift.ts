/**
 * QRGuard Destination Drift & History Analysis Service
 *
 * Tracks every destination observation for a QR code over time and evaluates
 * whether the destination URL, domain, or redirect chain has drifted.
 */

import { PrismaClient, QrObservation } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export type DriftClassification =
  | 'FIRST_OBSERVATION'
  | 'NO_CHANGE'
  | 'REDIRECT_CHAIN_CHANGED'
  | 'FINAL_DESTINATION_CHANGED'
  | 'DOMAIN_CHANGED'
  | 'SCHEME_CHANGED'
  | 'PORT_CHANGED'
  | 'BLOCKED_DESTINATION'
  | 'DESTINATION_UNAVAILABLE';

export interface EvaluateDriftInput {
  qrCodeId: string;
  userId?: string;
  sessionRef?: string;
  initialUrl: string;
  finalUrl: string;
  finalDomain: string;
  redirectChain: Array<{ from: string; to: string; statusCode?: number; blocked?: boolean }>;
  riskScore: number;
  riskLevel: string;
  analysisId?: string;
  isBlocked?: boolean;
}

export interface DestinationHistoryResult {
  changeClassification: DriftClassification;
  destinationChanged: boolean;
  domainChanged: boolean;
  redirectChainChanged: boolean;
  firstObservation: boolean;
  previousUrl: string | null;
  previousDomain: string | null;
  previousRedirectChain: Array<{ from: string; to: string }>;
  currentUrl: string;
  currentDomain: string;
  currentRedirectChain: Array<{ from: string; to: string }>;
  firstObservedAt: Date;
  lastObservedAt: Date;
  totalObservations: number;
  recentObservations: Array<{
    id: string;
    finalUrl: string;
    finalDomain: string;
    riskLevel: string;
    riskScore: number;
    createdAt: Date;
    changeClassification: string;
  }>;
  observationId: string;
}

/**
 * Compares two URLs ignoring minor trailing slashes while strictly catching path and host differences.
 */
function normalizeUrlForDriftComparison(rawUrl: string): { host: string; pathname: string; scheme: string; port: string; search: string } {
  try {
    const parsed = new URL(rawUrl);
    return {
      host: parsed.hostname.toLowerCase(),
      pathname: parsed.pathname.replace(/\/+$/, '') || '/',
      scheme: parsed.protocol.replace(':', '').toLowerCase(),
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      search: parsed.search,
    };
  } catch {
    return {
      host: rawUrl.toLowerCase(),
      pathname: '/',
      scheme: 'unknown',
      port: '',
      search: '',
    };
  }
}

/**
 * Evaluates destination drift against all previous observations for a QR identity and persists the new observation.
 */
export async function evaluateAndRecordDestinationDrift(input: EvaluateDriftInput): Promise<DestinationHistoryResult> {
  const previousObservations = await prisma.qrObservation.findMany({
    where: { qrCodeId: input.qrCodeId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const totalObservationsCount = await prisma.qrObservation.count({
    where: { qrCodeId: input.qrCodeId },
  });

  const oldestObservation = totalObservationsCount > 0
    ? await prisma.qrObservation.findFirst({
        where: { qrCodeId: input.qrCodeId },
        orderBy: { createdAt: 'asc' },
      })
    : null;

  let changeClassification: DriftClassification = 'FIRST_OBSERVATION';
  let destinationChanged = false;
  let domainChanged = false;
  let redirectChainChanged = false;
  let firstObservation = true;
  let previousUrl: string | null = null;
  let previousDomain: string | null = null;
  let previousRedirectChain: Array<{ from: string; to: string }> = [];

  const currentNorm = normalizeUrlForDriftComparison(input.finalUrl);

  if (previousObservations.length > 0) {
    firstObservation = false;
    const lastObs = previousObservations[0];
    previousUrl = lastObs.finalUrl;
    previousDomain = lastObs.finalDomain;

    try {
      previousRedirectChain = JSON.parse(lastObs.redirectChain || '[]');
    } catch {
      previousRedirectChain = [];
    }

    const prevNorm = normalizeUrlForDriftComparison(lastObs.finalUrl);

    if (input.isBlocked) {
      changeClassification = 'BLOCKED_DESTINATION';
      destinationChanged = true;
    } else if (prevNorm.host !== currentNorm.host) {
      changeClassification = 'DOMAIN_CHANGED';
      domainChanged = true;
      destinationChanged = true;
    } else if (prevNorm.scheme !== currentNorm.scheme) {
      changeClassification = 'SCHEME_CHANGED';
      destinationChanged = true;
    } else if (prevNorm.port !== currentNorm.port) {
      changeClassification = 'PORT_CHANGED';
      destinationChanged = true;
    } else if (prevNorm.pathname !== currentNorm.pathname || prevNorm.search !== currentNorm.search) {
      changeClassification = 'FINAL_DESTINATION_CHANGED';
      destinationChanged = true;
    } else {
      // Check if redirect chain length or hops changed
      const prevHops = previousRedirectChain.map(h => h.to).join('->');
      const currHops = input.redirectChain.map(h => h.to).join('->');
      if (prevHops !== currHops) {
        changeClassification = 'REDIRECT_CHAIN_CHANGED';
        redirectChainChanged = true;
        destinationChanged = true;
      } else {
        changeClassification = 'NO_CHANGE';
        destinationChanged = false;
      }
    }
  }

  // Persist current observation
  const newObservation = await prisma.qrObservation.create({
    data: {
      qrCodeId: input.qrCodeId,
      userId: input.userId,
      sessionRef: input.sessionRef,
      initialUrl: input.initialUrl.substring(0, 2048),
      finalUrl: input.finalUrl.substring(0, 2048),
      finalDomain: input.finalDomain,
      redirectChain: JSON.stringify(input.redirectChain.map(h => ({ from: h.from, to: h.to }))),
      riskScore: input.riskScore,
      riskLevel: input.riskLevel,
      changeClassification,
      destinationChanged,
      domainChanged,
      redirectChainChanged,
      analysisId: input.analysisId,
    },
  });

  logger.info('Destination drift evaluated', {
    qrCodeId: input.qrCodeId,
    changeClassification,
    destinationChanged,
    domainChanged,
    totalObservations: totalObservationsCount + 1,
  });

  const recentObservations = [
    {
      id: newObservation.id,
      finalUrl: newObservation.finalUrl,
      finalDomain: newObservation.finalDomain,
      riskLevel: newObservation.riskLevel,
      riskScore: newObservation.riskScore,
      createdAt: newObservation.createdAt,
      changeClassification: newObservation.changeClassification,
    },
    ...previousObservations.slice(0, 4).map(o => ({
      id: o.id,
      finalUrl: o.finalUrl,
      finalDomain: o.finalDomain,
      riskLevel: o.riskLevel,
      riskScore: o.riskScore,
      createdAt: o.createdAt,
      changeClassification: o.changeClassification,
    })),
  ];

  return {
    changeClassification,
    destinationChanged,
    domainChanged,
    redirectChainChanged,
    firstObservation,
    previousUrl,
    previousDomain,
    previousRedirectChain,
    currentUrl: input.finalUrl,
    currentDomain: input.finalDomain,
    currentRedirectChain: input.redirectChain.map(h => ({ from: h.from, to: h.to })),
    firstObservedAt: oldestObservation ? oldestObservation.createdAt : newObservation.createdAt,
    lastObservedAt: newObservation.createdAt,
    totalObservations: totalObservationsCount + 1,
    recentObservations,
    observationId: newObservation.id,
  };
}
