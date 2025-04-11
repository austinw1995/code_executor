import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Docker from 'dockerode';
import cors from 'cors';
import { getUser, authenticateUser, updateUserContainer } from './services/supabase';
import { User } from './types/user';
import path from 'path';

export const app = express();
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.VITE_FRONTEND_URL 
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
}

export const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.VITE_FRONTEND_URL 
      : 'http://localhost:5173',
    methods: ["GET", "POST"],
    credentials: true
  }
});

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// List of shells to try in order
const SHELL_COMMANDS = ['/bin/sh', '/bin/bash', '/bin/ash'];

// Container to exclude from the list
const EXCLUDED_CONTAINER = 'docker-cis5530-run-56ab245ccf7b';

// Installation script for Python and Node.js
const INSTALL_SCRIPT = `
export DEBIAN_FRONTEND=noninteractive
echo "Updating package lists..."
apt-get update && \
echo "Installing Python, Node.js, and other dependencies..." && \
apt-get install -y \
python3 \
python3-pip \
python3-venv \
nodejs \
npm && \
echo "Cleaning up..." && \
apt-get clean && \
rm -rf /var/lib/apt/lists/* && \
echo -e "\n=== Installation Complete! ===\n" && \
echo -e "Installed package versions:" && \
echo -e "\n=== Python ===\n" && \
python3 --version && \
echo -e "\n=== Pip ===\n" && \
pip3 --version && \
echo -e "\n=== Node.js ===\n" && \
node --version && \
echo -e "\n=== npm ===\n" && \
npm --version && \
echo -e "\n=== Setting up Python virtual environment ===\n" && \
python3 -m venv venv && \
. venv/bin/activate && \
echo -e "\n=== Installing Python packages ===\n" && \
pip install pandas scipy && \
echo -e "\n=== Python packages installed ===\n" && \
pip list | grep -E "pandas|scipy" && \
echo -e "\n=== Ready to use! ===\n"
`;

async function tryExecWithShells(container: Docker.Container) {
  let lastError = null;

  for (const shell of SHELL_COMMANDS) {
    try {
      const exec = await container.exec({
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        // Activate venv when starting the shell
        Cmd: [shell, '-c', '. venv/bin/activate && ' + shell]
      });

      // If we get here, the shell exists and we can use it
      return exec;
    } catch (error) {
      lastError = error;
      console.log(`Shell ${shell} not available, trying next...`);
    }
  }

  // If we get here, none of the shells worked
  throw lastError || new Error('No valid shell found in container');
}

async function installDependencies(container: Docker.Container, socket: any) {
  try {
    socket.emit('terminal-output', 'Starting dependency installation...\n');

    // Create exec instance for installation
    const exec = await container.exec({
      Cmd: ['/bin/bash', '-c', INSTALL_SCRIPT],
      AttachStdout: true,
      AttachStderr: true,
      Env: ['DEBIAN_FRONTEND=noninteractive']
    });

    // Run the installation and handle output
    const stream = await exec.start({});
    
    // Handle the output streams
    stream.on('data', (chunk: Buffer) => {
      const output = chunk.toString();
      socket.emit('terminal-output', output);
    });

    // Wait for the installation to complete
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    socket.emit('terminal-output', '\nDependency installation completed!\n');
    return true;
  } catch (error: any) {
    console.error('Error installing dependencies:', error);
    socket.emit('terminal-output', `\nError installing dependencies: ${error.message}\n`);
    throw error;
  }
}

async function createUbuntuContainer(containerName: string, socket: any) {
  try {
    socket.emit('terminal-output', 'Pulling Ubuntu image...\n');

    // Pull Ubuntu image if not exists
    await new Promise((resolve, reject) => {
      docker.pull('ubuntu:latest', (err: any, stream: any) => {
        if (err) return reject(err);

        docker.modem.followProgress(
          stream,
          (err: any, output: any) => {
            if (err) return reject(err);
            resolve(output);
          },
          (event: any) => {
            if (event.status && event.progress) {
              socket.emit('terminal-output', `${event.status}: ${event.progress}\n`);
            } else if (event.status) {
              socket.emit('terminal-output', `${event.status}\n`);
            }
          }
        );
      });
    });

    socket.emit('terminal-output', '\nCreating container...\n');

    // Create container
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
      // Add internet access for package installation
      HostConfig: {
        NetworkMode: 'host'
      }
    });

    socket.emit('terminal-output', 'Starting container...\n');
    
    // Start container
    await container.start();

    // Install dependencies
    await installDependencies(container, socket);

    // Don't create a shell session here, let authenticate handle it
    return { container };
  } catch (error: any) {
    console.error('Error creating container:', error);
    socket.emit('terminal-output', `Error: ${error.message}\n`);
    throw error;
  }
}

async function removeContainer(containerId: string) {
  try {
    const container = docker.getContainer(containerId);
    
    // Force kill the container first
    await container.kill().catch(() => {
      // Ignore kill error if container is not running
      console.log('Container was not running');
    });
    
    // Remove the container
    await container.remove({ force: true });
    
    return true;
  } catch (error) {
    console.error('Error removing container:', error);
    throw error;
  }
}

async function renameContainer(containerId: string, newName: string) {
  try {
    const container = docker.getContainer(containerId);
    await container.rename({ name: newName });
    return true;
  } catch (error) {
    console.error('Error renaming container:', error);
    throw error;
  }
}

async function connectToExistingShell(container: Docker.Container) {
  let lastError = null;

  for (const shell of SHELL_COMMANDS) {
    try {
      const exec = await container.exec({
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        // Activate venv when connecting to existing shell
        Cmd: [shell, '-c', '. venv/bin/activate && ' + shell]
      });

      // If we get here, the shell exists and we can use it
      return exec;
    } catch (error) {
      lastError = error;
      console.log(`Shell ${shell} not available, trying next...`);
    }
  }

  // If we get here, none of the shells worked
  throw lastError || new Error('No valid shell found in container');
}

// Modify authentication endpoints
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Send response immediately since Supabase registration is handled by frontend
    res.json({ success: true, username });
    
    // Create a container for the new user in the background
    const containerName = `user-${username}-container`;
    
    // Create a dummy socket for installation output
    const dummySocket = {
      emit: (event: string, message: string) => {
        // Only emit if it's terminal output
        if (event === 'terminal-output') {
          io.emit(`installation-${username}`, message);
        }
      }
    };

    // Check for existing container with the same name and remove it
    try {
      const containers = await docker.listContainers({ all: true });
      const existingContainer = containers.find(container => 
        container.Names.some(name => name === `/${containerName}`)
      );
      
      if (existingContainer) {
        dummySocket.emit('terminal-output', `Found existing container with name ${containerName}, removing it...\n`);
        await removeContainer(existingContainer.Id);
        dummySocket.emit('terminal-output', `Existing container removed successfully.\n`);
      }
    } catch (error) {
      console.error('Error checking/removing existing container:', error);
    }
    
    // Start container creation in the background
    createUbuntuContainer(containerName, dummySocket)
      .then(async ({ container }) => {
        // Store the container ID in Supabase
        await updateUserContainer(username, container.id);

        // Emit an event to notify that the container is ready
        io.emit(`container-ready-${username}`, { containerId: container.id });

        // Notify that container is ready and waiting for authentication
        io.emit(`terminal-output-${username}`, '\n=== Container is ready. Waiting for authentication to set up shell... ===\n');
      })
      .catch((error) => {
        console.error(`Error creating container for user ${username}:`, error);
        io.emit(`installation-${username}`, `\nError: ${error.message}\n`);
      });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ success: true, username, containerId: user.containerId });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');
  let currentStream: any = null;
  let terminalInputHandler: ((data: string) => void) | null = null;
  let currentUsername: string | null = null;

  const cleanup = () => {
    if (currentStream && !currentStream.destroyed) {
      currentStream.end();
    }
    if (terminalInputHandler) {
      socket.off('terminal-input', terminalInputHandler);
      terminalInputHandler = null;
    }
    currentStream = null;
    currentUsername = null;
  };

  socket.on('authenticate', async (username: string) => {
    try {
      const user = await getUser(username);
      if (!user) {
        socket.emit('error', 'User not found');
        return;
      }
      currentUsername = username;
      
      // Automatically connect to user's container
      if (user.containerId) {
        const container = docker.getContainer(user.containerId);
        const exec = await connectToExistingShell(container);
        currentStream = await exec.start({
          Tty: true,
          stdin: true,
          hijack: true
        });

        // Handle terminal output
        currentStream.on('data', (chunk: Buffer) => {
          socket.emit('terminal-output', chunk.toString());
        });

        // Handle terminal input
        terminalInputHandler = (data: string) => {
          if (currentStream && !currentStream.destroyed) {
            currentStream.write(data);
          }
        };
        socket.on('terminal-input', terminalInputHandler);
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  socket.on('list-containers', async () => {
    try {
      const containers = await docker.listContainers();
      // Filter for Ubuntu containers and exclude the specific container
      const filteredContainers = containers.filter(container => 
        container.Image.includes('ubuntu') &&
        !container.Names.some(name => name.includes(EXCLUDED_CONTAINER))
      );
      socket.emit('containers-list', filteredContainers);
    } catch (error) {
      console.error('Error listing containers:', error);
      socket.emit('error', { message: 'Failed to list containers' });
    }
  });

  socket.on('create-container', async ({ name }: { name: string }) => {
    try {
      const { container } = await createUbuntuContainer(name, socket);
      
      // Clean up existing connection if any
      cleanup();
      
      // Emit the new container ID and trigger a list refresh
      socket.emit('container-created', { containerId: container.id });
      
      // Refresh the container list
      const containers = await docker.listContainers();
      const filteredContainers = containers.filter(container => 
        container.Image.includes('ubuntu') &&
        !container.Names.some(name => name.includes(EXCLUDED_CONTAINER))
      );
      socket.emit('containers-list', filteredContainers);
    } catch (error) {
      console.error('Error creating container:', error);
      socket.emit('error', { message: 'Failed to create container' });
    }
  });

  socket.on('rename-container', async ({ containerId, newName }: { containerId: string; newName: string }) => {
    try {
      await renameContainer(containerId, newName);
      socket.emit('container-renamed', { containerId, newName });
      
      // Refresh the container list
      const containers = await docker.listContainers();
      const filteredContainers = containers.filter(container => 
        container.Image.includes('ubuntu') &&
        !container.Names.some(name => name.includes(EXCLUDED_CONTAINER))
      );
      socket.emit('containers-list', filteredContainers);
    } catch (error) {
      console.error('Error renaming container:', error);
      socket.emit('error', { message: 'Failed to rename container' });
    }
  });

  socket.on('remove-container', async (containerId: string) => {
    try {
      await removeContainer(containerId);
      cleanup(); // Clean up the terminal connection if it's the current container
      socket.emit('container-removed', { containerId });
      
      // Refresh the container list
      const containers = await docker.listContainers();
      const filteredContainers = containers.filter(container => 
        container.Image.includes('ubuntu') &&
        !container.Names.some(name => name.includes(EXCLUDED_CONTAINER))
      );
      socket.emit('containers-list', filteredContainers);
    } catch (error) {
      console.error('Error removing container:', error);
      socket.emit('error', { message: 'Failed to remove container' });
    }
  });

  socket.on('attach-container', async (containerId: string) => {
    try {
      // Clean up existing connection if any
      cleanup();

      const container = docker.getContainer(containerId);
      
      // Try to get a working shell
      const exec = await tryExecWithShells(container);

      // Start exec instance and attach to it
      const stream = await exec.start({
        Tty: true,
        stdin: true,
        hijack: true
      });

      currentStream = stream;

      stream.on('data', (chunk: Buffer) => {
        socket.emit('terminal-output', chunk.toString());
      });

      // Create new handler and store reference for cleanup
      terminalInputHandler = (data: string) => {
        if (currentStream && !currentStream.destroyed) {
          currentStream.write(data);
        }
      };

      socket.on('terminal-input', terminalInputHandler);

      // Show that we're in the virtual environment
      socket.emit('terminal-output', '\n=== Python virtual environment is active ===\n\n$ ');

    } catch (error) {
      console.error('Error attaching to container:', error);
      socket.emit('error', { 
        message: 'Failed to attach to container. The container might not have a shell available.'
      });
    }
  });

  socket.on('disconnect', cleanup);
});