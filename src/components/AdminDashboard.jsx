import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import UserManagement from './UserManagement';
import SlotManagement from './SlotManagement';
import Settings from './Settings';
import './AdminDashboard.css';

const AdminDashboard = ({ onLogout, user }) => {
  const [registrations, setRegistrations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slotFilter, setSlotFilter] = useState(user.role === 'super_admin' ? 'all' : user.assigned_slot_id);
  const [activeTab, setActiveTab] = useState('registrations');

  const isSlotAdmin = user.role === 'slot_admin';
  const isSuperAdmin = user.role === 'super_admin';
  const userSlotId = user.assigned_slot_id;

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch slots with their max_registrations
      const slotsData = await pb.collection('slots').getFullList({
        sort: 'slot_order',
      });

      setSlots(slotsData);

      // Fetch all registrations for slot counts (both super admin and slot admin need this)
      const allRegistrations = await pb.collection('registrations').getFullList({
        fields: 'id,slot_id',
      });

      // Fetch detailed registrations
      let detailedRegistrations;
      if (isSlotAdmin) {
        detailedRegistrations = await pb.collection('registrations').getFullList({
          filter: `slot_id = "${userSlotId}"`,
          expand: 'slot_id',
        });
      } else {
        detailedRegistrations = await pb.collection('registrations').getFullList({
          expand: 'slot_id',
        });
      }
      
      // Sort by registered_at date (newest first)
      detailedRegistrations.sort((a, b) => {
        const dateA = a.registered_at ? new Date(a.registered_at) : new Date(0);
        const dateB = b.registered_at ? new Date(b.registered_at) : new Date(0);
        return dateB - dateA;
      });
      
      // For slot admins, use all registrations for counts but filtered data for table
      setRegistrations(isSlotAdmin ? { detailed: detailedRegistrations, all: allRegistrations } : detailedRegistrations);
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

    // Subscribe to slots changes
    pb.collection('slots').subscribe('*', () => {
      fetchData();
    });

    return () => {
      pb.collection('registrations').unsubscribe();
      pb.collection('slots').unsubscribe();
    };
  }, []);

  // Refetch data when switching to registrations tab
  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchData();
    }
  }, [activeTab]);

  const getSlotCounts = () => {
    const counts = {};
    slots.forEach((slot) => {
      counts[slot.id] = 0;
    });
    
    // Use all registrations for counts if slot admin, otherwise use regular registrations
    const dataForCounts = isSlotAdmin ? (registrations.all || []) : (Array.isArray(registrations) ? registrations : []);
    
    dataForCounts.forEach((reg) => {
      if (counts[reg.slot_id] !== undefined) {
        counts[reg.slot_id]++;
      }
    });
    return counts;
  };

  const slotCounts = getSlotCounts();

  // Use detailed registrations for slot admin, regular for super admin
  const detailedRegistrations = isSlotAdmin ? (registrations.detailed || []) : (Array.isArray(registrations) ? registrations : []);
  
  const filteredRegistrations = slotFilter === 'all'
    ? detailedRegistrations
    : detailedRegistrations.filter((reg) => reg.slot_id === slotFilter);

  const getSlotDisplayName = (slotId) => {
    const slot = slots.find(s => s.id === slotId);
    return slot ? slot.display_name : 'Unknown Slot';
  };

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const downloadExcel = (dataToExport, filename) => {
    const exportData = dataToExport.map((reg) => ({
      Name: reg.name,
      "Father's Name": reg.fathers_name || '',
      'Date of Birth': formatDateToDDMMYYYY(reg.date_of_birth),
      Email: reg.email,
      'WhatsApp Mobile': reg.whatsapp_mobile,
      'Level of Tajweed': reg.tajweed_level || '',
      'Time Slot': reg.expand?.slot_id?.display_name || getSlotDisplayName(reg.slot_id),
      'Registered At': reg.registered_at ? new Date(reg.registered_at).toLocaleString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }) : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    const colWidths = [
      { wch: 20 }, // Name
      { wch: 20 }, // Father's Name
      { wch: 15 }, // Date of Birth
      { wch: 30 }, // Email
      { wch: 20 }, // WhatsApp Mobile
      { wch: 15 }, // Level of Tajweed
      { wch: 15 }, // Time Slot
      { wch: 20 }, // Registered At
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, filename);
  };

  const handleDownloadAll = () => {
    const dataToDownload = Array.isArray(registrations) ? registrations : (registrations.detailed || []);
    downloadExcel(dataToDownload, 'all_registrations.xlsx');
  };

  const handleDownloadFiltered = () => {
    if (slotFilter === 'all') {
      const dataToDownload = Array.isArray(registrations) ? registrations : (registrations.detailed || []);
      downloadExcel(dataToDownload, 'all_registrations.xlsx');
    } else {
      const slotName = getSlotDisplayName(slotFilter);
      downloadExcel(
        filteredRegistrations,
        `${slotName.replace(/\s+/g, '_')}_registrations.xlsx`
      );
    }
  };

  if (loading) {
    return <div className="loading">Loading registrations...</div>;
  }

  const userSlotName = isSlotAdmin ? getSlotDisplayName(userSlotId) : '';

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="user-info">
            Logged in as: <strong>{user.username}</strong> ({user.role === 'super_admin' ? 'Super Admin' : `Slot Admin - ${userSlotName}`})
          </p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      {isSuperAdmin && (
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'registrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('registrations')}
          >
            Registrations
          </button>
          <button
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          <button
            className={`tab ${activeTab === 'slots' ? 'active' : ''}`}
            onClick={() => setActiveTab('slots')}
          >
            Slot Management
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      )}

      {activeTab === 'registrations' && (
        <>
          <div className="stats-container">
            <div 
              className={`stat-card ${!isSlotAdmin && slotFilter === 'all' ? 'selected' : ''}`}
              onClick={() => !isSlotAdmin && setSlotFilter('all')}
              style={{ cursor: !isSlotAdmin ? 'pointer' : 'default' }}
            >
              <h3>Total Registrations</h3>
              <p className="stat-number">{isSlotAdmin ? (registrations.all || []).length : registrations.length}</p>
            </div>
            {slots.map((slot) => {
              const maxForSlot = slot.max_registrations || 15;
              return (
                <div 
                  key={slot.id} 
                  className={`stat-card ${slotCounts[slot.id] >= maxForSlot ? 'full' : ''} ${!isSlotAdmin && slotFilter === slot.id ? 'selected' : ''}`}
                  onClick={() => !isSlotAdmin && setSlotFilter(slot.id)}
                  style={{ cursor: !isSlotAdmin ? 'pointer' : 'default' }}
                >
                  <h3>{slot.display_name}</h3>
                  <p className="stat-number">{slotCounts[slot.id]}/{maxForSlot}</p>
                </div>
              );
            })}
          </div>

      {!isSlotAdmin && (
        <div className="filter-section">
          <div className="filter-controls">
            <h3>Showing: {slotFilter === 'all' ? 'All Slots' : getSlotDisplayName(slotFilter)}</h3>
          </div>
          <div className="download-buttons">
            <button onClick={handleDownloadAll} className="download-btn">
              Download All
            </button>
            <button onClick={handleDownloadFiltered} className="download-btn secondary">
              Download {slotFilter === 'all' ? 'All' : getSlotDisplayName(slotFilter)}
            </button>
          </div>
        </div>
      )}

      {isSlotAdmin && (
        <div className="filter-section">
          <div className="filter-controls">
            <h3>{userSlotName} Registrations</h3>
          </div>
          <div className="download-buttons">
            <button onClick={handleDownloadFiltered} className="download-btn">
              Download {userSlotName} Data
            </button>
          </div>
        </div>
      )}

          {error && <div className="error-message">{error}</div>}

          <div className="table-container">
        <table className="registrations-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Father's Name</th>
              <th>Date of Birth</th>
              <th>Email</th>
              <th>WhatsApp Mobile</th>
              <th>Level of Tajweed</th>
              <th>Time Slot</th>
              <th>Registered At</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No registrations found</td>
              </tr>
            ) : (
              filteredRegistrations.map((reg) => (
                <tr key={reg.id}>
                  <td>{reg.name}</td>
                  <td>{reg.fathers_name || '-'}</td>
                  <td>{formatDateToDDMMYYYY(reg.date_of_birth) || '-'}</td>
                  <td>{reg.email}</td>
                  <td>{reg.whatsapp_mobile}</td>
                  <td>{reg.tajweed_level || '-'}</td>
                  <td><span className="slot-badge">{reg.expand?.slot_id?.display_name || getSlotDisplayName(reg.slot_id)}</span></td>
                  <td>{reg.registered_at ? new Date(reg.registered_at).toLocaleString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  }) : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
          </div>
        </>
      )}

      {activeTab === 'users' && isSuperAdmin && (
        <UserManagement />
      )}

      {activeTab === 'slots' && isSuperAdmin && (
        <SlotManagement />
      )}

      {activeTab === 'settings' && isSuperAdmin && (
        <Settings />
      )}
    </div>
  );
};

export default AdminDashboard;
