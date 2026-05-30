<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWebhooksChatWiki extends Migration
{
    public function up(): void
    {
        // Webhooks
        if (!$this->db->tableExists('webhooks')) {
            $this->forge->addField([
                'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'project_id' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'name'       => ['type' => 'VARCHAR', 'constraint' => 100],
                'url'        => ['type' => 'VARCHAR', 'constraint' => 500],
                'secret'     => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'events'     => ['type' => 'JSON', 'null' => true],   // ['task.created','task.status_changed']
                'is_active'  => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
                'last_sent_at'  => ['type' => 'DATETIME', 'null' => true],
                'last_response' => ['type' => 'SMALLINT', 'null' => true],
                'created_by' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addForeignKey('project_id', 'projects', 'id', 'SET NULL', 'CASCADE');
            $this->forge->addForeignKey('created_by', 'users',    'id', 'SET NULL', 'CASCADE');
            $this->forge->createTable('webhooks');
        }

        // Project chat messages
        if (!$this->db->tableExists('project_chat_messages')) {
            $this->forge->addField([
                'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'project_id'  => ['type' => 'INT', 'unsigned' => true],
                'user_id'     => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'body'        => ['type' => 'TEXT'],
                'file_name'   => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
                'created_at'  => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addKey('project_id');
            $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE',  'CASCADE');
            $this->forge->addForeignKey('user_id',    'users',    'id', 'SET NULL', 'CASCADE');
            $this->forge->createTable('project_chat_messages');
        }

        // Wiki pages
        if (!$this->db->tableExists('wiki_pages')) {
            $this->forge->addField([
                'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'project_id'  => ['type' => 'INT', 'unsigned' => true],
                'parent_id'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'title'       => ['type' => 'VARCHAR', 'constraint' => 255],
                'slug'        => ['type' => 'VARCHAR', 'constraint' => 255],
                'content'     => ['type' => 'LONGTEXT', 'null' => true],
                'created_by'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'updated_by'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'sort_order'  => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
                'created_at'  => ['type' => 'DATETIME', 'null' => true],
                'updated_at'  => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addKey('project_id');
            $this->forge->addForeignKey('project_id', 'projects',   'id', 'CASCADE',  'CASCADE');
            $this->forge->addForeignKey('created_by', 'users',      'id', 'SET NULL', 'CASCADE');
            $this->forge->createTable('wiki_pages');
        }

        // Project invite tokens (guest access)
        if (!$this->db->tableExists('project_invites')) {
            $this->forge->addField([
                'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'project_id'  => ['type' => 'INT', 'unsigned' => true],
                'token'       => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true],
                'label'       => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'expires_at'  => ['type' => 'DATETIME', 'null' => true],
                'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
                'created_by'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'created_at'  => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE',  'CASCADE');
            $this->forge->addForeignKey('created_by', 'users',    'id', 'SET NULL', 'CASCADE');
            $this->forge->createTable('project_invites');
        }
    }

    public function down(): void
    {
        $this->forge->dropTable('project_invites',       true);
        $this->forge->dropTable('wiki_pages',            true);
        $this->forge->dropTable('project_chat_messages', true);
        $this->forge->dropTable('webhooks',              true);
    }
}
