<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\ProjectDocumentModel;
use CodeIgniter\HTTP\ResponseInterface;

class DocumentsController extends BaseController
{
    private ProjectDocumentModel $model;

    public function __construct()
    {
        $this->model = new ProjectDocumentModel();
    }

    public function index(): ResponseInterface
    {
        $projectId = $this->request->getGet('project');

        $rows = $projectId
            ? $this->model->where('project_id', $projectId)->orderBy('created_at', 'DESC')->findAll()
            : $this->model->findAll();

        return $this->response->setJSON($rows);
    }

    public function upload(): ResponseInterface
    {
        $file = $this->request->getFile('file');

        if (! $file || ! $file->isValid()) {
            return $this->response->setStatusCode(400)
                ->setJSON(['message' => 'Archivo no válido o no recibido']);
        }

        $projectId = $this->request->getPost('project_id');
        if (! $projectId) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El campo project_id es requerido']);
        }

        $uploadPath = WRITEPATH . 'uploads/documents/';
        if (! is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }

        $newName = $file->getRandomName();
        $file->move($uploadPath, $newName);

        $id = $this->model->insert([
            'project_id'  => (int) $projectId,
            'name'        => $this->request->getPost('name') ?: $file->getClientName(),
            'description' => $this->request->getPost('description'),
            'file_path'   => 'uploads/documents/' . $newName,
            'file_name'   => $file->getClientName(),
            'file_size'   => $file->getSize(),
            'uploaded_by' => Auth::id(),
        ]);

        return $this->response->setStatusCode(201)
            ->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        $doc = $this->model->find($id);

        if (! $doc) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Documento no encontrado']);
        }

        $filePath = WRITEPATH . $doc['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $this->model->delete($id);

        return $this->response->setStatusCode(204)->setBody('');
    }
}
