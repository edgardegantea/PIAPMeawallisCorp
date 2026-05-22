<?php

namespace App\Filters;

use App\Libraries\Auth;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Restringe el acceso a usuarios con rol ADMIN.
 * Se aplica DESPUÉS del AuthFilter (que ya ha seteado Auth::user()).
 */
class AdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if ($request->getMethod() === 'options') {
            return null;
        }

        if (!Auth::check() || Auth::user()['role'] !== 'ADMIN') {
            return service('response')
                ->setStatusCode(403)
                ->setJSON(['message' => 'Acceso restringido a administradores']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return null;
    }
}
