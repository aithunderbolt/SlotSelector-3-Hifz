import { useState, useEffect, useMemo } from 'react';
import { pb } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import './Reports.css';

const PDF_FONT_PRESETS = {
  small: { body: 10, title: 18, className: 14, date: 9 },
  default: { body: 12, title: 22, className: 16, date: 11 },
  medium: { body: 14, title: 26, className: 18, date: 13 },
  large: { body: 16, title: 30, className: 20, date: 15 },
  xlarge: { body: 18, title: 34, className: 22, date: 17 },
  '2xl': { body: 20, title: 38, className: 24, date: 19 },
  '3xl': { body: 22, title: 42, className: 26, date: 21 },
  '4xl': { body: 24, title: 46, className: 28, date: 23 },
  '5xl': { body: 26, title: 50, className: 30, date: 25 },
};
const WORD_FONT_PRESETS = {
  small: { body: 18, date: 16 },
  default: { body: 22, date: 20 },
  medium: { body: 26, date: 24 },
  large: { body: 30, date: 28 },
  xlarge: { body: 34, date: 32 },
  '2xl': { body: 38, date: 36 },
  '3xl': { body: 42, date: 40 },
  '4xl': { body: 46, date: 44 },
  '5xl': { body: 50, date: 48 },
};

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
  const [selectedClassIds, setSelectedClassIds] = useState(new Set());
  const [pdfFontSize, setPdfFontSize] = useState('default');
  const [wordFontSize, setWordFontSize] = useState('default');

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
          fields: 'id,class_id,slot_id,total_students,students_absent',
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

        const studentsAbsent = classAttendance.reduce(
          (sum, record) => sum + (record.students_absent || 0),
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
          studentsAbsent: studentsAbsent,
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

  // Sync selectedClassIds whenever classData changes — all selected by default
  useEffect(() => {
    setSelectedClassIds(new Set(classData.map(c => c.id)));
  }, [classData]);

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

  const selectedClassData = classData.filter(c => selectedClassIds.has(c.id));

  const toggleClassSelection = (id) => {
    setSelectedClassIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedClassIds.size === classData.length) {
      setSelectedClassIds(new Set());
    } else {
      setSelectedClassIds(new Set(classData.map(c => c.id)));
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      if (selectedClassData.length === 0) {
        alert('No classes selected to generate report.');
        setGenerating(false);
        return;
      }

      // Fetch attachments for selected classes sequentially to avoid rate limits
      const classDataWithAttachments = [];
      for (const classItem of selectedClassData) {
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

      // Helper: load an image and return its natural pixel dimensions
      const getImageNaturalSize = (dataUri) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 400, h: 300 });
        img.src = dataUri;
      });

      // Helper: re-draw an image at target pixel dimensions and export as JPEG
      // at the given quality — dramatically reduces file size vs. raw source data.
      const compressImage = (dataUri, targetW, targetH, quality = 0.72) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(targetW));
          c.height = Math.max(1, Math.round(targetH));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUri);
        img.src = dataUri;
      });

      // Helper: place a canvas onto the PDF, slicing it across pages if it is taller
      // than the remaining space. This prevents any canvas content from being clipped.
      const addCanvasToPdf = (canvas) => {
        const pxToMm = contentWidth / canvas.width;
        const fullPagePx = Math.floor((pdfHeight - 2 * margin) / pxToMm);

        let srcY = 0;
        while (srcY < canvas.height) {
          const slicePx = Math.min(fullPagePx, canvas.height - srcY);
          const sliceMm = slicePx * pxToMm;

          if (yPosition + sliceMm > pdfHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = slicePx;
          sliceCanvas.getContext('2d').drawImage(
            canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx
          );

          pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.82), 'JPEG', margin, yPosition, contentWidth, sliceMm);
          yPosition += sliceMm;
          srcY += fullPagePx;
        }
      };

      // Process each class section
      for (let i = 0; i < classDataWithAttachments.length; i++) {
        const classItem = classDataWithAttachments[i];
        const isFirst = i === 0;

        // --- Step 1: render only the text block (no images) via html2canvas ---
        const container = document.createElement('div');
        container.style.cssText = 'width:700px;padding:20px;background:#fff;font-family:Arial,Tahoma,sans-serif;direction:ltr;';

        let html = '';

        const pf = PDF_FONT_PRESETS[pdfFontSize] || PDF_FONT_PRESETS.default;

        if (isFirst) {
          html += `
            <div style="text-align:center;margin-bottom:20px;">
              <h1 style="font-size:${pf.title}px;margin-bottom:8px;">Class Report</h1>
              <p style="font-size:${pf.date}px;color:#666;">Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
          `;
        }

        html += `
          <div style="margin-bottom:15px;">
            <h2 style="font-size:${pf.className}px;border-bottom:2px solid #3498db;padding-bottom:6px;margin-bottom:12px;">${classItem.name}</h2>
            <div style="font-size:${pf.body}px;line-height:1.8;">
              <div style="margin-bottom:8px;"><strong>Supervisor:</strong> ${supervisorName}</div>
              <div style="margin-bottom:8px;"><strong>Name of Teachers:</strong> ${classItem.teacherNames}</div>
              <div style="margin-bottom:8px;direction:auto;white-space:pre-line;"><strong>Class Summary:</strong> <span style="unicode-bidi:embed;">${classItem.description || 'N/A'}</span></div>
              <div style="margin-bottom:8px;"><strong>Total Students:</strong> ${classItem.totalStudents}</div>
              <div style="margin-bottom:8px;"><strong>Students Absent:</strong> ${classItem.studentsAbsent}</div>
              ${classItem.attachments && classItem.attachments.length > 0 ? `<div style="margin-top:10px;font-size:${pf.body}px;font-weight:bold;">Attendance Images:</div>` : ''}
            </div>
          </div>
        `;

        container.innerHTML = html;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        await document.fonts.ready;

        const textCanvas = await html2canvas(container, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        document.body.removeChild(container);

        addCanvasToPdf(textCanvas);

        // --- Step 2: add each attendance image directly to the PDF ---
        if (classItem.attachments && classItem.attachments.length > 0) {
          const IMG_GAP = 3;
          const IMG_GAP_V = 4;
          const COLS = 2;
          const slotW = (contentWidth - IMG_GAP * (COLS - 1)) / COLS;
          const MAX_H_MM = 90;

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

          const IMG_DPI = 96;
          for (const attachment of classItem.attachments) {
            const { w: natW, h: natH } = await getImageNaturalSize(attachment.data);
            const scale = Math.min(slotW / natW, MAX_H_MM / natH);
            const imgW = natW * scale;
            const imgH = natH * scale;
            const targetPxW = imgW / 25.4 * IMG_DPI;
            const targetPxH = imgH / 25.4 * IMG_DPI;
            const compressed = await compressImage(attachment.data, targetPxW, targetPxH);
            const xPos = margin + col * (slotW + IMG_GAP);
            rowEntries.push({ data: compressed, fmt: 'JPEG', x: xPos, w: imgW, h: imgH });
            if (imgH > rowMaxH) rowMaxH = imgH;
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
      if (selectedClassData.length === 0) {
        alert('No classes selected to generate report.');
        setGeneratingWord(false);
        return;
      }

      // Fetch attachments for selected classes sequentially to avoid rate limits
      const classDataWithAttachments = [];
      for (const classItem of selectedClassData) {
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
              size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).date,
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
              new TextRun({ text: 'Supervisor: ', bold: true, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
              new TextRun({ text: supervisorName, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
            ],
          })
        );

        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Name of Teachers: ', bold: true, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
              new TextRun({ text: classItem.teacherNames, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
            ],
          })
        );

        // Class Summary — split on newlines to preserve line breaks in Word
        const summaryLines = (classItem.description || 'N/A').split('\n');
        const summaryRuns = [
          new TextRun({ text: 'Class Summary: ', bold: true, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
        ];
        summaryLines.forEach((line, idx) => {
          if (idx > 0) summaryRuns.push(new TextRun({ break: 1, text: '', size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }));
          summaryRuns.push(new TextRun({ text: line, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }));
        });
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: summaryRuns,
          })
        );

        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Total Students: ', bold: true, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
              new TextRun({ text: String(classItem.totalStudents), size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
            ],
          })
        );

        children.push(
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({ text: 'Students Absent: ', bold: true, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
              new TextRun({ text: String(classItem.studentsAbsent), size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
            ],
          })
        );

        if (classItem.attachments && classItem.attachments.length > 0) {
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 80 },
              children: [
                new TextRun({ text: 'Attendance Images:', bold: true, size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).body }),
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
          <select value={pdfFontSize} onChange={(e) => setPdfFontSize(e.target.value)} className="font-size-select">
            <option value="small">PDF: Small</option>
            <option value="default">PDF: Default</option>
            <option value="medium">PDF: Medium</option>
            <option value="large">PDF: Large</option>
            <option value="xlarge">PDF: Extra Large</option>
            <option value="2xl">PDF: 2XL</option>
            <option value="3xl">PDF: 3XL</option>
            <option value="4xl">PDF: 4XL</option>
            <option value="5xl">PDF: 5XL</option>
          </select>
          <button
            onClick={generatePDF}
            disabled={generating || selectedClassData.length === 0}
            className="generate-pdf-btn"
          >
            {generating ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
          {isSuperAdmin && (
            <>
              <select value={wordFontSize} onChange={(e) => setWordFontSize(e.target.value)} className="font-size-select">
                <option value="small">Word: Small</option>
                <option value="default">Word: Default</option>
                <option value="medium">Word: Medium</option>
                <option value="large">Word: Large</option>
                <option value="xlarge">Word: Extra Large</option>
                <option value="2xl">Word: 2XL</option>
                <option value="3xl">Word: 3XL</option>
                <option value="4xl">Word: 4XL</option>
                <option value="5xl">Word: 5XL</option>
              </select>
              <button
                onClick={generateWord}
                disabled={generatingWord || selectedClassData.length === 0}
                className="generate-word-btn"
              >
                {generatingWord ? 'Generating Word...' : 'Download Word Report'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="report-info">
        <p>
          This report includes classes that have attendance entered for all {slots.length} slots.
        </p>
        <p>
          <strong>Eligible classes:</strong> {classData.length} &nbsp;|&nbsp; <strong>Selected:</strong> {selectedClassData.length}
        </p>
      </div>

      {classData.length === 0 ? (
        <div className="no-data">
          No classes with complete attendance found. Ensure all slots have entered attendance for each class.
        </div>
      ) : (
        <div className="report-preview">
          <div className="report-preview-header">
            <h3>Report Preview</h3>
            <label className="select-all-toggle">
              <input
                type="checkbox"
                checked={selectedClassIds.size === classData.length}
                onChange={toggleSelectAll}
              />
              {selectedClassIds.size === classData.length ? 'Deselect All' : 'Select All'}
            </label>
          </div>
          {classData.map((classItem, index) => (
            <div
              key={index}
              className={`class-preview-card ${selectedClassIds.has(classItem.id) ? '' : 'class-preview-card--deselected'}`}
              onClick={() => toggleClassSelection(classItem.id)}
            >
              <div className="class-preview-card-header">
                <input
                  type="checkbox"
                  className="class-checkbox"
                  checked={selectedClassIds.has(classItem.id)}
                  onChange={() => toggleClassSelection(classItem.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <h4>{classItem.name}</h4>
              </div>
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
                  <span className="preview-value" style={{ whiteSpace: 'pre-line' }}>{classItem.description || 'N/A'}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Total Students:</span>
                  <span className="preview-value">{classItem.totalStudents}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Students Absent:</span>
                  <span className="preview-value">{classItem.studentsAbsent}</span>
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
