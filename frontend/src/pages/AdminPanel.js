import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function AdminPanel({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'patient'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const response = await axios.get('/admin/stats');
        if (response.data.success) {
          setStats(response.data.stats);
        }
      } else if (activeTab === 'users') {
        const response = await axios.get('/admin/users');
        if (response.data.success) {
          setUsers(response.data.users);
        }
      } else if (activeTab === 'appointments') {
        const response = await axios.get('/admin/appointments');
        if (response.data.success) {
          setAppointments(response.data.appointments);
        }
      }
    } catch (error) {
      console.error('Erreur chargement données admin:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/admin/users', userForm);
      if (response.data.success) {
        setSuccess('Utilisateur créé avec succès !');
        setShowUserModal(false);
        setUserForm({
          email: '',
          password: '',
          full_name: '',
          phone: '',
          role: 'patient'
        });
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      const response = await axios.delete(`/admin/users/${userId}`);
      if (response.data.success) {
        setSuccess('Utilisateur supprimé avec succès !');
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-pending', text: 'En attente' },
      confirmed: { class: 'badge-confirmed', text: 'Confirmé' },
      completed: { class: 'badge-completed', text: 'Terminé' },
      cancelled: { class: 'badge-cancelled', text: 'Annulé' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const getRoleBadge = (role) => {
    const badges = {
      patient: { class: 'badge-confirmed', text: 'Patient' },
      doctor: { class: 'badge-completed', text: 'Médecin' },
      admin: { class: 'badge-pending', text: 'Admin' }
    };
    const badge = badges[role] || badges.patient;
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page-container">
      <header className="header">
        <div className="container header-content">
          <h1 className="header-title">🏥 Panneau d'Administration</h1>
          <nav className="header-nav">
            <Link to="/" className="nav-link">Tableau de bord</Link>
            <Link to="/appointments" className="nav-link">Mes rendez-vous</Link>
            <Link to="/admin" className="nav-link active">Administration</Link>
            <span style={{ color: 'var(--gray-500)' }}>|</span>
            <span style={{ color: 'var(--gray-700)' }}>{user.full_name}</span>
            <button onClick={onLogout} className="btn btn-small btn-secondary">
              Déconnexion
            </button>
          </nav>
        </div>
      </header>

      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Onglets */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--gray-200)' }}>
          <button
            onClick={() => setActiveTab('stats')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'stats' ? '3px solid var(--primary)' : 'none',
              color: activeTab === 'stats' ? 'var(--primary)' : 'var(--gray-500)',
              fontWeight: activeTab === 'stats' ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            📊 Statistiques
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'users' ? '3px solid var(--primary)' : 'none',
              color: activeTab === 'users' ? 'var(--primary)' : 'var(--gray-500)',
              fontWeight: activeTab === 'users' ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            👥 Utilisateurs
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'appointments' ? '3px solid var(--primary)' : 'none',
              color: activeTab === 'appointments' ? 'var(--primary)' : 'var(--gray-500)',
              fontWeight: activeTab === 'appointments' ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            📅 Rendez-vous
          </button>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : (
          <>
            {/* Onglet Statistiques */}
            {activeTab === 'stats' && stats && (
              <>
                <h2 style={{ marginBottom: '1.5rem' }}>Vue d'ensemble</h2>
                
                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--gray-700)' }}>
                  👥 Utilisateurs
                </h3>
                <div className="grid grid-cols-3">
                  <div className="stat-card">
                    <div className="stat-label">Total utilisateurs</div>
                    <div className="stat-value">{stats.users.total_users || 0}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Patients</div>
                    <div className="stat-value">{stats.users.total_patients || 0}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Médecins</div>
                    <div className="stat-value">{stats.users.total_doctors || 0}</div>
                  </div>
                </div>

                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--gray-700)' }}>
                  📅 Rendez-vous
                </h3>
                <div className="grid grid-cols-3">
                  <div className="stat-card">
                    <div className="stat-label">Total rendez-vous</div>
                    <div className="stat-value">{stats.appointments.total_appointments || 0}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Aujourd'hui</div>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>
                      {stats.today || 0}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Cette semaine</div>
                    <div className="stat-value" style={{ color: 'var(--secondary)' }}>
                      {stats.week || 0}
                    </div>
                  </div>
                </div>

                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--gray-700)' }}>
                  📊 Statuts des rendez-vous
                </h3>
                <div className="grid grid-cols-3">
                  <div className="stat-card">
                    <div className="stat-label">En attente</div>
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>
                      {stats.appointments.pending || 0}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Confirmés</div>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>
                      {stats.appointments.confirmed || 0}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Terminés</div>
                    <div className="stat-value" style={{ color: 'var(--secondary)' }}>
                      {stats.appointments.completed || 0}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Onglet Utilisateurs */}
            {activeTab === 'users' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 className="card-header" style={{ marginBottom: 0 }}>
                    Gestion des utilisateurs
                  </h2>
                  <button 
                    onClick={() => setShowUserModal(true)} 
                    className="btn btn-primary"
                  >
                    + Nouvel utilisateur
                  </button>
                </div>

                {users.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-text">Aucun utilisateur</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Email</th>
                          <th>Téléphone</th>
                          <th>Rôle</th>
                          <th>Inscrit le</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td>{u.full_name}</td>
                            <td>{u.email}</td>
                            <td>{u.phone || '-'}</td>
                            <td>{getRoleBadge(u.role)}</td>
                            <td>{formatDate(u.created_at)}</td>
                            <td>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="btn btn-small btn-danger"
                                disabled={u.id === user.id}
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Onglet Rendez-vous */}
            {activeTab === 'appointments' && (
              <div className="card">
                <h2 className="card-header">Tous les rendez-vous</h2>

                {appointments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <div className="empty-state-text">Aucun rendez-vous</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Patient</th>
                          <th>Médecin</th>
                          <th>Motif</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((apt) => (
                          <tr key={apt.id}>
                            <td>{formatDate(apt.appointment_date)}</td>
                            <td>
                              {apt.patient_name}<br />
                              <small style={{ color: 'var(--gray-500)' }}>
                                {apt.patient_email}
                              </small>
                            </td>
                            <td>
                              {apt.doctor_name}<br />
                              <small style={{ color: 'var(--gray-500)' }}>
                                {apt.doctor_email}
                              </small>
                            </td>
                            <td>{apt.reason || '-'}</td>
                            <td>{getStatusBadge(apt.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de création d'utilisateur */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Nouvel utilisateur</h2>
            
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input
                  type="text"
                  className="form-input"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mot de passe *</label>
                <input
                  type="password"
                  className="form-input"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  minLength="6"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rôle *</label>
                <select
                  className="form-select"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  required
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Médecin</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Créer
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowUserModal(false);
                    setError('');
                    setUserForm({
                      email: '',
                      password: '',
                      full_name: '',
                      phone: '',
                      role: 'patient'
                    });
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;