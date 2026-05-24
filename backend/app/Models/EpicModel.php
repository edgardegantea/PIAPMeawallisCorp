<?php

namespace App\Models;

use CodeIgniter\Model;

class EpicModel extends Model
{
    protected $table         = 'epics';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = [
        'project_id', 'title', 'description', 'color',
        'status', 'priority', 'created_by',
    ];
}
