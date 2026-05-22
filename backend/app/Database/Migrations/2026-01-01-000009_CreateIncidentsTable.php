<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateIncidentsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'  => ['type' => 'INT', 'unsigned' => true],
            'title'       => ['type' => 'VARCHAR', 'constraint' => 255],
            'description' => ['type' => 'TEXT'],
            'severity'    => ['type' => 'ENUM', 'constraint' => ['BAJA','MEDIA','ALTA','CRITICA'], 'default' => 'MEDIA'],
            'status'      => ['type' => 'ENUM', 'constraint' => ['ABIERTA','EN_REVISION','RESUELTA','CERRADA'], 'default' => 'ABIERTA'],
            'reported_by' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'assigned_to' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('reported_by', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->addForeignKey('assigned_to', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->createTable('incidents');
    }

    public function down()
    {
        $this->forge->dropTable('incidents');
    }
}
