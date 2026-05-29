<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds file storage columns to project_technical_docs so actual files
 * can be uploaded instead of only linking external URLs.
 */
class AddFileStorageToTechnicalDocs extends Migration
{
    public function up(): void
    {
        // Only add if columns don't exist yet
        if (!$this->db->fieldExists('original_name', 'project_technical_docs')) {
            $this->forge->addColumn('project_technical_docs', [
                'original_name' => [
                    'type'    => 'VARCHAR',
                    'constraint' => 255,
                    'null'    => true,
                    'after'   => 'file_url',
                ],
                'stored_name' => [
                    'type'    => 'VARCHAR',
                    'constraint' => 255,
                    'null'    => true,
                    'after'   => 'original_name',
                ],
                'mime_type' => [
                    'type'    => 'VARCHAR',
                    'constraint' => 120,
                    'null'    => true,
                    'after'   => 'stored_name',
                ],
                'size_bytes' => [
                    'type'     => 'INT UNSIGNED',
                    'null'     => true,
                    'default'  => null,
                    'after'    => 'mime_type',
                ],
            ]);
        }
    }

    public function down(): void
    {
        $this->forge->dropColumn('project_technical_docs', 'original_name');
        $this->forge->dropColumn('project_technical_docs', 'stored_name');
        $this->forge->dropColumn('project_technical_docs', 'mime_type');
        $this->forge->dropColumn('project_technical_docs', 'size_bytes');
    }
}
