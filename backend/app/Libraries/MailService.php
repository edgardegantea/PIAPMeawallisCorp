<?php

namespace App\Libraries;

use CodeIgniter\Email\Email;

/**
 * MailService — servicio centralizado de envío de correos electrónicos.
 *
 * Todas las plantillas transaccionales del sistema pasan por aquí para
 * garantizar remitente, diseño y manejo de errores consistentes.
 */
class MailService
{
    // ─── Núcleo ────────────────────────────────────────────────────────────────

    /**
     * Configuraciones SMTP a intentar en orden.
     *
     * 1. Gmail SMTP 587/tls  — configuración principal
     * 2. Gmail SMTP 465/ssl  — cuando 587 está bloqueado en Plesk
     * 3. PHP mail()          — último recurso: usa el postfix/sendmail local del servidor,
     *                          no necesita puertos externos ni credenciales
     */
    private static function smtpConfigs(): array
    {
        $cfg = config('Email');

        return [
            // ── Intento 1: Gmail SMTP 587 TLS ────────────────────────────────
            [
                'label'      => "{$cfg->SMTPHost}:{$cfg->SMTPPort}/{$cfg->SMTPCrypto}",
                'protocol'   => 'smtp',
                'SMTPHost'   => $cfg->SMTPHost,
                'SMTPUser'   => $cfg->SMTPUser,
                'SMTPPass'   => $cfg->SMTPPass,
                'SMTPPort'   => $cfg->SMTPPort,
                'SMTPCrypto' => $cfg->SMTPCrypto,
                'SMTPTimeout'=> $cfg->SMTPTimeout,
                'mailType'   => 'html',
                'charset'    => 'UTF-8',
                'validate'   => false,
                'newline'    => "\r\n",
                'CRLF'       => "\r\n",
            ],
            // ── Intento 2: Gmail SMTP 465 SSL ────────────────────────────────
            [
                'label'      => "{$cfg->SMTPHost}:465/ssl",
                'protocol'   => 'smtp',
                'SMTPHost'   => $cfg->SMTPHost,
                'SMTPUser'   => $cfg->SMTPUser,
                'SMTPPass'   => $cfg->SMTPPass,
                'SMTPPort'   => 465,
                'SMTPCrypto' => 'ssl',
                'SMTPTimeout'=> $cfg->SMTPTimeout,
                'mailType'   => 'html',
                'charset'    => 'UTF-8',
                'validate'   => false,
                'newline'    => "\r\n",
                'CRLF'       => "\r\n",
            ],
            // ── Intento 3: PHP mail() — servidor local (postfix/sendmail Plesk) ──
            [
                'label'    => 'php-mail()',
                'protocol' => 'mail',
                'mailType' => 'html',
                'charset'  => 'UTF-8',
                'validate' => false,
                'newline'  => "\r\n",
                'CRLF'     => "\r\n",
            ],
        ];
    }

    /**
     * Envía un correo HTML intentando múltiples configuraciones SMTP.
     * Si la configuración principal falla (ej. puerto bloqueado en Plesk),
     * reintenta automáticamente con el puerto alternativo.
     *
     * @param  string $to       Dirección de destino
     * @param  string $subject  Asunto del correo
     * @param  string $htmlBody Cuerpo HTML
     * @return bool             true si se envió correctamente
     */
    public static function send(string $to, string $subject, string $htmlBody): bool
    {
        $cfg      = config('Email');
        $configs  = self::smtpConfigs();
        $lastDebug = '';

        foreach ($configs as $smtpConfig) {
            $label = $smtpConfig['label'];
            unset($smtpConfig['label']);

            try {
                $mailer = new Email();
                $mailer->initialize($smtpConfig);

                $mailer->setFrom($cfg->fromEmail, $cfg->fromName);
                $mailer->setTo($to);
                $mailer->setSubject($subject);
                $mailer->setMessage($htmlBody);

                if ($mailer->send(false)) {
                    log_message('info', "[MailService] Correo enviado a <{$to}> via {$label}: {$subject}");
                    return true;
                }

                $lastDebug = $mailer->printDebugger(['headers', 'subject']);
                log_message('warning', "[MailService] Fallo con {$label}: {$lastDebug}");

            } catch (\Throwable $e) {
                $lastDebug = $e->getMessage();
                log_message('warning', "[MailService] Excepcion con {$label}: {$e->getMessage()}");
            }
        }

        log_message('error', "[MailService] Todos los intentos SMTP fallaron para <{$to}>. Ultimo error: {$lastDebug}");
        return false;
    }

    // ─── Plantillas transaccionales ───────────────────────────────────────────

    /**
     * Correo de solicitud de restablecimiento de contraseña.
     */
    public static function sendPasswordReset(array $user, string $resetLink): bool
    {
        $firstName    = htmlspecialchars($user['first_name'] ?? 'usuario');
        $resetLinkEsc = htmlspecialchars($resetLink);

        $body = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

        <tr><td style="background:#4f46e5;padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px">PIAP - MaeWallisCorp</h1>
        </td></tr>

        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hola <strong>{$firstName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
            Recibimos una solicitud para restablecer la contrasena de tu cuenta en <strong>PIAP</strong>.
            Si fuiste tu, haz clic en el boton. El enlace es valido por <strong>1 hora</strong>.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:28px 0">
            <tr><td style="background:#4f46e5;border-radius:8px">
              <a href="{$resetLinkEsc}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">
                Restablecer contrasena
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5">
            Si el boton no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="margin:0 0 24px;font-size:12px;word-break:break-all">
            <a href="{$resetLinkEsc}" style="color:#4f46e5">{$resetLinkEsc}</a>
          </p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
            Si no solicitaste este cambio, ignora este correo. Tu contrasena no sera modificada.
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8">2026 MaeWallisCorp - Plataforma Integral de Administracion de Proyectos</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

        return self::send(
            $user['email'],
            'Restablecer tu contrasena - PIAP',
            $body
        );
    }

    /**
     * Confirmación de cambio de contraseña exitoso.
     */
    public static function sendPasswordChanged(array $user): bool
    {
        $firstName = htmlspecialchars($user['first_name'] ?? 'usuario');
        $dateStr   = date('d/m/Y H:i');

        $body = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

        <tr><td style="background:#059669;padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px">PIAP - MaeWallisCorp</h1>
        </td></tr>

        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hola <strong>{$firstName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
            Tu contrasena en <strong>PIAP</strong> fue actualizada correctamente el <strong>{$dateStr}</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
            Si <strong>no realizaste este cambio</strong>, comunicate de inmediato con el administrador
            del sistema o solicita un nuevo restablecimiento de contrasena.
          </p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
            Este es un correo automatico, por favor no respondas a este mensaje.
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8">2026 MaeWallisCorp - Plataforma Integral de Administracion de Proyectos</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

        return self::send(
            $user['email'],
            'Tu contrasena fue actualizada - PIAP',
            $body
        );
    }

    /**
     * Notificación de incorporación a un proyecto.
     *
     * @param  array  $user    Usuario incorporado (email, first_name, last_name)
     * @param  array  $project Proyecto (id, name, code)
     * @param  string $role    Rol asignado dentro del proyecto
     */
    public static function sendProjectInvite(array $user, array $project, string $role = ''): bool
    {
        $firstName   = htmlspecialchars($user['first_name'] ?? 'usuario');
        $projectName = htmlspecialchars($project['name']   ?? 'Proyecto');
        $projectCode = htmlspecialchars($project['code']   ?? '');
        $roleLabel   = htmlspecialchars($role ?: 'Colaborador');

        $frontendUrl   = rtrim((string)(env('APP_FRONTEND_URL') ?? 'https://piap.maewalliscorp.org'), '/');
        $projectIdNum  = (int) ($project['id'] ?? 0);
        $projectUrl    = $projectIdNum ? "{$frontendUrl}/projects/{$projectIdNum}" : $frontendUrl;
        $projectUrlEsc = htmlspecialchars($projectUrl);
        $codeHtml      = $projectCode
            ? " <span style='font-size:12px;background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace'>{$projectCode}</span>"
            : '';

        $body = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

        <tr><td style="background:#4f46e5;padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px">PIAP - MaeWallisCorp</h1>
        </td></tr>

        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hola <strong>{$firstName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
            Has sido incorporado al proyecto <strong>{$projectName}</strong>{$codeHtml}
            con el rol de <strong>{$roleLabel}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6">
            Ya puedes ingresar a la plataforma para ver las tareas y el avance del proyecto.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr><td style="background:#4f46e5;border-radius:8px">
              <a href="{$projectUrlEsc}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">
                Ver proyecto
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
            Este es un correo automatico, por favor no respondas a este mensaje.
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8">2026 MaeWallisCorp - Plataforma Integral de Administracion de Proyectos</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

        return self::send(
            $user['email'],
            "Has sido anadido al proyecto {$projectName} - PIAP",
            $body
        );
    }
}
