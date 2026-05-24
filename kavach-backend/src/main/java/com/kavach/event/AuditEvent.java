package com.kavach.event;

import com.kavach.domain.AuditAction;
import com.kavach.domain.VaultUser;

public record AuditEvent(VaultUser user, AuditAction action, String ipAddress) {}
