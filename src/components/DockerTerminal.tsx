import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import { getContainerIdByUsername } from '../lib/supabase';
import 'xterm/css/xterm.css';

interface Container {
  Id: string;
  Names: string[];
  State: string;
  Image: string;
}

interface DockerTerminalProps {
  username: string;
}

export const DockerTerminal: React.FC<DockerTerminalProps> = ({ username }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [fitAddon] = useState(new FitAddon());

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 10,
      transports: ['websocket'],
      agent: false,
      upgrade: false,
      rejectUnauthorized: false
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('list-containers');
    });

    newSocket.on('containers-list', (containersList: Container[]) => {
      setContainers(containersList);
    });

    newSocket.on('container-created', ({ containerId }) => {
      setSelectedContainer(containerId);
      setIsCreating(false);
    });

    newSocket.on('container-removed', ({ containerId }) => {
      if (selectedContainer === containerId) {
        setSelectedContainer('');
      }
      setIsRemoving(false);
    });

    newSocket.on('container-renamed', () => {
      setIsRenaming(false);
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('Server error:', error.message);
      setIsCreating(false);
      setIsRemoving(false);
      setIsRenaming(false);
      alert(error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
      },
      rows: 24,
      cols: 80,
      convertEol: true,
      cursorStyle: 'block',
    });

    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    
    // Ensure the terminal is mounted before fitting
    setTimeout(() => {
      if (terminalRef.current) {
        fitAddon.fit();
      }
    }, 0);

    setTerminal(term);

    const handleResize = () => {
      if (terminalRef.current) {
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      term.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [fitAddon]);

  // Handle terminal data
  useEffect(() => {
    if (!socket || !terminal) return;

    const handleTerminalData = (data: string) => {
      if (socket) {
        socket.emit('terminal-input', data);
      }
    };

    socket.on('terminal-output', (data: string) => {
      if (terminal) {
        terminal.write(data);
      }
    });

    terminal.onData(handleTerminalData);

    return () => {
      socket.off('terminal-output');
      terminal.off('data', handleTerminalData);
    };
  }, [socket, terminal]);

  // Auto-connect to user's container on mount
  useEffect(() => {
    const connectToUserContainer = async () => {
      if (socket && terminal) {
        const containerId = await getContainerIdByUsername(username);
        if (containerId) {
          terminal.clear();
          terminal.reset();
          socket.emit('attach-container', containerId);
          setSelectedContainer(containerId);
        }
      }
    };

    connectToUserContainer();
  }, [socket, terminal, username]);

  const handleContainerSelect = async (containerId: string) => {
    setSelectedContainer(containerId);
    if (socket && terminal) {
      terminal.clear();
      terminal.reset();
      socket.emit('attach-container', containerId);
    }
  };

  const handleCreateContainer = () => {
    if (socket) {
      const name = prompt('Enter a name for the new container:');
      if (name) {
        setIsCreating(true);
        socket.emit('create-container', { name });
      }
    }
  };

  const handleRemoveContainer = () => {
    if (socket && selectedContainer && !isRemoving) {
      if (window.confirm('Are you sure you want to remove this container? This action cannot be undone.')) {
        setIsRemoving(true);
        socket.emit('remove-container', selectedContainer);
      }
    }
  };

  const handleRenameContainer = () => {
    if (socket && selectedContainer && !isRenaming) {
      const selectedContainerInfo = containers.find(c => c.Id === selectedContainer);
      const currentName = selectedContainerInfo ? selectedContainerInfo.Names[0].replace('/', '') : '';
      const newName = prompt('Enter new name for the container:', currentName);
      
      if (newName && newName !== currentName) {
        setIsRenaming(true);
        socket.emit('rename-container', { containerId: selectedContainer, newName });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="mb-4 flex items-center gap-4">
        <select
          value={selectedContainer}
          onChange={(e) => handleContainerSelect(e.target.value)}
          className="p-2 border rounded flex-grow"
          disabled={isCreating || isRemoving || isRenaming}
        >
          <option value="">Select a container</option>
          {containers.map((container) => (
            <option key={container.Id} value={container.Id}>
              {container.Names[0].replace('/', '')} ({container.State})
            </option>
          ))}
        </select>
        <button
          onClick={handleCreateContainer}
          disabled={isCreating || isRemoving || isRenaming}
          className={`px-4 py-2 rounded text-white ${
            isCreating || isRemoving || isRenaming
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isCreating ? 'Creating...' : 'Create New Container'}
        </button>
        <button
          onClick={handleRenameContainer}
          disabled={!selectedContainer || isCreating || isRemoving || isRenaming}
          className={`px-4 py-2 rounded text-white ${
            !selectedContainer || isCreating || isRemoving || isRenaming
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-yellow-500 hover:bg-yellow-600'
          }`}
        >
          {isRenaming ? 'Renaming...' : 'Rename Container'}
        </button>
        <button
          onClick={handleRemoveContainer}
          disabled={!selectedContainer || isCreating || isRemoving || isRenaming}
          className={`px-4 py-2 rounded text-white ${
            !selectedContainer || isCreating || isRemoving || isRenaming
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isRemoving ? 'Removing...' : 'Remove Container'}
        </button>
      </div>
      <div 
        ref={terminalRef}
        className="flex-1 bg-[#1e1e1e] rounded-lg overflow-hidden p-2"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}; 