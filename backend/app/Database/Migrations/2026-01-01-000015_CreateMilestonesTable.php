<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Hitos del proyecto (como en Asana/GitHub Projects).
 */
class CreateMilestonesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'   => ['type' => 'INT', 'unsigned' => true],
            'title'        => ['type' => 'VARCHAR', 'constraint' => 255],
            'description'  => ['type' => 'TEXT', 'null' => true],
            'due_date'     => ['type' => 'DATE'],
            'is_completed' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'completed_at' => ['type' => 'DATETIME', 'null' => true],
            'order'        => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('milestones');
    }

    public function down()
    {
        $this->forge->dropTable('milestones');
    }
}
