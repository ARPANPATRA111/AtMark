import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { BaseScreen } from '../components/BaseScreen';
import { getAttendanceDates, getAttendance, Student } from '../storage/storage';
import { theme } from '../theme';

export const StudentAttendanceScreen = ({ route }: any) => {
  const { className, student } = route.params as { className: string; student: Student };
  
  const [dates, setDates] = React.useState<string[]>([]);
  const [markedDates, setMarkedDates] = React.useState<any>({});
  const [attendedCount, setAttendedCount] = React.useState(0);

  React.useEffect(() => {
    const loadData = async () => {
      const loadedDates = await getAttendanceDates(className);
      setDates(loadedDates);
      
      const marked: any = {};
      let count = 0;
      
      for (const date of loadedDates) {
        const attendance = await getAttendance(className, date);
        const isPresent = attendance[student.rollNumber] === 1;
        
        if (isPresent) {
          count++;
        }
        
        marked[date] = {
          customStyles: {
            container: {
              backgroundColor: isPresent ? theme.colors.present : theme.colors.absent,
              borderRadius: 4,
            },
            text: {
              color: '#FFFFFF',
              fontWeight: 'bold',
            },
          },
        };
      }
      
      setMarkedDates(marked);
      setAttendedCount(count);
    };
    
    loadData();
  }, [className, student.rollNumber]);
  
  const totalClasses = dates.length;
  const percentage = totalClasses > 0 ? ((attendedCount / totalClasses) * 100).toFixed(2) : '0.00';

  return (
    <BaseScreen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.rollNumber}>{student.rollNumber}</Text>
        </View>

        <Calendar
          markingType="custom"
          markedDates={markedDates}
          theme={{
            todayTextColor: theme.colors.primary,
            selectedDayBackgroundColor: theme.colors.primary,
            arrowColor: theme.colors.primary,
            monthTextColor: theme.colors.text,
            textMonthFontWeight: 'bold',
            textMonthFontSize: 18,
          }}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.colors.present }]} />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.colors.absent }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Attendance Summary</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Classes:</Text>
            <Text style={styles.statValue}>{totalClasses}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Classes Attended:</Text>
            <Text style={[styles.statValue, { color: theme.colors.present }]}>
              {attendedCount}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Classes Missed:</Text>
            <Text style={[styles.statValue, { color: theme.colors.absent }]}>
              {totalClasses - attendedCount}
            </Text>
          </View>
          
          <View style={[styles.statRow, styles.percentageRow]}>
            <Text style={styles.percentageLabel}>Attendance Percentage:</Text>
            <Text style={styles.percentageValue}>{percentage}%</Text>
          </View>
        </View>
      </View>
    </BaseScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  studentName: {
    fontSize: theme.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  rollNumber: {
    fontSize: theme.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  legendText: {
    fontSize: theme.sizes.sm,
    color: theme.colors.text,
  },
  statsContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadows.md,
  },
  statsTitle: {
    fontSize: theme.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  statLabel: {
    fontSize: theme.sizes.md,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: theme.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  percentageRow: {
    borderBottomWidth: 0,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary,
  },
  percentageLabel: {
    fontSize: theme.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  percentageValue: {
    fontSize: theme.sizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});
