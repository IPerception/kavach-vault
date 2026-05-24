package com.kavach.audit;

import com.kavach.dto.AuditLogDto;
import com.kavach.dto.PageResponse;
import com.kavach.mapper.AuditLogMapper;
import com.kavach.repository.AuditLogRepository;
import com.kavach.repository.VaultUserRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-log")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final VaultUserRepository userRepository;
    private final AuditLogMapper auditLogMapper;

    public AuditLogController(AuditLogRepository auditLogRepository,
                               VaultUserRepository userRepository,
                               AuditLogMapper auditLogMapper) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.auditLogMapper = auditLogMapper;
    }

    @GetMapping
    public ResponseEntity<PageResponse<AuditLogDto>> getAuditLog(
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        PageResponse<AuditLogDto> response = PageResponse.from(
                auditLogRepository.findAllByUser(user, pageable).map(auditLogMapper::toDto));
        return ResponseEntity.ok(response);
    }
}
