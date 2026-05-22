<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\UserCertificationModel;
use CodeIgniter\HTTP\ResponseInterface;

class CertificationsController extends BaseController
{
    private UserCertificationModel $model;

    public function __construct()
    {
        $this->model = new UserCertificationModel();
    }

    /** GET /api/profile/certifications */
    public function index(): ResponseInterface
    {
        return $this->response->setJSON(
            $this->model->findByUser(Auth::id())
        );
    }

    /** POST /api/profile/certifications */
    public function create(): ResponseInterface
    {
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (empty($data['name'])) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El nombre de la certificación es requerido']);
        }

        $id = $this->model->insert([
            'user_id'        => Auth::id(),
            'name'           => $data['name'],
            'issuer'         => $data['issuer']         ?? null,
            'issued_date'    => $data['issued_date']    ?? null,
            'expiry_date'    => $data['expiry_date']    ?? null,
            'credential_id'  => $data['credential_id']  ?? null,
            'credential_url' => $data['credential_url'] ?? null,
            'created_at'     => date('Y-m-d H:i:s'),
        ]);

        return $this->response->setStatusCode(201)
            ->setJSON($this->model->find($id));
    }

    /** PATCH /api/profile/certifications/:id */
    public function update(int $id): ResponseInterface
    {
        $cert = $this->model->find($id);
        if (!$cert || $cert['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Certificación no encontrada']);
        }

        $data    = $this->request->getJSON(true) ?? $this->request->getPost();
        $allowed = ['name', 'issuer', 'issued_date', 'expiry_date', 'credential_id', 'credential_url'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (!empty($update)) {
            $this->model->update($id, $update);
        }

        return $this->response->setJSON($this->model->find($id));
    }

    /** DELETE /api/profile/certifications/:id */
    public function delete(int $id): ResponseInterface
    {
        $cert = $this->model->find($id);
        if (!$cert || $cert['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Certificación no encontrada']);
        }

        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }
}
