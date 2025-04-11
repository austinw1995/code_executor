import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getContainerIdByUsername, saveCodeFile, getUserFiles, getCodeFile, deleteCodeFile } from '../lib/supabase';
import Editor from '@monaco-editor/react';

interface TerminalProps {
  username: string;
  onLogout: () => void;
}

interface UserFile {
  file_name: string;
  last_saved: string;
}

type Language = 'python' | 'javascript';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const Terminal: React.FC<TerminalProps> = ({ username, onLogout }) => {
  const [output, setOutput] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [containerName, setContainerName] = useState<string>('');
  const [editorContent, setEditorContent] = useState<string>('# Write your Python code here...');
  const [fileName, setFileName] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('python');
  const socketRef = useRef<Socket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Auto-scroll effect
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]); // This will run every time output changes

  // Fetch container name
  useEffect(() => {
    const fetchContainerName = async () => {
      const containerId = await getContainerIdByUsername(username);
      if (containerId) {
        setContainerName(`user-${username}-container`);
      }
    };
    fetchContainerName();
  }, [username]);

  // Fetch user's files
  useEffect(() => {
    const fetchUserFiles = async () => {
      const { data, error } = await getUserFiles(username);
      if (data) {
        setUserFiles(data);
      } else if (error) {
        console.error('Error fetching files:', error);
      }
    };
    fetchUserFiles();
  }, [username, saveStatus]); // Refresh when files are saved

  useEffect(() => {
    // Connect to WebSocket
    socketRef.current = io(BACKEND_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket']
    });

    // Listen for installation output
    socketRef.current.on(`installation-${username}`, (data: string) => {
      // Only add newline if it's not a prompt
      const formattedData = !data.includes('venv') && !data.endsWith('\n') ? data + '\n' : data;
      setOutput(prev => prev + formattedData);
    });

    // Listen for container ready event
    socketRef.current.on(`container-ready-${username}`, () => {
      // Container is ready, authenticate to start using it
      socketRef.current?.emit('authenticate', username);
    });

    // Listen for terminal output after container is ready
    socketRef.current.on(`terminal-output-${username}`, (data: string) => {
      // Only add newline if it's not a prompt
      const formattedData = !data.includes('venv') && !data.endsWith('\n') ? data + '\n' : data;
      setOutput(prev => prev + formattedData);
    });

    // Handle regular terminal output
    socketRef.current.on('terminal-output', (data: string) => {
      // Only add newline if it's not a prompt
      const formattedData = !data.includes('venv') && !data.endsWith('\n') ? data + '\n' : data;
      setOutput(prev => prev + formattedData);
    });

    // Handle errors
    socketRef.current.on('error', (error: string) => {
      console.error('Socket error:', error);
      // Always ensure error messages end with a newline
      const errorMessage = error.endsWith('\n') ? error : error + '\n';
      setOutput(prev => prev + '\nError: ' + errorMessage);
    });

    // Initial authentication attempt
    socketRef.current.emit('authenticate', username);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [username]);

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    onLogout();
    navigate('/');
  };

  const handleSave = async () => {
    let fileNameToSave = fileName.trim();
    
    if (selectedFileName && !fileNameToSave) {
      // Case 1: Update existing file
      fileNameToSave = selectedFileName;
    }

    if (!fileNameToSave) {
      setSaveStatus('Please enter a file name');
      return;
    }

    // Validate file extension
    if (!fileNameToSave.endsWith('.py') && !fileNameToSave.endsWith('.js')) {
      setSaveStatus('File name must end with .py or .js');
      return;
    }

    // Ensure language matches file extension
    const fileExtension = fileNameToSave.endsWith('.py') ? '.py' : '.js';
    const expectedLanguage = fileExtension === '.py' ? 'python' : 'javascript';
    
    if (selectedLanguage !== expectedLanguage) {
      setSelectedLanguage(expectedLanguage);
    }

    const { error, isUpdate } = await saveCodeFile(
      username,
      fileNameToSave,
      editorContent,
      selectedFileName
    );

    if (error) {
      setSaveStatus('Error saving file');
      console.error('Save error:', error);
    } else {
      const timestamp = new Date().toLocaleString();
      if (isUpdate) {
        // If we provided a new name, it's a rename operation
        if (fileName.trim() && fileName.trim() !== selectedFileName) {
          setSaveStatus(`File renamed to "${fileNameToSave}" at ${timestamp}`);
        } else {
          setSaveStatus(`File updated at ${timestamp}`);
        }
      } else {
        setSaveStatus(`New file created at ${timestamp}`);
      }

      // Update the selected file name if it was renamed or newly created
      if (fileName.trim()) {
        setSelectedFileName(fileNameToSave);
      }
      
      // Clear the input field after save
      setFileName('');
      
      // Clear the status message after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);

      // Refresh the file list to show the renamed file
      const { data: updatedFiles } = await getUserFiles(username);
      if (updatedFiles) {
        setUserFiles(updatedFiles);
      }
    }
  };

  const handleFileSelect = async (selectedFile: string) => {
    if (!selectedFile) {
      setSelectedFileName('');
      setEditorContent(getDefaultContent(selectedLanguage));
      setFileName('');
      return;
    }

    // Auto-select language based on file extension
    if (selectedFile.endsWith('.py')) {
      setSelectedLanguage('python');
    } else if (selectedFile.endsWith('.js')) {
      setSelectedLanguage('javascript');
    }

    setSelectedFileName(selectedFile);
    const { data, error } = await getCodeFile(username, selectedFile);
    if (data) {
      setEditorContent(data.code_content);
      setFileName(''); // Clear the input field when selecting a file
    } else if (error) {
      console.error('Error loading file:', error);
    }
  };

  const getPlaceholderText = () => {
    if (selectedFileName) {
      return `Rename "${selectedFileName}" (must end with .py or .js)`;
    }
    return 'New file name (must end with .py or .js)';
  };

  const formatLastSaved = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const resetEditorState = () => {
    setFileName('');
    setEditorContent(getDefaultContent(selectedLanguage));
    setSaveStatus('');
    setSelectedFileName('');
  };

  const handleRemoveFile = async () => {
    if (!selectedFileName) {
      setSaveStatus('No file selected to remove');
      return;
    }

    const removedFileName = selectedFileName; // Store the name for the message
    const { error } = await deleteCodeFile(username, selectedFileName);
    if (error) {
      setSaveStatus('Error removing file');
      console.error('Remove error:', error);
    } else {
      const timestamp = new Date().toLocaleString();
      setSaveStatus(`File "${removedFileName}" removed at ${timestamp}`);
      
      // Refresh the file list first
      const { data: updatedFiles } = await getUserFiles(username);
      if (updatedFiles) {
        setUserFiles(updatedFiles);
      }

      // Clear the status message and reset editor state after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
        resetEditorState();
      }, 3000);
    }
  };

  const handleRun = () => {
    if (!socketRef.current) return;
    
    // Create a script based on selected language
    const script = selectedLanguage === 'python'
      ? `python3 -c "${editorContent.replace(/"/g, '\\"')}"`
      : `node -e "${editorContent.replace(/"/g, '\\"')}"`;
    
    // Send the command to the terminal
    socketRef.current.emit('terminal-input', script + '\n');
  };

  // Convert ANSI color codes to CSS styles
  const formatAnsiText = (text: string) => {
    const ansiToStyle: { [key: string]: React.CSSProperties } = {
      // Colors
      '[30m': { color: 'black' },
      '[31m': { color: 'red' },
      '[32m': { color: 'green' },
      '[33m': { color: '#FFA500' }, // yellow but more readable
      '[34m': { color: 'blue' },
      '[35m': { color: 'magenta' },
      '[36m': { color: 'cyan' },
      '[37m': { color: 'white' },
      '[39m': { color: 'inherit' },
      '[90m': { color: 'grey' },
      // Text formatting
      '[0m': { color: 'inherit', fontWeight: 'normal', fontStyle: 'normal' },
      '[1m': { fontWeight: 'bold' },
      '[3m': { fontStyle: 'italic' }
    };

    // Split text into segments that include ANSI codes
    const segments = text.split(/(\[\d{1,2}m)/);
    let currentStyle: React.CSSProperties = {};
    
    return segments.map((segment, index) => {
      if (ansiToStyle[segment]) {
        // Merge new styles with existing ones
        currentStyle = { ...currentStyle, ...ansiToStyle[segment] };
        // Reset all styles if reset code
        if (segment === '[0m') {
          currentStyle = {};
        }
        return null; // Don't render the ANSI code
      }
      if (segment) {
        return <span key={index} style={currentStyle} dangerouslySetInnerHTML={{ __html: segment }} />;
      }
      return null;
    });
  };

  const getDefaultContent = (language: Language) => {
    return language === 'python' 
      ? '# Write your Python code here...'
      : '//Write your Javascript code here';
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setSelectedLanguage(newLanguage);
    if (!selectedFileName && editorContent === getDefaultContent(selectedLanguage)) {
      setEditorContent(getDefaultContent(newLanguage));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Code Execution Platform</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {username}!</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 focus:outline-none"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {containerName && (
          <div className="mb-4 bg-white shadow-sm rounded-lg p-4 border border-gray-100">
            <span className="text-gray-700">Connected to container: </span>
            <span className="font-mono font-medium text-blue-600">{containerName}</span>
          </div>
        )}
        <div className="flex gap-6">
          {/* Code Editor */}
          <div className="w-1/2 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800">Code Editor</h2>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={resetEditorState}
                        className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm hover:shadow-md active:shadow-sm"
                      >
                        New File
                      </button>
                      {selectedFileName && (
                        <button
                          onClick={handleRemoveFile}
                          className="bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm hover:shadow-md active:shadow-sm"
                        >
                          Remove File
                        </button>
                      )}
                      <button
                        onClick={handleSave}
                        className="bg-blue-500 text-white px-4 py-1.5 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md active:shadow-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleRun}
                        className="bg-purple-500 text-white px-6 py-1.5 rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm hover:shadow-md active:shadow-sm flex items-center space-x-2"
                      >
                        <span>Run</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {saveStatus && (
                    <p className={`text-sm px-3 py-1.5 rounded-md ${
                      saveStatus.includes('Error') 
                        ? 'text-red-700 bg-red-50 border border-red-100' 
                        : 'text-green-700 bg-green-50 border border-green-100'
                    }`}>
                      {saveStatus}
                    </p>
                  )}
                </div>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 w-24">Open file:</span>
                    <select
                      value={selectedFileName}
                      onChange={(e) => handleFileSelect(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="">Select a file...</option>
                      {userFiles.map((file) => (
                        <option key={file.file_name} value={file.file_name}>
                          {file.file_name} ({formatLastSaved(file.last_saved)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 w-24">File name:</span>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder={getPlaceholderText()}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 w-24">Language:</span>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value as Language)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[600px] border-t border-gray-100">
              <Editor
                height="100%"
                defaultLanguage="python"
                language={selectedLanguage}
                theme="vs-dark"
                value={editorContent}
                onChange={(value) => setEditorContent(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 20 },
                  lineHeight: 1.6,
                }}
              />
            </div>
          </div>

          {/* Terminal */}
          <div className="w-1/2 bg-black rounded-xl shadow-lg overflow-hidden">
            <div
              ref={terminalRef}
              className="font-mono text-white whitespace-pre-wrap h-[704px] overflow-y-auto focus:outline-none p-5"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (socketRef.current) {
                    socketRef.current.emit('terminal-input', input + '\n');
                    setInput('');
                  }
                } else if (e.key === 'Backspace') {
                  setInput(prev => prev.slice(0, -1));
                } else if (e.key.length === 1) {
                  setInput(prev => prev + e.key);
                }
              }}
            >
              {formatAnsiText(output)}
              <span className="inline-block">{input}</span>
              <span className="inline-block animate-blink">▋</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};