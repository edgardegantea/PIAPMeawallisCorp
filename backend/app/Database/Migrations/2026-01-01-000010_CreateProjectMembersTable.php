<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateProjectMembersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'  => ['type' => 'INT', 'unsigned' => true],
            'user_id'     => ['type' => 'INT', 'unsigned' => true],
            'role'        => ['type' => 'ENUM', 'constraint' => ['PM','DESARROLLADOR','TESTER','ANALISTA','STAKEHOLDER'], 'default' => 'DESARROLLADOR'],
            'assigned_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['project_id', 'user_id']);
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('project_members');
    }

    public function down()
    {
        $this->forge->dropTable('project_members');
    }
}
