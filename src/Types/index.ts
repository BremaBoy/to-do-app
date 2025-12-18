export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
  dueDate?: number;
}

export type RootStackParamList = {
  TaskList: undefined;
  AddTask: undefined;
};