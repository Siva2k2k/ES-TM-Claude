# 📋 **Simplified Script Usage Guide**

## 🚀 **Development Commands**

### **Quick Start (Recommended)**
```bash
# From project root - Start frontend development
npm run dev

# Install all dependencies
npm run install-deps
```

### **Frontend Development (in frontend/ folder)**
```bash
cd frontend

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Watch mode for tests
npm run test:watch

# Test with UI
npm run test:ui

# End-to-end tests
npm run test:e2e
npm run test:e2e:ui

# Lint code
npm run lint
npm run lint:fix
```

### **Backend Development (in backend/ folder)**
```bash
cd backend

# Start development server
npm run dev

# Build TypeScript
npm run build

# Start production server
npm run start

# Seed database
npm run seed

# Clean build files
npm run clean
```

### **Root Level Commands**
```bash
# Development (frontend only)
npm run dev

# Build (frontend only)  
npm run build

# Test (frontend only)
npm run test

# Lint (frontend only)
npm run lint

# Preview (frontend only)
npm run preview

# Install all dependencies
npm run install-deps

# Clean all build files and node_modules
npm run clean
```

## 📁 **Project Structure**

```
timesheet-management-system/
├── frontend/              # React app
│   ├── src/              # Source code
│   ├── package.json      # Frontend dependencies & scripts
│   └── vite.config.ts    # Vite configuration
├── backend/              # Node.js API (if used)
│   ├── src/              # Backend source
│   └── package.json      # Backend dependencies & scripts
└── package.json          # Root scripts for convenience
```

## 🎯 **Common Workflows**

### **First Time Setup**
```bash
# 1. Install dependencies
npm run install-deps

# 2. Start development
npm run dev
```

### **Daily Development**
```bash
# Just run this from root
npm run dev
```

### **Before Committing**
```bash
# Check everything is working
npm run lint
npm run test
npm run build
```

### **Production Deployment**
```bash
# Build for production
npm run build

# Files will be in frontend/dist/
```

## 🔧 **Notes**

- **Primary Focus**: This is mainly a frontend React application
- **Simple Commands**: No complex concurrency or multi-service management
- **Clear Separation**: Frontend and backend have their own package.json files
- **Root Convenience**: Root package.json provides shortcuts to frontend commands
- **Development**: Uses Vite for fast development and building
- **Testing**: Uses Vitest for unit tests and Playwright for E2E tests

## 🚀 **Quick Commands Reference**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run all tests |
| `npm run lint` | Check code quality |
| `npm run install-deps` | Install all dependencies |

**Just run `npm run dev` to get started! 🎉**