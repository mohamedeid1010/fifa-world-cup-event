import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

function parseBooleanEnv(name, fallback) {
  const value = process.env[name];

  if (value == null || value === "") {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

let dbServer = process.env.DB_SERVER || "localhost\\SQLEXPRESS";
let instanceName = process.env.DB_INSTANCE || undefined;

if (!instanceName && dbServer.includes("\\")) {
  const parts = dbServer.split("\\");
  dbServer = parts[0];
  instanceName = parts[1];
}

const parsedPort = Number.parseInt(process.env.DB_PORT || "1433", 10);
const isLocalServer = ["localhost", "127.0.0.1", "."].includes(dbServer.toLowerCase());
const defaultTrustServerCertificate = isLocalServer || Boolean(instanceName);

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: dbServer,
  database: process.env.DB_NAME,
  ...(instanceName ? {} : { port: Number.isFinite(parsedPort) ? parsedPort : 1433 }),
  options: {
    encrypt: parseBooleanEnv("DB_ENCRYPT", true),
    trustServerCertificate: parseBooleanEnv("DB_TRUST_CERT", defaultTrustServerCertificate),
    ...(instanceName ? { instanceName } : {}),
  },
};

let pool;

/**
 * Ensure the database has all the columns the application expects.
 * Uses IF NOT EXISTS checks so it is safe to run on every startup.
 */
async function ensureSchema(pool) {
  const migrations = [
    // Create missing Payment table for environments that were provisioned without it
    `IF OBJECT_ID('Payment', 'U') IS NULL
     BEGIN
       CREATE TABLE Payment (
         payment_id INT PRIMARY KEY,
         amount DECIMAL(10,2) CHECK (amount > 0),
         payment_date DATETIME DEFAULT GETDATE(),
         payment_method VARCHAR(50),
         status VARCHAR(20) DEFAULT 'Pending',
         ticket_id INT,
         FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id)
       )
     END`,
    // EmergencyRequest missing columns
    `IF COL_LENGTH('EmergencyRequest','workflowStatus') IS NULL ALTER TABLE EmergencyRequest ADD workflowStatus VARCHAR(30) DEFAULT 'PENDING'`,
    `IF COL_LENGTH('EmergencyRequest','risk') IS NULL ALTER TABLE EmergencyRequest ADD risk VARCHAR(20) DEFAULT 'NORMAL'`,
    `IF COL_LENGTH('EmergencyRequest','title') IS NULL ALTER TABLE EmergencyRequest ADD title VARCHAR(200) NULL`,
    `IF COL_LENGTH('EmergencyRequest','details') IS NULL ALTER TABLE EmergencyRequest ADD details VARCHAR(MAX) DEFAULT ''`,
    `IF COL_LENGTH('EmergencyRequest','source') IS NULL ALTER TABLE EmergencyRequest ADD source VARCHAR(30) DEFAULT 'user-portal'`,
    `IF COL_LENGTH('EmergencyRequest','lastTouchedAt') IS NULL ALTER TABLE EmergencyRequest ADD lastTouchedAt DATETIME DEFAULT GETDATE()`,
    `IF COL_LENGTH('EmergencyRequest','ticketRef') IS NULL ALTER TABLE EmergencyRequest ADD ticketRef VARCHAR(50) NULL`,
    `IF COL_LENGTH('EmergencyRequest','sectionLabel') IS NULL ALTER TABLE EmergencyRequest ADD sectionLabel VARCHAR(50) NULL`,
    `IF COL_LENGTH('EmergencyRequest','rowLabel') IS NULL ALTER TABLE EmergencyRequest ADD rowLabel VARCHAR(20) NULL`,
    `IF COL_LENGTH('EmergencyRequest','seatLabel') IS NULL ALTER TABLE EmergencyRequest ADD seatLabel VARCHAR(20) NULL`,
    `IF COL_LENGTH('EmergencyRequest','liveLatitude') IS NULL ALTER TABLE EmergencyRequest ADD liveLatitude FLOAT NULL`,
    `IF COL_LENGTH('EmergencyRequest','liveLongitude') IS NULL ALTER TABLE EmergencyRequest ADD liveLongitude FLOAT NULL`,
    `IF COL_LENGTH('EmergencyRequest','liveAccuracy') IS NULL ALTER TABLE EmergencyRequest ADD liveAccuracy FLOAT NULL`,
    `IF COL_LENGTH('EmergencyRequest','liveCapturedAt') IS NULL ALTER TABLE EmergencyRequest ADD liveCapturedAt DATETIME NULL`,
    `IF COL_LENGTH('EmergencyRequest','liveMapX') IS NULL ALTER TABLE EmergencyRequest ADD liveMapX FLOAT NULL`,
    `IF COL_LENGTH('EmergencyRequest','liveMapY') IS NULL ALTER TABLE EmergencyRequest ADD liveMapY FLOAT NULL`,
    // Control board workflow columns
    `IF COL_LENGTH('EmergencyRequest','controlQueuedAt') IS NULL ALTER TABLE EmergencyRequest ADD controlQueuedAt DATETIME NULL`,
    `IF COL_LENGTH('EmergencyRequest','assignedUnit') IS NULL ALTER TABLE EmergencyRequest ADD assignedUnit VARCHAR(50) NULL`,
    `IF COL_LENGTH('EmergencyRequest','handledAt') IS NULL ALTER TABLE EmergencyRequest ADD handledAt DATETIME NULL`,
    `IF COL_LENGTH('EmergencyRequest','archivedAt') IS NULL ALTER TABLE EmergencyRequest ADD archivedAt DATETIME NULL`,
    // Widen existing columns that may be too small
    `ALTER TABLE EmergencyRequest ALTER COLUMN status VARCHAR(50)`,
    `ALTER TABLE EmergencyRequest ALTER COLUMN type VARCHAR(100)`,
    `IF COL_LENGTH('EmergencyRequest','title') IS NOT NULL ALTER TABLE EmergencyRequest ALTER COLUMN title VARCHAR(200) NULL`,
    // FoodOrder missing columns
    `IF COL_LENGTH('FoodOrder','status') IS NULL ALTER TABLE FoodOrder ADD status VARCHAR(30) DEFAULT 'Pending'`,
    `IF COL_LENGTH('FoodOrder','notes') IS NULL ALTER TABLE FoodOrder ADD notes VARCHAR(MAX) DEFAULT ''`,
    `IF COL_LENGTH('FoodOrder','requested_at') IS NULL ALTER TABLE FoodOrder ADD requested_at DATETIME DEFAULT GETDATE()`,
    `IF COL_LENGTH('FoodOrder','controlQueuedAt') IS NULL ALTER TABLE FoodOrder ADD controlQueuedAt DATETIME NULL`,
    `IF COL_LENGTH('FoodOrder','handledAt') IS NULL ALTER TABLE FoodOrder ADD handledAt DATETIME NULL`,
    `IF COL_LENGTH('FoodOrder','archivedAt') IS NULL ALTER TABLE FoodOrder ADD archivedAt DATETIME NULL`,
    // Allow optional phone numbers without blocking multiple blank values
    `IF OBJECT_ID('Person', 'U') IS NOT NULL
     BEGIN
       DECLARE @phoneConstraint sysname;
       DECLARE @phoneIndex sysname;
       DECLARE @sql NVARCHAR(400);

       SELECT TOP 1 @phoneConstraint = kc.name
       FROM sys.key_constraints kc
       JOIN sys.index_columns ic
         ON kc.parent_object_id = ic.object_id
        AND kc.unique_index_id = ic.index_id
       JOIN sys.columns c
         ON ic.object_id = c.object_id
        AND ic.column_id = c.column_id
       WHERE kc.parent_object_id = OBJECT_ID('Person')
         AND kc.type = 'UQ'
         AND c.name = 'phone';

       IF @phoneConstraint IS NOT NULL
       BEGIN
         SET @sql = N'ALTER TABLE Person DROP CONSTRAINT ' + QUOTENAME(@phoneConstraint);
         EXEC(@sql);
       END

       WHILE 1 = 1
       BEGIN
         SET @phoneIndex = NULL;

         SELECT TOP 1 @phoneIndex = i.name
         FROM sys.indexes i
         JOIN sys.index_columns ic
           ON i.object_id = ic.object_id
          AND i.index_id = ic.index_id
         JOIN sys.columns c
           ON ic.object_id = c.object_id
          AND ic.column_id = c.column_id
         WHERE i.object_id = OBJECT_ID('Person')
           AND i.is_unique = 1
           AND i.is_primary_key = 0
           AND i.is_unique_constraint = 0
           AND c.name = 'phone';

         IF @phoneIndex IS NULL BREAK;

         SET @sql = N'DROP INDEX ' + QUOTENAME(@phoneIndex) + N' ON Person';
         EXEC(@sql);
       END

       UPDATE Person
       SET phone = ''
       WHERE LTRIM(RTRIM(ISNULL(phone, ''))) = '';

       IF NOT EXISTS (
          SELECT 1
          FROM sys.default_constraints dc
          JOIN sys.columns c
            ON dc.parent_object_id = c.object_id
           AND dc.parent_column_id = c.column_id
         WHERE dc.parent_object_id = OBJECT_ID('Person')
           AND c.name = 'phone'
       )
       BEGIN
         ALTER TABLE Person ADD CONSTRAINT DF_Person_phone DEFAULT ('') FOR phone;
       END

       ALTER TABLE Person ALTER COLUMN phone VARCHAR(20) NOT NULL;

       IF NOT EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE object_id = OBJECT_ID('Person')
            AND name = 'UX_Person_phone_present'
       )
       BEGIN
         CREATE UNIQUE INDEX UX_Person_phone_present
         ON Person(phone)
         WHERE phone <> '';
       END
     END`,
    `IF OBJECT_ID('Attendee', 'U') IS NOT NULL
     BEGIN
       UPDATE Attendee
       SET emergency_contact = ''
       WHERE LTRIM(RTRIM(ISNULL(emergency_contact, ''))) = ''
     END`,
    `IF OBJECT_ID('Attendee', 'U') IS NOT NULL
     BEGIN
       IF COL_LENGTH('Attendee', 'emergency_contact') IS NOT NULL
         ALTER TABLE Attendee ALTER COLUMN emergency_contact VARCHAR(100) NOT NULL
     END`,
    `IF OBJECT_ID('Attendee', 'U') IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints dc
        JOIN sys.columns c
          ON dc.parent_object_id = c.object_id
         AND dc.parent_column_id = c.column_id
       WHERE dc.parent_object_id = OBJECT_ID('Attendee')
         AND c.name = 'emergency_contact'
     )
     BEGIN
       ALTER TABLE Attendee ADD CONSTRAINT DF_Attendee_emergency_contact DEFAULT ('') FOR emergency_contact
     END`,
  ];

  for (const migration of migrations) {
    try {
      await pool.request().query(migration);
    } catch (err) {
      console.warn('Migration warning:', err.message);
    }
  }
  console.log('Schema verified / migrated successfully');
}

export async function connectDB() {
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    console.log("Connected to SQL Server");
    await ensureSchema(pool);
    return pool;
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
}

export function getPool() {
  return pool;
}
