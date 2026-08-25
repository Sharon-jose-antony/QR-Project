package com.qrguard.repository;

import com.qrguard.model.Domain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DomainRepository extends JpaRepository<Domain, String> {
    Optional<Domain> findByHostname(String hostname);
    List<Domain> findByCommunityReportCountGreaterThanOrderByCommunityReportCountDesc(int count);
    List<Domain> findTop20ByCommunityReportCountGreaterThanOrderByCommunityReportCountDesc(int count);
}
