package com.qrguard.service;

import com.qrguard.dto.AuthDtos;
import com.qrguard.model.User;
import com.qrguard.repository.UserRepository;
import com.qrguard.security.auth.PasswordHasher;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordHasher passwordHasher;

    public AuthDtos.UserDto register(AuthDtos.RegisterRequest req, HttpSession session) {
        String email = req.getEmail().toLowerCase().trim();
        String username = req.getUsername().trim();

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("An account with this username already exists");
        }

        String hash = passwordHasher.hashPassword(req.getPassword());
        User user = new User(email, username, hash);
        user = userRepository.save(user);

        // Store user in session
        session.setAttribute("userId", user.getId());
        session.setAttribute("username", user.getUsername());
        session.setAttribute("role", user.getRole());

        return toDto(user);
    }

    public AuthDtos.UserDto login(AuthDtos.LoginRequest req, HttpSession session) {
        String email = req.getEmail().toLowerCase().trim();

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(req.getEmail().trim());
        }

        if (userOpt.isEmpty() || !passwordHasher.verifyPassword(userOpt.get().getPasswordHash(), req.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        User user = userOpt.get();
        if (!user.isActive()) {
            throw new IllegalArgumentException("Account has been suspended");
        }

        // Store user in session
        session.setAttribute("userId", user.getId());
        session.setAttribute("username", user.getUsername());
        session.setAttribute("role", user.getRole());

        return toDto(user);
    }

    public void logout(HttpSession session) {
        if (session != null) {
            session.invalidate();
        }
    }

    public AuthDtos.UserDto getCurrentUser(HttpSession session) {
        if (session == null) return null;
        String userId = (String) session.getAttribute("userId");
        if (userId == null) return null;

        return userRepository.findById(userId)
                .map(this::toDto)
                .orElse(null);
    }

    public AuthDtos.UserDto toDto(User user) {
        return new AuthDtos.UserDto(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getRole(),
                user.getCreatedAt().toString()
        );
    }
}
