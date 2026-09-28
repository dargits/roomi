const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const MYSQL_BIN = 'C:\\xampp\\mysql\\bin\\mysql.exe';
const DB_NAME = 'stay';
const BACKUPS_DIR = path.resolve(__dirname, '../backups');

function queryMysql(query) {
    const cmd = `"${MYSQL_BIN}" -u root ${DB_NAME} --default-character-set=utf8mb4 --batch --raw -e "${query.replace(/"/g, '\\"')}"`;
    return execSync(cmd, { encoding: 'utf8' });
}

function calculateSha256(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function escapeCsv(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

async function main() {
    console.log('--- Starting Official PMS System Backup Packaging ---');
    const timestamp = '2026-09-27_200000';
    const zipFileName = `stayaway_backup_${timestamp}.zip`;
    const sqlFileName = `stayaway_backup_${timestamp}.sql`;

    const targetZipPath = path.join(BACKUPS_DIR, zipFileName);
    const targetSqlPath = path.join(BACKUPS_DIR, sqlFileName);
    const tempDir = path.join(BACKUPS_DIR, `temp_${timestamp}`);
    const tempCsvDir = path.join(tempDir, 'csv');

    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempCsvDir, { recursive: true });

    // 1. Copy full operational SQL to database_dump.sql and targetSqlPath
    const sourceSqlPath = path.join(BACKUPS_DIR, 'stayaway_backup_full_operational_2026.sql');
    fs.copyFileSync(sourceSqlPath, path.join(tempDir, 'database_dump.sql'));
    fs.copyFileSync(sourceSqlPath, targetSqlPath);
    console.log('Exported database_dump.sql successfully.');

    // 2. Fetch all tables and counts
    const tablesRaw = queryMysql('SHOW TABLES;');
    const tables = tablesRaw.trim().split('\n').slice(1).map(t => t.trim()).filter(Boolean);
    console.log(`Found ${tables.length} tables in database '${DB_NAME}'.`);

    const tableSummaries = [];
    let totalRecords = 0;

    for (const table of tables) {
        const countRaw = queryMysql(`SELECT COUNT(*) FROM \`${table}\`;`);
        const count = parseInt(countRaw.trim().split('\n')[1] || '0', 10);
        totalRecords += count;
        tableSummaries.push({ tableName: table, recordCount: count });

        // Export table data to CSV
        const dataRaw = queryMysql(`SELECT * FROM \`${table}\`;`);
        const lines = dataRaw.split('\n').filter(l => l.length > 0);
        if (lines.length > 0) {
            const csvRows = lines.map(line => {
                const cols = line.split('\t');
                return cols.map(escapeCsv).join(',');
            });
            // Add UTF-8 BOM
            const csvContent = '\uFEFF' + csvRows.join('\r\n');
            fs.writeFileSync(path.join(tempCsvDir, `${table.toLowerCase()}.csv`), csvContent, 'utf8');
        } else {
            fs.writeFileSync(path.join(tempCsvDir, `${table.toLowerCase()}.csv`), '\uFEFF', 'utf8');
        }
    }

    console.log(`Generated CSV files for all ${tables.length} tables. Total records: ${totalRecords}`);

    // 3. Build manifest.json
    const manifest = {
        systemName: 'StayAway PMS',
        version: '1.0.0',
        backupType: 'FULL_SYSTEM_ARCHIVE',
        timestamp: timestamp,
        createdAt: '2026-09-27T20:00:00.000',
        createdBy: 'Nguyễn Quản Trị (admin@stayaway.vn)',
        totalTables: tables.length,
        totalRecords: totalRecords,
        tables: tableSummaries
    };

    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log('Created manifest.json.');

    // 4. Create ZIP package using PowerShell Compress-Archive
    if (fs.existsSync(targetZipPath)) {
        fs.unlinkSync(targetZipPath);
    }
    console.log('Compressing backup package into ZIP archive...');
    const psCmd = `powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${targetZipPath}' -Force"`;
    execSync(psCmd);
    console.log('ZIP package created successfully:', targetZipPath);

    // 5. Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 6. Compute sizes and SHA256 checksums
    const zipSize = fs.statSync(targetZipPath).size;
    const zipChecksum = calculateSha256(targetZipPath);

    const sqlSize = fs.statSync(targetSqlPath).size;
    const sqlChecksum = calculateSha256(targetSqlPath);

    console.log(`ZIP: ${zipFileName} | Size: ${zipSize} bytes | SHA256: ${zipChecksum}`);
    console.log(`SQL: ${sqlFileName} | Size: ${sqlSize} bytes | SHA256: ${sqlChecksum}`);

    // 7. Insert records into system_backups table
    const insertZipSql = `
        INSERT INTO \`system_backups\`
        (\`file_name\`, \`file_path\`, \`file_size_bytes\`, \`backup_type\`, \`status\`, \`table_count\`, \`record_count\`, \`checksum\`, \`created_by_id\`, \`note\`, \`created_at\`)
        VALUES
        ('${zipFileName}', '${targetZipPath.replace(/\\/g, '\\\\')}', ${zipSize}, 'FULL_ZIP', 'SUCCESS', ${tables.length}, ${totalRecords}, '${zipChecksum}', 1, 'Bản sao lưu toàn vẹn hệ thống nghiệp vụ thật StayAway (từ 01/01/2026 đến 27/09/2026)', '2026-09-27 20:00:00.000000');
    `;
    queryMysql(insertZipSql);

    const insertSqlSql = `
        INSERT INTO \`system_backups\`
        (\`file_name\`, \`file_path\`, \`file_size_bytes\`, \`backup_type\`, \`status\`, \`table_count\`, \`record_count\`, \`checksum\`, \`created_by_id\`, \`note\`, \`created_at\`)
        VALUES
        ('${sqlFileName}', '${targetSqlPath.replace(/\\/g, '\\\\')}', ${sqlSize}, 'DATABASE_SQL', 'SUCCESS', ${tables.length}, ${totalRecords}, '${sqlChecksum}', 1, 'Bản sao lưu cơ sở dữ liệu thuần SQL StayAway (từ 01/01/2026 đến 27/09/2026)', '2026-09-27 20:00:05.000000');
    `;
    queryMysql(insertSqlSql);

    // 8. Update hotel_settings
    const updateSettingsSql = `
        UPDATE \`hotel_settings\`
        SET \`last_backup_at\` = '2026-09-27 20:00:00.000000',
            \`last_backup_status\` = 'SUCCESS',
            \`auto_backup_enabled\` = 1,
            \`backup_retention_days\` = 30
        WHERE \`id\` = 1;
    `;
    queryMysql(updateSettingsSql);

    console.log('--- Backup records registered in database successfully! ---');
}

main().catch(err => {
    console.error('Packaging failed:', err);
    process.exit(1);
});
