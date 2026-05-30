<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateOKRsTables extends Migration
{
    public function up(): void
    {
        // Objectives
        if (!$this->db->tableExists('okr_objectives')) {
            $this->forge->addField([
                'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'project_id'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'title'       => ['type' => 'VARCHAR', 'constraint' => 255],
                'description' => ['type' => 'TEXT', 'null' => true],
                'owner_id'    => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'period'      => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true, 'comment' => 'Q1-2026 etc'],
                'status'      => ['type' => 'ENUM', 'constraint' => ['ON_TRACK','AT_RISK','OFF_TRACK','COMPLETED'], 'default' => 'ON_TRACK'],
                'created_at'  => ['type' => 'DATETIME', 'null' => true],
                'updated_at'  => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addForeignKey('project_id', 'projects', 'id', 'SET NULL', 'CASCADE');
            $this->forge->addForeignKey('owner_id',   'users',    'id', 'SET NULL', 'CASCADE');
            $this->forge->createTable('okr_objectives');
        }

        // Key Results
        if (!$this->db->tableExists('okr_key_results')) {
            $this->forge->addField([
                'id'           => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'objective_id' => ['type' => 'INT', 'unsigned' => true],
                'title'        => ['type' => 'VARCHAR', 'constraint' => 255],
                'target_value' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 100],
                'current_value'=> ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
                'unit'         => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true, 'comment' => '%, items, $'],
                'created_at'   => ['type' => 'DATETIME', 'null' => true],
                'updated_at'   => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addForeignKey('objective_id', 'okr_objectives', 'id', 'CASCADE', 'CASCADE');
            $this->forge->createTable('okr_key_results');
        }
    }

    public function down(): void
    {
        $this->forge->dropTable('okr_key_results',  true);
        $this->forge->dropTable('okr_objectives',   true);
    }
}
