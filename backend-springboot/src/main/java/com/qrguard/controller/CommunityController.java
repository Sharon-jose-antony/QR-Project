package com.qrguard.controller;

import com.qrguard.dto.ApiResponse;
import com.qrguard.dto.CommunityDtos;
import com.qrguard.service.CommunityService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community")
public class CommunityController {

    @Autowired
    private CommunityService communityService;

    @PostMapping("/report")
    public ResponseEntity<ApiResponse<CommunityDtos.CommunityFeedItem>> submitReport(
            @Valid @RequestBody CommunityDtos.CreateReportRequest request,
            HttpSession session) {
        CommunityDtos.CommunityFeedItem report = communityService.createReport(request, session);
        return ResponseEntity.ok(ApiResponse.ok(report));
    }

    @GetMapping("/intel")
    public ResponseEntity<ApiResponse<CommunityDtos.CommunityIntelResponseData>> getCommunityIntel() {
        CommunityDtos.CommunityIntelResponseData data = communityService.getCommunityIntel();
        return ResponseEntity.ok(ApiResponse.ok(data));
    }
}
