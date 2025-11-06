#!/bin/sh

# PostgreSQL Backup Script for Docker Production
# This script creates daily backups with rotation

set -e

# Configuration
POSTGRES_HOST="postgres"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${POSTGRES_DB}_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Retention settings
DAYS_TO_KEEP=30
WEEKLY_BACKUPS_TO_KEEP=12
MONTHLY_BACKUPS_TO_KEEP=12

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup process for database: $POSTGRES_DB"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create the backup
log "Creating backup: $BACKUP_FILE"
if pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_PATH"; then
    log "Backup created successfully: $BACKUP_PATH"
    
    # Compress the backup
    gzip "$BACKUP_PATH"
    COMPRESSED_BACKUP="${BACKUP_PATH}.gz"
    log "Backup compressed: $COMPRESSED_BACKUP"
    
    # Verify the compressed backup
    if [ -f "$COMPRESSED_BACKUP" ] && [ -s "$COMPRESSED_BACKUP" ]; then
        log "Backup verification successful"
        
        # Create checksums
        cd "$BACKUP_DIR"
        sha256sum "$(basename "$COMPRESSED_BACKUP")" > "${BACKUP_FILE}.gz.sha256"
        log "Checksum created: ${BACKUP_FILE}.gz.sha256"
        
    else
        log "ERROR: Backup verification failed"
        exit 1
    fi
else
    log "ERROR: Backup creation failed"
    exit 1
fi

# Backup rotation
log "Starting backup rotation"

# Remove daily backups older than specified days
find "$BACKUP_DIR" -name "backup_${POSTGRES_DB}_*.sql.gz" -type f -mtime +$DAYS_TO_KEEP -delete
find "$BACKUP_DIR" -name "backup_${POSTGRES_DB}_*.sql.gz.sha256" -type f -mtime +$DAYS_TO_KEEP -delete

# Keep weekly backups (Sundays)
if [ "$(date +%u)" = "7" ]; then
    WEEKLY_BACKUP="weekly_backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
    cp "$COMPRESSED_BACKUP" "${BACKUP_DIR}/${WEEKLY_BACKUP}"
    sha256sum "$WEEKLY_BACKUP" > "${BACKUP_DIR}/${WEEKLY_BACKUP}.sha256"
    log "Weekly backup created: $WEEKLY_BACKUP"
    
    # Remove old weekly backups
    find "$BACKUP_DIR" -name "weekly_backup_${POSTGRES_DB}_*.sql.gz" -type f -mtime +$((WEEKLY_BACKUPS_TO_KEEP * 7)) -delete
    find "$BACKUP_DIR" -name "weekly_backup_${POSTGRES_DB}_*.sql.gz.sha256" -type f -mtime +$((WEEKLY_BACKUPS_TO_KEEP * 7)) -delete
fi

# Keep monthly backups (1st of month)
if [ "$(date +%d)" = "01" ]; then
    MONTHLY_BACKUP="monthly_backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
    cp "$COMPRESSED_BACKUP" "${BACKUP_DIR}/${MONTHLY_BACKUP}"
    sha256sum "$MONTHLY_BACKUP" > "${BACKUP_DIR}/${MONTHLY_BACKUP}.sha256"
    log "Monthly backup created: $MONTHLY_BACKUP"
    
    # Remove old monthly backups
    find "$BACKUP_DIR" -name "monthly_backup_${POSTGRES_DB}_*.sql.gz" -type f -mtime +$((MONTHLY_BACKUPS_TO_KEEP * 30)) -delete
    find "$BACKUP_DIR" -name "monthly_backup_${POSTGRES_DB}_*.sql.gz.sha256" -type f -mtime +$((MONTHLY_BACKUPS_TO_KEEP * 30)) -delete
fi

# Generate backup report
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_${POSTGRES_DB}_*.sql.gz" -type f | wc -l)
WEEKLY_COUNT=$(find "$BACKUP_DIR" -name "weekly_backup_${POSTGRES_DB}_*.sql.gz" -type f | wc -l)
MONTHLY_COUNT=$(find "$BACKUP_DIR" -name "monthly_backup_${POSTGRES_DB}_*.sql.gz" -type f | wc -l)
BACKUP_SIZE=$(du -h "$COMPRESSED_BACKUP" | cut -f1)

cat > "${BACKUP_DIR}/backup_report.json" << EOF
{
    "lastBackup": {
        "timestamp": "$TIMESTAMP",
        "file": "$(basename "$COMPRESSED_BACKUP")",
        "size": "$BACKUP_SIZE",
        "database": "$POSTGRES_DB"
    },
    "statistics": {
        "dailyBackups": $BACKUP_COUNT,
        "weeklyBackups": $WEEKLY_COUNT,
        "monthlyBackups": $MONTHLY_COUNT,
        "totalSize": "$(du -sh "$BACKUP_DIR" | cut -f1)"
    },
    "retention": {
        "dailyDays": $DAYS_TO_KEEP,
        "weeklyBackups": $WEEKLY_BACKUPS_TO_KEEP,
        "monthlyBackups": $MONTHLY_BACKUPS_TO_KEEP
    }
}
EOF

log "Backup process completed successfully"
log "Daily backups: $BACKUP_COUNT"
log "Weekly backups: $WEEKLY_COUNT"
log "Monthly backups: $MONTHLY_COUNT"
log "Backup size: $BACKUP_SIZE"
