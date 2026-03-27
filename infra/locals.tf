locals {
  name_prefix = "take-a-sip-${var.environment}"
  labels = merge(
    {
      app         = "take-a-sip"
      environment = var.environment
      managed_by  = "terraform"
    },
    var.labels
  )
}
