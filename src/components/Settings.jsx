import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import './Settings.css';

const Settings = () => {
  const [formTitle, setFormTitle] = useState('');
  const [maxRegistrations, setMaxRegistrations] = useState('15');
  const [maxAttachmentSizeKB, setMaxAttachmentSizeKB] = useState('400');
  const [supervisorName, setSupervisorName] = useState('');
  const [reportFileName, setReportFileName] = useState('Hifz');
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
        filter: 'key = "form_title" || key = "max_registrations_per_slot" || key = "max_attachment_size_kb" || key = "supervisor_name" || key = "report_file_name"',
      });

      const titleSetting = settings.find(s => s.key === 'form_title');
      const maxRegSetting = settings.find(s => s.key === 'max_registrations_per_slot');
      const maxAttachmentSetting = settings.find(s => s.key === 'max_attachment_size_kb');
      const supervisorSetting = settings.find(s => s.key === 'supervisor_name');
      const reportFileNameSetting = settings.find(s => s.key === 'report_file_name');

      setFormTitle(titleSetting?.value || 'Hifz Registration Form');
      setMaxRegistrations(maxRegSetting?.value || '15');
      setMaxAttachmentSizeKB(maxAttachmentSetting?.value || '400');
      setSupervisorName(supervisorSetting?.value || '');
      setReportFileName(reportFileNameSetting?.value || 'Hifz');
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

    const maxAttachmentSize = parseInt(maxAttachmentSizeKB);
    if (isNaN(maxAttachmentSize) || maxAttachmentSize < 1) {
      setMessage({ type: 'error', text: 'Maximum attachment size must be a positive number' });
      return;
    }

    if (maxAttachmentSize > 10240) {
      setMessage({ type: 'error', text: 'Maximum attachment size cannot exceed 10240 KB (10 MB)' });
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

      // Check if max_attachment_size_kb exists
      const maxAttachmentSettings = await pb.collection('settings').getFullList({
        filter: 'key = "max_attachment_size_kb"',
      });

      if (maxAttachmentSettings.length > 0) {
        await pb.collection('settings').update(maxAttachmentSettings[0].id, {
          value: maxAttachmentSize.toString(),
        });
      } else {
        await pb.collection('settings').create({
          key: 'max_attachment_size_kb',
          value: maxAttachmentSize.toString(),
        });
      }

      // Check if supervisor_name exists
      const supervisorSettings = await pb.collection('settings').getFullList({
        filter: 'key = "supervisor_name"',
      });

      if (supervisorSettings.length > 0) {
        await pb.collection('settings').update(supervisorSettings[0].id, {
          value: supervisorName.trim(),
        });
      } else {
        await pb.collection('settings').create({
          key: 'supervisor_name',
          value: supervisorName.trim(),
        });
      }

      // Check if report_file_name exists
      const reportFileNameSettings = await pb.collection('settings').getFullList({
        filter: 'key = "report_file_name"',
      });

      if (reportFileNameSettings.length > 0) {
        await pb.collection('settings').update(reportFileNameSettings[0].id, {
          value: reportFileName.trim(),
        });
      } else {
        await pb.collection('settings').create({
          key: 'report_file_name',
          value: reportFileName.trim(),
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

        <div className="form-group">
          <label htmlFor="maxAttachmentSize">Maximum Attachment Size (KB)</label>
          <input
            type="number"
            id="maxAttachmentSize"
            value={maxAttachmentSizeKB}
            onChange={(e) => setMaxAttachmentSizeKB(e.target.value)}
            disabled={saving}
            placeholder="Enter maximum attachment size in KB"
            min="1"
            max="10240"
          />
          <small>Maximum file size for attendance attachments in KB (e.g., 500 for 500 KB, max 10240 KB)</small>
        </div>

        <div className="form-group">
          <label htmlFor="supervisorName">Supervisor Name</label>
          <input
            type="text"
            id="supervisorName"
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            disabled={saving}
            placeholder="Enter supervisor name"
            maxLength={100}
          />
          <small>This name will be displayed as the supervisor in the class reports</small>
        </div>

        <div className="form-group">
          <label htmlFor="reportFileName">Report File Name</label>
          <input
            type="text"
            id="reportFileName"
            value={reportFileName}
            onChange={(e) => setReportFileName(e.target.value)}
            disabled={saving}
            placeholder="Enter report file name"
            maxLength={100}
          />
          <small>Downloaded reports will be named as: {reportFileName}-{new Date().toISOString().split('T')[0]}.pdf</small>
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
