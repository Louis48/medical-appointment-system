-- -----------------------------------------------------
--   DATABASE : medical_appointment
--   DESCRIPTION : Script complet pour système médical
-- -----------------------------------------------------

-- Supprimer les tables si elles existent (pour éviter les conflits)
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS users;

-- -----------------------------------------------------
-- TABLE : users
-- -----------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'doctor', 'patient') DEFAULT 'patient',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- TABLE : doctors
-- -----------------------------------------------------
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- TABLE : appointments
-- -----------------------------------------------------
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- INSERT : admin par défaut
-- Email : admin@medical.com
-- Password : admin123 (à hasher si backend utilise bcrypt)
-- -----------------------------------------------------

INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@medical.com', '$2b$10$HdP/Yz9gS31HOZElHLV42uE3qPGVbzGFUTLxKz16Z8Wz1SSBcWc4m', 'admin');

-- Explication :
-- Le mot de passe hashé correspond à "admin123"
-- Si ton backend utilise bcrypt, il fonctionnera immédiatement
