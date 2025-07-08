#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Task Master Bridge - Integrates local orchestrator with Task Master MCP tools
 *
 * This script acts as a bridge between the simple task orchestrator and
 * the Task Master MCP tools, allowing you to use both systems together.
 */

class TaskMasterBridge {
  private projectRoot: string;
  private orchestratorPath: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.orchestratorPath = join(
      this.projectRoot,
      'scripts',
      'task-orchestrator.ts'
    );
  }

  private runOrchestrator(command: string): string {
    try {
      return execSync(`npx tsx ${this.orchestratorPath} ${command}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (error: any) {
      console.error('Error running orchestrator:', error.message);
      return '';
    }
  }

  public async syncWithTaskMaster() {
    console.log('🔄 Syncing with Task Master...\n');

    // First, export from orchestrator
    this.runOrchestrator('export');

    // Check if Task Master has tasks
    try {
      const tasksPath = join(
        this.projectRoot,
        '.taskmaster',
        'tasks',
        'tasks.json'
      );
      if (existsSync(tasksPath)) {
        console.log('✅ Tasks synced to Task Master format');
        console.log(`📁 Tasks file: ${tasksPath}`);
      }
    } catch (error) {
      console.error('❌ Failed to sync with Task Master');
    }
  }

  public showWorkflow() {
    console.log(`
🎯 MySetlist Development Workflow

1. Initialize Tasks (if not done):
   npx tsx scripts/task-orchestrator.ts init

2. View Current Tasks:
   npx tsx scripts/task-orchestrator.ts list
   npx tsx scripts/task-orchestrator.ts progress

3. Get Next Task:
   npx tsx scripts/task-orchestrator.ts next

4. Work on a Task:
   npx tsx scripts/task-orchestrator.ts update <id> in-progress
   
5. Complete a Task:
   npx tsx scripts/task-orchestrator.ts update <id> done

6. Sync with Task Master (for MCP tools):
   npx tsx scripts/task-master-bridge.ts sync

Task Master MCP Commands (when synced):
- Get all tasks: Use mcp__task-master__get_tasks
- Get specific task: Use mcp__task-master__get_task
- Update status: Use mcp__task-master__set_task_status
- Add subtasks: Use mcp__task-master__add_subtask

Current Sub-Agent Assignments:
- SUB-AGENT 1: Navigation & Routing (Task 1)
- SUB-AGENT 2: API Consolidation & Data Sync (Tasks 2, 3)
- SUB-AGENT 3: Trending Page (Task 4)
- SUB-AGENT 4: Homepage Enhancement (Task 5)
- SUB-AGENT 5: Artist Pages (Task 6)
- SUB-AGENT 6: Performance & Config (Task 7)
    `);
  }

  public showQuickStatus() {
    console.log('📊 Quick Status Overview:\n');

    // Get progress from orchestrator
    const progress = this.runOrchestrator('progress');
    console.log(progress);

    // Get next task
    console.log('\n🎯 Next Recommended Task:');
    const next = this.runOrchestrator('next');
    if (next.includes('Next recommended task:')) {
      console.log(next.split('Next recommended task:')[1]);
    } else {
      console.log('No available tasks');
    }
  }

  public generateSubAgentBrief(agentId: string) {
    const agentTasks: Record<string, string[]> = {
      '1': ['1'], // Navigation
      '2': ['2', '3'], // API & Sync
      '3': ['4'], // Trending
      '4': ['5'], // Homepage
      '5': ['6'], // Artist Pages
      '6': ['7'], // Performance
    };

    const taskIds = agentTasks[agentId];
    if (!taskIds) {
      console.error(`Invalid agent ID. Use 1-6.`);
      return;
    }

    console.log(`\n🤖 SUB-AGENT ${agentId} BRIEF\n`);
    console.log('Assigned Tasks:');

    taskIds.forEach((taskId) => {
      const details = this.runOrchestrator(`show ${taskId}`);
      console.log(details);
      console.log('\n---\n');
    });

    console.log(`
Key Guidelines for Sub-Agent ${agentId}:
- Focus ONLY on assigned tasks
- Avoid modifying files outside your domain
- Coordinate at integration checkpoints
- ULTRATHINK every decision 3x
- Report blockers immediately
    `);
  }
}

// CLI Interface
const bridge = new TaskMasterBridge();
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'sync':
    bridge.syncWithTaskMaster();
    break;

  case 'workflow':
    bridge.showWorkflow();
    break;

  case 'status':
    bridge.showQuickStatus();
    break;

  case 'agent':
    if (arg) {
      bridge.generateSubAgentBrief(arg);
    } else {
      console.error('Usage: task-master-bridge.ts agent <agent-id>');
      console.error('Agent IDs: 1-6');
    }
    break;

  case 'help':
  default:
    console.log(`
Task Master Bridge - Connect Orchestrator with Task Master MCP

Usage:
  npx tsx scripts/task-master-bridge.ts <command> [options]

Commands:
  sync              Sync orchestrator tasks with Task Master format
  workflow          Show complete development workflow
  status            Show quick status overview
  agent <id>        Generate brief for specific sub-agent (1-6)
  help              Show this help message

Examples:
  npx tsx scripts/task-master-bridge.ts sync
  npx tsx scripts/task-master-bridge.ts workflow
  npx tsx scripts/task-master-bridge.ts status
  npx tsx scripts/task-master-bridge.ts agent 1
    `);
}
