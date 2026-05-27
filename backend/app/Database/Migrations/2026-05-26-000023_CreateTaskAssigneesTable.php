<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Tabla de unión para asignación múltiple de tareas.
 * Se mantiene tasks.assigned_to como primer asignado (compatibilidad
 * con consultas existentes de reportes, workload, etc.).
 */
class CreateTaskAssigneesTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'task_id' => ['type' => 'INT', 'unsigned' => true],
            'user_id' => ['type' => 'INT', 'unsigned' => true],
        ]);
        $this->forge->addPrimaryKey(['task_id', 'user_id']);
        $this->forge->addForeignKey('task_id', 'tasks', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('task_assignees');

        // Migrar asignaciones existentes
        $this->db->query('
            INSERT IGNORE INTO task_assignees (task_id, user_id)
            SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL
        ');
    }

    public function down(): void
    {
        $this->forge->dropTable('task_assignees', true);
    }
}
