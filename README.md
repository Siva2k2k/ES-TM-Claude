# Timesheet Management System

A production-ready full-stack timesheet management application built with React, TypeScript, Node.js, and MongoDB.

## 🏗️ **Project Structure**

```
timesheet-management-system/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── forms/       # Form components
│   │   │   └── ui/          # Basic UI components
│   │   ├── pages/           # Page components (route components)
│   │   ├── layouts/         # Layout components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service layer
│   │   ├── store/           # State management (Context providers)
│   │   │   └── contexts/    # React Context providers
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript type definitions
│   │   ├── lib/             # External library configurations
│   │   └── tests/           # Test utilities
│   ├── public/              # Static assets
│   ├── __tests__/           # Test files
│   │   ├── component/       # Component tests
│   │   ├── e2e/            # End-to-end tests
│   │   ├── integration/     # Integration tests
│   │   └── unit/           # Unit tests
│   ├── package.json
│   ├── vite.config.ts       # Vite configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── tailwind.config.js   # Tailwind CSS configuration
├── backend/                  # Node.js TypeScript API
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route handlers
│   │   ├── dbrepo/          # Database operations
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # Database schemas
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic layer
│   │   ├── types/           # TypeScript definitions
│   │   ├── utils/           # Helper functions
│   │   └── validators/      # Input validation schemas
│   ├── package.json
│   └── tsconfig.json
├── docs/                     # Project documentation
├── package.json              # Root workspace configuration
├── docker-compose.yml        # Multi-service orchestration
└── README.md                 # Project overview
```

## 🚀 **Quick Start**

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd timesheet-management-system
   ```

2. **Install dependencies**

   ```bash
   npm run install:all
   ```

3. **Set up environment variables**

   ```bash
   # Frontend (.env in frontend/)
   cp frontend/.env.example frontend/.env

   # Backend (.env in backend/)
   cp backend/.env.example backend/.env
   ```

4. **Start development servers**

   ```bash
   # Start both frontend and backend
   npm run dev

   # Or start individually
   npm run dev:frontend
   npm run dev:backend
   ```

## 📁 **Folder Organization**

### **Frontend Structure**

- **`components/`** - Reusable UI components
  - `forms/` - Form-specific components (LoginForm, etc.)
  - `ui/` - Basic UI components (buttons, inputs, etc.)
- **`pages/`** - Route-level components
  - Dashboard components, main app pages
- **`layouts/`** - Application layout components
  - `MainLayout.tsx` - Main app layout with sidebar/header
  - `AuthLayout.tsx` - Authentication pages layout
- **`hooks/`** - Custom React hooks
  - `useRoleManager.ts` - Role management hook
- **`services/`** - API communication layer
  - Service classes for different domains
- **`store/`** - State management
  - `contexts/` - React Context providers
- **`utils/`** - Utility functions and helpers
  - `timesheetValidation.ts` - Business logic utilities
- **`types/`** - TypeScript type definitions
  - Centralized type definitions

### **Backend Structure**

- **`controllers/`** - HTTP request handlers
- **`services/`** - Business logic layer
- **`dbrepo/`** - Database access layer
- **`models/`** - Database schemas
- **`routes/`** - API route definitions
- **`middleware/`** - Custom middleware functions
- **`validators/`** - Input validation schemas
- **`utils/`** - Helper functions
- **`types/`** - TypeScript type definitions

## 🛠️ **Development**

### **Path Aliases**

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Frontend aliases
import Component from "@components/Component";
import { useHook } from "@hooks/useHook";
import { ApiService } from "@services/ApiService";
import type { User } from "@types/index";

// Backend aliases
import { Controller } from "@controllers/Controller";
import { Service } from "@services/Service";
import { Model } from "@models/Model";
```

### **Available Scripts**

```bash
# Root level commands
npm run dev                 # Start both frontend and backend
npm run build              # Build both frontend and backend
npm run test               # Run all tests
npm run lint               # Lint all code
npm run clean              # Clean all build artifacts

# Frontend specific
npm run dev:frontend       # Start frontend dev server
npm run build:frontend     # Build frontend for production
npm run test:frontend      # Run frontend tests

# Backend specific
npm run dev:backend        # Start backend dev server
npm run build:backend      # Build backend for production
npm run test:backend       # Run backend tests

# Docker
npm run docker:build       # Build Docker images
npm run docker:up          # Start with Docker Compose
npm run docker:down        # Stop Docker containers
```

### **Testing**

```bash
# Frontend tests
cd frontend
npm run test:unit          # Unit tests
npm run test:component     # Component tests
npm run test:e2e           # End-to-end tests with Playwright
npm run test:e2e:ui        # E2E tests with UI

# Backend tests
cd backend
npm test                   # Run backend tests
```

## 🔧 **Configuration**

### **TypeScript Configuration**

- **Frontend**: Uses Vite with path mapping for clean imports
- **Backend**: Uses ts-node with module aliases

### **Build Tools**

- **Frontend**: Vite for fast builds and HMR
- **Backend**: TypeScript compiler with nodemon for development

### **Styling**

- **Tailwind CSS** for utility-first styling
- **PostCSS** for CSS processing

## 🐳 **Docker Deployment**

```bash
# Build and start with Docker Compose
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up --build
```

## 📚 **Key Features**

- ✅ **Full-stack TypeScript** - End-to-end type safety
- ✅ **Monorepo structure** - Organized workspace with proper separation
- ✅ **Path aliases** - Clean import statements
- ✅ **Hot reloading** - Fast development experience
- ✅ **Comprehensive testing** - Unit, integration, and E2E tests
- ✅ **Production ready** - Docker containerization
- ✅ **Modern tooling** - Vite, ESLint, Prettier, Playwright

## 🤝 **Contributing**

1. Follow the established folder structure
2. Use TypeScript path aliases for imports
3. Write tests for new features
4. Follow the existing code style
5. Update documentation as needed

## 📄 **License**

[Add your license information here]
