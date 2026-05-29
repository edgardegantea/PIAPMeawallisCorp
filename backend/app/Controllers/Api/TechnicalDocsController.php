<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\TechnicalDocModel;
use App\Libraries\ActivityLogger;
use App\Libraries\Auth;

/**
 * Technical documentation for projects — supports both file uploads and external URLs.
 *
 * GET    /api/projects/:id/technicaldocs
 * POST   /api/projects/:id/technicaldocs   multipart/form-data (field: file) OR JSON
 * PATCH  /api/technicaldocs/:id
 * DELETE /api/technicaldocs/:id
 * GET    /api/technicaldocs/:id/download   (public — no auth required)
 */
class TechnicalDocsController extends BaseController
{
    private TechnicalDocModel $model;
    private const UPLOAD_DIR  = WRITEPATH . 'uploads/technicaldocs/';
    private const MAX_SIZE_MB = 30;
    private const ALLOWED_MIME = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv', 'text/markdown',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/zip', 'application/x-zip-compressed',
        'application/json',
    ];

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

    // POST /api/projects/:projectId/technicaldocs  (multipart OR JSON)
    public function create(int $projectId): \CodeIgniter\HTTP\ResponseInterface
    {
        $isMultipart = str_contains(
            $this->request->getHeaderLine('Content-Type'), 'multipart'
        );

        if ($isMultipart) {
            $data = $this->request->getPost();
        } else {
            $data = $this->request->getJSON(true) ?: [];
        }

        if (empty($data['title'])) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El título del documento es obligatorio']);
        }

        // ── Handle file upload ───────────────────────────────────────────────
        $file = $this->request->getFile('file');
        if ($file && $file->isValid()) {

            if ($file->getSizeByUnit('mb') > self::MAX_SIZE_MB) {
                return $this->response->setStatusCode(422)
                    ->setJSON(['message' => 'El archivo no puede superar ' . self::MAX_SIZE_MB . ' MB']);
            }

            $mime = $this->detectMime($file);
            if (!in_array($mime, self::ALLOWED_MIME)) {
                return $this->response->setStatusCode(422)
                    ->setJSON(['message' => 'Tipo de archivo no permitido: ' . $mime]);
            }

            $dir = self::UPLOAD_DIR . $projectId . '/';
            if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
                return $this->response->setStatusCode(500)
                    ->setJSON(['message' => 'No se pudo crear directorio de uploads']);
            }

            $stored = $file->getRandomName();
            $file->move($dir, $stored);

            $data['original_name'] = $file->getClientName();
            $data['stored_name']   = $stored;
            $data['mime_type']     = $mime;
            $data['size_bytes']    = $file->getSize();
            $data['file_url']      = null; // uploaded, not a URL
        }

        $data['project_id'] = $projectId;
        $data['created_by'] = Auth::id();
        if (empty($data['author_id'])) {
            $data['author_id'] = Auth::id();
        }

        $id = $this->model->insert($data);
        if (!$id) {
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'Error al crear documento']);
        }

        ActivityLogger::log(
            $projectId, 'technicaldoc_created', 'technical_doc', $id,
            'Documento técnico creado: ' . ($data['title'] ?? '')
        );

        return $this->response->setStatusCode(201)->setJSON(['data' => $this->model->find($id)]);
    }

    // PATCH /api/technicaldocs/:id
    public function update(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $doc = $this->model->find($id);
        if (!$doc) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Documento no encontrado']);
        }

        $isMultipart = str_contains(
            $this->request->getHeaderLine('Content-Type'), 'multipart'
        );
        $data = $isMultipart ? $this->request->getPost() : ($this->request->getJSON(true) ?? []);

        // Handle new file upload on update
        $file = $this->request->getFile('file');
        if ($file && $file->isValid()) {
            if ($file->getSizeByUnit('mb') > self::MAX_SIZE_MB) {
                return $this->response->setStatusCode(422)
                    ->setJSON(['message' => 'El archivo no puede superar ' . self::MAX_SIZE_MB . ' MB']);
            }
            $mime = $this->detectMime($file);

            $dir = self::UPLOAD_DIR . $doc['project_id'] . '/';
            if (!is_dir($dir)) mkdir($dir, 0775, true);

            // Delete old stored file if exists
            if (!empty($doc['stored_name'])) {
                $oldPath = $dir . $doc['stored_name'];
                if (file_exists($oldPath)) @unlink($oldPath);
            }

            $stored = $file->getRandomName();
            $file->move($dir, $stored);

            $data['original_name'] = $file->getClientName();
            $data['stored_name']   = $stored;
            $data['mime_type']     = $mime;
            $data['size_bytes']    = $file->getSize();
            $data['file_url']      = null;
        }

        $allowed = [
            'title', 'doc_type', 'version', 'status', 'description',
            'file_url', 'author_id', 'tags',
            'original_name', 'stored_name', 'mime_type', 'size_bytes',
        ];
        $update = array_intersect_key($data, array_flip($allowed));
        if (empty($update)) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Sin campos para actualizar']);
        }

        $this->model->update($id, $update);

        ActivityLogger::log(
            $doc['project_id'], 'technicaldoc_updated', 'technical_doc', $id,
            'Documento técnico actualizado: ' . $doc['title']
        );

        return $this->response->setJSON(['data' => $this->model->find($id)]);
    }

    // GET /api/technicaldocs/:id/download  (public route)
    public function download(int $id): void
    {
        $doc = $this->model->find($id);
        if (!$doc) {
            http_response_code(404);
            echo json_encode(['message' => 'Documento no encontrado']);
            exit;
        }

        // External URL redirect
        if (!empty($doc['file_url']) && empty($doc['stored_name'])) {
            header('Location: ' . $doc['file_url']);
            exit;
        }

        if (empty($doc['stored_name'])) {
            http_response_code(404);
            echo json_encode(['message' => 'Este documento no tiene archivo adjunto']);
            exit;
        }

        $path = self::UPLOAD_DIR . $doc['project_id'] . '/' . $doc['stored_name'];
        if (!file_exists($path)) {
            http_response_code(404);
            echo json_encode(['message' => 'Archivo no encontrado en el servidor']);
            exit;
        }

        $mime = $doc['mime_type'] ?: 'application/octet-stream';
        $name = $doc['original_name'] ?: $doc['stored_name'];

        header('Content-Type: ' . $mime);
        header('Content-Disposition: attachment; filename="' . addslashes($name) . '"');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: no-cache');
        readfile($path);
        exit;
    }

    // DELETE /api/technicaldocs/:id
    public function delete(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $doc = $this->model->find($id);
        if (!$doc) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Documento no encontrado']);
        }

        // Remove stored file from disk
        if (!empty($doc['stored_name'])) {
            $path = self::UPLOAD_DIR . $doc['project_id'] . '/' . $doc['stored_name'];
            if (file_exists($path)) @unlink($path);
        }

        $this->model->delete($id);

        ActivityLogger::log(
            $doc['project_id'], 'technicaldoc_deleted', 'technical_doc', $id,
            'Documento técnico eliminado: ' . $doc['title']
        );

        return $this->response->setStatusCode(204)->setBody('');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function detectMime(\CodeIgniter\HTTP\Files\UploadedFile $file): string
    {
        try {
            $mime = $file->getMimeType();
        } catch (\Throwable $e) {
            $mime = null;
        }
        if (!$mime || $mime === 'application/octet-stream') {
            $mime = $file->getClientMimeType() ?: $this->mimeFromExtension($file->getClientExtension());
        }
        return $mime;
    }

    private function mimeFromExtension(string $ext): string
    {
        $map = [
            'pdf'  => 'application/pdf',
            'doc'  => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls'  => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt'  => 'application/vnd.ms-powerpoint',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt'  => 'text/plain', 'csv' => 'text/csv', 'md' => 'text/markdown',
            'jpg'  => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
            'gif'  => 'image/gif',  'webp' => 'image/webp', 'svg' => 'image/svg+xml',
            'zip'  => 'application/zip', 'json' => 'application/json',
        ];
        return $map[strtolower($ext)] ?? 'application/octet-stream';
    }
}
