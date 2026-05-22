<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Libraries\ProjectGate;
use App\Models\ProjectModel;
use CodeIgniter\HTTP\ResponseInterface;

class ProjectsController extends BaseController
{
    private ProjectModel $model;

    public function __construct()
    {
        $this->model = new ProjectModel();
    }

    public function index(): ResponseInterface
    {
        $user     = Auth::user();
        $userId   = Auth::id();
        $search   = $this->request->getGet('search');
        $status   = $this->request->getGet('status');
        $category = $this->request->getGet('category');
        $priority = $this->request->getGet('priority');

        // TEAM_MEMBER only sees projects they are part of
        if ($user['role'] === 'TEAM_MEMBER') {
            return $this->response->setJSON(
                $this->model->withRelationsForMember($userId, $search, $status, $category, $priority)
            );
        }

        return $this->response->setJSON(
            $this->model->withRelations($search, $status, $category, $priority)
        );
    }

    public function show(int $id): ResponseInterface
    {
        $project = $this->model->findWithRelations($id);

        if (! $project) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Proyecto no encontrado']);
        }

        // Attach the calling user's membership role in this project
        $userId = Auth::id();
        $db     = \Config\Database::connect();
        $member = $db->table('project_members')
            ->select('role')
            ->where('project_id', $id)
            ->where('user_id', $userId)
            ->get()->getRowArray();

        $project['my_project_role'] = $member['role'] ?? null;

        return $this->response->setJSON($project);
    }

    public function create(): ResponseInterface
    {
        // Only ADMIN, DIRECTOR, and PM system roles may create new projects
        $user = Auth::user();
        if ($user['role'] === 'TEAM_MEMBER') {
            return $this->response->setStatusCode(403)
                ->setJSON(['message' => 'Sin permisos para crear proyectos']);
        }

        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = [
            'code'               => 'required|max_length[20]|is_unique[projects.code]',
            'name'               => 'required|max_length[255]',
            'description'        => 'required',
            'category_id'        => 'required|integer',
            'director_id'        => 'required|integer',
            'planned_start_date' => 'required|valid_date',
            'planned_end_date'   => 'required|valid_date',
            'planned_budget'     => 'required|numeric',
            'objectives'         => 'required',
            'scope'              => 'required',
        ];

        if (! $this->validate($rules)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $data = $this->nullifyEmptyIntegers($data);
        $id   = $this->model->insert($data);

        if (! $id) {
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'Error al crear el proyecto']);
        }

        return $this->response->setStatusCode(201)
            ->setJSON($this->model->findWithRelations($id));
    }

    public function update(int $id): ResponseInterface
    {
        if (! $this->model->find($id)) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Proyecto no encontrado']);
        }

        if (! ProjectGate::canWrite($id)) {
            return ProjectGate::deny($this->response);
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, $this->nullifyEmptyIntegers($data));

        return $this->response->setJSON($this->model->findWithRelations($id));
    }

    public function delete(int $id): ResponseInterface
    {
        if (! $this->model->find($id)) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Proyecto no encontrado']);
        }

        if (! ProjectGate::canWrite($id)) {
            return ProjectGate::deny($this->response);
        }

        $this->model->update($id, ['is_active' => 0]);
        return $this->response->setStatusCode(204)->setBody('');
    }

    public function statistics(): ResponseInterface
    {
        return $this->response->setJSON($this->model->getStatistics());
    }

    public function updateProgress(int $id): ResponseInterface
    {
        if (! ProjectGate::canWrite($id)) {
            return ProjectGate::deny($this->response);
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $pct  = (int) ($data['completion_percentage'] ?? 0);

        if ($pct < 0 || $pct > 100) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El porcentaje debe estar entre 0 y 100']);
        }

        $this->model->update($id, ['completion_percentage' => $pct]);
        return $this->response->setJSON(['completion_percentage' => $pct]);
    }

    private function nullifyEmptyIntegers(array $data): array
    {
        foreach (['sponsor_id', 'category_id', 'director_id'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $data[$field] = null;
            }
        }
        return $data;
    }

    public function myProjects(): ResponseInterface
    {
        $userId = Auth::id();
        $db     = \Config\Database::connect();

        $projects = $db->query(
            'SELECT p.*, c.name AS category_name, c.color AS category_color
             FROM   projects p
             LEFT JOIN project_categories c ON c.id = p.category_id
             WHERE  p.is_active = 1
               AND  (p.director_id = ?
                     OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?))
             ORDER  BY p.created_at DESC',
            [$userId, $userId]
        )->getResultArray();

        return $this->response->setJSON($projects);
    }
}
