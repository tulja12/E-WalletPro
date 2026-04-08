param(
    [ValidateSet("local", "docker")]
    [string]$Infrastructure = "local",
    [switch]$SkipFrontend,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend-microservices"
$frontend = Join-Path $root "frontend-react"

function Write-Step([string]$message) {
    Write-Host "[start-ewallet] $message"
}

function Install-PortableMaven {
    $version = "3.9.9"
    $installDir = Join-Path $env:TEMP "apache-maven-$version"
    $mavenExecutable = Join-Path $installDir "bin\mvn.cmd"
    $archivePath = Join-Path $env:TEMP "apache-maven-$version-bin.zip"
    $downloadUrl = "https://archive.apache.org/dist/maven/maven-3/$version/binaries/apache-maven-$version-bin.zip"

    if (Test-Path $mavenExecutable) {
        return $mavenExecutable
    }

    if ($DryRun) {
        Write-Step "Dry run: Maven is missing. Would download Apache Maven $version to $installDir."
        return $mavenExecutable
    }

    Write-Step "Maven was not found. Downloading Apache Maven $version."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
    Expand-Archive -Path $archivePath -DestinationPath $env:TEMP -Force
    return $mavenExecutable
}

function Resolve-MavenCommand {
    $mavenCommand = Get-Command mvn -ErrorAction SilentlyContinue
    if ($mavenCommand) {
        return $mavenCommand.Source
    }

    $mavenCmd = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if ($mavenCmd) {
        return $mavenCmd.Source
    }

    $fallback = Join-Path $env:TEMP "apache-maven-3.9.9\bin\mvn.cmd"
    if (Test-Path $fallback) {
        return $fallback
    }

    return Install-PortableMaven
}

function Require-Command([string]$name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Required command '$name' was not found on PATH."
    }
}

function Test-TcpPort([int]$port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $asyncResult = $client.BeginConnect("127.0.0.1", $port, $null, $null)
        $connected = $asyncResult.AsyncWaitHandle.WaitOne(800)
        if (-not $connected) {
            return $false
        }
        $client.EndConnect($asyncResult) | Out-Null
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Wait-ForPort([int]$port, [int]$timeoutSeconds, [string]$name) {
    if ($DryRun) {
        Write-Step "Dry run: skipping wait for $name on port $port."
        return
    }

    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort $port) {
            Write-Step "$name is reachable on port $port."
            return
        }
        Start-Sleep -Seconds 1
    }

    throw "$name did not start on port $port within $timeoutSeconds seconds."
}

function Open-Terminal([string]$workingDirectory, [string]$command, [string]$label) {
    if ($DryRun) {
        Write-Step "Dry run: [$label] $command"
        return
    }

    $escapedPath = $workingDirectory.Replace("'", "''")
    $escapedLabel = $label.Replace("'", "''")

    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", "`$Host.UI.RawUI.WindowTitle = '$escapedLabel'; Set-Location '$escapedPath'; $command"
    ) -WorkingDirectory $workingDirectory | Out-Null
}

function Try-StartWindowsService([string[]]$names, [int]$port, [string]$label) {
    foreach ($name in $names) {
        $service = Get-Service -Name $name -ErrorAction SilentlyContinue
        if (-not $service) {
            continue
        }

        if ($service.Status -eq "Running") {
            Write-Step "$label service '$name' is already running."
        } else {
            Write-Step "Starting $label service '$name'."
            if (-not $DryRun) {
                Start-Service -Name $name
            }
        }

        Wait-ForPort -port $port -timeoutSeconds 20 -name $label
        return $true
    }

    return $false
}

function Ensure-LocalMySql {
    if (Test-TcpPort 3306) {
        Write-Step "MySQL is already reachable on localhost:3306."
        return
    }

    Write-Step "MySQL is not reachable on localhost:3306. Trying common Windows service names."
    if (Try-StartWindowsService -names @("MySQL80", "MySQL", "mysql") -port 3306 -label "MySQL") {
        return
    }

    if ($DryRun) {
        Write-Step "Dry run: MySQL is not running. Start a local MySQL server before using the real launch."
        return
    }

    throw "MySQL is not available on localhost:3306. Start a local MySQL server or set MYSQL_HOST and MYSQL_PORT before launching."
}

function Ensure-LocalBroker([string]$mavenQuoted) {
    $brokerJar = Join-Path $backend "local-activemq-broker\target\local-activemq-broker-1.0.0-jar-with-dependencies.jar"

    if (Test-TcpPort 61616) {
        Write-Step "ActiveMQ is already reachable on localhost:61616."
        return
    }

    Write-Step "ActiveMQ is not reachable on localhost:61616. Starting the local broker module."
    if (-not (Test-Path $brokerJar)) {
        if ($DryRun) {
            Write-Step "Dry run: would build $brokerJar."
        } else {
            & $mavenQuoted -pl local-activemq-broker -am -DskipTests package
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to build the local ActiveMQ broker jar."
            }
        }
    }

    Open-Terminal $backend "java -jar '.\local-activemq-broker\target\local-activemq-broker-1.0.0-jar-with-dependencies.jar'" "ewallet-local-broker"
    Wait-ForPort -port 61616 -timeoutSeconds 20 -name "ActiveMQ broker"
}

function Ensure-DockerInfrastructure {
    Require-Command "docker"
    Open-Terminal $root "docker compose up -d mysql activemq" "ewallet-docker-infra"
    Wait-ForPort -port 3306 -timeoutSeconds 30 -name "MySQL"
    Wait-ForPort -port 61616 -timeoutSeconds 30 -name "ActiveMQ broker"
}

if (-not $SkipFrontend) {
    Require-Command "npm"
}

$maven = Resolve-MavenCommand
$mavenQuoted = "'" + $maven.Replace("'", "''") + "'"

Write-Step "Infrastructure mode: $Infrastructure"
if ($Infrastructure -eq "docker") {
    Ensure-DockerInfrastructure
} else {
    Ensure-LocalMySql
    Ensure-LocalBroker $mavenQuoted
}

Open-Terminal $backend "& $mavenQuoted -pl service-registry spring-boot:run" "ewallet-service-registry"
if (-not $DryRun) {
    Start-Sleep -Seconds 3
}

Open-Terminal $backend "& $mavenQuoted -pl auth-service spring-boot:run" "ewallet-auth-service"
Open-Terminal $backend "& $mavenQuoted -pl user-service spring-boot:run" "ewallet-user-service"
Open-Terminal $backend "& $mavenQuoted -pl wallet-service spring-boot:run" "ewallet-wallet-service"
Open-Terminal $backend "& $mavenQuoted -pl transaction-service spring-boot:run" "ewallet-transaction-service"
Open-Terminal $backend "& $mavenQuoted -pl api-gateway spring-boot:run" "ewallet-api-gateway"

if (-not $SkipFrontend) {
    $frontendCommand = "if (-not (Test-Path 'node_modules')) { npm install }; npm run dev"
    Open-Terminal $frontend $frontendCommand "ewallet-frontend"
}

Write-Step "Launch commands submitted."
