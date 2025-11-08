import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { pick } from '@react-native-documents/picker';
import XLSX from 'xlsx';
import RNFS from 'react-native-fs';
import { BaseScreen } from '../components/BaseScreen';
import { CustomButton } from '../components/CustomButton';
import { CustomTextInput } from '../components/CustomTextInput';
import { addStudent, getStudents } from '../storage/storage';
import { theme } from '../theme';
import { useToast } from '../components/ToastProvider';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface ImportedStudent {
  name: string;
  rollNumber: string;
  isValid: boolean;
  error?: string;
}

export const AddStudentScreen = ({ route, navigation }: any) => {
  const { className } = route.params;
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [nameError, setNameError] = useState('');
  const [rollError, setRollError] = useState('');
  const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoll, setEditRoll] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [mode, setMode] = useState<'manual' | 'import'>('manual');
  const toast = useToast();

  const handleImportExcel = async () => {
    try {
      setIsImporting(true);
      const result = await pick({
        mode: 'open',
        allowMultiSelection: false,
      });

      if (!result || result.length === 0) {
        return;
      }

      const file = result[0];
      
      // Read file
      const fileContent = await RNFS.readFile(file.uri, 'base64');
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      if (data.length === 0) {
        toast.showToast({ message: 'Excel file is empty', type: 'warning' });
        return;
      }

      // Get existing students to check for duplicates
      const existingStudents = await getStudents(className);
      const existingRolls = new Set(existingStudents.map(s => s.rollNumber.toLowerCase()));
      
      // Parse students (skip header row if it exists)
      const startRow = data[0]?.[0]?.toString().toLowerCase().includes('name') || 
                       data[0]?.[0]?.toString().toLowerCase().includes('student') ? 1 : 0;
      
      const students: ImportedStudent[] = [];
      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        const name = row[0]?.toString().trim() || '';
        const rollNumber = row[1]?.toString().trim() || '';
        
        let isValid = true;
        let error = '';
        
        if (!name) {
          isValid = false;
          error = 'Name is required';
        } else if (!rollNumber) {
          isValid = false;
          error = 'Roll number is required';
        } else if (existingRolls.has(rollNumber.toLowerCase())) {
          isValid = false;
          error = 'Roll number already exists';
        }
        
        students.push({ name, rollNumber, isValid, error });
      }
      
      if (students.length === 0) {
        toast.showToast({ message: 'No valid student data found', type: 'warning' });
        return;
      }
      
      setImportedStudents(students);
      setMode('import');
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      toast.showToast({ 
        message: `Found ${students.length} students`, 
        type: 'success' 
      });
    } catch (error: any) {
      // User cancelled or error occurred
      console.error('[Import] Error:', error);
      if (error.message && !error.message.includes('cancelled')) {
        toast.showToast({ 
          message: 'Failed to import Excel file', 
          type: 'error' 
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleEditImported = (index: number) => {
    const student = importedStudents[index];
    setEditingIndex(index);
    setEditName(student.name);
    setEditRoll(student.rollNumber);
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editRoll.trim()) {
      toast.showToast({ message: 'Name and roll number are required', type: 'warning' });
      return;
    }
    
    const updated = [...importedStudents];
    updated[editingIndex!] = {
      name: editName.trim(),
      rollNumber: editRoll.trim(),
      isValid: true,
      error: undefined,
    };
    setImportedStudents(updated);
    setEditingIndex(null);
    setEditName('');
    setEditRoll('');
  };

  const handleDeleteImported = (index: number) => {
    const updated = importedStudents.filter((_, i) => i !== index);
    setImportedStudents(updated);
    if (updated.length === 0) {
      setMode('manual');
    }
  };

  const handleAddImportedStudents = async () => {
    const validStudents = importedStudents.filter(s => s.isValid);
    if (validStudents.length === 0) {
      toast.showToast({ message: 'No valid students to add', type: 'warning' });
      return;
    }

    try {
      for (const student of validStudents) {
        await addStudent(className, {
          name: student.name,
          rollNumber: student.rollNumber,
        });
      }
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      toast.showToast({ 
        message: `Added ${validStudents.length} students successfully`, 
        type: 'success' 
      });
      navigation.goBack();
    } catch (error: any) {
      toast.showToast({ 
        message: error?.message ?? 'Failed to add students', 
        type: 'error' 
      });
    }
  };

  const handleAddStudent = async () => {
    let hasError = false;

    if (!name.trim()) {
      setNameError('Please enter student name');
      hasError = true;
    }

    if (!rollNumber.trim()) {
      setRollError('Please enter roll number');
      hasError = true;
    }

    if (hasError) return;

    try {
      await addStudent(className, {
        name: name.trim(),
        rollNumber: rollNumber.trim(),
      });
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      toast.showToast({ message: 'Student added', type: 'success' });
      navigation.goBack();
    } catch (error: any) {
      setRollError(error.message);
      toast.showToast({ message: error?.message ?? 'Failed to add student', type: 'error' });
    }
  };

  return (
    <BaseScreen scrollable>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Icon name="person-add" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Add Student</Text>
              <Text style={styles.subtitle}>to {className}</Text>
            </View>
          </View>
        </View>

        {mode === 'manual' ? (
          <>
            <View style={styles.formSection}>
              <CustomTextInput
                label="Student Name"
                placeholder="e.g., John Doe"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setNameError('');
                }}
                error={nameError}
                iconName="person"
              />

              <CustomTextInput
                label="Roll Number"
                placeholder="e.g., CSA001"
                value={rollNumber}
                onChangeText={(text) => {
                  setRollNumber(text);
                  setRollError('');
                }}
                error={rollError}
                iconName="badge"
              />
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <CustomButton
              title={isImporting ? 'Importing...' : 'Import from Excel'}
              onPress={handleImportExcel}
              iconName="upload-file"
              variant="secondary"
              loading={isImporting}
              style={styles.importButton}
            />

            <View style={styles.actions}>
              <CustomButton
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="ghost"
                iconName="close"
                style={styles.button}
              />
              <CustomButton
                title="Add Student"
                onPress={handleAddStudent}
                iconName="person-add"
                style={styles.button}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.importHeader}>
              <Text style={styles.importTitle}>
                {importedStudents.length} Students Found
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setMode('manual');
                  setImportedStudents([]);
                }}
                style={styles.backButton}
              >
                <Icon name="close" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.backButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={importedStudents}
              keyExtractor={(_, index) => index.toString()}
              nestedScrollEnabled
              renderItem={({ item, index }) => (
                <View style={[
                  styles.importedItem,
                  !item.isValid && styles.importedItemInvalid
                ]}>
                  {editingIndex === index ? (
                    <View style={styles.editForm}>
                      <CustomTextInput
                        label="Name"
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Student name"
                      />
                      <CustomTextInput
                        label="Roll Number"
                        value={editRoll}
                        onChangeText={setEditRoll}
                        placeholder="Roll number"
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity 
                          onPress={handleSaveEdit}
                          style={styles.saveEditButton}
                        >
                          <Icon name="check" size={20} color={theme.colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => setEditingIndex(null)}
                          style={styles.cancelEditButton}
                        >
                          <Icon name="close" size={20} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.importedInfo}>
                        <Text style={[
                          styles.importedRoll,
                          !item.isValid && styles.importedTextInvalid
                        ]}>
                          {item.rollNumber}
                        </Text>
                        <Text style={[
                          styles.importedName,
                          !item.isValid && styles.importedTextInvalid
                        ]}>
                          {item.name}
                        </Text>
                        {item.error && (
                          <Text style={styles.importedError}>{item.error}</Text>
                        )}
                      </View>
                      <View style={styles.importedActions}>
                        <TouchableOpacity 
                          onPress={() => handleEditImported(index)}
                          style={styles.importedActionButton}
                        >
                          <Icon name="edit" size={18} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => handleDeleteImported(index)}
                          style={styles.importedActionButton}
                        >
                          <Icon name="delete" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
              style={styles.importedList}
            />

            <View style={styles.actions}>
              <CustomButton
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="ghost"
                iconName="close"
                style={styles.button}
              />
              <CustomButton
                title={`Add ${importedStudents.filter(s => s.isValid).length} Students`}
                onPress={handleAddImportedStudents}
                iconName="person-add"
                style={styles.button}
                disabled={importedStudents.filter(s => s.isValid).length === 0}
              />
            </View>
          </>
        )}
      </View>
    </BaseScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  headerSection: {
    marginBottom: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: theme.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  formSection: {
    marginBottom: theme.spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray300,
  },
  dividerText: {
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  importButton: {
    marginBottom: theme.spacing.md,
  },
  importHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  importTitle: {
    fontSize: theme.sizes.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: theme.spacing.xs,
  },
  backButtonText: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  importedList: {
    maxHeight: 400,
    marginBottom: theme.spacing.md,
  },
  importedItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  importedItemInvalid: {
    borderLeftColor: theme.colors.danger,
    backgroundColor: theme.colors.absentLight,
  },
  importedInfo: {
    flex: 1,
  },
  importedRoll: {
    fontSize: theme.sizes.sm,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  importedName: {
    fontSize: theme.sizes.md,
    color: theme.colors.text,
    marginTop: 2,
  },
  importedTextInvalid: {
    color: theme.colors.danger,
  },
  importedError: {
    fontSize: theme.sizes.xs,
    color: theme.colors.danger,
    marginTop: 4,
  },
  importedActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  importedActionButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray100,
  },
  editForm: {
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  saveEditButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.presentLight,
  },
  cancelEditButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.absentLight,
  },
  actions: {
    flexDirection: 'row',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
  },
});
