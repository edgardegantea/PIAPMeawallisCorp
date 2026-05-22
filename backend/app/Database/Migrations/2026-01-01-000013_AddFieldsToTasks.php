<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Agrega campos inspirados en Jira/Linear:
 *  - priority    → prioridad visual por color
 *  - due_date    → fecha límite de la tarea
 *  - time_logged → horas reales registradas
 *  - labels      → etiquetas (JSON array)
 */
class AddFieldsToTasks extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tasks', [
            'priority'    => [
                'type'       => 'ENUM',
                'constraint' => ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'],
                'default'    => 'MEDIA',
                'after'      => 'status',
            ],
            'due_date'    => [
                'type'  => 'DATE',
                'null'  => true,
                'after' => 'priority',
            ],
            'time_logged' => [
                'type'       => 'DECIMAL',
                'constraint' => '6,2',
                'default'    => 0,
                'after'      => 'estimated_hours',
            ],
            'labels'      => [
                'type'    => 'JSON',
                'null'    => true,
                'after'   => 'time_logged',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tasks', ['priority', 'due_date', 'time_logged', 'labels']);
    }
}
