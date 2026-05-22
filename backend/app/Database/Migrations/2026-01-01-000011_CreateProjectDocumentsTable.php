<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateProjectDocumentsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'  => ['type' => 'INT', 'unsigned' => true],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 255],
            'description' => ['type' => 'TEXT', 'null' => true],
            'file_path'   => ['type' => 'VARCHAR', 'constraint' => 500],
            'file_name'   => ['type' => 'VARCHAR', 'constraint' => 255],
            'file_size'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'uploaded_by' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('uploaded_by', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->createTable('project_documents');
    }

    public function down()
    {
        $this->forge->dropTable('project_documents');
    }
}
