# Runbook: OfficeFix database restore

This runbook covers restoring the OfficeFix PostgreSQL database
(`psql-harbourofficefix21-78593`, Azure Database for PostgreSQL flexible server, defined in
`infra/postgres.tf`).

## Backup configuration

| Setting | Value | Where |
|---|---|---|
| Automated backups | Always on (managed by Azure) | flexible server |
| Retention | 35 days (`backup_retention_days`, minimum 30 enforced by validation) | `infra/postgres.tf` |
| Separate-region storage | Geo-redundant backup to the Azure paired region (`geo_redundant_backup_enabled = true`) | `infra/postgres.tf` |
| Point-in-time recovery | Any point in the retention window, to the second | built in |

Geo-redundant backup can only be enabled when the server is created. If the server already
exists without it, a new server must be created (or restored) with the setting on.

A restore always creates a **new** server. It never overwrites the existing one.

## Before you start

- Azure CLI signed in with rights on the resource group (`az login`, `az account set --subscription <subscription>`).
- Decide the restore point (UTC, ISO 8601), for example the time just before the bad change or data loss.
- Pick a name for the new server, for example `psql-harbourofficefix21-78593-restore-<yyyymmdd>`.
- Tell the team that the app will be read-only or down during cutover.

Check the earliest available restore point:

```bash
az postgres flexible-server show \
  --resource-group <resource-group> \
  --name psql-harbourofficefix21-78593 \
  --query "{earliestRestore: backup.earliestRestoreDate, retentionDays: backup.backupRetentionDays, geoRedundant: backup.geoRedundantBackup}"
```

## Option A: Point-in-time restore (same region)

Use this for data loss, a bad migration, or accidental deletes.

```bash
az postgres flexible-server restore \
  --resource-group <resource-group> \
  --name psql-harbourofficefix21-78593-restore-<yyyymmdd> \
  --source-server psql-harbourofficefix21-78593 \
  --restore-time "<yyyy-mm-ddThh:mm:ssZ>"
```

## Option B: Geo-restore (paired region)

Use this when the primary region is unavailable.

```bash
az postgres flexible-server geo-restore \
  --resource-group <resource-group> \
  --name psql-harbourofficefix21-78593-geo-<yyyymmdd> \
  --source-server psql-harbourofficefix21-78593 \
  --location <paired-region>
```

Geo-restore uses the latest geo-replicated backup, which can lag the primary by up to about one hour.

## After the restore

1. Wait until the new server shows `State: Ready`:
   `az postgres flexible-server show -g <resource-group> -n <new-server> --query state`
2. Re-apply settings that are not copied by a restore: firewall rules / private networking,
   server parameters you changed, and Entra ID admins if used.
3. Verify the data. Connect with `psql` (add `sslmode=require`) and check:
   ```sql
   SET search_path TO django_app;
   SELECT count(*) FROM maintenance_maintenancerequest;
   SELECT count(*) FROM maintenance_technician;
   SELECT max(created_at) FROM maintenance_maintenancerequest;
   ```
   Compare the counts and latest timestamps with what you expect at the restore point.
4. Confirm migrations are current: run `python manage.py showmigrations maintenance` with
   `DATABASE_URL` pointing at the new server.
5. Cut over: update `DATABASE_URL` for the API (root `.env` / deployment secret) to the new
   server's FQDN, restart the `api` service, and check `GET /health` returns 200.
6. Bring the restored server under Terraform (`terraform import` or update the `name` in
   `infra/postgres.tf`) so backup retention and geo-redundancy stay managed. Confirm
   `backup_retention_days = 35` and `geo_redundant_backup_enabled = true` on the new server.
7. Keep the old server until the restore is confirmed, then remove it deliberately
   (it has `prevent_destroy` in Terraform).

## Restore test

A test restore must be completed before go-live and then repeated at least once a year
and after any major change to the database setup. Restore to a temporary server, run the
checks in "After the restore" steps 1, 3 and 4 (do not cut over), then delete the
temporary server.

Record each test here:

| Date (UTC) | Performed by | Type (PITR / geo) | Restore point | Time to Ready | Data checks passed | Notes |
|---|---|---|---|---|---|---|
| _Pending: required before go-live_ | | | | | | |
