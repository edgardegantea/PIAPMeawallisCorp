<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Project Templates CRUD + "create project from template".
 *
 * GET    /templates
 * POST   /templates             { name, description, category_id, is_public, template_data }
 * GET    /templates/:id
 * PATCH  /templates/:id
 * DELETE /templates/:id
 * POST   /templates/:id/save-from-project   { project_id }  → snapshot an existing project
 * POST   /templates/:id/create-project      { name, code }  → instantiate new project
 */
class ProjectTemplatesController extends BaseController
{
    public function index(): ResponseInterface
    {
        $db   = Database::connect();
        $rows = $db->query("
            SELECT t.*, c.name AS category_name,
                   CONCAT(u.first_name,' ',u.last_name) AS created_by_name
            FROM project_templates t
            LEFT JOIN categories c ON c.id = t.category_id
            LEFT JOIN users      u ON u.id = t.created_by
            WHERE t.is_public = 1 OR t.created_by = ?
            ORDER BY t.name ASC
        ", [Auth::id()])->getResultArray();

        return $this->response->setJSON($rows);
    }

    public function show(int $id): ResponseInterface
    {
        $db  = Database::connect();
        $row = $db->table('project_templates')->where('id', $id)->get()->getRowArray();
        if (!$row) return $this->response->setStatusCode(404)->setJSON(['message' => 'Plantilla no encontrada']);
        $row['template_data'] = $row['template_data'] ? json_decode($row['template_data'], true) : null;
        return $this->response->setJSON($row);
    }

    public function create(): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);

        $name = trim($data['name'] ?? '');
        if (!$name) return $this->response->setStatusCode(422)->setJSON(['message' => 'Nombre requerido']);

        $db->table('project_templates')->insert([
            'name'          => $name,
            'description'   => $data['description']   ?? null,
            'category_id'   => $data['category_id']   ?? null,
            'created_by'    => Auth::id(),
            'is_public'     => $data['is_public']     ?? 1,
            'template_data' => isset($data['template_data']) ? json_encode($data['template_data']) : null,
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);

        $id  = $db->insertID();
        $row = $db->table('project_templates')->where('id', $id)->get()->getRowArray();
        return $this->response->setStatusCode(201)->setJSON($row);
    }

    public function update(int $id): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);

        $payload = array_filter([
            'name'          => $data['name']         ?? null,
            'description'   => $data['description']  ?? null,
            'category_id'   => $data['category_id']  ?? null,
            'is_public'     => $data['is_public']     ?? null,
            'template_data' => isset($data['template_data']) ? json_encode($data['template_data']) : null,
            'updated_at'    => date('Y-m-d H:i:s'),
        ], fn($v) => $v !== null);

        $db->table('project_templates')->where('id', $id)->update($payload);
        $row = $db->table('project_templates')->where('id', $id)->get()->getRowArray();
        if ($row) $row['template_data'] = $row['template_data'] ? json_decode($row['template_data'], true) : null;
        return $this->response->setJSON($row);
    }

    public function delete(int $id): ResponseInterface
    {
        Database::connect()->table('project_templates')->where('id', $id)->delete();
        return $this->response->setStatusCode(204)->setBody('');
    }

    /**
     * Snapshot an existing project into a template.
     * Captures: sprints (with task titles/priorities), milestones.
     */
    public function saveFromProject(int $templateId): ResponseInterface
    {
        $db        = Database::connect();
        $data      = $this->request->getJSON(true);
        $projectId = (int)($data['project_id'] ?? 0);

        if (!$projectId) return $this->response->setStatusCode(422)->setJSON(['message' => 'project_id requerido']);

        $sprints = $db->query("
            SELECT s.id, s.name, s.number,
                   JSON_ARRAYAGG(
                       JSON_OBJECT('title', t.title, 'priority', t.priority,
                                  'estimated_hours', t.estimated_hours, 'description', t.description)
                   ) AS tasks
            FROM sprints s
            LEFT JOIN tasks t ON t.sprint_id = s.id AND t.parent_task_id IS NULL
            WHERE s.project_id = ?
            GROUP BY s.id
            ORDER BY s.number ASC
        ", [$projectId])->getResultArray();

        $milestones = $db->query("
            SELECT title, description, DATEDIFF(due_date, start_date) AS days_offset
            FROM milestones WHERE project_id = ?
        ", [$projectId])->getResultArray();

        foreach ($sprints as &$sp) {
            $sp['tasks'] = $sp['tasks'] ? json_decode($sp['tasks'], true) : [];
        }

        $templateData = ['sprints' => $sprints, 'milestones' => $milestones];

        $db->table('project_templates')->where('id', $templateId)->update([
            'template_data' => json_encode($templateData),
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);

        return $this->response->setJSON(['message' => 'Plantilla actualizada', 'template_id' => $templateId]);
    }

    /**
     * Create a new project from a template.
     * Creates the project, then replicates sprints + tasks + milestones.
     */
    public function createProject(int $templateId): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);

        $template = $db->table('project_templates')->where('id', $templateId)->get()->getRowArray();
        if (!$template) return $this->response->setStatusCode(404)->setJSON(['message' => 'Plantilla no encontrada']);

        $name = trim($data['name'] ?? $template['name']);
        $code = strtoupper(trim($data['code'] ?? ''));
        if (!$name || !$code) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'name y code requeridos']);
        }

        $tplData = $template['template_data'] ? json_decode($template['template_data'], true) : [];

        $db->transStart();

        // 1. Create project
        $db->table('projects')->insert([
            'name'        => $name,
            'code'        => $code,
            'description' => $template['description'] ?? null,
            'category_id' => $template['category_id'] ?? null,
            'director_id' => Auth::id(),
            'status'      => 'PLANIFICACION',
            'is_active'   => 1,
            'created_at'  => date('Y-m-d H:i:s'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ]);
        $projectId = $db->insertID();

        // 2. Add creator as PM member
        $db->table('project_members')->insert([
            'project_id'  => $projectId,
            'user_id'     => Auth::id(),
            'role'        => 'PM',
            'assigned_at' => date('Y-m-d H:i:s'),
        ]);

        // 3. Replicate sprints + tasks
        foreach ($tplData['sprints'] ?? [] as $sp) {
            $db->table('sprints')->insert([
                'project_id' => $projectId,
                'name'       => $sp['name'],
                'number'     => $sp['number'] ?? 1,
                'status'     => 'PLANIFICADO',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            $sprintId = $db->insertID();
            foreach ($sp['tasks'] ?? [] as $t) {
                if (empty($t['title'])) continue;
                $db->table('tasks')->insert([
                    'sprint_id'       => $sprintId,
                    'title'           => $t['title'],
                    'priority'        => $t['priority']        ?? 'MEDIA',
                    'estimated_hours' => $t['estimated_hours'] ?? 0,
                    'description'     => $t['description']     ?? null,
                    'status'          => 'PENDIENTE',
                    'created_at'      => date('Y-m-d H:i:s'),
                    'updated_at'      => date('Y-m-d H:i:s'),
                ]);
            }
        }

        // 4. Replicate milestones (offset from today)
        $baseDate = new \DateTime();
        foreach ($tplData['milestones'] ?? [] as $ml) {
            $due = (clone $baseDate);
            if (isset($ml['days_offset'])) $due->modify("+{$ml['days_offset']} days");
            $db->table('milestones')->insert([
                'project_id'  => $projectId,
                'title'       => $ml['title'],
                'description' => $ml['description'] ?? null,
                'due_date'    => $due->format('Y-m-d'),
                'is_completed'=> 0,
                'created_at'  => date('Y-m-d H:i:s'),
            ]);
        }

        $db->transComplete();

        if (!$db->transStatus()) {
            return $this->response->setStatusCode(500)->setJSON(['message' => 'Error al crear proyecto']);
        }

        return $this->response->setStatusCode(201)->setJSON([
            'message'    => 'Proyecto creado desde plantilla',
            'project_id' => $projectId,
        ]);
    }
}
