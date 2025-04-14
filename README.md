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

### Prerequisites
- Node.js v18 or higher
- Git
- AWS EC2 instance with Docker configured (see Docker Setup section below)
- Supabase account and project

### Setup Instructions

1. **Clone and Setup Frontend**
   ```bash
   # Clone the repository
   git clone [your-repo-url]
   cd code_executor

   # Install frontend dependencies
   npm install

   # Copy environment file
   cp .env.example .env
   ```

2. **Setup Backend**
   ```bash
   # Navigate to backend directory
   cd backend

   # Install backend dependencies
   npm install
   ```

3. **Configure Environment Variables**
   
   Create a `.env` file in the root directory with the following configuration:

   ```env
   # Supabase Configuration
   # Get these from your Supabase project settings -> API
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Docker Configuration
   # Format: tcp://your-ec2-instance
   DOCKER_HOST=your_docker_host

   # TLS Certificates (base64 encoded)
   # Generate these using the instructions in the Docker Setup section
   DOCKER_CA=your_base64_encoded_ca_cert
   DOCKER_CERT=your_base64_encoded_client_cert
   DOCKER_KEY=your_base64_encoded_client_key

   # Application Security
   # Choose a secure master password for initial access
   VITE_MASTER_PASSWORD=your_master_password
   ```

4. **Start Development Servers**

   In the root directory (frontend):
   ```bash
   npm run dev
   ```

   In a new terminal, navigate to the backend directory:
   ```bash
   cd backend
   npm run dev
   ```

### Environment Configuration Guide

1. **Supabase Setup**
   - Create a new project at [Supabase](https://supabase.com) following the Supabase Setup section below
   - Go to Project Settings -> API
   - Copy the `Project URL` as `VITE_SUPABASE_URL`
   - Copy the `anon/public` key as `VITE_SUPABASE_ANON_KEY`

2. **Docker Configuration**
   - Set up your EC2 instance following the Docker Setup section below
   - Your `DOCKER_HOST` should be in the format `tcp://your-ec2-instance`
   - Generate TLS certificates (see Docker Setup section)
   - Base64 encode your certificates:
     ```bash
     # On macOS/Linux
     base64 -i ca.pem > ca.base64
     base64 -i cert.pem > cert.base64
     base64 -i key.pem > key.base64
     ```
   - Copy the encoded contents to the respective environment variables

3. **Master Password**
   - Choose a secure master password
   - This will be required for initial access to the application
   - Store it in `VITE_MASTER_PASSWORD`

### Verifying the Setup

1. Frontend should be running at `http://localhost:5173`
2. Backend should be running at `http://localhost:3000`
3. You should be able to:
   - Access the login page
   - Enter the master password
   - Create a new account
   - Connect to a Docker container
   - Execute code

If you encounter any issues, check:
- Both frontend and backend servers are running
- All environment variables are properly set
- Docker daemon is accessible
- Supabase project is properly configured

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
#In Terminal
pip install rich
#In Code Editor
from rich import print
from rich.table import Table

# Create a table
table = Table(title="Favorite Programming Languages")

table.add_column("Language", style="cyan", no_wrap=True)
table.add_column("Type", style="magenta")
table.add_column("Use Case", justify="right", style="green")

# Add rows
table.add_row("Python", "Interpreted", "AI, Web, Automation")
table.add_row("Rust", "Compiled", "Systems Programming")
table.add_row("JavaScript", "Interpreted", "Web Development")

# Print the table
print(table)
```

**JavaScript:**
```javascript
//In Terminal
mkdir -p /usr/app (Note: make sure you create a directory to install your npm packages in, as the root directory / in the terminal of your Docker container is not a valid npm project directory)
cd /usr/app
npm init -y
npm install axios
//In Code Editor
const axios = require('axios');
axios.get('https://icanhazdadjoke.com/', { headers: { Accept: 'application/json' } }).then(res => console.log('😂 Dad Joke:', res.data.joke)).catch(err => console.error('Failed:', err.message));
```

## How It Works

### Architecture Overview
- Your code runs in secure Docker containers on our cloud infrastructure
- Each user gets their own isolated environment/Docker container
- Files and settings persist between sessions
- Real-time communication for instant feedback

### Security Features
- Master password protection for application access
- Individual user accounts
- Isolated Docker containers for each user
- Secure WebSocket connections

## For Administrators

### System Requirements
- Node.js v18 or higher
- Git
- AWS EC2 instance for Docker containers
- Supabase account for data storage

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

### File Management and Database Architecture

This project uses Supabase as its backend service for user authentication, file storage, and container management. Here's how the data is organized and managed:

### Supabase Setup

1. Create new project
2. Create required tables using provided schema
3. Disable row level security (RLS)
4. Generate and save API keys

1. **Database Schema**
   ```sql
   -- User Authentication and Container Management
   CREATE TABLE login_creds (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      docker_container_id TEXT
   );

   -- File Storage and Management
   CREATE TABLE code_files (
      username TEXT NOT NULL,
      file_name TEXT NOT NULL,
      code_content TEXT,
      last_saved TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (username, file_name)
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
   
   - **Storage Features**:
     - Persistent file storage
     - Automatic backup
     - Version history
     - User-based access control

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

   Restart Docker service:
   ```bash
   sudo systemctl restart docker
   ```

2. **TLS Certificate Generation**

   On your EC2 instance, generate the certificates:
   ```bash
   # Navigate to the certs directory
   cd /etc/docker/certs

   # Generate CA private key and public certificate
   openssl genrsa -aes256 -out ca-key.pem 4096
   openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem

   # Generate server key and certificate signing request (replace $HOST with your EC2 public DNS/IP)
   openssl genrsa -out server-key.pem 4096
   openssl req -subj "/CN=$HOST" -sha256 -new -key server-key.pem -out server.csr

   # Sign the server CSR
   openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem

   # Generate client certificates
   openssl genrsa -out key.pem 4096
   openssl req -subj '/CN=client' -new -key key.pem -out client.csr
   openssl x509 -req -days 365 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out cert.pem

   # Set proper permissions
   chmod 0400 ca-key.pem key.pem server-key.pem
   chmod 0444 ca.pem server-cert.pem cert.pem
   ```

   Copy certificates to your local machine:
   ```bash
   # On your local machine (replace user and host with your EC2 details)
   mkdir -p ~/.docker/certs
   scp -i your-ec2-key.pem user@host:/etc/docker/certs/ca.pem ~/.docker/certs/
   scp -i your-ec2-key.pem user@host:/etc/docker/certs/cert.pem ~/.docker/certs/
   scp -i your-ec2-key.pem user@host:/etc/docker/certs/key.pem ~/.docker/certs/
   ```

   Base64 encode certificates for environment variables:
   ```bash
   # On your local machine
   cd ~/.docker/certs
   base64 -i ca.pem > ca.base64
   base64 -i cert.pem > cert.base64
   base64 -i key.pem > key.base64
   ```

3. **Security Group Configuration**
   - Allow port 2376 for Docker TLS
   - Allow port 3000 for WebSocket
   - Allow port 80/443 for HTTP/HTTPS

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

### EC2 Container Architecture

The decision to host Docker containers on EC2 provides several critical advantages:

1. **Resource Management**
   - Centralized container orchestration
   - Efficient resource allocation
   - Automated scaling capabilities for scalable deployment
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

This architecture enables a secure, scalable, and efficient code execution environment while maintaining isolation between users and providing a seamless development experience.

## License

   This project is licensed under the MIT License - see the LICENSE file for details.

   ## Acknowledgments

   - [Monaco Editor](https://microsoft.github.io/monaco-editor/)
   - [XTerm.js](https://xtermjs.org/)
   - [Docker](https://www.docker.com/)
   - [Supabase](https://supabase.com/)