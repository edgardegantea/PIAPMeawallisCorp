<?php

namespace App\Models;

use CodeIgniter\Model;

class ContractModel extends Model
{
    protected $table            = 'project_contracts';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $useTimestamps    = true;
    protected $createdField     = 'created_at';
    protected $updatedField     = 'updated_at';

    protected $allowedFields = [
        'project_id', 'contract_number', 'title', 'party_name',
        'contract_type', 'status', 'amount', 'currency',
        'start_date', 'end_date', 'signed_date',
        'description', 'file_url', 'notes', 'created_by',
    ];

    /**
     * Devuelve todos los contratos de un proyecto, incluyendo el nombre
     * del creador.
     */
    public function findByProject(int $projectId): array
    {
        return $this->select(
                'project_contracts.*,
                 u.first_name AS creator_first_name,
                 u.last_name  AS creator_last_name,
                 u.username   AS creator_username'
            )
            ->join('users u', 'u.id = project_contracts.created_by', 'left')
            ->where('project_contracts.project_id', $projectId)
            ->orderBy('project_contracts.created_at', 'DESC')
            ->findAll();
    }
}
