import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BaseScreen } from '../components/BaseScreen';
import { CustomButton } from '../components/CustomButton';
import { CustomTextInput } from '../components/CustomTextInput';
import { getClasses, addClass, renameClass, deleteClass, getStudents, getAttendance, getAttendanceDates, saveAttendance, setStudents } from '../storage/storage';
import { theme } from '../theme';
import LinearGradient from 'react-native-linear-gradient';
import { useToast } from '../components/ToastProvider';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncManager } from '../storage/syncManager';

const USER_SESSION_KEY = '@user_session';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const DashboardScreen = ({ navigation }: any) => {
  const [classes, setClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [editingClass, setEditingClass] = useState<string | null>(null); // target class for rename
  const [renameValue, setRenameValue] = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const toast = useToast();

  useFocusEffect(
    useCallback(() => {
      loadUserSession();
      loadSyncStatus();
      
      // Subscribe to sync status changes
      const unsubscribe = syncManager.onSyncStatusChange((syncing: boolean) => {
        setIsSyncing(syncing);
        if (!syncing) {
          loadSyncStatus(); // Update after sync completes
        }
      });
      
      return unsubscribe;
    }, [])
  );

  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem(USER_SESSION_KEY);
      if (session) {
        const { email } = JSON.parse(session);
        setUserEmail(email);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading session:', error);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const count = await syncManager.getPendingChangesCount();
      const lastSync = await syncManager.getLastSyncTime();
      const online = syncManager.getOnlineStatus();
      
      setPendingCount(count);
      setLastSyncTime(lastSync);
      setIsOnline(online);
    } catch (error) {
      console.error('[Dashboard] Error loading sync status:', error);
    }
  };

  const handleSyncPress = async () => {
    if (!isOnline) {
      toast.showToast({ message: 'You are offline. Sync will happen automatically when online.', type: 'info' });
      return;
    }
    
    if (isSyncing) {
      toast.showToast({ message: 'Sync already in progress...', type: 'info' });
      return;
    }

    try {
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
      await syncManager.syncToCloud();
      toast.showToast({ message: '✅ Sync completed successfully!', type: 'success' });
      await loadClasses(); // Refresh classes after sync
    } catch (error) {
      console.error('[Dashboard] Sync error:', error);
      toast.showToast({ message: '❌ Sync failed. Will retry automatically.', type: 'error' });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(USER_SESSION_KEY);
            await supabase.auth.signOut();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const loadClasses = useCallback(async () => {
    setIsLoadingClasses(true);
    try {
      const loadedClasses = await getClasses();
      setClasses(loadedClasses);
    } catch (error) {
      console.error('[Dashboard] Error loading classes:', error);
      toast.showToast({ message: 'Failed to load classes', type: 'error' });
    } finally {
      setIsLoadingClasses(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [loadClasses])
  );

  const handleAddClass = () => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate('AddClass');
  };

  const handleClassPress = (className: string) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate('Class', { className });
  };

  const handleEditPress = (className: string) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    setEditingClass(className);
    setRenameValue(className);
    setRenameVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!renameValue.trim()) {
      toast.showToast({ message: 'Class name cannot be empty', type: 'warning' });
      return;
    }

    if (renameValue === editingClass) {
      setEditingClass(null);
      setRenameVisible(false);
      return;
    }

    try {
      await renameClass(editingClass!, renameValue.trim());
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      toast.showToast({ message: 'Class renamed', type: 'success' });
      setEditingClass(null);
      setRenameVisible(false);
      await loadClasses();
    } catch (error: any) {
      toast.showToast({ message: error.message ?? 'Rename failed', type: 'error' });
    }
  };

  const handleCancelEdit = () => {
    setEditingClass(null);
    setRenameValue('');
    setRenameVisible(false);
  };

  const handleDeletePress = async (className: string) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    // Backup for undo
    const students = await getStudents(className);
    const dates = await getAttendanceDates(className);
    const attendance = await Promise.all(dates.map(async (d) => ({ date: d, map: await getAttendance(className, d) })));

    await deleteClass(className);
    await loadClasses();
    toast.showToast({
      message: `Deleted "${className}"`,
      type: 'warning',
      actionLabel: 'Undo',
      duration: 4500,
      onActionPress: async () => {
        try {
          await addClass(className);
          await setStudents(className, students);
          if (dates.length) {
            // restore attendance
            await Promise.all(attendance.map(async ({ date, map }) => await saveAttendance(className, date, map)));
          }
          await loadClasses();
          toast.showToast({ message: 'Restored class', type: 'success' });
        } catch (e: any) {
          toast.showToast({ message: e?.message ?? 'Undo failed', type: 'error' });
        }
      },
    });
  };

  const handleContactInfo = () => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate('ContactInfo');
  };

  const handleRefresh = async () => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    await loadClasses();
    ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
    toast.showToast({ message: 'Refreshed', type: 'success' });
  };

  // Track student counts
  const [studentCounts, setStudentCounts] = useState<{[key: string]: number}>({});

  React.useEffect(() => {
    const loadCounts = async () => {
      const counts: {[key: string]: number} = {};
      for (const className of classes) {
        const students = await getStudents(className);
        counts[className] = students.length;
      }
      setStudentCounts(counts);
    };
    loadCounts();
  }, [classes]);

const renderItem = ({ item }: { item: string }) => {
  const count = studentCounts[item] ?? 0;
  return (
    <View style={styles.classCard}>
      {/* Header with actions */}
      <View style={styles.classCardHeader}>
        <View style={styles.classCardTitleRow}>
          <Icon name="class" size={22} color={theme.colors.primary} />
          <Text style={styles.classCardTitle}>{item}</Text>
        </View>
        <View style={styles.classCardActions}>
          <TouchableOpacity
            onPress={() => handleEditPress(item)}
            style={styles.actionIconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="edit" size={18} color={theme.colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeletePress(item)}
            style={styles.actionIconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="delete" size={18} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content - tappable area */}
      <TouchableOpacity
        style={styles.classCardContent}
        onPress={() => handleClassPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.classCardInfo}>
          <Text style={styles.classCardLabel}>Students</Text>
          <View style={styles.classCardBadge}>
            <Icon name="people" size={16} color={theme.colors.primary} />
            <Text style={styles.classCardCount}>{count}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="folder-open" size={80} color={theme.colors.gray400} />
      <Text style={styles.emptyStateText}>No classes yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap the + button below to create your first class
      </Text>
    </View>
  );

  return (
    <BaseScreen>
      <LinearGradient colors={[theme.colors.surface, '#eaf1ff']} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>At-Mark</Text>
          <Text style={styles.subtitle}>
            {userEmail === 'anonymous' ? 'Guest Mode' : userEmail}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={handleSyncPress} 
            style={[styles.syncButton, !isOnline && styles.syncButtonOffline]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <>
                <Icon 
                  name={isOnline ? "cloud-sync" : "cloud-off"} 
                  size={24} 
                  color={isOnline ? theme.colors.primary : theme.colors.textSecondary} 
                />
                {pendingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleRefresh} 
            style={styles.syncButton}
          >
            <Icon name="refresh" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleContactInfo} style={styles.infoButton}>
            <Icon name="info-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.infoButton}>
            <Icon name="logout" size={24} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {isLoadingClasses ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your classes...</Text>
        </View>
      ) : classes.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={classes}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAddClass}>
        <Icon name="add" size={28} color={theme.colors.surface} />
      </TouchableOpacity>

      {/* Rename Modal */}
      <Modal
        transparent
        visible={renameVisible}
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Class</Text>
            <CustomTextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Enter new class name"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton
                title="Save"
                onPress={handleSaveEdit}
                iconName="check"
                size="small"
              />
            </View>
          </View>
        </View>
      </Modal>
    </BaseScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: theme.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  syncButton: {
    padding: theme.spacing.xs,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  syncButtonOffline: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoButton: {
    padding: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  classCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
  },
  classCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classCardTitle: {
    fontSize: theme.sizes.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  classCardActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionIconButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray100,
  },
  classCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  classCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  classCardLabel: {
    fontSize: theme.sizes.sm,
    color: theme.colors.textSecondary,
  },
  classCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  classCardCount: {
    fontSize: theme.sizes.md,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '88%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  modalTitle: {
    fontSize: theme.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: theme.sizes.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  editInput: {
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    marginLeft: theme.spacing.sm,
  },
  editButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.sizes.lg,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
});
