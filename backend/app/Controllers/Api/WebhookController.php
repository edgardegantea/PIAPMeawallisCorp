<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Outgoing webhooks.
 *
 * GET    /api/projects/:id/webhooks
 * POST   /api/projects/:id/webhooks   { name, url, secret?, events[], is_active }
 * PATCH  /api/webhooks/:id
 * DELETE /api/webhooks/:id
 * POST   /api/webhooks/:id/test
 */
class WebhookController extends BaseController
{
    public function index(int $projectId): ResponseInterface
    {
        $rows = Database::connect()->table('webhooks')
            ->where('project_id', $projectId)->orderBy('name')->get()->getResultArray();
        return $this->response->setJSON($rows);
    }

    public function create(int $projectId): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);

        if (empty($data['url'])) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'URL requerida']);
        }

        $db->table('webhooks')->insert([
            'project_id' => $projectId,
            'name'       => $data['name'] ?? 'Webhook',
            'url'        => $data['url'],
            'secret'     => $data['secret'] ?? null,
            'events'     => json_encode($data['events'] ?? ['task.created','task.status_changed','project.updated']),
            'is_active'  => $data['is_active'] ?? 1,
            'created_by' => Auth::id(),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        $id  = $db->insertID();
        $row = $db->table('webhooks')->where('id', $id)->get()->getRowArray();
        return $this->response->setStatusCode(201)->setJSON($row);
    }

    public function update(int $id): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);
        $allowed = ['name','url','secret','events','is_active'];
        $payload = array_intersect_key($data, array_flip($allowed));
        if (isset($payload['events'])) $payload['events'] = json_encode($payload['events']);
        $db->table('webhooks')->where('id', $id)->update($payload);
        return $this->response->setJSON($db->table('webhooks')->where('id', $id)->get()->getRowArray());
    }

    public function delete(int $id): ResponseInterface
    {
        Database::connect()->table('webhooks')->where('id', $id)->delete();
        return $this->response->setStatusCode(204)->setBody('');
    }

    public function test(int $id): ResponseInterface
    {
        $db      = Database::connect();
        $webhook = $db->table('webhooks')->where('id', $id)->get()->getRowArray();
        if (!$webhook) return $this->response->setStatusCode(404)->setJSON(['message' => 'No encontrado']);

        $payload  = json_encode(['event' => 'test', 'timestamp' => time(), 'project_id' => $webhook['project_id']]);
        $sig      = $webhook['secret'] ? hash_hmac('sha256', $payload, $webhook['secret']) : null;

        $headers  = ['Content-Type: application/json'];
        if ($sig) $headers[] = 'X-Webhook-Signature: ' . $sig;

        $ch = curl_init($webhook['url']);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 10,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $db->table('webhooks')->where('id', $id)->update(['last_sent_at' => date('Y-m-d H:i:s'), 'last_response' => $code]);
        return $this->response->setJSON(['status' => $code, 'ok' => $code >= 200 && $code < 300]);
    }

    /** Called internally to fire webhooks for an event */
    public static function fire(int $projectId, string $event, array $data): void
    {
        try {
            $db = Database::connect();
            $hooks = $db->table('webhooks')
                ->where('project_id', $projectId)->where('is_active', 1)->get()->getResultArray();

            foreach ($hooks as $hook) {
                $events = json_decode($hook['events'] ?? '[]', true);
                if (!in_array($event, $events) && !in_array('*', $events)) continue;

                $payload = json_encode(['event' => $event, 'timestamp' => time(), 'data' => $data]);
                $sig     = $hook['secret'] ? hash_hmac('sha256', $payload, $hook['secret']) : null;

                $headers = ['Content-Type: application/json'];
                if ($sig) $headers[] = 'X-Webhook-Signature: ' . $sig;

                $ch = curl_init($hook['url']);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST           => true,
                    CURLOPT_POSTFIELDS     => $payload,
                    CURLOPT_HTTPHEADER     => $headers,
                    CURLOPT_TIMEOUT        => 5,
                ]);
                $code = curl_getinfo(($ch2 = $ch), CURLINFO_HTTP_CODE);
                curl_exec($ch);
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                $db->table('webhooks')->where('id', $hook['id'])
                    ->update(['last_sent_at' => date('Y-m-d H:i:s'), 'last_response' => $code]);
            }
        } catch (\Throwable $e) {
            log_message('error', 'Webhook fire error: ' . $e->getMessage());
        }
    }
}
