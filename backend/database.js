const mysql = require('mysql2');
require('dotenv').config();

// Configuration du pool de connexions avec gestion d'erreurs
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'medical_appointments',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  multipleStatements: false
});

// Convertir en promesses pour async/await
const promisePool = pool.promise();

// Test de connexion au démarrage
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Connexion MySQL réussie!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion MySQL:', error.message);
    console.error('Vérifiez vos paramètres dans le fichier .env');
    return false;
  }
};

// Gestion des erreurs de pool
pool.on('error', (err) => {
  console.error('❌ Erreur MySQL Pool:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Connexion à la base de données perdue. Reconnexion...');
  }
});

// Fonction helper pour exécuter des requêtes avec gestion d'erreurs
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await promisePool.execute(query, params);
    return { success: true, data: results };
  } catch (error) {
    console.error('Erreur de requête SQL:', error.message);
    console.error('Query:', query);
    console.error('Params:', params);
    return { success: false, error: error.message, code: error.code };
  }
};

module.exports = {
  pool: promisePool,
  testConnection,
  executeQuery
};