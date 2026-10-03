variable "app_port" {
  description = "Host port used to access BusGo."
  type        = number
  default     = 3000
}

variable "session_secret" {
  description = "Secret used to sign Express sessions."
  type        = string
  sensitive   = true
  default     = "busgo-local-terraform-secret"
}
