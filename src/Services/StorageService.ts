import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../Types';

const TASKS_KEY = '@tasks';

export const storageService = {
  /**
   * Load all tasks from AsyncStorage
   */
  async loadTasks(): Promise<Task[]> {
    try {
      const tasksJson = await AsyncStorage.getItem(TASKS_KEY);
      if (tasksJson) {
        return JSON.parse(tasksJson);
      }
      return [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  },

  /**
   * Save tasks to AsyncStorage
   */
  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      const tasksJson = JSON.stringify(tasks);
      await AsyncStorage.setItem(TASKS_KEY, tasksJson);
    } catch (error) {
      console.error('Error saving tasks:', error);
      throw error;
    }
  },

  /**
   * Clear all tasks from storage
   */
  async clearTasks(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TASKS_KEY);
    } catch (error) {
      console.error('Error clearing tasks:', error);
      throw error;
    }
  },

  /**
   * Get a single task by ID
   */
  async getTaskById(id: string): Promise<Task | null> {
    try {
      const tasks = await this.loadTasks();
      return tasks.find(task => task.id === id) || null;
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  },
};