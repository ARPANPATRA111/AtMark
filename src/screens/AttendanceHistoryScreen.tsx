import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BaseScreen } from '../components/BaseScreen';
import LinearGradient from 'react-native-linear-gradient';
import { getStudents, getAttendance, StudentData } from '../storage/storage';
import { toISODate, formatDisplayDate } from '../utils/date';
import { theme } from '../theme';

export const AttendanceHistoryScreen = ({ route }: any) => {
  const { className } = route.params;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendance, setAttendance] = useState<{[key: string]: number}>({});
  const [filterMode, setFilterMode] = useState<'present' | 'absent'>('present');

  React.useEffect(() => {
    const loadData = async () => {
      const dateISO = toISODate(selectedDate);
      const loadedStudents = await getStudents(className);
      const loadedAttendance = await getAttendance(className, dateISO);
      setStudents(loadedStudents);
      setAttendance(loadedAttendance);
    };
    loadData();
  }, [className, selectedDate]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const dateISO = toISODate(selectedDate);
  
  // Filter students based on mode
  const presentStudents = students.filter(
    student => attendance[student.rollNumber] === 1
  );
  const absentStudents = students.filter(
    student => attendance[student.rollNumber] !== 1
  );
  
  const displayedStudents = filterMode === 'present' ? presentStudents : absentStudents;
  const toggleFilter = () => {
    setFilterMode(filterMode === 'present' ? 'absent' : 'present');
  };

  const renderStudentItem = ({ item }: { item: StudentData }) => {
    const isPresent = filterMode === 'present';
    return (
      <View style={styles.studentItem}>
        <Icon 
          name={isPresent ? "check-circle" : "cancel"} 
          size={24} 
          color={isPresent ? theme.colors.present : theme.colors.absent} 
        />
        <View style={styles.studentInfo}>
          <Text style={styles.rollNumber}>{item.rollNumber}</Text>
          <Text style={styles.studentName}>{item.name}</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="event-busy" size={80} color={theme.colors.gray400} />
      <Text style={styles.emptyStateText}>No attendance record</Text>
      <Text style={styles.emptyStateSubtext}>
        No attendance was taken on this date
      </Text>
    </View>
  );

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
        <View style={[styles.statCard, filterMode === 'present' ? styles.statCardPresent : styles.statCardAbsent]}>
          <Icon 
            name={filterMode === 'present' ? "people" : "person-off"} 
            size={32} 
            color={filterMode === 'present' ? theme.colors.present : theme.colors.absent} 
          />
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>
              {filterMode === 'present' ? presentStudents.length : absentStudents.length} / {students.length}
            </Text>
            <Text style={styles.statLabel}>{filterMode === 'present' ? 'Present' : 'Absent'}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={toggleFilter}
          activeOpacity={0.7}
        >
          <Icon name="swap-vert" size={20} color={theme.colors.primary} />
          <Text style={styles.filterButtonText}>
            Show {filterMode === 'present' ? 'Absent' : 'Present'}
          </Text>
        </TouchableOpacity>
      </View>

      {displayedStudents.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={displayedStudents}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.rollNumber}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    padding: theme.spacing.md,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.presentLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.present,
  },
  statCardPresent: {
    borderLeftColor: theme.colors.present,
    backgroundColor: theme.colors.presentLight,
  },
  statCardAbsent: {
    borderLeftColor: theme.colors.absent,
    backgroundColor: theme.colors.absentLight,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  filterButtonText: {
    fontSize: theme.sizes.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  statInfo: {
    marginLeft: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.present,
  },
  statLabel: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  studentInfo: {
    marginLeft: theme.spacing.md,
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
