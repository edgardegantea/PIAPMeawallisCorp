<?php

namespace App\Models;

use CodeIgniter\Model;

class RiskModel extends Model
{
    protected $table         = 'risks';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['project_id', 'description', 'probability', 'impact', 'mitigation_plan', 'status'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
