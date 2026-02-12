import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './styles/management.css';

const UserManagement = ({ profile }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminConfirmText, setAdminConfirmText] = useState('');
  const [pendingAdminUser, setPendingAdminUser] = useState(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();

      const subscription = supabase
        .channel('profiles_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'profiles' },
          () => fetchUsers()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .rpc('get_all_users_with_emails');

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    const filteredUserIds = getFilteredUsers().map(u => u.id);
    if (selectedUsers.size === filteredUserIds.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUserIds));
    }
  };

  const handleApproveSelected = async () => {
    if (selectedUsers.size === 0) {
      alert('No users selected');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .in('id', Array.from(selectedUsers));

    if (error) {
      console.error('Error approving users:', error);
      alert('Failed to approve users');
    } else {
      setSelectedUsers(new Set());
      fetchUsers();
    }
  };

  const handleUnapproveSelected = async () => {
    if (selectedUsers.size === 0) {
      alert('No users selected');
      return;
    }

    if (selectedUsers.has(profile.id)) {
      alert('You cannot unapprove yourself');
      return;
    }

    const selectedUsersList = users.filter(u => selectedUsers.has(u.id));
    const hasAdmins = selectedUsersList.some(u => u.role === 'admin');
    
    if (hasAdmins) {
      alert('You cannot unapprove admins. Admins must be removed instead.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ approved: false })
      .in('id', Array.from(selectedUsers));

    if (error) {
      console.error('Error unapproving users:', error);
      alert('Failed to unapprove users');
    } else {
      setSelectedUsers(new Set());
      fetchUsers();
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedUsers.size === 0) {
      alert('No users selected');
      return;
    }

    if (selectedUsers.has(profile.id)) {
      alert('You cannot remove yourself');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${selectedUsers.size} user(s)? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .rpc('delete_users', { user_ids: Array.from(selectedUsers) });

    if (error) {
      console.error('Error removing users:', error);
      alert('Failed to remove users: ' + error.message);
    } else {
      setSelectedUsers(new Set());
      fetchUsers();
    }
  };

  const handleApproveUser = async (userId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('id', userId);

    if (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    } else {
      fetchUsers();
    }
  };

  const handleUnapproveUser = async (userId) => {
    if (userId === profile.id) {
      alert('You cannot unapprove yourself');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin') {
      alert('You cannot unapprove admins. Admins must be removed instead.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ approved: false })
      .eq('id', userId);

    if (error) {
      console.error('Error unapproving user:', error);
      alert('Failed to unapprove user');
    } else {
      fetchUsers();
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (userId === profile.id && newRole !== 'admin') {
      alert('You cannot change your own admin role');
      return;
    }

    if (newRole === 'admin') {
      const user = users.find(u => u.id === userId);
      setPendingAdminUser({ id: userId, user });
      setShowAdminModal(true);
      setAdminConfirmText('');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error changing role:', error);
      alert('Failed to change role');
    } else {
      fetchUsers();
    }
  };

  const confirmAdminPromotion = async () => {
    if (adminConfirmText !== 'admin') {
      alert('You must type "admin" to confirm');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', pendingAdminUser.id);

    if (error) {
      console.error('Error changing role:', error);
      alert('Failed to promote to admin');
    } else {
      fetchUsers();
    }

    setShowAdminModal(false);
    setPendingAdminUser(null);
    setAdminConfirmText('');
  };

  const cancelAdminPromotion = () => {
    setShowAdminModal(false);
    setPendingAdminUser(null);
    setAdminConfirmText('');
    fetchUsers();
  };

  const handleRemoveUser = async (userId) => {
    if (userId === profile.id) {
      alert('You cannot remove yourself');
      return;
    }

    if (!confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .rpc('delete_users', { user_ids: [userId] });

    if (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user: ' + error.message);
    } else {
      fetchUsers();
    }
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      const nameMatch = `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!nameMatch) return false;
      
      if (filter === 'pending') return !user.approved;
      if (filter === 'approved') return user.approved;
      return true;
    });
  };

  if (!isAdmin) {
    return <div className="user-management-error">You do not have permission to manage users.</div>;
  }

  if (loading) {
    return <div className="user-management-loading">Loading users...</div>;
  }

  const filteredUsers = getFilteredUsers();
  const pendingCount = users.filter(u => !u.approved).length;

  return (
    <div className="user-management-container">
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>Confirm Admin Promotion</h3>
            </div>
            <div className="admin-modal-body">
              <p className="admin-modal-warning">
                You are about to make <strong>{pendingAdminUser?.user.first_name} {pendingAdminUser?.user.last_name}</strong> an admin.
              </p>
              <div className="admin-modal-notice">
                <p><strong>This action cannot be undone</strong></p>
                <p>Admins have full access and cannot be demoted.</p>
              </div>
              <div className="admin-modal-input-group">
                <label htmlFor="admin-confirm">Type <code>admin</code> to confirm:</label>
                <input
                  id="admin-confirm"
                  type="text"
                  value={adminConfirmText}
                  onChange={(e) => setAdminConfirmText(e.target.value)}
                  placeholder="Type 'admin' here"
                  className="admin-confirm-input"
                  autoFocus
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button 
                className="admin-modal-cancel" 
                onClick={cancelAdminPromotion}
              >
                Cancel
              </button>
              <button 
                className="admin-modal-confirm" 
                onClick={confirmAdminPromotion}
                disabled={adminConfirmText !== 'admin'}
              >
                Promote to Admin
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="user-management-header">
        <h2>Users</h2>
        {pendingCount > 0 && (
          <span className="pending-badge">{pendingCount} Pending Approval</span>
        )}
      </div>

      <div className="user-management-controls">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All Users ({users.length})
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''}
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingCount})
          </button>
          <button 
            className={filter === 'approved' ? 'active' : ''}
            onClick={() => setFilter('approved')}
          >
            Approved ({users.filter(u => u.approved).length})
          </button>
        </div>
      </div>

      {selectedUsers.size > 0 && (
        <div className="bulk-actions-bar">
          <span>{selectedUsers.size} user(s) selected</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="bulk-approve-btn" onClick={handleApproveSelected}>
              Approve Selected
            </button>
            <button className="bulk-unapprove-btn" onClick={handleUnapproveSelected}>
              Unapprove Selected
            </button>
            <button className="bulk-remove-btn" onClick={handleRemoveSelected}>
              Remove Selected
            </button>
          </div>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                  onChange={handleSelectAll}
                  className="custom-checkbox"
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Grade</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">No users found</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className={!user.approved ? 'pending-row' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="custom-checkbox"
                    />
                  </td>
                  <td className="name-cell">
                    {user.first_name} {user.last_name}
                    {user.id === profile.id && <span className="you-badge">You</span>}
                  </td>
                  <td className="email-cell">{user.email}</td>
                  <td className="grade-cell">{user.grade || 'N/A'}</td>
                  <td className="role-cell">
                    {user.role === 'admin' ? (
                      <span className="role-badge admin">Admin</span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="member">Member</option>
                        <option value="leader">Leader</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="status-cell">
                    {user.approved ? (
                      <span className="status-badge approved">Approved</span>
                    ) : (
                      <span className="status-badge pending">Pending</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      {!user.approved ? (
                        <button 
                          className="approve-btn"
                          onClick={() => handleApproveUser(user.id)}
                        >
                          Approve
                        </button>
                      ) : (
                        user.id !== profile.id && user.role !== 'admin' && (
                          <button 
                            className="unapprove-btn"
                            onClick={() => handleUnapproveUser(user.id)}
                          >
                            Unapprove
                          </button>
                        )
                      )}
                      {user.id !== profile.id && (
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveUser(user.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;