<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Agrega due_time (TIME nullable) a la tabla tasks para soportar
 * fecha+hora límite de entrega con countdown visible para team members.
 */
class AddDueTimeToTasks extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tasks', [
            'due_time' => [
                'type'    => 'TIME',
                'null'    => true,
                'default' => null,
                'after'   => 'due_date',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tasks', 'due_time');
    }
}
