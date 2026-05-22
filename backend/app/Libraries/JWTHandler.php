<?php

namespace App\Libraries;

use Exception;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHandler
{
    private string $secret;
    private int    $expire;
    private int    $refreshExpire;
    private string $algo = 'HS256';

    public function __construct()
    {
        // env() es el helper de CI4; cae en $_ENV / getenv() como fallback
        $this->secret        = (string)  (env('JWT_SECRET')         ?? 'change_me_in_production');
        $this->expire        = (int)     (env('JWT_EXPIRE')         ?? 3600);
        $this->refreshExpire = (int)     (env('JWT_REFRESH_EXPIRE') ?? 604800);
    }

    public function generateAccessToken(array $payload): string
    {
        $payload['iat']  = time();
        $payload['exp']  = time() + $this->expire;
        $payload['type'] = 'access';

        return JWT::encode($payload, $this->secret, $this->algo);
    }

    public function generateRefreshToken(array $payload): string
    {
        $payload['iat']  = time();
        $payload['exp']  = time() + $this->refreshExpire;
        $payload['type'] = 'refresh';

        return JWT::encode($payload, $this->secret, $this->algo);
    }

    public function decode(string $token): ?object
    {
        try {
            return JWT::decode($token, new Key($this->secret, $this->algo));
        } catch (Exception) {
            return null;
        }
    }

    public function getRefreshExpireSeconds(): int
    {
        return $this->refreshExpire;
    }
}
