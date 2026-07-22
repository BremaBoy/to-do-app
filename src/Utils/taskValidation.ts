import { Task } from '../Types';

export const isSameCalendarDay = (
  timestamp1: number,
  timestamp2: number,
): boolean => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const isDuplicateTask = (
  tasks: Task[],
  title: string,
  dueDate?: number,
): boolean => {
  const normalizedTitle = title.trim().toLowerCase();

  return tasks.some(task => {
    const sameTitle =
      task.title.trim().toLowerCase() === normalizedTitle;

    // If both tasks have no due date,
    // treat them as duplicates.
    if (!dueDate && !task.dueDate) {
      return sameTitle;
    }

    // If one has a due date and the other doesn't,
    // they are not duplicates.
    if (!dueDate || !task.dueDate) {
      return false;
    }

    return (
      sameTitle &&
      isSameCalendarDay(task.dueDate, dueDate)
    );
  });
};