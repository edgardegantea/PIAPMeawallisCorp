<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddContractsAndTechnicalDocs extends Migration
{
    public function up(): void
    {
        // ── Contratos del proyecto ─────────────────────────────────────────────
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'      => ['type' => 'INT', 'unsigned' => true],
            'contract_number' => ['type' => 'VARCHAR', 'constraint' => 80, 'null' => true],
            'title'           => ['type' => 'VARCHAR', 'constraint' => 255],
            'party_name'      => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true,  'comment' => 'Nombre de la contraparte'],
            'contract_type'   => [
                'type'       => 'ENUM',
                'constraint' => ['SERVICIO', 'SUMINISTRO', 'MANTENIMIENTO', 'CONSULTORIA', 'LICENCIA', 'OTRO'],
                'default'    => 'SERVICIO',
            ],
            'status'          => [
                'type'       => 'ENUM',
                'constraint' => ['BORRADOR', 'REVISION', 'ACTIVO', 'VENCIDO', 'CANCELADO', 'COMPLETADO'],
                'default'    => 'BORRADOR',
            ],
            'amount'          => ['type' => 'DECIMAL', 'constraint' => '15,2', 'null' => true],
            'currency'        => ['type' => 'VARCHAR', 'constraint' => 10, 'default' => 'MXN'],
            'start_date'      => ['type' => 'DATE', 'null' => true],
            'end_date'        => ['type' => 'DATE', 'null' => true],
            'signed_date'     => ['type' => 'DATE', 'null' => true],
            'description'     => ['type' => 'TEXT', 'null' => true],
            'file_url'        => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'notes'           => ['type' => 'TEXT', 'null' => true],
            'created_by'      => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->createTable('project_contracts');

        // ── Documentación técnica del proyecto ────────────────────────────────
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'project_id'  => ['type' => 'INT', 'unsigned' => true],
            'title'       => ['type' => 'VARCHAR', 'constraint' => 255],
            'doc_type'    => [
                'type'       => 'ENUM',
                'constraint' => [
                    'REQUERIMIENTOS', 'ARQUITECTURA', 'DISEÑO', 'API',
                    'BASE_DATOS', 'MANUAL_USUARIO', 'MANUAL_TECNICO',
                    'PRUEBAS', 'DESPLIEGUE', 'OTRO',
                ],
                'default' => 'OTRO',
            ],
            'version'     => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => '1.0'],
            'status'      => [
                'type'       => 'ENUM',
                'constraint' => ['BORRADOR', 'EN_REVISION', 'APROBADO', 'OBSOLETO'],
                'default'    => 'BORRADOR',
            ],
            'description' => ['type' => 'TEXT', 'null' => true],
            'file_url'    => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'author_id'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'tags'        => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_by'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('project_id', 'projects', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('author_id',  'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->createTable('project_technical_docs');
    }

    public function down(): void
    {
        $this->forge->dropTable('project_technical_docs', true);
        $this->forge->dropTable('project_contracts',      true);
    }
}
