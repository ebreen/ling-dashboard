# Ling AI Agent Dashboard - GSD Roadmap

## Project Overview
Build a production-grade AI agent orchestration dashboard called "Ling" with real-time chat, activity tracking, memory graph visualization, and agent monitoring.

---

## Phase 1: Foundation & Static UI
**Goal:** Pixel-perfect recreation of the reference screenshot with static data
**Estimated Duration:** 2-3 hours

### Deliverables
- [ ] Project setup (React + TypeScript + Tailwind + Vite)
- [ ] Exact color system and typography
- [ ] Header component with navigation
- [ ] Left panel: Chat interface with tabs
- [ ] Right panel: Activity feed
- [ ] Right panel: Memory graph (animated D3 visualization)
- [ ] Right panel: Agents table
- [ ] Right panel: Recent memories grid
- [ ] Static demo data matching screenshot

### Success Criteria
- UI visually indistinguishable from reference
- All components render correctly
- Responsive to window resizing
- Smooth animations on memory graph

---

## Phase 2: Backend API & Real Data
**Goal:** Functional backend API for memory, agents, and activity
**Estimated Duration:** 3-4 hours

### Deliverables
- [ ] Express.js API server
- [ ] SQLite schema for memories, episodes, agents
- [ ] REST endpoints:
  - GET /api/memories (list with search)
  - GET /api/memories/graph (nodes/edges)
  - GET /api/agents (active agents)
  - GET /api/activity (feed)
  - POST /api/chat (message handling)
- [ ] WebSocket server for real-time updates
- [ ] Integration with qmd knowledge graph
- [ ] Agent spawning simulation

### Success Criteria
- API returns real data from knowledge graph
- WebSocket pushes updates to clients
- Chat interface functional

---

## Phase 3: Real-time Features
**Goal:** Live agent orchestration and chat
**Estimated Duration:** 2-3 hours

### Deliverables
- [ ] Chat message handling
- [ ] Agent spawn commands
- [ ] Live runtime tracking
- [ ] Activity feed auto-refresh
- [ ] Memory graph live updates
- [ ] Command parsing ("spawn", "search", etc.)

### Success Criteria
- Can spawn agents via chat
- Real-time status updates
- Activity feed reflects operations

---

## Phase 4: Advanced Features
**Goal:** Additional views and polish
**Estimated Duration:** 3-4 hours

### Deliverables
- [ ] Files view (file browser)
- [ ] Graph view (full-screen memory graph)
- [ ] Costs view (token usage tracking)
- [ ] Cascade view (agent chain visualization)
- [ ] Search functionality
- [ ] Memory detail view
- [ ] Settings/preferences

### Success Criteria
- All header tabs functional
- Search works across memories
- Performance optimized

---

## Phase 5: Deployment
**Goal:** Production deployment
**Estimated Duration:** 1 hour

### Deliverables
- [ ] GitHub repository
- [ ] GitHub Pages deployment (frontend)
- [ ] Backend deployment (optional/future)
- [ ] Documentation
- [ ] README with setup instructions

### Success Criteria
- Dashboard live and accessible
- All features working in production

---

## Current State
- **Phase:** 1 (Starting)
- **Last Updated:** 2026-02-01
- **Context:** Deep visual analysis complete
