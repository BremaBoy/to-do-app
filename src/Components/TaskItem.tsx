import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Task } from '../Types';
import { Feather } from '@expo/vector-icons';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  darkMode: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onDelete,
  darkMode,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleToggle = () => {
    // Animation on toggle
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle(task.id);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const isOverdue =
  task.dueDate &&
  new Date(task.dueDate).setHours(0, 0, 0, 0) <
    new Date().setHours(0, 0, 0, 0) &&
  !task.completed;
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={[styles.container, darkMode && styles.containerDark]}>
        <TouchableOpacity
          onPress={handleToggle}
          style={styles.checkbox}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View
            style={[
              styles.checkboxCircle,
              task.completed && styles.checkboxCircleCompleted,
              darkMode && !task.completed && styles.checkboxCircleDark,
            ]}
          >
            {task.completed && (
              <Feather name="check" size={16} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              darkMode && styles.titleDark,
              task.completed && styles.titleCompleted,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {task.description && (
            <Text
              style={[
                styles.description,
                darkMode && styles.descriptionDark,
                task.completed && styles.descriptionCompleted,
              ]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          {task.dueDate && (
            <View style={styles.dateContainer}>
              <Feather
                name="calendar"
                size={12}
                color={isOverdue ? '#EF4444' : '#6B7280'}
              />
              <Text
                style={[
                  styles.dateText,
                  isOverdue && styles.dateTextOverdue,
                ]}
              >
                {formatDate(task.dueDate)}
              </Text>
              {isOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueBadgeText}>Overdue</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => onDelete(task.id)}
          style={styles.deleteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="trash-2" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerDark: {
    backgroundColor: '#1F2937',
  },
  checkbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxCircleDark: {
    borderColor: '#6B7280',
  },
  checkboxCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 22,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
    color: '#6B7280',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  descriptionDark: {
    color: '#9CA3AF',
  },
  descriptionCompleted: {
    opacity: 0.6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  dateTextOverdue: {
    color: '#EF4444',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  overdueBadgeText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});