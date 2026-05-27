<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddFieldsToRisks extends Migration
{
    public function up(): void
    {
        $this->forge->addColumn('risks', [
            'category' => [
                'type'       => 'ENUM',
                'constraint' => ['TECNICO', 'CRONOGRAMA', 'PRESUPUESTO', 'EXTERNO', 'RECURSOS', 'CALIDAD', 'OTRO'],
                'default'    => 'OTRO',
                'null'       => false,
                'after'      => 'description',
            ],
            'owner_id' => [
                'type'       => 'INT',
                'unsigned'   => true,
                'null'       => true,
                'default'    => null,
                'after'      => 'category',
            ],
            'response_plan' => [
                'type'    => 'TEXT',
                'null'    => true,
                'default' => null,
                'after'   => 'mitigation_plan',
            ],
            'due_date' => [
                'type'    => 'DATE',
                'null'    => true,
                'default' => null,
                'after'   => 'response_plan',
            ],
        ]);

        // FK owner_id → users.id
        $this->db->query('
            ALTER TABLE risks
            ADD CONSTRAINT fk_risks_owner
            FOREIGN KEY (owner_id) REFERENCES users(id)
            ON DELETE SET NULL ON UPDATE CASCADE
        ');
    }

    public function down(): void
    {
        $this->db->query('ALTER TABLE risks DROP FOREIGN KEY fk_risks_owner');
        $this->forge->dropColumn('risks', ['category', 'owner_id', 'response_plan', 'due_date']);
    }
}
