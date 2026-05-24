<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\ProjectGate;
use App\Models\DefinitionOfDoneModel;
use CodeIgniter\HTTP\ResponseInterface;

class DefinitionOfDoneController extends BaseController
{
    private DefinitionOfDoneModel $model;

    public function __construct()
    {
        $this->model = new DefinitionOfDoneModel();
    }

    /** GET /api/projects/:id/dod */
    public function show(int $projectId): ResponseInterface
    {
        $dod = $this->model->where('project_id', $projectId)->first();
        if (! $dod) {
            return $this->response->setJSON(['project_id' => $projectId, 'criteria' => []]);
        }

        $dod['criteria'] = json_decode($dod['criteria'], true) ?? [];
        return $this->response->setJSON($dod);
    }

    /** PUT /api/projects/:id/dod */
    public function update(int $projectId): ResponseInterface
    {
        if (! ProjectGate::canWrite($projectId)) {
            return ProjectGate::deny($this->response);
        }

        $data     = $this->request->getJSON(true) ?? $this->request->getPost();
        $criteria = $data['criteria'] ?? [];

        if (! is_array($criteria)) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'criteria debe ser un arreglo']);
        }

        $existing = $this->model->where('project_id', $projectId)->first();
        $payload  = ['project_id' => $projectId, 'criteria' => json_encode(array_values($criteria))];

        if ($existing) {
            $this->model->update($existing['id'], $payload);
        } else {
            $this->model->insert($payload);
        }

        return $this->response->setJSON(['project_id' => $projectId, 'criteria' => $criteria]);
    }
}
