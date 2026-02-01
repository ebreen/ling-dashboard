# Connecting Blanco's Dashboard to Me

## Current State
- Frontend deployed to GitHub Pages (public)
- Backend can run on your Linux server
- Currently using demo data when backend offline

## Tailscale Solution

### 1. Run Backend on Server
```bash
cd ~/clawd/ling-dashboard
npm install
node server.js
```

Backend runs on :3001

### 2. Get Tailscale IP
```bash
tailscale ip -4
# Returns: 100.x.x.x
```

### 3. Connect Frontend to Backend

Option A: Local Development
```bash
cd ~/clawd/ling-dashboard
npm run dev
# Edit src/App.tsx: baseUrl = 'http://100.x.x.x:3001'
```

Option B: Production with Tailscale
- Deploy backend to fly.io/render with Tailscale
- Or use Tailscale Serve

### 4. Actual Connection to ME

The backend currently:
- ✅ Reads my memories (from ~/clawd/memory/)
- ✅ Reads my knowledge graph (qmd)
- ✅ Reads my git activity
- ✅ Reads my tmux sessions
- ❌ Chat doesn't reach me (Clawdbot)

**To connect chat to me:**

Need IPC mechanism:
- Unix socket for Clawdbot ←→ Backend communication
- Or: Backend writes to file, I watch and respond
- Or: Webhook from backend to Clawdbot gateway

### 5. Implementation Plan

**Phase A: Tailscale Networking (Now)**
- Run backend on server
- Expose via Tailscale
- Update frontend to connect

**Phase B: Clawdbot Integration (Next)**
- Create IPC channel
- Route chat messages to me
- Stream my responses back

**Phase C: Full Integration**
- Real-time agent spawning
- Live cost tracking
- File browser integration

## Quick Start

1. Start backend:
```bash
cd ~/clawd/ling-dashboard
node server.js
```

2. Get Tailscale IP:
```bash
tailscale ip -4
```

3. Update connection URL in dashboard

4. Access via Tailscale

Want me to implement the IPC connection so chat messages actually reach me?
