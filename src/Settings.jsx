import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './styles/settings.css';

const Settings = ({ profile, onSignOut }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    grade: ''
  });
  const [passwords, setPasswords] = useState({
    new: '',
    confirm: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (profile) {
      setProfileData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        grade: profile.grade || ''
      });
    }
  }, [profile]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const updateData = {
      first_name: profileData.first_name,
      last_name: profileData.last_name
    };


    if (profile.role !== 'admin') {
      updateData.grade = parseInt(profileData.grade) || null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (error) {
      console.error('Error updating profile:', error);
      showMessage('Failed to update profile', 'error');
    } else {
      showMessage('Profile updated successfully');
      window.location.reload();
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm) {
      showMessage('New passwords do not match', 'error');
      return;
    }

    if (passwords.new.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);

    // Supabase will automatically send a password reset confirmation email
    const { error } = await supabase.auth.updateUser({
      password: passwords.new
    });

    if (error) {
      console.error('Error updating password:', error);
      showMessage('Failed to update password: ' + error.message, 'error');
    } else {
      showMessage('Password updated successfully! A confirmation email has been sent.');
      setPasswords({ new: '', confirm: '' });
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt(
      'This will permanently delete your account. Type "DELETE" to confirm:'
    );

    if (confirmText !== 'DELETE') {
      return;
    }

    const doubleConfirm = confirm(
      'Are you absolutely sure? This action cannot be undone.'
    );

    if (!doubleConfirm) {
      return;
    }

    setLoading(true);

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profile.id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      showMessage('Failed to delete account', 'error');
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!profile) {
    return <div className="settings-loading">Loading...</div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      {message.text && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      <section className="settings-section">
        <h2>Profile Information</h2>
        <form onSubmit={handleProfileUpdate} className="settings-form">
          <div className="form-row">
            <div className="form-field">
              <label>First Name</label>
              <input
                type="text"
                value={profileData.first_name}
                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>Last Name</label>
              <input
                type="text"
                value={profileData.last_name}
                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          {profile.role !== 'admin' && (
            <div className="form-field">
              <label>Grade</label>
                <select
                className="grade-select"
                value={profileData.grade}
                onChange={(e) => setProfileData({ ...profileData, grade: e.target.value })}
                >
                {[10, 11, 12].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))} 
              </select>
              <small className="form-hint">
                Your grade will automatically update each September
              </small>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2>Change Password</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          A confirmation email will be sent to verify this change.
        </p>
        <form onSubmit={handlePasswordChange} className="settings-form">
          <div className="form-field">
            <label>New Password</label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              minLength="6"
              required
            />
          </div>
          <div className="form-field">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              minLength="6"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2>Account</h2>
        <div className="account-actions">
          <div>
            <h3>Sign Out</h3>
            <p>Sign out of your account on this device.</p>
          </div>
          <button className="btn-secondary" onClick={onSignOut} disabled={loading}>
            Sign Out
          </button>
        </div>
      </section>

      <section className="settings-section danger-zone">
        <h2>Danger Zone</h2>
        <div className="danger-content">
          <div>
            <h3>Delete Account</h3>
            <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
          </div>
          <button className="btn-danger" onClick={handleDeleteAccount} disabled={loading}>
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;