package com.qrguard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public static class RegisterRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email address format")
        private String email;

        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30, message = "Username must be 3-30 characters")
        private String username;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class UserDto {
        private String id;
        private String email;
        private String username;
        private String role;
        private String createdAt;

        public UserDto(String id, String email, String username, String role, String createdAt) {
            this.id = id;
            this.email = email;
            this.username = username;
            this.role = role;
            this.createdAt = createdAt;
        }

        public String getId() { return id; }
        public String getEmail() { return email; }
        public String getUsername() { return username; }
        public String getRole() { return role; }
        public String getCreatedAt() { return createdAt; }
    }

    public static class AuthResponseData {
        private UserDto user;
        public AuthResponseData(UserDto user) { this.user = user; }
        public UserDto getUser() { return user; }
    }
}
