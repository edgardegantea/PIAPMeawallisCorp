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
    private const ALLOWED     = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'text/plain', 'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
        'application/zip', 'application/x-zip-compressed', 'application/octet-stream',
    ];

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

        // No field found at all
        if (!$file) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'Campo "file" no encontrado en la solicitud']);
        }

        // PHP rejected the upload (size limit, no tmp dir, etc.)
        if (!$file->isValid()) {
            $phpErr = $file->getError();
            $errMap = [
                UPLOAD_ERR_INI_SIZE   => 'El archivo supera upload_max_filesize del servidor (ajusta php.ini en Plesk)',
                UPLOAD_ERR_FORM_SIZE  => 'El archivo supera el límite del formulario',
                UPLOAD_ERR_PARTIAL    => 'El archivo se subió de forma parcial, intenta de nuevo',
                UPLOAD_ERR_NO_FILE    => 'No se seleccionó ningún archivo',
                UPLOAD_ERR_NO_TMP_DIR => 'El servidor no tiene directorio temporal configurado',
                UPLOAD_ERR_CANT_WRITE => 'El servidor no pudo escribir el archivo en disco',
                UPLOAD_ERR_EXTENSION  => 'Una extensión de PHP bloqueó la subida',
            ];
            $msg = $errMap[$phpErr] ?? ('Error PHP al subir el archivo (código ' . $phpErr . ')');
            return $this->response->setStatusCode(422)->setJSON(['message' => $msg]);
        }

        if ($file->getSizeByUnit('mb') > self::MAX_SIZE_MB) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El archivo no puede superar ' . self::MAX_SIZE_MB . ' MB']);
        }

        // getMimeType() uses finfo_file() on the tmp path — may fail if open_basedir
        // restricts /tmp. Fall back to client-reported MIME or extension map.
        try {
            $mime = $file->getMimeType();
        } catch (\Throwable $e) {
            $mime = null;
        }
        if (!$mime || $mime === 'application/octet-stream') {
            // Try client MIME first, then derive from extension
            $mime = $file->getClientMimeType() ?: self::mimeFromExtension($file->getClientExtension());
        }

        if (!in_array($mime, self::ALLOWED)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'Tipo de archivo no permitido: ' . $mime]);
        }

        $dir = self::UPLOAD_DIR . $taskId . '/';
        if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'No se pudo crear el directorio de uploads: ' . $dir]);
        }
        if (!is_writable($dir)) {
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'El directorio de uploads no tiene permisos de escritura: ' . $dir]);
        }

        $stored = $file->getRandomName();
        $file->move($dir, $stored);

        $db = Database::connect();
        $db->table('task_attachments')->insert([
            'task_id'       => $taskId,
            'uploaded_by'   => Auth::id(),
            'original_name' => $file->getClientName(),
            'stored_name'   => $stored,
            'mime_type'     => $mime,
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

    /** Fallback MIME detection from file extension when finfo is unavailable */
    private static function mimeFromExtension(string $ext): string
    {
        $map = [
            'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
            'gif' => 'image/gif',  'webp' => 'image/webp', 'svg' => 'image/svg+xml',
            'pdf' => 'application/pdf',
            'txt' => 'text/plain', 'csv' => 'text/csv',
            'doc' => 'application/msword',
            'docx'=> 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx'=> 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt' => 'application/vnd.ms-powerpoint',
            'pptx'=> 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'zip' => 'application/zip',
        ];
        return $map[strtolower($ext)] ?? 'application/octet-stream';
    }
}
