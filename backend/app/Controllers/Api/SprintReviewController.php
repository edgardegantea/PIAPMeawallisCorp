<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Libraries\ProjectGate;
use App\Models\SprintReviewModel;
use CodeIgniter\HTTP\ResponseInterface;

class SprintReviewController extends BaseController
{
    private SprintReviewModel $model;

    public function __construct()
    {
        $this->model = new SprintReviewModel();
    }

    /** GET /api/sprints/:id/review */
    public function show(int $sprintId): ResponseInterface
    {
        $review = $this->model->where('sprint_id', $sprintId)->first();
        return $this->response->setJSON($review ?? (object)[]);
    }

    /** PUT /api/sprints/:id/review */
    public function update(int $sprintId): ResponseInterface
    {
        $data      = $this->request->getJSON(true) ?? $this->request->getPost();
        $projectId = (int) ($data['project_id'] ?? 0);

        if (! $projectId) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'project_id requerido']);
        }
        if (! ProjectGate::canWrite($projectId)) {
            return ProjectGate::deny($this->response);
        }

        $allowed  = ['goal_achieved','summary','demonstrated_items','stakeholder_feedback','attendees','next_steps'];
        $payload  = array_intersect_key($data, array_flip($allowed));
        $payload += ['sprint_id' => $sprintId, 'project_id' => $projectId];

        $existing = $this->model->where('sprint_id', $sprintId)->first();
        if ($existing) {
            $this->model->update($existing['id'], $payload);
            $id = $existing['id'];
        } else {
            $payload['created_by'] = Auth::id();
            $id = $this->model->insert($payload);
        }

        return $this->response->setJSON($this->model->find($id));
    }
}
