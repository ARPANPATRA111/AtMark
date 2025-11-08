import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BaseScreen } from '../components/BaseScreen';
import { CustomButton } from '../components/CustomButton';
import LinearGradient from 'react-native-linear-gradient';
import {
  getStudents,
  getAttendance,
  saveAttendance,
  deleteAttendance,
  StudentData,
  AttendanceMap,
} from '../storage/storage';
import { toISODate, formatDisplayDate } from '../utils/date';
import { theme } from '../theme';
import { useToast } from '../components/ToastProvider';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const AttendanceScreen = ({ route, navigation }: any) => {
  const { className } = route.params;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [presentMap, setPresentMap] = useState<AttendanceMap>({});
  const toast = useToast();

  const loadData = useCallback(async () => {
    const loadedStudents = await getStudents(className);
    const sorted = [...loadedStudents].sort((a, b) => a.name.localeCompare(b.name));
    setStudents(sorted);

    // Load existing attendance for selected date
    const dateISO = toISODate(selectedDate);
    const attendance = await getAttendance(className, dateISO);
    setPresentMap(attendance);
  }, [className, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const togglePresence = (rollNumber: string) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    setPresentMap(prev => {
      const newMap = { ...prev };
      if (newMap[rollNumber]) {
        delete newMap[rollNumber];
      } else {
        newMap[rollNumber] = 1;
      }
      return newMap;
    });
  };

  const handleSave = async () => {
    const dateISO = toISODate(selectedDate);
    await saveAttendance(className, dateISO, presentMap);
    ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
    toast.showToast({ message: 'Attendance saved', type: 'success' });
    // Navigate back after saving
    setTimeout(() => navigation.goBack(), 300);
  };

  const handleDelete = async () => {
    const previous = { ...presentMap };
    const dateISO = toISODate(selectedDate);
    await deleteAttendance(className, dateISO);
    setPresentMap({});
    ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
    toast.showToast({
      message: 'Attendance deleted',
      type: 'warning',
      actionLabel: 'Undo',
      onActionPress: async () => {
        await saveAttendance(className, dateISO, previous);
        setPresentMap(previous);
        toast.showToast({ message: 'Restored', type: 'success' });
      },
    });
    // Navigate back after deleting
    setTimeout(() => navigation.goBack(), 300);
  };

  const presentCount = Object.keys(presentMap).length;
  const totalCount = students.length;
  const absentCount = totalCount - presentCount;

  const renderStudentItem = ({ item }: { item: StudentData }) => {
    const isPresent = presentMap[item.rollNumber] === 1;

    return (
      <TouchableOpacity
        style={[styles.studentItem, isPresent && styles.studentItemPresent]}
        onPress={() => togglePresence(item.rollNumber)}
        activeOpacity={0.7}
      >
        <View style={styles.studentInfo}>
          <Text style={[styles.rollNumber, isPresent && styles.textPresent]}>
            {item.rollNumber}
          </Text>
          <Text style={[styles.studentName, isPresent && styles.textPresent]}>
            {item.name}
          </Text>
        </View>
        <Icon
          name={isPresent ? 'check-circle' : 'radio-button-unchecked'}
          size={28}
          color={isPresent ? theme.colors.present : theme.colors.gray400}
        />
      </TouchableOpacity>
    );
  };

  return (
    <BaseScreen>
      <LinearGradient colors={[theme.colors.surface, '#f7f9ff']} style={styles.header}>
        <Text style={styles.className}>{className}</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="calendar-today" size={20} color={theme.colors.primary} />
          <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardTotal]}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.statCardPresent]}>
          <Text style={[styles.statValue, styles.statValuePresent]}>
            {presentCount}
          </Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAbsent]}>
          <Text style={[styles.statValue, styles.statValueAbsent]}>
            {absentCount}
          </Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
      </View>

      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.rollNumber}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.actions}>
        <CustomButton
          title="Delete"
          onPress={handleDelete}
          iconName="delete"
          variant="danger"
          style={styles.button}
        />
        <CustomButton
          title="Save Attendance"
          onPress={handleSave}
          iconName="save"
          variant="secondary"
          style={styles.buttonLarge}
        />
      </View>
    </BaseScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  className: {
    fontSize: theme.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: theme.sizes.md,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statCardTotal: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  statCardPresent: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.present,
  },
  statCardAbsent: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.absent,
  },
  statValue: {
    fontSize: theme.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statValuePresent: {
    color: theme.colors.present,
  },
  statValueAbsent: {
    color: theme.colors.absent,
  },
  statLabel: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  studentItemPresent: {
    backgroundColor: theme.colors.presentLight,
    borderColor: theme.colors.present,
  },
  studentInfo: {
    flex: 1,
  },
  rollNumber: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  studentName: {
    fontSize: theme.sizes.md,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  textPresent: {
    color: theme.colors.present,
  },
  actions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
  },
  buttonLarge: {
    flex: 2,
  },
});
