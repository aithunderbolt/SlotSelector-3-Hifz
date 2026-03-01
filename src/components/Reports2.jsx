import { useState, useEffect, useMemo } from 'react';
import { pb } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import './Reports2.css';

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

const Reports2 = ({ isSuperAdmin = false }) => {
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

      // Fetch attachments for selected classes with controlled concurrency
      const classDataWithAttachments = await fetchAllClassAttachments(selectedClassData);

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

      // Helper: render text block for a class via html2canvas for proper Arabic rendering
      const renderClassText = async (classItem, isFirst) => {
        // Build an offscreen DOM element styled to match the PDF layout
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; left: -9999px; top: 0;
          width: ${contentWidth * 3.78}px;
          background: white;
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          padding: 0; margin: 0;
          direction: ltr;
        `;
        document.body.appendChild(container);

        let html = '';

        const pf = PDF_FONT_PRESETS[pdfFontSize] || PDF_FONT_PRESETS.default;

        if (isFirst) {
          html += `
            <div style="text-align:center;margin-bottom:8px;">
              <div style="font-size:${pf.title}px;font-weight:bold;">Class Report</div>
              <div style="font-size:${pf.date}px;color:#666;margin-top:4px;">Generated on: ${new Date().toLocaleDateString()}</div>
            </div>
          `;
        }

        html += `
          <div style="font-size:${pf.className}px;font-weight:bold;margin-bottom:2px;">${classItem.name}</div>
          <div style="border-bottom:2px solid #3498db;margin-bottom:8px;"></div>
          <div style="font-size:${pf.body}px;margin-bottom:5px;"><b>Supervisor: </b>${supervisorName}</div>
          <div style="font-size:${pf.body}px;margin-bottom:5px;"><b>Name of Teachers: </b>${classItem.teacherNames}</div>
          <div dir="auto" style="font-size:${pf.body}px;margin-bottom:5px;white-space:pre-line;"><b>Class Summary: </b>${classItem.description || 'N/A'}</div>
          <div style="font-size:${pf.body}px;margin-bottom:5px;"><b>Total Students: </b>${classItem.totalStudents}</div>
          <div style="font-size:${pf.body}px;margin-bottom:5px;"><b>Students Absent: </b>${classItem.studentsAbsent}</div>
        `;

        if (classItem.attachments && classItem.attachments.length > 0) {
          html += `<div style="font-size:${pf.body}px;font-weight:bold;margin-top:6px;">Attendance Images:</div>`;
        }

        container.innerHTML = html;

        try {
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
          });

          const imgData = canvas.toDataURL('image/png');
          const imgW = contentWidth;
          const imgH = (canvas.height / canvas.width) * contentWidth;

          ensureSpace(imgH);
          pdf.addImage(imgData, 'PNG', margin, yPosition, imgW, imgH);
          yPosition += imgH + 2;
        } finally {
          document.body.removeChild(container);
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

        // Render text block via html2canvas for proper Arabic text rendering
        await renderClassText(classItem, isFirst);

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
      if (selectedClassData.length === 0) {
        alert('No classes selected to generate report.');
        setGeneratingWord(false);
        return;
      }

      // Fetch attachments for selected classes with controlled concurrency
      const classDataWithAttachments = await fetchAllClassAttachments(selectedClassData);

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
              size: (WORD_FONT_PRESETS[wordFontSize] || WORD_FONT_PRESETS.default).date,
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

export default Reports2;
