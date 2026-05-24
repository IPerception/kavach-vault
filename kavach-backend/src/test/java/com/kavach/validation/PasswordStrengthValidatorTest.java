package com.kavach.validation;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordStrengthValidatorTest {

    private final PasswordStrengthValidator validator = new PasswordStrengthValidator();

    @ParameterizedTest(name = "{0} -> valid={1}")
    @CsvSource({
        "password,          false",  // too short, missing upper/digit/special
        "12345678,          false",  // too short, missing lower/upper/special
        "ALLUPPERCASE,      false",  // missing lower/digit/special
        "MyLongPassphrase,  false",  // missing digit/special
        "Password1,         false",  // missing special character
        "correct horse,     false",  // missing upper/digit
        "P@ssw0rd,          false",  // all four classes but only 8 chars (< 12)
        "Abc12345!@#,       false",  // all four classes but only 11 chars (< 12)
        "Ab1!,              false",  // all four classes but only 4 chars (< 12)
        "Tr0ub4dor&3x,      true",   // all four classes, 12 chars
        "MyV@ult2024#Pwd,   true",   // all four classes, 15 chars
    })
    void validate(String password, boolean expected) {
        assertThat(validator.isValid(password.strip(), null)).isEqualTo(expected);
    }
}
