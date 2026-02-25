import { useState, useEffect, useMemo } from 'react';
import { pb } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
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
  const [reportFileName, setReportFileName] = useState('Hifz');

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

      // Fetch supervisor name and report file name separately (non-critical)
      try {
        const settingsData = await pb.collection('settings').getFullList({
          filter: 'key = "supervisor_name" || key = "report_file_name"',
          fields: 'key,value',
        });

        if (settingsData && settingsData.length > 0) {
          const supervisorSetting = settingsData.find(s => s.key === 'supervisor_name');
          const reportFileNameSetting = settingsData.find(s => s.key === 'report_file_name');
          if (supervisorSetting) setSupervisorName(supervisorSetting.value);
          if (reportFileNameSetting) setReportFileName(reportFileNameSetting.value);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
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

  // Helper: run async tasks with controlled concurrency to avoid rate limits
  // while still being faster than fully sequential execution.
  const runWithConcurrency = async (tasks, concurrency = 3) => {
    const results = new Array(tasks.length);
    let idx = 0;
    const runNext = async () => {
      while (idx < tasks.length) {
        const i = idx++;
        results[i] = await tasks[i]();
      }
    };
    const workers = [];
    for (let w = 0; w < Math.min(concurrency, tasks.length); w++) {
      workers.push(runNext());
    }
    await Promise.all(workers);
    return results;
  };

  // Lazy fetch attachments for specific attendance IDs
  // Uses controlled concurrency (3 at a time) with 1 retry per failed request
  // to stay within API limits while being significantly faster than sequential.
  const fetchAttachmentsForClass = async (attendanceIds) => {
    if (!attendanceIds || attendanceIds.length === 0) return [];

    const tasks = attendanceIds.map((id) => async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const data = await pb.collection('attendance').getOne(id, {
            fields: 'attachments',
          });

          if (data && data.attachments && data.attachments.length > 0) {
            return data.attachments;
          }
          return [];
        } catch (err) {
          console.error('Error fetching attachments for id', id, ':', err);
          if (attempt === 0) { await new Promise(r => setTimeout(r, 300)); continue; }
          return [];
        }
      }
      return [];
    });

    const results = await runWithConcurrency(tasks, 3);
    return results.flat();
  };

  // Fetch attachments for all classes using controlled concurrency
  const fetchAllClassAttachments = async (classes) => {
    const tasks = classes.map((classItem) => async () => {
      const attachments = await fetchAttachmentsForClass(classItem.attendanceIds);
      return { ...classItem, attachments };
    });
    return runWithConcurrency(tasks, 2);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      if (classData.length === 0) {
        alert('No classes with complete attendance found to generate report.');
        setGenerating(false);
        return;
      }

      // Fetch attachments for all classes with controlled concurrency
      const classDataWithAttachments = await fetchAllClassAttachments(classData);

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pdfWidth - (2 * margin);

      let yPosition = margin;

      // Note: image helpers (getImageNaturalSize / compressImage) have been
      // replaced by inline img.decode() calls in the image processing tasks
      // below. This guarantees full pixel decoding before drawImage, which
      // prevents black-canvas issues during parallel processing.

      // Helper: ensure yPosition has room, else add a new page
      const ensureSpace = (needed) => {
        if (yPosition + needed > pdfHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Helper: render text block for a class directly via jsPDF (replaces html2canvas)
      const renderClassText = (classItem, isFirst) => {
        if (isFirst) {
          // Report title
          ensureSpace(25);
          pdf.setFontSize(22);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Class Report', pdfWidth / 2, yPosition + 6, { align: 'center' });
          yPosition += 10;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(102, 102, 102);
          pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pdfWidth / 2, yPosition + 4, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
          yPosition += 12;
        }

        // Class name heading with blue underline
        ensureSpace(20);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(classItem.name, margin, yPosition + 5);
        yPosition += 8;
        pdf.setDrawColor(52, 152, 219);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pdfWidth - margin, yPosition);
        yPosition += 6;

        // Details
        pdf.setFontSize(12);
        const lineH = 7;

        // Supervisor
        ensureSpace(lineH);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Supervisor: ', margin, yPosition + 4);
        const supLabelW = pdf.getTextWidth('Supervisor: ');
        pdf.setFont('helvetica', 'normal');
        pdf.text(supervisorName, margin + supLabelW, yPosition + 4);
        yPosition += lineH;

        // Teachers
        ensureSpace(lineH);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Name of Teachers: ', margin, yPosition + 4);
        const teachLabelW = pdf.getTextWidth('Name of Teachers: ');
        pdf.setFont('helvetica', 'normal');
        const teacherLines = pdf.splitTextToSize(classItem.teacherNames, contentWidth - teachLabelW);
        pdf.text(teacherLines[0], margin + teachLabelW, yPosition + 4);
        yPosition += lineH;
        for (let t = 1; t < teacherLines.length; t++) {
          ensureSpace(lineH);
          pdf.text(teacherLines[t], margin + teachLabelW, yPosition + 4);
          yPosition += lineH;
        }

        // Class Summary
        ensureSpace(lineH);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Class Summary: ', margin, yPosition + 4);
        const summLabelW = pdf.getTextWidth('Class Summary: ');
        pdf.setFont('helvetica', 'normal');
        const descText = classItem.description || 'N/A';
        const descLines = pdf.splitTextToSize(descText, contentWidth - summLabelW);
        pdf.text(descLines[0], margin + summLabelW, yPosition + 4);
        yPosition += lineH;
        for (let d = 1; d < descLines.length; d++) {
          ensureSpace(lineH);
          pdf.text(descLines[d], margin + summLabelW, yPosition + 4);
          yPosition += lineH;
        }

        // Total Students
        ensureSpace(lineH);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Total Students: ', margin, yPosition + 4);
        const studLabelW = pdf.getTextWidth('Total Students: ');
        pdf.setFont('helvetica', 'normal');
        pdf.text(String(classItem.totalStudents), margin + studLabelW, yPosition + 4);
        yPosition += lineH;

        // Attendance Images label
        if (classItem.attachments && classItem.attachments.length > 0) {
          ensureSpace(lineH);
          yPosition += 2;
          pdf.setFont('helvetica', 'bold');
          pdf.text('Attendance Images:', margin, yPosition + 4);
          yPosition += lineH;
        }
      };

      // Pre-process all images across all classes in parallel batches
      const IMG_GAP = 3;
      const IMG_GAP_V = 4;
      const COLS = 2;
      const slotW = (contentWidth - IMG_GAP * (COLS - 1)) / COLS;
      const MAX_H_MM = 90;
      const IMG_DPI = 96;

      const imageTaskList = [];
      for (let ci = 0; ci < classDataWithAttachments.length; ci++) {
        const attachments = classDataWithAttachments[ci].attachments;
        if (!attachments || attachments.length === 0) continue;
        for (let ai = 0; ai < attachments.length; ai++) {
          imageTaskList.push({ classIdx: ci, attachIdx: ai, dataUri: attachments[ai].data });
        }
      }

      const processedImages = {};
      const imgTasks = imageTaskList.map((item) => async () => {
        // Load and fully decode the image before any canvas operations
        const sizeImg = new Image();
        sizeImg.src = item.dataUri;
        let natW = 400, natH = 300;
        try {
          await sizeImg.decode();
          natW = sizeImg.naturalWidth;
          natH = sizeImg.naturalHeight;
        } catch { /* use defaults */ }

        const scale = Math.min(slotW / natW, MAX_H_MM / natH);
        const imgW = natW * scale;
        const imgH = natH * scale;
        const targetPxW = imgW / 25.4 * IMG_DPI;
        const targetPxH = imgH / 25.4 * IMG_DPI;

        // Compress using fully decoded image
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(targetPxW));
        c.height = Math.max(1, Math.round(targetPxH));
        c.getContext('2d').drawImage(sizeImg, 0, 0, c.width, c.height);
        const compressed = c.toDataURL('image/jpeg', 0.72);

        processedImages[`${item.classIdx}_${item.attachIdx}`] = { data: compressed, fmt: 'JPEG', w: imgW, h: imgH };
      });

      await runWithConcurrency(imgTasks, 5);

      // Process each class section
      for (let i = 0; i < classDataWithAttachments.length; i++) {
        const classItem = classDataWithAttachments[i];
        const isFirst = i === 0;

        renderClassText(classItem, isFirst);

        if (classItem.attachments && classItem.attachments.length > 0) {
          let col = 0;
          let rowMaxH = 0;
          let rowEntries = [];

          const flushRow = () => {
            if (rowEntries.length === 0) return;
            if (yPosition + rowMaxH > pdfHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            for (const entry of rowEntries) {
              pdf.addImage(entry.data, entry.fmt, entry.x, yPosition, entry.w, entry.h);
            }
            yPosition += rowMaxH + IMG_GAP_V;
            rowEntries = [];
            col = 0;
            rowMaxH = 0;
          };

          for (let ai = 0; ai < classItem.attachments.length; ai++) {
            const key = `${i}_${ai}`;
            const processed = processedImages[key];
            if (!processed) continue;

            const xPos = margin + col * (slotW + IMG_GAP);
            rowEntries.push({ ...processed, x: xPos });
            if (processed.h > rowMaxH) rowMaxH = processed.h;

            col++;
            if (col >= COLS) flushRow();
          }
          flushRow();
        }

        // Separator line between classes
        if (i < classDataWithAttachments.length - 1) {
          yPosition += 3;
          if (yPosition + 5 < pdfHeight - margin) {
            pdf.setLineWidth(0.3);
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, yPosition, pdfWidth - margin, yPosition);
            yPosition += 5;
          } else {
            pdf.addPage();
            yPosition = margin;
          }
        }
      }

      pdf.save(`${reportFileName}-${new Date().toISOString().split('T')[0]}.pdf`);
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

      // Fetch attachments for all classes with controlled concurrency
      const classDataWithAttachments = await fetchAllClassAttachments(classData);

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
      const getImageDimensions = (dataUri, maxW = 480, maxH = 360) => new Promise((resolve) => {
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

      // Pre-process all image dimensions in parallel batches of 5
      const allImgTasks = [];
      for (let ci = 0; ci < classDataWithAttachments.length; ci++) {
        const attachments = classDataWithAttachments[ci].attachments;
        if (!attachments || attachments.length === 0) continue;
        for (let ai = 0; ai < attachments.length; ai++) {
          allImgTasks.push({ classIdx: ci, attachIdx: ai, dataUri: attachments[ai].data });
        }
      }

      const imgDimMap = {};
      const dimTasks = allImgTasks.map((item) => async () => {
        const dims = await getImageDimensions(item.dataUri);
        imgDimMap[`${item.classIdx}_${item.attachIdx}`] = dims;
      });
      await runWithConcurrency(dimTasks, 5);

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

      for (let ci = 0; ci < classDataWithAttachments.length; ci++) {
        const classItem = classDataWithAttachments[ci];

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

          for (let ai = 0; ai < classItem.attachments.length; ai++) {
            try {
              const attachment = classItem.attachments[ai];
              const imageData = base64ToUint8Array(attachment.data);
              const dims = imgDimMap[`${ci}_${ai}`] || { width: 480, height: 360 };
              children.push(
                new Paragraph({
                  spacing: { after: 100 },
                  children: [
                    new ImageRun({
                      data: imageData,
                      transformation: { width: dims.width, height: dims.height },
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
      saveAs(blob, `${reportFileName}-${new Date().toISOString().split('T')[0]}.docx`);
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
