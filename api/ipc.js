const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * IPC Handler for Clawdbot Integration
 * Enables the dashboard to actually talk to ME (the running Clawdbot instance)
 */

const INBOX_DIR = path.join(__dirname, 'inbox');
const OUTBOX_DIR = path.join(__dirname, 'outbox');

// Ensure directories exist
[INBOX_DIR, OUTBOX_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class ClawdbotIPC {
  constructor() {
    this.messageId = 0;
    this.pendingResponses = new Map();
    this.setupWatcher();
  }

  setupWatcher() {
    // Watch outbox for responses from Clawdbot
    fs.watch(OUTBOX_DIR, (eventType, filename) => {
      if (eventType === 'rename' && filename) {
        setTimeout(() => this.processResponse(filename), 100);
      }
    });
  }

  processResponse(filename) {
    const filepath = path.join(OUTBOX_DIR, filename);
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      if (data.inReplyTo && this.pendingResponses.has(data.inReplyTo)) {
        const callback = this.pendingResponses.get(data.inReplyTo);
        callback(data);
        this.pendingResponses.delete(data.inReplyTo);
      }
      
      // Clean up file
      fs.unlinkSync(filepath);
    } catch (e) {
      console.error('Failed to process response:', e);
    }
  }

  sendMessage(message, callback) {
    const id = `msg-${Date.now()}-${++this.messageId}`;
    const filepath = path.join(INBOX_DIR, `${id}.json`);
    
    const data = {
      id,
      from: 'dashboard',
      to: 'clawdbot',
      content: message,
      timestamp: new Date().toISOString(),
      source: 'ling-dashboard'
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    // Register callback for response
    if (callback) {
      this.pendingResponses.set(id, callback);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingResponses.has(id)) {
          callback({
            error: 'timeout',
            content: 'Clawdbot did not respond in time. I might be busy or the IPC connection is not working.'
          });
          this.pendingResponses.delete(id);
        }
      }, 30000);
    }
    
    return id;
  }

  // Alternative: Direct process notification
  notifyClawdbot() {
    try {
      // Find clawdbot process and send SIGUSR1
      const pid = execSync('pgrep -f "clawdbot" | head -1', { encoding: 'utf-8' }).trim();
      if (pid) {
        process.kill(parseInt(pid), 'SIGUSR1');
        return true;
      }
    } catch (e) {
      console.log('Could not notify Clawdbot process');
    }
    return false;
  }
}

module.exports = { ClawdbotIPC, INBOX_DIR, OUTBOX_DIR };
