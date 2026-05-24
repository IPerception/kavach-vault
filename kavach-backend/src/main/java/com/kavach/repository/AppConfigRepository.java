package com.kavach.repository;

import com.kavach.domain.AppConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppConfigRepository extends JpaRepository<AppConfig, String> {
    // findById(String key) inherited from JpaRepository covers all lookup needs.
}
