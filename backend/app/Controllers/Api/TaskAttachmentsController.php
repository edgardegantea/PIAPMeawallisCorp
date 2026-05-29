<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * File attachments on tasks.
 *
 * GET    /tasks/:id/attachments
 * POST   /tasks/:id/attachments  (multipart/form-data, field: file)
 * DELETE /attachments/:id
 * GET    /attachments/:id/download
 */
class TaskAttachmentsController extends BaseController
{
    private const UPLOAD_DIR  = WRITEPATH . 'uploads/tasks/';
    private const MAX_SIZE_MB = 10;
    private const ALLOWED     = ['image/jpeg','image/png','image/gif','image/webp',
                                  'application/pdf','text/plain',
                                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                  'application/msword','application/vnd.ms-excel',
                                  'application/zip'];

    public function index(int $taskId): ResponseInterface
    {
        $db = Database::connect();
        $rows = $db->query("
            SELECT ta.*, CONCAT(u.first_name,' ',u.last_name) AS uploader_name
            FROM task_attachments ta
            LEFT JOIN users u ON u.id = ta.uploaded_by
            WHERE ta.task_id = ?
            ORDER BY ta.created_at DESC
        ", [$taskId])->getResultArray();

        return $this->response->setJSON($rows);
    }

    public function upload(int $taskId): ResponseInterface
    {
        $file = $this->request->getFile('file');

        if (!$file || !$file->isValid()) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Archivo requerido']);
        }

        if ($file->getSizeByUnit('mb') > self::MAX_SIZE_MB) {
            return $this->response->setStatusCode(422)->setJSON(['message' => "El archivo no puede superar " . self::MAX_SIZE_MB . " MB"]);
        }

        if (!in_array($file->getMimeType(), self::ALLOWED)) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Tipo de archivo no permitido']);
        }

        $dir = self::UPLOAD_DIR . $taskId . '/';
        if (!is_dir($dir)) { mkdir($dir, 0755, true); }

        $stored = $file->getRandomName();
        $file->move($dir, $stored);

        $db = Database::connect();
        $db->table('task_attachments')->insert([
            'task_id'       => $taskId,
            'uploaded_by'   => Auth::id(),
            'original_name' => $file->getClientName(),
            'stored_name'   => $stored,
            'mime_type'     => $file->getMimeType(),
            'size_bytes'    => $file->getSize(),
            'created_at'    => date('Y-m-d H:i:s'),
        ]);

        $id  = $db->insertID();
        $row = $db->query("
            SELECT ta.*, CONCAT(u.first_name,' ',u.last_name) AS uploader_name
            FROM task_attachments ta
            LEFT JOIN users u ON u.id = ta.uploaded_by
            WHERE ta.id = ?
        ", [$id])->getRowArray();

        return $this->response->setStatusCode(201)->setJSON($row);
    }

    public function download(int $id): void
    {
        $db  = Database::connect();
        $row = $db->table('task_attachments')->where('id', $id)->get()->getRowArray();

        if (!$row) { http_response_code(404); echo 'Not found'; exit; }

        $path = self::UPLOAD_DIR . $row['task_id'] . '/' . $row['stored_name'];
        if (!file_exists($path)) { http_response_code(404); echo 'File missing'; exit; }

        header('Content-Type: ' . ($row['mime_type'] ?: 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . addslashes($row['original_name']) . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }

    public function delete(int $id): ResponseInterface
    {
        $db  = Database::connect();
        $row = $db->table('task_attachments')->where('id', $id)->get()->getRowArray();

        if ($row) {
            $path = self::UPLOAD_DIR . $row['task_id'] . '/' . $row['stored_name'];
            if (file_exists($path)) { @unlink($path); }
            $db->table('task_attachments')->where('id', $id)->delete();
        }

        return $this->response->setStatusCode(204)->setBody('');
    }
}
