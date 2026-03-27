# Neonix Performance Profiling & Optimization

## Overview

This document outlines the performance profiling and optimization measures implemented in the Neonix chat application. The goal is to monitor and improve the efficiency of both backend API operations and frontend rendering.

## Profiling Tools & Metrics

### Backend Profiling

#### HTTP Request Timing
- **Tool**: Custom NestJS interceptor (`HttpTimingInterceptor`)
- **Location**: `backend/src/common/interceptors/http-timing.interceptor.ts`
- **Metrics**: Request duration in milliseconds
- **Log Format**: `[HTTP] METHOD /path - XX.XXms`
- **Coverage**: All HTTP endpoints

#### Database Query Logging
- **Tool**: Prisma built-in logging
- **Configuration**: `log: ['query', 'warn', 'error']` in `PrismaService`
- **Metrics**: Query execution details, warnings, errors
- **Coverage**: All Prisma operations

#### Service Method Profiling
- **Tool**: `performance.now()` timing
- **Location**: `ChatService` methods
- **Metrics**:
  - Execution time in milliseconds
  - Memory usage (heapUsed, rss in MB) for `listMessages`
- **Log Format**: `[PERF] methodName took XX.XXms`
- **Coverage**: `listRooms`, `listChannels`, `listMessages`, `sendMessage`

### Frontend Profiling

#### React Rendering Profiling
- **Tool**: `React.Profiler`
- **Location**: Chat page message area
- **Metrics**: Render duration, phase (mount/update)
- **Log Format**: `[React] componentId phase XX.XXms`
- **Coverage**: Message list rendering

## Optimizations Implemented

### Backend Optimizations

#### 1. Database Query Optimization
- **Pagination**: Added `take: 50` limit to message queries (configurable via `?limit` query param)
- **Field Selection**: Select only required fields (`id`, `who`, `text`, `time`, `me`, `createdAt`) in `listMessages`
- **Index Enhancement**: Added composite index `@@index([roomId, channelId, createdAt])` for efficient message sorting and filtering

#### 2. Memory Monitoring
- Added memory usage logging for critical operations to detect potential memory leaks

### Frontend Optimizations

#### 1. Component Memoization
- **MessageItem**: Extracted message rendering into `React.memo` component to prevent unnecessary re-renders
- **Dependencies**: Memoized based on message content and sender status

#### 2. Hook Optimizations
- **useCallback**: Applied to event handlers (`send`, `onDraftKeyDown`, `onDraftChange`) to prevent child component re-renders
- **useMemo**: Already in place for `visibleMessages`, `meName`, `viewState`, `room`, `typingLine`

#### 3. State Management
- Localized state updates to minimize re-render cascades

## Hotspots Identified

### Backend
- Message listing operations (potential for high data volume)
- Database queries during peak usage

### Frontend
- Message list rendering during rapid message updates
- WebSocket event handling

## Performance Benchmarks

*To be filled after running the application with real data:*

| Operation | Before (ms) | After (ms) | Improvement |
|-----------|-------------|------------|-------------|
| GET /rooms | - | - | - |
| GET /rooms/:id/channels | - | - | - |
| GET /rooms/:id/channels/:cid/messages | - | - | - |
| POST /rooms/:id/channels/:cid/messages | - | - | - |
| Frontend message list render | - | - | - |

## How to Monitor Performance

### Backend
1. Start the application in development mode
2. Check console logs for `[HTTP]`, `[PERF]`, and Prisma query logs
3. Monitor memory usage in `[PERF]` logs for `listMessages`

### Frontend
1. Open browser developer tools
2. Navigate to chat page
3. Check console for `[React]` profiling logs during interactions

## Commands to Run After Changes

```bash
# Backend
cd backend
npm run lint
npm run build
npx prisma generate
npx prisma migrate dev --name add_message_perf_index

# Frontend
cd frontend
npm run lint
npm run build
```

## Future Optimizations

- Implement caching for frequently accessed data (rooms, channels)
- Add APM (Application Performance Monitoring) integration
- Optimize WebSocket message handling
- Implement virtual scrolling for large message lists
- Add database connection pooling monitoring