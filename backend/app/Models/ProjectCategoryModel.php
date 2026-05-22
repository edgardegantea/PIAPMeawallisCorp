<?php

namespace App\Models;

use CodeIgniter\Model;

class ProjectCategoryModel extends Model
{
    protected $table         = 'project_categories';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['name', 'description', 'color', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
