# Project Restructuring Migration Guide

## 🔄 **What Changed**

The project has been restructured from a single-directory frontend application to a production-ready full-stack monorepo structure.

### **Before Structure**

```
ES-TM Claude/
├── src/
├── public/
├── package.json
├── vite.config.ts
└── ... (configuration files)
```

### **After Structure**

```
timesheet-management-system/
├── frontend/            # React app moved here
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/             # Existing backend
├── docs/                # Documentation
├── package.json         # Root workspace config
└── docker-compose.yml   # Multi-service setup
```

## 📁 **File Movements**

### **Moved to Frontend**

- `src/` → `frontend/src/`
- `public/` → `frontend/public/`
- `package.json` → `frontend/package.json`
- `vite.config.ts` → `frontend/vite.config.ts`
- `tsconfig.*.json` → `frontend/tsconfig.*.json`
- `tailwind.config.js` → `frontend/tailwind.config.js`
- `eslint.config.js` → `frontend/eslint.config.js`
- `__tests__/` → `frontend/__tests__/`

### **Organized Within Frontend**

- `src/components/LoginForm.tsx` → `frontend/src/components/forms/LoginForm.tsx`
- `src/components/EmployeeDashboard.tsx` → `frontend/src/pages/EmployeeDashboard.tsx`
- `src/components/ManagementDashboard.tsx` → `frontend/src/pages/ManagementDashboard.tsx`
- `src/contexts/` → `frontend/src/store/contexts/`

### **Documentation**

- `README.md` → `docs/README.md`
- `TESTING_OVERVIEW.md` → `docs/TESTING_OVERVIEW.md`

## 🔧 **Import Path Updates**

### **New Path Aliases Available**

```typescript
// Before
import { useAuth } from "./contexts/AuthContext";
import LoginForm from "./components/LoginForm";
import { validateTimesheet } from "./utils/timesheetValidation";

// After
import { useAuth } from "@store/contexts/AuthContext";
import LoginForm from "@components/forms/LoginForm";
import { validateTimesheet } from "@utils/timesheetValidation";
```

### **Available Aliases**

- `@/` → `./src/`
- `@components/` → `./src/components/`
- `@pages/` → `./src/pages/`
- `@layouts/` → `./src/layouts/`
- `@hooks/` → `./src/hooks/`
- `@services/` → `./src/services/`
- `@store/` → `./src/store/`
- `@utils/` → `./src/utils/`
- `@types/` → `./src/types/`
- `@lib/` → `./src/lib/`

## 📦 **Package Management**

### **Root Level Commands**

```bash
# Development
npm run dev                 # Start both frontend & backend
npm run dev:frontend        # Frontend only
npm run dev:backend         # Backend only

# Building
npm run build              # Build both
npm run build:frontend     # Frontend only
npm run build:backend      # Backend only

# Testing
npm run test               # Run all tests
npm run test:frontend      # Frontend tests
npm run test:backend       # Backend tests

# Installation
npm run install:all        # Install all dependencies
```

### **Frontend Specific**

```bash
cd frontend
npm run dev                # Vite dev server
npm run build              # Production build
npm run test:unit          # Unit tests
npm run test:component     # Component tests
npm run test:e2e           # E2E tests
```

## 🐳 **Docker & Deployment**

### **New Docker Setup**

```bash
# Full stack with Docker Compose
npm run docker:build       # Build all services
npm run docker:up          # Start all services
npm run docker:down        # Stop all services
```

### **Individual Services**

```bash
# Frontend only
cd frontend
docker build -t timesheet-frontend .
docker run -p 3000:3000 timesheet-frontend

# Backend only
cd backend
docker build -t timesheet-backend .
docker run -p 5000:5000 timesheet-backend
```

## ⚙️ **Configuration Updates**

### **Environment Variables**

**Frontend (`.env` in `frontend/`):**

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
VITE_API_URL=http://localhost:5000/api
```

**Backend (`.env` in `backend/`):**

```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/timesheet-db
JWT_ACCESS_SECRET=your-secret
FRONTEND_URL=http://localhost:3000
```

### **TypeScript Configuration**

Path mapping has been added to both frontend and backend for cleaner imports:

**Frontend (`tsconfig.app.json`):**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@pages/*": ["./src/pages/*"]
    }
  }
}
```

## 🚨 **Breaking Changes**

### **Import Statements**

All relative imports need to be updated to use the new path aliases:

```typescript
// ❌ Old (will break)
import Component from "../components/Component";
import { service } from "../../services/service";

// ✅ New (recommended)
import Component from "@components/Component";
import { service } from "@services/service";
```

### **File Locations**

Components have been reorganized by purpose:

```typescript
// ❌ Old locations
import LoginForm from "@components/LoginForm";
import EmployeeDashboard from "@components/EmployeeDashboard";

// ✅ New locations
import LoginForm from "@components/forms/LoginForm";
import EmployeeDashboard from "@pages/EmployeeDashboard";
```

### **Build Commands**

Scripts have changed to support the monorepo structure:

```bash
# ❌ Old commands (at root)
npm run dev
npm run build

# ✅ New commands
npm run dev:frontend      # or cd frontend && npm run dev
npm run build:frontend    # or cd frontend && npm run build

# ✅ Or run both
npm run dev              # Runs both frontend & backend
```

## 🔧 **Migration Steps**

### **For Developers**

1. **Pull latest changes**

   ```bash
   git pull origin main
   ```

2. **Install dependencies**

   ```bash
   npm run install:all
   ```

3. **Set up environment files**

   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   # Edit with your values
   ```

4. **Update IDE settings**

   - Update path mappings in your IDE
   - Set working directory to `frontend/` for frontend development

5. **Start development**
   ```bash
   npm run dev              # Both services
   # Or separately:
   npm run dev:frontend     # Frontend only
   npm run dev:backend      # Backend only
   ```

### **For CI/CD**

Update deployment scripts to:

1. Build frontend: `cd frontend && npm run build`
2. Build backend: `cd backend && npm run build`
3. Use Docker Compose for deployment

## 📋 **Benefits**

✅ **Better Organization** - Clear separation of frontend/backend
✅ **Scalable Structure** - Easy to add new services
✅ **Type Safety** - Path aliases prevent import errors
✅ **Production Ready** - Docker containerization
✅ **Developer Experience** - Hot reloading, better tooling
✅ **Testing** - Organized test structure
✅ **Deployment** - Multi-service Docker setup

## 🆘 **Troubleshooting**

### **Common Issues**

**Module not found errors:**

```bash
# Delete node_modules and reinstall
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install:all
```

**TypeScript path errors:**

- Restart TypeScript server in your IDE
- Check `tsconfig.app.json` path mappings

**Build failures:**

- Check environment variables are set
- Ensure all dependencies are installed

**Port conflicts:**

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: http://localhost:27017

Need help? Check the [main README](../README.md) or create an issue.
