<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * task_dependencies
 *  - task_id    : tarea que NECESITA que la otra termine primero (la bloqueada)
 *  - blocker_id : tarea que DEBE completarse antes (el bloqueador)
 *  - type       : BLOCKS (bloqueo real) | RELATED (relación informativa)
 *
 * Lectura semántica: "task_id está bloqueada por blocker_id"
 */
class CreateTaskDependenciesTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'task_id' => [
                'type'     => 'INT',
                'unsigned' => true,
            ],
            'blocker_id' => [
                'type'     => 'INT',
                'unsigned' => true,
            ],
            'type' => [
                'type'       => 'ENUM',
                'constraint' => ['BLOCKS', 'RELATED'],
                'default'    => 'BLOCKS',
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['task_id', 'blocker_id']);
        $this->forge->addForeignKey('task_id',    'tasks', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('blocker_id', 'tasks', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('task_dependencies');
    }

    public function down(): void
    {
        $this->forge->dropTable('task_dependencies', true);
    }
}
