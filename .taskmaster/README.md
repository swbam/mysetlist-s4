# Task Master Setup for MySetlist Project

This project uses Task Master for task management, with a custom orchestrator to work around API key limitations in the MCP environment.

## Quick Start

### 1. Initialize Tasks (First Time Only)
```bash
npx tsx scripts/task-orchestrator.ts init
```

### 2. View Current Status
```bash
# Show all tasks
npx tsx scripts/task-orchestrator.ts list

# Show progress
npx tsx scripts/task-orchestrator.ts progress

# Get next recommended task
npx tsx scripts/task-orchestrator.ts next
```

### 3. Work on Tasks
```bash
# Start working on a task
npx tsx scripts/task-orchestrator.ts update <task-id> in-progress

# Complete a task
npx tsx scripts/task-orchestrator.ts update <task-id> done

# Block a task
npx tsx scripts/task-orchestrator.ts update <task-id> blocked
```

### 4. View Task Details
```bash
npx tsx scripts/task-orchestrator.ts show <task-id>
```

## Task Structure

Based on the MySetlist PRD, tasks are organized as follows:

### High Priority Tasks
1. **Fix Navigation & Routing System** - Eliminate crashes, implement error boundaries
2. **Consolidate API Architecture** - Migrate apps/api to apps/web/app/api
3. **Complete Data Sync System** - Artist/show/venue/song synchronization
4. **Fix Trending Page** - Resolve data loading failures
6. **Complete Artist Pages** - Fix show/data loading issues

### Medium Priority Tasks
5. **Enhance Homepage** - Centered search, content sliders
7. **Performance Optimization** - Configuration audit, caching
8. **Testing & QA** - Comprehensive test coverage

### Low Priority Tasks
9. **Documentation & Deployment** - Final preparation

## Sub-Agent Assignments

The PRD specifies 6 parallel sub-agents:

- **SUB-AGENT 1**: Navigation & Routing (Task 1)
- **SUB-AGENT 2**: API Consolidation & Data Sync (Tasks 2, 3)
- **SUB-AGENT 3**: Trending Page (Task 4)
- **SUB-AGENT 4**: Homepage Enhancement (Task 5)
- **SUB-AGENT 5**: Artist Pages (Task 6)
- **SUB-AGENT 6**: Performance & Config (Task 7)

## Integration with Task Master MCP

To sync with Task Master MCP tools:

```bash
# Export tasks to Task Master format
npx tsx scripts/task-orchestrator.ts export

# Use bridge for workflow guidance
npx tsx scripts/task-master-bridge.ts workflow

# Get sub-agent specific brief
npx tsx scripts/task-master-bridge.ts agent <1-6>
```

## Task Dependencies

Tasks have dependencies that must be respected:
- Task 3 (Data Sync) depends on Task 2 (API Consolidation)
- Task 4 (Trending Page) depends on Task 2 (API Consolidation)  
- Task 6 (Artist Pages) depends on Task 3 (Data Sync)
- Task 7 (Performance) depends on Tasks 2 & 3
- Task 8 (Testing) depends on Tasks 1-6
- Task 9 (Documentation) depends on Tasks 7 & 8

## Development Workflow

1. Check current progress and get next task
2. Review task details and dependencies
3. Update task status to in-progress
4. Implement following ULTRATHINKING methodology (analyze 3x)
5. Update task status to done when complete
6. Check for newly available tasks

## Important Notes

- Tasks are stored in `.taskmaster/tasks/tasks.json`
- The orchestrator manages task flow based on dependencies
- Priority order: high > medium > low
- Always complete dependencies before starting dependent tasks
- Use sub-agent boundaries to avoid conflicts during parallel work