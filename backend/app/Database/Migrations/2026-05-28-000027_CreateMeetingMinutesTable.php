<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Actas de reunión por proyecto.
 * type: PLANNING | KICKOFF | REVIEW | RETROSPECTIVE | STANDUP | STEERING | OTHER
 */
class CreateMeetingMinutesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'   => ['type' => 'INT', 'unsigned' => true],
            'title'        => ['type' => 'VARCHAR', 'constraint' => 255],
            'type'         => [
                'type'       => 'ENUM',
                'constraint' => ['PLANNING','KICKOFF','REVIEW','RETROSPECTIVE','STANDUP','STEERING','OTHER'],
                'default'    => 'OTHER',
            ],
            'meeting_date' => ['type' => 'DATE'],
            'location'     => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'default' => null],
            'attendees'    => ['type' => 'TEXT', 'null' => true, 'default' => null],  // JSON array of names
            'agenda'       => ['type' => 'TEXT', 'null' => true, 'default' => null],
            'decisions'    => ['type' => 'TEXT', 'null' => true, 'default' => null],
            'action_items' => ['type' => 'TEXT', 'null' => true, 'default' => null], // JSON [{task, responsible, due_date}]
            'notes'        => ['type' => 'TEXT', 'null' => true, 'default' => null],
            'created_by'   => ['type' => 'INT', 'unsigned' => true, 'null' => true, 'default' => null],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->createTable('meeting_minutes');
    }

    public function down()
    {
        $this->forge->dropTable('meeting_minutes');
    }
}
