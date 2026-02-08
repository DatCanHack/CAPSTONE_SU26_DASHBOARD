interface CodeViewerProps {
  code: string;
  language?: string;
  fileName?: string;
  highlights?: number[];
}

export function CodeViewer({ code, language = 'java', fileName, highlights = [] }: CodeViewerProps) {
  const lines = code.split('\n');

  // Simple Java syntax highlighting
  const highlightSyntax = (line: string) => {
    // Keywords
    line = line.replace(/\b(public|private|protected|static|final|class|interface|extends|implements|import|package|void|int|String|boolean|return|if|else|for|while|throw|new|try|catch)\b/g, '<span class="text-purple-400">$1</span>');
    
    // Strings
    line = line.replace(/"([^"]*)"/g, '<span class="text-green-400">"$1"</span>');
    
    // Comments
    line = line.replace(/(\/\/.*$)/g, '<span class="text-gray-500">$1</span>');
    line = line.replace(/(\/\*.*?\*\/)/g, '<span class="text-gray-500">$1</span>');
    
    // Numbers
    line = line.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>');
    
    // Annotations
    line = line.replace(/(@\w+)/g, '<span class="text-yellow-400">$1</span>');
    
    return line;
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden">
      {fileName && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#252525] border-b border-[#333333]">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-400 ml-2">{fileName}</span>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          <div className="flex-shrink-0 bg-[#0d0d0d] border-r border-[#333333] px-3 py-4 text-right select-none">
            {lines.map((_, index) => (
              <div
                key={index}
                className={`text-xs leading-6 ${
                  highlights.includes(index + 1) ? 'text-yellow-400 font-bold' : 'text-gray-600'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="flex-1 px-4 py-4 overflow-x-auto">
            {lines.map((line, index) => (
              <div
                key={index}
                className={`text-sm leading-6 font-mono ${
                  highlights.includes(index + 1) ? 'bg-yellow-500/10 -mx-4 px-4' : ''
                }`}
              >
                <code
                  className="text-gray-300"
                  dangerouslySetInnerHTML={{ __html: highlightSyntax(line) || '&nbsp;' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
