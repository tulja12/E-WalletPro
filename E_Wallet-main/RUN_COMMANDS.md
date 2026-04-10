# E-Wallet Run Commands

Run everything from:

```text
C:\Users\pavan\Downloads\E-WalletPro-main\E-WalletPro-main\E_Wallet-main
```

## One-step launcher

Double-click `start-ewallet.bat`

Or run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-ewallet.ps1
```

By default this now uses local infrastructure:

- MySQL must be available on `localhost:3306`
- ActiveMQ is started from the project itself on `localhost:61616`
- Frontend is started automatically unless you pass `-SkipFrontend`

## Manual commands

```powershell
powershell -ExecutionPolicy Bypass -File .\start-ewallet.ps1
```

If you want to start the local broker manually:

```powershell
cd .\backend-microservices
$env:TEMP\apache-maven-3.9.9\bin\mvn.cmd -pl local-activemq-broker -am -DskipTests package
java -jar .\local-activemq-broker\target\local-activemq-broker-1.0.0-jar-with-dependencies.jar
```

Start backend services in separate terminals:

```powershell
cd .\backend-microservices
mvn -pl service-registry spring-boot:run
mvn -pl auth-service spring-boot:run
mvn -pl user-service spring-boot:run
mvn -pl wallet-service spring-boot:run
mvn -pl transaction-service spring-boot:run
mvn -pl api-gateway spring-boot:run
```

If `mvn` is not on `PATH`, use:

```powershell
$env:TEMP\apache-maven-3.9.9\bin\mvn.cmd -pl service-registry spring-boot:run
```

Start React:

```powershell
cd .\frontend-react
npm install
npm run dev
```

## Verify endpoints

```text
Eureka:         http://localhost:8761
Gateway:        http://localhost:8080/actuator/health
Auth service:   http://localhost:8081/actuator/health
User service:   http://localhost:8082/actuator/health
Wallet service: http://localhost:8083/actuator/health
Txn service:    http://localhost:8084/actuator/health
Frontend:       http://localhost:5173
```

## ActiveMQ in this project

ActiveMQ is the message broker used by the microservices for asynchronous communication:

- `user-service` publishes a `USER_REGISTERED_QUEUE` event after signup
- `wallet-service` listens to that event and creates the wallet
- `wallet-service` publishes a `WALLET_OPERATION_QUEUE` event after wallet actions
- `transaction-service` listens to that event and records transaction history

Without ActiveMQ:

- new user signup cannot trigger automatic wallet creation
- wallet actions may fail with `ActiveMQ is unavailable`
- transaction history will not be populated from wallet events

The local launcher starts a lightweight broker process for development. It does not provide an admin web console.
