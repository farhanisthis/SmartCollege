# Overview

This is a Smart College Updates Platform - a web application designed to replace chaotic WhatsApp group communication in college environments. The platform provides a structured way for Class Representatives (CRs) to create and share updates (assignments, notes, presentations, general announcements) with students in an organized, searchable format.

The system features role-based access control where CRs can create and manage updates, while students can view, search, and interact with content. Updates are automatically categorized using AI, support file attachments, and include engagement tracking through view counts and download metrics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Custom context-based auth system with session management

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Session Management**: Express sessions for authentication state
- **File Handling**: Multer for file uploads with local storage
- **Development**: Hot reload with Vite integration for seamless development experience

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Structured tables for users, updates, files, and user interaction tracking
- **Development Storage**: In-memory storage implementation for development/testing
- **Migrations**: Drizzle Kit for database schema management

## Authentication and Authorization
- **Session-based Authentication**: Server-side sessions with secure cookies
- **Role-based Access Control**: Two user roles (CR/student) with different permissions
- **Protected Routes**: Frontend route guards and backend middleware for access control
- **Session Security**: HTTP-only cookies with configurable security settings

## External Dependencies

### Database and ORM
- **Neon Database**: Serverless PostgreSQL database (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe database toolkit with schema validation
- **Connection Pooling**: Built-in connection management for serverless environments

### AI Integration
- **OpenAI GPT-5**: Content categorization, formatting, and image analysis
- **Smart Categorization**: Automatic classification of updates into predefined categories
- **Content Enhancement**: AI-powered content formatting and structure improvement

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide Icons**: Consistent icon library for UI elements
- **shadcn/ui**: Pre-built component system following design system principles

### File Management
- **Multer**: Multipart form data handling for file uploads
- **Local File Storage**: Server-side file storage with organized directory structure
- **File Type Validation**: Restricted file types for security (PDF, Office docs, images)
- **File Size Limits**: 10MB upload limit per file

### Development Tools
- **Replit Integration**: Special plugins for Replit development environment
- **Vite Plugins**: Runtime error overlays and development enhancements
- **TypeScript**: Full type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting tools