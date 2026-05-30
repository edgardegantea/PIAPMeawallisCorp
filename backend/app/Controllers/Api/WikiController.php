<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Project wiki pages.
 *
 * GET    /api/projects/:id/wiki
 * POST   /api/projects/:id/wiki        { title, content, parent_id? }
 * GET    /api/wiki/:id
 * PATCH  /api/wiki/:id                 { title?, content? }
 * DELETE /api/wiki/:id
 */
class WikiController extends BaseController
{
    private function slug(string $title, int $projectId): string
    {
        $db   = Database::connect();
        $base = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $title));
        $slug = $base;
        $n    = 2;
        while ($db->table('wiki_pages')->where('project_id', $projectId)->where('slug', $slug)->countAllResults()) {
            $slug = $base . '-' . ($n++);
        }
        return $slug;
    }

    public function index(int $projectId): ResponseInterface
    {
        $db   = Database::connect();
        $rows = $db->query("
            SELECT w.id, w.parent_id, w.title, w.slug, w.sort_order,
                   w.updated_at,
                   CONCAT(u.first_name,' ',u.last_name) AS updated_by_name
            FROM wiki_pages w
            LEFT JOIN users u ON u.id = w.updated_by
            WHERE w.project_id = ?
            ORDER BY w.parent_id IS NOT NULL, w.sort_order, w.title
        ", [$projectId])->getResultArray();

        return $this->response->setJSON($rows);
    }

    public function show(int $id): ResponseInterface
    {
        $db  = Database::connect();
        $row = $db->query("
            SELECT w.*, CONCAT(u.first_name,' ',u.last_name) AS updated_by_name
            FROM wiki_pages w LEFT JOIN users u ON u.id = w.updated_by WHERE w.id = ?
        ", [$id])->getRowArray();

        if (!$row) return $this->response->setStatusCode(404)->setJSON(['message' => 'Página no encontrada']);
        return $this->response->setJSON($row);
    }

    public function create(int $projectId): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);

        $title = trim($data['title'] ?? '');
        if (!$title) return $this->response->setStatusCode(422)->setJSON(['message' => 'Título requerido']);

        $db->table('wiki_pages')->insert([
            'project_id' => $projectId,
            'parent_id'  => $data['parent_id'] ?? null,
            'title'      => $title,
            'slug'       => $this->slug($title, $projectId),
            'content'    => $data['content'] ?? '',
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
            'sort_order' => (int)($data['sort_order'] ?? 0),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $id = $db->insertID();
        return $this->response->setStatusCode(201)->setJSON($this->show($id)->getBody());
    }

    public function update(int $id): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);
        $allowed = ['title', 'content', 'parent_id', 'sort_order'];
        $payload = array_intersect_key($data, array_flip($allowed));
        $payload['updated_by'] = Auth::id();
        $payload['updated_at'] = date('Y-m-d H:i:s');
        $db->table('wiki_pages')->where('id', $id)->update($payload);
        return $this->show($id);
    }

    public function delete(int $id): ResponseInterface
    {
        Database::connect()->table('wiki_pages')->where('id', $id)->delete();
        return $this->response->setStatusCode(204)->setBody('');
    }
}
