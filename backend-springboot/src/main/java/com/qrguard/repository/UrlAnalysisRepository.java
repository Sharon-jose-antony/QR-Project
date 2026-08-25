package com.qrguard.repository;

import com.qrguard.model.UrlAnalysis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UrlAnalysisRepository extends JpaRepository<UrlAnalysis, String> {
    Page<UrlAnalysis> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    List<UrlAnalysis> findByUserIdOrderByCreatedAtDesc(String userId);
    List<UrlAnalysis> findByDomainOrderByCreatedAtDesc(String domain);
}
