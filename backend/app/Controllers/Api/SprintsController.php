<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\ProjectGate;
use App\Models\SprintModel;
use App\Models\BacklogItemModel;
use App\Models\TaskModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

class SprintsController extends BaseController
{
    private SprintModel $model;

    public function __construct()
    {
        $this->model = new SprintModel();
    }

    public function index(): ResponseInterface
    {
        $projectId = $this->request->getGet('project');
        if ($projectId) {
            return $this->response->setJSON($this->model->findByProject((int)$projectId));
        }
        return $this->response->setJSON($this->model->findAll());
    }

    public function show(int $id): ResponseInterface
    {
        $sprint = $this->model->find($id);
        if (!$sprint) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Sprint no encontrado']);
        }

        $taskModel = new TaskModel();
        $sprint['tasks'] = $taskModel->findBySprint($id);

        $backlogModel = new BacklogItemModel();
        $sprint['backlog_items'] = $backlogModel->where('sprint_id', $id)->findAll();

        return $this->response->setJSON($sprint);
    }

    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = [
            'project_id' => 'required|integer',
            'name'       => 'required|max_length[255]',
            'start_date' => 'required|valid_date',
            'end_date'   => 'required|valid_date',
        ];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }
        if (!ProjectGate::canWrite((int) $data['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $lastSprint = $this->model->where('project_id', $data['project_id'])->orderBy('number', 'DESC')->first();
        $data['number'] = $lastSprint ? $lastSprint['number'] + 1 : 1;

        $id = $this->model->insert($data);
        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    public function update(int $id): ResponseInterface
    {
        $sprint = $this->model->find($id);
        if (!$sprint) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Sprint no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $sprint['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, $data);
        return $this->response->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        $sprint = $this->model->find($id);
        if (!$sprint) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Sprint no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $sprint['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }

    /**
     * GET /api/sprints/{id}/burndown
     *
     * Devuelve datos del burndown chart: horas estimadas restantes por día
     * desde start_date hasta end_date del sprint.
     * Calcula "ideal" (línea recta) y "real" (horas de tareas no completadas por día).
     */
    public function burndown(int $id): ResponseInterface
    {
        $sprint = $this->model->find($id);
        if (!$sprint) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Sprint no encontrado']);
        }

        $db = Database::connect();

        // Total de horas estimadas del sprint
        $totalHours = (float)($db->table('tasks')
            ->selectSum('estimated_hours')
            ->where('sprint_id', $id)
            ->get()->getRow()->estimated_hours ?? 0);

        $start = new \DateTime($sprint['start_date']);
        $end   = new \DateTime($sprint['end_date']);
        $today = new \DateTime(date('Y-m-d'));

        // Tareas completadas con su fecha de actualización
        $completed = $db->table('tasks')
            ->select('updated_at, estimated_hours')
            ->where('sprint_id', $id)
            ->where('status', 'COMPLETADA')
            ->get()->getResultArray();

        // Acumular horas completadas por día
        $burnedByDay = [];
        foreach ($completed as $task) {
            $day = substr($task['updated_at'], 0, 10);
            $burnedByDay[$day] = ($burnedByDay[$day] ?? 0) + (float)$task['estimated_hours'];
        }

        $data      = [];
        $days      = (int)$start->diff($end)->days + 1;
        $idealStep = $days > 1 ? $totalHours / ($days - 1) : $totalHours;
        $remaining = $totalHours;
        $current   = clone $start;
        $dayIndex  = 0;

        while ($current <= $end) {
            $dayStr = $current->format('Y-m-d');
            $ideal  = round($totalHours - ($idealStep * $dayIndex), 2);
            $real   = null;

            if ($current <= $today) {
                $remaining -= ($burnedByDay[$dayStr] ?? 0);
                $real = round(max(0, $remaining), 2);
            }

            $data[] = ['date' => $dayStr, 'ideal' => max(0, $ideal), 'real' => $real];
            $current->modify('+1 day');
            $dayIndex++;
        }

        return $this->response->setJSON([
            'sprint'      => $sprint,
            'total_hours' => $totalHours,
            'burndown'    => $data,
        ]);
    }

    /**
     * GET /api/sprints/velocity?project={id}
     *
     * Devuelve horas completadas por sprint (velocidad del equipo).
     */
    public function velocity(): ResponseInterface
    {
        $projectId = $this->request->getGet('project');
        if (!$projectId) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Se requiere project_id']);
        }

        $db = Database::connect();
        $sprints = $this->model->findByProject((int)$projectId);

        $result = [];
        foreach ($sprints as $sprint) {
            $completed = (float)($db->table('tasks')
                ->selectSum('estimated_hours')
                ->where('sprint_id', $sprint['id'])
                ->where('status', 'COMPLETADA')
                ->get()->getRow()->estimated_hours ?? 0);

            $total = (float)($db->table('tasks')
                ->selectSum('estimated_hours')
                ->where('sprint_id', $sprint['id'])
                ->get()->getRow()->estimated_hours ?? 0);

            $result[] = [
                'sprint_id'        => $sprint['id'],
                'sprint_name'      => $sprint['name'],
                'sprint_number'    => $sprint['number'],
                'completed_hours'  => $completed,
                'total_hours'      => $total,
                'completion_rate'  => $total > 0 ? round($completed / $total * 100, 1) : 0,
            ];
        }

        return $this->response->setJSON($result);
    }
}
