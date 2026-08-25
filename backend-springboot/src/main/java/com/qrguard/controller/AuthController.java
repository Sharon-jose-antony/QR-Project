package com.qrguard.controller;

import com.qrguard.dto.ApiResponse;
import com.qrguard.dto.AuthDtos;
import com.qrguard.service.AuthService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponseData>> register(
            @Valid @RequestBody AuthDtos.RegisterRequest request,
            HttpSession session) {
        AuthDtos.UserDto user = authService.register(request, session);
        return ResponseEntity.ok(ApiResponse.ok(new AuthDtos.AuthResponseData(user)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponseData>> login(
            @Valid @RequestBody AuthDtos.LoginRequest request,
            HttpSession session) {
        AuthDtos.UserDto user = authService.login(request, session);
        return ResponseEntity.ok(ApiResponse.ok(new AuthDtos.AuthResponseData(user)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpSession session) {
        authService.logout(session);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponseData>> me(HttpSession session) {
        AuthDtos.UserDto user = authService.getCurrentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.fail("UNAUTHORIZED", "Not logged in"));
        }
        return ResponseEntity.ok(ApiResponse.ok(new AuthDtos.AuthResponseData(user)));
    }
}
