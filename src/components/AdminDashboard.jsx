import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import UserManagement from './UserManagement';
import SlotManagement from './SlotManagement';
import Settings from './Settings';
import UserTransfer from './UserTransfer';
import ClassManagement from './ClassManagement';
import AttendanceTracking from './AttendanceTracking';
import AttendanceAnalytics from './AttendanceAnalytics';
import './AdminDashboard.css';

const AdminDashboard = ({ onLogout, user }) => {
  const [registrations, setRegistrations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slotFilter, setSlotFilter] = useState(user.role === 'super_admin' ? 'all' : user.assigned_slot_id);
  const [activeTab, setActiveTab] = useState('registrations');
  const [formTitle, setFormTitle] = useState('Hifz Registration Form');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'registered_at', direction: 'desc' });

  const isSlotAdmin = user.role === 'slot_admin';
  const isSuperAdmin = user.role === 'super_admin';
  const userSlotId = user.assigned_slot_id;

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch form title from settings
      const titleSettings = await pb.collection('settings').getFullList({
        filter: 'key = "form_title"',
      });
      if (titleSettings.length > 0) {
        setFormTitle(titleSettings[0].value);
      }

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

  // Helper function to get slot display name
  const getSlotDisplayName = (slotId) => {
    const slot = slots.find(s => s.id === slotId);
    return slot ? slot.display_name : 'Unknown Slot';
  };

  // Use detailed registrations for slot admin, regular for super admin
  const detailedRegistrations = isSlotAdmin ? (registrations.detailed || []) : (Array.isArray(registrations) ? registrations : []);
  
  let filteredRegistrations = slotFilter === 'all'
    ? detailedRegistrations
    : detailedRegistrations.filter((reg) => reg.slot_id === slotFilter);

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredRegistrations = filteredRegistrations.filter((reg) => {
      return (
        reg.name?.toLowerCase().includes(query) ||
        reg.fathers_name?.toLowerCase().includes(query) ||
        reg.email?.toLowerCase().includes(query) ||
        reg.whatsapp_mobile?.includes(query) ||
        reg.tajweed_level?.toLowerCase().includes(query) ||
        reg.education?.toLowerCase().includes(query) ||
        reg.profession?.toLowerCase().includes(query) ||
        reg.previous_hifz?.toLowerCase().includes(query) ||
        reg.expand?.slot_id?.display_name?.toLowerCase().includes(query) ||
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
      case 'date_of_birth':
        aValue = a.date_of_birth ? new Date(a.date_of_birth) : new Date(0);
        bValue = b.date_of_birth ? new Date(b.date_of_birth) : new Date(0);
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
        aValue = (a.expand?.slot_id?.display_name || getSlotDisplayName(a.slot_id))?.toLowerCase() || '';
        bValue = (b.expand?.slot_id?.display_name || getSlotDisplayName(b.slot_id))?.toLowerCase() || '';
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

  const downloadExcel = (dataToExport, filename) => {
    const exportData = dataToExport.map((reg) => ({
      Name: reg.name,
      "Father's Name": reg.fathers_name || '',
      'Date of Birth': formatDateToDDMMYYYY(reg.date_of_birth),
      Email: reg.email,
      'WhatsApp Mobile': reg.whatsapp_mobile,
      'Level of Tajweed': reg.tajweed_level || '',
      'Education': reg.education || '',
      'Profession': reg.profession || '',
      'Previous Hifz': reg.previous_hifz || '',
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
      { wch: 20 }, // Education
      { wch: 20 }, // Profession
      { wch: 30 }, // Previous Hifz
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
          <p className="form-title-display">{formTitle}</p>
          <p className="user-info">
            Logged in as: <strong>{user.username}</strong> ({user.role === 'super_admin' ? 'Super Admin' : `Slot Admin - ${userSlotName}`})
          </p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          Registrations
        </button>
        {isSlotAdmin && (
          <>
            <button
              className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              Attendance
            </button>
            <button
              className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
            >
              User Transfer
            </button>
          </>
        )}
        {isSuperAdmin && (
          <>
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
              className={`tab ${activeTab === 'classes' ? 'active' : ''}`}
              onClick={() => setActiveTab('classes')}
            >
              Classes
            </button>
            <button
              className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Attendance Analytics
            </button>
            <button
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </>
        )}
      </div>

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
            <input
              type="text"
              placeholder="Search registrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
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
            <input
              type="text"
              placeholder="Search registrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
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
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Name{getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('fathers_name')} style={{ cursor: 'pointer' }}>
                Father's Name{getSortIcon('fathers_name')}
              </th>
              <th onClick={() => handleSort('date_of_birth')} style={{ cursor: 'pointer' }}>
                Date of Birth{getSortIcon('date_of_birth')}
              </th>
              <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                Email{getSortIcon('email')}
              </th>
              <th onClick={() => handleSort('whatsapp_mobile')} style={{ cursor: 'pointer' }}>
                WhatsApp Mobile{getSortIcon('whatsapp_mobile')}
              </th>
              <th onClick={() => handleSort('tajweed_level')} style={{ cursor: 'pointer' }}>
                Level of Tajweed{getSortIcon('tajweed_level')}
              </th>
              <th>Education</th>
              <th>Profession</th>
              <th>Previous Hifz</th>
              <th onClick={() => handleSort('slot')} style={{ cursor: 'pointer' }}>
                Time Slot{getSortIcon('slot')}
              </th>
              <th onClick={() => handleSort('registered_at')} style={{ cursor: 'pointer' }}>
                Registered At{getSortIcon('registered_at')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRegistrations.length === 0 ? (
              <tr>
                <td colSpan="11" className="no-data">{searchQuery ? 'No matching registrations found' : 'No registrations found'}</td>
              </tr>
            ) : (
              sortedRegistrations.map((reg) => (
                <tr key={reg.id}>
                  <td>{reg.name}</td>
                  <td>{reg.fathers_name || '-'}</td>
                  <td>{formatDateToDDMMYYYY(reg.date_of_birth) || '-'}</td>
                  <td>{reg.email}</td>
                  <td>{reg.whatsapp_mobile}</td>
                  <td>{reg.tajweed_level || '-'}</td>
                  <td>{reg.education || '-'}</td>
                  <td>{reg.profession || '-'}</td>
                  <td>{reg.previous_hifz || '-'}</td>
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

      {activeTab === 'classes' && isSuperAdmin && (
        <ClassManagement />
      )}

      {activeTab === 'analytics' && isSuperAdmin && (
        <AttendanceAnalytics />
      )}

      {activeTab === 'attendance' && isSlotAdmin && (
        <AttendanceTracking user={user} />
      )}

      {activeTab === 'transfer' && isSlotAdmin && (
        <UserTransfer user={user} />
      )}
    </div>
  );
};

export default AdminDashboard;
