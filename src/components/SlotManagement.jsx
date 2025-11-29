import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './SlotManagement.css';

const SlotManagement = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [newName, setNewName] = useState('');
  const [newMaxRegistrations, setNewMaxRegistrations] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlotName, setNewSlotName] = useState('');
  const [newSlotOrder, setNewSlotOrder] = useState('');
  const [newSlotMaxReg, setNewSlotMaxReg] = useState('15');
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

  const handleEdit = (slot) => {
    setEditingSlot(slot.id);
    setNewName(slot.display_name);
    setNewMaxRegistrations(slot.max_registrations?.toString() || '15');
    setError(null); // Clear any previous errors
  };

  const handleCancel = () => {
    setEditingSlot(null);
    setNewName('');
    setNewMaxRegistrations('');
    setError(null); // Clear any errors when canceling
  };

  const handleSave = async (slotId) => {
    if (!newName.trim()) {
      setError('Slot name cannot be empty');
      return;
    }

    const maxReg = parseInt(newMaxRegistrations);
    if (isNaN(maxReg) || maxReg < 1) {
      setError('Maximum registrations must be at least 1');
      return;
    }

    if (maxReg > 100) {
      setError('Maximum registrations cannot exceed 100');
      return;
    }

    try {
      // Check current registration count for this slot
      const registrations = await pb.collection('registrations').getFullList({
        filter: `slot_id = "${slotId}"`,
        fields: 'id',
      });

      const currentCount = registrations?.length || 0;

      if (maxReg < currentCount) {
        setError(`Cannot set maximum to ${maxReg}. This slot currently has ${currentCount} registration${currentCount !== 1 ? 's' : ''}. Please set a value of ${currentCount} or higher.`);
        return;
      }

      await pb.collection('slots').update(slotId, {
        display_name: newName.trim(),
        max_registrations: maxReg,
      });

      setEditingSlot(null);
      setNewName('');
      setNewMaxRegistrations('');
      setError(null);
      fetchSlots();
    } catch (err) {
      setError(err.message);
      console.error('Error updating slot:', err);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    
    if (!newSlotName.trim()) {
      setError('Slot name cannot be empty');
      return;
    }

    if (!newSlotOrder || newSlotOrder < 1) {
      setError('Slot order must be a positive number');
      return;
    }

    const maxReg = parseInt(newSlotMaxReg);
    if (isNaN(maxReg) || maxReg < 1) {
      setError('Maximum registrations must be at least 1');
      return;
    }

    if (maxReg > 100) {
      setError('Maximum registrations cannot exceed 100');
      return;
    }

    try {
      await pb.collection('slots').create({
        display_name: newSlotName.trim(),
        slot_order: parseInt(newSlotOrder),
        max_registrations: maxReg,
      });

      setShowAddForm(false);
      setNewSlotName('');
      setNewSlotOrder('');
      setNewSlotMaxReg('15');
      setError(null);
      fetchSlots();
    } catch (err) {
      setError(err.message);
      console.error('Error adding slot:', err);
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

  return (
    <div className="slot-management">
      <div className="slot-management-header">
        <div>
          <h2>Slot Management</h2>
          <p className="slot-info">Add, edit, or delete time slots. Changes will reflect immediately across the entire application.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="add-slot-btn"
        >
          {showAddForm ? 'Cancel' : '+ Add New Slot'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showAddForm && (
        <div className="add-slot-form">
          <h3>Add New Slot</h3>
          <form onSubmit={handleAddSlot}>
            <div className="form-group">
              <label htmlFor="slotName">Slot Display Name:</label>
              <textarea
                id="slotName"
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
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
                value={newSlotOrder}
                onChange={(e) => setNewSlotOrder(e.target.value)}
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
                value={newSlotMaxReg}
                onChange={(e) => setNewSlotMaxReg(e.target.value)}
                placeholder="e.g., 15"
                min="1"
                max="100"
                required
              />
              <small>Maximum number of students for this slot (1-100)</small>
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn">Add Slot</button>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddForm(false);
                  setNewSlotName('');
                  setNewSlotOrder('');
                  setNewSlotMaxReg('15');
                  setError(null);
                }} 
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="slots-table-container">
        <table className="slots-table">
          <thead>
            <tr>
              <th>Slot Order</th>
              <th>Display Name</th>
              <th>Max Registrations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td>
                  <span className="slot-order-badge">#{slot.slot_order}</span>
                </td>
                <td>
                  {editingSlot === slot.id ? (
                    <textarea
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="slot-name-input"
                      rows="3"
                      autoFocus
                    />
                  ) : (
                    <span className="slot-name">{slot.display_name}</span>
                  )}
                </td>
                <td>
                  {editingSlot === slot.id ? (
                    <input
                      type="number"
                      value={newMaxRegistrations}
                      onChange={(e) => setNewMaxRegistrations(e.target.value)}
                      className="slot-max-input"
                      min="1"
                      max="100"
                      style={{ width: '80px' }}
                    />
                  ) : (
                    <span className="slot-max-badge">{slot.max_registrations || 15}</span>
                  )}
                </td>
                <td>
                  {editingSlot === slot.id ? (
                    <div className="action-buttons">
                      <button
                        onClick={() => handleSave(slot.id)}
                        className="save-btn-inline"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="cancel-btn-inline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : deletingSlot === slot.id ? (
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
                        onClick={() => handleEdit(slot)}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SlotManagement;
