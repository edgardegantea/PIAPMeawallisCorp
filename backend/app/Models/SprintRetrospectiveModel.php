<?php

namespace App\Models;

use CodeIgniter\Model;

class SprintRetrospectiveModel extends Model
{
    protected $table         = 'sprint_retrospectives';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = [
        'sprint_id', 'project_id', 'went_well',
        'to_improve', 'action_items', 'team_mood', 'created_by',
    ];
}
