<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Libraries\JWTHandler;
use App\Models\PasswordResetModel;
use App\Models\RefreshTokenModel;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

class AuthController extends BaseController
{
    private JWTHandler        $jwt;
    private UserModel         $userModel;
    private RefreshTokenModel $tokenModel;

    // Máximo de intentos de login fallidos por IP antes de bloquear
    private const MAX_LOGIN_ATTEMPTS = 5;
    // Tiempo de bloqueo en segundos (15 minutos)
    private const LOCKOUT_TTL = 900;

    public function __construct()
    {
        $this->jwt        = new JWTHandler();
        $this->userModel  = new UserModel();
        $this->tokenModel = new RefreshTokenModel();
    }

    public function register(): ResponseInterface
    {
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        $rules = [
            'username'   => 'required|min_length[3]|max_length[150]|is_unique[users.username]',
            'email'      => 'required|valid_email|is_unique[users.email]',
            'password'   => 'required|min_length[8]',
            'first_name' => 'permit_empty|max_length[150]',
            'last_name'  => 'permit_empty|max_length[150]',
        ];

        if (! $this->validate($rules)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $userId = $this->userModel->insert([
            'username'   => $data['username'],
            'email'      => $data['email'],
            'password'   => password_hash($data['password'], PASSWORD_DEFAULT),
            'first_name' => $data['first_name'] ?? '',
            'last_name'  => $data['last_name']  ?? '',
            'role'       => 'TEAM_MEMBER',
            'is_active'  => 1,
        ]);

        if (! $userId) {
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'Error al crear el usuario']);
        }

        $user   = $this->userModel->safeFind($userId);
        $tokens = $this->issueTokens($user);

        return $this->response->setStatusCode(201)
            ->setJSON(['user' => $user, 'tokens' => $tokens]);
    }

    public function login(): ResponseInterface
    {
        $ip      = $this->request->getIPAddress();
        $lockKey = 'login_fail_' . md5($ip);
        $cache   = \Config\Services::cache();
        $fails   = (int) ($cache->get($lockKey) ?? 0);

        if ($fails >= self::MAX_LOGIN_ATTEMPTS) {
            $remaining = $cache->getMetaData($lockKey)['expire'] - time();
            return $this->response->setStatusCode(429)->setJSON([
                'message'     => 'Demasiados intentos fallidos. Intenta de nuevo en ' . ceil($remaining / 60) . ' minutos.',
                'retry_after' => max(0, (int) $remaining),
            ]);
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (empty($data['username']) || empty($data['password'])) {
            return $this->response->setStatusCode(400)
                ->setJSON(['message' => 'Usuario y contraseña requeridos']);
        }

        $user = $this->userModel->findByUsername($data['username']);

        if (! $user || ! password_verify($data['password'], $user['password'])) {
            $cache->save($lockKey, $fails + 1, self::LOCKOUT_TTL);
            return $this->response->setStatusCode(401)
                ->setJSON(['message' => 'Credenciales inválidas']);
        }

        if (! $user['is_active']) {
            return $this->response->setStatusCode(403)
                ->setJSON(['message' => 'Cuenta desactivada']);
        }

        // Login correcto: limpiar contador de intentos
        $cache->delete($lockKey);

        $safeUser = $this->userModel->safeFind($user['id']);
        $tokens   = $this->issueTokens($safeUser);

        return $this->response->setStatusCode(200)
            ->setJSON(['user' => $safeUser, 'tokens' => $tokens]);
    }

    public function refresh(): ResponseInterface
    {
        $data     = $this->request->getJSON(true) ?? $this->request->getPost();
        $rawToken = $data['refresh'] ?? '';

        if (! $rawToken) {
            return $this->response->setStatusCode(400)
                ->setJSON(['message' => 'Refresh token requerido']);
        }

        // Validar firma y expiración del JWT
        $decoded = $this->jwt->decode($rawToken);

        if (! $decoded || ($decoded->type ?? '') !== 'refresh') {
            return $this->response->setStatusCode(401)
                ->setJSON(['message' => 'Refresh token inválido o expirado']);
        }

        // Verificar que el token esté registrado en BD y rotarlo
        $newRefreshToken = $this->jwt->generateRefreshToken([
            'sub'      => $decoded->sub,
            'username' => $decoded->username,
        ]);

        $userId = $this->tokenModel->verifyAndRotate(
            $rawToken,
            $newRefreshToken,
            $this->jwt->getRefreshExpireSeconds()
        );

        if (! $userId) {
            return $this->response->setStatusCode(401)
                ->setJSON(['message' => 'Refresh token revocado o no reconocido']);
        }

        $user = $this->userModel->safeFind($userId);
        if (! $user) {
            return $this->response->setStatusCode(401)
                ->setJSON(['message' => 'Usuario no encontrado']);
        }

        $accessToken = $this->jwt->generateAccessToken([
            'sub'      => $user['id'],
            'username' => $user['username'],
        ]);

        return $this->response->setStatusCode(200)->setJSON([
            'access'  => $accessToken,
            'refresh' => $newRefreshToken,
        ]);
    }

    public function logout(): ResponseInterface
    {
        $this->tokenModel->revokeByUser(Auth::id());

        return $this->response->setStatusCode(200)
            ->setJSON(['message' => 'Sesión cerrada correctamente']);
    }

    public function profile(): ResponseInterface
    {
        return $this->response->setStatusCode(200)
            ->setJSON(Auth::user());
    }

    public function updateProfile(): ResponseInterface
    {
        $user = Auth::user();
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        $allowed = [
            'first_name', 'last_name', 'phone', 'position', 'department',
            'bio', 'birth_date', 'address', 'city', 'state', 'country',
            'rfc', 'curp', 'nss', 'years_experience', 'skills',
            'linkedin_url', 'github_url', 'website_url',
        ];
        $update = array_intersect_key($data, array_flip($allowed));

        if (! empty($data['password'])) {
            if (strlen($data['password']) < 8) {
                return $this->response->setStatusCode(422)
                    ->setJSON(['message' => 'La contraseña debe tener al menos 8 caracteres']);
            }
            $update['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if (! empty($update)) {
            $this->userModel->update($user['id'], $update);
        }

        return $this->response->setStatusCode(200)->setJSON([
            'message' => 'Perfil actualizado correctamente',
            'user'    => $this->userModel->safeFind($user['id']),
        ]);
    }

    /**
     * POST /api/auth/forgot-password
     * Genera token y envía correo de restablecimiento.
     */
    public function forgotPassword(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $email = trim($data['email'] ?? '');

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'Correo electrónico inválido']);
        }

        // Siempre responder OK para no revelar si el email existe
        $user = $this->userModel->where('email', $email)->first();
        if (!$user) {
            return $this->response->setJSON(['message' => 'Si el correo existe, recibirás un enlace en breve.']);
        }

        $resetModel = new PasswordResetModel();
        $token      = $resetModel->generate($email);
        $frontendUrl = rtrim((string)(env('APP_FRONTEND_URL') ?? 'https://piap.maewalliscorp.org'), '/');
        $resetLink   = "{$frontendUrl}/reset-password?token={$token}";

        $emailService = \Config\Services::email();
        $emailService->setFrom(
            (string)(env('MAIL_FROM_ADDRESS') ?? env('email.fromEmail') ?? 'noreply@maewalliscorp.org'),
            (string)(env('MAIL_FROM_NAME')    ?? 'PIAP MaeWallisCorp')
        );
        $emailService->setTo($email);
        $emailService->setSubject('Restablecer contraseña — PIAP');
        $emailService->setMailType('html');
        $emailService->setMessage("
            <p>Hola <strong>{$user['first_name']}</strong>,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña en PIAP.</p>
            <p>Haz clic en el siguiente enlace para continuar (válido por 1 hora):</p>
            <p><a href='{$resetLink}' style='background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block'>
                Restablecer contraseña
            </a></p>
            <p style='color:#6b7280;font-size:13px'>Si no solicitaste este cambio, ignora este mensaje.</p>
            <p style='color:#6b7280;font-size:13px'>{$resetLink}</p>
        ");

        if (!$emailService->send()) {
            log_message('error', '[ForgotPassword] ' . $emailService->printDebugger(['headers']));
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'Error al enviar el correo. Intenta más tarde.']);
        }

        return $this->response->setJSON(['message' => 'Si el correo existe, recibirás un enlace en breve.']);
    }

    /**
     * POST /api/auth/reset-password
     * Valida token y actualiza la contraseña.
     */
    public function resetPassword(): ResponseInterface
    {
        $data     = $this->request->getJSON(true) ?? $this->request->getPost();
        $token    = trim($data['token']    ?? '');
        $password = trim($data['password'] ?? '');

        if (!$token) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Token requerido']);
        }
        if (strlen($password) < 8) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'La contraseña debe tener al menos 8 caracteres']);
        }

        $resetModel = new PasswordResetModel();
        $email      = $resetModel->verify($token);

        if (!$email) {
            return $this->response->setStatusCode(400)
                ->setJSON(['message' => 'El enlace es inválido o ya expiró']);
        }

        $this->userModel->where('email', $email)
            ->set(['password' => password_hash($password, PASSWORD_DEFAULT)])
            ->update();

        $resetModel->consume($token);

        return $this->response->setJSON(['message' => 'Contraseña actualizada correctamente']);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private function issueTokens(array $user): array
    {
        $payload = ['sub' => $user['id'], 'username' => $user['username']];

        $accessToken  = $this->jwt->generateAccessToken($payload);
        $refreshToken = $this->jwt->generateRefreshToken($payload);

        $this->tokenModel->storeToken(
            $user['id'],
            $refreshToken,
            $this->jwt->getRefreshExpireSeconds()
        );

        return [
            'access'  => $accessToken,
            'refresh' => $refreshToken,
        ];
    }
}
