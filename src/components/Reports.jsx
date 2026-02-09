import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const classData = getClassData();

      if (classData.length === 0) {
        alert('No classes with complete attendance found to generate report.');
        setGenerating(false);
        return;
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pdfWidth - (2 * margin);
      const contentHeight = pdfHeight - (2 * margin);

      let yPosition = margin;

      // Helper function to create HTML element for a class section
      const createClassElement = (classItem, isFirst = false) => {
        const container = document.createElement('div');
        container.style.width = '700px';
        container.style.padding = '20px';
        container.style.backgroundColor = 'white';
        container.style.fontFamily = 'Arial, Tahoma, sans-serif';
        container.style.direction = 'ltr';

        let html = '';

        // Add title only for first class
        if (isFirst) {
          html += `
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="font-size: 22px; margin-bottom: 8px;">Class Report</h1>
              <p style="font-size: 11px; color: #666;">Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
          `;
        }

        html += `
          <div style="margin-bottom: 15px;">
            <h2 style="font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 6px; margin-bottom: 12px;">${classItem.name}</h2>
            <div style="font-size: 12px; line-height: 1.8;">
              <div style="margin-bottom: 8px;">
                <strong>Supervisor:</strong> Farheen
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Name of Teachers:</strong> ${classItem.teacherNames}
              </div>
              <div style="margin-bottom: 8px; direction: auto;">
                <strong>Class Summary:</strong> <span style="unicode-bidi: embed;">${classItem.description || 'N/A'}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Total Students:</strong> ${classItem.totalStudents}
              </div>
            </div>
          </div>
        `;

        container.innerHTML = html;
        return container;
      };

      // Process each class section
      for (let i = 0; i < classData.length; i++) {
        const classItem = classData[i];
        const isFirst = i === 0;

        // Create the element for this class
        const element = createClassElement(classItem, isFirst);
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        document.body.appendChild(element);

        // Wait for fonts to load
        await document.fonts.ready;

        // Convert to canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Remove element
        document.body.removeChild(element);

        // Calculate image dimensions
        const imgWidth = contentWidth;
        const ratio = imgWidth / canvas.width;
        const imgHeight = canvas.height * ratio;

        // Check if we need a new page (leave some margin for separator)
        if (i > 0 && yPosition + imgHeight > pdfHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        // Add image to PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);

        yPosition += imgHeight;

        // Add separator line (except for last item)
        if (i < classData.length - 1) {
          // Check if separator and next section might need a new page
          yPosition += 3;
          if (yPosition + 5 < pdfHeight - margin) {
            pdf.setLineWidth(0.3);
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, yPosition, pdfWidth - margin, yPosition);
            yPosition += 5;
          }
        }
      }

      // Save the PDF
      pdf.save(`Class_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
