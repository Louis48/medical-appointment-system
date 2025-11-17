import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Appointments({ user, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    doctor_id: '',
    appointment_date: '',
    reason: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const appointmentsRes = await axios.get('/appointments');
      if (appointmentsRes.data.success) {
        setAppointments(appointmentsRes.data.appointments);
      }

      if (user.role === 'patient') {
        const doctorsRes = await axios.get('/users/doctors');
        if (doctorsRes.data.success) {
          setDoctors(doctorsRes.data.doctors);
        }
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/appointments', formData);
      if (response.data.success) {
        setSuccess('Rendez-vous créé avec succès !');
        setShowModal(false);
        setFormData({ doctor_id: '', appointment_date: '', reason: '' });
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const response = await axios.put(`/appointments/${appointmentId}`, {
        status: newStatus
      });
      
      if (response.data.success) {
        setSuccess('Statut mis à jour avec succès !');
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (appointmentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      return;
    }

    try {
      const response = await axios.delete(`/appointments/${appointmentId}`);
      if (response.data.success) {
        setSuccess('Rendez-vous supprimé avec succès !');
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

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="page-container">
      <header className="header">
        <div className="container header-content">
          <h1 className="header-title">🏥 Rendez-vous Médicaux</h1>
          <nav className="header-nav">
            <Link to="/" className="nav-link">Tableau de bord</Link>
            <Link to="/appointments" className="nav-link active">Mes rendez-vous</Link>
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
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="card-header" style={{ marginBottom: 0 }}>
              {user.role === 'patient' ? 'Mes rendez-vous' : 'Rendez-vous'}
            </h2>
            {user.role === 'patient' && (
              <button 
                onClick={() => setShowModal(true)} 
                className="btn btn-primary"
              >
                + Nouveau rendez-vous
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Chargement...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-text">Aucun rendez-vous</div>
              {user.role === 'patient' && (
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                  Prendre un rendez-vous
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{user.role === 'patient' ? 'Médecin' : 'Patient'}</th>
                    <th>Téléphone</th>
                    <th>Motif</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>{formatDate(apt.appointment_date)}</td>
                      <td>
                        {user.role === 'patient' ? apt.doctor_name : apt.patient_name}
                      </td>
                      <td>
                        {user.role === 'patient' ? apt.doctor_phone : apt.patient_phone}
                      </td>
                      <td>{apt.reason || '-'}</td>
                      <td>{getStatusBadge(apt.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {user.role === 'doctor' && apt.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(apt.id, 'confirmed')}
                                className="btn btn-small btn-success"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                className="btn btn-small btn-danger"
                              >
                                Refuser
                              </button>
                            </>
                          )}
                          {user.role === 'doctor' && apt.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'completed')}
                              className="btn btn-small btn-success"
                            >
                              Terminer
                            </button>
                          )}
                          {user.role === 'patient' && apt.status === 'pending' && (
                            <button
                              onClick={() => handleDelete(apt.id)}
                              className="btn btn-small btn-danger"
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de création */}
      {showModal && (
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
            <h2 style={{ marginBottom: '1.5rem' }}>Nouveau rendez-vous</h2>
            
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Médecin *</label>
                <select
                  className="form-select"
                  value={formData.doctor_id}
                  onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                  required
                >
                  <option value="">Sélectionnez un médecin</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date et heure *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.appointment_date}
                  onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                  min={getMinDateTime()}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Motif de consultation</label>
                <textarea
                  className="form-textarea"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Décrivez brièvement le motif de votre consultation..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Créer le rendez-vous
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                    setFormData({ doctor_id: '', appointment_date: '', reason: '' });
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

export default Appointments;