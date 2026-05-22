<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateUsersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'username'    => ['type' => 'VARCHAR', 'constraint' => 150, 'unique' => true],
            'email'       => ['type' => 'VARCHAR', 'constraint' => 255, 'unique' => true],
            'password'    => ['type' => 'VARCHAR', 'constraint' => 255],
            'first_name'  => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'last_name'   => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'phone'       => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'position'    => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'department'  => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'role'        => ['type' => 'ENUM', 'constraint' => ['ADMIN', 'DIRECTOR', 'PM', 'TEAM_MEMBER'], 'default' => 'TEAM_MEMBER'],
            'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'is_verified' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('users');
    }

    public function down()
    {
        $this->forge->dropTable('users');
    }
}
