const { Pool } = require('pg');
require('dotenv').config();

// Configuration du pool de connexions PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'medical_user',
  password: process.env.DB_PASSWORD || 'medical_password',
  database: process.env.DB_NAME || 'medical_appointments',
  port: process.env.DB_PORT || 5432,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test de connexion au démarrage
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connexion PostgreSQL réussie!');
    const result = await client.query('SELECT NOW()');
    console.log('📅 Database time:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error.message);
    console.error('Vérifiez vos paramètres dans le fichier .env');
    return false;
  }
};

// Gestion des erreurs de pool
pool.on('error', (err, client) => {
  console.error('❌ Erreur PostgreSQL Pool:', err);
});

pool.on('connect', () => {
  console.log('🔌 Nouvelle connexion PostgreSQL établie');
});

pool.on('remove', () => {
  console.log('🔌 Connexion PostgreSQL fermée');
});

// Fonction helper pour exécuter des requêtes avec gestion d'erreurs
const executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return { success: true, data: result.rows, rowCount: result.rowCount };
  } catch (error) {
    console.error('Erreur de requête SQL:', error.message);
    console.error('Query:', query);
    console.error('Params:', params);
    return { success: false, error: error.message, code: error.code };
  } finally {
    client.release();
  }
};

// Fonction pour exécuter des transactions
const executeTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return { success: true, data: result };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction
};
