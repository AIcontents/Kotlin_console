/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, Priority, SearchCriteria, SortField, SortOrder } from './types';

export class TaskRepository {
  private tasks: Task[] = [];
  private nextId = 1;

  constructor(initialTasks?: Task[]) {
    if (initialTasks) {
      this.tasks = initialTasks;
      this.nextId = Math.max(0, ...initialTasks.map(t => t.id)) + 1;
    }
  }

  getAll(): Task[] {
    return [...this.tasks];
  }

  add(taskData: Omit<Task, 'id' | 'createdAt'>): Task {
    const task: Task = {
      ...taskData,
      id: this.nextId++,
      createdAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    return task;
  }

  update(id: number, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.tasks[index] = {
      ...this.tasks[index],
      ...updates,
    };
    return this.tasks[index];
  }

  delete(id: number): boolean {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== id);
    return this.tasks.length < initialLength;
  }

  deleteMultiple(ids: number[]) {
    this.tasks = this.tasks.filter(t => !ids.includes(t.id));
  }

  search(criteria: SearchCriteria): Task[] {
    return this.tasks.filter(task => {
      let matches = true;
      if (criteria.title && !task.title.toLowerCase().includes(criteria.title.toLowerCase())) {
        matches = false;
      }
      if (criteria.priority !== undefined && task.priority !== criteria.priority) {
        matches = false;
      }
      if (criteria.isDone !== undefined && task.isDone !== criteria.isDone) {
        matches = false;
      }
      return matches;
    });
  }

  sort(field: SortField, order: SortOrder): Task[] {
    return [...this.tasks].sort((a, b) => {
      const valA = a[field];
      const valB = b[field];

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  toJSON(): string {
    return JSON.stringify(this.tasks, null, 2);
  }

  loadFromJSON(json: string) {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        this.tasks = data;
        this.nextId = Math.max(0, ...this.tasks.map(t => t.id)) + 1;
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
      throw new Error('Invalid JSON format');
    }
  }

  // Helper for batch status update
  markDone(ids: number[], isDone: boolean) {
    this.tasks = this.tasks.map(t => ids.includes(t.id) ? { ...t, isDone } : t);
  }
}
