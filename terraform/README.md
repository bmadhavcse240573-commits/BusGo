# Run BusGo with Docker and Terraform

Build the BusGo image with Docker, then use this configuration to run it as a
local Docker container managed by Terraform.

## Prerequisites

- Docker Desktop running
- Terraform installed
- A Windows self-hosted GitHub Actions runner with Docker, Terraform, and Node.js

## Start BusGo

From the project root:

```powershell
docker build -t busgo:local .
```

Then from the `terraform` directory:

```powershell
terraform init
terraform apply
```

Open [http://localhost:3000](http://localhost:3000) after Terraform reports that
the container is running.

To use another host port:

```powershell
terraform apply -var="app_port=8080"
```

For a non-default session secret, pass it at apply time or use a local
`terraform.tfvars` file that is not committed:

```powershell
terraform apply -var="session_secret=replace-with-a-long-random-secret"
```

## Stop and remove the container

```powershell
terraform destroy
```

The `busgo-data` Docker volume keeps the application's JSON data across
container replacements. `terraform destroy` removes the volume as well.

## Automatic deployment with GitHub Actions

The workflow at `.github/workflows/deploy-local.yml` deploys automatically
after every push to `main`. It runs on your Windows self-hosted runner and:

1. Checks out the repository.
2. Checks Docker and Terraform.
3. Validates the Node.js and Terraform configuration.
4. Builds the `busgo:local` Docker image.
5. Applies Terraform.
6. Verifies `http://localhost:3000` returns HTTP 200.

### One-time GitHub setup

1. In GitHub, open **Settings > Actions > Runners > New self-hosted runner**.
2. Select **Windows x64** and follow GitHub's commands on your PC.
3. Keep the runner service running and confirm it is **Idle** in GitHub.
4. In **Settings > Secrets and variables > Actions**, create a repository secret:
   - Name: `BUSGO_SESSION_SECRET`
   - Value: a long random string
5. Push to `main` or manually run the **Deploy BusGo locally** workflow.

The runner PC must remain powered on, Docker Desktop must be running, and the
runner service must be online for automatic deployment to work. Because this
workflow deploys to `localhost` on that PC, the application is not publicly
accessible from the internet.
