variable "project_id" {
  description = "GCP project ID for the target environment."
  type        = string
}

variable "region" {
  description = "Primary GCP region."
  type        = string
}

variable "environment" {
  description = "Environment name such as staging or production."
  type        = string
}

variable "artifact_registry_repository_id" {
  description = "Artifact Registry repository ID for backend images."
  type        = string
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name for the backend."
  type        = string
}

variable "migration_job_name" {
  description = "Cloud Run job name for Alembic migrations."
  type        = string
}

variable "initial_backend_image" {
  description = "Bootstrap image used by Terraform for Cloud Run service and migration job."
  type        = string
}

variable "allow_unauthenticated" {
  description = "Whether the backend service should allow unauthenticated access."
  type        = bool
  default     = true
}

variable "backend_runtime_env" {
  description = "Plain environment variables injected into Cloud Run."
  type        = map(string)
  default     = {}
}

variable "secret_ids" {
  description = "Secret Manager secret IDs to create for backend runtime."
  type        = list(string)
  default     = []
}

variable "container_cpu" {
  description = "CPU limit for the backend container."
  type        = string
  default     = "1"
}

variable "container_memory" {
  description = "Memory limit for the backend container."
  type        = string
  default     = "512Mi"
}

variable "min_instance_count" {
  description = "Minimum Cloud Run instance count."
  type        = number
  default     = 0
}

variable "max_instance_count" {
  description = "Maximum Cloud Run instance count."
  type        = number
  default     = 3
}

variable "health_path" {
  description = "Health endpoint path used for uptime checks."
  type        = string
  default     = "/health"
}

variable "notification_channel_ids" {
  description = "Cloud Monitoring notification channel IDs used by alert policies."
  type        = list(string)
  default     = []
}

variable "backend_5xx_count_threshold" {
  description = "Number of 5xx responses in a five-minute window that triggers an alert."
  type        = number
  default     = 5
}

variable "backend_latency_ms_threshold" {
  description = "Backend p95 request latency in milliseconds that triggers an alert."
  type        = number
  default     = 1500
}

variable "backend_slow_request_seconds_threshold" {
  description = "Non-WebSocket, non-OTP backend request latency in seconds that triggers an alert."
  type        = number
  default     = 3
}

variable "backend_otp_slow_seconds_threshold" {
  description = "OTP send latency in seconds that triggers an alert."
  type        = number
  default     = 10
}

variable "backend_startup_latency_ms_threshold" {
  description = "Cloud Run container startup latency in milliseconds that triggers an alert."
  type        = number
  default     = 30000
}

variable "labels" {
  description = "Additional labels applied to supported resources."
  type        = map(string)
  default     = {}
}
