<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * - story_points on tasks
 * - sprint_capacity (hours available per member per sprint)
 */
class AddStoryPointsAndCapacity extends Migration
{
    public function up(): void
    {
        if (!$this->db->fieldExists('story_points', 'tasks')) {
            $this->forge->addColumn('tasks', [
                'story_points' => [
                    'type'    => 'TINYINT UNSIGNED',
                    'null'    => true,
                    'default' => null,
                    'after'   => 'estimated_hours',
                ],
            ]);
        }

        if (!$this->db->tableExists('sprint_capacity')) {
            $this->forge->addField([
                'id'              => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'sprint_id'       => ['type' => 'INT', 'unsigned' => true],
                'user_id'         => ['type' => 'INT', 'unsigned' => true],
                'available_hours' => ['type' => 'DECIMAL', 'constraint' => '5,1', 'default' => '40.0'],
                'notes'           => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addUniqueKey(['sprint_id', 'user_id']);
            $this->forge->addForeignKey('sprint_id', 'sprints', 'id', 'CASCADE', 'CASCADE');
            $this->forge->addForeignKey('user_id',   'users',   'id', 'CASCADE', 'CASCADE');
            $this->forge->createTable('sprint_capacity');
        }
    }

    public function down(): void
    {
        $this->forge->dropTable('sprint_capacity', true);
        try { $this->forge->dropColumn('tasks', 'story_points'); } catch (\Throwable $e) {}
    }
}
