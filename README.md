# Code Executor

A web-based code execution platform that allows users to write, save, and run Python and JavaScript code in a secure containerized environment.

## Features

- Real-time code execution in isolated Docker containers
- Support for both Python and JavaScript
- File management system with save/load functionality
- Syntax highlighting and modern code editor interface
- Terminal output with ANSI color support
- Secure user authentication

## Tech Stack

- **Frontend**:
  - React with TypeScript
  - Vite for build tooling
  - Monaco Editor for code editing
  - Tailwind CSS for styling
  - Socket.IO for real-time communication

- **Backend**:
  - Node.js with Socket.IO
  - Docker for code execution
  - Supabase for authentication and data storage

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/austinw1995/code_executor.git
   cd code_executor
   ```

2. Frontend Setup:
   ```bash
   # Navigate to frontend directory
   cd frontend

   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

3. Backend Setup:
   ```bash
   # Open a new terminal
   # Navigate to backend directory
   cd backend

   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```
   The backend will be available at `http://localhost:3000`

4. Environment Setup:
   Create a `.env` file in the root directory with the following variables:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

## Requirements

The application requires:
- Node.js 18+ 
- Docker for container management
- A Supabase account for backend services

## Development Commands

Frontend (`/frontend` directory):
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview frontend production build

Backend (`/backend` directory):
- `npm run dev` - Start backend development server
- `npm run build` - Build backend for production
- `npm start` - Start backend production server

## Security

- Code execution happens in isolated Docker containers
- User authentication via Supabase
- Environment variables are properly secured
- File extensions are enforced (.py for Python, .js for JavaScript)

## License

MIT License - feel free to use this code for your own projects. 