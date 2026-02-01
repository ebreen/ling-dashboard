#!/usr/bin/env node
/**
 * Clawdbot Bridge
 * 
 * This bridge connects the Dashboard backend to the actual running Clawdbot.
 * It uses file-based IPC and the sessions system.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX_DIR = path.join(__dirname, 'inbox');
const OUTBOX_DIR = path.join(__dirname, 'outbox');
const BRIDGE_LOG = path.join(__dirname, 'bridge.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(BRIDGE_LOG, line);
  console.log(msg);
}

// Ensure directories exist
[INBOX_DIR, OUTBOX_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

log('🌉 Clawdbot Bridge Started');
log('==========================');

// Forward message to Clawdbot via sessions
async function forwardToClawdbot(messageData) {
  const { content, id } = messageData;
  
  log(`Forwarding to Clawdbot: "${content.substring(0, 50)}..."`);
  
  // Write to a special file that Clawdbot monitors
  const forwardPath = path.join(__dirname, '.clawdbot-inbox', `${id}.json`);
  
  if (!fs.existsSync(path.dirname(forwardPath))) {
    fs.mkdirSync(path.dirname(forwardPath), { recursive: true });
  }
  
  fs.writeFileSync(forwardPath, JSON.stringify({
    type: 'dashboard-message',
    content,
    id,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  // Also try to notify via process signal if possible
  try {
    const pid = execSync('pgrep -f "clawdbot" | head -1', { encoding: 'utf-8' }).trim();
    if (pid) {
      process.kill(parseInt(pid), 'SIGUSR1');
      log(`Notified Clawdbot process (${pid})`);
    }
  } catch (e) {
    log('Could not signal Clawdbot process');
  }
}

// Watch for responses from Clawdbot
function setupResponseWatcher() {
  const responseDir = path.join(__dirname, '.clawdbot-outbox');
  
  if (!fs.existsSync(responseDir)) {
    fs.mkdirSync(responseDir, { recursive: true });
  }
  
  fs.watch(responseDir, (eventType, filename) => {
    if (eventType === 'rename' && filename) {
      setTimeout(() => {
        const filepath = path.join(responseDir, filename);
        try {
          if (!fs.existsSync(filepath)) return;
          
          const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
          
          // Forward to dashboard outbox
          const outPath = path.join(OUTBOX_DIR, filename);
          fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
          
          log(`Response forwarded: ${filename}`);
          
          // Clean up
          fs.unlinkSync(filepath);
        } catch (e) {
          log(`Error forwarding response: ${e.message}`);
        }
      }, 100);
    }
  });
}

// Watch inbox from dashboard
fs.watch(INBOX_DIR, async (eventType, filename) => {
  if (eventType === 'rename' && filename && filename.endsWith('.json')) {
    setTimeout(async () => {
      const filepath = path.join(INBOX_DIR, filename);
      
      try {
        if (!fs.existsSync(filepath)) return;
        
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        log(`Received from dashboard: ${data.content.substring(0, 50)}...`);
        
        // Forward to Clawdbot
        await forwardToClawdbot(data);
        
        // Clean up inbox
        fs.unlinkSync(filepath);
      } catch (e) {
        log(`Error: ${e.message}`);
      }
    }, 100);
  }
});

setupResponseWatcher();

log('✅ Bridge active - watching for messages');
log('Dashboard → Inbox → Bridge → Clawdbot');
log('Clawdbot → .clawdbot-outbox → Bridge → Outbox → Dashboard');

// Keep alive
process.stdin.resume();

process.on('SIGINT', () => {
  log('\n👋 Bridge shutting down');
  process.exit(0);
});
