export interface ProjectFile {
  fileName: string;
  fileHash: string;
  uploadedAt: Date;
  fileSize: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectManager {
  private projects: Map<string, Project> = new Map();
  private currentProjectId: string | null = null;
  private storageKey = 'projects_metadata';

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Creates a new project.
   */
  createProject(name: string, description?: string): Project {
    const projectId = this.generateId();
    const project: Project = {
      id: projectId,
      name,
      description,
      files: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(projectId, project);
    this.currentProjectId = projectId;
    this.saveToLocalStorage();
    return project;
  }

  /**
   * Gets a project by ID.
   */
  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Gets all projects.
   */
  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * Sets the current project.
   */
  setCurrentProject(projectId: string): boolean {
    if (this.projects.has(projectId)) {
      this.currentProjectId = projectId;
      return true;
    }
    return false;
  }

  /**
   * Gets the current project.
   */
  getCurrentProject(): Project | null {
    return this.currentProjectId ? this.projects.get(this.currentProjectId) || null : null;
  }

  /**
   * Gets the current project ID.
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Adds a file to a project.
   */
  addFileToProject(projectId: string, file: ProjectFile): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    // Check if file already exists
    const existingFileIndex = project.files.findIndex(f => f.fileHash === file.fileHash);
    if (existingFileIndex >= 0) {
      // Update existing file
      project.files[existingFileIndex] = file;
    } else {
      // Add new file
      project.files.push(file);
    }

    project.updatedAt = new Date();
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Removes a file from a project.
   */
  removeFileFromProject(projectId: string, fileHash: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    const initialLength = project.files.length;
    project.files = project.files.filter(f => f.fileHash !== fileHash);

    if (project.files.length < initialLength) {
      project.updatedAt = new Date();
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  /**
   * Gets all files in a project.
   */
  getProjectFiles(projectId: string): ProjectFile[] {
    const project = this.projects.get(projectId);
    return project ? project.files : [];
  }

  /**
   * Deletes a project.
   */
  deleteProject(projectId: string): boolean {
    const deleted = this.projects.delete(projectId);
    if (deleted) {
      if (this.currentProjectId === projectId) {
        this.currentProjectId = null;
      }
      this.saveToLocalStorage();
    }
    return deleted;
  }

  /**
   * Updates project metadata.
   */
  updateProject(projectId: string, updates: Partial<Pick<Project, 'name' | 'description'>>): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    if (updates.name) project.name = updates.name;
    if (updates.description) project.description = updates.description;
    project.updatedAt = new Date();
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Saves projects to localStorage.
   */
  private saveToLocalStorage() {
    const data = {
      projects: Array.from(this.projects.entries()).map(([id, project]) => ({
        id,
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      })),
      currentProjectId: this.currentProjectId,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   * Loads projects from localStorage.
   */
  private loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.projects.clear();
        parsed.projects.forEach((project: any) => {
          project.createdAt = new Date(project.createdAt);
          project.updatedAt = new Date(project.updatedAt);
          project.files.forEach((file: any) => {
            file.uploadedAt = new Date(file.uploadedAt);
          });
          this.projects.set(project.id, project);
        });
        this.currentProjectId = parsed.currentProjectId;
      }
    } catch (error) {
      console.error('Error loading projects from localStorage:', error);
    }
  }

  /**
   * Generates a unique ID.
   */
  private generateId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
