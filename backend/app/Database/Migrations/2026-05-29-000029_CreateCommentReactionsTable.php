<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCommentReactionsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'comment_id' => ['type' => 'INT', 'unsigned' => true, 'null' => false],
            'user_id'    => ['type' => 'INT', 'unsigned' => true, 'null' => false],
            'emoji'      => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['comment_id', 'user_id', 'emoji']);
        $this->forge->addForeignKey('comment_id', 'task_comments', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id',    'users',         'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('comment_reactions');
    }

    public function down(): void
    {
        $this->forge->dropTable('comment_reactions', true);
    }
}
