import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Task, RootStackParamList } from '../Types';
import { storageService } from '../Services/StorageService';
import { TaskItem } from '../Components/TaskItem';
import { FloatingActionButton } from '../Components/FloatingActionButton';
import { VoiceInputModal } from '../Components/VoiceInputModal';

import { ThemeContext, useTheme } from '../Context/ThemeContext';

type TaskListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskList'>;

interface Props {
  navigation: TaskListScreenNavigationProp;
}

export const TaskListScreen: React.FC<Props> = ({ navigation }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'noDueDate'>('all');
  const { darkMode, toggleTheme } = useTheme();
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  const loadTasks = async () => {
    try {
      const loadedTasks = await storageService.loadTasks();
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    }
  };

  const saveTasks = async (updatedTasks: Task[]) => {
    try {
      await storageService.saveTasks(updatedTasks);
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
      Alert.alert('Error', 'Failed to save tasks');
    }
  };

  const toggleTask = (id: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks(updatedTasks);
  };

  const deleteTask = (id: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedTasks = tasks.filter(task => task.id !== id);
            saveTasks(updatedTasks);
          },
        },
      ]
    );
  };

  const clearAllTasks = () => {
    Alert.alert(
      'Clear All Tasks',
      'Are you sure you want to delete all tasks? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => saveTasks([]),
        },
      ]
    );
  };

  const handleTasksCreated = async (newTasks: string[]) => {
    if (newTasks.length === 0) return;

    try {
      const tasksToAdd: Task[] = newTasks.map((title, index) => ({
        id: (Date.now() + index).toString(),
        title: title,
        completed: false,
        createdAt: Date.now() + index,
      }));

      const updatedTasks = [...tasks, ...tasksToAdd];
      await saveTasks(updatedTasks);
    } catch (error) {
      console.error('Error adding voice tasks:', error);
      Alert.alert('Error', 'Failed to save voice tasks');
    }
  };

  // Check if a date is today
  const isToday = (timestamp: number): boolean => {
    const today = new Date();
    const date = new Date(timestamp);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if a date is in the future
  const isFuture = (timestamp: number): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime() > today.getTime();
  };

  // Check if a date is overdue
  const isOverdue = (timestamp: number): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  };

  const getFilteredTasks = () => {
    // First, apply search filter
    let filtered = tasks.filter(
      task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Then apply date filter
    switch (filterBy) {
      case 'today':
        // Show only tasks due today
        filtered = filtered.filter(task => task.dueDate && isToday(task.dueDate));
        break;
      
      case 'upcoming':
        // Show tasks due in the future (not today, not overdue)
        filtered = filtered.filter(task => task.dueDate && isFuture(task.dueDate) && !isToday(task.dueDate));
        break;
      
      case 'overdue':
        // Show tasks that are overdue and not completed
        filtered = filtered.filter(task => task.dueDate && isOverdue(task.dueDate) && !task.completed);
        break;
      
      case 'noDueDate':
        // Show tasks without due dates
        filtered = filtered.filter(task => !task.dueDate);
        break;
      
      case 'all':
      default:
        // Show all tasks
        break;
    }

    // Sort by due date (closest first), then by creation date
    filtered.sort((a, b) => {
      // If both have due dates, sort by due date
      if (a.dueDate && b.dueDate) {
        return a.dueDate - b.dueDate;
      }
      // Tasks with due dates come first
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      // If neither has due date, sort by creation date (newest first)
      return b.createdAt - a.createdAt;
    });

    return filtered;
  };

  const filteredTasks = getFilteredTasks();
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;
  const overdueCount = tasks.filter(
    t => t.dueDate && isOverdue(t.dueDate) && !t.completed
  ).length;
  const todayCount = tasks.filter(t => t.dueDate && isToday(t.dueDate)).length;
  const upcomingCount = tasks.filter(t => t.dueDate && isFuture(t.dueDate) && !isToday(t.dueDate)).length;

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
        <View style={styles.headerLeft}>
          <Text style={[styles.title, darkMode && styles.titleDark]}>
            My Tasks
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, styles.completedNumber]}>
                {completedCount}
              </Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            {overdueCount > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, styles.overdueNumber]}>
                    {overdueCount}
                  </Text>
                  <Text style={styles.statLabel}>Overdue</Text>
                </View>
              </>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.headerButton}
          >
            <Feather
              name={darkMode ? 'sun' : 'moon'}
              size={22}
              color={darkMode ? '#F9FAFB' : '#111827'}
            />
          </TouchableOpacity>
          {tasks.length > 0 && (
            <TouchableOpacity
              onPress={clearAllTasks}
              style={styles.headerButton}
            >
              <Feather name="trash-2" size={22} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, darkMode && styles.searchBarDark]}>
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={[styles.searchInput, darkMode && styles.searchInputDark]}
            placeholder="Search tasks..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterBy === 'all' && styles.filterButtonActive,
            darkMode && filterBy !== 'all' && styles.filterButtonDark,
          ]}
          onPress={() => setFilterBy('all')}
          activeOpacity={0.7}
        >
          <Feather
            name="list"
            size={14}
            color={filterBy === 'all' ? '#FFFFFF' : darkMode ? '#9CA3AF' : '#6B7280'}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterBy === 'all' && styles.filterButtonTextActive,
              darkMode && filterBy !== 'all' && styles.filterButtonTextDark,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterBy === 'today' && styles.filterButtonActive,
            darkMode && filterBy !== 'today' && styles.filterButtonDark,
          ]}
          onPress={() => setFilterBy('today')}
          activeOpacity={0.7}
        >
          <Feather
            name="calendar"
            size={14}
            color={filterBy === 'today' ? '#FFFFFF' : darkMode ? '#9CA3AF' : '#6B7280'}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterBy === 'today' && styles.filterButtonTextActive,
              darkMode && filterBy !== 'today' && styles.filterButtonTextDark,
            ]}
          >
            Today ({todayCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterBy === 'upcoming' && styles.filterButtonActive,
            darkMode && filterBy !== 'upcoming' && styles.filterButtonDark,
          ]}
          onPress={() => setFilterBy('upcoming')}
          activeOpacity={0.7}
        >
          <Feather
            name="clock"
            size={14}
            color={filterBy === 'upcoming' ? '#FFFFFF' : darkMode ? '#9CA3AF' : '#6B7280'}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterBy === 'upcoming' && styles.filterButtonTextActive,
              darkMode && filterBy !== 'upcoming' && styles.filterButtonTextDark,
            ]}
          >
            Upcoming ({upcomingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterBy === 'overdue' && styles.filterButtonActive,
            darkMode && filterBy !== 'overdue' && styles.filterButtonDark,
          ]}
          onPress={() => setFilterBy('overdue')}
          activeOpacity={0.7}
        >
          <Feather
            name="alert-circle"
            size={14}
            color={filterBy === 'overdue' ? '#FFFFFF' : darkMode ? '#9CA3AF' : '#6B7280'}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterBy === 'overdue' && styles.filterButtonTextActive,
              darkMode && filterBy !== 'overdue' && styles.filterButtonTextDark,
            ]}
          >
            Overdue ({overdueCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather
              name={searchQuery ? 'search' : 'check-circle'}
              size={64}
              color={darkMode ? '#374151' : '#D1D5DB'}
            />
          </View>
          <Text style={[styles.emptyText, darkMode && styles.emptyTextDark]}>
            {searchQuery
              ? 'No tasks found'
              : filterBy !== 'all'
              ? `No ${filterBy} tasks`
              : tasks.length === 0
              ? 'No tasks yet'
              : 'All done! 🎉'}
          </Text>
          <Text style={[styles.emptySubtext, darkMode && styles.emptySubtextDark]}>
            {searchQuery
              ? 'Try a different search term'
              : filterBy !== 'all'
              ? 'Try selecting a different filter'
              : tasks.length === 0
              ? 'Tap the + button to add your first task'
              : 'You\'ve completed all your tasks'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={toggleTask}
              onDelete={deleteTask}
              darkMode={darkMode}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <FloatingActionButton
          icon="mic"
          onPress={() => setVoiceModalVisible(true)}
          color="#8B5CF6"
          style={{ marginBottom: 16 }}
        />
        <FloatingActionButton
          icon="plus"
          onPress={() => navigation.navigate('AddTask')}
          color="#3B82F6"
        />
      </View>

      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onTasksCreated={handleTasksCreated}
        darkMode={darkMode}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  completedNumber: {
    color: '#10B981',
  },
  overdueNumber: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBarDark: {
    backgroundColor: '#1F2937',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    paddingVertical: 12,
    color: '#111827',
  },
  searchInputDark: {
    color: '#F9FAFB',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterButtonTextDark: {
    color: '#9CA3AF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptyTextDark: {
    color: '#D1D5DB',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptySubtextDark: {
    color: '#6B7280',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});