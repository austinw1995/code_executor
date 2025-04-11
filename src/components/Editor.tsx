import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  defaultLanguage?: string;
  defaultValue?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  defaultLanguage = 'python',
  defaultValue = '# Enter your code here\nprint("Hello, World!")',
}) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="h-full bg-gray-900 p-4">
      <div className="h-full rounded border border-gray-700 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage={defaultLanguage}
          defaultValue={defaultValue}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
};

export default CodeEditor;