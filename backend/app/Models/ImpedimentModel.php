<?php

namespace App\Models;

use CodeIgniter\Model;

class ImpedimentModel extends Model
{
    protected $table         = 'impediments';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = [
        'project_id', 'sprint_id', 'title', 'description',
        'status', 'priority', 'reported_by', 'assigned_to', 'resolved_at',
    ];
}
