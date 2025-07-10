#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
    } catch (_error: any) {
      return '';
    }
  }

  public async syncWithTaskMaster() {
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
      }
    } catch (_error) {}
  }

  public showWorkflow() {}

  public showQuickStatus() {
    // Get progress from orchestrator
    const _progress = this.runOrchestrator('progress');
    const next = this.runOrchestrator('next');
    if (next.includes('Next recommended task:')) {
    } else {
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
      return;
    }

    taskIds.forEach((taskId) => {
      const _details = this.runOrchestrator(`show ${taskId}`);
    });
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
    }
    break;
  default:
}
