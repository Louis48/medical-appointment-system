// create-admin.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log("Connexion MySQL réussie ✔");

    const email = "tsiferana@gmail.com";
    const password = "Admin123!";  // ← CHANGE ICI si tu veux un autre mot de passe

    const hashed = await bcrypt.hash(password, 10);

    const [rows] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (rows.length > 0) {
      // L'admin existe → on met à jour
      await connection.execute(
        "UPDATE users SET password = ? WHERE email = ?",
        [hashed, email]
      );
      console.log("✔ Mot de passe admin mis à jour !");
    } else {
      // L'admin n'existe pas → on le crée
      await connection.execute(
        "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)",
        ["Administrateur", email, hashed, "admin"]
      );
      console.log("✔ Admin créé avec succès !");
    }

    await connection.end();
    console.log("Terminé ✔");

  } catch (err) {
    console.error("❌ Erreur :", err.message);
  }
})();
