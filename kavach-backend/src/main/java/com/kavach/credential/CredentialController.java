package com.kavach.credential;

import com.kavach.dto.CredentialHealthDto;
import com.kavach.dto.CredentialSummaryDto;
import com.kavach.dto.ExportResponse;
import com.kavach.dto.ImportResult;
import com.kavach.dto.request.CreateCredentialRequest;
import com.kavach.dto.request.CreateNoteRequest;
import com.kavach.dto.request.ImportRequest;
import com.kavach.dto.request.UpdateCredentialRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/credentials")
public class CredentialController {

    private final CredentialService credentialService;

    public CredentialController(CredentialService credentialService) {
        this.credentialService = credentialService;
    }

    @PostMapping
    public ResponseEntity<CredentialSummaryDto> create(
            @Valid @RequestBody CreateCredentialRequest request,
            @AuthenticationPrincipal String username) {
        CredentialSummaryDto created = credentialService.create(request, username);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping
    public ResponseEntity<List<CredentialSummaryDto>> list(
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(credentialService.list(username));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CredentialSummaryDto> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCredentialRequest request,
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(credentialService.update(id, request, username));
    }

    @GetMapping("/health")
    public ResponseEntity<List<CredentialHealthDto>> health(
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(credentialService.healthReport(username));
    }

    @GetMapping("/export")
    public ResponseEntity<ExportResponse> export(
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(credentialService.exportVault(username));
    }

    @PostMapping("/import")
    public ResponseEntity<ImportResult> importVault(
            @RequestBody ImportRequest request,
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(credentialService.importVault(request, username));
    }

    @PostMapping("/notes")
    public ResponseEntity<CredentialSummaryDto> createNote(
            @Valid @RequestBody CreateNoteRequest request,
            @AuthenticationPrincipal String username) {
        CredentialSummaryDto created = credentialService.createNote(request, username);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .replacePath("/api/credentials/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}/favourite")
    public ResponseEntity<CredentialSummaryDto> toggleFavourite(
            @PathVariable Long id,
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(credentialService.toggleFavourite(id, username));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal String username) {
        credentialService.delete(id, username);
        return ResponseEntity.noContent().build();
    }
}
