package com.qrguard.repository;

import com.qrguard.model.QrSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QrSubmissionRepository extends JpaRepository<QrSubmission, String> {
    List<QrSubmission> findByUserIdOrderByCreatedAtDesc(String userId);
}
