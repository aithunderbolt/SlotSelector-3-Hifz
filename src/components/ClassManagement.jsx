import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './ClassManagement.css';

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: ''
  });

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await pb.collection('classes').getFullList({
        sort: 'name',
      });

      setClasses(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();

    pb.collection('classes').subscribe('*', () => {
      fetchClasses();
    });

    return () => {
      pb.collection('classes').unsubscribe();
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const classData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        duration: parseInt(formData.duration)
      };

      if (editingClass) {
        await pb.collection('classes').update(editingClass.id, classData);
      } else {
        await pb.collection('classes').create(classData);
      }

      setFormData({ name: '', description: '', duration: '' });
      setShowForm(false);
      setEditingClass(null);
      fetchClasses();
    } catch (err) {
      setError(err.message);
      console.error('Error saving class:', err);
    }
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || '',
      duration: classItem.duration.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (classId) => {
    if (!confirm('Are you sure you want to delete this class? This will also delete all associated attendance records.')) {
      return;
    }

    try {
      await pb.collection('classes').delete(classId);
      fetchClasses();
    } catch (err) {
      setError(err.message);
      console.error('Error deleting class:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClass(null);
    setFormData({ name: '', description: '', duration: '' });
  };

  if (loading) {
    return <div className="loading">Loading classes...</div>;
  }

  return (
    <div className="class-management">
      <div className="class-header">
        <h2>Class Management</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="add-btn">
            Add New Class
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="class-form-container">
          <h3>{editingClass ? 'Edit Class' : 'Add New Class'}</h3>
          <form onSubmit={handleSubmit} className="class-form">
            <div className="form-group">
              <label htmlFor="name">Class Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Quran Recitation"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Brief description of the class"
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration (minutes) *</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                required
                min="1"
                placeholder="e.g., 60"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {editingClass ? 'Update Class' : 'Create Class'}
              </button>
              <button type="button" onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="classes-list">
        {classes.length === 0 ? (
          <div className="no-data">No classes found. Create your first class to get started.</div>
        ) : (
          <div className="classes-grid">
            {classes.map((classItem) => (
              <div key={classItem.id} className="class-card">
                <div className="class-card-header">
                  <h3>{classItem.name}</h3>
                  <span className="duration-badge">{classItem.duration} min</span>
                </div>
                {classItem.description && (
                  <p className="class-description">{classItem.description}</p>
                )}
                <div className="class-card-actions">
                  <button onClick={() => handleEdit(classItem)} className="edit-btn">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(classItem.id)} className="delete-btn">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassManagement;
