<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCompanySettingsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                  => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'                => ['type' => 'VARCHAR', 'constraint' => 255, 'default' => 'Maewallis Corp'],
            'legal_name'          => ['type' => 'VARCHAR', 'constraint' => 255, 'default' => 'Maewallis Corp'],
            'representative_name' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'rfc'                 => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'tax_regime'          => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'address'             => ['type' => 'TEXT', 'null' => true],
            'zip_code'            => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true],
            'email'               => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'phone'               => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'website'             => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'updated_at'          => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('company_settings');
    }

    public function down()
    {
        $this->forge->dropTable('company_settings');
    }
}
