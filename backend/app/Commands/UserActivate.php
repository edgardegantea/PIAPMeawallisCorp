<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Config\Database;

/**
 * Activa (o desactiva) una cuenta de usuario desde la línea de comandos.
 *
 * Uso:
 *   php spark user:activate email@dominio.com
 *   php spark user:activate email@dominio.com --deactivate
 *   php spark user:activate --list
 */
class UserActivate extends BaseCommand
{
    protected $group       = 'User';
    protected $name        = 'user:activate';
    protected $description = 'Activa o desactiva una cuenta de usuario por email o username';
    protected $usage       = 'user:activate [email|username] [--deactivate] [--list]';

    protected $options = [
        '--deactivate' => 'Desactiva en lugar de activar',
        '--list'       => 'Muestra todos los usuarios con su estado',
    ];

    public function run(array $params): void
    {
        $db = Database::connect();

        // ── Modo lista ──────────────────────────────────────────────────────
        if (CLI::getOption('list')) {
            $users = $db->query(
                'SELECT id, username, email, role, is_active FROM users ORDER BY id'
            )->getResultArray();

            CLI::write(sprintf('%-4s %-20s %-30s %-12s %s', 'ID', 'Usuario', 'Email', 'Rol', 'Estado'), 'yellow');
            CLI::write(str_repeat('-', 80), 'yellow');
            foreach ($users as $u) {
                $estado = $u['is_active'] ? CLI::color('ACTIVO', 'green') : CLI::color('INACTIVO', 'red');
                CLI::write(sprintf('%-4s %-20s %-30s %-12s %s',
                    $u['id'], $u['username'], $u['email'], $u['role'], $estado));
            }
            return;
        }

        // ── Modo activar / desactivar ───────────────────────────────────────
        $identifier = $params[0] ?? CLI::prompt('Email o username del usuario');

        if (empty($identifier)) {
            CLI::error('Debes proporcionar un email o username.');
            return;
        }

        $user = $db->query(
            'SELECT id, username, email, role, is_active FROM users WHERE email = ? OR username = ? LIMIT 1',
            [$identifier, $identifier]
        )->getRowArray();

        if (!$user) {
            CLI::error("No se encontró ningún usuario con email/username: {$identifier}");
            return;
        }

        $deactivate = (bool) CLI::getOption('deactivate');
        $newStatus  = $deactivate ? 0 : 1;
        $action     = $deactivate ? 'desactivar' : 'activar';

        if ((int) $user['is_active'] === $newStatus) {
            CLI::write("La cuenta ya está " . ($newStatus ? 'ACTIVA' : 'INACTIVA') . '.', 'yellow');
            return;
        }

        CLI::write("Usuario encontrado:", 'green');
        CLI::write("  ID:      {$user['id']}");
        CLI::write("  Usuario: {$user['username']}");
        CLI::write("  Email:   {$user['email']}");
        CLI::write("  Rol:     {$user['role']}");
        CLI::write("  Estado actual: " . ($user['is_active'] ? 'ACTIVO' : 'INACTIVO'));
        CLI::newLine();

        $confirm = CLI::prompt("¿Confirmas {$action} esta cuenta? [y/N]", null, 'required');
        if (strtolower(trim($confirm)) !== 'y') {
            CLI::write('Operación cancelada.', 'yellow');
            return;
        }

        $db->query('UPDATE users SET is_active = ? WHERE id = ?', [$newStatus, $user['id']]);

        CLI::write("✓ Cuenta " . ($newStatus ? 'ACTIVADA' : 'DESACTIVADA') . " correctamente.", 'green');
    }
}
