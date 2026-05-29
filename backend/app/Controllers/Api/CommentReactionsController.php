<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Toggle emoji reactions on task comments.
 * POST   /comments/:id/reactions  { emoji }  → add if missing, remove if present
 * GET    /comments/:id/reactions             → list reactions with counts
 */
class CommentReactionsController extends BaseController
{
    public function index(int $commentId): ResponseInterface
    {
        $db      = Database::connect();
        $userId  = Auth::id();

        $rows = $db->query("
            SELECT emoji,
                   COUNT(*) AS count,
                   MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS reacted
            FROM comment_reactions
            WHERE comment_id = ?
            GROUP BY emoji
            ORDER BY count DESC
        ", [$userId, $commentId])->getResultArray();

        return $this->response->setJSON($rows);
    }

    public function toggle(int $commentId): ResponseInterface
    {
        $db     = Database::connect();
        $userId = Auth::id();
        $emoji  = trim((string)($this->request->getJSON(true)['emoji'] ?? ''));

        if (!$emoji) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'emoji requerido']);
        }

        $existing = $db->table('comment_reactions')
            ->where(['comment_id' => $commentId, 'user_id' => $userId, 'emoji' => $emoji])
            ->countAllResults();

        if ($existing > 0) {
            $db->table('comment_reactions')
                ->where(['comment_id' => $commentId, 'user_id' => $userId, 'emoji' => $emoji])
                ->delete();
            $action = 'removed';
        } else {
            $db->table('comment_reactions')->insert([
                'comment_id' => $commentId,
                'user_id'    => $userId,
                'emoji'      => $emoji,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            $action = 'added';
        }

        // Return updated reactions for this comment
        $rows = $db->query("
            SELECT emoji,
                   COUNT(*) AS count,
                   MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS reacted
            FROM comment_reactions
            WHERE comment_id = ?
            GROUP BY emoji
            ORDER BY count DESC
        ", [$userId, $commentId])->getResultArray();

        return $this->response->setJSON(['action' => $action, 'reactions' => $rows]);
    }
}
