import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

let dbServer = process.env.DB_SERVER || "localhost\\SQLEXPRESS";
let instanceName = undefined;

if (dbServer.includes("\\")) {
  const parts = dbServer.split("\\");
  dbServer = parts[0];
  instanceName = parts[1];
}

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: dbServer,
  database: process.env.DB_NAME,
  port: 1433,
  options: {
    encrypt: true, // Use this if you're on Windows Azure
    trustServerCertificate: true, // Change to true for local dev / self-signed certs
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
    // FoodOrder missing columns
    `IF COL_LENGTH('FoodOrder','status') IS NULL ALTER TABLE FoodOrder ADD status VARCHAR(30) DEFAULT 'Pending'`,
    `IF COL_LENGTH('FoodOrder','notes') IS NULL ALTER TABLE FoodOrder ADD notes VARCHAR(MAX) DEFAULT ''`,
    `IF COL_LENGTH('FoodOrder','requested_at') IS NULL ALTER TABLE FoodOrder ADD requested_at DATETIME DEFAULT GETDATE()`,
    `IF COL_LENGTH('FoodOrder','controlQueuedAt') IS NULL ALTER TABLE FoodOrder ADD controlQueuedAt DATETIME NULL`,
    `IF COL_LENGTH('FoodOrder','handledAt') IS NULL ALTER TABLE FoodOrder ADD handledAt DATETIME NULL`,
    `IF COL_LENGTH('FoodOrder','archivedAt') IS NULL ALTER TABLE FoodOrder ADD archivedAt DATETIME NULL`,
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
