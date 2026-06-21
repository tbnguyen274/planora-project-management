# Planora - Project Management System

## Project Overview

This repository contains the code and documentation for the Intro to Software Engineering Group 6 project. The project focuses on developing **Planora** - a user-friendly, efficient, and AI-powered project management tool that supports both Kanban and Scrum methodologies.

## Project Structure

```
planora-project-management/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/    # React UI components
│   │   │   ├── admin/     # Admin dashboard
│   │   │   ├── auth/      # Authentication pages
│   │   │   ├── chat/      # AI chat assistant
│   │   │   ├── dashboard/ # User dashboard
│   │   │   ├── kanban/    # Kanban board
│   │   │   ├── layout/    # Main layout
│   │   │   ├── notifications/ # Notification system
│   │   │   ├── project/   # Project details
│   │   │   ├── scrum/     # Scrum board
│   │   │   ├── settings/  # User settings
│   │   │   ├── trash/     # Trash management
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   └── routes/    # Route guards
│   │   ├── contexts/      # React Context (Auth, App state)
│   │   ├── hooks/         # Custom React hooks (UI state only)
│   │   ├── lib/           # Supabase client, utilities
│   │   ├── services/
│   │   │   └── exportService.ts  # Client-side PDF/Excel export
│   │   ├── routes/        # Route definitions (SPA routing)
│   │   ├── test/          # Unit & Integration tests
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # UI helper functions
│   ├── .env               # Frontend env vars (VITE_SUPABASE_*)
│   ├── package.json
│   ├── vitest.config.ts
│   └── vite.config.ts
│
├── backend/               # Backend logic: services, repositories, middleware
│   ├── src/
│   │   ├── types/
│   │   │   └── index.ts             # Shared backend types
│   │   ├── middleware/
│   │   │   └── rbacMiddleware.ts    # RBAC permission system
│   │   ├── repositories/            # Data Access Layer (DB queries)
│   │   │   ├── userRepository.ts
│   │   │   ├── projectRepository.ts
│   │   │   └── taskRepository.ts
│   │   ├── services/                # Business Logic Layer
│   │   │   ├── adminService.ts      # Admin: users, projects, stats
│   │   │   ├── authService.ts       # Auth: role check, token validation
│   │   │   ├── activityService.ts   # Activity log read/write
│   │   │   ├── invitationService.ts # Invitation flow
│   │   │   ├── joinRequestService.ts # Join request and project discovery
│   │   │   ├── notificationService.ts # Notification management
│   │   │   ├── projectActivityService.ts # Project activity timeline
│   │   │   ├── projectService.ts    # Project CRUD + members
│   │   │   ├── sprintService.ts     # Sprint management
│   │   │   └── taskService.ts       # Task CRUD + comments + attachments
│   │   └── index.ts                 # Public API barrel export
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── supabase/              # Supabase configuration
│   ├── functions/         # Edge Functions (AI services)
│   │   ├── chat/                  # AI chat assistant
│   │   ├── enhance-description/   # Task description enhancement
│   │   ├── estimate-time/         # Time estimation
│   │   └── send-invitation-email/ # Email invitations
│   └── migrations/        # Database migrations & RLS policies
│
├── docs/                  # Documentation
│   ├── analysis-and-design/
│   ├── management/
│   ├── requirements/
│   └── test/
│
├── vercel.json            # Vercel deployment configuration
└── pa/                    # Project assignments
```

## Tech Stack

### Frontend Framework
- **React 18.3.1** - Modern UI library with functional components and hooks
- **TypeScript 5.x** - Type-safe JavaScript for better development experience
- **Vite 6.3.5** - Lightning-fast build tool and dev server

### Routing & Navigation
- **React Router DOM 7.11.0** - Client-side routing with URL-based navigation
- Protected routes with authentication guards
- Admin routes with role-based access control

### UI Components & Styling
- **Tailwind CSS 4.1.17** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible component primitives
- **shadcn/ui** - Re-usable component library built on Radix UI
- **Lucide React** - Beautiful icon library
- **next-themes** - Dark mode support

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication (Email, OAuth)
  - Edge Functions (AI services)
  - Row Level Security (RLS)
  - Real-time subscriptions

### State Management & Data Flow
- **React Hooks** - useState, useEffect, useRef for local state
- **Context API** - AppContext, AuthContext for global state
- **Custom Hooks** - useAuth, useProjects, useTasks, useSprints, useNotifications, useJoinRequests, useProjectDiscovery

### UI Features
- **Sonner** - Toast notifications
- **React Day Picker** - Date selection
- **Recharts** - Data visualization and charts
- **Embla Carousel** - Touch-friendly carousels
- **React Resizable Panels** - Draggable panel layouts
- **React Markdown** - Markdown rendering in AI chat
- **Vaul** - Drawer components

### Form Handling
- **React Hook Form 7.55.0** - Performant form validation
- **Input OTP** - One-time password input

### Testing
- **Vitest** - Fast unit testing framework
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - Custom Jest matchers
- **jsdom** - DOM environment for tests

### Development Tools
- **@vitejs/plugin-react-swc** - Fast React refresh with SWC compiler
- **PostCSS & Autoprefixer** - CSS processing
- **ESLint & Prettier** - Code quality and formatting
- **tsx** - TypeScript execution for Node.js

## Quick Start

### Prerequisites
- **Node.js 18+** (recommended: Node 20 LTS)
- **pnpm** (recommended) or npm
- **Supabase account** for database and authentication

### PowerShell Users (Windows)
If you encounter script execution errors, run this in each new terminal:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Frontend Setup

```bash
cd frontend
pnpm install
pnpm dev
```
Frontend runs at: **http://localhost:3000**

### Environment Variables

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Available Scripts

### Frontend (`cd frontend`)
| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test` | Run unit tests with Vitest |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:ui` | Run tests with Vitest UI |

## Testing

The project uses **Vitest** for testing. Tests are located in `frontend/src/test/`.

```bash
# Run all tests
cd frontend
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests with interactive UI
pnpm test:ui
```

### Test Categories
- **Unit Tests**: Service functions, utilities, hooks
- **Integration Tests**: Component interactions, form submissions
- **Test Files**: `*.test.ts` or `*.test.tsx`

## Deployment

### Deploy to Vercel

1. **Push code to GitHub**

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Project:**
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `build`

4. **Add Environment Variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

5. Click **Deploy**

> **Note**: The `vercel.json` file is already configured with SPA routing support.

## Features

### User Features
- User authentication (register, login, password recovery)
- Dashboard with project overview and statistics
- Project discovery and join requests
- Kanban board for visual task management
- Scrum board with sprint planning
- Project member management and invitations
- AI-powered chat assistant
- AI task description enhancement
- AI time estimation for tasks
- Trash system for deleted projects/tasks
- Real-time notifications
- Export data to PDF/Excel
- User settings and profile customization
- Dark mode support

### Admin Features
- User management dashboard
- Role-based access control
- System monitoring and analytics
- Activity timeline and logs
- System settings configuration

### AI Features (Supabase Edge Functions)
- **Chat Assistant**: Interactive AI helper for project management
- **Description Enhancement**: AI-powered task description improvement
- **Time Estimation**: Intelligent task duration prediction

### Other Backend Features
- **Email Invitations**: Automated project invitation emails via Edge Function

## Documentation

### Getting Started
- [Quick Start Guide](docs/analysis-and-design/QUICK_START.md)
- [Developer Guide](docs/analysis-and-design/DEVELOPER.md)
- [Supabase Setup Guide](supabase/SETUP_GUIDE.md)
- [Supabase Setup Checklist](supabase/SETUP_CHECKLIST.md)

### Testing
- [Unit Testing Guide](docs/test/UNIT_TESTING.md)
- [Integration Testing Guide](docs/test/INTEGRATION_TESTING.md)

## License

MIT License
