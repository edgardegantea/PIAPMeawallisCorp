<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * - Adds parent_task_id to tasks (subtasks)
 * - Adds budget + hourly_rate to projects
 */
class AddSubtasksAndBudget extends Migration
{
    public function up(): void
    {
        // Subtasks: self-referencing FK on tasks
        if (!$this->db->fieldExists('parent_task_id', 'tasks')) {
            $this->forge->addColumn('tasks', [
                'parent_task_id' => [
                    'type'       => 'INT',
                    'unsigned'   => true,
                    'null'       => true,
                    'default'    => null,
                    'after'      => 'sprint_id',
                    'constraint' => ['tasks', 'id', 'CASCADE'],
                ],
            ]);
        }

        // Project budget & hourly rate
        if (!$this->db->fieldExists('budget', 'projects')) {
            $this->forge->addColumn('projects', [
                'budget' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '15,2',
                    'null'       => true,
                    'default'    => null,
                    'after'      => 'description',
                ],
                'hourly_rate' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => true,
                    'default'    => null,
                    'after'      => 'budget',
                ],
            ]);
        }
    }

    public function down(): void
    {
        $this->forge->dropColumn('tasks',    'parent_task_id');
        $this->forge->dropColumn('projects', 'budget');
        $this->forge->dropColumn('projects', 'hourly_rate');
    }
}
