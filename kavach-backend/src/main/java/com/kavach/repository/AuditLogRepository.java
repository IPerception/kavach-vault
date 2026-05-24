package com.kavach.repository;

import com.kavach.domain.AuditLog;
import com.kavach.domain.VaultUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findAllByUserOrderByTimestampDesc(VaultUser user);

    Page<AuditLog> findAllByUser(VaultUser user, Pageable pageable);
}
