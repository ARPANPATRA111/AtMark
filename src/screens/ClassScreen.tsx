import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
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

  const handleExportPDF = async () => {
    setIsExporting(true);
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);

    try {
      const dates = await getAttendanceDates(className);
      if (dates.length === 0) {
        toast.showToast({ message: 'No attendance records yet for this class', type: 'warning' });
        setIsExporting(false);
        return;
      }

      // Build attendance data
      const attendanceData: { [rollNumber: string]: string[] } = {};
      students.forEach(student => {
        attendanceData[student.rollNumber] = [];
      });

      for (const date of dates) {
        const attendance = await getAttendance(className, date);
        students.forEach(student => {
          const isPresent = attendance[student.rollNumber] === 1;
          attendanceData[student.rollNumber].push(isPresent ? 'P' : 'A');
        });
      }

      // Generate HTML
      const html = generatePDFHTML(className, students, dates, attendanceData);

      // Use app-internal directory to avoid permission issues on Android 11+
      const fileName = `${className.replace(/[^a-z0-9]/gi, '_')}_Attendance_${Date.now()}.pdf`;
      const targetPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      // Generate PDF with RNHTMLtoPDF (writes to temp/cache)
      let file;
      try {
        file = await RNHTMLtoPDF.convert({
          html,
          fileName: fileName.replace('.pdf', ''),
          base64: false,
        });
      } catch (pdfError: any) {
        console.error('[PDF] Conversion error:', pdfError);
        throw new Error('Failed to generate PDF.');
      }

      if (!file || !file.filePath) {
        throw new Error('PDF file path is undefined');
      }

      // Copy to app document directory for safe access
      await RNFS.copyFile(file.filePath, targetPath);
      console.log('[PDF] Saved to:', targetPath);
      
      // Share PDF from app directory
      try {
        await Share.open({
          url: Platform.OS === 'android' ? `file://${targetPath}` : targetPath,
          type: 'application/pdf',
          title: `${className} Attendance Report`,
        });
      } catch (shareError: any) {
        // User cancelled share - not an error
        if (shareError.message !== 'User did not share') {
          console.error('[PDF] Share error:', shareError);
          throw new Error('Failed to share PDF');
        }
      }

      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      toast.showToast({ message: 'PDF exported successfully!', type: 'success' });
    } catch (error: any) {
      console.error('[PDF] Export Error:', error);
      toast.showToast({ 
        message: error.message || 'Export failed. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDFHTML = (
    className: string,
    students: StudentData[],
    dates: string[],
    attendanceData: { [rollNumber: string]: string[] }
  ): string => {
    const totalDays = dates.length;
    const datesPerPage = 18;
    const studentsPerPage = 20;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
          h1 { font-size: 18px; text-align: center; margin-bottom: 10px; }
          h2 { font-size: 14px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 4px; text-align: center; }
          th { background-color: #4A90E2; color: white; font-weight: bold; }
          .present { background-color: #E8F8F0; color: #27AE60; font-weight: bold; }
          .absent { background-color: #FADBD8; color: #E74C3C; font-weight: bold; }
          .summary { margin: 10px 0; font-weight: bold; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        <h1>Attendance Report: ${className}</h1>
        <div class="summary">Total Students: ${students.length} | Total Days: ${totalDays}</div>
    `;

    // Paginate dates
    for (let dateStart = 0; dateStart < dates.length; dateStart += datesPerPage) {
      const dateEnd = Math.min(dateStart + datesPerPage, dates.length);
      const currentDates = dates.slice(dateStart, dateEnd);

      // Paginate students
      for (let studentStart = 0; studentStart < students.length; studentStart += studentsPerPage) {
        const studentEnd = Math.min(studentStart + studentsPerPage, students.length);
        const currentStudents = students.slice(studentStart, studentEnd);

        html += `
          <h2>Dates: ${formatISODateForDisplay(currentDates[0])} to ${formatISODateForDisplay(currentDates[currentDates.length - 1])}</h2>
          <table>
            <tr>
              <th>Roll No</th>
              <th>Name</th>
              ${currentDates.map(date => `<th>${date.substring(5)}</th>`).join('')}
              <th>Present</th>
            </tr>
        `;

        currentStudents.forEach(student => {
          const studentDates = attendanceData[student.rollNumber].slice(dateStart, dateEnd);
          const presentCount = studentDates.filter(mark => mark === 'P').length;
          
          html += `
            <tr>
              <td>${student.rollNumber}</td>
              <td style="text-align: left;">${student.name}</td>
              ${studentDates.map(mark => 
                `<td class="${mark === 'P' ? 'present' : 'absent'}">${mark}</td>`
              ).join('')}
              <td>${presentCount}/${currentDates.length}</td>
            </tr>
          `;
        });

        html += `</table>`;
        
        if (!(studentEnd >= students.length && dateEnd >= dates.length)) {
          html += `<div class="page-break"></div>`;
        }
      }
    }

    html += `
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
