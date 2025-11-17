const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../database');

const router = express.Router();

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Inscription
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().isLength({ min: 2 }),
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

    if (!checkResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur de vérification email' 
      });
    }

    if (checkResult.data.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cet email est déjà utilisé' 
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer le nouvel utilisateur
    const userRole = ['patient', 'doctor'].includes(role) ? role : 'patient';
    const insertResult = await executeQuery(
      'INSERT INTO users (email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, full_name, phone || null, userRole]
    );

    if (!insertResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création du compte' 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Compte créé avec succès',
      userId: insertResult.data.insertId
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de l\'inscription' 
    });
  }
});

// Connexion
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Données invalides' 
      });
    }

    const { email, password } = req.body;

    // Rechercher l'utilisateur
    const result = await executeQuery(
      'SELECT id, email, password, full_name, phone, role FROM users WHERE email = ?',
      [email]
    );

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur de connexion à la base de données' 
      });
    }

    if (result.data.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
    }

    const user = result.data[0];

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
});

// Vérifier le token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT id, email, full_name, phone, role FROM users WHERE id = ?',
      [req.user.id]
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
    console.error('Erreur vérification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;