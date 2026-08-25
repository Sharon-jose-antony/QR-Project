package com.qrguard.security.qr;

import com.qrguard.model.QrObservation;
import com.qrguard.repository.QrObservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.List;

@Service
public class DestinationDriftService {

    @Autowired
    private QrObservationRepository observationRepository;

    public static class DriftResult {
        private final String changeClassification;
        private final boolean destinationChanged;
        private final boolean domainChanged;
        private final boolean redirectChainChanged;
        private final String previousFinalUrl;
        private final String previousFinalDomain;
        private final int observationCount;

        public DriftResult(String changeClassification, boolean destinationChanged, boolean domainChanged,
                           boolean redirectChainChanged, String previousFinalUrl, String previousFinalDomain, int observationCount) {
            this.changeClassification = changeClassification;
            this.destinationChanged = destinationChanged;
            this.domainChanged = domainChanged;
            this.redirectChainChanged = redirectChainChanged;
            this.previousFinalUrl = previousFinalUrl;
            this.previousFinalDomain = previousFinalDomain;
            this.observationCount = observationCount;
        }

        public String getChangeClassification() { return changeClassification; }
        public boolean isDestinationChanged() { return destinationChanged; }
        public boolean isDomainChanged() { return domainChanged; }
        public boolean isRedirectChainChanged() { return redirectChainChanged; }
        public String getPreviousFinalUrl() { return previousFinalUrl; }
        public String getPreviousFinalDomain() { return previousFinalDomain; }
        public int getObservationCount() { return observationCount; }
    }

    public DriftResult evaluateDrift(String qrCodeId, String currentFinalUrl, String currentRedirectChain) {
        List<QrObservation> pastObservations = observationRepository.findByQrCodeIdOrderByCreatedAtDesc(qrCodeId);

        if (pastObservations == null || pastObservations.isEmpty()) {
            return new DriftResult("FIRST_OBSERVATION", false, false, false, null, null, 0);
        }

        QrObservation latestPast = pastObservations.get(0);
        String prevFinalUrl = latestPast.getFinalUrl();
        String prevFinalDomain = latestPast.getFinalDomain();
        String currentFinalDomain = extractDomain(currentFinalUrl);

        boolean destChanged = !currentFinalUrl.equalsIgnoreCase(prevFinalUrl);
        boolean domChanged = !currentFinalDomain.equalsIgnoreCase(prevFinalDomain);
        boolean chainChanged = currentRedirectChain != null && !currentRedirectChain.equals(latestPast.getRedirectChain());

        String classification;
        if (domChanged) {
            classification = "DOMAIN_CHANGED";
        } else if (destChanged) {
            // Check if scheme or port changed specifically
            if (isSchemeOrPortChanged(currentFinalUrl, prevFinalUrl)) {
                classification = "SCHEME_CHANGED";
            } else {
                classification = "FINAL_DESTINATION_CHANGED";
            }
        } else if (chainChanged) {
            classification = "REDIRECT_CHAIN_CHANGED";
        } else {
            classification = "NO_CHANGE";
        }

        return new DriftResult(
                classification,
                destChanged,
                domChanged,
                chainChanged,
                prevFinalUrl,
                prevFinalDomain,
                pastObservations.size()
        );
    }

    private String extractDomain(String urlStr) {
        try {
            URI uri = new URI(urlStr);
            return uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private boolean isSchemeOrPortChanged(String url1, String url2) {
        try {
            URI u1 = new URI(url1);
            URI u2 = new URI(url2);
            boolean schemeDiff = !Objects.equals(u1.getScheme(), u2.getScheme());
            boolean portDiff = u1.getPort() != u2.getPort();
            return schemeDiff || portDiff;
        } catch (Exception e) {
            return false;
        }
    }

    private static class Objects {
        public static boolean equals(Object a, Object b) {
            return (a == b) || (a != null && a.equals(b));
        }
    }
}
