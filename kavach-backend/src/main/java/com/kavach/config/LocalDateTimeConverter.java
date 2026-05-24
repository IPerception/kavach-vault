package com.kavach.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Stores LocalDateTime as a fixed-format TEXT string in SQLite.
 *
 * Without this converter, Hibernate 6 delegates to SQLite JDBC's setObject/getObject
 * for TIMESTAMP types. The format written is not always parseable by getObject in a
 * separate JPA session (e.g., across MockMvc requests in integration tests, or across
 * application restarts). This converter makes the format explicit and consistent.
 *
 * autoApply=true: Hibernate applies this to every LocalDateTime field in every entity
 * automatically, with no per-field annotation needed.
 */
@Converter(autoApply = true)
public class LocalDateTimeConverter implements AttributeConverter<LocalDateTime, String> {

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss.SSS");

    @Override
    public String convertToDatabaseColumn(LocalDateTime value) {
        return value == null ? null : value.format(FMT);
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String dbData) {
        return (dbData == null || dbData.isBlank()) ? null : LocalDateTime.parse(dbData, FMT);
    }
}
