import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BaseScreen } from '../components/BaseScreen';
import { CustomButton } from '../components/CustomButton';
import { CustomTextInput } from '../components/CustomTextInput';
import { addClass, setStudents } from '../storage/storage';
import { predefinedBatches, Batch } from '../data/batches';
import { theme } from '../theme';
import { useToast } from '../components/ToastProvider';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const AddClassScreen = ({ navigation }: any) => {
  const [className, setClassName] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleBatchSelect = (batch: Batch) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    setSelectedBatch(batch);
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      setError('Please enter a class name');
      return;
    }

    if (!selectedBatch) {
      toast.showToast({ message: 'Please select a batch', type: 'warning' });
      return;
    }

    try {
      await addClass(className.trim());
      await setStudents(className.trim(), selectedBatch.students);
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      toast.showToast({ message: 'Class created', type: 'success' });
      navigation.goBack();
    } catch (error: any) {
      setError(error.message);
      toast.showToast({ message: error.message ?? 'Failed to create class', type: 'error' });
    }
  };

  const renderBatchItem = ({ item }: { item: Batch }) => {
    const isSelected = selectedBatch?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.batchCard, isSelected && styles.batchCardSelected]}
        onPress={() => handleBatchSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.batchCardHeader}>
          <Text style={[styles.batchName, isSelected && styles.batchNameSelected]}>
            {item.name}
          </Text>
          {isSelected && (
            <Icon name="check-circle" size={24} color={theme.colors.success} />
          )}
        </View>
        <Text style={[styles.batchCount, isSelected && styles.batchCountSelected]}>
          {item.count} students
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <BaseScreen scrollable>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Icon name="add-box" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Create New Class</Text>
          </View>
        </View>
        
        <View style={styles.formSection}>
        <CustomTextInput
          label="Class Name (Subject Name)"
          placeholder="e.g., Data Structures, Mathematics"
          value={className}
          onChangeText={(text) => {
            setClassName(text);
            setError('');
          }}
          error={error}
          iconName="class"
        />
        </View>

        <Text style={styles.sectionTitle}>Select Batch</Text>
        <View style={styles.batchGrid}>
          {predefinedBatches.map((batch) => (
            <View key={batch.id} style={styles.batchItem}>
              {renderBatchItem({ item: batch })}
            </View>
          ))}
        </View>

        {selectedBatch && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>
              Preview: {selectedBatch.count} Students
            </Text>
            <ScrollView style={styles.previewList} nestedScrollEnabled>
              {selectedBatch.students.slice(0, 10).map((student, index) => (
                <View key={student.rollNumber} style={styles.previewItem}>
                  <Text style={styles.previewRoll}>{student.rollNumber}</Text>
                  <Text style={styles.previewName}>{student.name}</Text>
                </View>
              ))}
              {selectedBatch.students.length > 10 && (
                <Text style={styles.previewMore}>
                  ... and {selectedBatch.students.length - 10} more
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        <View style={styles.actions}>
          <CustomButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="ghost"
            iconName="close"
            style={styles.button}
          />
          <CustomButton
            title="Create Class"
            onPress={handleCreateClass}
            iconName="add"
            style={styles.button}
          />
        </View>
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
  title: {
    fontSize: theme.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  formSection: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  batchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  batchItem: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  batchCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    minHeight: 90,
  },
  batchCardSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.presentLight,
  },
  batchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  batchName: {
    fontSize: theme.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  batchNameSelected: {
    color: theme.colors.success,
  },
  batchCount: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
  },
  batchCountSelected: {
    color: theme.colors.success,
  },
  previewContainer: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  previewTitle: {
    fontSize: theme.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  previewList: {
    maxHeight: 200,
  },
  previewItem: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  previewRoll: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
    width: 80,
  },
  previewName: {
    fontSize: theme.sizes.sm,
    color: theme.colors.text,
    flex: 1,
  },
  previewMore: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    textAlign: 'center',
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
