# Database Migrations

This directory contains ordered SQL migration files for the Rubbish Revamp MySQL database.

## Naming Convention

Migration files must follow this pattern:

```
YYYYMMDDHHMMSS_description.sql
```

Examples:
```
20260912120000_create_users_table.sql
20260913090000_add_kyc_verified_to_users.sql
20260914140000_create_waste_listings_table.sql
```

## Status

> **Phase 1**: No migrations are present yet. The schema is defined in `../schema.sql` as a preliminary design.
>
> **Phase 2**: Formal migration files will be added here as the MySQL database is built out.

## Running Migrations (Phase 2+)

Migration tooling options under consideration:

- **Option A**: [db-migrate](https://db-migrate.readthedocs.io/) — lightweight Node.js migration runner
- **Option B**: Manual ordered execution via npm script
- **Option C**: [Flyway](https://flywaydb.org/) — enterprise-grade migration tool

A migration runner will be added to `backend/package.json` scripts in Phase 2.

## Rules

1. Never edit a migration file after it has been applied to any environment.
2. Always write a corresponding rollback (`DOWN`) section.
3. Test migrations on a local copy of the database before applying to staging/production.
