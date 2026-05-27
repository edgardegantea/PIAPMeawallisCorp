<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table      = 'users';
    protected $primaryKey = 'id';
    protected $returnType = 'array';

    protected $allowedFields = [
        'username', 'email', 'password', 'first_name', 'last_name',
        'phone', 'position', 'department', 'role', 'is_active', 'is_verified',
        'bio', 'birth_date', 'address', 'city', 'state', 'country',
        'rfc', 'curp', 'nss', 'years_experience', 'skills',
        'linkedin_url', 'github_url', 'website_url',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'username' => 'required|min_length[3]|max_length[150]|is_unique[users.username,id,{id}]',
        'email'    => 'required|valid_email|is_unique[users.email,id,{id}]',
        'password' => 'required|min_length[8]',
    ];

    protected $hiddenFields = ['password'];

    public function findByUsername(string $username): ?array
    {
        return $this->where('username', $username)->first();
    }

    public function findByEmail(string $email): ?array
    {
        return $this->where('email', $email)->first();
    }

    public function safeFind(int $id): ?array
    {
        return $this->select(
            'id, username, email, first_name, last_name, phone, position, department, role,
             bio, birth_date, address, city, state, country,
             rfc, curp, nss, years_experience, skills,
             linkedin_url, github_url, website_url,
             is_active, is_verified, created_at, updated_at'
        )->find($id);
    }

    public function listSafe(): array
    {
        return $this->select('id, username, email, first_name, last_name, position, department, role, is_active')
                    ->findAll();
    }

    /**
     * Castea campos enteros que MySQLi devuelve como string.
     * MySQLi siempre devuelve TINYINT/INT como string; json_encode los serializa
     * como string también, lo que hace que "0" sea truthy en JavaScript.
     */
    public static function castRow(array $row): array
    {
        foreach (['id', 'is_active', 'is_verified', 'years_experience'] as $field) {
            if (array_key_exists($field, $row)) {
                $row[$field] = $row[$field] === null ? null : (int) $row[$field];
            }
        }
        return $row;
    }

    public static function castRows(array $rows): array
    {
        return array_map([self::class, 'castRow'], $rows);
    }
}
