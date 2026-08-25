package com.qrguard.controller;

import com.qrguard.dto.ApiResponse;
import com.qrguard.dto.QrDtos;
import com.qrguard.dto.UrlDtos;
import com.qrguard.service.QrProcessingService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/qr")
public class QrController {

    @Autowired
    private QrProcessingService qrProcessingService;

    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<UrlDtos.AnalysisResultDto>> analyzeQrImage(
            @RequestParam("image") MultipartFile image,
            HttpSession session) {
        try {
            UrlDtos.AnalysisResultDto result = qrProcessingService.processQrImage(image, session);
            return ResponseEntity.ok(ApiResponse.ok(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("QR_DECODE_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.fail("SERVER_ERROR", "Failed to process QR code image"));
        }
    }

    @GetMapping("/{qrCodeId}/history")
    public ResponseEntity<ApiResponse<QrDtos.QrHistoryResponseData>> getQrHistory(
            @PathVariable("qrCodeId") String qrCodeId) {
        try {
            QrDtos.QrHistoryResponseData history = qrProcessingService.getQrHistory(qrCodeId);
            return ResponseEntity.ok(ApiResponse.ok(history));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(ApiResponse.fail("NOT_FOUND", e.getMessage()));
        }
    }
}
