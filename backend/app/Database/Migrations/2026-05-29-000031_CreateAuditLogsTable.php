<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAuditLogsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'user_id'     => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'entity_type' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],   // task|project|sprint|user|…
            'entity_id'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'action'      => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],   // created|updated|deleted|status_changed|…
            'description' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'old_value'   => ['type' => 'JSON', 'null' => true],
            'new_value'   => ['type' => 'JSON', 'null' => true],
            'ip_address'  => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['entity_type', 'entity_id']);
        $this->forge->addKey('user_id');
        $this->forge->addKey('created_at');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('audit_logs');
    }

    public function down(): void
    {
        $this->forge->dropTable('audit_logs', true);
    }
}
