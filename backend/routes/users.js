const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Obtenir la liste des médecins (pour les patients qui créent des rendez-vous)
router.get('/doctors', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT id, email, full_name, phone, created_at 
       FROM users 
       WHERE role = 'doctor' 
       ORDER BY full_name ASC`
    );

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des médecins' 
      });
    }

    res.json({
      success: true,
      doctors: result.data
    });
  } catch (error) {
    console.error('Erreur récupération médecins:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Obtenir le profil de l'utilisateur connecté
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await executeQuery(
      'SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!result.success || result.data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    res.json({
      success: true,
      user: result.data[0]
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Mettre à jour le profil
router.put('/profile', [
  body('full_name').optional().trim().isLength({ min: 2 }),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail()
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

    const userId = req.user.id;
    const { full_name, phone, email } = req.body;

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
        message: 'Erreur lors de la mise à jour du profil' 
      });
    }

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Changer le mot de passe
router.put('/password', [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 6 })
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

    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Récupérer le mot de passe actuel
    const userResult = await executeQuery(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier le mot de passe actuel
    const validPassword = await bcrypt.compare(current_password, userResult.data[0].password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Mot de passe actuel incorrect' 
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Mettre à jour le mot de passe
    const updateResult = await executeQuery(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    if (!updateResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors du changement de mot de passe' 
      });
    }

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Obtenir les statistiques de l'utilisateur
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    if (userRole === 'patient') {
      // Statistiques pour les patients
      const result = await executeQuery(
        `SELECT 
          COUNT(*) as total_appointments,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
         FROM appointments 
         WHERE patient_id = ?`,
        [userId]
      );

      if (result.success && result.data.length > 0) {
        stats = result.data[0];
      }
    } else if (userRole === 'doctor') {
      // Statistiques pour les médecins
      const result = await executeQuery(
        `SELECT 
          COUNT(*) as total_appointments,
          COUNT(DISTINCT patient_id) as total_patients,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
         FROM appointments 
         WHERE doctor_id = ?`,
        [userId]
      );

      if (result.success && result.data.length > 0) {
        stats = result.data[0];
      }
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;