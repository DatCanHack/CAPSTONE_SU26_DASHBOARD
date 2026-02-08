import { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileList;
  onFileSelect: (file: File) => void;
  selectedFile: string | null;
}

export function FileTree({ files, onFileSelect, selectedFile }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build tree structure from FileList
  const buildFileTree = (fileList: FileList): FileNode[] => {
    const tree: FileNode[] = [];
    const fileArray = Array.from(fileList);

    fileArray.forEach((file) => {
      const parts = file.webkitRelativePath ? file.webkitRelativePath.split('/') : [file.name];
      let currentLevel = tree;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const existing = currentLevel.find((node) => node.name === part);

        if (existing) {
          if (!isFile && existing.children) {
            currentLevel = existing.children;
          }
        } else {
          const newNode: FileNode = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
          };
          currentLevel.push(newNode);
          if (!isFile && newNode.children) {
            currentLevel = newNode.children;
          }
        }
      });
    });

    return tree;
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = (path: string) => {
    const file = Array.from(files).find(
      (f) => (f.webkitRelativePath || f.name) === path
    );
    if (file) {
      onFileSelect(file);
    }
  };

  const renderTree = (nodes: FileNode[], level: number = 0): JSX.Element[] => {
    return nodes.map((node) => (
      <div key={node.path}>
        {node.type === 'folder' ? (
          <>
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-2 px-2 py-1 hover:bg-[#2a2a2a] cursor-pointer text-sm text-gray-300 rounded group"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              {expandedFolders.has(node.path) ? (
                <FolderOpen className="w-4 h-4 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 text-blue-400" />
              )}
              <span>{node.name}</span>
            </div>
            {expandedFolders.has(node.path) && node.children && (
              <div>{renderTree(node.children, level + 1)}</div>
            )}
          </>
        ) : (
          <div
            onClick={() => handleFileClick(node.path)}
            className={`flex items-center gap-2 px-2 py-1 hover:bg-[#2a2a2a] cursor-pointer text-sm rounded group ${
              selectedFile === node.path ? 'bg-[#2a2a2a] text-white' : 'text-gray-400'
            }`}
            style={{ paddingLeft: `${level * 12 + 24}px` }}
          >
            <FileCode className="w-4 h-4 text-blue-400" />
            <span className="truncate">{node.name}</span>
          </div>
        )}
      </div>
    ));
  };

  const tree = buildFileTree(files);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2">{renderTree(tree)}</div>
    </div>
  );
}
