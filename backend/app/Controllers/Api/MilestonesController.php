<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\ActivityLogger;
use App\Libraries\ProjectGate;
use App\Models\MilestoneModel;
use CodeIgniter\HTTP\ResponseInterface;

class MilestonesController extends BaseController
{
    private MilestoneModel $model;

    public function __construct()
    {
        $this->model = new MilestoneModel();
    }

    /**
     * GET /api/milestones?project={id}
     */
    public function index(): ResponseInterface
    {
        $projectId = $this->request->getGet('project');
        if ($projectId) {
            return $this->response->setJSON($this->model->findByProject((int)$projectId));
        }
        return $this->response->setJSON($this->model->findAll());
    }

    /**
     * GET /api/milestones/{id}
     */
    public function show(int $id): ResponseInterface
    {
        $milestone = $this->model->find($id);
        if (!$milestone) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Hito no encontrado']);
        }
        return $this->response->setJSON($milestone);
    }

    /**
     * POST /api/milestones
     */
    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = [
            'project_id' => 'required|integer',
            'title'      => 'required|max_length[255]',
            'due_date'   => 'required|valid_date',
        ];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }
        if (!ProjectGate::canWrite((int) $data['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        // Auto-assign order if not provided
        if (empty($data['order'])) {
            $last = $this->model->where('project_id', $data['project_id'])
                ->orderBy('order', 'DESC')->first();
            $data['order'] = $last ? (int)$last['order'] + 1 : 1;
        }

        $id = $this->model->insert($data);
        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    /**
     * PUT/PATCH /api/milestones/{id}
     */
    public function update(int $id): ResponseInterface
    {
        $milestone = $this->model->find($id);
        if (!$milestone) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Hito no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $milestone['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, $data);
        return $this->response->setJSON($this->model->find($id));
    }

    /**
     * DELETE /api/milestones/{id}
     */
    public function delete(int $id): ResponseInterface
    {
        $milestone = $this->model->find($id);
        if (!$milestone) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Hito no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $milestone['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }

    /**
     * POST /api/milestones/{id}/complete  — toggle is_completed
     */
    public function complete(int $id): ResponseInterface
    {
        $milestone = $this->model->find($id);
        if (!$milestone) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Hito no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $milestone['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $nowCompleted = !(bool)$milestone['is_completed'];
        $this->model->update($id, [
            'is_completed' => (int)$nowCompleted,
            'completed_at' => $nowCompleted ? date('Y-m-d H:i:s') : null,
        ]);

        $updated = $this->model->find($id);

        ActivityLogger::log(
            (int)$milestone['project_id'],
            $nowCompleted ? 'milestone.completed' : 'milestone.reopened',
            'milestone',
            $id,
            ($nowCompleted ? 'Hito completado: ' : 'Hito reabierto: ') . ($milestone['title'] ?? '')
        );

        return $this->response->setJSON($updated);
    }
}
