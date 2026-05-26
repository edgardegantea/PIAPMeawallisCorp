import api from './api';

export const projectsAPI = {
  // Proyectos
  getProjects:    (p)  => api.get('/projects', { params: p }),
  getProject:     (id) => api.get(`/projects/${id}`),
  createProject:  (d)  => api.post('/projects', d),
  updateProject:  (id, d) => api.patch(`/projects/${id}`, d),
  deleteProject:  (id) => api.delete(`/projects/${id}`),
  getStatistics:  ()   => api.get('/projects/statistics'),
  getMyProjects:  ()   => api.get('/projects/my'),
  updateProgress: (id, pct) => api.post(`/projects/${id}/progress`, { completion_percentage: pct }),

  // Categorías
  getCategories:    ()     => api.get('/categories'),
  createCategory:   (d)    => api.post('/categories', d),
  updateCategory:   (id, d)=> api.patch(`/categories/${id}`, d),
  deleteCategory:   (id)   => api.delete(`/categories/${id}`),

  // Sprints
  getSprints:        (projectId) => api.get('/sprints', { params: { project: projectId } }),
  getSprint:         (id)        => api.get(`/sprints/${id}`),
  createSprint:      (d)         => api.post('/sprints', d),
  updateSprint:      (id, d)     => api.patch(`/sprints/${id}`, d),
  deleteSprint:      (id)        => api.delete(`/sprints/${id}`),
  getSprintBurndown: (id)        => api.get(`/sprints/${id}/burndown`),
  getSprintVelocity: (projectId) => api.get('/sprints/velocity', { params: { project: projectId } }),

  // Backlog
  getBacklogItems:  (projectId) => api.get('/backlog', { params: { project: projectId } }),
  createBacklogItem:(d)         => api.post('/backlog', d),
  updateBacklogItem:(id, d)     => api.patch(`/backlog/${id}`, d),
  deleteBacklogItem:(id)        => api.delete(`/backlog/${id}`),

  // Tareas (Kanban)
  getTasks:    (params) => api.get('/tasks', { params }),
  getMyTasks:  (params) => api.get('/tasks/my', { params }),
  createTask:  (d)      => api.post('/tasks', d),
  updateTask:  (id, d)  => api.patch(`/tasks/${id}`, d),
  deleteTask:  (id)     => api.delete(`/tasks/${id}`),

  // Comentarios de tarea
  getTaskComments:   (taskId) => api.get(`/tasks/${taskId}/comments`),
  createTaskComment: (taskId, d) => api.post(`/tasks/${taskId}/comments`, d),
  updateTaskComment: (commentId, d) => api.patch(`/task-comments/${commentId}`, d),
  deleteTaskComment: (commentId) => api.delete(`/task-comments/${commentId}`),

  // Hitos (Milestones)
  getMilestones:    (projectId) => api.get('/milestones', { params: { project: projectId } }),
  createMilestone:  (d)         => api.post('/milestones', d),
  updateMilestone:  (id, d)     => api.patch(`/milestones/${id}`, d),
  deleteMilestone:  (id)        => api.delete(`/milestones/${id}`),
  completeMilestone:(id)        => api.post(`/milestones/${id}/complete`),

  // Riesgos
  getRisks:    (projectId) => api.get('/risks', { params: { project: projectId } }),
  createRisk:  (d)         => api.post('/risks', d),
  updateRisk:  (id, d)     => api.patch(`/risks/${id}`, d),
  deleteRisk:  (id)        => api.delete(`/risks/${id}`),

  // Incidencias
  getIncidents:    (projectId) => api.get('/incidents', { params: { project: projectId } }),
  createIncident:  (d)         => api.post('/incidents', d),
  updateIncident:  (id, d)     => api.patch(`/incidents/${id}`, d),
  deleteIncident:  (id)        => api.delete(`/incidents/${id}`),

  // Miembros
  getMembers:   (projectId) => api.get('/members', { params: { project: projectId } }),
  addMember:    (d)         => api.post('/members', d),
  updateMember: (id, d)     => api.patch(`/members/${id}`, d),
  removeMember: (id)        => api.delete(`/members/${id}`),

  // Documentos
  getDocuments:   (projectId) => api.get('/documents', { params: { project: projectId } }),
  uploadDocument: (formData)  => api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDocument: (id)        => api.delete(`/documents/${id}`),

  // Usuarios
  getUsers:          (p) => api.get('/users', { params: p }),
  getUser:           (id) => api.get(`/users/${id}`),

  // Admin - User Management
  adminCreateUser:   (d)     => api.post('/admin/users', d),
  adminUpdateUser:   (id, d) => api.patch(`/admin/users/${id}`, d),
  adminDeleteUser:   (id)    => api.delete(`/admin/users/${id}`),
  adminActivateUser: (id)    => api.post(`/admin/users/${id}/activate`),
  adminGetTeams:     ()      => api.get('/admin/teams'),

  // Task Checklists
  getChecklists:    (taskId)      => api.get(`/tasks/${taskId}/checklists`),
  createChecklist:  (taskId, d)   => api.post(`/tasks/${taskId}/checklists`, d),
  updateChecklist:  (id, d)       => api.patch(`/checklists/${id}`, d),
  deleteChecklist:  (id)          => api.delete(`/checklists/${id}`),

  // Time Logs
  getTimeLogs:    (taskId)      => api.get(`/tasks/${taskId}/timelogs`),
  createTimeLog:  (taskId, d)   => api.post(`/tasks/${taskId}/timelogs`, d),
  updateTimeLog:  (id, d)       => api.patch(`/timelogs/${id}`, d),
  deleteTimeLog:  (id)          => api.delete(`/timelogs/${id}`),

  // Activity
  getActivity:    (projectId)   => api.get(`/projects/${projectId}/activity`),
  updateActivity: (id, data)    => api.put(`/activity/${id}`, data),
  deleteActivity: (id)          => api.delete(`/activity/${id}`),

  // Favorites
  getFavorites:   ()            => api.get('/favorites'),
  toggleFavorite: (projectId)   => api.post(`/favorites/${projectId}`),

  // Workload
  getWorkload:    (projectId)   => api.get(`/projects/${projectId}/workload`),

  // Search
  search:         (q)           => api.get('/search', { params: { q } }),

  // Certificaciones (perfil)
  getCertifications:    ()      => api.get('/profile/certifications'),
  createCertification:  (d)     => api.post('/profile/certifications', d),
  updateCertification:  (id, d) => api.patch(`/profile/certifications/${id}`, d),
  deleteCertification:  (id)    => api.delete(`/profile/certifications/${id}`),

  // Logros (perfil)
  getAchievements:    ()      => api.get('/profile/achievements'),
  createAchievement:  (d)     => api.post('/profile/achievements', d),
  updateAchievement:  (id, d) => api.patch(`/profile/achievements/${id}`, d),
  deleteAchievement:  (id)    => api.delete(`/profile/achievements/${id}`),

  // Contratos de proyecto
  getContracts:    (projectId)      => api.get(`/projects/${projectId}/contracts`),
  createContract:  (projectId, d)   => api.post(`/projects/${projectId}/contracts`, d),
  updateContract:  (id, d)          => api.patch(`/contracts/${id}`, d),
  deleteContract:  (id)             => api.delete(`/contracts/${id}`),

  // Documentación técnica de proyecto
  getTechnicalDocs:    (projectId)    => api.get(`/projects/${projectId}/technicaldocs`),
  createTechnicalDoc:  (projectId, d) => api.post(`/projects/${projectId}/technicaldocs`, d),
  updateTechnicalDoc:  (id, d)        => api.patch(`/technicaldocs/${id}`, d),
  deleteTechnicalDoc:  (id)           => api.delete(`/technicaldocs/${id}`),

  // Configuración
  getCompanySettings:    ()  => api.get('/company-settings'),
  updateCompanySettings: (d) => api.patch('/company-settings', d),

  // Notificaciones
  getNotifications: () => api.get('/notifications'),

  // Reportes
  getReportOverview:   ()   => api.get('/reports/overview'),
  getReportProject:    (id) => api.get(`/reports/project/${id}`),

  // Épicas
  getEpics:    (projectId) => api.get('/epics', { params: { project: projectId } }),
  createEpic:  (d)         => api.post('/epics', d),
  updateEpic:  (id, d)     => api.patch(`/epics/${id}`, d),
  deleteEpic:  (id)        => api.delete(`/epics/${id}`),

  // Impedimentos
  getImpediments:   (projectId, params) => api.get('/impediments', { params: { project: projectId, ...params } }),
  createImpediment: (d)                 => api.post('/impediments', d),
  updateImpediment: (id, d)             => api.patch(`/impediments/${id}`, d),
  deleteImpediment: (id)                => api.delete(`/impediments/${id}`),

  // Definition of Done
  getDod:    (projectId)          => api.get(`/projects/${projectId}/dod`),
  updateDod: (projectId, criteria) => api.put(`/projects/${projectId}/dod`, { criteria }),

  // Sprint Review
  getSprintReview:    (sprintId) => api.get(`/sprints/${sprintId}/review`),
  updateSprintReview: (sprintId, d) => api.put(`/sprints/${sprintId}/review`, d),

  // Sprint Retrospectiva
  getSprintRetro:    (sprintId) => api.get(`/sprints/${sprintId}/retro`),
  updateSprintRetro: (sprintId, d) => api.put(`/sprints/${sprintId}/retro`, d),
};
