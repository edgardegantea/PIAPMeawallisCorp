<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Bulk task import from CSV.
 *
 * POST /api/projects/:id/import/csv   multipart, field: file
 *
 * Expected columns (flexible order):
 *   title*, status, priority, story_points, estimated_hours, due_date,
 *   assigned_to (username), sprint (sprint name or number), description
 */
class CSVImportController extends BaseController
{
    public function import(int $projectId): ResponseInterface
    {
        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Archivo CSV requerido']);
        }

        $csv     = $file->getTempName();
        $handle  = fopen($csv, 'r');
        $headers = array_map('strtolower', array_map('trim', fgetcsv($handle)));

        if (!in_array('title', $headers)) {
            fclose($handle);
            return $this->response->setStatusCode(422)->setJSON(['message' => 'El CSV debe tener columna "title"']);
        }

        $db       = Database::connect();
        $sprints  = $db->table('sprints')->where('project_id', $projectId)->get()->getResultArray();
        $users    = $db->table('users')->get()->getResultArray();
        $sprintMap = array_combine(
            array_map(fn($s) => strtolower($s['name']), $sprints),
            array_column($sprints, 'id')
        );
        foreach ($sprints as $s) $sprintMap[(string)$s['number']] = $s['id'];
        $userMap = array_combine(array_column($users, 'username'), array_column($users, 'id'));

        // Default: first sprint of project
        $defaultSprintId = $sprints[0]['id'] ?? null;
        if (!$defaultSprintId) {
            fclose($handle);
            return $this->response->setStatusCode(422)->setJSON(['message' => 'El proyecto no tiene sprints. Crea al menos uno.']);
        }

        $created = 0; $errors = [];
        $row     = 1;

        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            if (array_filter($line, fn($v) => $v !== '') === []) continue; // skip blank
            $data = array_combine($headers, array_pad($line, count($headers), ''));

            $title = trim($data['title'] ?? '');
            if (!$title) { $errors[] = "Fila {$row}: título vacío"; continue; }

            $sprintId = isset($data['sprint'])
                ? ($sprintMap[strtolower(trim($data['sprint']))] ?? $defaultSprintId)
                : $defaultSprintId;

            $userId = isset($data['assigned_to'])
                ? ($userMap[trim($data['assigned_to'])] ?? null)
                : null;

            $status   = strtoupper(trim($data['status'] ?? 'PENDIENTE'));
            $validSt  = ['PENDIENTE','EN_PROGRESO','BLOQUEADA','COMPLETADA'];
            if (!in_array($status, $validSt)) $status = 'PENDIENTE';

            $priority = strtoupper(trim($data['priority'] ?? 'MEDIA'));
            $validPri = ['BAJA','MEDIA','ALTA','CRITICA'];
            if (!in_array($priority, $validPri)) $priority = 'MEDIA';

            $db->table('tasks')->insert([
                'sprint_id'       => $sprintId,
                'title'           => $title,
                'description'     => $data['description'] ?? null,
                'status'          => $status,
                'priority'        => $priority,
                'assigned_to'     => $userId,
                'estimated_hours' => is_numeric($data['estimated_hours'] ?? '') ? (float)$data['estimated_hours'] : 0,
                'story_points'    => is_numeric($data['story_points'] ?? '')    ? (int)$data['story_points']    : null,
                'due_date'        => !empty($data['due_date']) ? $data['due_date'] : null,
                'created_at'      => date('Y-m-d H:i:s'),
                'updated_at'      => date('Y-m-d H:i:s'),
            ]);

            if ($userId) {
                $taskId = $db->insertID();
                $db->table('task_assignees')->insert(['task_id' => $taskId, 'user_id' => $userId]);
            }

            $created++;
        }
        fclose($handle);

        return $this->response->setJSON([
            'created' => $created,
            'errors'  => $errors,
            'message' => "{$created} tareas importadas" . (count($errors) ? ' con ' . count($errors) . ' errores' : ''),
        ]);
    }

    /** Returns a CSV template for download */
    public function template(): ResponseInterface
    {
        $csv = "title,status,priority,story_points,estimated_hours,due_date,assigned_to,sprint,description\n";
        $csv .= "\"Tarea de ejemplo\",PENDIENTE,MEDIA,3,4,2026-06-30,juan.perez,Sprint 1,\"Descripción opcional\"\n";

        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="import_template.csv"');
        echo $csv;
        exit;
    }
}
