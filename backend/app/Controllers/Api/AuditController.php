<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Audit log — read-only for admin.
 *
 * GET /audit?entity_type=task&entity_id=5&user_id=3&from=DATE&to=DATE&page=1
 */
class AuditController extends BaseController
{
    public function index(): ResponseInterface
    {
        $db         = Database::connect();
        $entityType = $this->request->getGet('entity_type');
        $entityId   = $this->request->getGet('entity_id');
        $userId     = $this->request->getGet('user_id');
        $from       = $this->request->getGet('from');
        $to         = $this->request->getGet('to');
        $page       = max(1, (int)($this->request->getGet('page') ?? 1));
        $perPage    = 50;

        $where  = [];
        $params = [];

        if ($entityType) { $where[] = 'al.entity_type = ?'; $params[] = $entityType; }
        if ($entityId)   { $where[] = 'al.entity_id = ?';   $params[] = (int)$entityId; }
        if ($userId)     { $where[] = 'al.user_id = ?';     $params[] = (int)$userId; }
        if ($from)       { $where[] = 'DATE(al.created_at) >= ?'; $params[] = $from; }
        if ($to)         { $where[] = 'DATE(al.created_at) <= ?'; $params[] = $to; }

        $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $total = $db->query("SELECT COUNT(*) AS n FROM audit_logs al {$whereClause}", $params)->getRowArray()['n'];

        $offset  = ($page - 1) * $perPage;
        $params2 = array_merge($params, [$perPage, $offset]);

        $rows = $db->query("
            SELECT al.*,
                   CONCAT(u.first_name,' ',u.last_name) AS user_name,
                   u.username, u.role
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            {$whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        ", $params2)->getResultArray();

        // Decode JSON columns
        foreach ($rows as &$row) {
            $row['old_value'] = $row['old_value'] ? json_decode($row['old_value'], true) : null;
            $row['new_value'] = $row['new_value'] ? json_decode($row['new_value'], true) : null;
        }

        return $this->response->setJSON([
            'data'     => $rows,
            'total'    => (int)$total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int)ceil($total / $perPage),
        ]);
    }
}
