import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'asc' });
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'slot_admin',
    assigned_slot_id: '',
    tajweed_beginner: false,
    tajweed_intermediate: false,
    tajweed_advanced: false,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const usersData = await pb.collection('users').getFullList({
        filter: 'role = "slot_admin"',
        sort: 'username',
        expand: 'assigned_slot_id',
      });
      const slotsData = await pb.collection('slots').getFullList({
        sort: 'slot_order',
      });
      setUsers(usersData);
      setSlots(slotsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        username: user.username,
        password: '',
        role: user.role,
        assigned_slot_id: user.assigned_slot_id || '',
        tajweed_beginner: user.tajweed_beginner || false,
        tajweed_intermediate: user.tajweed_intermediate || false,
        tajweed_advanced: user.tajweed_advanced || false,
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', username: '', password: '', role: 'slot_admin', assigned_slot_id: '', tajweed_beginner: false, tajweed_intermediate: false, tajweed_advanced: false });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', username: '', password: '', role: 'slot_admin', assigned_slot_id: '', tajweed_beginner: false, tajweed_intermediate: false, tajweed_advanced: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingUser) {
        const updateData = {
          name: formData.name || '',
          username: formData.username,
          role: formData.role,
          assigned_slot_id: formData.assigned_slot_id || '',
          tajweed_beginner: formData.tajweed_beginner,
          tajweed_intermediate: formData.tajweed_intermediate,
          tajweed_advanced: formData.tajweed_advanced,
        };
        if (formData.password) updateData.password = formData.password;
        await pb.collection('users').update(editingUser.id, updateData);
      } else {
        if (!formData.password) { setError('Password is required'); return; }
        await pb.collection('users').create({
          name: formData.name || '',
          username: formData.username,
          email: `${formData.username}@example.com`,
          password: formData.password,
          passwordConfirm: formData.password,
          role: formData.role,
          assigned_slot_id: formData.assigned_slot_id || '',
          tajweed_beginner: formData.tajweed_beginner,
          tajweed_intermediate: formData.tajweed_intermediate,
          tajweed_advanced: formData.tajweed_advanced,
        });
      }
      handleCloseModal();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Delete this user?')) return;
    try {
      await pb.collection('users').delete(userId);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  // Apply search filter
  let filteredUsers = users;
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredUsers = users.filter((user) => {
      return (
        user.name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query) ||
        user.expand?.assigned_slot_id?.display_name?.toLowerCase().includes(query)
      );
    });
  }

  // Apply sorting
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue, bValue;

    switch (sortConfig.key) {
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'username':
        aValue = a.username?.toLowerCase() || '';
        bValue = b.username?.toLowerCase() || '';
        break;
      case 'role':
        aValue = a.role?.toLowerCase() || '';
        bValue = b.role?.toLowerCase() || '';
        break;
      case 'slot':
        aValue = a.expand?.assigned_slot_id?.display_name?.toLowerCase() || '';
        bValue = b.expand?.assigned_slot_id?.display_name?.toLowerCase() || '';
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '250px' }}
          />
          <button onClick={() => handleOpenModal()} className="add-user-btn">Add Slot Admin</button>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Name{getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>
                Username{getSortIcon('username')}
              </th>
              <th onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>
                Role{getSortIcon('role')}
              </th>
              <th onClick={() => handleSort('slot')} style={{ cursor: 'pointer' }}>
                Assigned Slot{getSortIcon('slot')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.length === 0 ? <tr><td colSpan="5" className="no-data">{searchQuery ? 'No matching users found' : 'No slot admins found'}</td></tr> : sortedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name || '-'}</td>
                <td>{user.username}</td>
                <td><span className="role-badge">{user.role}</span></td>
                <td>{user.expand?.assigned_slot_id?.display_name || (user.assigned_slot_id ? 'Unknown Slot' : 'Not Assigned')}</td>
                <td><div className="action-buttons"><button onClick={() => handleOpenModal(user)} className="edit-btn">Edit</button><button onClick={() => handleDelete(user.id)} className="delete-btn">Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingUser ? 'Edit Slot Admin' : 'Add Slot Admin'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="form-group"><label>Username</label><input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required /></div>
              <div className="form-group"><label>Password {editingUser && '(leave blank to keep current)'}</label><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} /></div>
              <div className="form-group"><label>Assigned Slot</label><select value={formData.assigned_slot_id} onChange={(e) => setFormData({ ...formData, assigned_slot_id: e.target.value })} required><option value="">Select a slot</option>{slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.display_name}</option>)}</select></div>
              <div className="form-group">
                <label>Tajweed Levels (select applicable levels for this slot)</label>
                <div className="checkbox-group">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={formData.tajweed_beginner}
                      onChange={(e) => setFormData({ ...formData, tajweed_beginner: e.target.checked })}
                    />
                    <span>Beginner</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={formData.tajweed_intermediate}
                      onChange={(e) => setFormData({ ...formData, tajweed_intermediate: e.target.checked })}
                    />
                    <span>Intermediate</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={formData.tajweed_advanced}
                      onChange={(e) => setFormData({ ...formData, tajweed_advanced: e.target.checked })}
                    />
                    <span>Advanced</span>
                  </label>
                </div>
                <small style={{ display: 'block', marginTop: '8px', color: '#666', fontSize: '0.85em' }}>
                  If no level is selected, this slot will be shown to all users regardless of their Tajweed level.
                </small>
              </div>
              <div className="modal-actions"><button type="button" onClick={handleCloseModal} className="cancel-btn">Cancel</button><button type="submit" className="save-btn">{editingUser ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
