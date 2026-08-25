package com.qrguard.repository;

import com.qrguard.model.QrObservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QrObservationRepository extends JpaRepository<QrObservation, String> {
    List<QrObservation> findByQrCodeIdOrderByCreatedAtDesc(String qrCodeId);
    long countByQrCodeId(String qrCodeId);
    Optional<QrObservation> findFirstByQrCodeIdOrderByCreatedAtAsc(String qrCodeId);
}
