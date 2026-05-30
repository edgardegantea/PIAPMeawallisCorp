<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * OKRs — Objectives and Key Results.
 *
 * GET    /api/projects/:id/okrs
 * POST   /api/projects/:id/okrs          { title, description, period, owner_id }
 * PATCH  /api/okrs/:id                   { title?, status? }
 * DELETE /api/okrs/:id
 * POST   /api/okrs/:id/key-results       { title, target_value, unit }
 * PATCH  /api/key-results/:id            { current_value?, title? }
 * DELETE /api/key-results/:id
 */
class OKRsController extends BaseController
{
    public function index(int $projectId): ResponseInterface
    {
        $db  = Database::connect();
        $objs = $db->query("
            SELECT o.*, CONCAT(u.first_name,' ',u.last_name) AS owner_name
            FROM okr_objectives o
            LEFT JOIN users u ON u.id = o.owner_id
            WHERE o.project_id = ?
            ORDER BY o.period DESC, o.title
        ", [$projectId])->getResultArray();

        foreach ($objs as &$obj) {
            $obj['key_results'] = $db->table('okr_key_results')
                ->where('objective_id', $obj['id'])->get()->getResultArray();

            // Overall progress = avg of KR completion
            $krs = $obj['key_results'];
            if ($krs) {
                $pct = array_sum(array_map(fn($kr) =>
                    $kr['target_value'] > 0
                        ? min(100, ($kr['current_value'] / $kr['target_value']) * 100)
                        : 0
                , $krs)) / count($krs);
                $obj['progress_pct'] = round($pct);
            } else {
                $obj['progress_pct'] = 0;
            }
        }

        return $this->response->setJSON($objs);
    }

    public function create(int $projectId): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);
        if (empty($data['title'])) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Título requerido']);
        }
        $db->table('okr_objectives')->insert([
            'project_id'  => $projectId,
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'owner_id'    => $data['owner_id'] ?? Auth::id(),
            'period'      => $data['period'] ?? null,
            'status'      => 'ON_TRACK',
            'created_at'  => date('Y-m-d H:i:s'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ]);
        $id = $db->insertID();
        return $this->response->setStatusCode(201)->setJSON(
            $db->table('okr_objectives')->where('id', $id)->get()->getRowArray()
        );
    }

    public function update(int $id): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);
        $allowed = ['title','description','status','period','owner_id'];
        $payload = array_intersect_key($data, array_flip($allowed));
        $payload['updated_at'] = date('Y-m-d H:i:s');
        $db->table('okr_objectives')->where('id', $id)->update($payload);
        return $this->response->setJSON($db->table('okr_objectives')->where('id', $id)->get()->getRowArray());
    }

    public function delete(int $id): ResponseInterface
    {
        Database::connect()->table('okr_objectives')->where('id', $id)->delete();
        return $this->response->setStatusCode(204)->setBody('');
    }

    public function createKR(int $objectiveId): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);
        $db->table('okr_key_results')->insert([
            'objective_id'  => $objectiveId,
            'title'         => $data['title'] ?? 'Key Result',
            'target_value'  => (float)($data['target_value'] ?? 100),
            'current_value' => 0,
            'unit'          => $data['unit'] ?? '%',
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);
        return $this->response->setStatusCode(201)->setJSON(
            Database::connect()->table('okr_key_results')->where('id', $db->insertID())->get()->getRowArray()
        );
    }

    public function updateKR(int $id): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);
        $allowed = ['title','target_value','current_value','unit'];
        $payload = array_intersect_key($data, array_flip($allowed));
        $payload['updated_at'] = date('Y-m-d H:i:s');
        $db->table('okr_key_results')->where('id', $id)->update($payload);
        return $this->response->setJSON($db->table('okr_key_results')->where('id', $id)->get()->getRowArray());
    }

    public function deleteKR(int $id): ResponseInterface
    {
        Database::connect()->table('okr_key_results')->where('id', $id)->delete();
        return $this->response->setStatusCode(204)->setBody('');
    }
}
