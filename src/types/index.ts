export interface Message {
  id: string;
  author: 'you' | 'blanco';
  content: string;
  timestamp: string;
  spawnBadges?: SpawnBadge[];
  isCode?: boolean;
  workedFor?: string;
  sessionId?: string;
  isoTimestamp?: string;
}

export interface SpawnBadge {
  id: string;
  name: string;
  status: 'done' | 'running' | 'error';
}

export interface Activity {
  id: string;
  type: 'MAIN' | 'CRON';
  name: string;
  date: string;
}

export interface Agent {
  id: string;
  name: string;
  status: 'run' | 'stopped' | 'error';
  runtime: string;
  model: string;
}

export interface Memory {
  id: string;
  content: string;
  timestamp: string;
  relativeTime: string;
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export type TaskBoardStatus = 'inbox' | 'assigned' | 'inProgress' | 'review' | 'done' | 'blocked';

export interface TaskBoardTask {
  id: string;
  title: string;
  assigneeName: string;
}

export type TaskBoardColumns = Record<TaskBoardStatus, TaskBoardTask[]>;

// Re-export from MessageContext for convenience
export type { EnhancedMessage, Conversation, MessageStatus } from '../context/MessageContext';
