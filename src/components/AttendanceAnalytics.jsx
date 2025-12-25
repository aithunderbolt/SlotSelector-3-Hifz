import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './AttendanceAnalytics.css';

const AttendanceAnalytics = () => {
  const [classes, setClasses] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotAdmins, setSlotAdmins] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch classes
      const classesData = await pb.collection('classes').getFullList({
        sort: 'name',
      });
      setClasses(classesData || []);

      // Fetch slots
      const slotsData = await pb.collection('slots').getFullList({
        sort: 'slot_order',
      });
      setSlots(slotsData || []);

      // Fetch slot admins
      const adminsData = await pb.collection('users').getFullList({
        filter: 'role = "slot_admin"',
      });
      setSlotAdmins(adminsData || []);

      // Fetch all attendance records
      const attendanceData = await pb.collection('attendance').getFullList({
        expand: 'class_id,slot_id',
        sort: '-attendance_date',
      });
      setAttendanceRecords(attendanceData || []);
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

    pb.collection('attendance').subscribe('*', () => {
      fetchData();
    });

    return () => {
      pb.collection('attendance').unsubscribe();
    };
  }, []);

  // Calculate totals per class
  const getClassTotals = () => {
    const totals = {};
    
    classes.forEach((classItem) => {
      totals[classItem.id] = {
        name: classItem.name,
        total_students: 0,
        students_present: 0,
        students_absent: 0,
        students_on_leave: 0,
        record_count: 0
      };
    });

    attendanceRecords.forEach((record) => {
      if (totals[record.class_id]) {
        totals[record.class_id].total_students += record.total_students;
        totals[record.class_id].students_present += record.students_present;
        totals[record.class_id].students_absent += record.students_absent;
        totals[record.class_id].students_on_leave += record.students_on_leave;
        totals[record.class_id].record_count += 1;
      }
    });

    return totals;
  };

  // Get missing entries - slot admins who have never entered attendance for a class
  const getMissingEntries = () => {
    const missing = [];

    slotAdmins.forEach((admin) => {
      const slotName = slots.find(s => s.id === admin.assigned_slot_id)?.display_name || 'Unknown Slot';
      
      classes.forEach((classItem) => {
        const hasAnyEntry = attendanceRecords.some(
          (record) => {
            return record.slot_id === admin.assigned_slot_id && 
                   record.class_id === classItem.id;
          }
        );

        if (!hasAnyEntry) {
          missing.push({
            admin_username: admin.username,
            slot_name: slotName,
            class_name: classItem.name,
            slot_id: admin.assigned_slot_id,
            class_id: classItem.id
          });
        }
      });
    });

    return missing;
  };

  // Group missing entries by slot admin
  const getMissingByAdmin = () => {
    const missing = getMissingEntries();
    const grouped = {};

    missing.forEach((entry) => {
      const key = `${entry.admin_username} (${entry.slot_name})`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry.class_name);
    });

    return grouped;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  const classTotals = getClassTotals();
  const missingByAdmin = getMissingByAdmin();

  return (
    <div className="attendance-analytics">
      <h2>Attendance Analytics</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Class Totals Section */}
      <div className="analytics-section">
        <h3>Total Attendance by Class (All Time)</h3>
        {classes.length === 0 ? (
          <div className="no-data">No classes found. Create classes first.</div>
        ) : (
          <div className="totals-grid">
            {classes.map((classItem) => {
              const totals = classTotals[classItem.id];
              const attendanceRate = totals.total_students > 0 
                ? ((totals.students_present / totals.total_students) * 100).toFixed(1)
                : 0;

              return (
                <div key={classItem.id} className="total-card">
                  <h4>{classItem.name}</h4>
                  <div className="total-stats">
                    <div className="stat-row">
                      <span className="stat-label">Total Slots:</span>
                      <span className="stat-value">{slots.length}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Attendance Entered:</span>
                      <span className="stat-value">{totals.record_count}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Total Students:</span>
                      <span className="stat-value">{totals.total_students}</span>
                    </div>
                    <div className="stat-row present">
                      <span className="stat-label">Present:</span>
                      <span className="stat-value">{totals.students_present}</span>
                    </div>
                    <div className="stat-row absent">
                      <span className="stat-label">Absent:</span>
                      <span className="stat-value">{totals.students_absent}</span>
                    </div>
                    <div className="stat-row on-leave">
                      <span className="stat-label">On Leave:</span>
                      <span className="stat-value">{totals.students_on_leave}</span>
                    </div>
                    <div className="stat-row attendance-rate">
                      <span className="stat-label">Attendance Rate:</span>
                      <span className="stat-value">{attendanceRate}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Missing Entries Section */}
      <div className="analytics-section">
        <div className="section-header">
          <h3>Slot Admins Who Have Never Entered Attendance</h3>
        </div>

        {Object.keys(missingByAdmin).length === 0 ? (
          <div className="success-message">
            ✓ All slot admins have entered attendance for all classes at least once
          </div>
        ) : (
          <div className="missing-entries">
            {Object.entries(missingByAdmin).map(([adminKey, missingClasses]) => (
              <div key={adminKey} className="missing-card">
                <div className="missing-header">
                  <span className="warning-icon">⚠️</span>
                  <strong>{adminKey}</strong>
                </div>
                <div className="missing-classes">
                  <span className="missing-label">Never entered attendance for:</span>
                  <ul>
                    {missingClasses.map((className, idx) => (
                      <li key={idx}>{className}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Records Section */}
      <div className="analytics-section">
        <h3>All Attendance Records</h3>
        {attendanceRecords.length === 0 ? (
          <div className="no-data">No attendance records found.</div>
        ) : (
          <div className="table-container">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class</th>
                  <th>Slot</th>
                  <th>Total</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>On Leave</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => {
                  const rate = record.total_students > 0
                    ? ((record.students_present / record.total_students) * 100).toFixed(1)
                    : 0;

                  return (
                    <tr key={record.id}>
                      <td>{formatDate(record.attendance_date)}</td>
                      <td>{record.expand?.class_id?.name || 'Unknown'}</td>
                      <td>{record.expand?.slot_id?.display_name || 'Unknown'}</td>
                      <td>{record.total_students}</td>
                      <td className="present">{record.students_present}</td>
                      <td className="absent">{record.students_absent}</td>
                      <td className="on-leave">{record.students_on_leave}</td>
                      <td className="rate">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceAnalytics;
