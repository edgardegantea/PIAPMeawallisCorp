<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Libraries\ProjectGate;
use App\Models\MeetingMinutesModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Actas de reunión por proyecto.
 *
 * GET    /api/projects/:projectId/meetings
 * POST   /api/projects/:projectId/meetings
 * GET    /api/meetings/:id
 * PATCH  /api/meetings/:id
 * DELETE /api/meetings/:id
 */
class MeetingMinutesController extends BaseController
{
    private MeetingMinutesModel $model;

    public function __construct()
    {
        $this->model = new MeetingMinutesModel();
    }

    /** GET /api/projects/:projectId/meetings */
    public function index(int $projectId): ResponseInterface
    {
        return $this->response->setJSON($this->model->findByProject($projectId));
    }

    /** POST /api/projects/:projectId/meetings */
    public function create(int $projectId): ResponseInterface
    {
        if (!ProjectGate::canWrite($projectId)) {
            return ProjectGate::deny($this->response);
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (empty($data['title']) || empty($data['meeting_date'])) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El título y la fecha son obligatorios']);
        }

        $id = $this->model->insert([
            'project_id'   => $projectId,
            'title'        => trim($data['title']),
            'type'         => $data['type']         ?? 'OTHER',
            'meeting_date' => $data['meeting_date'],
            'location'     => $data['location']     ?? null,
            'attendees'    => isset($data['attendees'])    ? json_encode($data['attendees'])    : null,
            'agenda'       => $data['agenda']        ?? null,
            'decisions'    => $data['decisions']     ?? null,
            'action_items' => isset($data['action_items']) ? json_encode($data['action_items']) : null,
            'notes'        => $data['notes']         ?? null,
            'created_by'   => Auth::id(),
        ]);

        return $this->response->setStatusCode(201)
            ->setJSON($this->withParsedJson($this->model->find($id)));
    }

    /** GET /api/meetings/:id */
    public function show(int $id): ResponseInterface
    {
        $m = $this->model->find($id);
        if (!$m) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Acta no encontrada']);
        }
        return $this->response->setJSON($this->withParsedJson($m));
    }

    /** PATCH /api/meetings/:id */
    public function update(int $id): ResponseInterface
    {
        $m = $this->model->find($id);
        if (!$m) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Acta no encontrada']);
        }
        if (!ProjectGate::canWrite((int) $m['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $data    = $this->request->getJSON(true) ?? $this->request->getPost();
        $allowed = ['title', 'type', 'meeting_date', 'location', 'agenda', 'decisions', 'notes'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (isset($data['attendees'])) {
            $update['attendees'] = is_array($data['attendees'])
                ? json_encode($data['attendees'])
                : $data['attendees'];
        }
        if (isset($data['action_items'])) {
            $update['action_items'] = is_array($data['action_items'])
                ? json_encode($data['action_items'])
                : $data['action_items'];
        }

        if (!empty($update)) {
            $this->model->update($id, $update);
        }

        return $this->response->setJSON($this->withParsedJson($this->model->find($id)));
    }

    /** DELETE /api/meetings/:id */
    public function delete(int $id): ResponseInterface
    {
        $m = $this->model->find($id);
        if (!$m) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Acta no encontrada']);
        }
        if (!ProjectGate::canWrite((int) $m['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function withParsedJson(array $m): array
    {
        if (isset($m['attendees']) && is_string($m['attendees'])) {
            $m['attendees'] = json_decode($m['attendees'], true) ?? [];
        }
        if (isset($m['action_items']) && is_string($m['action_items'])) {
            $m['action_items'] = json_decode($m['action_items'], true) ?? [];
        }
        return $m;
    }
}
