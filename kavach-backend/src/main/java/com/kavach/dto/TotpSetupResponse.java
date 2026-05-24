package com.kavach.dto;

public record TotpSetupResponse(String secret, String qrCodeUri) {}
