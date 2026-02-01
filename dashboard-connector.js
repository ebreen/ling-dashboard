#!/usr/bin/env node
/**
 * Blanco Dashboard Connector
 * 
 * This script runs alongside Clawdbot to enable dashboard communication.
 * It watches the inbox directory for messages and routes them to Clawdbot,
 * then writes responses back to the outbox.
 * 
 * Usage: node dashboard-connector.js
 */

const fs = require('fs');
const path = require('path');

const INBOX_DIR = path.join(__dirname, 'inbox');
const OUTBOX_DIR = path.join(__dirname, 'outbox');

// Ensure directories exist
[INBOX_DIR, OUTBOX_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('🔌 Dashboard Connector Started');
console.log('================================');
console.log('Watching for messages from dashboard...');
console.log(`Inbox: ${INBOX_DIR}`);
console.log(`Outbox: ${OUTBOX_DIR}`);
console.log('');

// Simple response handler
async function handleMessage(messageData) {
  const { content, id } = messageData;
  
  console.log(`\n📨 New message: "${content}"`);
  
  // Process the message (this simulates what Clawdbot would do)
  let response = '';
  
  if (content.toLowerCase().includes('hello') || content.toLowerCase().includes('hi')) {
    response = "Hey! I'm Blanco. I'm now connected through the dashboard. You can see my activity, memories, and talk to me in real-time.";
  } else if (content.toLowerCase().includes('status')) {
    response = "I'm running and monitoring the dashboard. All systems operational.";
  } else if (content.toLowerCase().includes('what are you doing') || content.toLowerCase().includes('working on')) {
    response = "Currently maintaining the dashboard connection and monitoring various tasks. Check the Activity Feed for details.";
  } else {
    response = `I received your message: "${content}"\n\nI'm now connected via the dashboard IPC. In the full implementation, this would route to the actual Clawdbot process. For now, I'm the connector script handling basic responses.`;
  }
  
  // Write response
  const responseData = {
    id: `resp-${Date.now()}`,
    inReplyTo: id,
    from: 'clawdbot',
    to: 'dashboard',
    content: response,
    timestamp: new Date().toISOString()
  };
  
  const responsePath = path.join(OUTBOX_DIR, `${id}-response.json`);
  fs.writeFileSync(responsePath, JSON.stringify(responseData, null, 2));
  
  console.log(`📤 Response sent: "${response.substring(0, 100)}..."`);
  
  return responseData;
}

// Watch inbox for new messages
fs.watch(INBOX_DIR, async (eventType, filename) => {
  if (eventType === 'rename' && filename && filename.endsWith('.json')) {
    // Small delay to ensure file is fully written
    setTimeout(async () => {
      const filepath = path.join(INBOX_DIR, filename);
      
      try {
        if (!fs.existsSync(filepath)) return;
        
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        
        // Process message
        await handleMessage(data);
        
        // Clean up inbox file
        fs.unlinkSync(filepath);
      } catch (e) {
        console.error('Error processing message:', e);
      }
    }, 100);
  }
});

console.log('✅ Ready for messages');

// Keep alive
setInterval(() => {
  // Check for any orphaned messages (in case watch missed something)
  try {
    const files = fs.readdirSync(INBOX_DIR);
    files.filter(f => f.endsWith('.json')).forEach(async (file) => {
      const filepath = path.join(INBOX_DIR, file);
      try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        await handleMessage(data);
        fs.unlinkSync(filepath);
      } catch (e) {
        console.error('Error processing orphaned message:', e);
      }
    });
  } catch (e) {}
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Dashboard Connector shutting down');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Dashboard Connector shutting down');
  process.exit(0);
});
