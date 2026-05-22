<?php

namespace App\Models;

use CodeIgniter\Model;

class RefreshTokenModel extends Model
{
    protected $table      = 'refresh_tokens';
    protected $primaryKey = 'id';
    protected $returnType = 'array';

    protected $allowedFields = ['user_id', 'token_hash', 'expires_at', 'created_at'];

    protected $useTimestamps = false;

    public function storeToken(int $userId, string $rawToken, int $ttlSeconds): void
    {
        // Eliminamos tokens anteriores del mismo usuario para no acumular filas.
        $this->where('user_id', $userId)->delete();

        $this->insert([
            'user_id'    => $userId,
            'token_hash' => hash('sha256', $rawToken),
            'expires_at' => date('Y-m-d H:i:s', time() + $ttlSeconds),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function verifyAndRotate(string $rawToken, string $newRawToken, int $ttlSeconds): ?int
    {
        $hash = hash('sha256', $rawToken);
        $row  = $this->where('token_hash', $hash)
                     ->where('expires_at >', date('Y-m-d H:i:s'))
                     ->first();

        if (! $row) {
            return null;
        }

        $userId = (int) $row['user_id'];

        $this->update($row['id'], [
            'token_hash' => hash('sha256', $newRawToken),
            'expires_at' => date('Y-m-d H:i:s', time() + $ttlSeconds),
        ]);

        return $userId;
    }

    public function revokeByUser(int $userId): void
    {
        $this->where('user_id', $userId)->delete();
    }
}
