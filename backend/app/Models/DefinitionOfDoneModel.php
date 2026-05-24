<?php

namespace App\Models;

use CodeIgniter\Model;

class DefinitionOfDoneModel extends Model
{
    protected $table         = 'definition_of_done';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = ['project_id', 'criteria'];
}
