package com.kavach.repository;

import com.kavach.domain.Credential;
import com.kavach.domain.VaultUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CredentialRepository extends JpaRepository<Credential, Long> {

    List<Credential> findAllByUser(VaultUser user);

    Optional<Credential> findByUserAndPurpose(VaultUser user, String purpose);
}
