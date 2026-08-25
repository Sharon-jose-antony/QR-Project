package com.qrguard.repository;

import com.qrguard.model.RedirectObservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RedirectObservationRepository extends JpaRepository<RedirectObservation, String> {
    List<RedirectObservation> findByAnalysisIdOrderByPositionAsc(String analysisId);
}
