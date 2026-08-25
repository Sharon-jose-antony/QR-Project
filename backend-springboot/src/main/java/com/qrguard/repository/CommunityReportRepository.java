package com.qrguard.repository;

import com.qrguard.model.CommunityReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityReportRepository extends JpaRepository<CommunityReport, String> {
    List<CommunityReport> findByQrCodeIdOrderByCreatedAtDesc(String qrCodeId);
    List<CommunityReport> findByQrCodeIdAndStatusInOrderByCreatedAtDesc(String qrCodeId, List<String> statuses);
    List<CommunityReport> findTop10ByOrderByCreatedAtDesc();
    
    Optional<CommunityReport> findFirstByUserIdAndTargetUrlAndCreatedAtGreaterThan(String userId, String targetUrl, LocalDateTime since);

    @Query("SELECT r.category as category, COUNT(r) as count FROM CommunityReport r GROUP BY r.category ORDER BY count DESC")
    List<Object[]> getCategoryCounts();
}
