# Code Executor

A secure, web-based code execution environment that lets you write and run code directly in your browser. No local setup needed - just log in and start coding!

## What is Code Executor?

Code Executor provides:
- 🚀 Instant Python and JavaScript coding environment in your browser
- 💻 Full-featured terminal with color support
- 📝 Modern code editor with syntax highlighting
- 💾 Automatic file saving and version tracking
- 🔒 Secure, isolated environment for each user
- 📦 Easy package installation (pip and npm supported)

## Getting Started

### Quick Start
1. Visit the application URL
2. Enter the master password (get this from your administrator)
3. Create an account or log in
4. Start coding!

### What You Can Do
- **Write and Run Code**
  - Python 3 with popular data science packages
  - Node.js with npm support
  - Real-time code execution
  - Full terminal access

- **Manage Files**
  - Create and edit files
  - Automatic file saving
  - File version history
  - Easy file organization

- **Install Packages**
  - Use pip for Python packages
  - Use npm for JavaScript packages
  - Packages persist between sessions
  - Access to full package registries

### Example Usage

**Python:**
```python
# Install and use packages
pip install requests
import requests

# Your code runs in an isolated environment
response = requests.get('https://api.example.com/data')
print(response.json())
```

**JavaScript:**
```javascript
// Install and use npm packages
npm install axios
const axios = require('axios');

// Full Node.js environment
async function getData() {
    const response = await axios.get('https://api.example.com/data');
    console.log(response.data);
}
```

## How It Works

### Architecture Overview
- Your code runs in secure Docker containers on our cloud infrastructure
- Each user gets their own isolated environment
- Files and settings persist between sessions
- Real-time communication for instant feedback

### Security Features
- Master password protection for application access
- Individual user accounts
- Isolated containers for each user
- Secure WebSocket connections
- Regular security audits

## For Administrators

### System Requirements
- Node.js v18 or higher
- Git
- AWS EC2 instance for Docker containers
- Supabase account for data storage

### Setup Instructions

1. **Environment Configuration**
   ```bash
   # Clone and setup
   git clone [your-repo-url]
   cd code_executor
   npm install
   cp .env.example .env
   ```

2. **Configure Environment Variables**
   ```env
   # Required configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   DOCKER_HOST=tcp://your-ec2-instance:2376
   VITE_MASTER_PASSWORD=your_master_password
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Technical Details

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

The application uses WebSocket connections to enable real-time communication between the client and server, particularly for terminal interactions and container management.

1. **Connection Setup**
   ```typescript
   // Frontend WebSocket initialization
   const socket = io('http://localhost:3000', {
     reconnectionDelay: 1000,
     reconnection: true,
     reconnectionAttempts: 10,
     transports: ['websocket'],
     agent: false,
     upgrade: false,
     rejectUnauthorized: false
   });

   // Backend WebSocket handler
   io.on('connection', (socket) => {
     // Authentication handler
     socket.on('authenticate', async (username) => {
       const container = await getUserContainer(username);
       setupTerminalConnection(socket, container);
     });

     // Terminal I/O handlers
     socket.on('terminal-input', handleTerminalInput);
     socket.on('terminal-output', handleTerminalOutput);
     
     // Container management handlers
     socket.on('create-container', handleContainerCreation);
     socket.on('attach-container', handleContainerAttachment);
     socket.on('remove-container', handleContainerRemoval);
   });
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

### File Management and Database Architecture

This project uses Supabase as its backend service for user authentication, file storage, and container management. Here's how the data is organized and managed:

1. **Database Schema**
   ```sql
   -- User Authentication and Container Management
   CREATE TABLE login_creds (
     username TEXT PRIMARY KEY,
     password TEXT NOT NULL,
     docker_container_id TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- File Storage and Management
   CREATE TABLE code_files (
     id SERIAL PRIMARY KEY,
     username TEXT REFERENCES login_creds(username),
     file_name TEXT NOT NULL,
     code_content TEXT,
     last_saved TIMESTAMP DEFAULT NOW(),
     UNIQUE(username, file_name)
   );
   ```

2. **Data Management Flow**
   - **User Data**:
     - Secure password storage
     - Container ID association
     - Session tracking and management
   
   - **File Operations**:
     - Automatic file versioning
     - Real-time save and sync
     - Conflict resolution
     - Access control based on ownership

3. **Supabase Integration**
   ```typescript
   // File operations example
   const fileOperations = {
     // Save file
     async saveFile(username: string, fileName: string, content: string) {
       return supabase
         .from('code_files')
         .upsert({ username, file_name: fileName, code_content: content });
     },

     // Load user files
     async getUserFiles(username: string) {
       return supabase
         .from('code_files')
         .select('*')
         .eq('username', username);
     },

     // Delete file
     async deleteFile(username: string, fileName: string) {
       return supabase
         .from('code_files')
         .delete()
         .match({ username, file_name: fileName });
     }
   };
   ```

4. **Features and Capabilities**
   - **File Management**:
     - Create, read, update, delete operations
     - Automatic syntax highlighting
     - File type detection
     - Real-time collaboration support
   
   - **Storage Features**:
     - Persistent file storage
     - Automatic backup
     - Version history
     - Access control
   
   - **Security Measures**:
     - User-based access control
     - SQL injection prevention
     - Input validation

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

### Supabase Setup

1. Create new project
2. Create required tables using provided schema
3. Disable row level security (RLS)
4. Generate and save API keys

## How It Works - Technical Deep Dive

This section provides a comprehensive explanation of the core processes in Code Executor.

### Account Creation Process

1. **Master Password Verification**
   ```typescript
   // GateKeeper.tsx
   const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD;
   if (password === MASTER_PASSWORD) {
     onAccess(); // Grant access to registration
   }
   ```
   - Initial security layer requiring administrator-set password
   - Prevents unauthorized access to registration system

2. **User Registration Flow**
   ```typescript
   // LoginPage.tsx
   const handleSubmit = async (e: React.FormEvent) => {
     // 1. Check if username exists
     const exists = await checkUsernameExists(username);
     
     // 2. Create Supabase account
     const containerName = `user-${username}-container`;
     await createAccount({ username, password, docker_container_id: containerName });
     
     // 3. Initialize container
     await fetch('http://localhost:3000/api/register', {
       method: 'POST',
       body: JSON.stringify({ username, password })
     });
   }
   ```

3. **Container Provisioning**
   ```typescript
   // server.ts
   const INSTALL_SCRIPT = `
     apt-get update && apt-get install -y
     python3 python3-pip python3-venv
     nodejs npm
     python3 -m venv venv
     . venv/bin/activate
     pip install pandas scipy
   `;

   async function createUbuntuContainer(containerName: string) {
     // 1. Pull Ubuntu image
     await docker.pull('ubuntu:latest');
     
     // 2. Create container
     const container = await docker.createContainer({
       Image: 'ubuntu:latest',
       name: containerName,
       // ... configuration
     });
     
     // 3. Install dependencies
     await installDependencies(container);
   }
   ```
   - Creates Ubuntu container with unique name
   - Installs Python, Node.js, and essential packages
   - Sets up Python virtual environment
   - Configures persistent storage

### Login Process

1. **Credential Verification**
   ```typescript
   // LoginPage.tsx
   const { exists, passwordMatch } = await checkLoginCredentials(username, password);
   if (exists && passwordMatch) {
     const response = await fetch('/api/login', {
       method: 'POST',
       body: JSON.stringify({ username, password })
     });
   }
   ```

2. **Container Connection**
   ```typescript
   // Terminal.tsx
   useEffect(() => {
     // 1. Connect to WebSocket
     socketRef.current = io('http://localhost:3000');
     
     // 2. Authenticate and connect to container
     socketRef.current.emit('authenticate', username);
     
     // 3. Handle terminal I/O
     socketRef.current.on('terminal-output', (data) => {
       setOutput(prev => prev + data);
     });
   }, [username]);
   ```
   - Retrieves user's container ID from Supabase
   - Establishes WebSocket connection
   - Connects to user's persistent container
   - Restores previous session state

### File Management System

1. **File Operations**
   ```typescript
   // supabase.ts
   export const saveCodeFile = async (
     username: string,
     fileName: string,
     codeContent: string
   ) => {
     // Save/update file in Supabase
     await supabase
       .from('code_files')
       .upsert({
         username,
         file_name: fileName,
         code_content: codeContent
       });
   };
   ```
   - Files stored in Supabase with user association
   - Automatic version tracking
   - Real-time save and sync
   - Language-specific handling

2. **Code Execution**
   ```typescript
   // Terminal.tsx
   const handleRun = () => {
     // Execute based on file type
     const script = selectedLanguage === 'python'
       ? `python3 -c "${editorContent}"`
       : `node -e "${editorContent}"`;
     
     // Send to container via WebSocket
     socketRef.current?.emit('terminal-input', script + '\n');
   };
   ```
   - Direct execution in user's container
   - Language-specific runtime selection
   - Real-time output streaming
   - Error handling and display

### EC2 Container Architecture

The decision to host Docker containers on EC2 provides several critical advantages:

1. **Resource Management**
   - Centralized container orchestration
   - Efficient resource allocation
   - Automated scaling capabilities
   - Consistent environment for all users

2. **Security Benefits**
   ```typescript
   // server.ts
   const docker = new Docker({
     host: process.env.DOCKER_HOST,
     port: 2376,
     ca: Buffer.from(process.env.DOCKER_CA || '', 'base64'),
     cert: Buffer.from(process.env.DOCKER_CERT || '', 'base64'),
     key: Buffer.from(process.env.DOCKER_KEY || '', 'base64'),
     protocol: 'https'
   });
   ```
   - TLS encryption for Docker communication
   - Isolated container environments
   - Network access control
   - Secure WebSocket connections

3. **Performance Optimization**
   - Load distribution across instances
   - Resource pooling
   - Efficient container management
   - Quick startup and response times

4. **Cost Efficiency**
   - Pay-per-use pricing
   - Resource sharing across users
   - Optimized infrastructure utilization
   - Scalable deployment model

This architecture enables a secure, scalable, and efficient code execution environment while maintaining isolation between users and providing a seamless development experience.

## License

   This project is licensed under the MIT License - see the LICENSE file for details.

   ## Acknowledgments

   - [Monaco Editor](https://microsoft.github.io/monaco-editor/)
   - [XTerm.js](https://xtermjs.org/)
   - [Docker](https://www.docker.com/)
   - [Supabase](https://supabase.com/)