<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Config\Database;

/**
 * Envía recordatorios de vencimiento por email a los asignados de tareas
 * que vencen en las próximas 24 horas (o en el rango --hours).
 *
 * Uso:
 *   php spark tasks:reminder
 *   php spark tasks:reminder --hours=48
 *   php spark tasks:reminder --dry-run     (muestra sin enviar)
 *
 * Configurar en cron: 0 8 * * * /usr/bin/php /path/to/spark tasks:reminder >> /tmp/tasks_reminder.log 2>&1
 */
class TasksReminder extends BaseCommand
{
    protected $group       = 'Tasks';
    protected $name        = 'tasks:reminder';
    protected $description = 'Envía recordatorios de tareas próximas a vencer por email';
    protected $usage       = 'tasks:reminder [--hours=24] [--dry-run]';

    protected $options = [
        '--hours'   => 'Umbral en horas (default: 24)',
        '--dry-run' => 'Solo muestra las tareas sin enviar correos',
    ];

    public function run(array $params): void
    {
        $hours  = (int) (CLI::getOption('hours') ?? 24);
        $dryRun = (bool) CLI::getOption('dry-run');
        $db     = Database::connect();

        $now      = date('Y-m-d H:i:s');
        $cutoff   = date('Y-m-d H:i:s', strtotime("+{$hours} hours"));
        $today    = date('Y-m-d');
        $tomorrow = date('Y-m-d', strtotime("+{$hours} hours"));

        CLI::write("=== tasks:reminder ===", 'yellow');
        CLI::write("Buscando tareas que vencen entre ahora y {$hours}h ({$cutoff})…");

        // Buscar tareas que vencen en el rango y no están completadas
        // Soporte due_time (DATETIME virtual) o solo due_date
        $tasks = $db->query("
            SELECT
                t.id,
                t.title,
                t.due_date,
                t.due_time,
                p.id   AS project_id,
                p.name AS project_name,
                p.code AS project_code,
                s.name AS sprint_name,
                u.id         AS user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.username
            FROM tasks t
            JOIN sprints        s  ON s.id = t.sprint_id
            JOIN projects       p  ON p.id = s.project_id
            JOIN task_assignees ta ON ta.task_id = t.id
            JOIN users          u  ON u.id = ta.user_id
            WHERE t.due_date IS NOT NULL
              AND t.status NOT IN ('COMPLETADA', 'BLOQUEADA')
              AND p.is_active = 1
              AND u.is_active = 1
              AND u.email IS NOT NULL
              AND u.email != ''
              AND (
                    -- Con hora específica: comparar DATETIME
                    (t.due_time IS NOT NULL AND
                     CONCAT(t.due_date, ' ', t.due_time) BETWEEN ? AND ?)
                    OR
                    -- Sin hora: considerar vencimiento al final del día de due_date
                    (t.due_time IS NULL AND t.due_date BETWEEN ? AND ?)
              )
            ORDER BY t.due_date ASC, t.id ASC
        ", [$now, $cutoff, $today, $tomorrow])->getResultArray();

        if (empty($tasks)) {
            CLI::write("No hay tareas próximas a vencer en las próximas {$hours}h.", 'green');
            return;
        }

        CLI::write(count($tasks) . ' recordatorio(s) a enviar:', 'cyan');

        // Agrupar por usuario para enviar un solo email con todas sus tareas
        $byUser = [];
        foreach ($tasks as $t) {
            $byUser[$t['user_id']]['user']    = [
                'first_name' => $t['first_name'],
                'last_name'  => $t['last_name'],
                'email'      => $t['email'],
                'username'   => $t['username'],
            ];
            $byUser[$t['user_id']]['tasks'][] = $t;
        }

        $sent   = 0;
        $errors = 0;

        foreach ($byUser as $userId => $group) {
            $u          = $group['user'];
            $userTasks  = $group['tasks'];
            $name       = trim("{$u['first_name']} {$u['last_name']}") ?: $u['username'];

            CLI::write("  → {$name} <{$u['email']}> — " . count($userTasks) . " tarea(s)");
            foreach ($userTasks as $t) {
                $deadline = $t['due_time']
                    ? "{$t['due_date']} a las " . substr($t['due_time'], 0, 5)
                    : "el {$t['due_date']}";
                CLI::write("     · [{$t['project_code']}] {$t['title']} — vence {$deadline}");
            }

            if ($dryRun) continue;

            $ok = \App\Libraries\MailService::sendTaskReminder($u, $userTasks, $hours);
            if ($ok) { $sent++; }
            else     { $errors++; CLI::write("     ✗ Error al enviar", 'red'); }
        }

        if ($dryRun) {
            CLI::write("Modo dry-run: no se enviaron correos.", 'yellow');
        } else {
            CLI::write("{$sent} correo(s) enviado(s)" . ($errors > 0 ? ", {$errors} error(es)" : "."), 'green');
        }
    }
}
