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
        // Subtasks: self-referencing column on tasks (FK added separately via raw SQL)
        if (!$this->db->fieldExists('parent_task_id', 'tasks')) {
            $this->forge->addColumn('tasks', [
                'parent_task_id' => [
                    'type'     => 'INT UNSIGNED',
                    'null'     => true,
                    'default'  => null,
                    'after'    => 'sprint_id',
                ],
            ]);

            // Add the self-referencing FK with raw SQL (avoids Forge constraint confusion)
            $prefix = $this->db->getPrefix();
            $this->db->query(
                "ALTER TABLE `{$prefix}tasks`
                 ADD CONSTRAINT `fk_tasks_parent`
                 FOREIGN KEY (`parent_task_id`)
                 REFERENCES `{$prefix}tasks` (`id`)
                 ON DELETE SET NULL ON UPDATE CASCADE"
            );
        }

        // Project budget & hourly rate
        if (!$this->db->fieldExists('budget', 'projects')) {
            $this->forge->addColumn('projects', [
                'budget' => [
                    'type'       => 'DECIMAL(15,2)',
                    'null'       => true,
                    'default'    => null,
                    'after'      => 'description',
                ],
                'hourly_rate' => [
                    'type'       => 'DECIMAL(10,2)',
                    'null'       => true,
                    'default'    => null,
                    'after'      => 'budget',
                ],
            ]);
        }
    }

    public function down(): void
    {
        // Drop FK before dropping column
        $prefix = $this->db->getPrefix();
        try {
            $this->db->query("ALTER TABLE `{$prefix}tasks` DROP FOREIGN KEY `fk_tasks_parent`");
        } catch (\Throwable $e) { /* already gone */ }

        $this->forge->dropColumn('tasks',    'parent_task_id');
        $this->forge->dropColumn('projects', 'budget');
        $this->forge->dropColumn('projects', 'hourly_rate');
    }
}
