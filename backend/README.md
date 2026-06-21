# Planora Backend

Thư mục chứa toàn bộ **business logic, services, repositories, và middleware** của hệ thống Planora.

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.ts          # Supabase client (anon + admin/service_role)
│   ├── types/
│   │   └── index.ts             # Shared types (User, Project, Task, Sprint, ...)
│   ├── middleware/
│   │   └── rbacMiddleware.ts    # RBAC: permission definitions & enforcement
│   ├── repositories/            # Data Access Layer — queries DB trực tiếp
│   │   ├── userRepository.ts
│   │   ├── projectRepository.ts
│   │   └── taskRepository.ts
│   ├── services/                # Business Logic Layer — orchestrate repositories
│   │   ├── adminService.ts      # Admin: user mgmt, project mgmt, stats
│   │   ├── authService.ts       # Auth: role check, token validation
│   │   ├── activityService.ts   # Activity logs (read & write)
│   │   ├── invitationService.ts # Invitation flow: send → accept → reject
│   │   ├── notificationService.ts # Notification CRUD
│   │   ├── projectService.ts    # Project CRUD + member management
│   │   ├── sprintService.ts     # Sprint create & end
│   │   └── taskService.ts       # Task CRUD + comments + attachments
│   └── index.ts                 # Barrel export
├── package.json
├── tsconfig.json
└── .env.example
```

## Phân công nhiệm vụ

| Layer | Trách nhiệm | Dev |
|-------|-------------|-----|
| `config/` | Kết nối DB | Backend |
| `types/` | Shared interfaces | Backend |
| `middleware/` | RBAC, Auth guards | Backend |
| `repositories/` | SQL queries, data mapping | Backend |
| `services/` | Business logic, orchestration | Backend |
| `frontend/src/hooks/` | UI state, React lifecycle | Frontend |
| `frontend/src/components/` | UI rendering | Frontend |

## Setup

```bash
cd backend
cp .env.example .env
# Điền SUPABASE_URL, SUPABASE_ANON_KEY
npm install
npm run typecheck
```

## Kiến trúc

```
Frontend (React)
     │
     │  (gọi trực tiếp Supabase SDK hoặc qua API)
     ▼
Backend Services (business logic)
     │
     ▼
Backend Repositories (data access)
     │
     ▼
Supabase (PostgreSQL + Auth + Storage + Realtime)
```

## Quy tắc quan trọng

1. **Repositories** chỉ được chứa DB queries, không có business logic
2. **Services** chứa business logic, gọi repositories và các services khác
3. **Middleware** được gọi trong services để enforce permissions
4. **KHÔNG** commit file `.env` — chỉ commit `.env.example`
5. **SUPABASE_SERVICE_ROLE_KEY** chỉ dùng ở backend, **không bao giờ expose ra frontend**

## Các tính năng được quản lý

- Authentication (login, register, logout, RBAC)
- Project CRUD + Member management
- Task CRUD + Comments + Attachments
- Sprint management (create, end)
- Invitation flow (send, accept, reject)
- Notification management
- Activity logging
- Admin: user management, system stats

## Liên quan

- **Frontend**: `../frontend/` — UI components, React hooks (UI state only)
- **Supabase**: `../supabase/` — migrations, Edge Functions (AI features)
- **Edge Functions**: `../supabase/functions/` — AI chat, enhance description, estimate time, email invitations
