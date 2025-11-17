import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'patient'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        // Inscription
        const response = await axios.post('/auth/register', formData);
        if (response.data.success) {
          setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
          setIsRegister(false);
          setFormData({
            email: formData.email,
            password: '',
            full_name: '',
            phone: '',
            role: 'patient'
          });
        }
      } else {
        // Connexion
        const response = await axios.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        
        if (response.data.success) {
          onLogin(response.data.token, response.data.user);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">
          🏥 Rendez-vous Médicaux
        </h1>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input
                  type="text"
                  name="full_name"
                  className="form-input"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0612345678"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rôle *</label>
                <select
                  name="role"
                  className="form-select"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Médecin</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="exemple@email.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe *</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="Minimum 6 caractères"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Chargement...' : (isRegister ? 'S\'inscrire' : 'Se connecter')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary)', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
          </button>
        </div>

        {!isRegister && (
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--gray-100)', borderRadius: '6px', fontSize: '0.875rem' }}>
            <strong>Comptes de test :</strong><br />
            Admin: admin@medical.com / admin123<br />
            Médecin: dr.martin@medical.com / admin123
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;