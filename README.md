# kavach-vault
Kavach-Vault is a local-first personal password manager. A single java -jar kavach.jar launches the Spring Boot backend and serves the React frontend. All credentials are encrypted with AES-256-GCM on disk - no cloud, no accounts, no external services. Passwords are revealed only after TOTP verification via an authenticator app.
