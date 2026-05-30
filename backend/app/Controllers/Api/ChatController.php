<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Project chat.
 *
 * GET    /api/projects/:id/chat?after=:msgId
 * POST   /api/projects/:id/chat   { body }
 * DELETE /api/chat/:id
 */
class ChatController extends BaseController
{
    public function index(int $projectId): ResponseInterface
    {
        $db    = Database::connect();
        $after = (int)$this->request->getGet('after');
        $limit = (int)($this->request->getGet('limit') ?? 50);

        $query = $db->query("
            SELECT m.*,
                   CONCAT(u.first_name,' ',u.last_name) AS user_name,
                   u.username
            FROM project_chat_messages m
            LEFT JOIN users u ON u.id = m.user_id
            WHERE m.project_id = ?
              " . ($after ? "AND m.id > {$after}" : "") . "
            ORDER BY m.created_at DESC
            LIMIT {$limit}
        ", [$projectId])->getResultArray();

        return $this->response->setJSON(array_reverse($query));
    }

    public function create(int $projectId): ResponseInterface
    {
        $data = $this->request->getJSON(true);
        $body = trim($data['body'] ?? '');
        if (!$body) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Mensaje vacío']);
        }

        $db = Database::connect();
        $db->table('project_chat_messages')->insert([
            'project_id' => $projectId,
            'user_id'    => Auth::id(),
            'body'       => $body,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        $id  = $db->insertID();
        $row = $db->query("
            SELECT m.*, CONCAT(u.first_name,' ',u.last_name) AS user_name, u.username
            FROM project_chat_messages m LEFT JOIN users u ON u.id = m.user_id WHERE m.id = ?
        ", [$id])->getRowArray();

        return $this->response->setStatusCode(201)->setJSON($row);
    }

    public function delete(int $id): ResponseInterface
    {
        $db  = Database::connect();
        $row = $db->table('project_chat_messages')->where('id', $id)->get()->getRowArray();
        if ($row && (int)$row['user_id'] === Auth::id()) {
            $db->table('project_chat_messages')->where('id', $id)->delete();
        }
        return $this->response->setStatusCode(204)->setBody('');
    }
}
