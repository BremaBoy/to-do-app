import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { Task, RootStackParamList } from '../Types';
import { storageService } from '../Services/StorageService';
import { useTheme } from '../Context/ThemeContext';

type AddTaskScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddTask'>;

interface Props {
  navigation: AddTaskScreenNavigationProp;
}

export const AddTaskScreen: React.FC<Props> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { darkMode } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTask = async () => {
  // Validation
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    Alert.alert('Empty Title', 'Please enter a task title');
    return;
  }

  if (trimmedTitle.length < 3) {
    Alert.alert(
      'Title Too Short',
      'Task title must be at least 3 characters',
    );
    return;
  }

  if (trimmedTitle.length > 100) {
    Alert.alert(
      'Title Too Long',
      'Task title must be less than 100 characters',
    );
    return;
  }

  setIsSubmitting(true);

  try {
    // Load existing tasks
    const existingTasks = await storageService.loadTasks();

    // Normalize the title for duplicate comparison
    const normalizedTitle = trimmedTitle.toLowerCase();

    // Check if a task with the same title already exists
    // for the same calendar day
    const isDuplicate = existingTasks.some(task => {
      const sameTitle =
        task.title.trim().toLowerCase() === normalizedTitle;

      // Both tasks have no due date
      if (!dueDate && !task.dueDate) {
        return sameTitle;
      }

      // One task has a due date and the other doesn't
      if (!dueDate || !task.dueDate) {
        return false;
      }

      // Compare calendar dates instead of exact timestamps
      const newTaskDate = new Date(dueDate);
      const existingTaskDate = new Date(task.dueDate);

      const sameDay =
        newTaskDate.getFullYear() === existingTaskDate.getFullYear() &&
        newTaskDate.getMonth() === existingTaskDate.getMonth() &&
        newTaskDate.getDate() === existingTaskDate.getDate();

      return sameTitle && sameDay;
    });

    if (isDuplicate) {
      Alert.alert(
        'Duplicate Task',
        `You already have a task called "${trimmedTitle}" for this date.`,
      );
      setIsSubmitting(false);
      return;
    }

    // Create new task
    const newTask: Task = {
      id: Date.now().toString(),
      title: trimmedTitle,
      description: description.trim() || undefined,
      completed: false,
      createdAt: Date.now(),
      dueDate: dueDate?.getTime(),
    };

    // Save task
    await storageService.saveTasks([...existingTasks, newTask]);

    // Navigate back
    navigation.goBack();
  } catch (error) {
    console.error('Error adding task:', error);
    Alert.alert(
      'Error',
      'Failed to add task. Please try again.',
    );
    setIsSubmitting(false);
  }
};

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const clearDueDate = () => {
    setDueDate(undefined);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateShort = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (compareDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return formatDate(date);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, darkMode && styles.containerDark]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={darkMode ? '#1F2937' : '#FFFFFF'}
      />

      {/* Header */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather
            name="arrow-left"
            size={24}
            color={darkMode ? '#F9FAFB' : '#111827'}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>
          New Task
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Feather name="edit-3" size={16} color="#6B7280" />
              <Text style={[styles.label, darkMode && styles.labelDark]}>
                Title *
              </Text>
            </View>
            <TextInput
              style={[
                styles.input,
                darkMode && styles.inputDark,
                title.length > 0 && styles.inputFocused,
              ]}
              placeholder="e.g., Buy groceries"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={100}
            />
            <Text style={styles.characterCount}>
              {title.length}/100
            </Text>
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Feather name="file-text" size={16} color="#6B7280" />
              <Text style={[styles.label, darkMode && styles.labelDark]}>
                Description
              </Text>
              <Text style={styles.optionalLabel}>(Optional)</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                darkMode && styles.inputDark,
                description.length > 0 && styles.inputFocused,
              ]}
              placeholder="Add more details about your task..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            {description.length > 0 && (
              <Text style={styles.characterCount}>
                {description.length}/500
              </Text>
            )}
          </View>

          {/* Due Date Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Feather name="calendar" size={16} color="#6B7280" />
              <Text style={[styles.label, darkMode && styles.labelDark]}>
                Due Date
              </Text>
              <Text style={styles.optionalLabel}>(Optional)</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.dateButton,
                darkMode && styles.dateButtonDark,
                dueDate && styles.dateButtonSelected,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateButtonContent}>
                <Feather
                  name="calendar"
                  size={20}
                  color={dueDate ? '#3B82F6' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.dateButtonText,
                    darkMode && styles.dateButtonTextDark,
                    dueDate && styles.dateButtonTextSelected,
                  ]}
                >
                  {dueDate ? formatDateShort(dueDate) : 'Select due date'}
                </Text>
              </View>
              {dueDate && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    clearDueDate();
                  }}
                  style={styles.clearDateButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {dueDate && (
              <View style={styles.dateInfoContainer}>
                <Feather name="info" size={14} color="#6B7280" />
                <Text style={styles.dateInfoText}>
                  {formatDate(dueDate)}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Date Shortcuts */}
          <View style={styles.quickDatesContainer}>
            <Text style={[styles.quickDatesLabel, darkMode && styles.labelDark]}>
              Quick Select:
            </Text>
            <View style={styles.quickDatesButtons}>
              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const today = new Date();
                  setDueDate(today);
                }}
              >
                <Text style={styles.quickDateButtonText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setDueDate(tomorrow);
                }}
              >
                <Text style={styles.quickDateButtonText}>Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setDueDate(nextWeek);
                }}
              >
                <Text style={styles.quickDateButtonText}>Next Week</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              textColor={darkMode ? '#FFFFFF' : '#000000'}
            />
          )}

          {/* Task Preview */}
          {title.trim().length > 0 && (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Feather name="eye" size={16} color="#6B7280" />
                <Text style={[styles.previewLabel, darkMode && styles.labelDark]}>
                  Preview
                </Text>
              </View>
              <View style={[styles.previewCard, darkMode && styles.previewCardDark]}>
                <View style={styles.previewCheckbox}>
                  <Feather name="circle" size={20} color="#D1D5DB" />
                </View>
                <View style={styles.previewContent}>
                  <Text style={[styles.previewTitle, darkMode && styles.previewTitleDark]}>
                    {title}
                  </Text>
                  {description && (
                    <Text
                      style={[styles.previewDescription, darkMode && styles.previewDescriptionDark]}
                      numberOfLines={2}
                    >
                      {description}
                    </Text>
                  )}
                  {dueDate && (
                    <View style={styles.previewDateContainer}>
                      <Feather name="calendar" size={12} color="#6B7280" />
                      <Text style={styles.previewDateText}>
                        {formatDateShort(dueDate)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer with Action Buttons */}
        <View style={[styles.footer, darkMode && styles.footerDark]}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.addButton,
              (!title.trim() || isSubmitting) && styles.addButtonDisabled,
            ]}
            onPress={handleAddTask}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.addButtonText}>Adding...</Text>
            ) : (
              <>
                <Feather name="plus-circle" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Task</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: 8,
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerTitleDark: {
    color: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  labelDark: {
    color: '#D1D5DB',
  },
  optionalLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  inputDark: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    borderColor: '#374151',
  },
  inputFocused: {
    borderColor: '#3B82F6',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  dateButtonDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  dateButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  dateButtonTextDark: {
    color: '#9CA3AF',
  },
  dateButtonTextSelected: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  clearDateButton: {
    padding: 4,
  },
  dateInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 4,
  },
  dateInfoText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  quickDatesContainer: {
    marginBottom: 24,
  },
  quickDatesLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  quickDatesButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickDateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  previewContainer: {
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewCardDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  previewCheckbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  previewTitleDark: {
    color: '#F9FAFB',
  },
  previewDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  previewDescriptionDark: {
    color: '#9CA3AF',
  },
  previewDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  previewDateText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  footerDark: {
    backgroundColor: '#1F2937',
    borderTopColor: '#374151',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  addButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});