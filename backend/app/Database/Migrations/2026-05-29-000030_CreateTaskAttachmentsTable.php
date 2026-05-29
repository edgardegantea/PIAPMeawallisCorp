<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateTaskAttachmentsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'task_id'       => ['type' => 'INT', 'unsigned' => true, 'null' => false],
            'uploaded_by'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'original_name' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            'stored_name'   => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            'mime_type'     => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'size_bytes'    => ['type' => 'INT', 'unsigned' => true, 'null' => true, 'default' => 0],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('task_id');
        $this->forge->addForeignKey('task_id',     'tasks', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('uploaded_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('task_attachments');
    }

    public function down(): void
    {
        $this->forge->dropTable('task_attachments', true);
    }
}
