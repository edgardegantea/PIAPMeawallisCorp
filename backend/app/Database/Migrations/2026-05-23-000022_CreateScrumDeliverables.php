<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateScrumDeliverables extends Migration
{
    public function up(): void
    {
        // ── Épicas ───────────────────────────────────────────────────────────
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'  => ['type' => 'INT', 'unsigned' => true],
            'title'       => ['type' => 'VARCHAR', 'constraint' => 255],
            'description' => ['type' => 'TEXT', 'null' => true],
            'color'       => ['type' => 'VARCHAR', 'constraint' => 7, 'default' => '#6366f1'],
            'status'      => ['type' => 'ENUM', 'constraint' => ['ABIERTA','EN_PROGRESO','CERRADA'], 'default' => 'ABIERTA'],
            'priority'    => ['type' => 'ENUM', 'constraint' => ['BAJA','MEDIA','ALTA','CRITICA'], 'default' => 'MEDIA'],
            'created_by'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('project_id');
        $this->forge->createTable('epics');

        // Vincular backlog_items con épicas
        $this->db->query('ALTER TABLE backlog_items ADD COLUMN epic_id INT UNSIGNED NULL AFTER project_id');
        $this->db->query('ALTER TABLE backlog_items ADD COLUMN user_role VARCHAR(255) NULL AFTER acceptance_criteria');
        $this->db->query('ALTER TABLE backlog_items ADD COLUMN user_action TEXT NULL AFTER user_role');
        $this->db->query('ALTER TABLE backlog_items ADD COLUMN user_benefit TEXT NULL AFTER user_action');

        // ── Definition of Done ───────────────────────────────────────────────
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id' => ['type' => 'INT', 'unsigned' => true],
            'criteria'   => ['type' => 'JSON'],   // array de strings
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('project_id');
        $this->forge->createTable('definition_of_done');

        // ── Impedimentos ─────────────────────────────────────────────────────
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'  => ['type' => 'INT', 'unsigned' => true],
            'sprint_id'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'title'       => ['type' => 'VARCHAR', 'constraint' => 255],
            'description' => ['type' => 'TEXT', 'null' => true],
            'status'      => ['type' => 'ENUM', 'constraint' => ['ABIERTO','EN_PROCESO','RESUELTO'], 'default' => 'ABIERTO'],
            'priority'    => ['type' => 'ENUM', 'constraint' => ['BAJA','MEDIA','ALTA','CRITICA'], 'default' => 'MEDIA'],
            'reported_by' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'assigned_to' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'resolved_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('project_id');
        $this->forge->addKey('sprint_id');
        $this->forge->createTable('impediments');

        // ── Sprint Review ────────────────────────────────────────────────────
        $this->forge->addField([
            'id'                   => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'sprint_id'            => ['type' => 'INT', 'unsigned' => true],
            'project_id'           => ['type' => 'INT', 'unsigned' => true],
            'goal_achieved'        => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'summary'              => ['type' => 'TEXT', 'null' => true],
            'demonstrated_items'   => ['type' => 'TEXT', 'null' => true],
            'stakeholder_feedback' => ['type' => 'TEXT', 'null' => true],
            'attendees'            => ['type' => 'TEXT', 'null' => true],
            'next_steps'           => ['type' => 'TEXT', 'null' => true],
            'created_by'           => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'created_at'           => ['type' => 'DATETIME', 'null' => true],
            'updated_at'           => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('sprint_id');
        $this->forge->createTable('sprint_reviews');

        // ── Sprint Retrospectiva ─────────────────────────────────────────────
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'sprint_id'    => ['type' => 'INT', 'unsigned' => true],
            'project_id'   => ['type' => 'INT', 'unsigned' => true],
            'went_well'    => ['type' => 'TEXT', 'null' => true],
            'to_improve'   => ['type' => 'TEXT', 'null' => true],
            'action_items' => ['type' => 'TEXT', 'null' => true],
            'team_mood'    => ['type' => 'TINYINT', 'constraint' => 1, 'null' => true], // 1-5
            'created_by'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('sprint_id');
        $this->forge->createTable('sprint_retrospectives');
    }

    public function down(): void
    {
        $this->forge->dropTable('sprint_retrospectives', true);
        $this->forge->dropTable('sprint_reviews', true);
        $this->forge->dropTable('impediments', true);
        $this->forge->dropTable('definition_of_done', true);
        $this->db->query('ALTER TABLE backlog_items DROP COLUMN IF EXISTS epic_id');
        $this->db->query('ALTER TABLE backlog_items DROP COLUMN IF EXISTS user_role');
        $this->db->query('ALTER TABLE backlog_items DROP COLUMN IF EXISTS user_action');
        $this->db->query('ALTER TABLE backlog_items DROP COLUMN IF EXISTS user_benefit');
        $this->forge->dropTable('epics', true);
    }
}
