<?php

namespace App\Models;

use CodeIgniter\Model;

class MeetingMinutesModel extends Model
{
    protected $table         = 'meeting_minutes';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = [
        'project_id', 'title', 'type', 'meeting_date', 'location',
        'attendees', 'agenda', 'decisions', 'action_items', 'notes', 'created_by',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByProject(int $projectId): array
    {
        return $this
            ->select('meeting_minutes.*, CONCAT(COALESCE(u.first_name,""), " ", COALESCE(u.last_name,"")) AS created_by_name')
            ->join('users u', 'u.id = meeting_minutes.created_by', 'left')
            ->where('project_id', $projectId)
            ->orderBy('meeting_date', 'DESC')
            ->orderBy('id', 'DESC')
            ->findAll();
    }
}
