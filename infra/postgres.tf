# Azure Database for PostgreSQL flexible server for OfficeFix (HarbourOfficeFix21-78593).
#
# Backup requirements (rel.backup_configured):
#   - Automated backups are always on for flexible server. Retention is set to 35 days
#     (the service maximum, above the 30-day minimum).
#   - geo_redundant_backup_enabled stores backups in the Azure paired region, separate
#     from the primary server's region. This can only be set when the server is created.
#   - Point-in-time recovery is built in: any point inside the retention window can be
#     restored to a new server (create_mode = "PointInTimeRestore"), see
#     docs/runbooks/database-restore.md.
#
# Environment-specific values (resource group, region, admin credentials) are inputs
# with no defaults, per infra/README.md. Supply them through a tfvars file or
# TF_VAR_* environment variables. Never commit the admin password.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

variable "resource_group_name" {
  description = "Existing resource group that holds the PostgreSQL server."
  type        = string
}

variable "location" {
  description = "Primary Azure region for the server. Geo-redundant backups go to its paired region."
  type        = string
}

variable "administrator_login" {
  description = "PostgreSQL administrator login name."
  type        = string
}

variable "administrator_password" {
  description = "PostgreSQL administrator password. Supply via TF_VAR_administrator_password."
  type        = string
  sensitive   = true
}

variable "sku_name" {
  description = "Compute SKU for the flexible server."
  type        = string
  default     = "GP_Standard_D2ds_v5"
}

variable "storage_mb" {
  description = "Storage size in MB."
  type        = number
  default     = 32768
}

variable "backup_retention_days" {
  description = "Automated backup retention in days. Must be at least 30 (service maximum is 35)."
  type        = number
  default     = 35

  validation {
    condition     = var.backup_retention_days >= 30 && var.backup_retention_days <= 35
    error_message = "backup_retention_days must be between 30 and 35."
  }
}

resource "azurerm_postgresql_flexible_server" "officefix" {
  name                = "psql-harbourofficefix21-78593"
  resource_group_name = var.resource_group_name
  location            = var.location

  version    = "17"
  sku_name   = var.sku_name
  storage_mb = var.storage_mb

  administrator_login    = var.administrator_login
  administrator_password = var.administrator_password

  # Automated backups with point-in-time recovery inside this window.
  backup_retention_days = var.backup_retention_days

  # Copies backups to the paired region so they are stored separately from the primary.
  geo_redundant_backup_enabled = true

  lifecycle {
    prevent_destroy = true
    # zone is assigned by Azure when not set; ignore drift so it does not force replacement.
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "officefix" {
  name      = "officefix"
  server_id = azurerm_postgresql_flexible_server.officefix.id
  charset   = "UTF8"
  collation = "en_US.utf8"

  lifecycle {
    prevent_destroy = true
  }
}

output "postgres_server_name" {
  value = azurerm_postgresql_flexible_server.officefix.name
}

output "postgres_server_fqdn" {
  value = azurerm_postgresql_flexible_server.officefix.fqdn
}

output "postgres_backup_retention_days" {
  value = azurerm_postgresql_flexible_server.officefix.backup_retention_days
}

output "postgres_geo_redundant_backup_enabled" {
  value = azurerm_postgresql_flexible_server.officefix.geo_redundant_backup_enabled
}
