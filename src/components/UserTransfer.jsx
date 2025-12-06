import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './UserTransfer.css';

const UserTransfer = ({ user }) => {
  const [registrations, setRegistrations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [transferringUserId, setTransferringUserId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const userSlotId = user.assigned_slot_id;

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all slots
      const slotsData = await pb.collection('slots').getFullList({
        sort: 'slot_order',
      });
      setSlots(slotsData);

      // Fetch all registrations (not just from the admin's slot)
      const allRegistrations = await pb.collection('registrations').getFullList({
        expand: 'slot_id',
        sort: '-registered_at',
      });

      setRegistrations(allRegistrations);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to registrations changes
    pb.collection('registrations').subscribe('*', () => {
      fetchData();
    });

    return () => {
      pb.collection('registrations').unsubscribe();
    };
  }, []);

  const getSlotDisplayName = (slotId) => {
    const slot = slots.find(s => s.id === slotId);
    return slot ? slot.display_name : 'Unknown Slot';
  };

  const getUserSlotName = () => {
    return getSlotDisplayName(userSlotId);
  };

  const handleTakeClick = (registration) => {
    setSelectedRegistration(registration);
    setShowConfirmModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedRegistration) return;

    setTransferringUserId(selectedRegistration.id);
    setError(null);

    try {
      // Update the registration's slot_id to the admin's slot
      await pb.collection('registrations').update(selectedRegistration.id, {
        slot_id: userSlotId,
      });

      // Refresh data
      await fetchData();
      setShowConfirmModal(false);
      setSelectedRegistration(null);
    } catch (err) {
      setError(`Failed to transfer user: ${err.message}`);
      console.error('Error transferring user:', err);
    } finally {
      setTransferringUserId(null);
    }
  };

  const handleCancelTransfer = () => {
    setShowConfirmModal(false);
    setSelectedRegistration(null);
  };

  // Apply search filter
  let filteredRegistrations = registrations;
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredRegistrations = registrations.filter((reg) => {
      return (
        reg.name?.toLowerCase().includes(query) ||
        reg.fathers_name?.toLowerCase().includes(query) ||
        reg.email?.toLowerCase().includes(query) ||
        reg.whatsapp_mobile?.includes(query) ||
        reg.tajweed_level?.toLowerCase().includes(query) ||
        reg.education?.toLowerCase().includes(query) ||
        reg.profession?.toLowerCase().includes(query) ||
        getSlotDisplayName(reg.slot_id)?.toLowerCase().includes(query)
      );
    });
  }

  // Apply sorting
  const sortedRegistrations = [...filteredRegistrations].sort((a, b) => {
    let aValue, bValue;

    switch (sortConfig.key) {
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'fathers_name':
        aValue = a.fathers_name?.toLowerCase() || '';
        bValue = b.fathers_name?.toLowerCase() || '';
        break;
      case 'email':
        aValue = a.email?.toLowerCase() || '';
        bValue = b.email?.toLowerCase() || '';
        break;
      case 'whatsapp_mobile':
        aValue = a.whatsapp_mobile || '';
        bValue = b.whatsapp_mobile || '';
        break;
      case 'tajweed_level':
        aValue = a.tajweed_level?.toLowerCase() || '';
        bValue = b.tajweed_level?.toLowerCase() || '';
        break;
      case 'slot':
        aValue = getSlotDisplayName(a.slot_id)?.toLowerCase() || '';
        bValue = getSlotDisplayName(b.slot_id)?.toLowerCase() || '';
        break;
      case 'registered_at':
        aValue = a.registered_at ? new Date(a.registered_at) : new Date(0);
        bValue = b.registered_at ? new Date(b.registered_at) : new Date(0);
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

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  if (loading) {
    return <div className="loading">Loading registrations...</div>;
  }

  return (
    <div className="user-transfer">
      <div className="user-transfer-header">
        <div>
          <h2>User Transfer</h2>
          <p className="info-text">
            View all registered users and transfer them to your slot: <strong>{getUserSlotName()}</strong>
          </p>
        </div>
      </div>

      <div className="filter-section">
        <input
          type="text"
          placeholder="Search by name, email, mobile, tajweed level, slot..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <div className="results-count">
          Showing {sortedRegistrations.length} of {registrations.length} users
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="transfer-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Name{getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('fathers_name')} style={{ cursor: 'pointer' }}>
                Father's Name{getSortIcon('fathers_name')}
              </th>
              <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                Email{getSortIcon('email')}
              </th>
              <th onClick={() => handleSort('whatsapp_mobile')} style={{ cursor: 'pointer' }}>
                WhatsApp{getSortIcon('whatsapp_mobile')}
              </th>
              <th onClick={() => handleSort('tajweed_level')} style={{ cursor: 'pointer' }}>
                Tajweed Level{getSortIcon('tajweed_level')}
              </th>
              <th onClick={() => handleSort('slot')} style={{ cursor: 'pointer' }}>
                Current Slot{getSortIcon('slot')}
              </th>
              <th onClick={() => handleSort('registered_at')} style={{ cursor: 'pointer' }}>
                Registered At{getSortIcon('registered_at')}
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedRegistrations.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  {searchQuery ? 'No matching users found' : 'No registered users found'}
                </td>
              </tr>
            ) : (
              sortedRegistrations.map((reg) => {
                const isInMySlot = reg.slot_id === userSlotId;
                const isTransferring = transferringUserId === reg.id;

                return (
                  <tr key={reg.id} className={isInMySlot ? 'in-my-slot' : ''}>
                    <td>{reg.name}</td>
                    <td>{reg.fathers_name || '-'}</td>
                    <td>{reg.email}</td>
                    <td>{reg.whatsapp_mobile}</td>
                    <td>{reg.tajweed_level || '-'}</td>
                    <td>
                      <span className={`slot-badge ${isInMySlot ? 'my-slot' : ''}`}>
                        {getSlotDisplayName(reg.slot_id)}
                      </span>
                    </td>
                    <td>
                      {reg.registered_at
                        ? new Date(reg.registered_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '-'}
                    </td>
                    <td>
                      {isInMySlot ? (
                        <span className="already-in-slot">Already in your slot</span>
                      ) : (
                        <button
                          onClick={() => handleTakeClick(reg)}
                          className="take-btn"
                          disabled={isTransferring}
                        >
                          {isTransferring ? 'Transferring...' : 'Take'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showConfirmModal && selectedRegistration && (
        <div className="modal-overlay" onClick={handleCancelTransfer}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm User Transfer</h3>
            <div className="confirm-details">
              <p>
                Are you sure you want to transfer <strong>{selectedRegistration.name}</strong> to your slot?
              </p>
              <div className="transfer-info">
                <div className="transfer-row">
                  <span className="label">From:</span>
                  <span className="value">{getSlotDisplayName(selectedRegistration.slot_id)}</span>
                </div>
                <div className="transfer-arrow">↓</div>
                <div className="transfer-row">
                  <span className="label">To:</span>
                  <span className="value highlight">{getUserSlotName()}</span>
                </div>
              </div>
              <p className="warning-text">
                This action will move the user from their current slot to yours.
              </p>
            </div>
            <div className="modal-actions">
              <button onClick={handleCancelTransfer} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleConfirmTransfer} className="confirm-btn">
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTransfer;
