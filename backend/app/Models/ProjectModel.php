<?php

namespace App\Models;

use CodeIgniter\Model;

class ProjectModel extends Model
{
    protected $table      = 'projects';
    protected $primaryKey = 'id';
    protected $returnType = 'array';

    protected $allowedFields = [
        'code', 'name', 'description', 'category_id', 'status', 'priority',
        'director_id', 'sponsor_id', 'developer_representative', 'project_manager_name',
        'client_name', 'client_representative', 'client_email', 'client_phone',
        'client_address', 'client_rfc', 'client_tax_regime', 'client_cfdi_usage',
        'client_billing_email', 'client_zip_code',
        'planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date',
        'planned_budget', 'actual_budget', 'objectives', 'scope', 'deliverables',
        'identified_risks', 'constraints', 'assumptions', 'completion_percentage',
        'notes', 'is_active',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Like withRelations() but scoped to projects the given user belongs to
     * (as director or as a project member). Used for TEAM_MEMBER visibility.
     */
    public function withRelationsForMember(
        int     $userId,
        ?string $search   = null,
        ?string $status   = null,
        ?string $category = null,
        ?string $priority = null
    ): array {
        $db = \Config\Database::connect();
        $b  = $db->table('projects p')
            ->select('p.*, c.name as category_name, c.color as category_color,
                      u1.username as director_username, u1.first_name as director_first_name, u1.last_name as director_last_name,
                      u2.username as sponsor_username, u2.first_name as sponsor_first_name, u2.last_name as sponsor_last_name')
            ->join('project_categories c', 'c.id = p.category_id', 'left')
            ->join('users u1', 'u1.id = p.director_id', 'left')
            ->join('users u2', 'u2.id = p.sponsor_id', 'left')
            ->where('p.is_active', 1)
            ->where("(p.director_id = {$userId} OR p.id IN (SELECT project_id FROM project_members WHERE user_id = {$userId}))");

        if ($search) {
            $b->groupStart()
                ->like('p.name', $search)
                ->orLike('p.code', $search)
                ->orLike('p.description', $search)
                ->groupEnd();
        }
        if ($status)   $b->where('p.status', $status);
        if ($category)  $b->where('p.category_id', $category);
        if ($priority)  $b->where('p.priority', $priority);

        return $b->orderBy('p.created_at', 'DESC')->get()->getResultArray();
    }

    public function withRelations(
        ?string $search   = null,
        ?string $status   = null,
        ?string $category = null,
        ?string $priority = null
    ): array {
        $db = \Config\Database::connect();
        $b  = $db->table('projects p')
            ->select('p.*, c.name as category_name, c.color as category_color,
                      u1.username as director_username, u1.first_name as director_first_name, u1.last_name as director_last_name,
                      u2.username as sponsor_username, u2.first_name as sponsor_first_name, u2.last_name as sponsor_last_name')
            ->join('project_categories c', 'c.id = p.category_id', 'left')
            ->join('users u1', 'u1.id = p.director_id', 'left')
            ->join('users u2', 'u2.id = p.sponsor_id', 'left')
            ->where('p.is_active', 1);

        if ($search) {
            $b->groupStart()
                ->like('p.name', $search)
                ->orLike('p.code', $search)
                ->orLike('p.description', $search)
                ->groupEnd();
        }
        if ($status)   $b->where('p.status', $status);
        if ($category)  $b->where('p.category_id', $category);
        if ($priority)  $b->where('p.priority', $priority);

        return $b->orderBy('p.created_at', 'DESC')->get()->getResultArray();
    }

    public function findWithRelations(int $id): ?array
    {
        $db = \Config\Database::connect();
        return $db->table('projects p')
            ->select('p.*, c.name as category_name, c.color as category_color,
                      u1.username as director_username, u1.first_name as director_first_name, u1.last_name as director_last_name,
                      u2.username as sponsor_username, u2.first_name as sponsor_first_name, u2.last_name as sponsor_last_name')
            ->join('project_categories c', 'c.id = p.category_id', 'left')
            ->join('users u1', 'u1.id = p.director_id', 'left')
            ->join('users u2', 'u2.id = p.sponsor_id', 'left')
            ->where('p.id', $id)
            ->get()->getRowArray();
    }

    public function getStatistics(): array
    {
        $db = \Config\Database::connect();
        $total    = $this->countAll();
        $byStatus = $db->query("SELECT status, COUNT(*) as count FROM projects WHERE is_active=1 GROUP BY status")->getResultArray();
        $overdue  = $db->query("SELECT COUNT(*) as count FROM projects WHERE is_active=1 AND status NOT IN ('CIERRE','CANCELADO') AND planned_end_date < CURDATE()")->getRowArray();

        return [
            'total'      => $total,
            'by_status'  => $byStatus,
            'overdue'    => (int)$overdue['count'],
        ];
    }
}
