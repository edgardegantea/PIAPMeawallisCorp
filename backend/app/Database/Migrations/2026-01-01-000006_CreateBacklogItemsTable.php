<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateBacklogItemsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                  => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'          => ['type' => 'INT', 'unsigned' => true],
            'sprint_id'           => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'title'               => ['type' => 'VARCHAR', 'constraint' => 255],
            'description'         => ['type' => 'TEXT', 'null' => true],
            'acceptance_criteria' => ['type' => 'TEXT', 'null' => true],
            'priority'            => ['type' => 'ENUM', 'constraint' => ['BAJA','MEDIA','ALTA'], 'default' => 'MEDIA'],
            'story_points'        => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'status'              => ['type' => 'ENUM', 'constraint' => ['BACKLOG','EN_SPRINT','COMPLETADA'], 'default' => 'BACKLOG'],
            'order'               => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'created_at'          => ['type' => 'DATETIME', 'null' => true],
            'updated_at'          => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('sprint_id', 'sprints', 'id', 'SET NULL', 'SET NULL');
        $this->forge->createTable('backlog_items');
    }

    public function down()
    {
        $this->forge->dropTable('backlog_items');
    }
}
