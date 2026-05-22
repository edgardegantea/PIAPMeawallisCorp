<?php

namespace App\Models;

use CodeIgniter\Model;

class PasswordResetModel extends Model
{
    protected $table         = 'password_reset_tokens';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['email', 'token_hash', 'expires_at', 'created_at'];
    protected $useTimestamps = false;

    /** Elimina tokens previos del email y crea uno nuevo. Devuelve el token en texto plano. */
    public function generate(string $email): string
    {
        // Borrar tokens anteriores para este correo
        $this->where('email', $email)->delete();

        $token     = bin2hex(random_bytes(32)); // 64 caracteres hex
        $tokenHash = hash('sha256', $token);

        $this->insert([
            'email'      => $email,
            'token_hash' => $tokenHash,
            'expires_at' => date('Y-m-d H:i:s', time() + 3600), // 1 hora
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $token;
    }

    /** Verifica token y devuelve el email si es válido, null si no. */
    public function verify(string $token): ?string
    {
        $tokenHash = hash('sha256', $token);

        $row = $this->where('token_hash', $tokenHash)
                    ->where('expires_at >', date('Y-m-d H:i:s'))
                    ->first();

        return $row ? $row['email'] : null;
    }

    /** Invalida el token después de usarlo. */
    public function consume(string $token): void
    {
        $this->where('token_hash', hash('sha256', $token))->delete();
    }
}
