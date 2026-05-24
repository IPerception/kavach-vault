package com.kavach.event;

import com.kavach.domain.AuditLog;
import com.kavach.repository.AuditLogRepository;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class AuditLogListener {

    private final AuditLogRepository auditLogRepository;

    public AuditLogListener(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @EventListener
    public void onAuditEvent(AuditEvent event) {
        if (event.user() == null) return;
        auditLogRepository.save(AuditLog.builder()
                .user(event.user())
                .action(event.action())
                .timestamp(LocalDateTime.now())
                .ipAddress(event.ipAddress())
                .build());
    }
}
