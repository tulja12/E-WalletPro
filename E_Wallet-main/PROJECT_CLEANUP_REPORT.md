# Project Cleanup Report

## Safe to Delete

These are generated or local-environment files/directories. They can be removed without losing source code.

| Path | Reason |
| --- | --- |
| `.idea/` | IntelliJ local project metadata |
| `frontend-react/node_modules/` | Reinstallable frontend dependencies |
| `frontend-react/dist/` | Generated frontend production build output |
| `backend-microservices/api-gateway/target/` | Generated Maven build output |
| `backend-microservices/auth-service/target/` | Generated Maven build output |
| `backend-microservices/local-activemq-broker/target/` | Generated Maven build output |
| `backend-microservices/service-registry/target/` | Generated Maven build output |
| `backend-microservices/transaction-service/target/` | Generated Maven build output |
| `backend-microservices/user-service/target/` | Generated Maven build output |
| `backend-microservices/wallet-service/target/` | Generated Maven build output |

## Likely Unnecessary / Optional

These are not referenced by the main application flow and look removable unless you intentionally want them.

| Path | Reason |
| --- | --- |
| `package-lock.json` | Root-level lockfile with no matching root `package.json` |
| `test-otp.js` | Standalone OTP helper script, not referenced by the app |

## Keep

These are project source or operational files and should not be deleted as cleanup.

- `backend-microservices/`
- `frontend-react/src/`
- `RUN_COMMANDS.md`
- `start-ewallet.bat`
- `start-ewallet.ps1`
- `PROJECT_SRS.md`
- `PROJECT_SRS.docx`
