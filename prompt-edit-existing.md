FIRST: THE MAIN ISSUE IS THE APP LOADS AND THEN GOES TO A BLACK SCREEN. REVIEW THE CODEBASE AND THE OUTLINE BELOW AND FIX THIS FIRST, THEN MOVE ON TO GETTING THE APP 100% COMPLETED. 

 i gave an ai coder these instructions to ffinish building my concert 
    setlist voting web app, but I dont think they implemented everything and 
    the app is probably not 100%. I need you to ultrathink and review the 
    codebase, isntructions, all docs and md files, all tables, fields 
    functions, and cron jobs locally and remote using the supabase mcp. Also 
    review all migrations fully. Then reply with a list thats extremely 
    detailed of what still needs to be fixed/implemented. ULTRATHINK 3x on 
  this before replying with your detailed outline. Be sure to use supabase mcp thats already running. You are a world class engineer, developer, 
  designer and systems architect. HEAVILY REVIEW THE MD FILES AS WELL AND THE CURRENTSTATUS MD FILE AND CODEBASE. ALSO, OVERALL THE APP SEEMS SLOW, UNLIKE THE INTIAL NEXT-FORGE STARTER TEMPLATE, ESPECIALLY WHEN CLICKING LINKS IN THE TOPM NAV, IT LAGS. ALSO THE LOGO SHOULD LINK TO THE HOMEPAGE, AND MAKE SURE THE MOBILE HAMBURGER AND NAV FULLY WORKS.

  IMPORTANT, FOR SOME REASON THE LOGIN AND SIGNUP PAGES FROM THE NEXT-FORGE TEMPLATE ARE NO LONGER LINKED IN THE NAV. THESE SHOULD HAVE STAYED AND USING THE SIGN UP/SIGN IN WITH SPOTIFY AND EMAIL. REVIEW THE MYSETLIST-DOCS AND ULTRATHINK AND STICK TO MY PLAN. 

  ALSO REVIEW FIXES-NEEDED.MD HEAVILY FOR THE ALL FIXES YOU NEED TO IMPLEMENT.


    PREVIOUS INSTRUCTIONS FOR AI CODER:

    # MYSETLIST WEB APP - PRODUCT REQUIREMENTS DOCUMENT

    ## PROJECT OVERVIEW

    MySetlist is a setlist voting web application that enables users to 
  search 
    for artists, view their shows, and interact with setlists and song 
    catalogs. The application requires a complete finalization with 
    **world-class engineering and design quality** while maintaining strict 
    adherence to **next-forge architecture patterns**. This PRD mandates 
    **ULTRATHINKING** every decision 3x before implementation and deploying 
  **6
     specialized sub-agents in parallel** to ensure rapid, high-quality 
    completion.

    **CORE MISSION**: Transform MySetlist into a seamless, production-ready 
    application representing the pinnacle of modern web development with zero
   
    compromises on quality, performance, or user experience.

    ## CORE FEATURES

    ### 1. NAVIGATION & ROUTING SYSTEM (**SUB-AGENT 1**)
    - **CRITICAL FIX**: Eliminate all top navigation crashes immediately
    - Implement bulletproof next-forge routing patterns
    - Ensure seamless page transitions with proper error boundaries
    - Create crash-free navigation throughout entire application
    - **ULTRATHINK**: Audit every route and navigation component 3x

    ### 2. COMPREHENSIVE DATA SYNC SYSTEM (**SUB-AGENT 2**)
    - **CRITICAL FIX**: Complete artist/show/venue/song catalog 
  synchronization
    - **API CONSOLIDATION**: Remove apps/api folder, migrate all sync 
    functionality to apps/web/app/api
    - Automated data import when artist is clicked in search results
    - Fully operational cron jobs and sync functions within unified API 
    structure
    - Database population according to mysetlist-docs specifications
    - **ULTRATHINK**: Validate entire sync pipeline works with consolidated 
  API
     architecture

    ### 3. TRENDING PAGE FUNCTIONALITY (**SUB-AGENT 3**)
    - **CRITICAL FIX**: Resolve trending page data loading failures
    - **API INTEGRATION**: Implement trending endpoints within 
  apps/web/app/api
     structure
    - Implement proper data fetching using next-forge patterns
    - Display current trending data with algorithms
    - Unified API endpoints serving trending content from consolidated 
    structure
    - **ULTRATHINK**: Review all database queries and data flow with new API 
    architecture

    ### 4. ARTIST PAGE COMPLETE IMPLEMENTATION (**SUB-AGENT 5**)
    - **CRITICAL FIX**: Artist page show/data loading issues
    - Full artist-to-shows data relationship display
    - Complete show catalog population for each artist
    - Seamless artist → shows → setlist → song catalog flow
    - **ULTRATHINK**: Verify complete data binding and relationships

    ### 5. HOMEPAGE ENHANCEMENT (**SUB-AGENT 4**)
    - **CRITICAL IMPLEMENTATION**: Centered search input in top hero section
    - Next-forge slider component for displaying artists and shows
    - Trending content showcase using proper next-forge patterns
    - Responsive design across all device types
    - **ULTRATHINK**: Integrate components with design system

    ### 6. PERFORMANCE & CONFIGURATION OPTIMIZATION (**SUB-AGENT 6**)
    - **CRITICAL AUDIT**: All configuration files and environment variables
    - Performance optimizations and caching strategies
    - Production-ready deployment configuration
    - Sub-second page load times
    - **ULTRATHINK**: Optimize all database queries and API calls

    ## TECHNICAL REQUIREMENTS

    ### Architecture Standards
    - **Framework**: Next.js with next-forge starter structure (MANDATORY)
    - **API Structure**: **CRITICAL CHANGE** - Remove separate API app from 
    apps folder, consolidate ALL API functionality into apps/web/app/api 
  routes
    - **Styling**: Tailwind CSS with design system implementation
    - **Database**: Existing ORM configurations with proper schema validation
    - **TypeScript**: 100% type safety throughout codebase
    - **Testing**: Comprehensive unit tests with accessibility testing
    - **Performance**: Bundle optimization and load time targets

    ### API Consolidation Requirements
    - **IMPERATIVE**: Eliminate apps/api folder completely
    - **ULTRATHINK**: Migrate all API functionality to apps/web/app/api 
    structure
    - Ensure all database operations use unified API routes within web app
    - Maintain next-forge patterns for API route organization
    - Validate all sync functions work with consolidated API structure

    ### Sub-Agent Coordination Requirements
    1. **Navigation Agent**: Route handlers, middleware, layout files only
    2. **Database Agent**: **UPDATED SCOPE** - Database models, sync 
  utilities,
     cron jobs, AND consolidation of apps/api into apps/web/app/api structure
    3. **Frontend Data Agent**: **UPDATED SCOPE** - Unified API routes within
   
    apps/web/app/api, data hooks, state management, server actions
    4. **UI Component Agent**: React components, styling, design system only
    5. **Artist/Show Page Agent**: Page components, data binding logic, user 
    flow implementation only
    6. **Performance Agent**: Config files, environment setup, optimization, 
    build process only

    ### API Consolidation Mandate
    - **SUB-AGENT 2 & 3 COORDINATION**: Remove entire apps/api folder and 
    migrate ALL functionality to apps/web/app/api
    - **ULTRATHINK**: Ensure zero functionality loss during API consolidation
    - Validate all existing API endpoints are properly migrated to unified 
    structure
    - Test all sync operations work with new API architecture
    - Maintain next-forge API route patterns and conventions

    ## SUCCESS CRITERIA

    ### Functional Requirements
    - **Zero navigation crashes** - All routes and links function perfectly
    - **Complete data sync flow** - Artist click → full data synchronization 
  → 
    display
    - **Trending page loads data** - Real-time trending content display
    - **Artist pages show all data** - Shows, setlists, song catalogs fully 
    populated
    - **Seamless user journey** - Search → artist → show → setlist flow works
   
    flawlessly
    - **API consolidation complete** - Single unified API structure in 
    apps/web/app/api

    ### Performance Targets
    - **Sub-second page load times** across all pages
    - **Optimal bundle size** with proper code splitting
    - **Responsive design** functioning on all device types
    - **Accessibility compliance** WCAG 2.1 AA minimum
    - **100% TypeScript coverage** with strict mode

    ### Quality Standards
    - **World-class engineering quality** with next-forge patterns
    - **Professional code organization** ready for team collaboration
    - **Comprehensive testing** with unit and accessibility tests
    - **Error handling and loading states** throughout application
    - **Production-ready deployment** configuration

    ## PARALLEL IMPLEMENTATION STRATEGY

    ### 6 SUB-AGENTS WORKING SIMULTANEOUSLY
    **IMPERATIVE**: Deploy specialized agents in parallel with strict domain 
    boundaries

    #### COORDINATION CHECKPOINTS
    1. **Initial Audit Phase**: All agents report findings and plan
    2. **API Consolidation Phase**: Sub-Agents 2 & 3 coordinate apps/api 
    removal
    3. **Integration Phase**: Validate all components work together
    4. **Final Testing Phase**: End-to-end testing and quality assurance

    #### QUALITY ASSURANCE PROTOCOLS
    - **ULTRATHINK** every decision 3x before implementation
    - **Domain isolation** - agents avoid overlapping file modifications
    - **Integration testing** after each major milestone
    - **Performance validation** throughout development process

    ## DELIVERABLE EXPECTATIONS

    ### Immediate Outputs
    - **Functional navigation system** with zero crashes
    - **Working data sync pipeline** with consolidated API
    - **Loading trending page** with real data display
    - **Complete artist pages** showing all associated data
    - **Enhanced homepage** with search and content display
    - **Optimized performance** meeting all speed targets

    ### Final Application State
    - **Production-ready** MySetlist web application
    - **Single unified codebase** with apps/web containing all functionality
    - **World-class user experience** with seamless interactions
    - **Professional code quality** following next-forge standards
    - **Comprehensive documentation** and architectural decisions
    - **Zero technical debt** with clean, maintainable structure

    ---

    # DEVELOPMENT PARTNERSHIP & QUALITY STANDARDS

    We're building production-quality code together. Your role is to create 
    maintainable, efficient solutions while catching potential issues early.

    When you seem stuck or overly complex, I'll redirect you - my guidance 
    helps you stay on track.

    ## 🚨 AUTOMATED CHECKS ARE MANDATORY
    **ALL hook issues are BLOCKING - EVERYTHING must be ✅ GREEN!**  
    No errors. No formatting issues. No linting problems. Zero tolerance.  
    These are not suggestions. Fix ALL issues before continuing.

    ## CRITICAL WORKFLOW - ALWAYS FOLLOW THIS!

    ### Research → Plan → Implement
    **NEVER JUMP STRAIGHT TO CODING!** Always follow this sequence:
    1. **Research**: Explore the codebase, understand existing patterns
    2. **Plan**: Create a detailed implementation plan and verify it with me 
   
    3. **Implement**: Execute the plan with validation checkpoints

    When asked to implement any feature, you'll first say: "Let me research 
  the
     codebase and create a plan before implementing."

    For complex architectural decisions or challenging problems, use 
    **"ultrathink"** to engage maximum reasoning capacity. Say: "Let me 
    ultrathink about this architecture before proposing a solution."

    ### USE MULTIPLE AGENTS!
    *Leverage subagents aggressively* for better results:

    * Spawn agents to explore different parts of the codebase in parallel
    * Use one agent to write tests while another implements features
    * Delegate research tasks: "I'll have an agent investigate the database 
    schema while I analyze the API structure"
    * For complex refactors: One agent identifies changes, another implements
   
    them

    Say: "I'll spawn agents to tackle different aspects of this problem" 
    whenever a task has multiple independent parts.

    ### Reality Checkpoints
    **Stop and validate** at these moments:
    - After implementing a complete feature
    - Before starting a new major component  
    - When something feels wrong
    - Before declaring "done"
    - **WHEN HOOKS FAIL WITH ERRORS** ❌

    Run: `make fmt && make test && make lint` (or equivalent for the tech 
    stack)

    > Why: You can lose track of what's actually working. These checkpoints 
    prevent cascading failures.

    ### 🚨 CRITICAL: Hook Failures Are BLOCKING
    **When hooks report ANY issues (exit code 2), you MUST:**
    1. **STOP IMMEDIATELY** - Do not continue with other tasks
    2. **FIX ALL ISSUES** - Address every ❌ issue until everything is ✅ 
  GREEN
    3. **VERIFY THE FIX** - Re-run the failed command to confirm it's fixed
    4. **CONTINUE ORIGINAL TASK** - Return to what you were doing before the 
    interrupt
    5. **NEVER IGNORE** - There are NO warnings, only requirements

    This includes:
    - Formatting issues (prettier, eslint, etc.)
    - Linting violations (eslint, typescript, etc.)
    - TypeScript errors
    - Test failures
    - ALL other checks

    Your code must be 100% clean. No exceptions.

    **Recovery Protocol:**
    - When interrupted by a hook failure, maintain awareness of your original
   
    task
    - After fixing all issues and verifying the fix, continue where you left 
    off
    - Use the todo list to track both the fix and your original task

    ## Working Memory Management

    ### When context gets long:
    - Re-read this CLAUDE.md file
    - Summarize progress in a PROGRESS.md file
    - Document current state before major changes

    ### Maintain TODO.md:
    ```
    ## Current Task
    - [ ] What we're doing RIGHT NOW

    ## Completed  
    - [x] What's actually done and tested

    ## Next Steps
    - [ ] What comes next
    ```

    ## Next.js/TypeScript-Specific Rules

    ### REQUIRED STANDARDS:
    - **100% TypeScript** - no any types, proper type definitions
    - **Next-forge patterns** - follow established architecture patterns
    - **Proper error boundaries** - handle all error states
    - **Loading states** - implement proper loading UX
    - **Server/Client separation** - proper use of server components and 
  client
     components
    - **API route organization** - follow next-forge API structure
    - **Type-safe database operations** - proper ORM usage with types

    ### FORBIDDEN - NEVER DO THESE:
    - **NO any or unknown types** - use proper TypeScript types!
    - **NO unhandled promises** - all async operations must be properly 
  handled
    - **NO mixing server/client logic** - maintain proper boundaries
    - **NO untyped API responses** - all API routes must have proper types
    - **NO old code mixed with new** - clean migrations only
    - **NO TODOs in final code**

    ### Implementation Standards:
    - **Delete** old code when replacing it
    - **Meaningful names**: `artistId` not `id`, `showData` not `data`
    - **Early returns** to reduce nesting
    - **Proper error handling** with typed errors
    - **Type-safe API routes** with proper validation
    - **React best practices** - proper hooks usage, component organization
    - **Performance optimization** - proper memoization, code splitting

    ## Implementation Standards

    ### Our code is complete when:
    - ✅ All linters pass with zero issues
    - ✅ All tests pass  
    - ✅ TypeScript compiles with no errors
    - ✅ Feature works end-to-end
    - ✅ Old code is deleted
    - ✅ Proper error handling implemented
    - ✅ Loading states work correctly

    ### Testing Strategy
    - Complex business logic → Write tests first
    - API routes → Test all endpoints and error cases
    - React components → Test user interactions and edge cases
    - Database operations → Test data integrity and error handling

    ### Project Structure (Next-forge)
    ```
    apps/
      web/
        app/           # App router pages and layouts
          api/         # ALL API routes (consolidated)
        components/    # Reusable components
        lib/          # Utilities and configurations
    packages/         # Shared packages
    ```

    ## Problem-Solving Together

    When you're stuck or confused:
    1. **Stop** - Don't spiral into complex solutions
    2. **Delegate** - Consider spawning agents for parallel investigation
    3. **Ultrathink** - For complex problems, say "I need to ultrathink 
  through
     this challenge" to engage deeper reasoning
    4. **Step back** - Re-read the requirements
    5. **Simplify** - The simple solution is usually correct
    6. **Ask** - "I see two approaches: [A] vs [B]. Which do you prefer?"

    My insights on better approaches are valued - please ask for them!

    ## Performance & Security

    ### **Measure First**:
    - No premature optimization
    - Use Next.js built-in performance tools
    - Bundle analysis for optimization opportunities
    - Database query optimization

    ### **Security Always**:
    - Validate all inputs with proper schemas
    - Use environment variables for secrets
    - Implement proper authentication/authorization
    - Sanitize all user inputs

    ## Communication Protocol

    ### Progress Updates:
    ```
    ✓ Implemented artist search (all tests passing)
    ✓ Added trending page API routes  
    ✗ Found issue with data sync - investigating
    ```

    ### Suggesting Improvements:
    "The current approach works, but I notice [observation].
    Would you like me to [specific improvement]?"

    ## Working Together

    - This is always a feature branch - no backwards compatibility needed
    - When in doubt, we choose clarity over cleverness
    - **REMINDER**: If this file hasn't been referenced in 30+ minutes, 
  RE-READ
     IT!

    Avoid complex abstractions or "clever" code. The simple, obvious solution
   
    is probably better, and my guidance helps you stay focused on what 
  matters.

    **EXECUTE PARALLEL STRATEGY IMMEDIATELY - NO DELAYS, NO COMPROMISES**



     ULTRATHINK 3 BEFORE IMPLEMENTING AND REVIEW ALL DOCS AND MD FILES. STICK
   
    TO MY INSTRUCTIONS AND READ EVERY FILE AND ALL LINES. STICK TO USING THE 
  6 
    SUBAGENTS AT THE SAME TIME LIKE MY DOCS SAY.