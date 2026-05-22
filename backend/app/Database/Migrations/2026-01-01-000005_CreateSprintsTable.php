<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSprintsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id' => ['type' => 'INT', 'unsigned' => true],
            'number'     => ['type' => 'INT', 'unsigned' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 255],
            'goal'       => ['type' => 'TEXT', 'null' => true],
            'start_date' => ['type' => 'DATE'],
            'end_date'   => ['type' => 'DATE'],
            'capacity'   => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'status'     => ['type' => 'ENUM', 'constraint' => ['PLANEADO','ACTIVO','CERRADO'], 'default' => 'PLANEADO'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('sprints');
    }

    public function down()
    {
        $this->forge->dropTable('sprints');
    }
}
