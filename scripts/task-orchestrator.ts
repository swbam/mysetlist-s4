#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Task {
  id: string;
  title: string;
  description: string;
  details: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  testStrategy?: string;
  tags?: string[];
  subTasks?: Task[];
}

interface TaskFile {
  tasks: Task[];
  metadata: {
    createdAt: string;
    lastUpdated: string;
    version: string;
  };
}

class TaskOrchestrator {
  private tasksDir: string;
  private tasksFile: string;
  private tasks: TaskFile;

  constructor() {
    this.tasksDir = join(process.cwd(), '.taskmaster', 'tasks');
    this.tasksFile = join(this.tasksDir, 'tasks.json');
    this.ensureDirectories();
    this.loadTasks();
  }

  private ensureDirectories() {
    if (!existsSync(this.tasksDir)) {
      mkdirSync(this.tasksDir, { recursive: true });
    }
  }

  private loadTasks() {
    if (existsSync(this.tasksFile)) {
      const content = readFileSync(this.tasksFile, 'utf-8');
      this.tasks = JSON.parse(content);
    } else {
      this.tasks = {
        tasks: [],
        metadata: {
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          version: '1.0.0',
        },
      };
      this.saveTasks();
    }
  }

  private saveTasks() {
    this.tasks.metadata.lastUpdated = new Date().toISOString();
    writeFileSync(this.tasksFile, JSON.stringify(this.tasks, null, 2));
  }

  public initializeFromPRD() {
    // Based on the MySetlist PRD, create initial tasks
    const initialTasks: Task[] = [
      {
        id: '1',
        title: 'Fix Navigation & Routing System',
        description:
          'Eliminate all top navigation crashes and implement bulletproof next-forge routing patterns',
        details: `
- Fix all navigation crashes immediately
- Implement proper error boundaries
- Ensure seamless page transitions
- Audit every route and navigation component
- Follow next-forge routing patterns
        `,
        status: 'pending',
        priority: 'high',
        dependencies: [],
        tags: ['navigation', 'critical-fix', 'sub-agent-1'],
      },
      {
        id: '2',
        title: 'Consolidate API Architecture',
        description:
          'Remove apps/api folder and migrate all functionality to apps/web/app/api',
        details: `
- Remove entire apps/api folder
- Migrate all API endpoints to apps/web/app/api
- Ensure all database operations use unified API routes
- Maintain next-forge patterns for API route organization
- Validate all sync functions work with consolidated structure
        `,
        status: 'pending',
        priority: 'high',
        dependencies: [],
        tags: ['api', 'architecture', 'sub-agent-2'],
      },
      {
        id: '3',
        title: 'Complete Data Sync System',
        description:
          'Implement comprehensive artist/show/venue/song catalog synchronization',
        details: `
- Automated data import when artist is clicked in search
- Fully operational cron jobs and sync functions
- Database population according to mysetlist-docs specifications
- Validate entire sync pipeline works with consolidated API
        `,
        status: 'pending',
        priority: 'high',
        dependencies: ['2'],
        tags: ['sync', 'database', 'sub-agent-2'],
      },
      {
        id: '4',
        title: 'Fix Trending Page Functionality',
        description:
          'Resolve trending page data loading failures and implement proper data fetching',
        details: `
- Fix data loading failures on trending page
- Implement trending endpoints within apps/web/app/api
- Display current trending data with algorithms
- Use proper next-forge patterns for data fetching
- Review all database queries and data flow
        `,
        status: 'pending',
        priority: 'high',
        dependencies: ['2'],
        tags: ['trending', 'frontend', 'sub-agent-3'],
      },
      {
        id: '5',
        title: 'Enhance Homepage Design',
        description: 'Implement centered search and content display components',
        details: `
- Center search input in top hero section
- Implement next-forge slider component for artists/shows
- Add trending content showcase
- Ensure responsive design across all devices
- Integrate components with design system
        `,
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        tags: ['homepage', 'ui', 'sub-agent-4'],
      },
      {
        id: '6',
        title: 'Complete Artist Page Implementation',
        description:
          'Fix artist page show/data loading issues and implement full functionality',
        details: `
- Fix data loading issues on artist pages
- Display full artist-to-shows data relationships
- Complete show catalog population for each artist
- Implement seamless artist → shows → setlist → song flow
- Verify complete data binding and relationships
        `,
        status: 'pending',
        priority: 'high',
        dependencies: ['3'],
        tags: ['artist', 'frontend', 'sub-agent-5'],
      },
      {
        id: '7',
        title: 'Performance & Configuration Optimization',
        description:
          'Audit and optimize all configuration files and performance',
        details: `
- Audit all configuration files and environment variables
- Implement performance optimizations and caching strategies
- Configure production-ready deployment settings
- Achieve sub-second page load times
- Optimize all database queries and API calls
        `,
        status: 'pending',
        priority: 'medium',
        dependencies: ['2', '3'],
        tags: ['performance', 'config', 'sub-agent-6'],
      },
      {
        id: '8',
        title: 'Testing & Quality Assurance',
        description: 'Implement comprehensive testing across the application',
        details: `
- Unit tests for all critical components
- Integration tests for API endpoints
- End-to-end tests for user flows
- Accessibility testing (WCAG 2.1 AA)
- Performance testing and monitoring
        `,
        status: 'pending',
        priority: 'medium',
        dependencies: ['1', '2', '3', '4', '5', '6'],
        tags: ['testing', 'qa'],
      },
      {
        id: '9',
        title: 'Documentation & Deployment',
        description:
          'Complete documentation and prepare for production deployment',
        details: `
- Document all architectural decisions
- Create deployment guides
- Set up CI/CD pipelines
- Configure monitoring and logging
- Prepare production environment
        `,
        status: 'pending',
        priority: 'low',
        dependencies: ['7', '8'],
        tags: ['documentation', 'deployment'],
      },
    ];

    this.tasks.tasks = initialTasks;
    this.saveTasks();
    console.log('✅ Initialized tasks from PRD');
  }

  public listTasks(status?: string) {
    const filteredTasks = status
      ? this.tasks.tasks.filter((t) => t.status === status)
      : this.tasks.tasks;

    console.log(`\n📋 Tasks (${filteredTasks.length} total):\n`);

    filteredTasks.forEach((task) => {
      const statusEmoji = {
        pending: '⏳',
        'in-progress': '🔄',
        done: '✅',
        blocked: '🚫',
      }[task.status];

      const priorityEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢',
      }[task.priority];

      console.log(`${statusEmoji} [${task.id}] ${task.title} ${priorityEmoji}`);
      if (task.dependencies.length > 0) {
        console.log(`   Dependencies: ${task.dependencies.join(', ')}`);
      }
      if (task.tags) {
        console.log(`   Tags: ${task.tags.join(', ')}`);
      }
    });
  }

  public getNextTask(): Task | null {
    // Find tasks that are pending and have all dependencies completed
    const completedTaskIds = this.tasks.tasks
      .filter((t) => t.status === 'done')
      .map((t) => t.id);

    const availableTasks = this.tasks.tasks.filter((task) => {
      if (task.status !== 'pending') return false;

      // Check if all dependencies are completed
      return task.dependencies.every((dep) => completedTaskIds.includes(dep));
    });

    // Sort by priority (high > medium > low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    availableTasks.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );

    return availableTasks[0] || null;
  }

  public updateTaskStatus(taskId: string, status: Task['status']) {
    const task = this.tasks.tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error(`❌ Task ${taskId} not found`);
      return;
    }

    task.status = status;
    this.saveTasks();
    console.log(`✅ Updated task ${taskId} to ${status}`);
  }

  public showTaskDetails(taskId: string) {
    const task = this.tasks.tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error(`❌ Task ${taskId} not found`);
      return;
    }

    console.log(`\n📄 Task Details:`);
    console.log(`ID: ${task.id}`);
    console.log(`Title: ${task.title}`);
    console.log(`Status: ${task.status}`);
    console.log(`Priority: ${task.priority}`);
    console.log(`\nDescription:\n${task.description}`);
    console.log(`\nDetails:${task.details}`);

    if (task.dependencies.length > 0) {
      console.log(`\nDependencies: ${task.dependencies.join(', ')}`);
    }

    if (task.tags) {
      console.log(`Tags: ${task.tags.join(', ')}`);
    }
  }

  public showProgress() {
    const total = this.tasks.tasks.length;
    const done = this.tasks.tasks.filter((t) => t.status === 'done').length;
    const inProgress = this.tasks.tasks.filter(
      (t) => t.status === 'in-progress'
    ).length;
    const blocked = this.tasks.tasks.filter(
      (t) => t.status === 'blocked'
    ).length;
    const pending = this.tasks.tasks.filter(
      (t) => t.status === 'pending'
    ).length;

    const percentage = Math.round((done / total) * 100);

    console.log(`\n📊 Progress Report:`);
    console.log(`Total Tasks: ${total}`);
    console.log(`✅ Done: ${done}`);
    console.log(`🔄 In Progress: ${inProgress}`);
    console.log(`⏳ Pending: ${pending}`);
    console.log(`🚫 Blocked: ${blocked}`);
    console.log(
      `\nProgress: [${'█'.repeat(percentage / 5)}${' '.repeat(20 - percentage / 5)}] ${percentage}%`
    );
  }

  public exportForTaskMaster() {
    // Export in a format compatible with Task Master
    const taskmasterTasks = {
      tasks: this.tasks.tasks.map((task, index) => ({
        id: Number.parseInt(task.id),
        title: task.title,
        description: task.description,
        details: task.details.trim(),
        status: task.status,
        dependencies: task.dependencies.map((d) => Number.parseInt(d)),
        testStrategy: task.testStrategy || '',
        createdAt: this.tasks.metadata.createdAt,
        updatedAt: this.tasks.metadata.lastUpdated,
      })),
    };

    const exportPath = join(this.tasksDir, 'tasks.json');
    writeFileSync(exportPath, JSON.stringify(taskmasterTasks, null, 2));
    console.log(`✅ Exported tasks to ${exportPath}`);
  }
}

// CLI Interface
const orchestrator = new TaskOrchestrator();
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'init':
    orchestrator.initializeFromPRD();
    break;

  case 'list':
    orchestrator.listTasks(arg);
    break;

  case 'next':
    const nextTask = orchestrator.getNextTask();
    if (nextTask) {
      console.log(`\n🎯 Next recommended task:`);
      orchestrator.showTaskDetails(nextTask.id);
    } else {
      console.log(
        `\n✨ No available tasks. Check for blocked or completed tasks.`
      );
    }
    break;

  case 'update':
    const taskId = arg;
    const newStatus = process.argv[4] as Task['status'];
    if (!taskId || !newStatus) {
      console.error('Usage: task-orchestrator update <taskId> <status>');
      console.error('Status options: pending, in-progress, done, blocked');
    } else {
      orchestrator.updateTaskStatus(taskId, newStatus);
    }
    break;

  case 'show':
    if (arg) {
      orchestrator.showTaskDetails(arg);
    } else {
      console.error('Usage: task-orchestrator show <taskId>');
    }
    break;

  case 'progress':
    orchestrator.showProgress();
    break;

  case 'export':
    orchestrator.exportForTaskMaster();
    break;

  case 'help':
  default:
    console.log(`
Task Orchestrator - Manage MySetlist Development Tasks

Usage:
  npx tsx scripts/task-orchestrator.ts <command> [options]

Commands:
  init              Initialize tasks from the PRD
  list [status]     List all tasks (optionally filter by status)
  next              Show the next recommended task to work on
  update <id> <status>  Update task status (pending|in-progress|done|blocked)
  show <id>         Show detailed information about a task
  progress          Show overall progress report
  export            Export tasks in Task Master format
  help              Show this help message

Examples:
  npx tsx scripts/task-orchestrator.ts init
  npx tsx scripts/task-orchestrator.ts list pending
  npx tsx scripts/task-orchestrator.ts next
  npx tsx scripts/task-orchestrator.ts update 1 in-progress
  npx tsx scripts/task-orchestrator.ts show 1
  npx tsx scripts/task-orchestrator.ts progress
    `);
}
