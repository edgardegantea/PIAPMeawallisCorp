<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateTasksTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'sprint_id'       => ['type' => 'INT', 'unsigned' => true],
            'backlog_item_id' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'title'           => ['type' => 'VARCHAR', 'constraint' => 255],
            'description'     => ['type' => 'TEXT', 'null' => true],
            'assigned_to'     => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'status'          => ['type' => 'ENUM', 'constraint' => ['PENDIENTE','EN_PROGRESO','BLOQUEADA','COMPLETADA'], 'default' => 'PENDIENTE'],
            'estimated_hours' => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('sprint_id', 'sprints', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('backlog_item_id', 'backlog_items', 'id', 'SET NULL', 'SET NULL');
        $this->forge->addForeignKey('assigned_to', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->createTable('tasks');
    }

    public function down()
    {
        $this->forge->dropTable('tasks');
    }
}
