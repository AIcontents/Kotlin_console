/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Priority {
  LOW = 1,
  MEDIUM_LOW = 2,
  MEDIUM = 3,
  MEDIUM_HIGH = 4,
  HIGH = 5,
}

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  isDone: boolean;
  createdAt: string;
}

export type SortField = 'id' | 'title' | 'priority' | 'createdAt' | 'isDone';
export type SortOrder = 'asc' | 'desc';

export interface SearchCriteria {
  title?: string;
  priority?: Priority;
  isDone?: boolean;
}
