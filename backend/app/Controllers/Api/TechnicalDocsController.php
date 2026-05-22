<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\TechnicalDocModel;
use App\Libraries\ActivityLogger;
use App\Libraries\Auth;

class TechnicalDocsController extends BaseController
{
    private TechnicalDocModel $model;

    public function __construct()
    {
        $this->model = new TechnicalDocModel();
    }

    // GET /api/projects/:projectId/technicaldocs
    public function index(int $projectId): \CodeIgniter\HTTP\ResponseInterface
    {
        $docs = $this->model->findByProject($projectId);
        return $this->response->setJSON(['data' => $docs]);
    }

    // POST /api/projects/:projectId/technicaldocs
    public function create(int $projectId): \CodeIgniter\HTTP\ResponseInterface
    {
        $data = $this->request->getJSON(true) ?: $this->request->getPost();

        $data['project_id'] = $projectId;
        $data['created_by'] = Auth::id();

        // Si no se especifica autor, usar el usuario actual
        if (empty($data['author_id'])) {
            $data['author_id'] = Auth::id();
        }

        if (empty($data['title'])) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El título del documento es obligatorio']);
        }

        $id = $this->model->insert($data);
        if (!$id) {
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'Error al crear documento']);
        }

        ActivityLogger::log(
            $projectId,
            'technicaldoc_created',
            'technical_doc',
            $id,
            'Documento técnico creado: ' . ($data['title'] ?? '')
        );

        $doc = $this->model->find($id);
        return $this->response->setStatusCode(201)->setJSON(['data' => $doc]);
    }

    // PATCH /api/technicaldocs/:id
    public function update(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $doc = $this->model->find($id);
        if (!$doc) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Documento no encontrado']);
        }

        $data = $this->request->getJSON(true) ?: $this->request->getRawInput();

        $allowed = [
            'title', 'doc_type', 'version', 'status',
            'description', 'file_url', 'author_id', 'tags',
        ];
        $update = array_intersect_key($data, array_flip($allowed));

        if (empty($update)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'Sin campos para actualizar']);
        }

        $this->model->update($id, $update);

        ActivityLogger::log(
            $doc['project_id'],
            'technicaldoc_updated',
            'technical_doc',
            $id,
            'Documento técnico actualizado: ' . $doc['title']
        );

        return $this->response->setJSON(['data' => $this->model->find($id)]);
    }

    // DELETE /api/technicaldocs/:id
    public function delete(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $doc = $this->model->find($id);
        if (!$doc) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Documento no encontrado']);
        }

        $this->model->delete($id);

        ActivityLogger::log(
            $doc['project_id'],
            'technicaldoc_deleted',
            'technical_doc',
            $id,
            'Documento técnico eliminado: ' . $doc['title']
        );

        return $this->response->setStatusCode(204)->setBody('');
    }
}
