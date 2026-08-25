package com.qrguard.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Ensure all SQLite tables are cleanly initialized with correct schema
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(64) PRIMARY KEY,
                email VARCHAR(254) UNIQUE NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'USER',
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS qr_code_identities (
                id VARCHAR(64) PRIMARY KEY,
                fingerprint VARCHAR(64) UNIQUE NOT NULL,
                raw_payload TEXT NOT NULL,
                payload_type VARCHAR(20) NOT NULL DEFAULT 'URL',
                first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                scan_count INTEGER NOT NULL DEFAULT 1,
                reputation_score INTEGER NOT NULL DEFAULT 0,
                reputation_level VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
                has_critical_history BOOLEAN NOT NULL DEFAULT 0,
                critical_reason TEXT,
                first_reported_at TIMESTAMP,
                last_reported_at TIMESTAMP,
                report_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS qr_observations (
                id VARCHAR(64) PRIMARY KEY,
                qr_code_id VARCHAR(64) NOT NULL,
                user_id VARCHAR(64),
                session_ref VARCHAR(64),
                initial_url TEXT NOT NULL,
                final_url TEXT NOT NULL,
                final_domain VARCHAR(255) NOT NULL,
                redirect_chain TEXT,
                risk_score INTEGER NOT NULL DEFAULT 0,
                risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
                change_classification VARCHAR(50) NOT NULL DEFAULT 'FIRST_OBSERVATION',
                destination_changed BOOLEAN NOT NULL DEFAULT 0,
                domain_changed BOOLEAN NOT NULL DEFAULT 0,
                redirect_chain_changed BOOLEAN NOT NULL DEFAULT 0,
                analysis_id VARCHAR(64),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS url_analyses (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64),
                session_ref VARCHAR(64),
                url TEXT NOT NULL,
                domain VARCHAR(255) NOT NULL,
                scheme VARCHAR(20) NOT NULL DEFAULT 'https',
                port INTEGER,
                risk_score INTEGER NOT NULL DEFAULT 0,
                risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
                redirect_count INTEGER NOT NULL DEFAULT 0,
                indicators TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
                ai_summary TEXT,
                ai_risk_explain TEXT,
                ai_recommend TEXT,
                ssrf_blocked BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS domains (
                id VARCHAR(64) PRIMARY KEY,
                hostname VARCHAR(255) UNIQUE NOT NULL,
                first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                analysis_count INTEGER NOT NULL DEFAULT 0,
                avg_risk_score REAL NOT NULL DEFAULT 0.0,
                community_report_count INTEGER NOT NULL DEFAULT 0,
                risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
                is_known_suspicious BOOLEAN NOT NULL DEFAULT 0
            );
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS community_reports (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL,
                domain_id VARCHAR(64),
                qr_code_id VARCHAR(64),
                target_url TEXT NOT NULL,
                target_domain VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL,
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                reviewed_by VARCHAR(64),
                review_note TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS redirect_observations (
                id VARCHAR(64) PRIMARY KEY,
                analysis_id VARCHAR(64) NOT NULL,
                from_url TEXT NOT NULL,
                to_url TEXT NOT NULL,
                to_domain VARCHAR(255),
                position INTEGER NOT NULL,
                was_blocked BOOLEAN NOT NULL DEFAULT 0,
                block_reason TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS qr_submissions (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64),
                qr_code_id VARCHAR(64),
                file_upload_id VARCHAR(64),
                payload_type VARCHAR(20) NOT NULL DEFAULT 'URL',
                payload TEXT NOT NULL,
                analysis_id VARCHAR(64),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS security_events (
                id VARCHAR(64) PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
                user_id VARCHAR(64),
                session_ref VARCHAR(64),
                endpoint VARCHAR(255),
                method VARCHAR(10),
                safe_target VARCHAR(255),
                action VARCHAR(20) NOT NULL DEFAULT 'BLOCKED',
                risk_contrib INTEGER NOT NULL DEFAULT 0,
                metadata TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """);

        System.out.println("[DatabaseInitializer] All SQLite tables initialized successfully.");
    }
}
