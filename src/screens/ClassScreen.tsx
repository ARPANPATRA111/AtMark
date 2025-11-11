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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RNPrint from 'react-native-print';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
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
  StudentData,
} from '../storage/storage';
import { formatISODateForDisplay } from '../utils/date';
import { theme } from '../theme';
import { useToast } from '../components/ToastProvider';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const ClassScreen = ({ route, navigation }: any) => {
  const { className } = route.params;
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const loadStudents = useCallback(async () => {
    const loadedStudents = await getStudents(className);
    // Sort by name
    const sorted = [...loadedStudents].sort((a, b) => a.name.localeCompare(b.name));
    setStudents(sorted);
  }, [className]);

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
    if (!newName.trim()) {
      toast.showToast({ message: 'Student name cannot be empty', type: 'warning' });
      return;
    }

    const editingStudent = students.find(s => s.id === editingStudentId);
    if (!editingStudent) return;

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
      // Check if there are students
      if (students.length === 0) {
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

      console.log('[PDF] Starting PDF generation...');
      console.log('[PDF] Target path:', targetPath);

      // Generate PDF using react-native-print
      try {
        const result = await RNPrint.print({
          html,
        });

        const pdfPath = result?.filePath;

        if (pdfPath) {
          generatedFilePath = pdfPath;
          console.log('[PDF] PDF generated at:', pdfPath);

          // Copy to app document directory for persistent storage
          try {
            await RNFS.copyFile(pdfPath, targetPath);
            console.log('[PDF] Copied to:', targetPath);
          } catch (copyError: any) {
            console.warn('[PDF] Copy error, using original path:', copyError);
            targetPath = pdfPath;
          }

          // Verify file exists
          if (targetPath) {
            const fileExists = await RNFS.exists(targetPath);
            if (!fileExists) {
              throw new Error('Generated PDF file does not exist');
            }

            console.log('[PDF] Sharing file from:', targetPath);
            
            // Share PDF file
            try {
              const shareUrl = Platform.OS === 'android' ? `file://${targetPath}` : targetPath;
              await Share.open({
                url: shareUrl,
                type: 'application/pdf',
                title: `${className} Attendance Report`,
                subject: `Attendance Report - ${className}`,
                filename: `${fileName}.pdf`,
              });
              
              ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
              toast.showToast({ message: 'PDF exported successfully!', type: 'success' });
            } catch (shareError: any) {
              console.error('[PDF] Share error:', shareError);
              // User cancelled share - not an error
              if (shareError && (
                shareError.message === 'User did not share' || 
                shareError.message?.includes('cancelled') ||
                shareError.message?.includes('cancel')
              )) {
                console.log('[PDF] User cancelled share');
                toast.showToast({ message: 'PDF generated successfully', type: 'info' });
              } else {
                throw new Error(`Failed to share PDF: ${shareError.message || 'Unknown error'}`);
              }
            }
          }
        } else {
          // If print dialog was used (no file path returned), print was sent directly
          ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
          toast.showToast({ message: 'PDF sent to printer!', type: 'success' });
        }
      } catch (printError: any) {
        console.error('[PDF] Print error:', printError);
        throw new Error(`PDF generation failed: ${printError.message || 'Unknown error'}`);
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
    const datesPerPage = 15; // Reduced for better formatting
    const studentsPerPage = 25; // Increased for efficiency
    
    const escapedClassName = escapeHtml(className);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 9px; 
            margin: 15px; 
            color: #333;
          }
          h1 { 
            font-size: 20px; 
            text-align: center; 
            margin-bottom: 8px; 
            color: #2c3e50;
            font-weight: 600;
          }
          h2 { 
            font-size: 12px; 
            margin: 12px 0 8px 0; 
            color: #34495e;
            font-weight: 500;
          }
          .summary { 
            text-align: center;
            margin: 8px 0 15px 0; 
            font-size: 10px;
            color: #7f8c8d;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            font-size: 8px;
          }
          th, td { 
            border: 1px solid #bdc3c7; 
            padding: 5px 3px; 
            text-align: center;
            vertical-align: middle;
          }
          th { 
            background-color: #3498db; 
            color: white; 
            font-weight: 600;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .name-col { 
            text-align: left; 
            font-weight: 500;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .roll-col { 
            font-weight: 600;
            min-width: 50px;
          }
          .present { 
            background-color: #d5f4e6; 
            color: #27ae60; 
            font-weight: 700;
          }
          .absent { 
            background-color: #fadbd8; 
            color: #e74c3c; 
            font-weight: 700;
          }
          .stats-col {
            background-color: #ecf0f1;
            font-weight: 600;
            color: #2c3e50;
          }
          .page-break { 
            page-break-after: always; 
          }
          .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #3498db;
            text-align: center;
            font-size: 8px;
            color: #7f8c8d;
          }
          @media print {
            body { margin: 10px; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <h1>📋 Attendance Report: ${escapedClassName}</h1>
        <div class="summary">
          Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div class="summary">
          Total Students: ${students.length} | Total Days: ${totalDays}
        </div>
    `;

    // Paginate dates
    for (let dateStart = 0; dateStart < dates.length; dateStart += datesPerPage) {
      const dateEnd = Math.min(dateStart + datesPerPage, dates.length);
      const currentDates = dates.slice(dateStart, dateEnd);

      // Paginate students
      for (let studentStart = 0; studentStart < students.length; studentStart += studentsPerPage) {
        const studentEnd = Math.min(studentStart + studentsPerPage, students.length);
        const currentStudents = students.slice(studentStart, studentEnd);

        const startDate = formatISODateForDisplay(currentDates[0]);
        const endDate = formatISODateForDisplay(currentDates[currentDates.length - 1]);

        html += `
          <h2>📅 Period: ${startDate} to ${endDate} | Students ${studentStart + 1}-${studentEnd}</h2>
          <table>
            <thead>
              <tr>
                <th class="roll-col">Roll No</th>
                <th class="name-col">Name</th>
                ${currentDates.map(date => {
                  const formattedDate = formatISODateForDisplay(date);
                  const shortDate = formattedDate.substring(0, 5); // MM/DD
                  return `<th title="${formattedDate}">${shortDate}</th>`;
                }).join('')}
                <th class="stats-col">Present</th>
                <th class="stats-col">%</th>
              </tr>
            </thead>
            <tbody>
        `;

        currentStudents.forEach(student => {
          const escapedName = escapeHtml(student.name);
          const studentDates = attendanceData[student.rollNumber].slice(dateStart, dateEnd);
          const presentCount = studentDates.filter(mark => mark === 'P').length;
          const percentage = ((presentCount / currentDates.length) * 100).toFixed(1);
          
          html += `
            <tr>
              <td class="roll-col">${escapeHtml(student.rollNumber)}</td>
              <td class="name-col" title="${escapedName}">${escapedName}</td>
              ${studentDates.map(mark => 
                `<td class="${mark === 'P' ? 'present' : 'absent'}">${mark}</td>`
              ).join('')}
              <td class="stats-col">${presentCount}/${currentDates.length}</td>
              <td class="stats-col">${percentage}%</td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;
        
        // Add page break if not the last page
        const isLastPage = (studentEnd >= students.length && dateEnd >= dates.length);
        if (!isLastPage) {
          html += `<div class="page-break"></div>`;
        }
      }
    }

    // Add footer
    html += `
        <div class="footer">
          <p>Generated by AtMark Attendance System</p>
          <p>© ${new Date().getFullYear()} - All rights reserved</p>
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
