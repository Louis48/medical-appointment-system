import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Dashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, appointmentsRes] = await Promise.all([
        axios.get('/users/stats'),
        axios.get('/appointments')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      if (appointmentsRes.data.success) {
        setAppointments(appointmentsRes.data.appointments.slice(0, 5));
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
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
          <h1 className="header-title">🏥 Rendez-vous Médicaux</h1>
          <nav className="header-nav">
            <Link to="/" className="nav-link active">Tableau de bord</Link>
            <Link to="/appointments" className="nav-link">Mes rendez-vous</Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="nav-link">Administration</Link>
            )}
            <span style={{ color: 'var(--gray-500)' }}>|</span>
            <span style={{ color: 'var(--gray-700)' }}>{user.full_name}</span>
            <button onClick={onLogout} className="btn btn-small btn-secondary">
              Déconnexion
            </button>
          </nav>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <h2>Bienvenue, {user.full_name} !</h2>
          <p style={{ color: 'var(--gray-500)' }}>
            Rôle: <strong>{user.role === 'patient' ? 'Patient' : user.role === 'doctor' ? 'Médecin' : 'Administrateur'}</strong>
          </p>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : (
          <>
            {/* Statistiques */}
            {stats && (
              <div className="grid grid-cols-3">
                <div className="stat-card">
                  <div className="stat-label">
                    {user.role === 'doctor' ? 'Total rendez-vous' : 'Mes rendez-vous'}
                  </div>
                  <div className="stat-value">{stats.total_appointments || 0}</div>
                </div>

                {user.role === 'doctor' && (
                  <div className="stat-card">
                    <div className="stat-label">Patients uniques</div>
                    <div className="stat-value">{stats.total_patients || 0}</div>
                  </div>
                )}

                <div className="stat-card">
                  <div className="stat-label">En attente</div>
                  <div className="stat-value" style={{ color: 'var(--warning)' }}>
                    {stats.pending || 0}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Confirmés</div>
                  <div className="stat-value" style={{ color: 'var(--primary)' }}>
                    {stats.confirmed || 0}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Terminés</div>
                  <div className="stat-value" style={{ color: 'var(--secondary)' }}>
                    {stats.completed || 0}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Annulés</div>
                  <div className="stat-value" style={{ color: 'var(--danger)' }}>
                    {stats.cancelled || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Derniers rendez-vous */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="card-header" style={{ marginBottom: 0 }}>
                  Derniers rendez-vous
                </h2>
                <Link to="/appointments" className="btn btn-small btn-primary">
                  Voir tous
                </Link>
              </div>

              {appointments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <div className="empty-state-text">Aucun rendez-vous</div>
                  {user.role === 'patient' && (
                    <Link to="/appointments" className="btn btn-primary">
                      Prendre un rendez-vous
                    </Link>
                  )}
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>{user.role === 'patient' ? 'Médecin' : 'Patient'}</th>
                        <th>Statut</th>
                        <th>Motif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((apt) => (
                        <tr key={apt.id}>
                          <td>{formatDate(apt.appointment_date)}</td>
                          <td>
                            {user.role === 'patient' ? apt.doctor_name : apt.patient_name}
                          </td>
                          <td>{getStatusBadge(apt.status)}</td>
                          <td>{apt.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;