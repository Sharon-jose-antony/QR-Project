package com.qrguard.security.auth;

import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {

    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(12);

    public String hashPassword(String plaintext) {
        try {
            Argon2 argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);
            try {
                // iterations=3, memory=65536 KB (64MB), parallelism=4
                return argon2.hash(3, 65536, 4, plaintext.toCharArray());
            } finally {
                argon2.wipeArray(plaintext.toCharArray());
            }
        } catch (Throwable t) {
            // High-security BCrypt fallback if native Argon2 binary is unavailable
            return bcrypt.encode(plaintext);
        }
    }

    public boolean verifyPassword(String hash, String plaintext) {
        if (hash == null || plaintext == null) return false;
        try {
            if (hash.startsWith("$argon2")) {
                Argon2 argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);
                try {
                    return argon2.verify(hash, plaintext.toCharArray());
                } finally {
                    argon2.wipeArray(plaintext.toCharArray());
                }
            } else if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
                return bcrypt.matches(plaintext, hash);
            }
            return false;
        } catch (Throwable t) {
            return false;
        }
    }
}
