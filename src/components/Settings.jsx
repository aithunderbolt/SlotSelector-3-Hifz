import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './Settings.css';

const Settings = () => {
  const [formTitle, setFormTitle] = useState('');
  const [maxRegistrations, setMaxRegistrations] = useState('15');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settings = await pb.collection('settings').getFullList({
        filter: 'key = "form_title" || key = "max_registrations_per_slot"',
      });

      const titleSetting = settings.find(s => s.key === 'form_title');
      const maxRegSetting = settings.find(s => s.key === 'max_registrations_per_slot');
      
      setFormTitle(titleSetting?.value || 'Hifz Registration Form');
      setMaxRegistrations(maxRegSetting?.value || '15');
    } catch (err) {
      console.error('Error fetching settings:', err);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formTitle.trim()) {
      setMessage({ type: 'error', text: 'Form title cannot be empty' });
      return;
    }

    const maxRegNum = parseInt(maxRegistrations);
    if (isNaN(maxRegNum) || maxRegNum < 1) {
      setMessage({ type: 'error', text: 'Maximum registrations must be a positive number' });
      return;
    }

    if (maxRegNum > 100) {
      setMessage({ type: 'error', text: 'Maximum registrations cannot exceed 100' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // Check if form_title exists
      const titleSettings = await pb.collection('settings').getFullList({
        filter: 'key = "form_title"',
      });

      if (titleSettings.length > 0) {
        await pb.collection('settings').update(titleSettings[0].id, {
          value: formTitle.trim(),
        });
      } else {
        await pb.collection('settings').create({
          key: 'form_title',
          value: formTitle.trim(),
        });
      }

      // Check if max_registrations_per_slot exists
      const maxRegSettings = await pb.collection('settings').getFullList({
        filter: 'key = "max_registrations_per_slot"',
      });

      if (maxRegSettings.length > 0) {
        await pb.collection('settings').update(maxRegSettings[0].id, {
          value: maxRegNum.toString(),
        });
      } else {
        await pb.collection('settings').create({
          key: 'max_registrations_per_slot',
          value: maxRegNum.toString(),
        });
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <h2>Application Settings</h2>
      
      <form onSubmit={handleSave} className="settings-form">
        <div className="form-group">
          <label htmlFor="formTitle">Registration Form Title</label>
          <input
            type="text"
            id="formTitle"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            disabled={saving}
            placeholder="Enter form title"
            maxLength={100}
          />
          <small>This title will be displayed at the top of the registration form</small>
        </div>

        <div className="form-group">
          <label htmlFor="maxRegistrations">Maximum Registrations Per Slot</label>
          <input
            type="number"
            id="maxRegistrations"
            value={maxRegistrations}
            onChange={(e) => setMaxRegistrations(e.target.value)}
            disabled={saving}
            placeholder="Enter maximum registrations"
            min="1"
            max="100"
          />
          <small>Maximum number of students that can register for each time slot (1-100)</small>
        </div>

        <button type="submit" disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default Settings;
