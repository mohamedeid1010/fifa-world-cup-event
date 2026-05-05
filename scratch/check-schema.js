import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: 'localhost',
    database: process.env.DB_NAME,
    port: 1433,
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  };

  try {
    await sql.connect(config);
    const objectIdRes = await sql.query("SELECT OBJECT_ID('ServiceRequests') as id");
    console.log('Object ID for ServiceRequests:', objectIdRes.recordset[0].id);
    
    const schemaRes = await sql.query("SELECT TABLE_NAME, TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES");
    console.log('All visible tables and schemas:', schemaRes.recordset.map(r => `${r.TABLE_SCHEMA}.${r.TABLE_NAME}`).join(', '));
  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await sql.close();
  }
}

checkSchema();
