# Code Executor

A secure, web-based code execution environment that allows users to run code in isolated Docker containers. This project provides a browser-based terminal interface with real-time code execution capabilities, featuring a modern code editor and persistent file storage.

## Features

- 🔒 Secure code execution in isolated Docker containers
- 💻 Browser-based terminal interface with ANSI color support
- 🚀 Real-time code execution for Python and JavaScript
- 👥 Multi-level authentication (Master password + User accounts)
- 📝 Monaco code editor integration with syntax highlighting
- 💾 Persistent file storage with Supabase backend
- 🔄 WebSocket-based real-time communication
- 📦 Automatic container provisioning for each user
- 🔍 File management system (create, save, load, delete)
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Frontend:**
  - React 18 with TypeScript
  - Vite for fast development and building
  - Monaco Editor for code editing
  - XTerm.js for terminal emulation
  - TailwindCSS for styling
  - Socket.io Client for real-time communication
  - React Router for navigation

- **Backend:**
  - Node.js with Express
  - Docker API (remote connection)
  - Socket.io for real-time communication
  - Supabase for:
    - User authentication
    - File storage
    - Container management

## System Architecture

### Overview
- Frontend runs locally on your machine
- Backend connects to a remote Docker daemon running on an EC2 instance
- Code execution happens in isolated Docker containers on the EC2 instance
- No local Docker installation is required for development
- File storage and user authentication handled by Supabase
- Real-time communication via WebSocket connections

### Security Architecture

1. **Master Password Protection (GateKeeper)**
   - Initial security layer requiring a master password
   - Prevents unauthorized access to the login/registration system
   - Configured via `VITE_MASTER_PASSWORD` environment variable
   - Must be entered before accessing any application features

2. **User Authentication**
   - Individual user accounts with username/password
   - Secure container association per user
   - Persistent storage of user files and preferences

3. **Container Isolation**
   - Each user gets their own isolated Ubuntu container
   - Containers are automatically provisioned on registration
   - Resource limits and security constraints applied
   - Clean environment for each session

### Why Docker?

Docker is used in this project to:
1. Provide isolated environments for each user's code execution
2. Ensure security by containerizing untrusted code
3. Manage resource allocation and limits
4. Enable clean environment for each session
5. Support multiple programming languages and dependencies

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Git

Note: Docker is NOT required locally as the application connects to a remote Docker daemon.

### Environment Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd code_executor
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file with the following variables:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Remote Docker Configuration (provided by administrator)
DOCKER_HOST=tcp://your-ec2-instance:2376  # Your EC2 instance public DNS/IP
DOCKER_CA=base64_encoded_ca_certificate
DOCKER_CERT=base64_encoded_client_certificate
DOCKER_KEY=base64_encoded_client_key

# Application Security
VITE_MASTER_PASSWORD=your_master_password  # Required for initial access

# Optional Configuration
PORT=3000  # Backend server port
```

### Development

To run the project in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Core Functionality

1. **Master Password Check**
   - Before creating an account, users must enter the master password
   - This acts as a gatekeeper to prevent unauthorized access
   - The master password is set by the administrator in the environment variables
   - Only after entering the correct master password can users proceed to registration

2. **Registration Steps**
   - After passing the master password check, users can create their account:
     1. Enter desired username and password
     2. System checks if username is available
     3. If available, creates account in Supabase
     4. Automatically provisions a dedicated Docker container
     5. Sets up Python and Node.js environments in the container
     6. Creates necessary file storage space

3. **Behind the Scenes**
   - When a user registers:
     ```typescript
     // 1. Master password verification
     if (enteredPassword === MASTER_PASSWORD) {
       // Allow access to registration
     }

     // 2. Account creation in database
     const newUser = {
       username: enteredUsername,
       password: hashedPassword,  // Password is hashed before storage
       container_id: `user-${username}-container`
     };

     // 3. Container provisioning
     const container = await createContainer({
       name: newUser.container_id,
       image: 'ubuntu:latest',
       // ... container configuration
     });

     // 4. Environment setup
     await setupUserEnvironment(container);
     ```

#### Login Process

1. **User Login Flow**
   - Enter username and password
   - System verifies credentials against Supabase database
   - If valid, establishes connection to user's container
   - Restores previous session state and files

2. **Technical Process**
   ```typescript
   // 1. Credential verification
   const user = await verifyCredentials(username, password);
   if (user) {
     // 2. Container reconnection
     const container = await getContainer(user.container_id);
     
     // 3. Session restoration
     await restoreSession(container);
     
     // 4. File system mounting
     await mountUserFiles(username);
   }
   ```

3. **Session Management**
   - Automatic reconnection to existing container
   - Persistent storage of user files and settings
   - Secure WebSocket connection for real-time terminal access
   - Automatic session timeout for security

4. **Security Features**
   - Passwords are hashed and salted
   - Rate limiting on login attempts
   - Session tokens for persistent authentication
   - Automatic container isolation
   - Regular security audits

### Container Management

1. **Container Creation Process**
   ```typescript
   const container = await docker.createContainer({
     Image: 'ubuntu:latest',
     AttachStdin: true,
     AttachStdout: true,
     AttachStderr: true,
     Tty: true,
     OpenStdin: true,
     StdinOnce: false,
     Cmd: ["/bin/bash"],
     name: containerName,
     Env: ['DEBIAN_FRONTEND=noninteractive'],
     HostConfig: {
       NetworkMode: 'host'
     }
   });
   ```

2. **Shell Management**
   - Multiple shell fallbacks (bash, sh, ash)
   - Automatic virtual environment activation
   - Persistent shell sessions between connections

3. **Resource Management**
   - Network access for package installation
   - Volume persistence
   - Container state preservation

### Code Execution Environment

1. **Python Environment**
   - Python 3 with virtual environment
   - Pre-installed packages:
     - pandas for data manipulation
     - scipy for scientific computing
   - Dynamic package installation:
     ```python
     # Users can install additional packages
     pip install package_name
     
     # Example: Installing and using new packages
     pip install requests
     import requests
     ```
   - Access to pip for additional package installation
   - All pip installations persist in the user's container

2. **JavaScript Environment**
   - Node.js runtime with npm
   - Package installation capabilities:
     ```javascript
     // Install packages using npm
     npm install package_name
     
     // Example: Installing and using Express
     npm install express
     const express = require('express');
     ```
   - Full access to npm registry
   - Persistent node_modules in user's container

### File Management System

1. **Database Schema**
   ```typescript
   // File structure in Supabase
   interface CodeFile {
     username: string;
     file_name: string;
     code_content: string;
     last_saved: string;
   }
   ```

2. **Features**
   - Create and edit files
   - Automatic language detection
   - File renaming and deletion
   - Version tracking
   - Secure file access
   - Persistent storage
   - Real-time editing
   - Auto-save support

## Technical Implementation

### Project Structure

```
code_executor/
├── src/                    # Frontend source code
│   ├── components/        # React components
│   │   ├── DockerTerminal.tsx    # Terminal component
│   │   ├── Editor.tsx            # Code editor component
│   │   ├── GateKeeper.tsx        # Master password protection
│   │   ├── LoginPage.tsx         # User authentication
│   │   └── Terminal.tsx          # Main terminal interface
│   ├── lib/              # Utility functions and helpers
│   │   └── supabase.ts   # Supabase client and functions
│   └── App.tsx           # Main application component
├── backend/              # Backend server code
│   ├── src/             # Server source code
│   │   ├── server.ts    # Main server setup
│   │   └── services/    # Backend services
└── vite.config.ts       # Vite configuration
```

### Database Schema

1. **login_creds**
   ```sql
   CREATE TABLE login_creds (
     username TEXT PRIMARY KEY,
     password TEXT NOT NULL,
     docker_container_id TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **code_files**
   ```sql
   CREATE TABLE code_files (
     id SERIAL PRIMARY KEY,
     username TEXT REFERENCES login_creds(username),
     file_name TEXT NOT NULL,
     code_content TEXT,
     last_saved TIMESTAMP DEFAULT NOW(),
     UNIQUE(username, file_name)
   );
   ```

### WebSocket Communication

```typescript
// Frontend socket connection
const socket = io('http://localhost:3000', {
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 10,
  transports: ['websocket'],
  agent: false,
  upgrade: false,
  rejectUnauthorized: false
});

// Backend socket handling
io.on('connection', (socket) => {
  socket.on('terminal-input', (data) => {
    // Handle terminal input
  });
  socket.on('terminal-output', (data) => {
    // Stream output to client
  });
});
```

### API Endpoints

1. **Authentication Endpoints**
   ```http
   POST /api/register
   Content-Type: application/json

   {
     "username": "string",
     "password": "string"
   }
   ```

   ```http
   POST /api/login
   Content-Type: application/json

   {
     "username": "string",
     "password": "string"
   }
   ```

2. **WebSocket Events**
   - Client Events:
     - `authenticate`: Authenticate user session
     - `terminal-input`: Send terminal commands
     - `list-containers`: Request container list
     - `create-container`: Create new container
     - `attach-container`: Connect to container
     - `rename-container`: Rename container
     - `remove-container`: Delete container

   - Server Events:
     - `terminal-output`: Stream command output
     - `containers-list`: List available containers
     - `container-created`: Container creation confirmation
     - `container-renamed`: Container rename confirmation
     - `container-removed`: Container deletion confirmation
     - `error`: Error notifications

## Deployment

### Docker Setup

1. **EC2 Configuration**

   First, install Docker on your EC2 instance:
   ```bash
   # Update package lists
   sudo apt-get update

   # Install Docker
   sudo apt-get install docker.io

   # Start and enable Docker service
   sudo systemctl start docker
   sudo systemctl enable docker

   # Add your user to docker group (optional)
   sudo usermod -aG docker $USER
   ```

   Configure Docker daemon for secure remote access:
   ```bash
   # Create Docker configuration directory
   sudo mkdir -p /etc/docker

   # Create daemon configuration file
   sudo nano /etc/docker/daemon.json
   ```

   Add the following configuration to `/etc/docker/daemon.json`:
   ```json
   {
     "hosts": [
       "unix:///var/run/docker.sock",
       "tcp://0.0.0.0:2376"
     ],
     "tls": true,
     "tlscacert": "/etc/docker/certs/ca.pem",
     "tlscert": "/etc/docker/certs/server-cert.pem",
     "tlskey": "/etc/docker/certs/server-key.pem",
     "tlsverify": true
   }
   ```

   Create directories for certificates:
   ```bash
   sudo mkdir -p /etc/docker/certs
   sudo chmod 700 /etc/docker/certs
   ```

   Configure systemd service:
   ```bash
   sudo systemctl edit docker.service
   ```

   Add these lines to override the service configuration:
   ```ini
   [Service]
   ExecStart=
   ExecStart=/usr/bin/dockerd
   ```

   Restart Docker service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart docker
   ```

   Verify Docker is running with the new configuration:
   ```bash
   sudo docker info
   sudo netstat -tlpn | grep docker
   ```

2. **TLS Certificate Generation**
   ```bash
   # Generate CA private key and public certificate
   openssl genrsa -aes256 -out ca-key.pem 4096
   openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem

   # Generate server key and certificate signing request
   openssl genrsa -out server-key.pem 4096
   openssl req -subj "/CN=$HOST" -sha256 -new -key server-key.pem -out server.csr

   # Sign the server CSR
   openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem
   ```

3. **Security Group Configuration**
   - Allow port 2376 for Docker TLS
   - Allow port 3000 for WebSocket
   - Allow port 80/443 for HTTP/HTTPS

### Application Deployment

1. **Backend Deployment**
   ```bash
   # Build backend
   npm run build

   # Start server
   npm start
   ```

2. **Frontend Deployment**
   ```bash
   # Build frontend
   npm run build

   # Serve using nginx or similar
   ```

### Supabase Setup

1. Create new project
2. Create required tables using provided schema
3. Configure row level security (RLS)
4. Generate and save API keys

## Best Practices

1. **Security**
   - All container operations are isolated
   - Master password protection
   - TLS encryption for Docker communication
   - Secure WebSocket connections
   - Input validation and sanitization

2. **Performance**
   - Lazy loading of containers
   - Efficient WebSocket communication
   - Resource cleanup on disconnection
   - Automatic container management

3. **Error Handling**
   - Graceful error recovery
   - Detailed error messages
   - Automatic reconnection
   - Session persistence

## Troubleshooting

Common issues and solutions:

1. **Container Connection Issues**
   - Verify Docker daemon configuration
   - Check TLS certificates
   - Ensure proper network access

2. **WebSocket Connection Errors**
   - Check port accessibility
   - Verify CORS configuration
   - Confirm WebSocket protocol

3. **Package Installation Failures**
   - Verify network access in container
   - Check package repository access
   - Confirm sufficient disk space

4. **Performance Issues**
   - Monitor container resource usage
   - Check network latency
   - Optimize code execution

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [XTerm.js](https://xtermjs.org/)
- [Docker](https://www.docker.com/)
- [Supabase](https://supabase.com/)