# MYSETLIST WEB APP - PRODUCT REQUIREMENTS DOCUMENT

## PROJECT OVERVIEW

MySetlist is a setlist voting web application that enables users to search for artists, view their shows, and interact with setlists and song catalogs. The application requires a complete finalization with **world-class engineering and design quality** while maintaining strict adherence to **next-forge architecture patterns**. This PRD mandates **ULTRATHINKING** every decision 3x before implementation and deploying **6 specialized sub-agents in parallel** to ensure rapid, high-quality completion.

**CORE MISSION**: Transform MySetlist into a seamless, production-ready application representing the pinnacle of modern web development with zero compromises on quality, performance, or user experience.

## CORE FEATURES

### 1. NAVIGATION & ROUTING SYSTEM (**SUB-AGENT 1**)
- **CRITICAL FIX**: Eliminate all top navigation crashes immediately
- Implement bulletproof next-forge routing patterns
- Ensure seamless page transitions with proper error boundaries
- Create crash-free navigation throughout entire application
- **ULTRATHINK**: Audit every route and navigation component 3x

### 2. COMPREHENSIVE DATA SYNC SYSTEM (**SUB-AGENT 2**)
- **CRITICAL FIX**: Complete artist/show/venue/song catalog synchronization
- **API CONSOLIDATION**: Remove apps/api folder, migrate all sync functionality to apps/web/app/api
- Automated data import when artist is clicked in search results
- Fully operational cron jobs and sync functions within unified API structure
- Database population according to mysetlist-docs specifications
- **ULTRATHINK**: Validate entire sync pipeline works with consolidated API architecture

### 3. TRENDING PAGE FUNCTIONALITY (**SUB-AGENT 3**)
- **CRITICAL FIX**: Resolve trending page data loading failures
- **API INTEGRATION**: Implement trending endpoints within apps/web/app/api structure
- Implement proper data fetching using next-forge patterns
- Display current trending data with algorithms
- Unified API endpoints serving trending content from consolidated structure
- **ULTRATHINK**: Review all database queries and data flow with new API architecture

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
- **API Structure**: **CRITICAL CHANGE** - Remove separate API app from apps folder, consolidate ALL API functionality into apps/web/app/api routes
- **Styling**: Tailwind CSS with design system implementation
- **Database**: Existing ORM configurations with proper schema validation
- **TypeScript**: 100% type safety throughout codebase
- **Testing**: Comprehensive unit tests with accessibility testing
- **Performance**: Bundle optimization and load time targets

### API Consolidation Requirements
- **IMPERATIVE**: Eliminate apps/api folder completely
- **ULTRATHINK**: Migrate all API functionality to apps/web/app/api structure
- Ensure all database operations use unified API routes within web app
- Maintain next-forge patterns for API route organization
- Validate all sync functions work with consolidated API structure

### Development Methodology
- **ULTRATHINKING**: Every decision analyzed 3x before implementation
- **Parallel Development**: 6 specialized sub-agents working simultaneously
- **Code Conflict Prevention**: Clear domain boundaries and coordination protocols
- **Quality Gates**: Continuous validation at each implementation phase

### Sub-Agent Coordination Requirements
1. **Navigation Agent**: Route handlers, middleware, layout files only
2. **Database Agent**: **UPDATED SCOPE** - Database models, sync utilities, cron jobs, AND consolidation of apps/api into apps/web/app/api structure
3. **Frontend Data Agent**: **UPDATED SCOPE** - Unified API routes within apps/web/app/api, data hooks, state management, server actions
4. **UI Component Agent**: React components, styling, design system only
5. **Artist/Show Page Agent**: Page components, data binding logic, user flow implementation only
6. **Performance Agent**: Config files, environment setup, optimization, build process only

### API Consolidation Mandate
- **SUB-AGENT 2 & 3 COORDINATION**: Remove entire apps/api folder and migrate ALL functionality to apps/web/app/api
- **ULTRATHINK**: Ensure zero functionality loss during API consolidation
- Validate all existing API endpoints are properly migrated to unified structure
- Test all sync operations work with new API architecture
- Maintain next-forge API route patterns and conventions

## SUCCESS CRITERIA

### Functional Requirements
- **Zero navigation crashes** - All routes and links function perfectly
- **Complete data sync flow** - Artist click → full data synchronization → display
- **Trending page loads data** - Real-time trending content display
- **Artist pages show all data** - Shows, setlists, song catalogs fully populated
- **Seamless user journey** - Search → artist → show → setlist flow works flawlessly
- **API consolidation complete** - Single unified API structure in apps/web/app/api

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
**IMPERATIVE**: Deploy specialized agents in parallel with strict domain boundaries

#### COORDINATION CHECKPOINTS
1. **Initial Audit Phase**: All agents report findings and plan
2. **API Consolidation Phase**: Sub-Agents 2 & 3 coordinate apps/api removal
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

**EXECUTE PARALLEL STRATEGY IMMEDIATELY - NO DELAYS, NO COMPROMISES**


# 🔍 **ULTRATHINK 3x COMPREHENSIVE ANALYSIS** 
# MySetlist Web App - Critical Issues & Implementation Gaps

---

## 📋 **EXECUTIVE SUMMARY**

After exhaustive analysis of the codebase, documentation, database schema, and current status, I've identified **9 critical categories** of issues requiring immediate attention. The app has **substantial infrastructure** in place but suffers from **performance bottlenecks**, **incomplete features**, and **technical debt** that prevent production readiness.

---

## 🚨 **CRITICAL ISSUES REQUIRING IMMEDIATE FIX**

### 1. **NAVIGATION & USER EXPERIENCE FAILURES**

#### **Logo Not Linked to Homepage** ⚠️
- **Location**: `apps/web/app/components/header/index.tsx:127-130`
- **Issue**: Logo is just an Image component, not wrapped in Link
- **Fix Required**: 
```tsx
<Link href="/" className="flex items-center gap-2">
  <Image src={Logo} alt="Logo" width={24} height={24} className="dark:invert" />
  <p className="whitespace-nowrap font-semibold">MySetlist</p>
</Link>
```

#### **Auth Navigation Visibility** ⚠️
- **Issue**: Sign-in/Sign-up only visible in user menu dropdown, not prominent in main nav
- **Impact**: Poor UX for new users
- **Solution**: Add auth buttons to main header when user not authenticated

#### **Page Route Failures** 🔥
- **Status**: `/shows` and `/artists` returning 404s according to CURRENTSTATUS.md
- **Root Cause**: Unknown - requires investigation
- **Files Exist**: Components and pages are present but not accessible

### 2. **PERFORMANCE BOTTLENECKS** 🔥

#### **App Slower Than Next-Forge Starter**
- **Symptoms**: Navigation lag, slow page loads
- **Potential Causes**:
  - Unoptimized database queries
  - Missing React.memo() on heavy components
  - Excessive re-renders
  - Large bundle sizes
  - Service worker cache conflicts

#### **Service Worker Cache Issues**
- **Problem**: Legacy PWA service worker causing stale content
- **Status**: Partial fix implemented (`DisableServiceWorker` component)
- **Remaining**: Some users still affected, need cache invalidation strategy

### 3. **TECHNICAL DEBT AVALANCHE** 🔥

#### **TypeScript Errors** 
- **Scale**: "Hundreds of tsc errors across mono-repo"
- **Priority Areas**:
  1. `packages/database` - Core functionality
  2. `packages/auth` - Security critical
  3. `apps/web` pages - User-facing

#### **Critical Dependency Warnings**
- **Issue**: Webpack/Next warnings for OpenTelemetry imports
- **Impact**: Build performance, potential production issues
- **Status**: "Benign but should be silenced before prod"

#### **Environment Schema Misalignment**
- **Problem**: `packages/*/env.ts` out of sync with `.env.example`
- **Command Exists**: `pnpm check-env` script
- **Action Required**: Run validation and update schemas

### 4. **BROKEN TEST INFRASTRUCTURE** 🔥

#### **Cypress & React Testing Library Failures**
- **Root Cause**: Tests reference removed Clerk authentication flows
- **Impact**: No quality assurance coverage
- **Scope**: "Many tests" need rewrite for Supabase Auth
- **Blocking**: CI/CD pipeline effectiveness

### 5. **BUILD SYSTEM INSTABILITY** ⚠️

#### **Cache Corruption Issues**
- **Symptoms**: Missing chunks `zod@3.25.71.js`, `./8258.js` after hot-reload
- **Current Fix**: Manual `rm -rf apps/web/.next` and restart
- **Needed**: Automated cache management in CI/CD

#### **Apps/API Consolidation Status**
- **Requirement**: Remove `apps/api` folder, migrate to `apps/web/app/api`
- **Status**: Unclear completion - needs verification
- **Risk**: Duplicate API endpoints, deployment confusion

---

## 📊 **DATABASE & BACKEND STATUS**

### ✅ **EXCELLENT: Database Schema**
- **20+ Tables**: Comprehensive schema with proper relationships
- **Core Entities**: users, artists, venues, shows, songs, setlists, votes
- **Advanced Features**: artist_stats, email system, user_profiles, show_comments
- **External IDs**: Proper integration fields for Spotify, Ticketmaster, SetlistFM

### ✅ **GOOD: Authentication System**
- **Supabase Auth**: Properly configured with email/password + OAuth
- **Auth Pages**: Complete set exists (`/auth/sign-in`, `/auth/sign-up`, etc.)
- **Providers**: Auth and Realtime providers implemented
- **Security**: Row Level Security enabled

### ⚠️ **PARTIAL: API Integrations**
- **Environment**: All API keys configured (Spotify, Ticketmaster, SetlistFM)
- **Documentation**: Comprehensive integration docs exist
- **Implementation**: Unknown completion status of actual API calls

---

## 🎨 **FRONTEND COMPONENT STATUS**

### ✅ **IMPLEMENTED: Core UI Components**
- **Design System**: Tailwind + shadcn/ui components properly configured
- **Color Scheme**: Black, white, dark grey gradients ([[memory:2512991]])
- **Layout**: Header, Footer, Navigation working
- **Mobile**: Comprehensive mobile navigation with auth

### ⚠️ **NEEDS REVIEW: Page Components**
- **Files Exist**: Artist and show page components present
- **404 Issue**: Routes not accessible despite component existence
- **Investigation**: Requires routing/build configuration check

### ❌ **MISSING: Performance Optimizations**
- **React.memo()**: Heavy components need memoization
- **Image Optimization**: Verify Next.js Image component usage
- **Code Splitting**: Bundle analysis needed
- **Lazy Loading**: Component lazy loading strategy

---

## 🔧 **SUPABASE INTEGRATION ANALYSIS**

### ✅ **EXCELLENT: Database Structure**
Based on MCP analysis, the Supabase database is **fully operational** with:
- **Users Table**: Complete with roles, verification, timestamps
- **Artists Table**: Rich metadata, Spotify integration, trending scores
- **Venues Table**: Geographic data, capacity, amenities
- **Shows Table**: Complete event management, ticket integration
- **Voting System**: Comprehensive setlist voting with vote aggregation
- **Email System**: Full email queue, preferences, logs

### ✅ **GOOD: Real-time Features**
- **RealtimeProvider**: Implemented in layout
- **RealtimeStatus**: Component showing connection status
- **Subscriptions**: Ready for live voting updates

---

## 🚀 **INFRASTRUCTURE & DEPLOYMENT**

### ✅ **GOOD: Monorepo Structure**
- **Next-Forge**: Proper package organization
- **Build System**: Turborepo configuration
- **Package Isolation**: Clean dependencies

### ⚠️ **NEEDS ATTENTION: CI/CD Pipeline**
- **Build Failures**: Cache issues affecting CI
- **Test Coverage**: No passing test suite
- **Lighthouse Requirement**: ≥90 score target not verified

---

## 📋 **PRIORITIZED ACTION PLAN**

### **PHASE 1: Critical Fixes (Week 1)**

1. **Fix Logo Navigation** (30 minutes)
   - Wrap logo in Link component
   - Test homepage routing

2. **Investigate Page 404s** (2-4 hours)
   - Debug `/shows` and `/artists` routing
   - Check build configuration
   - Verify Next.js app router setup

3. **Performance Investigation** (1-2 days)
   - Run Lighthouse audit
   - Profile React components
   - Analyze bundle size
   - Implement React.memo() on heavy components

4. **Service Worker Cleanup** (4 hours)
   - Verify DisableServiceWorker component effectiveness
   - Add cache invalidation strategy
   - Test across different browsers

### **PHASE 2: Technical Debt (Week 2)**

1. **TypeScript Error Resolution**
   - Package-by-package cleanup
   - Priority: database → auth → web pages
   - Target: Zero tsc errors

2. **Test Suite Recovery**
   - Rewrite Cypress tests for Supabase Auth
   - Update RTL tests
   - Establish CI/CD testing pipeline

3. **Environment Schema Alignment**
   - Run `pnpm check-env`
   - Update misaligned schemas
   - Document environment setup

### **PHASE 3: Feature Completion (Week 3-4)**

1. **API Integration Verification**
   - Test Spotify API calls
   - Verify Ticketmaster integration
   - Confirm SetlistFM data sync

2. **Performance Optimization**
   - Bundle analysis and optimization
   - Image optimization audit
   - Code splitting implementation

3. **Production Readiness**
   - Security audit
   - Accessibility compliance (a11y ≥90)
   - Final Lighthouse optimization

---

## 🎯 **SUCCESS METRICS**

### **Technical Targets**
- ✅ **Lighthouse Score**: ≥90 overall
- ✅ **Largest Contentful Paint**: <2.5 seconds  
- ✅ **TypeScript Errors**: Zero across monorepo
- ✅ **Test Coverage**: ≥90% for new code
- ✅ **Build Process**: Zero errors/warnings

### **User Experience Targets**
- ✅ **Navigation**: Instant page transitions
- ✅ **Authentication**: Seamless Spotify OAuth
- ✅ **Mobile Experience**: Native app-like performance
- ✅ **Accessibility**: a11y score ≥90

---

## 🏁 **CONCLUSION**

The MySetlist application has **excellent foundational architecture** with a comprehensive database schema, proper authentication system, and solid component structure. However, **critical performance issues**, **broken routing**, and **substantial technical debt** prevent it from being production-ready.

The **most urgent priorities** are:
1. Fix navigation and routing failures
2. Resolve performance bottlenecks  
3. Clean up TypeScript errors
4. Restore test infrastructure

With focused effort on these issues, the application can reach production readiness within **3-4 weeks** of dedicated development work.