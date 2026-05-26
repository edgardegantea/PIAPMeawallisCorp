<?php

namespace App\Libraries;

/**
 * MailService — servicio centralizado de envío de correos electrónicos.
 *
 * Todos los correos transaccionales del sistema deben pasar por esta clase
 * para garantizar un remitente, diseño y manejo de errores consistentes.
 */
class MailService
{
    // ─── Helpers base ──────────────────────────────────────────────────────────

    /**
     * Envía un correo HTML genérico.
     *
     * @param  string $to       Dirección de destino
     * @param  string $subject  Asunto del correo
     * @param  string $htmlBody Cuerpo en HTML
     * @return bool             true si se envió correctamente
     */
    public static function send(string $to, string $subject, string $htmlBody): bool
    {
        try {
            $cfg   = config('Email');
            $mailer = \Config\Services::email($cfg);

            $mailer->setFrom(
                $cfg->fromEmail ?: 'noreply@maewalliscorp.org',
                'PIAP — MaeWallisCorp'
            );
            $mailer->setTo($to);
            $mailer->setSubject($subject);
            $mailer->setMessage($htmlBody);

            if (!$mailer->send()) {
                log_message('error', '[MailService] send() failed to <' . $to . '>: ' . $mailer->printDebugger(['headers', 'smtp_log']));
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            log_message('error', '[MailService] exception sending to <' . $to . '>: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            return false;
        }
    }

    // ─── Plantillas transaccionales ───────────────────────────────────────────

    /**
     * Correo de restablecimiento de contraseña.
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
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px">PIAP — MaeWallisCorp</h1>
        </td></tr>

        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hola <strong>{$firstName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>PIAP</strong>.
            Si fuiste tú, haz clic en el botón. El enlace es válido por <strong>1 hora</strong>.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:28px 0">
            <tr><td style="background:#4f46e5;border-radius:8px">
              <a href="{$resetLinkEsc}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">
                Restablecer contraseña
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="margin:0 0 24px;font-size:12px;word-break:break-all">
            <a href="{$resetLinkEsc}" style="color:#4f46e5">{$resetLinkEsc}</a>
          </p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
            Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8">© 2026 MaeWallisCorp · Plataforma Integral de Administración de Proyectos</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

        return self::send(
            $user['email'],
            'Restablecer tu contraseña — PIAP',
            $body
        );
    }

    /**
     * Confirmación de que la contraseña fue cambiada exitosamente.
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
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px">PIAP — MaeWallisCorp</h1>
        </td></tr>

        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hola <strong>{$firstName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
            Tu contraseña en <strong>PIAP</strong> fue actualizada correctamente el <strong>{$dateStr}</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
            Si <strong>no realizaste este cambio</strong>, comunícate de inmediato con el administrador del sistema
            o solicita un nuevo restablecimiento de contraseña.
          </p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8">© 2026 MaeWallisCorp · Plataforma Integral de Administración de Proyectos</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

        return self::send(
            $user['email'],
            'Tu contraseña fue actualizada — PIAP',
            $body
        );
    }

    /**
     * Notificación de incorporación a un proyecto.
     *
     * @param  array  $user    Usuario incorporado (email, first_name, last_name)
     * @param  array  $project Proyecto (name, code)
     * @param  string $role    Rol asignado dentro del proyecto
     */
    public static function sendProjectInvite(array $user, array $project, string $role = ''): bool
    {
        $firstName    = htmlspecialchars($user['first_name'] ?? 'usuario');
        $projectName  = htmlspecialchars($project['name']   ?? 'Proyecto');
        $projectCode  = htmlspecialchars($project['code']   ?? '');
        $roleLabel    = htmlspecialchars($role ?: 'Colaborador');

        $frontendUrl   = rtrim((string)(env('APP_FRONTEND_URL') ?? 'https://piap.maewalliscorp.org'), '/');
        $projectIdNum  = (int) ($project['id'] ?? 0);
        $projectUrl    = $projectIdNum ? "{$frontendUrl}/projects/{$projectIdNum}" : $frontendUrl;
        $projectUrlEsc = htmlspecialchars($projectUrl);
        $codeHtml      = $projectCode
            ? " (<code style='font-size:12px;background:#f1f5f9;padding:2px 6px;border-radius:4px'>{$projectCode}</code>)"
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
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px">PIAP — MaeWallisCorp</h1>
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
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8">© 2026 MaeWallisCorp · Plataforma Integral de Administración de Proyectos</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

        return self::send(
            $user['email'],
            "Has sido añadido al proyecto {$projectName} — PIAP",
            $body
        );
    }
}
