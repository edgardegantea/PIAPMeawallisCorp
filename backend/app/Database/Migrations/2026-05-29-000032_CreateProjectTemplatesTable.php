<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateProjectTemplatesTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'         => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'description'  => ['type' => 'TEXT', 'null' => true],
            'category_id'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'created_by'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'is_public'    => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'template_data'=> ['type' => 'JSON', 'null' => true],   // sprints[], tasks[], milestones[]
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('created_by',  'users',             'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('category_id', 'project_categories','id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('project_templates');
    }

    public function down(): void
    {
        $this->forge->dropTable('project_templates', true);
    }
}
