const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Obtenir tous les rendez-vous de l'utilisateur connecté
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'patient') {
      // Les patients voient leurs propres rendez-vous
      query = `
        SELECT a.*, 
               u.full_name as doctor_name, 
               u.phone as doctor_phone
        FROM appointments a
        JOIN users u ON a.doctor_id = u.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC
      `;
      params = [userId];
    } else if (userRole === 'doctor') {
      // Les médecins voient leurs rendez-vous
      query = `
        SELECT a.*, 
               u.full_name as patient_name, 
               u.phone as patient_phone
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = ?
        ORDER BY a.appointment_date DESC
      `;
      params = [userId];
    } else if (userRole === 'admin') {
      // Les admins voient tous les rendez-vous
      query = `
        SELECT a.*, 
               p.full_name as patient_name, 
               p.phone as patient_phone,
               d.full_name as doctor_name,
               d.phone as doctor_phone
        FROM appointments a
        JOIN users p ON a.patient_id = p.id
        JOIN users d ON a.doctor_id = d.id
        ORDER BY a.appointment_date DESC
      `;
      params = [];
    }

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
    console.error('Erreur récupération rendez-vous:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Obtenir un rendez-vous spécifique
router.get('/:id', async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const query = `
      SELECT a.*, 
             p.full_name as patient_name, 
             p.email as patient_email,
             p.phone as patient_phone,
             d.full_name as doctor_name,
             d.email as doctor_email,
             d.phone as doctor_phone
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      WHERE a.id = ?
    `;

    const result = await executeQuery(query, [appointmentId]);

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération du rendez-vous' 
      });
    }

    if (result.data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rendez-vous non trouvé' 
      });
    }

    const appointment = result.data[0];

    // Vérifier les permissions
    if (userRole === 'patient' && appointment.patient_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    if (userRole === 'doctor' && appointment.doctor_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Erreur récupération rendez-vous:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Créer un nouveau rendez-vous
router.post('/', [
  body('doctor_id').isInt(),
  body('appointment_date').isISO8601(),
  body('duration').optional().isInt(),
  body('reason').optional().trim()
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

    const { doctor_id, appointment_date, duration, reason } = req.body;
    const patient_id = req.user.id;

    // Vérifier que le médecin existe et a le bon rôle
    const doctorCheck = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "doctor"',
      [doctor_id]
    );

    if (!doctorCheck.success || doctorCheck.data.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Médecin invalide' 
      });
    }

    // Vérifier les conflits de rendez-vous
    const appointmentDuration = duration || 30;
    const endTime = new Date(new Date(appointment_date).getTime() + appointmentDuration * 60000);

    const conflictCheck = await executeQuery(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? 
       AND status NOT IN ('cancelled') 
       AND (
         (appointment_date <= ? AND DATE_ADD(appointment_date, INTERVAL duration MINUTE) > ?) OR
         (appointment_date < ? AND DATE_ADD(appointment_date, INTERVAL duration MINUTE) >= ?)
       )`,
      [doctor_id, appointment_date, appointment_date, endTime.toISOString(), endTime.toISOString()]
    );

    if (conflictCheck.success && conflictCheck.data.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce créneau horaire n\'est pas disponible' 
      });
    }

    // Créer le rendez-vous
    const insertResult = await executeQuery(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration, reason, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [patient_id, doctor_id, appointment_date, appointmentDuration, reason || null]
    );

    if (!insertResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création du rendez-vous' 
      });
    }

    res.status(201).json({
      success: true,
      message: 'Rendez-vous créé avec succès',
      appointmentId: insertResult.data.insertId
    });
  } catch (error) {
    console.error('Erreur création rendez-vous:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Mettre à jour un rendez-vous
router.put('/:id', async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, notes, appointment_date } = req.body;

    // Récupérer le rendez-vous
    const appointmentResult = await executeQuery(
      'SELECT * FROM appointments WHERE id = ?',
      [appointmentId]
    );

    if (!appointmentResult.success || appointmentResult.data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rendez-vous non trouvé' 
      });
    }

    const appointment = appointmentResult.data[0];

    // Vérifier les permissions
    if (userRole === 'patient' && appointment.patient_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    if (userRole === 'doctor' && appointment.doctor_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    // Construire la requête de mise à jour
    const updates = [];
    const params = [];

    if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (appointment_date && userRole !== 'patient') {
      updates.push('appointment_date = ?');
      params.push(appointment_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune modification fournie' 
      });
    }

    params.push(appointmentId);

    const updateResult = await executeQuery(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (!updateResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour' 
      });
    }

    res.json({
      success: true,
      message: 'Rendez-vous mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour rendez-vous:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Supprimer un rendez-vous
router.delete('/:id', async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Récupérer le rendez-vous
    const appointmentResult = await executeQuery(
      'SELECT * FROM appointments WHERE id = ?',
      [appointmentId]
    );

    if (!appointmentResult.success || appointmentResult.data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rendez-vous non trouvé' 
      });
    }

    const appointment = appointmentResult.data[0];

    // Vérifier les permissions
    if (userRole !== 'admin' && appointment.patient_id !== userId && appointment.doctor_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    const deleteResult = await executeQuery(
      'DELETE FROM appointments WHERE id = ?',
      [appointmentId]
    );

    if (!deleteResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la suppression' 
      });
    }

    res.json({
      success: true,
      message: 'Rendez-vous supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression rendez-vous:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;