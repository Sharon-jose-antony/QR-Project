package com.qrguard.repository;

import com.qrguard.model.SecurityEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, String> {
    List<SecurityEvent> findTop50ByOrderByCreatedAtDesc();
    long countByType(String type);
}
