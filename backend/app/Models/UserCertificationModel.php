<?php

namespace App\Models;

use CodeIgniter\Model;

class UserCertificationModel extends Model
{
    protected $table         = 'user_certifications';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'user_id', 'name', 'issuer', 'issued_date',
        'expiry_date', 'credential_id', 'credential_url', 'created_at',
    ];

    public function findByUser(int $userId): array
    {
        return $this->where('user_id', $userId)
                    ->orderBy('issued_date', 'DESC')
                    ->findAll();
    }
}
