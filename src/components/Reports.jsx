import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import './Reports.css';

const Reports = () => {
  const [classes, setClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch classes
      const classesData = await pb.collection('classes').getFullList({
        sort: 'name',
      });

      // Fetch all attendance records
      const attendanceData = await pb.collection('attendance').getFullList();

      // Fetch users (teachers)
      const usersData = await pb.collection('users').getFullList({
        filter: 'role = "slot_admin"',
      });

      // Fetch slots
      const slotsData = await pb.collection('slots').getFullList({
        sort: 'slot_order',
      });

      setClasses(classesData || []);
      setAttendanceRecords(attendanceData || []);
      setUsers(usersData || []);
      setSlots(slotsData || []);
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
  }, []);

  const getClassData = () => {
    const classData = [];

    classes.forEach((classItem) => {
      // Count attendance entries for this class
      const attendanceCount = attendanceRecords.filter(
        (record) => record.class_id === classItem.id
      ).length;

      // Only include classes with attendance >= total slots
      if (attendanceCount >= slots.length) {
        // Calculate total students from attendance records
        const totalStudents = attendanceRecords
          .filter((record) => record.class_id === classItem.id)
          .reduce((sum, record) => sum + record.total_students, 0);

        // Get unique slot IDs that have attendance for this class
        const slotIdsWithAttendance = [
          ...new Set(
            attendanceRecords
              .filter((record) => record.class_id === classItem.id)
              .map((record) => record.slot_id)
          ),
        ];

        // Get teacher names for these slots
        const teacherNames = users
          .filter((user) => slotIdsWithAttendance.includes(user.assigned_slot_id))
          .map((user) => user.name || user.username)
          .filter((name) => name)
          .join(', ');

        classData.push({
          name: classItem.name,
          description: classItem.description || '',
          totalStudents: totalStudents,
          teacherNames: teacherNames || 'N/A',
          attendanceCount: attendanceCount,
        });
      }
    });

    // Sort classes by name (TilawahClass1, TilawahClass2, etc.)
    classData.sort((a, b) => {
      const extractNumber = (str) => {
        const match = str.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      };
      return extractNumber(a.name) - extractNumber(b.name);
    });

    return classData;
  };

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const classData = getClassData();

      if (classData.length === 0) {
        alert('No classes with complete attendance found to generate report.');
        setGenerating(false);
        return;
      }

      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const lineHeight = 7;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Class Report', 105, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, yPosition, { align: 'center' });
      yPosition += 15;

      // Iterate through each class
      classData.forEach((classItem, index) => {
        // Check if we need a new page
        if (yPosition + 60 > pageHeight - margin) {
          doc.addPage();
          yPosition = 20;
        }

        // Class Name (Header)
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(classItem.name, margin, yPosition);
        yPosition += lineHeight + 2;

        // Separator line
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition, 190, yPosition);
        yPosition += lineHeight;

        // Class details
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        // Supervisor
        doc.setFont('helvetica', 'bold');
        doc.text('Supervisor:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text('Farheen', margin + 35, yPosition);
        yPosition += lineHeight;

        // Name of Teachers
        doc.setFont('helvetica', 'bold');
        doc.text('Name of Teachers:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        const teacherText = classItem.teacherNames || 'N/A';
        const teacherLines = doc.splitTextToSize(teacherText, 140);
        doc.text(teacherLines, margin + 35, yPosition);
        yPosition += lineHeight * teacherLines.length;

        // Class Summary
        doc.setFont('helvetica', 'bold');
        doc.text('Class Summary:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        const descriptionText = classItem.description || 'N/A';
        const descriptionLines = doc.splitTextToSize(descriptionText, 140);
        doc.text(descriptionLines, margin + 35, yPosition);
        yPosition += lineHeight * descriptionLines.length;

        // Total Students
        doc.setFont('helvetica', 'bold');
        doc.text('Total Students:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(classItem.totalStudents.toString(), margin + 35, yPosition);
        yPosition += lineHeight + 5;

        // Add separator between classes (except for the last one)
        if (index < classData.length - 1) {
          doc.setLineWidth(0.3);
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPosition, 190, yPosition);
          yPosition += 10;
        }
      });

      // Save the PDF
      doc.save(`Class_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading report data...</div>;
  }

  const classData = getClassData();

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Reports</h2>
        <button
          onClick={generatePDF}
          disabled={generating || classData.length === 0}
          className="generate-pdf-btn"
        >
          {generating ? 'Generating PDF...' : 'Download PDF Report'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="report-info">
        <p>
          This report includes classes that have attendance entered for all {slots.length} slots.
        </p>
        <p>
          <strong>Classes included in report:</strong> {classData.length}
        </p>
      </div>

      {classData.length === 0 ? (
        <div className="no-data">
          No classes with complete attendance found. Ensure all slots have entered attendance for each class.
        </div>
      ) : (
        <div className="report-preview">
          <h3>Report Preview</h3>
          {classData.map((classItem, index) => (
            <div key={index} className="class-preview-card">
              <h4>{classItem.name}</h4>
              <div className="preview-details">
                <div className="preview-row">
                  <span className="preview-label">Supervisor:</span>
                  <span className="preview-value">Farheen</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Name of Teachers:</span>
                  <span className="preview-value">{classItem.teacherNames}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Class Summary:</span>
                  <span className="preview-value">{classItem.description || 'N/A'}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Total Students:</span>
                  <span className="preview-value">{classItem.totalStudents}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
