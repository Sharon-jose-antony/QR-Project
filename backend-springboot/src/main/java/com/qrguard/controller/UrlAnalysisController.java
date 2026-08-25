package com.qrguard.controller;

import com.qrguard.dto.ApiResponse;
import com.qrguard.dto.UrlDtos;
import com.qrguard.service.UrlAnalysisService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/url")
public class UrlAnalysisController {

    @Autowired
    private UrlAnalysisService urlAnalysisService;

    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<UrlDtos.AnalysisResultDto>> analyzeUrl(
            @Valid @RequestBody UrlDtos.AnalyzeUrlRequest request,
            HttpSession session) {
        UrlDtos.AnalysisResultDto result = urlAnalysisService.analyzeUrl(request.getUrl(), request.getQrCodeId(), session);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
