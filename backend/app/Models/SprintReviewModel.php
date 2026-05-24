<?php

namespace App\Models;

use CodeIgniter\Model;

class SprintReviewModel extends Model
{
    protected $table         = 'sprint_reviews';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = [
        'sprint_id', 'project_id', 'goal_achieved', 'summary',
        'demonstrated_items', 'stakeholder_feedback',
        'attendees', 'next_steps', 'created_by',
    ];
}
