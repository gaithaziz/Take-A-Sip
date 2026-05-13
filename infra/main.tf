resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com"
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = var.artifact_registry_repository_id
  description   = "Backend container images for ${var.environment}"
  format        = "DOCKER"
  labels        = local.labels

  depends_on = [google_project_service.required]
}

resource "google_service_account" "deploy" {
  account_id   = "${local.name_prefix}-deploy"
  display_name = "Take A Sip ${var.environment} deploy pipeline"
}

resource "google_service_account" "runtime" {
  account_id   = "${local.name_prefix}-runtime"
  display_name = "Take A Sip ${var.environment} backend runtime"
}

resource "google_service_account" "migrate" {
  account_id   = "${local.name_prefix}-migrate"
  display_name = "Take A Sip ${var.environment} migration job"
}

resource "google_secret_manager_secret" "backend" {
  for_each = toset(var.secret_ids)

  secret_id = each.value
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service" "backend" {
  name                = var.cloud_run_service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  labels              = local.labels

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    containers {
      image = var.initial_backend_image

      resources {
        limits = {
          cpu    = var.container_cpu
          memory = var.container_memory
        }
      }

      ports {
        container_port = 8000
      }

      dynamic "env" {
        for_each = var.backend_runtime_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = google_secret_manager_secret.backend
        content {
          name = upper(replace(env.key, "-", "_"))
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_service_iam_member" "public_invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_job" "migrate" {
  name                = var.migration_job_name
  location            = var.region
  deletion_protection = false
  labels              = local.labels

  template {
    template {
      service_account = google_service_account.migrate.email
      timeout         = "1800s"

      containers {
        image   = var.initial_backend_image
        command = ["alembic"]
        args    = ["upgrade", "head"]

        resources {
          limits = {
            cpu    = var.container_cpu
            memory = var.container_memory
          }
        }

        dynamic "env" {
          for_each = var.backend_runtime_env
          content {
            name  = env.key
            value = env.value
          }
        }

        dynamic "env" {
          for_each = google_secret_manager_secret.backend
          content {
            name = upper(replace(env.key, "-", "_"))
            value_source {
              secret_key_ref {
                secret  = env.value.secret_id
                version = "latest"
              }
            }
          }
        }
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_monitoring_uptime_check_config" "backend_health" {
  display_name = "${local.name_prefix}-backend-health"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = var.health_path
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      host       = trimprefix(google_cloud_run_v2_service.backend.uri, "https://")
      project_id = var.project_id
    }
  }

  depends_on = [google_cloud_run_v2_service.backend]
}

resource "google_monitoring_alert_policy" "backend_uptime" {
  display_name          = "${local.name_prefix}-backend-health-failure"
  combiner              = "OR"
  enabled               = true
  notification_channels = var.notification_channel_ids

  conditions {
    display_name = "Backend uptime check failed"

    condition_threshold {
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "300s"
      filter          = "resource.type=\"uptime_url\" AND metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.backend_health.uptime_check_id}\""

      aggregations {
        alignment_period   = "1200s"
        per_series_aligner = "ALIGN_NEXT_OLDER"
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  user_labels = local.labels
}

resource "google_monitoring_alert_policy" "backend_5xx_rate" {
  display_name          = "${local.name_prefix}-backend-5xx-rate"
  combiner              = "OR"
  enabled               = true
  notification_channels = var.notification_channel_ids

  conditions {
    display_name = "Backend 5xx responses exceeded threshold"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = var.backend_5xx_count_threshold
      duration        = "300s"
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  user_labels = local.labels
}

resource "google_monitoring_alert_policy" "backend_latency" {
  display_name          = "${local.name_prefix}-backend-latency"
  combiner              = "OR"
  enabled               = true
  notification_channels = var.notification_channel_ids

  conditions {
    display_name = "Backend p95 latency exceeded threshold"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = var.backend_latency_ms_threshold
      duration        = "300s"
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_latencies\""

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MAX"
        group_by_fields      = ["resource.labels.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  user_labels = local.labels
}

resource "google_monitoring_alert_policy" "backend_startup_latency" {
  display_name          = "${local.name_prefix}-backend-startup-latency"
  combiner              = "OR"
  enabled               = true
  notification_channels = var.notification_channel_ids

  conditions {
    display_name = "Backend revision startup latency exceeded threshold"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = var.backend_startup_latency_ms_threshold
      duration        = "300s"
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/container/startup_latencies\""

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MAX"
        group_by_fields      = ["resource.labels.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  user_labels = local.labels
}

resource "google_monitoring_alert_policy" "migration_job_failure" {
  display_name          = "${local.name_prefix}-migration-job-failure"
  combiner              = "OR"
  enabled               = true
  notification_channels = var.notification_channel_ids

  conditions {
    display_name = "Migration job failed"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "60s"
      filter          = "resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"${google_cloud_run_v2_job.migrate.name}\" AND metric.type=\"run.googleapis.com/job/completed_execution_count\" AND metric.labels.result=\"failed\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  user_labels = local.labels
}
