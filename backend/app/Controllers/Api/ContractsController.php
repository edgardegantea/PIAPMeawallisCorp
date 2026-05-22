<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\ContractModel;
use App\Libraries\ActivityLogger;
use App\Libraries\Auth;

class ContractsController extends BaseController
{
    private ContractModel $model;

    public function __construct()
    {
        $this->model = new ContractModel();
    }

    // GET /api/projects/:projectId/contracts
    public function index(int $projectId): \CodeIgniter\HTTP\ResponseInterface
    {
        $contracts = $this->model->findByProject($projectId);
        return $this->response->setJSON(['data' => $contracts]);
    }

    // POST /api/projects/:projectId/contracts
    public function create(int $projectId): \CodeIgniter\HTTP\ResponseInterface
    {
        $data = $this->request->getJSON(true) ?: $this->request->getPost();

        $data['project_id'] = $projectId;
        $data['created_by'] = Auth::id();

        // Validaciones mínimas
        if (empty($data['title'])) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El título del contrato es obligatorio']);
        }

        $id = $this->model->insert($data);
        if (!$id) {
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'Error al crear contrato']);
        }

        ActivityLogger::log(
            $projectId,
            'contract_created',
            'contract',
            $id,
            'Contrato creado: ' . ($data['title'] ?? '')
        );

        $contract = $this->model->find($id);
        return $this->response->setStatusCode(201)->setJSON(['data' => $contract]);
    }

    // PATCH /api/contracts/:id
    public function update(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $contract = $this->model->find($id);
        if (!$contract) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Contrato no encontrado']);
        }

        $data = $this->request->getJSON(true) ?: $this->request->getRawInput();

        $allowed = [
            'contract_number', 'title', 'party_name', 'contract_type', 'status',
            'amount', 'currency', 'start_date', 'end_date', 'signed_date',
            'description', 'file_url', 'notes',
        ];
        $update = array_intersect_key($data, array_flip($allowed));

        if (empty($update)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'Sin campos para actualizar']);
        }

        $this->model->update($id, $update);

        ActivityLogger::log(
            $contract['project_id'],
            'contract_updated',
            'contract',
            $id,
            'Contrato actualizado: ' . $contract['title']
        );

        return $this->response->setJSON(['data' => $this->model->find($id)]);
    }

    // DELETE /api/contracts/:id
    public function delete(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $contract = $this->model->find($id);
        if (!$contract) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Contrato no encontrado']);
        }

        $this->model->delete($id);

        ActivityLogger::log(
            $contract['project_id'],
            'contract_deleted',
            'contract',
            $id,
            'Contrato eliminado: ' . $contract['title']
        );

        return $this->response->setStatusCode(204)->setBody('');
    }
}
