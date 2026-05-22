<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateProjectCategoriesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 100, 'unique' => true],
            'description' => ['type' => 'TEXT', 'null' => true],
            'color'       => ['type' => 'VARCHAR', 'constraint' => 7, 'default' => '#667eea'],
            'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('project_categories');
    }

    public function down()
    {
        $this->forge->dropTable('project_categories');
    }
}
