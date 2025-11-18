-- -----------------------------------------------------
--   DATABASE : medical_appointment (PostgreSQL)
--   DESCRIPTION : Script complet pour système médical
-- -----------------------------------------------------

-- Supprimer les tables si elles existent (pour éviter les conflits)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Créer un type ENUM pour les rôles
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'patient');

-- Créer un type ENUM pour les statuts de rendez-vous
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- -----------------------------------------------------
-- TABLE : users
-- -----------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'patient',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index sur l'email pour optimiser les recherches
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- -----------------------------------------------------
-- TABLE : doctors
-- -----------------------------------------------------
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index sur user_id
CREATE INDEX idx_doctors_user_id ON doctors(user_id);

-- -----------------------------------------------------
-- TABLE : appointments
-- -----------------------------------------------------
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status appointment_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Index pour optimiser les recherches
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- -----------------------------------------------------
-- INSERT : admin par défaut
-- Email : admin@medical.com
-- Password : admin123 (hashé avec bcrypt)
-- -----------------------------------------------------

INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@medical.com', '$2b$10$HdP/Yz9gS31HOZElHLV42uE3qPGVbzGFUTLxKz16Z8Wz1SSBcWc4m', 'admin');

-- -----------------------------------------------------
-- Données de test (optionnel)
-- -----------------------------------------------------

-- Ajouter quelques docteurs de test
INSERT INTO users (name, email, password, role)
VALUES 
    ('Dr. Jean Martin', 'dr.martin@medical.com', '$2b$10$HdP/Yz9gS31HOZElHLV42uE3qPGVbzGFUTLxKz16Z8Wz1SSBcWc4m', 'doctor'),
    ('Dr. Marie Dupont', 'dr.dupont@medical.com', '$2b$10$HdP/Yz9gS31HOZElHLV42uE3qPGVbzGFUTLxKz16Z8Wz1SSBcWc4m', 'doctor');

INSERT INTO doctors (user_id, specialization, phone)
VALUES 
    (2, 'Cardiologie', '+33123456789'),
    (3, 'Pédiatrie', '+33987654321');

-- Ajouter un patient de test
INSERT INTO users (name, email, password, role)
VALUES ('John Doe', 'patient@medical.com', '$2b$10$HdP/Yz9gS31HOZElHLV42uE3qPGVbzGFUTLxKz16Z8Wz1SSBcWc4m', 'patient');
