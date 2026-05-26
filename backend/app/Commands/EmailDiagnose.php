<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Config\Database;

/**
 * php spark email:diagnose
 *
 * Verifica todos los prerrequisitos del envío de email en el servidor.
 * Ejecutar en producción para diagnosticar problemas de restablecimiento.
 */
class EmailDiagnose extends BaseCommand
{
    protected $group       = 'Email';
    protected $name        = 'email:diagnose';
    protected $description = 'Diagnostica prerrequisitos de email: DB, SMTP, config y envío real.';
    protected $usage       = 'email:diagnose [--send destino@email.com]';
    protected $options     = [
        '--send' => 'Además de diagnosticar, envía un correo de prueba a esta dirección.',
    ];

    public function run(array $params)
    {
        CLI::write('');
        CLI::write('╔══════════════════════════════════════╗', 'cyan');
        CLI::write('║   PIAP Email Diagnostics             ║', 'cyan');
        CLI::write('╚══════════════════════════════════════╝', 'cyan');
        CLI::write('');

        $allOk = true;

        // ── 1. Tabla password_reset_tokens ────────────────────────────────────
        CLI::write('1. Tabla password_reset_tokens', 'yellow');
        try {
            $db    = Database::connect();
            $exist = $db->tableExists('password_reset_tokens');
            if ($exist) {
                CLI::write('   ✅ Existe', 'green');
            } else {
                CLI::write('   ❌ NO existe — ejecuta: php spark migrate', 'red');
                $allOk = false;
            }
        } catch (\Throwable $e) {
            CLI::write('   ❌ Error de DB: ' . $e->getMessage(), 'red');
            $allOk = false;
        }

        // ── 2. Variables de entorno ───────────────────────────────────────────
        CLI::write('');
        CLI::write('2. Variables de entorno', 'yellow');

        $frontendUrl = env('APP_FRONTEND_URL');
        if ($frontendUrl) {
            CLI::write("   ✅ APP_FRONTEND_URL = {$frontendUrl}", 'green');
        } else {
            CLI::write('   ⚠️  APP_FRONTEND_URL no definida — usando fallback: https://piap.maewalliscorp.org', 'light_gray');
        }

        $ciEnv = env('CI_ENVIRONMENT') ?: ENVIRONMENT;
        $color = $ciEnv === 'production' ? 'green' : 'light_yellow';
        CLI::write("   " . ($ciEnv === 'production' ? '✅' : '⚠️ ') . " CI_ENVIRONMENT = {$ciEnv}", $color);

        // ── 3. Config SMTP ────────────────────────────────────────────────────
        CLI::write('');
        CLI::write('3. Config SMTP (Config/Email.php)', 'yellow');
        $cfg = config('Email');
        CLI::write("   Host     : {$cfg->SMTPHost}");
        CLI::write("   Puerto   : {$cfg->SMTPPort}");
        CLI::write("   Cifrado  : {$cfg->SMTPCrypto}");
        CLI::write("   Usuario  : {$cfg->SMTPUser}");
        CLI::write("   Password : " . (strlen($cfg->SMTPPass) > 0 ? str_repeat('*', strlen($cfg->SMTPPass)) : '❌ VACÍA'));
        CLI::write("   From     : {$cfg->fromEmail} ({$cfg->fromName})");
        CLI::write("   Validate : " . ($cfg->validate ? 'true' : 'false'));

        if (empty($cfg->SMTPPass)) {
            CLI::write('   ❌ SMTPPass está vacía', 'red');
            $allOk = false;
        }

        // ── 4. Conectividad TCP al servidor SMTP ──────────────────────────────
        CLI::write('');
        CLI::write("4. Conectividad TCP a {$cfg->SMTPHost}:{$cfg->SMTPPort}", 'yellow');
        $errno  = 0;
        $errstr = '';
        $sock   = @fsockopen($cfg->SMTPHost, $cfg->SMTPPort, $errno, $errstr, 10);
        if ($sock) {
            fclose($sock);
            CLI::write('   ✅ Puerto alcanzable', 'green');
        } else {
            CLI::write("   ❌ No se pudo conectar: [{$errno}] {$errstr}", 'red');
            CLI::write('   → El firewall del servidor bloquea el puerto ' . $cfg->SMTPPort, 'light_gray');
            CLI::write('   → Solución: abre el puerto en Plesk Firewall o usa puerto 465/ssl', 'light_gray');
            $allOk = false;
        }

        // ── 5. Extensiones PHP necesarias ─────────────────────────────────────
        CLI::write('');
        CLI::write('5. Extensiones PHP', 'yellow');
        $exts = ['openssl', 'mbstring', 'mysqli'];
        foreach ($exts as $ext) {
            $loaded = extension_loaded($ext);
            CLI::write('   ' . ($loaded ? '✅' : '❌') . " {$ext}", $loaded ? 'green' : 'red');
            if (!$loaded) $allOk = false;
        }
        CLI::write('   PHP ' . PHP_VERSION);

        // ── 6. Envío real (opcional con --send) ───────────────────────────────
        $sendTo = CLI::getOption('send') ?? $params[0] ?? null;
        if ($sendTo) {
            CLI::write('');
            CLI::write("6. Envío de prueba a {$sendTo}", 'yellow');

            $mailer = \Config\Services::email(null, false);
            $mailer->setFrom($cfg->fromEmail, $cfg->fromName);
            $mailer->setTo($sendTo);
            $mailer->setSubject('Diagnóstico PIAP - ' . date('d/m/Y H:i:s'));
            $mailer->setMessage('<p>Correo de diagnóstico enviado desde el servidor.</p><p>' . date('c') . '</p>');

            if ($mailer->send(false)) {
                CLI::write('   ✅ Correo enviado exitosamente', 'green');
            } else {
                $debug = strip_tags($mailer->printDebugger(['headers', 'subject']));
                CLI::write('   ❌ Falló el envío:', 'red');
                CLI::write($debug);
                $allOk = false;
            }
        }

        // ── Resumen ───────────────────────────────────────────────────────────
        CLI::write('');
        CLI::write('══════════════════════════════════════', 'cyan');
        if ($allOk) {
            CLI::write('✅  Todo OK — el envío de email debería funcionar.', 'green');
            if (!$sendTo) {
                CLI::write('   Para probar el envío real: php spark email:diagnose --send tu@correo.com', 'light_gray');
            }
        } else {
            CLI::write('❌  Hay problemas que corregir (ver arriba).', 'red');
        }
        CLI::write('');
    }
}
