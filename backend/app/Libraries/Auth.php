<?php

namespace App\Libraries;

/**
 * Almacén estático del usuario autenticado en la petición actual.
 * Evita propiedades dinámicas sobre IncomingRequest (deprecadas en PHP 8.2+).
 */
class Auth
{
    private static ?array $user = null;

    public static function setUser(array $user): void
    {
        self::$user = $user;
    }

    public static function user(): ?array
    {
        return self::$user;
    }

    public static function id(): ?int
    {
        return isset(self::$user['id']) ? (int) self::$user['id'] : null;
    }

    public static function check(): bool
    {
        return self::$user !== null;
    }
}
