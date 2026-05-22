<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateRisksTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'       => ['type' => 'INT', 'unsigned' => true],
            'description'      => ['type' => 'TEXT'],
            'probability'      => ['type' => 'ENUM', 'constraint' => ['BAJA','MEDIA','ALTA'], 'default' => 'MEDIA'],
            'impact'           => ['type' => 'ENUM', 'constraint' => ['BAJO','MEDIO','ALTO'], 'default' => 'MEDIO'],
            'mitigation_plan'  => ['type' => 'TEXT', 'null' => true],
            'status'           => ['type' => 'ENUM', 'constraint' => ['ABIERTO','EN_MITIGACION','CERRADO'], 'default' => 'ABIERTO'],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
            'updated_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('risks');
    }

    public function down()
    {
        $this->forge->dropTable('risks');
    }
}
