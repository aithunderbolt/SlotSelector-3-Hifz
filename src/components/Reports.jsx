import { useState, useEffect, useMemo } from 'react';
import { pb } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import './Reports.css';

const Reports = ({ isSuperAdmin = false }) => {
  const [classes, setClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingWord, setGeneratingWord] = useState(false);
  const [supervisorName, setSupervisorName] = useState('Farheen');

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel for better performance
      // NOTE: Do NOT fetch attachments here - they contain large base64 image data
      // Attachments are fetched lazily only when generating PDF
      const [classesData, attendanceData, usersData, slotsData] = await Promise.all([
        pb.collection('classes').getFullList({
          sort: 'name',
          fields: 'id,name,description',
        }),
        pb.collection('attendance').getFullList({
          fields: 'id,class_id,slot_id,total_students',
        }),
        pb.collection('users').getFullList({
          filter: 'role = "slot_admin"',
          fields: 'id,name,username,assigned_slot_id',
        }),
        pb.collection('slots').getFullList({
          sort: 'slot_order',
          fields: 'id,display_name,slot_order',
        })
      ]);

      // Fetch supervisor name separately (non-critical)
      try {
        const settingsData = await pb.collection('settings').getFullList({
          filter: 'key = "supervisor_name"',
          fields: 'value',
        });

        if (settingsData && settingsData.length > 0) {
          setSupervisorName(settingsData[0].value);
        }
      } catch (err) {
        console.error('Error fetching supervisor name setting:', err);
        // Fallback to default if error
      }

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

  // Create lookup map for users by assigned_slot_id - O(1) access
  const usersBySlotId = useMemo(() => {
    const map = {};
    users.forEach(user => {
      if (!map[user.assigned_slot_id]) {
        map[user.assigned_slot_id] = [];
      }
      map[user.assigned_slot_id].push(user);
    });
    return map;
  }, [users]);

  // Group attendance records by class_id for O(1) access
  const attendanceByClassId = useMemo(() => {
    const map = {};
    attendanceRecords.forEach(record => {
      if (!map[record.class_id]) {
        map[record.class_id] = [];
      }
      map[record.class_id].push(record);
    });
    return map;
  }, [attendanceRecords]);

  // Memoized class data computation (without attachments for fast load)
  const classData = useMemo(() => {
    const result = [];

    classes.forEach((classItem) => {
      // O(1) lookup instead of filter
      const classAttendance = attendanceByClassId[classItem.id] || [];
      const attendanceCount = classAttendance.length;

      // Only include classes with attendance >= total slots
      if (attendanceCount >= slots.length) {
        // Calculate total students from attendance records
        const totalStudents = classAttendance.reduce(
          (sum, record) => sum + record.total_students,
          0
        );

        // Get unique slot IDs that have attendance for this class
        const slotIdsWithAttendance = new Set(
          classAttendance.map((record) => record.slot_id)
        );

        // Get teacher names using lookup map - O(n) instead of O(n*m)
        const teacherNames = [];
        slotIdsWithAttendance.forEach(slotId => {
          const slotUsers = usersBySlotId[slotId] || [];
          slotUsers.forEach(user => {
            const name = user.name || user.username;
            if (name) teacherNames.push(name);
          });
        });

        // Get attendance record IDs for this class (for lazy loading attachments)
        const attendanceIds = classAttendance.map(record => record.id);

        result.push({
          id: classItem.id,
          name: classItem.name,
          description: classItem.description || '',
          totalStudents: totalStudents,
          teacherNames: teacherNames.join(', ') || 'N/A',
          attendanceCount: attendanceCount,
          attendanceIds: attendanceIds,
        });
      }
    });

    // Sort classes by name (TilawahClass1, TilawahClass2, etc.)
    result.sort((a, b) => {
      const extractNumber = (str) => {
        const match = str.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      };
      return extractNumber(a.name) - extractNumber(b.name);
    });

    return result;
  }, [classes, attendanceByClassId, slots.length, usersBySlotId]);

  // Lazy fetch attachments for specific attendance IDs
  // Fetches each record individually to avoid response size limits with large base64 images
  const fetchAttachmentsForClass = async (attendanceIds) => {
    if (!attendanceIds || attendanceIds.length === 0) return [];

    const allAttachments = [];
    for (const id of attendanceIds) {
      try {
        const data = await pb.collection('attendance').getOne(id, {
          fields: 'attachments',
        });

        if (data && data.attachments && data.attachments.length > 0) {
          allAttachments.push(...data.attachments);
        }
      } catch (err) {
        console.error('Error fetching attachments for id', id, ':', err);
      }
    }
    return allAttachments;
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      if (classData.length === 0) {
        alert('No classes with complete attendance found to generate report.');
        setGenerating(false);
        return;
      }

      // Fetch attachments for all classes sequentially to avoid rate limits
      const classDataWithAttachments = [];
      for (const classItem of classData) {
        const attachments = await fetchAttachmentsForClass(classItem.attendanceIds);
        classDataWithAttachments.push({
          ...classItem,
          attachments,
        });
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pdfWidth - (2 * margin);

      let yPosition = margin;

      // Helper: load an image from a data URI and return its natural dimensions
      const getImageNaturalSize = (dataUri) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 200, h: 150 });
        img.src = dataUri;
      });

      // Helper function to create HTML element for a class section
      // Returns a Promise so image dimensions can be measured before rendering
      const createClassElement = async (classItem, isFirst = false) => {
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
                <strong>Supervisor:</strong> ${supervisorName}
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

        // Add attendance images if available
        if (classItem.attachments && classItem.attachments.length > 0) {
          html += `
            <div style="margin-top: 12px; margin-bottom: 15px;">
              <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Attendance Images:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          `;

          for (const attachment of classItem.attachments) {
            // Pre-measure the image so we can emit explicit width/height.
            // html2canvas does not support object-fit, so we must avoid it.
            const MAX_W = 200;
            const MAX_H = 150;
            const { w: natW, h: natH } = await getImageNaturalSize(attachment.data);
            let dispW = natW;
            let dispH = natH;
            if (dispW > MAX_W) { dispH = Math.round(dispH * MAX_W / dispW); dispW = MAX_W; }
            if (dispH > MAX_H) { dispW = Math.round(dispW * MAX_H / dispH); dispH = MAX_H; }
            html += `
              <div style="border: 1px solid #dee2e6; border-radius: 4px; display: inline-block;">
                <img src="${attachment.data}" alt="${attachment.name}" width="${dispW}" height="${dispH}" style="display: block;" />
              </div>
            `;
          }

          html += `
              </div>
            </div>
          `;
        }

        container.innerHTML = html;
        return container;
      };

      // Process each class section
      for (let i = 0; i < classDataWithAttachments.length; i++) {
        const classItem = classDataWithAttachments[i];
        const isFirst = i === 0;

        // Create the element for this class (async – images are pre-measured)
        const element = await createClassElement(classItem, isFirst);
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
        if (i < classDataWithAttachments.length - 1) {
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

  const generateWord = async () => {
    setGeneratingWord(true);
    try {
      if (classData.length === 0) {
        alert('No classes with complete attendance found to generate report.');
        setGeneratingWord(false);
        return;
      }

      // Fetch attachments for all classes sequentially to avoid rate limits
      const classDataWithAttachments = [];
      for (const classItem of classData) {
        const attachments = await fetchAttachmentsForClass(classItem.attendanceIds);
        classDataWithAttachments.push({
          ...classItem,
          attachments,
        });
      }

      const base64ToUint8Array = (dataUri) => {
        const base64 = dataUri.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };

      // Helper: resolve the actual pixel dimensions of an image from its data URI,
      // then scale it down (preserving aspect ratio) so it fits within maxW×maxH.
      const getImageDimensions = (dataUri, maxW = 300, maxH = 400) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
          resolve({ width: w, height: h });
        };
        img.onerror = () => resolve({ width: maxW, height: Math.round(maxW * 3 / 4) });
        img.src = dataUri;
      });

      const children = [];

      children.push(
        new Paragraph({
          text: 'Class Report',
          heading: HeadingLevel.HEADING_1,
          alignment: 'center',
          spacing: { after: 100 },
        }),
        new Paragraph({
          alignment: 'center',
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
              size: 20,
              color: '666666',
            }),
          ],
        })
      );

      for (const classItem of classDataWithAttachments) {
        children.push(
          new Paragraph({
            text: classItem.name,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '3498db' },
            },
          })
        );

        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Supervisor: ', bold: true, size: 22 }),
              new TextRun({ text: supervisorName, size: 22 }),
            ],
          })
        );

        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Name of Teachers: ', bold: true, size: 22 }),
              new TextRun({ text: classItem.teacherNames, size: 22 }),
            ],
          })
        );

        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Class Summary: ', bold: true, size: 22 }),
              new TextRun({ text: classItem.description || 'N/A', size: 22 }),
            ],
          })
        );

        children.push(
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({ text: 'Total Students: ', bold: true, size: 22 }),
              new TextRun({ text: String(classItem.totalStudents), size: 22 }),
            ],
          })
        );

        if (classItem.attachments && classItem.attachments.length > 0) {
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 80 },
              children: [
                new TextRun({ text: 'Attendance Images:', bold: true, size: 22 }),
              ],
            })
          );

          for (const attachment of classItem.attachments) {
            try {
              const imageData = base64ToUint8Array(attachment.data);
              const { width: imgW, height: imgH } = await getImageDimensions(attachment.data);
              children.push(
                new Paragraph({
                  spacing: { after: 100 },
                  children: [
                    new ImageRun({
                      data: imageData,
                      transformation: { width: imgW, height: imgH },
                      type: 'png',
                    }),
                  ],
                })
              );
            } catch (imgErr) {
              console.warn('Skipping image:', imgErr);
            }
          }
        }
      }

      const doc = new Document({
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Class_Report_${new Date().toISOString().split('T')[0]}.docx`);
    } catch (err) {
      console.error('Error generating Word document:', err);
      alert('Error generating Word document. Please try again.');
    } finally {
      setGeneratingWord(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading report data...</div>;
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Reports</h2>
        <div className="reports-actions">
          <button
            onClick={generatePDF}
            disabled={generating || classData.length === 0}
            className="generate-pdf-btn"
          >
            {generating ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
          {isSuperAdmin && (
            <button
              onClick={generateWord}
              disabled={generatingWord || classData.length === 0}
              className="generate-word-btn"
            >
              {generatingWord ? 'Generating Word...' : 'Download Word Report'}
            </button>
          )}
        </div>
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
                  <span className="preview-value">{supervisorName}</span>
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
