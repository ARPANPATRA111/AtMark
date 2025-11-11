import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RNPrint from 'react-native-print';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import * as DocumentPicker from '@react-native-documents/picker';
import LinearGradient from 'react-native-linear-gradient';
import { BaseScreen } from '../components/BaseScreen';
import { CustomButton } from '../components/CustomButton';
import { CustomTextInput } from '../components/CustomTextInput';
import {
  getStudents,
  addStudent,
  updateStudentName,
  deleteStudent,
  getAttendanceDates,
  getAttendance,
  saveAttendance,
  StudentData,
  AttendanceMap,
} from '../storage/storage';
import { formatISODateForDisplay } from '../utils/date';
import { theme } from '../theme';
import { useToast } from '../components/ToastProvider';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface AttendanceMetadata {
  version: string;
  className: string;
  generatedAt: string;
  totalStudents: number;
  totalDays: number;
  students: Array<{
    id: string;
    name: string;
    rollNumber: string;
  }>;
  attendance: Array<{
    date: string;
    records: Array<{
      rollNumber: string;
      status: string;
    }>;
  }>;
}

export const ClassScreen = ({ route, navigation }: any) => {
  const { className } = route.params;
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const toast = useToast();

  const loadStudents = useCallback(async () => {
    try {
      if (!className) {
        console.error('[ClassScreen] className is undefined');
        return;
      }
      
      const loadedStudents = await getStudents(className);
      
      // Safety check: ensure loadedStudents is an array
      if (!Array.isArray(loadedStudents)) {
        console.error('[ClassScreen] loadedStudents is not an array');
        setStudents([]);
        return;
      }
      
      // Sort by name with safety checks
      const sorted = [...loadedStudents].sort((a, b) => {
        const nameA = a?.name || '';
        const nameB = b?.name || '';
        return nameA.localeCompare(nameB);
      });
      setStudents(sorted);
    } catch (error) {
      console.error('[ClassScreen] Error loading students:', error);
      toast.showToast({ message: 'Failed to load students', type: 'error' });
      setStudents([]);
    }
  }, [className, toast]);

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [loadStudents])
  );

  const handleAddStudent = () => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate('AddStudent', { className });
  };

  const handleTakeAttendance = () => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate('Attendance', { className });
  };

  const handleViewHistory = () => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate('AttendanceHistory', { className });
  };

  const handleStudentPress = (student: StudentData) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate('StudentAttendance', { className, student });
  };

  const handleEditStudent = (student: StudentData) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    setEditingStudentId(student.id);
    setNewName(student.name);
  };

  const handleSaveEdit = async () => {
    if (!newName?.trim()) {
      toast.showToast({ message: 'Student name cannot be empty', type: 'warning' });
      return;
    }

    const editingStudent = students.find(s => s?.id === editingStudentId);
    if (!editingStudent || !editingStudent.rollNumber) {
      toast.showToast({ message: 'Student not found', type: 'error' });
      setEditingStudentId(null);
      return;
    }

    try {
      await updateStudentName(className, editingStudent.rollNumber, newName.trim());
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      // Optimistic update so user sees immediate change
      setStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, name: newName.trim() } : s));
      // Ensure local DB is fully consistent — reload and then clear edit state
      await loadStudents();
      setEditingStudentId(null);
      setNewName('');
      toast.showToast({ message: 'Student updated', type: 'success' });
    } catch (error: any) {
      toast.showToast({ message: error?.message ?? 'Failed to update student', type: 'error' });
    }
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setNewName('');
  };

  const handleDeleteStudent = async (student: StudentData) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    // Immediate delete with Undo option
    await deleteStudent(className, student.rollNumber);
    await loadStudents();
    ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
    toast.showToast({
      message: `Deleted ${student.name}`,
      type: 'warning',
      actionLabel: 'Undo',
      onActionPress: async () => {
        try {
          // Note: restored student will get new id from DB
          await addStudent(className, { name: student.name, rollNumber: student.rollNumber });
          await loadStudents();
          toast.showToast({ message: 'Restored', type: 'success' });
        } catch (e: any) {
          toast.showToast({ message: e?.message ?? 'Failed to restore', type: 'error' });
        }
      },
    });
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'This app needs access to storage to export PDF files.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[PDF] Permission error:', err);
      return false;
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);

    let generatedFilePath: string | null = null;
    let targetPath: string | null = null;

    try {
      // Safety checks
      if (!className) {
        throw new Error('Class name is missing');
      }
      
      // Check if there are students
      if (!students || students.length === 0) {
        toast.showToast({ message: 'No students in this class to export', type: 'warning' });
        setIsExporting(false);
        return;
      }

      // Get attendance dates
      const dates = await getAttendanceDates(className);
      if (dates.length === 0) {
        toast.showToast({ message: 'No attendance records yet for this class', type: 'warning' });
        setIsExporting(false);
        return;
      }

      // Sort dates chronologically
      const sortedDates = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Build attendance data
      const attendanceData: { [rollNumber: string]: string[] } = {};
      students.forEach(student => {
        attendanceData[student.rollNumber] = [];
      });

      for (const date of sortedDates) {
        const attendance = await getAttendance(className, date);
        students.forEach(student => {
          const isPresent = attendance[student.rollNumber] === 1;
          attendanceData[student.rollNumber].push(isPresent ? 'P' : 'A');
        });
      }

      // Generate HTML with escaped content
      const html = generatePDFHTML(className, students, sortedDates, attendanceData);

      // Use app-internal directory to avoid permission issues on Android 11+
      const sanitizedClassName = className.replace(/[^a-z0-9]/gi, '_');
      const fileName = `${sanitizedClassName}_Attendance_${Date.now()}`;
      targetPath = `${RNFS.DocumentDirectoryPath}/${fileName}.pdf`;

      console.log('[PDF] Starting report generation...');
      console.log('[PDF] Total dates:', sortedDates.length);
      console.log('[PDF] Total students:', students.length);

      // Since react-native-print doesn't return file path reliably,
      // we'll create an HTML file that can be opened and printed
      try {
        // Create HTML file path
        const htmlFilePath = `${RNFS.DocumentDirectoryPath}/${fileName}.html`;
        
        console.log('[PDF] Writing HTML file to:', htmlFilePath);
        
        // Write HTML to file
        await RNFS.writeFile(htmlFilePath, html, 'utf8');
        
        // Verify file was created
        const fileExists = await RNFS.exists(htmlFilePath);
        if (!fileExists) {
          throw new Error('Failed to create HTML file');
        }

        const fileSize = await RNFS.stat(htmlFilePath);
        console.log('[PDF] HTML file created successfully, size:', fileSize.size, 'bytes');
        
        targetPath = htmlFilePath;
        generatedFilePath = htmlFilePath;
        
        // Copy to Downloads folder for easy access
        try {
          const downloadPath = Platform.OS === 'android' 
            ? `${RNFS.DownloadDirectoryPath}/${fileName}.html`
            : htmlFilePath;
          
          console.log('[PDF] Target download path:', downloadPath);
          
          if (Platform.OS === 'android') {
            await RNFS.copyFile(htmlFilePath, downloadPath);
            console.log('[PDF] File copied to Downloads');
          }
          
          // Try to share the file
          try {
            await Share.open({
              url: `file://${downloadPath}`,
              type: 'text/html',
              title: `${className} Attendance Report`,
              failOnCancel: false,
            });
          } catch (shareError: any) {
            console.log('[PDF] Share cancelled or failed:', shareError?.message);
            // If share fails, just notify user about the file location
            if (Platform.OS === 'android') {
              Alert.alert(
                'File Saved',
                `File saved to Downloads folder:\n${fileName}.html\n\nOpen in browser to print as PDF`,
                [{ text: 'OK' }]
              );
            }
          }
          
          ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
          toast.showToast({ 
            message: Platform.OS === 'android' 
              ? 'Report saved to Downloads! Open in browser to print' 
              : 'Report exported! Open in browser and print to PDF', 
            type: 'success' 
          });
        } catch (copyError: any) {
          console.error('[PDF] Copy/Share error:', copyError);
          throw new Error(`Failed to save report: ${copyError?.message || 'Unknown error'}`);
        }
      } catch (fileError: any) {
        console.error('[PDF] File creation error:', fileError);
        throw new Error(`Report generation failed: ${fileError.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('[PDF] Export Error:', error);
      toast.showToast({ 
        message: error.message || 'Export failed. Please try again.', 
        type: 'error' 
      });
    } finally {
      // Clean up temporary files
      if (generatedFilePath && targetPath && generatedFilePath !== targetPath) {
        try {
          const tempExists = await RNFS.exists(generatedFilePath);
          if (tempExists) {
            await RNFS.unlink(generatedFilePath);
            console.log('[PDF] Cleaned up temp file');
          }
        } catch (cleanupError) {
          console.warn('[PDF] Cleanup error:', cleanupError);
        }
      }
      setIsExporting(false);
    }
  };

  const handleImportAttendance = async () => {
    if (isImporting) return;
    
    setIsImporting(true);
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);

    try {
      // Pick HTML file
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      if (!file?.uri) {
        throw new Error('No file selected');
      }

      console.log('[Import] Selected file:', file.uri);

      // Read file content
      const htmlContent = await RNFS.readFile(file.uri, 'utf8');
      
      // Extract metadata from HTML comment
      const metadataMatch = htmlContent.match(/<!--ATMARK_METADATA_START\s*([\s\S]*?)\s*ATMARK_METADATA_END-->/);
      
      if (!metadataMatch) {
        throw new Error('This is not a valid AtMark attendance export file. Please select an HTML file exported from this app.');
      }

      const metadata: AttendanceMetadata = JSON.parse(metadataMatch[1]);
      
      console.log('[Import] Metadata extracted:', metadata);

      // Validate metadata
      if (!metadata.version || !metadata.className || !metadata.attendance) {
        throw new Error('Invalid file format');
      }

      // Check if class name matches
      if (metadata.className !== className) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Different Class',
            `This file is from "${metadata.className}" but you're in "${className}". Do you want to continue?`,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Continue', onPress: () => resolve(true) },
            ]
          );
        });

        if (!proceed) {
          setIsImporting(false);
          return;
        }
      }

      // Get current students in the class
      const currentStudents = await getStudents(className);
      const currentStudentMap = new Map(currentStudents.map(s => [s.rollNumber, s]));

      let importedCount = 0;
      let skippedCount = 0;
      let matchedStudents = 0;

      // Process each attendance record
      for (const attendanceDay of metadata.attendance) {
        const { date, records } = attendanceDay;
        
        // Build attendance map for this date
        const dayAttendance: AttendanceMap = {};
        
        for (const record of records) {
          // Check if student exists in current class by roll number
          if (currentStudentMap.has(record.rollNumber)) {
            if (record.status === 'P') {
              dayAttendance[record.rollNumber] = 1;
              matchedStudents++;
            }
            // 'A' means absent, so we don't add to the map (absence is implicit)
          } else {
            skippedCount++;
          }
        }

        // Save attendance for this date
        try {
          await saveAttendance(className, date, dayAttendance);
          importedCount++;
        } catch (error) {
          console.error(`[Import] Error saving attendance for ${date}:`, error);
        }
      }

      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      
      Alert.alert(
        'Import Successful',
        `Imported ${importedCount} days of attendance.\n\n` +
        `✓ ${matchedStudents} student records matched\n` +
        (skippedCount > 0 ? `⚠ ${skippedCount} records skipped (student not found)` : ''),
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('[Import] Error:', error);
      
      if (error.code === 'DOCUMENT_PICKER_CANCELED') {
        console.log('[Import] User cancelled');
      } else {
        ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
        toast.showToast({
          message: error.message || 'Import failed. Please try again.',
          type: 'error',
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const escapeHtml = (text: string): string => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  const generatePDFHTML = (
    className: string,
    students: StudentData[],
    dates: string[],
    attendanceData: { [rollNumber: string]: string[] }
  ): string => {
    const totalDays = dates.length;
    const escapedClassName = escapeHtml(className);
    
    // Group dates by month
    const datesByMonth: { [monthKey: string]: string[] } = {};
    dates.forEach(date => {
      const dateObj = new Date(date);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      if (!datesByMonth[monthKey]) {
        datesByMonth[monthKey] = [];
      }
      datesByMonth[monthKey].push(date);
    });
    
    // Sort month keys chronologically
    const sortedMonthKeys = Object.keys(datesByMonth).sort();
    
    // Format date helper - shows DD format (just day)
    const formatDateShort = (isoDate: string): string => {
      try {
        const date = new Date(isoDate);
        return String(date.getDate()).padStart(2, '0');
      } catch (e) {
        return isoDate.substring(8); // Fallback to day
      }
    };
    
    // Get month name from monthKey (YYYY-MM)
    const getMonthName = (monthKey: string): string => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };
    
    // Prepare metadata for import functionality
    const metadata = {
      version: '1.0',
      className: className,
      generatedAt: new Date().toISOString(),
      totalStudents: students.length,
      totalDays: totalDays,
      students: students.map(s => ({
        id: s.id,
        name: s.name,
        rollNumber: s.rollNumber
      })),
      attendance: dates.map((date, dateIndex) => ({
        date: date,
        records: students.map(student => ({
          rollNumber: student.rollNumber,
          status: attendanceData[student.rollNumber][dateIndex]
        }))
      }))
    };
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Attendance Report - ${escapedClassName}</title>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          body { 
            font-family: 'Arial', 'Helvetica', sans-serif; 
            font-size: 8px; 
            color: #000;
            line-height: 1.2;
          }
          
          .print-instructions {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 5px;
            padding: 15px;
            margin: 15px;
            text-align: center;
          }
          
          .print-instructions h3 {
            color: #856404;
            font-size: 16px;
            margin-bottom: 10px;
          }
          
          .print-instructions p {
            color: #856404;
            font-size: 12px;
            margin: 5px 0;
          }
          
          .print-button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 30px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 14px;
            font-weight: bold;
            margin: 10px 5px;
            cursor: pointer;
            border: none;
          }
          
          .print-button:hover {
            background-color: #0056b3;
          }
          
          @media print {
            .print-instructions {
              display: none !important;
            }
            body { margin: 0; }
            .page-break { page-break-after: always; }
            table { page-break-inside: avoid; }
          }
          
          .header { 
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
          }
          
          .header h1 { 
            font-size: 16px; 
            font-weight: bold;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          
          .header .info { 
            font-size: 9px;
            margin: 2px 0;
          }
          
          .section-header { 
            font-size: 10px; 
            font-weight: bold;
            margin: 10px 0 5px 0; 
            padding: 3px 5px;
            background-color: #f0f0f0;
            border-left: 3px solid #333;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          
          th, td { 
            border: 1px solid #333; 
            padding: 3px 2px; 
            text-align: center;
            vertical-align: middle;
            font-size: 7px;
          }
          
          th { 
            background-color: #e0e0e0; 
            font-weight: bold;
            font-size: 7px;
            white-space: nowrap;
          }
          
          .col-sno { 
            width: 25px;
            font-weight: bold;
          }
          
          .col-roll { 
            width: 50px;
            font-weight: bold;
          }
          
          .col-name { 
            text-align: left; 
            padding-left: 5px;
            min-width: 100px;
            max-width: 150px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .col-date {
            width: 20px;
            font-size: 6px;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            padding: 2px 1px;
          }
          
          .col-stats {
            width: 35px;
            background-color: #f9f9f9;
            font-weight: bold;
          }
          
          .mark-p { 
            background-color: #c8e6c9; 
            font-weight: bold;
          }
          
          .mark-a { 
            background-color: #ffcdd2; 
            font-weight: bold;
          }
          
          .page-break { 
            page-break-after: always; 
          }
          
          .footer {
            margin-top: 10px;
            padding-top: 5px;
            border-top: 1px solid #333;
            text-align: center;
            font-size: 7px;
          }
          
          @media print {
            body { margin: 0; }
            .page-break { page-break-after: always; }
            table { page-break-inside: avoid; }
          }
        </style>
        <script>
          function printReport() {
            window.print();
          }
          
          function savePDF() {
            // Trigger print dialog which allows saving as PDF
            window.print();
          }
        </script>
      </head>
      <body>
        <!-- Instructions Banner (hidden when printing) -->
        <div class="print-instructions">
          <h3>📄 Attendance Report Ready!</h3>
          <p>Click the button below to print or save as PDF</p>
          <button onclick="printReport()" class="print-button">🖨️ Print / Save as PDF</button>
          <p style="margin-top: 10px; font-size: 11px;">
            <strong>Tip:</strong> In the print dialog, select "Save as PDF" as your printer destination
          </p>
        </div>
        
        <!-- Hidden metadata for import (embedded as JSON in HTML comment) -->
        <!--ATMARK_METADATA_START
        ${JSON.stringify(metadata, null, 2)}
        ATMARK_METADATA_END-->
        
        <!-- Report Content -->
        <div class="header">
          <h1>Attendance Register</h1>
          <div class="info"><strong>Class:</strong> ${escapedClassName}</div>
          <div class="info"><strong>Period:</strong> ${formatISODateForDisplay(dates[0])} to ${formatISODateForDisplay(dates[dates.length - 1])}</div>
          <div class="info"><strong>Total Students:</strong> ${students.length} | <strong>Total Days:</strong> ${totalDays} | <strong>Generated:</strong> ${new Date().toLocaleDateString()}</div>
        </div>
    `;

    // Organize by month - each month gets its own page(s)
    sortedMonthKeys.forEach((monthKey, monthIndex) => {
      const monthDates = datesByMonth[monthKey];
      const monthName = getMonthName(monthKey);
      const MAX_STUDENTS_PER_PAGE = 30;
      
      // Get attendance data indices for this month
      const monthDateIndices = monthDates.map(date => dates.indexOf(date));
      
      // Paginate students if there are too many
      for (let studentStart = 0; studentStart < students.length; studentStart += MAX_STUDENTS_PER_PAGE) {
        const studentEnd = Math.min(studentStart + MAX_STUDENTS_PER_PAGE, students.length);
        const currentStudents = students.slice(studentStart, studentEnd);
        
        const pageInfo = students.length > MAX_STUDENTS_PER_PAGE 
          ? `${monthName} | Students ${studentStart + 1}-${studentEnd} of ${students.length}`
          : monthName;

        html += `
          <div class="section-header">📅 ${pageInfo}</div>
          <table>
            <thead>
              <tr>
                <th class="col-sno">S.No</th>
                <th class="col-roll">Roll No</th>
                <th class="col-name">Student Name</th>
        `;

        // Add date columns for this month (showing just day number)
        monthDates.forEach(date => {
          const dayNumber = formatDateShort(date);
          const fullDate = formatISODateForDisplay(date);
          html += `<th class="col-date" title="${fullDate}">${dayNumber}</th>`;
        });

        html += `
                <th class="col-stats">Present</th>
                <th class="col-stats">Absent</th>
                <th class="col-stats">%</th>
              </tr>
            </thead>
            <tbody>
        `;

        // Add student rows
        currentStudents.forEach((student, index) => {
          const escapedName = escapeHtml(student.name);
          
          // Get attendance marks for this student for this month's dates
          const monthMarks = monthDateIndices.map(dateIdx => 
            attendanceData[student.rollNumber][dateIdx]
          );
          
          const presentCount = monthMarks.filter(mark => mark === 'P').length;
          const absentCount = monthMarks.filter(mark => mark === 'A').length;
          const percentage = monthDates.length > 0 
            ? ((presentCount / monthDates.length) * 100).toFixed(0)
            : '0';
          
          html += `
            <tr>
              <td class="col-sno">${studentStart + index + 1}</td>
              <td class="col-roll">${escapeHtml(student.rollNumber)}</td>
              <td class="col-name" title="${escapedName}">${escapedName}</td>
          `;

          // Add attendance marks for this month
          monthMarks.forEach(mark => {
            html += `<td class="mark-${mark.toLowerCase()}">${mark}</td>`;
          });

          html += `
              <td class="col-stats">${presentCount}</td>
              <td class="col-stats">${absentCount}</td>
              <td class="col-stats">${percentage}%</td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;
        
        // Add page break after each month (except last month with last student batch)
        const isLastMonth = (monthIndex === sortedMonthKeys.length - 1);
        const isLastStudentBatch = (studentEnd >= students.length);
        if (!(isLastMonth && isLastStudentBatch)) {
          html += `<div class="page-break"></div>`;
        }
      }
    });

    // Add footer
    html += `
        <div class="footer">
          <p><strong>AtMark Attendance System</strong> | Generated on ${new Date().toLocaleString()} | © ${new Date().getFullYear()}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const renderStudentItem = ({ item }: { item: StudentData }) => {
    if (editingStudentId === item.id) {
      return (
        <View style={styles.editCard}>
          <View style={styles.editCardHeader}>
            <Text style={styles.editRollNumber}>{item.rollNumber}</Text>
            <View style={styles.editCardActions}>
              <TouchableOpacity onPress={handleSaveEdit} style={styles.saveButton}>
                <Icon name="check" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditButton}>
                <Icon name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <CustomTextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter student name"
            containerStyle={styles.editInputContainer}
            autoFocus
          />
        </View>
      );
    }

    return (
      <View style={styles.studentCard}>
        {/* Header with roll number and actions */}
        <View style={styles.studentCardHeader}>
          <View style={styles.studentCardTitleRow}>
            <Icon name="badge" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.studentRollNumber}>{item.rollNumber}</Text>
          </View>
          <View style={styles.studentCardActions}>
            <TouchableOpacity
              onPress={() => handleEditStudent(item)}
              style={styles.studentActionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="edit" size={16} color={theme.colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteStudent(item)}
              style={styles.studentActionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="delete" size={16} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main content - tappable */}
        <TouchableOpacity
          style={styles.studentCardContent}
          onPress={() => handleStudentPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.studentNameSection}>
            <Icon name="person" size={20} color={theme.colors.primary} />
            <Text style={styles.studentName}>{item.name}</Text>
          </View>
          <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <BaseScreen>
      <LinearGradient colors={[theme.colors.surface, '#f0f7ff']} style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="class" size={28} color={theme.colors.primary} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.className}>{className}</Text>
            <View style={styles.studentCountBadge}>
              <Icon name="people" size={16} color={theme.colors.primary} />
              <Text style={styles.studentCount}>{students.length} Students</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity 
              onPress={handleImportAttendance} 
              style={{ padding: 8 }}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Icon name="upload-file" size={22} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSearchMode(m => !m)} style={{ padding: 8 }}>
              <Icon name="search" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {searchMode && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <CustomTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search students by name or roll"
            iconName="search"
            containerStyle={{ marginBottom: 8 }}
          />
        </View>
      )}
      { (students.length === 0) ? (
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={80} color={theme.colors.gray400} />
          <Text style={styles.emptyStateText}>No students yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add students to start tracking attendance
          </Text>
        </View>
      ) : (
        <FlatList
          data={students.filter(s => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q);
          })}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.quickActions}>
        <CustomButton
          title="Add Student"
          onPress={handleAddStudent}
          iconName="person-add"
          size="medium"
          style={styles.actionButtonStyle}
        />
        <CustomButton
          title="Attendance"
          onPress={handleTakeAttendance}
          iconName="checklist"
          size="small"
          variant="secondary"
          style={styles.actionButtonStyle}
        />
      </View>

      <View style={styles.secondaryActions}>
        <TouchableOpacity onPress={handleViewHistory} style={styles.secondaryActionButton}>
          <Icon name="history" size={18} color={theme.colors.primary} />
          <Text style={styles.secondaryActionText}>History</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity 
          onPress={handleExportPDF} 
          style={styles.secondaryActionButton}
          disabled={isExporting}
        >
          <Icon 
            name="picture-as-pdf" 
            size={18} 
            color={isExporting ? theme.colors.gray400 : theme.colors.primary} 
          />
          <Text style={[
            styles.secondaryActionText,
            isExporting && styles.secondaryActionTextDisabled
          ]}>
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Text>
        </TouchableOpacity>
      </View>
    </BaseScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  className: {
    fontSize: theme.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  studentCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    gap: 4,
  },
  studentCount: {
    fontSize: theme.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButtonStyle: {
    flex: 1,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flex: 1,
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: theme.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  secondaryActionTextDisabled: {
    color: theme.colors.gray400,
  },
  actionDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.gray200,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  studentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
  },
  studentCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  studentRollNumber: {
    fontSize: theme.sizes.sm,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  studentCardActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  studentActionButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray100,
  },
  studentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  studentNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  studentName: {
    fontSize: theme.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  editCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    backgroundColor: theme.colors.gray100,
  },
  editRollNumber: {
    fontSize: theme.sizes.sm,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  editCardActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  saveButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryDark,
  },
  cancelEditButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.dangerDark,
  },
  editInputContainer: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateText: {
    fontSize: theme.sizes.xl,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
  },
  emptyStateSubtext: {
    fontSize: theme.sizes.md,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
