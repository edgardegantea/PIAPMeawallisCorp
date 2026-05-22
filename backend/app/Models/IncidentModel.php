<?php

namespace App\Models;

use CodeIgniter\Model;

class IncidentModel extends Model
{
    protected $table         = 'incidents';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['project_id', 'title', 'description', 'severity', 'status', 'reported_by', 'assigned_to'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
