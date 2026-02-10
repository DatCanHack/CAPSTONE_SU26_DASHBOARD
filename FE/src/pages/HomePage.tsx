import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { useSearch } from '../lib/search';
import { Plus, FolderOpen, Calendar, Trash2, FileCode, Loader2, AlertTriangle, SearchX } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; project: Project | null }>({ show: false, project: null });
  const [deleting, setDeleting] = useState(false);
  const { searchQuery } = useSearch();

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(query) ||
      project.id.toString().includes(query)
    );
  }, [projects, searchQuery]);

  // Highlight matching text in project name
  const highlightMatch = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="bg-blue-500/30 text-blue-300 px-0.5 rounded">{part}</span>
      ) : part
    );
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      try {
        setCreating(true);
        setError('');
        await api.createProject(projectName.trim());
        setProjectName('');
        setShowModal(false);
        loadProjects(); // Reload projects
      } catch (error) {
        console.error('Failed to create project:', error);
        setError(error instanceof Error ? error.message : 'Failed to create project');
      } finally {
        setCreating(false);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteModal.project) return;
    
    try {
      setDeleting(true);
      await api.deleteProject(deleteModal.project.id);
      setDeleteModal({ show: false, project: null });
      loadProjects(); // Reload projects
    } catch (error) {
      console.error('Failed to delete project:', error);
      setError('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Projects</h1>
            <p className="text-gray-400 text-sm">
              {searchQuery ? (
                <>
                  Found <span className="text-blue-400 font-medium">{filteredProjects.length}</span> of {projects.length} projects
                </>
              ) : (
                'Manage your SAST scanning projects'
              )}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>

        {loading ? (
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
            <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400 text-sm">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="bg-[#1a1a1a] border border-red-500/30 rounded-lg p-12 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadProjects}
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
            >
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6 text-sm">Create your first project to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
            <SearchX className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-gray-400 mb-2 text-sm">
              No projects matching "<span className="text-blue-400">{searchQuery}</span>"
            </p>
            <p className="text-gray-500 text-xs">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-5 hover:border-[#404040] transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <FileCode className="w-5 h-5 text-blue-500" />
                      <h3 className="font-medium text-white">{highlightMatch(project.name)}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Calendar className="w-3 h-3" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                    <p className="text-xs text-gray-500">
                      ID: {project.id}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteModal({ show: true, project })}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Link
                  to={`/project/${project.id}`}
                  className="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Open Project
                </Link>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg w-full max-w-md p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Create New Project</h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter project name"
                    disabled={creating}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setProjectName('');
                      setError('');
                    }}
                    disabled={creating}
                    className="flex-1 px-4 py-2.5 border border-[#333333] text-gray-300 rounded-lg hover:bg-[#252525] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.show && deleteModal.project && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Delete Project</h2>
                  <p className="text-sm text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-300">
                  Are you sure you want to delete project{' '}
                  <span className="font-semibold text-white">"{deleteModal.project.name}"</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  All scans, reports, and data associated with this project will be permanently deleted.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ show: false, project: null })}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-[#333333] text-gray-300 rounded-lg hover:bg-[#252525] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deleting ? 'Deleting...' : 'Delete Project'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
