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
   git clone https://github.com/yourusername/code_executor.git
   cd code_executor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Setup

The application requires:
- Node.js 18+ 
- Docker for container management
- A Supabase account for backend services

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Security

- Code execution happens in isolated Docker containers
- User authentication via Supabase
- Environment variables are properly secured
- File extensions are enforced (.py for Python, .js for JavaScript)

## License

MIT License - feel free to use this code for your own projects. 