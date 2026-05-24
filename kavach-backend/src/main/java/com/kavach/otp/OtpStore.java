package com.kavach.otp;

import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class OtpStore {

    private final ConcurrentHashMap<Long, OtpEntry> store = new ConcurrentHashMap<>();

    public void put(Long credentialId, OtpEntry entry) { store.put(credentialId, entry); }

    public Optional<OtpEntry> get(Long credentialId) { return Optional.ofNullable(store.get(credentialId)); }

    public void remove(Long credentialId) { store.remove(credentialId); }

    public void clear() { store.clear(); }
}
