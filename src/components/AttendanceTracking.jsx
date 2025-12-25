import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './AttendanceTracking.css';

const AttendanceTracking = ({ user }) => {
  const [classes, setClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    class_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    total_students: '',
    students_present: '',
    students_absent: '',
    students_on_leave: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch classes
      const classesData = await pb.collection('classes').getFullList({
        sort: 'name',
      });
      setClasses(classesData || []);

      // Fetch attendance records for this slot admin
      const attendanceData = await pb.collection('attendance').getFullList({
        filter: `slot_id = "${user.assigned_slot_id}"`,
        expand: 'class_id',
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
  }, [user.assigned_slot_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'class_id') {
      const classItem = classes.find(c => c.id === value);
      setSelectedClass(classItem || null);
    }
  };

  const validateCounts = () => {
    const total = parseInt(formData.total_students) || 0;
    const present = parseInt(formData.students_present) || 0;
    const absent = parseInt(formData.students_absent) || 0;
    const onLeave = parseInt(formData.students_on_leave) || 0;

    if (present + absent + onLeave !== total) {
      setError('Present + Absent + On Leave must equal Total Students');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCounts()) {
      return;
    }

    try {
      const attendanceData = {
        class_id: formData.class_id,
        slot_id: user.assigned_slot_id,
        admin_user_id: user.id,
        attendance_date: formData.attendance_date,
        total_students: parseInt(formData.total_students),
        students_present: parseInt(formData.students_present),
        students_absent: parseInt(formData.students_absent),
        students_on_leave: parseInt(formData.students_on_leave),
        notes: formData.notes.trim()
      };

      if (editingRecord) {
        await pb.collection('attendance').update(editingRecord.id, attendanceData);
      } else {
        await pb.collection('attendance').create(attendanceData);
      }

      setFormData({
        class_id: '',
        attendance_date: new Date().toISOString().split('T')[0],
        total_students: '',
        students_present: '',
        students_absent: '',
        students_on_leave: '',
        notes: ''
      });
      setShowForm(false);
      setEditingRecord(null);
      setSelectedClass(null);
      setError(null);
      fetchData();
    } catch (err) {
      setError(err.message);
      console.error('Error saving attendance:', err);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    const classItem = classes.find(c => c.id === record.class_id);
    setSelectedClass(classItem || null);
    setFormData({
      class_id: record.class_id,
      attendance_date: record.attendance_date,
      total_students: record.total_students.toString(),
      students_present: record.students_present.toString(),
      students_absent: record.students_absent.toString(),
      students_on_leave: record.students_on_leave.toString(),
      notes: record.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (recordId) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    try {
      await pb.collection('attendance').delete(recordId);
      fetchData();
    } catch (err) {
      setError(err.message);
      console.error('Error deleting attendance:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    setSelectedClass(null);
    setFormData({
      class_id: '',
      attendance_date: new Date().toISOString().split('T')[0],
      total_students: '',
      students_present: '',
      students_absent: '',
      students_on_leave: '',
      notes: ''
    });
    setError(null);
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
    return <div className="loading">Loading attendance data...</div>;
  }

  return (
    <div className="attendance-tracking">
      <div className="attendance-header">
        <h2>Attendance Tracking</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="add-btn">
            Add Attendance Record
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="attendance-form-container">
          <h3>{editingRecord ? 'Edit Attendance' : 'Add Attendance Record'}</h3>
          <form onSubmit={handleSubmit} className="attendance-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="class_id">Class *</label>
                <select
                  id="class_id"
                  name="class_id"
                  value={formData.class_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} ({classItem.duration} min)
                    </option>
                  ))}
                </select>
                {selectedClass && selectedClass.description && (
                  <div className="class-description-display">
                    {selectedClass.description}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="attendance_date">Date *</label>
                <input
                  type="date"
                  id="attendance_date"
                  name="attendance_date"
                  value={formData.attendance_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="total_students">Total Students *</label>
                <input
                  type="number"
                  id="total_students"
                  name="total_students"
                  value={formData.total_students}
                  onChange={handleInputChange}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="students_present">Students Present *</label>
                <input
                  type="number"
                  id="students_present"
                  name="students_present"
                  value={formData.students_present}
                  onChange={handleInputChange}
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="students_absent">Students Absent *</label>
                <input
                  type="number"
                  id="students_absent"
                  name="students_absent"
                  value={formData.students_absent}
                  onChange={handleInputChange}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="students_on_leave">Students on Leave *</label>
                <input
                  type="number"
                  id="students_on_leave"
                  name="students_on_leave"
                  value={formData.students_on_leave}
                  onChange={handleInputChange}
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Any additional notes about this class session"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {editingRecord ? 'Update Record' : 'Save Record'}
              </button>
              <button type="button" onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="attendance-list">
        {attendanceRecords.length === 0 ? (
          <div className="no-data">No attendance records found. Add your first record to get started.</div>
        ) : (
          <div className="table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class</th>
                  <th>Total</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>On Leave</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.attendance_date)}</td>
                    <td>{record.expand?.class_id?.name || 'Unknown'}</td>
                    <td>{record.total_students}</td>
                    <td className="present">{record.students_present}</td>
                    <td className="absent">{record.students_absent}</td>
                    <td className="on-leave">{record.students_on_leave}</td>
                    <td className="notes-cell">{record.notes || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleEdit(record)} className="edit-btn-small">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(record.id)} className="delete-btn-small">
                          Delete
                        </button>
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
  );
};

export default AttendanceTracking;
