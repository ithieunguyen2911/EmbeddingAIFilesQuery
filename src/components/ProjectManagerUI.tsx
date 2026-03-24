import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderOpen, FileText, Calendar } from 'lucide-react';
import { Project, ProjectFile } from '../services/ProjectManager';
import { ChatEngine } from '../services/ChatEngine';

interface ProjectManagerUIProps {
  chatEngine: ChatEngine;
  onProjectChange: (projectId: string) => void;
  currentProjectId: string | null;
}

export const ProjectManagerUI: React.FC<ProjectManagerUIProps> = ({
  chatEngine,
  onProjectChange,
  currentProjectId,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [storageStats, setStorageStats] = useState<{ filesCount: number; totalSize: number } | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Update storage stats when project changes
  useEffect(() => {
    if (currentProjectId) {
      updateStorageStats();
    }
  }, [currentProjectId]);

  const loadProjects = () => {
    const allProjects = chatEngine.getAllProjects();
    setProjects(allProjects);
  };

  const updateStorageStats = async () => {
    const stats = await chatEngine.getProjectStorageStats();
    setStorageStats(stats);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const project = chatEngine.createProject(newProjectName, newProjectDesc || undefined);
    onProjectChange(project.id);
    setNewProjectName('');
    setNewProjectDesc('');
    setShowCreateForm(false);
    loadProjects();
  };

  const handleSelectProject = (projectId: string) => {
    chatEngine.setCurrentProject(projectId);
    onProjectChange(projectId);
    setExpandedProjectId(projectId);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Bạn có chắc muốn xóa project này? Tất cả files và vectors sẽ bị xóa.')) {
      await chatEngine.deleteProject(projectId);
      if (currentProjectId === projectId) {
        onProjectChange('');
      }
      loadProjects();
    }
  };

  const handleRemoveFile = async (projectId: string, fileHash: string) => {
    if (confirm('Bạn có chắc muốn xóa file này?')) {
      await chatEngine.removeProjectFile(projectId, fileHash);
      loadProjects();
      if (currentProjectId === projectId) {
        updateStorageStats();
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="border-l border-gray-200 p-4 w-64 bg-gray-50 overflow-y-auto max-h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Projects</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-1.5 hover:bg-gray-200 rounded"
          title="Create new project"
        >
          <Plus size={20} className="text-gray-600" />
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4 space-y-2">
          <input
            type="text"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateProject}
              className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentProjectId && storageStats && (
        <div className="bg-blue-50 p-3 rounded-lg mb-4 text-xs border border-blue-200">
          <p className="font-semibold text-blue-900 mb-1">Storage Info</p>
          <p className="text-blue-800">Files: {storageStats.filesCount}</p>
          <p className="text-blue-800">Size: {formatFileSize(storageStats.totalSize)}</p>
        </div>
      )}

      <div className="space-y-2">
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Chưa có projects</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => handleSelectProject(project.id)}
                className={`w-full p-3 text-left text-sm font-medium transition ${
                  currentProjectId === project.id
                    ? 'bg-blue-100 text-blue-900 border-b border-gray-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} />
                    <span>{project.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Delete project"
                  >
                    <Trash2 size={14} className="text-red-600" />
                  </button>
                </div>
                {project.description && (
                  <p className="text-xs text-gray-600 mt-1">{project.description}</p>
                )}
              </button>

              {expandedProjectId === project.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-2">
                  {project.files.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">No files yet</p>
                  ) : (
                    <div className="space-y-1">
                      {project.files.map((file) => (
                        <div
                          key={file.fileHash}
                          className="bg-white p-2 rounded text-xs border border-gray-200"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <FileText size={12} className="text-gray-600 flex-shrink-0" />
                                <span className="font-medium truncate text-gray-700">
                                  {file.fileName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-500 ml-4">
                                <Calendar size={10} />
                                <span>{formatDate(file.uploadedAt)}</span>
                              </div>
                              <div className="ml-4 text-gray-500">
                                {formatFileSize(file.fileSize)}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(project.id, file.fileHash);
                              }}
                              className="p-1 hover:bg-red-100 rounded flex-shrink-0"
                              title="Remove file"
                            >
                              <Trash2 size={12} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectManagerUI;
