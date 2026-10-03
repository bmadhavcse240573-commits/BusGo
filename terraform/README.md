# Run BusGo with Docker and Terraform

This configuration builds the BusGo image and runs it as a local Docker
container managed by Terraform.

## Prerequisites

- Docker Desktop running
- Terraform installed

## Start BusGo

From this directory:

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
