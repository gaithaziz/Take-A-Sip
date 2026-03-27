output "artifact_registry_repository" {
  value       = google_artifact_registry_repository.backend.id
  description = "Artifact Registry repository ID."
}

output "backend_service_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Cloud Run backend service URL."
}

output "deploy_service_account_email" {
  value       = google_service_account.deploy.email
  description = "Deploy pipeline service account email."
}

output "runtime_service_account_email" {
  value       = google_service_account.runtime.email
  description = "Backend runtime service account email."
}

output "migration_service_account_email" {
  value       = google_service_account.migrate.email
  description = "Migration job service account email."
}

output "secret_ids" {
  value       = [for secret in google_secret_manager_secret.backend : secret.secret_id]
  description = "Secret Manager IDs created for backend runtime."
}
