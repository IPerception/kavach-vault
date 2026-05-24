package com.kavach.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Enforces password strength as a single self-contained rule:
 * 1. Minimum 12 characters.
 * 2. All four character classes must be present (lowercase, uppercase, digit, special).
 *
 * 12 chars with all four classes gives ~79 bits of entropy, well above the 40-bit floor
 * recommended for high-value secrets (NIST SP 800-63B).
 */
public class PasswordStrengthValidator implements ConstraintValidator<StrongPassword, String> {

    private static final int MIN_LENGTH = 12;

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null || password.isEmpty()) {
            return true; // @NotBlank handles null/blank
        }

        if (password.length() < MIN_LENGTH) {
            return false;
        }

        boolean hasLower   = password.chars().anyMatch(Character::isLowerCase);
        boolean hasUpper   = password.chars().anyMatch(Character::isUpperCase);
        boolean hasDigit   = password.chars().anyMatch(Character::isDigit);
        boolean hasSpecial = password.chars().anyMatch(c -> !Character.isLetterOrDigit(c));

        return hasLower && hasUpper && hasDigit && hasSpecial;
    }
}
