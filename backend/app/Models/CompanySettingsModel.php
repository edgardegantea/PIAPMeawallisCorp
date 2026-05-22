<?php

namespace App\Models;

use CodeIgniter\Model;

class CompanySettingsModel extends Model
{
    protected $table         = 'company_settings';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = [
        'name', 'legal_name', 'representative_name', 'rfc', 'tax_regime',
        'address', 'zip_code', 'email', 'phone', 'website',
    ];
    protected $useTimestamps = false;
    protected $updatedField  = 'updated_at';

    public function getSettings(): array
    {
        $row = $this->first();
        if (!$row) {
            $this->insert(['name' => 'Maewallis Corp', 'legal_name' => 'Maewallis Corp']);
            $row = $this->first();
        }
        return $row;
    }
}
