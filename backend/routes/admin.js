const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Middleware pour vérifier le rôle admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Accès réservé aux administrateurs' 
    });
  }
  next();
};

// Toutes les routes nécessitent une authentification et un rôle admin
router.use(authenticateToken);
router.use(requireAdmin);

// Obtenir les statistiques globales
router.get('/stats', async (req, res) => {
  try {
    // Statistiques utilisateurs
    const usersStats = await executeQuery(
      `SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) as total_patients,
        SUM(CASE WHEN role = 'doctor' THEN 1 ELSE 0 END) as total_doctors,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins
       FROM users`
    );

    // Statistiques rendez-vous
    const appointmentsStats = await executeQuery(
      `SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM appointments`
    );

    // Rendez-vous aujourd'hui
    const todayAppointments = await executeQuery(
      `SELECT COUNT(*) as today_appointments 
       FROM appointments 
       WHERE DATE(appointment_date) = CURDATE()`
    );

    // Rendez-vous de la semaine
    const weekAppointments = await executeQuery(
      `SELECT COUNT(*) as week_appointments 
       FROM appointments 
       WHERE YEARWEEK(appointment_date, 1) = YEARWEEK(CURDATE(), 1)`
    );

    res.json({
      success: true,
      stats: {
        users: usersStats.success ? usersStats.data[0] : {},
        appointments: appointmentsStats.success ? appointmentsStats.data[0] : {},
        today: todayAppointments.success ? todayAppointments.data[0].today_appointments : 0,
        week: weekAppointments.success ? weekAppointments.data[0].week_appointments : 0
      }
    });
  } catch (error) {
    console.error('Erreur récupération statistiques admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Obtenir tous les utilisateurs
router.get('/users', async (req, res) => {
  try {
    const { role, search } = req.query;
    
    let query = 'SELECT id, email, full_name, phone, role, created_at FROM users WHERE 1=1';
    const params = [];

    if (role && ['patient', 'doctor', 'admin'].includes(role)) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await executeQuery(query, params);

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des utilisateurs' 
      });
    }

    res.json({
      success: true,
      users: result.data
    });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Créer un nouvel utilisateur
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().isLength({ min: 2 }),
  body('role').isIn(['patient', 'doctor', 'admin']),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Données invalides', 
        errors: errors.array() 
      });
    }

    const { email, password, full_name, phone, role } = req.body;

    // Vérifier si l'email existe déjà
    const checkResult = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (checkResult.success && checkResult.data.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cet email est déjà utilisé' 
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer le nouvel utilisateur
    const insertResult = await executeQuery(
      'INSERT INTO users (email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, full_name, phone || null, role]
    );

    if (!insertResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création de l\'utilisateur' 
      });
    }

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      userId: insertResult.data.insertId
    });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Mettre à jour un utilisateur
router.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { full_name, phone, email, role } = req.body;

    const updates = [];
    const params = [];

    if (full_name) {
      updates.push('full_name = ?');
      params.push(full_name);
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone || null);
    }

    if (email) {
      // Vérifier que l'email n'est pas déjà utilisé
      const emailCheck = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (emailCheck.success && emailCheck.data.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cet email est déjà utilisé' 
        });
      }

      updates.push('email = ?');
      params.push(email);
    }

    if (role && ['patient', 'doctor', 'admin'].includes(role)) {
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune modification fournie' 
      });
    }

    params.push(userId);

    const result = await executeQuery(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour' 
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Supprimer un utilisateur
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Ne pas permettre la suppression de son propre compte
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vous ne pouvez pas supprimer votre propre compte' 
      });
    }

    const result = await executeQuery(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression' 
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Obtenir tous les rendez-vous avec filtres
router.get('/appointments', async (req, res) => {
  try {
    const { status, doctor_id, patient_id, date_from, date_to } = req.query;
    
    let query = `
      SELECT a.*, 
             p.full_name as patient_name, 
             p.email as patient_email,
             d.full_name as doctor_name,
             d.email as doctor_email
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (doctor_id) {
      query += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }

    if (patient_id) {
      query += ' AND a.patient_id = ?';
      params.push(patient_id);
    }

    if (date_from) {
      query += ' AND a.appointment_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND a.appointment_date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY a.appointment_date DESC';

    const result = await executeQuery(query, params);

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des rendez-vous' 
      });
    }

    res.json({
      success: true,
      appointments: result.data
    });
  } catch (error) {
    console.error('Erreur récupération rendez-vous admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Réinitialiser le mot de passe d'un utilisateur
router.post('/users/:id/reset-password', [
  body('new_password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mot de passe invalide (minimum 6 caractères)' 
      });
    }

    const userId = req.params.id;
    const { new_password } = req.body;

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(new_password, 10);

    const result = await executeQuery(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la réinitialisation du mot de passe' 
      });
    }

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;