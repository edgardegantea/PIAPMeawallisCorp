<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Extends project_technical_docs with:
 *  - download_count, review_due_date, sort_order, task_id, approval fields
 *
 * Creates new tables:
 *  - tech_doc_versions  (file version history)
 *  - tech_doc_comments  (per-document discussion)
 */
class ExtendTechnicalDocs extends Migration
{
    public function up(): void
    {
        // ── Extra columns on project_technical_docs ────────────────────────
        $add = [];
        if (!$this->db->fieldExists('download_count', 'project_technical_docs')) {
            $add['download_count'] = ['type' => 'INT UNSIGNED', 'default' => 0, 'after' => 'size_bytes'];
        }
        if (!$this->db->fieldExists('review_due_date', 'project_technical_docs')) {
            $add['review_due_date'] = ['type' => 'DATE', 'null' => true, 'after' => 'download_count'];
        }
        if (!$this->db->fieldExists('sort_order', 'project_technical_docs')) {
            $add['sort_order'] = ['type' => 'INT UNSIGNED', 'default' => 0, 'after' => 'review_due_date'];
        }
        if (!$this->db->fieldExists('task_id', 'project_technical_docs')) {
            $add['task_id'] = ['type' => 'INT UNSIGNED', 'null' => true, 'after' => 'sort_order'];
        }
        if (!$this->db->fieldExists('approved_by', 'project_technical_docs')) {
            $add['approved_by'] = ['type' => 'INT UNSIGNED', 'null' => true, 'after' => 'task_id'];
        }
        if (!$this->db->fieldExists('approved_at', 'project_technical_docs')) {
            $add['approved_at'] = ['type' => 'DATETIME', 'null' => true, 'after' => 'approved_by'];
        }
        if (!$this->db->fieldExists('approval_comment', 'project_technical_docs')) {
            $add['approval_comment'] = ['type' => 'TEXT', 'null' => true, 'after' => 'approved_at'];
        }
        if (!empty($add)) {
            $this->forge->addColumn('project_technical_docs', $add);
        }

        // FKs for new columns (raw SQL — addColumn doesn't support FK)
        $prefix = $this->db->getPrefix();
        try {
            $this->db->query("ALTER TABLE `{$prefix}project_technical_docs`
                ADD CONSTRAINT `fk_ptd_task`        FOREIGN KEY (`task_id`)     REFERENCES `{$prefix}tasks`(`id`) ON DELETE SET NULL,
                ADD CONSTRAINT `fk_ptd_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `{$prefix}users`(`id`) ON DELETE SET NULL");
        } catch (\Throwable $e) { /* already exists */ }

        // ── tech_doc_versions ─────────────────────────────────────────────
        if (!$this->db->tableExists('tech_doc_versions')) {
            $this->forge->addField([
                'id'            => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'doc_id'        => ['type' => 'INT', 'unsigned' => true, 'null' => false],
                'version_label' => ['type' => 'VARCHAR', 'constraint' => 20,  'null' => true],
                'original_name' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
                'stored_name'   => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
                'mime_type'     => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => true],
                'size_bytes'    => ['type' => 'INT UNSIGNED', 'null' => true],
                'notes'         => ['type' => 'TEXT', 'null' => true],
                'created_by'    => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'created_at'    => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addForeignKey('doc_id',     'project_technical_docs', 'id', 'CASCADE',  'CASCADE');
            $this->forge->addForeignKey('created_by', 'users',                  'id', 'SET NULL', 'CASCADE');
            $this->forge->createTable('tech_doc_versions');
        }

        // ── tech_doc_comments ─────────────────────────────────────────────
        if (!$this->db->tableExists('tech_doc_comments')) {
            $this->forge->addField([
                'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'doc_id'     => ['type' => 'INT', 'unsigned' => true, 'null' => false],
                'user_id'    => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                'body'       => ['type' => 'TEXT', 'null' => false],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
                'updated_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addForeignKey('doc_id',  'project_technical_docs', 'id', 'CASCADE',  'CASCADE');
            $this->forge->addForeignKey('user_id', 'users',                  'id', 'SET NULL', 'CASCADE');
            $this->forge->createTable('tech_doc_comments');
        }
    }

    public function down(): void
    {
        $prefix = $this->db->getPrefix();
        try { $this->db->query("ALTER TABLE `{$prefix}project_technical_docs` DROP FOREIGN KEY `fk_ptd_task`, DROP FOREIGN KEY `fk_ptd_approved_by`"); } catch (\Throwable $e) {}
        $this->forge->dropTable('tech_doc_comments', true);
        $this->forge->dropTable('tech_doc_versions',  true);
        foreach (['download_count','review_due_date','sort_order','task_id','approved_by','approved_at','approval_comment'] as $col) {
            try { $this->forge->dropColumn('project_technical_docs', $col); } catch (\Throwable $e) {}
        }
    }
}
