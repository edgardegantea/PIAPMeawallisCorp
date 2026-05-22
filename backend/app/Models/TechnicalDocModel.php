<?php

namespace App\Models;

use CodeIgniter\Model;

class TechnicalDocModel extends Model
{
    protected $table            = 'project_technical_docs';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $useTimestamps    = true;
    protected $createdField     = 'created_at';
    protected $updatedField     = 'updated_at';

    protected $allowedFields = [
        'project_id', 'title', 'doc_type', 'version', 'status',
        'description', 'file_url', 'author_id', 'tags', 'created_by',
    ];

    /**
     * Devuelve todos los documentos técnicos de un proyecto, incluyendo
     * nombre del autor y del creador.
     */
    public function findByProject(int $projectId): array
    {
        return $this->select(
                'project_technical_docs.*,
                 a.first_name AS author_first_name,
                 a.last_name  AS author_last_name,
                 a.username   AS author_username,
                 c.first_name AS creator_first_name,
                 c.last_name  AS creator_last_name'
            )
            ->join('users a', 'a.id = project_technical_docs.author_id',  'left')
            ->join('users c', 'c.id = project_technical_docs.created_by', 'left')
            ->where('project_technical_docs.project_id', $projectId)
            ->orderBy('project_technical_docs.doc_type', 'ASC')
            ->orderBy('project_technical_docs.title',    'ASC')
            ->findAll();
    }
}
