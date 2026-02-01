const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ClawdbotIPC } = require('./api/ipc');

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize IPC for Clawdbot communication
const ipc = new ClawdbotIPC();

const PORT = process.env.PORT || 3001;

// WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Connected clients
const clients = new Set();

// Broadcast to all clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  // Send initial status
  ws.send(JSON.stringify({
    type: 'status',
    data: { connected: true, timestamp: new Date().toISOString() }
  }));
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(data, ws);
    } catch (e) {
      console.error('Invalid WebSocket message:', e);
    }
  });
});

function handleWebSocketMessage(data, ws) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    case 'subscribe':
      // Client subscribing to specific updates
      ws.subscriptions = data.channels || [];
      break;
    case 'chat':
      // Real-time chat message
      handleRealtimeChat(data.message, ws);
      break;
  }
}

async function handleRealtimeChat(message, ws) {
  const startTime = performance.now();
  
  // Broadcast user message to all clients
  broadcast({
    type: 'chat',
    data: {
      author: 'you',
      content: message,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }
  });
  
  // Try IPC connection to Clawdbot first
  ipc.sendMessage(message, (response) => {
    const endTime = performance.now();
    const workedFor = `${((endTime - startTime) / 1000).toFixed(1)}s`;
    
    broadcast({
      type: 'chat',
      data: {
        author: 'blanco',
        content: response.content || response.error || 'No response',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        workedFor
      }
    });
  });
}

// Fallback local processing (if IPC fails)
async function handleLocalChat(message, ws) {
  const startTime = performance.now();
  
  // Process command locally
  let response = '';
  let workedFor = '';
  
  if (message.includes('search') || message.includes('find')) {
    const query = message.replace(/search|find/gi, '').trim();
    const results = kgAPI.search(query, { limit: 5 });
    const endTime = performance.now();
    workedFor = `${((endTime - startTime) / 1000).toFixed(1)}s`;
    response = `Found ${results.results?.length || 0} memories for "${query}"`;
  } else if (message.includes('status')) {
    const agents = kgAPI.getActiveAgents();
    const endTime = performance.now();
    workedFor = `${((endTime - startTime) / 1000).toFixed(1)}s`;
    response = `I'm running ${agents.length} agents:\n${agents.map(a => `• ${a.name}`).join('\n')}`;
  } else if (message.includes('hello') || message.includes('hi')) {
    const endTime = performance.now();
    workedFor = `${((endTime - startTime) / 1000).toFixed(1)}s`;
    response = "Hey! I'm Blanco. This is my dashboard - you can see my memories, agents, and activity here. What would you like to know?";
  } else if (message.includes('memory') || message.includes('remember')) {
    const memories = kgAPI.getRecentMemories(3);
    const endTime = performance.now();
    workedFor = `${((endTime - startTime) / 1000).toFixed(1)}s`;
    response = `My recent memories:\n${memories.map(m => `• ${m.keyPoints[0]}`).join('\n')}`;
  } else {
    const endTime = performance.now();
    workedFor = `${((endTime - startTime) / 1000).toFixed(1)}s`;
    response = "I can search my memories, show you my active agents, or tell you what I'm working on. Try 'search [query]', 'status', or 'memory'";
  }
  
  // Send response
  broadcast({
    type: 'chat',
    data: {
      author: 'blanco',
      content: response,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      workedFor
    }
  });
}

// Auto-broadcast updates
setInterval(() => {
  const activities = kgAPI.getActivityFeed();
  const agents = kgAPI.getActiveAgents();
  
  broadcast({
    type: 'update',
    data: {
      activities: activities.slice(0, 5),
      agents: agents.slice(0, 5),
      timestamp: Date.now()
    }
  });
}, 5000); // Every 5 seconds

// [Rest of the KnowledgeGraphAPI class and routes from previous server.js]
class KnowledgeGraphAPI {
  constructor() {
    this.collection = 'life';
  }

  search(query, options = {}) {
    try {
      const limit = options.limit || 10;
      const cmd = `qmd search "${query.replace(/"/g, '\\"')}" -c ${this.collection} -n ${limit} --json`;
      const result = execSync(cmd, { encoding: 'utf-8', cwd: process.env.HOME });
      return JSON.parse(result);
    } catch (error) {
      console.error('Search error:', error.message);
      return { results: [] };
    }
  }

  listEntities() {
    try {
      const cmd = `qmd ls ${this.collection} --json`;
      const result = execSync(cmd, { encoding: 'utf-8', cwd: process.env.HOME });
      return JSON.parse(result);
    } catch (error) {
      console.error('List error:', error.message);
      return { entities: [] };
    }
  }

  getRecentMemories(days = 7) {
    const memories = [];
    const memoryDir = path.join(process.env.HOME, 'clawd', 'memory');
    
    try {
      const files = fs.readdirSync(memoryDir)
        .filter(f => f.match(/^\d{4}-\d{2}-\d{2}/))
        .sort()
        .reverse()
        .slice(0, days);
      
      for (const file of files) {
        const content = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
        const date = file.replace('.md', '');
        
        const lines = content.split('\n');
        const keyPoints = lines
          .filter(line => line.match(/^(#{1,3}\s|[-*]\s)/))
          .slice(0, 10)
          .map(line => line.replace(/^(#{1,3}\s|[-*]\s)/, '').trim());
        
        memories.push({
          id: date,
          date,
          content: keyPoints[0] || 'Session memory',
          keyPoints,
          fullContent: content,
          relativeTime: this.getRelativeTime(date)
        });
      }
    } catch (error) {
      console.error('Memory read error:', error.message);
    }
    
    return memories;
  }

  getRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  getActivityFeed() {
    const activities = [];
    
    try {
      const gitLog = execSync(
        'git log --all --since="7 days ago" --pretty=format:"%h|%s|%ai" --name-only',
        { encoding: 'utf-8', cwd: path.join(process.env.HOME, 'clawd') }
      );
      
      const commits = gitLog.split('\n\n').slice(0, 20);
      for (const commit of commits) {
        const lines = commit.split('\n');
        const [hash, message, date] = lines[0].split('|');
        
        activities.push({
          id: hash,
          type: message?.includes('cron') ? 'CRON' : 'MAIN',
          name: message || 'Update',
          date: date ? date.split(' ')[0] : new Date().toISOString().split('T')[0]
        });
      }
    } catch (e) {}
    
    const memories = this.getRecentMemories(7);
    for (const memory of memories) {
      activities.push({
        id: `mem-${memory.date}`,
        type: 'MEMORY',
        name: `Session: ${memory.date}`,
        date: memory.date
      });
    }
    
    return activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
  }

  getActiveAgents() {
    const agents = [];
    
    try {
      const tmuxList = execSync('tmux list-sessions 2>/dev/null || echo ""', { encoding: 'utf-8' });
      const sessions = tmuxList.split('\n').filter(s => s.includes(':'));
      
      for (const session of sessions) {
        const name = session.split(':')[0];
        agents.push({
          id: name,
          name: `tmux:${name}`,
          status: 'run',
          runtime: 'active',
          model: 'default'
        });
      }
    } catch (e) {}
    
    const entities = this.listEntities();
    agents.push({
      id: 'kg',
      name: 'knowledge-graph',
      status: 'run',
      runtime: 'always-on',
      model: 'system',
      stats: { entities: entities.entities?.length || 0 }
    });
    
    return agents;
  }

  getGraphData() {
    const entities = this.listEntities();
    const nodes = [];
    const edges = [];
    
    if (entities.entities) {
      entities.entities.forEach((entity, idx) => {
        nodes.push({
          id: entity.id || `entity-${idx}`,
          label: entity.name || entity.path,
          type: entity.type || 'entity',
          x: Math.random() * 800,
          y: Math.random() * 600
        });
      });
    }
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() > 0.7) {
          edges.push({
            source: nodes[i].id,
            target: nodes[j].id
          });
        }
      }
    }
    
    return { nodes, edges };
  }
}

const kgAPI = new KnowledgeGraphAPI();

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    knowledgeGraph: kgAPI.listEntities().entities?.length || 0,
    websocket: wss.clients.size
  });
});

app.get('/api/memories/search', (req, res) => {
  const { q, limit } = req.query;
  const results = kgAPI.search(q, { limit: parseInt(limit) || 10 });
  res.json(results);
});

app.get('/api/memories/entities', (req, res) => {
  res.json(kgAPI.listEntities());
});

app.get('/api/memories/graph', (req, res) => {
  res.json(kgAPI.getGraphData());
});

app.get('/api/memories/recent', (req, res) => {
  const { days } = req.query;
  res.json(kgAPI.getRecentMemories(parseInt(days) || 7));
});

app.get('/api/activity', (req, res) => {
  res.json(kgAPI.getActivityFeed());
});

app.get('/api/agents', (req, res) => {
  res.json(kgAPI.getActiveAgents());
});

// Start server
server.listen(PORT, () => {
  console.log(`🧠 Blanco's Dashboard Server`);
  console.log(`============================`);
  console.log(`HTTP API: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`\nThis is MY dashboard - my memories, my agents, my activity.`);
  console.log(`Connect via WebSocket for real-time updates.`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/memories/search?q=query`);
  console.log(`  GET  /api/memories/entities`);
  console.log(`  GET  /api/memories/graph`);
  console.log(`  GET  /api/memories/recent?days=7`);
  console.log(`  GET  /api/activity`);
  console.log(`  GET  /api/agents`);
  console.log(`\nKnowledge Graph: ${kgAPI.listEntities().entities?.length || 0} entities`);
  console.log(`Connected clients: ${wss.clients.size}`);
});
