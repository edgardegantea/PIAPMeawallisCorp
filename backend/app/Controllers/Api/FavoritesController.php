<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\ProjectModel;
use App\Models\UserFavoriteModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * User project favorites (bookmarks).
 *
 * GET  /api/favorites              — list favorite project_ids for current user
 * POST /api/favorites/:projectId   — toggle favorite (create or delete)
 */
class FavoritesController extends BaseController
{
    private UserFavoriteModel $model;
    private ProjectModel      $projectModel;

    public function __construct()
    {
        $this->model        = new UserFavoriteModel();
        $this->projectModel = new ProjectModel();
    }

    /**
     * GET /api/favorites
     * Returns all project_ids bookmarked by the current user.
     */
    public function index(): ResponseInterface
    {
        $userId = Auth::id();
        $rows   = $this->model->findByUser($userId);

        return $this->response->setJSON(
            array_map(fn($r) => (int)$r['project_id'], $rows)
        );
    }

    /**
     * POST /api/favorites/:projectId
     * Toggles the favorite state for the given project.
     */
    public function toggle(int $projectId): ResponseInterface
    {
        if (!$this->projectModel->find($projectId)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Proyecto no encontrado']);
        }

        $userId   = Auth::id();
        $existing = $this->model->findOne($userId, $projectId);

        if ($existing) {
            $this->model->delete($existing['id']);
            return $this->response->setJSON(['is_favorite' => false, 'project_id' => $projectId]);
        }

        $this->model->insert(['user_id' => $userId, 'project_id' => $projectId]);
        return $this->response->setJSON(['is_favorite' => true, 'project_id' => $projectId]);
    }
}
