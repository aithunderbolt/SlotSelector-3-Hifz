import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './SlotManagement.css';

const SlotManagement = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'slot_order', direction: 'asc' });
  const [formData, setFormData] = useState({
    display_name: '',
    slot_order: '',
    max_registrations: '15',
  });
  const [deletingSlot, setDeletingSlot] = useState(null);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const data = await pb.collection('slots').getFullList({
        sort: 'slot_order',
      });

      setSlots(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching slots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleOpenModal = (slot = null) => {
    if (slot) {
      setEditingSlot(slot);
      setFormData({
        display_name: slot.display_name,
        slot_order: slot.slot_order,
        max_registrations: slot.max_registrations?.toString() || '15',
      });
    } else {
      setEditingSlot(null);
      // Find the next available slot order
      const maxOrder = slots.reduce((max, s) => Math.max(max, s.slot_order || 0), 0);
      setFormData({
        display_name: '',
        slot_order: (maxOrder + 1).toString(),
        max_registrations: '15',
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSlot(null);
    setFormData({
      display_name: '',
      slot_order: '',
      max_registrations: '15',
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.display_name.trim()) {
      setError('Slot name cannot be empty');
      return;
    }

    if (!formData.slot_order || formData.slot_order < 1) {
      setError('Slot order must be a positive number');
      return;
    }

    const maxReg = parseInt(formData.max_registrations);
    if (isNaN(maxReg) || maxReg < 1) {
      setError('Maximum registrations must be at least 1');
      return;
    }

    if (maxReg > 100) {
      setError('Maximum registrations cannot exceed 100');
      return;
    }

    try {
      if (editingSlot) {
        // Check current registration count for this slot
        const registrations = await pb.collection('registrations').getFullList({
          filter: `slot_id = "${editingSlot.id}"`,
          fields: 'id',
        });

        const currentCount = registrations?.length || 0;

        if (maxReg < currentCount) {
          setError(`Cannot set maximum to ${maxReg}. This slot currently has ${currentCount} registration${currentCount !== 1 ? 's' : ''}. Please set a value of ${currentCount} or higher.`);
          return;
        }

        await pb.collection('slots').update(editingSlot.id, {
          display_name: formData.display_name.trim(),
          slot_order: parseInt(formData.slot_order),
          max_registrations: maxReg,
        });
      } else {
        await pb.collection('slots').create({
          display_name: formData.display_name.trim(),
          slot_order: parseInt(formData.slot_order),
          max_registrations: maxReg,
        });
      }

      handleCloseModal();
      fetchSlots();
    } catch (err) {
      setError(err.message);
      console.error('Error saving slot:', err);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      // Check if slot has any registrations
      const registrations = await pb.collection('registrations').getFullList({
        filter: `slot_id = "${slotId}"`,
        fields: 'id',
        $autoCancel: false,
      });

      if (registrations && registrations.length > 0) {
        setError('Cannot delete slot with existing registrations');
        return;
      }

      await pb.collection('slots').delete(slotId);

      setDeletingSlot(null);
      setError(null);
      fetchSlots();
    } catch (err) {
      setError(err.message);
      console.error('Error deleting slot:', err);
    }
  };

  const confirmDelete = (slotId) => {
    setDeletingSlot(slotId);
  };

  const cancelDelete = () => {
    setDeletingSlot(null);
  };

  if (loading) {
    return <div className="loading">Loading slots...</div>;
  }

  // Apply search filter
  let filteredSlots = slots;
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredSlots = slots.filter((slot) => {
      return (
        slot.display_name?.toLowerCase().includes(query) ||
        slot.slot_order?.toString().includes(query) ||
        slot.max_registrations?.toString().includes(query)
      );
    });
  }

  // Apply sorting
  const sortedSlots = [...filteredSlots].sort((a, b) => {
    let aValue, bValue;

    switch (sortConfig.key) {
      case 'slot_order':
        aValue = a.slot_order || 0;
        bValue = b.slot_order || 0;
        break;
      case 'display_name':
        aValue = a.display_name?.toLowerCase() || '';
        bValue = b.display_name?.toLowerCase() || '';
        break;
      case 'max_registrations':
        aValue = a.max_registrations || 0;
        bValue = b.max_registrations || 0;
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
    <div className="slot-management">
      <div className="slot-management-header">
        <div>
          <h2>Slot Management</h2>
          <p className="slot-info">Add, edit, or delete time slots. Changes will reflect immediately across the entire application.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search slots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '250px' }}
          />
          <button
            onClick={() => handleOpenModal()}
            className="add-slot-btn"
          >
            + Add New Slot
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="slots-table-container">
        <table className="slots-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('slot_order')} style={{ cursor: 'pointer' }}>
                Slot Order{getSortIcon('slot_order')}
              </th>
              <th onClick={() => handleSort('display_name')} style={{ cursor: 'pointer' }}>
                Display Name{getSortIcon('display_name')}
              </th>
              <th onClick={() => handleSort('max_registrations')} style={{ cursor: 'pointer' }}>
                Max Registrations{getSortIcon('max_registrations')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSlots.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">{searchQuery ? 'No matching slots found' : 'No slots found'}</td>
              </tr>
            ) : (
              sortedSlots.map((slot) => (
              <tr key={slot.id}>
                <td data-label="Slot Order">
                  <span className="slot-order-badge">#{slot.slot_order}</span>
                </td>
                <td data-label="Display Name">
                  <span className="slot-name">{slot.display_name}</span>
                </td>
                <td data-label="Max Registrations">
                  <span className="slot-max-badge">{slot.max_registrations || 15}</span>
                </td>
                <td data-label="Actions">
                  {deletingSlot === slot.id ? (
                    <div className="action-buttons">
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="confirm-delete-btn"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="cancel-btn-inline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="action-buttons">
                      <button
                        onClick={() => handleOpenModal(slot)}
                        className="edit-btn-inline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => confirmDelete(slot.id)}
                        className="delete-btn-inline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingSlot ? 'Edit Slot' : 'Add New Slot'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="slotName">Slot Display Name:</label>
                <textarea
                  id="slotName"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g., Monday - 5:00 PM to 6:00 PM"
                  rows="3"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="slotOrder">Slot Order:</label>
                <input
                  type="number"
                  id="slotOrder"
                  value={formData.slot_order}
                  onChange={(e) => setFormData({ ...formData, slot_order: e.target.value })}
                  placeholder="e.g., 1, 2, 3..."
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="slotMaxReg">Maximum Registrations:</label>
                <input
                  type="number"
                  id="slotMaxReg"
                  value={formData.max_registrations}
                  onChange={(e) => setFormData({ ...formData, max_registrations: e.target.value })}
                  placeholder="e.g., 15"
                  min="1"
                  max="100"
                  required
                />
                <small>Maximum number of students for this slot (1-100)</small>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingSlot ? 'Update Slot' : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotManagement;
