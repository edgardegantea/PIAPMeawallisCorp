<?php

namespace App\Models;

use CodeIgniter\Model;

class ProjectDocumentModel extends Model
{
    protected $table         = 'project_documents';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['project_id', 'name', 'description', 'file_path', 'file_name', 'file_size', 'uploaded_by'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
