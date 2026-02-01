import { Message, Activity, Agent, Memory, GraphNode } from '../types';

export const demoMessages: Message[] = [
  {
    id: '1',
    author: 'you',
    content: 'which tables do we need to store episodes? should episodes be tied to a session or independent?',
    timestamp: '18:45'
  },
  {
    id: '2',
    author: 'ling',
    content: 'episodes should be **independent** with a `session_id` foreign key. we need:\n\n• `episodes` - id, session_id, content, timestamp\n• `episode_tags` - for categorization\n• `episode_links` - connect related episodes\n\nthis lets us query across sessions and build the memory graph.',
    timestamp: '18:46'
  },
  {
    id: '3',
    author: 'you',
    content: 'spawn two agents to implement the sqlite schema and api endpoints in parallel',
    timestamp: '18:50'
  },
  {
    id: '4',
    author: 'ling',
    content: 'spawning two ralphs to work in parallel...',
    timestamp: '18:51',
    spawnBadges: [
      { id: '1', name: 'sessions_spawn ralph-router', status: 'done' },
      { id: '2', name: 'sessions_spawn ralph-api', status: 'done' }
    ]
  },
  {
    id: '5',
    author: 'ling',
    content: 'both agents done! **worked for 2.5s**\n\n• ralph-router: built express routes for episodes CRUD\n• ralph-api: implemented sqlite schema with migrations',
    timestamp: '18:52'
  }
];

export const demoActivities: Activity[] = [
  { id: '1', type: 'MAIN', name: '2026-01-31-social-scrape', date: '2026-01-31' },
  { id: '2', type: 'CRON', name: '2026-01-31-openclaw-upgrade', date: '2026-01-31' },
  { id: '3', type: 'MAIN', name: '2026-01-31-bootstrap-limit', date: '2026-01-31' },
  { id: '4', type: 'MAIN', name: '2026-01-31-linkedin-rapidapi', date: '2026-01-31' },
  { id: '5', type: 'CRON', name: '2026-01-30-episode-system', date: '2026-01-30' },
  { id: '6', type: 'MAIN', name: '2026-01-30-lancedb-hardening', date: '2026-01-30' }
];

export const demoAgents: Agent[] = [
  { id: '1', name: 'ralph-router', status: 'run', runtime: '~2m31s', model: 'default' },
  { id: '2', name: 'ralph-api', status: 'run', runtime: '~2m32s', model: 'default' }
];

export const demoMemories: Memory[] = [
  { id: '1', content: 'episodes table schema with foreign keys to sessions', timestamp: '16m ago', relativeTime: '16m ago' },
  { id: '2', content: 'spawn pattern for parallel agent execution', timestamp: '24m ago', relativeTime: '24m ago' },
  { id: '3', content: 'sqlite migration strategy using better-sqlite3', timestamp: '1h ago', relativeTime: '1h ago' },
  { id: '4', content: 'api endpoint design for episode crud operations', timestamp: '2h ago', relativeTime: '2h ago' }
];

export const generateGraphNodes = (count: number): GraphNode[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    x: Math.random() * 400 + 50,
    y: Math.random() * 300 + 50,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radius: 3 + Math.random() * 3
  }));
};
