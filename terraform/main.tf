terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

resource "docker_image" "busgo" {
  name = "busgo:local"

  build {
    context    = "${path.module}/.."
    dockerfile = "Dockerfile"
  }
}

resource "docker_volume" "busgo_data" {
  name = "busgo-data"
}

resource "docker_container" "busgo" {
  name  = "busgo"
  image = docker_image.busgo.image_id

  ports {
    internal = 3000
    external = var.app_port
  }

  env = [
    "NODE_ENV=production",
    "PORT=3000",
    "SESSION_SECRET=${var.session_secret}"
  ]

  volumes {
    container_path = "/app/data"
    volume_name    = docker_volume.busgo_data.name
  }

  restart = "unless-stopped"
}

output "busgo_url" {
  description = "URL for the locally running BusGo container."
  value       = "http://localhost:${var.app_port}"
}
