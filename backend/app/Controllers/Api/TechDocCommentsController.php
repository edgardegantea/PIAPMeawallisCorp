<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Comments on a technical document.
 *
 * GET    /api/technicaldocs/:id/comments
 * POST   /api/technicaldocs/:id/comments   { body }
 * DELETE /api/tech-doc-comments/:id
 */
class TechDocCommentsController extends BaseController
{
    public function index(int $docId): ResponseInterface
    {
        $db   = Database::connect();
        $rows = $db->query("
            SELECT c.*,
                   CONCAT(u.first_name,' ',u.last_name) AS user_name,
                   u.username
            FROM tech_doc_comments c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE c.doc_id = ?
            ORDER BY c.created_at ASC
        ", [$docId])->getResultArray();

        return $this->response->setJSON($rows);
    }

    public function create(int $docId): ResponseInterface
    {
        $data = $this->request->getJSON(true);
        $body = trim($data['body'] ?? '');

        if (!$body) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'El comentario no puede estar vacío']);
        }

        $db = Database::connect();
        $db->table('tech_doc_comments')->insert([
            'doc_id'     => $docId,
            'user_id'    => Auth::id(),
            'body'       => $body,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $id  = $db->insertID();
        $row = $db->query("
            SELECT c.*, CONCAT(u.first_name,' ',u.last_name) AS user_name, u.username
            FROM tech_doc_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = ?
        ", [$id])->getRowArray();

        return $this->response->setStatusCode(201)->setJSON($row);
    }

    public function delete(int $id): ResponseInterface
    {
        $db  = Database::connect();
        $row = $db->table('tech_doc_comments')->where('id', $id)->get()->getRowArray();

        if (!$row) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Comentario no encontrado']);
        }
        if ((int)$row['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'No puedes eliminar este comentario']);
        }

        $db->table('tech_doc_comments')->where('id', $id)->delete();
        return $this->response->setStatusCode(204)->setBody('');
    }
}
