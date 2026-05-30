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

    /**
     * GET /api/sprints/:id/burnup
     *
     * Burnup: total scope vs. completed work over time.
     * Returns: { dates[], total[], completed[], scope_added[] }
     */
    public function burnup(int $id): ResponseInterface
    {
        $db     = Database::connect();
        $sprint = $this->model->find($id);
        if (!$sprint) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Sprint no encontrado']);
        }

        $start = new \DateTime($sprint['start_date'] ?? date('Y-m-d', strtotime('-14 days')));
        $end   = new \DateTime($sprint['end_date']   ?? date('Y-m-d'));
        $today = new \DateTime();
        if ($end > $today) $end = $today;

        // Get all tasks with their creation date and completion date
        $tasks = $db->query("
            SELECT t.estimated_hours, t.story_points,
                   DATE(t.created_at)  AS added_date,
                   CASE WHEN t.status = 'COMPLETADA' THEN DATE(t.updated_at) ELSE NULL END AS done_date
            FROM tasks t
            WHERE t.sprint_id = ? AND t.parent_task_id IS NULL
        ", [$id])->getResultArray();

        $dates = []; $totalScope = []; $completed = [];
        $cur   = clone $start;
        $runningTotal = 0; $runningDone = 0;

        while ($cur <= $end) {
            $dateStr = $cur->format('Y-m-d');
            foreach ($tasks as $t) {
                $pts = (float)($t['story_points'] ?? $t['estimated_hours'] ?? 1);
                if ($t['added_date'] === $dateStr) $runningTotal += $pts;
                if ($t['done_date']  === $dateStr) $runningDone  += $pts;
            }
            $dates[]      = $dateStr;
            $totalScope[] = round($runningTotal, 1);
            $completed[]  = round($runningDone, 1);
            $cur->modify('+1 day');
        }

        $totalPoints = array_sum(array_map(fn($t) => (float)($t['story_points'] ?? $t['estimated_hours'] ?? 1), $tasks));

        return $this->response->setJSON([
            'sprint'       => ['id' => $id, 'name' => $sprint['name']],
            'dates'        => $dates,
            'total_scope'  => $totalScope,
            'completed'    => $completed,
            'total_points' => $totalPoints,
        ]);
    }

    /**
     * GET /api/projects/:projectId/delivery-prediction
     *
     * Estimates project completion date based on velocity (avg story points/hours per sprint).
     */
    public function deliveryPrediction(int $projectId): ResponseInterface
    {
        $db      = Database::connect();
        $sprints = $this->model->findByProject($projectId);

        // Completed sprints velocity (story points or hours)
        $completedSprints = array_filter($sprints, fn($s) => $s['status'] === 'COMPLETADO');
        $velocities = [];
        foreach ($completedSprints as $s) {
            $done = (float)($db->query("
                SELECT COALESCE(SUM(COALESCE(story_points, estimated_hours, 1)), 0) AS v
                FROM tasks WHERE sprint_id = ? AND status = 'COMPLETADA' AND parent_task_id IS NULL
            ", [$s['id']])->getRow()->v ?? 0);
            if ($done > 0) $velocities[] = $done;
        }

        $avgVelocity = count($velocities) ? array_sum($velocities) / count($velocities) : null;

        // Remaining work
        $remaining = (float)($db->query("
            SELECT COALESCE(SUM(COALESCE(t.story_points, t.estimated_hours, 1)), 0) AS rem
            FROM tasks t
            JOIN sprints s ON s.id = t.sprint_id
            WHERE s.project_id = ? AND t.status != 'COMPLETADA' AND t.parent_task_id IS NULL
        ", [$projectId])->getRow()->rem ?? 0);

        if (!$avgVelocity || $avgVelocity <= 0) {
            return $this->response->setJSON([
                'avg_velocity'     => null,
                'remaining_points' => $remaining,
                'sprints_needed'   => null,
                'predicted_date'   => null,
                'confidence'       => 'low',
                'message'          => 'Insuficientes sprints completados para predecir',
            ]);
        }

        $sprintsNeeded = ceil($remaining / $avgVelocity);
        $activeSprint  = array_values(array_filter($sprints, fn($s) => $s['status'] === 'ACTIVO'))[0] ?? null;
        $sprintDays    = 14; // default sprint length
        if ($activeSprint && $activeSprint['start_date'] && $activeSprint['end_date']) {
            $sprintDays = max(1, (new \DateTime($activeSprint['end_date']))->diff(new \DateTime($activeSprint['start_date']))->days);
        }

        $predictedDate = (new \DateTime())->modify("+{$sprintsNeeded} sprints")->modify("+{$sprintsNeeded} sprints");
        $predictedDate = new \DateTime();
        $predictedDate->modify('+' . ($sprintsNeeded * $sprintDays) . ' days');

        $confidence = count($velocities) >= 3 ? 'high' : (count($velocities) >= 1 ? 'medium' : 'low');

        return $this->response->setJSON([
            'avg_velocity'       => round($avgVelocity, 1),
            'remaining_points'   => $remaining,
            'sprints_needed'     => $sprintsNeeded,
            'predicted_date'     => $predictedDate->format('Y-m-d'),
            'confidence'         => $confidence,
            'velocity_samples'   => count($velocities),
            'planned_end_date'   => $db->table('projects')->select('planned_end_date')->where('id', $projectId)->get()->getRow()->planned_end_date ?? null,
        ]);
    }
}
