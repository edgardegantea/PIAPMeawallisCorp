<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Version history for a technical document.
 *
 * GET /api/technicaldocs/:id/versions
 * GET /api/tech-doc-versions/:id/download   (public)
 */
class TechDocVersionsController extends BaseController
{
    private const UPLOAD_DIR = WRITEPATH . 'uploads/technicaldocs/';

    public function index(int $docId): ResponseInterface
    {
        $db   = Database::connect();
        $rows = $db->query("
            SELECT v.*, CONCAT(u.first_name,' ',u.last_name) AS created_by_name
            FROM tech_doc_versions v
            LEFT JOIN users u ON u.id = v.created_by
            WHERE v.doc_id = ?
            ORDER BY v.id DESC
        ", [$docId])->getResultArray();

        return $this->response->setJSON($rows);
    }

    public function download(int $versionId): void
    {
        $db  = Database::connect();
        $ver = $db->table('tech_doc_versions')->where('id', $versionId)->get()->getRowArray();

        if (!$ver) { http_response_code(404); echo 'Not found'; exit; }

        // Get doc to find project_id for path
        $doc  = $db->table('project_technical_docs')->where('id', $ver['doc_id'])->get()->getRowArray();
        $path = self::UPLOAD_DIR . ($doc['project_id'] ?? 0) . '/' . $ver['stored_name'];

        if (!file_exists($path)) { http_response_code(404); echo 'File missing'; exit; }

        header('Content-Type: ' . ($ver['mime_type'] ?: 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . addslashes($ver['original_name'] ?: $ver['stored_name']) . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }
}
