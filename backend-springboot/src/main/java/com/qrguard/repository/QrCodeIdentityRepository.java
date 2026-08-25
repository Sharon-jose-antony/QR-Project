package com.qrguard.repository;

import com.qrguard.model.QrCodeIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QrCodeIdentityRepository extends JpaRepository<QrCodeIdentity, String> {
    Optional<QrCodeIdentity> findByFingerprint(String fingerprint);
}
