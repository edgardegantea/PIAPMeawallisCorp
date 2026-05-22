<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * DemoSeeder — carga datos de ejemplo realistas:
 *   • 8 usuarios con roles variados (DIRECTOR, PM, TEAM_MEMBER)
 *   • 5 proyectos en distintas fases con sprints, tareas,
 *     backlog, hitos, riesgos e incidencias
 *
 * Ejecutar: php spark db:seed DemoSeeder
 */
class DemoSeeder extends Seeder
{
    private array $u   = [];  // map username → id
    private array $p   = [];  // map project code → id
    private array $s   = [];  // map "projectCode-sprintN" → id
    private array $cat = [];  // category name → id

    // ─────────────────────────────────────────────
    public function run(): void
    {
        $this->seedUsers();
        $this->loadCategories();
        $this->seedProjects();
    }

    // ══════════════════════════════════════════════
    // USUARIOS
    // ══════════════════════════════════════════════
    private function seedUsers(): void
    {
        $team = [
            [
                'username'   => 'sofia.reyes',
                'email'      => 'sofia.reyes@maewallis.com',
                'first_name' => 'Sofía',
                'last_name'  => 'Reyes Montoya',
                'role'       => 'DIRECTOR',
                'position'   => 'Directora de Proyectos',
                'department' => 'Dirección General',
                'phone'      => '+52 55 1001 0001',
            ],
            [
                'username'   => 'carlos.mendez',
                'email'      => 'carlos.mendez@maewallis.com',
                'first_name' => 'Carlos',
                'last_name'  => 'Méndez Ortiz',
                'role'       => 'PM',
                'position'   => 'Project Manager Senior',
                'department' => 'Gestión de Proyectos',
                'phone'      => '+52 55 1001 0002',
            ],
            [
                'username'   => 'ana.garcia',
                'email'      => 'ana.garcia@maewallis.com',
                'first_name' => 'Ana',
                'last_name'  => 'García Vidal',
                'role'       => 'PM',
                'position'   => 'Project Manager',
                'department' => 'Gestión de Proyectos',
                'phone'      => '+52 55 1001 0003',
            ],
            [
                'username'   => 'luis.torres',
                'email'      => 'luis.torres@maewallis.com',
                'first_name' => 'Luis',
                'last_name'  => 'Torres Ramírez',
                'role'       => 'TEAM_MEMBER',
                'position'   => 'Desarrollador Full Stack',
                'department' => 'Ingeniería',
                'phone'      => '+52 55 1001 0004',
            ],
            [
                'username'   => 'maria.lopez',
                'email'      => 'maria.lopez@maewallis.com',
                'first_name' => 'María',
                'last_name'  => 'López Fuentes',
                'role'       => 'TEAM_MEMBER',
                'position'   => 'QA Engineer',
                'department' => 'Calidad',
                'phone'      => '+52 55 1001 0005',
            ],
            [
                'username'   => 'roberto.silva',
                'email'      => 'roberto.silva@maewallis.com',
                'first_name' => 'Roberto',
                'last_name'  => 'Silva Peña',
                'role'       => 'TEAM_MEMBER',
                'position'   => 'Analista de Negocio',
                'department' => 'Consultoría',
                'phone'      => '+52 55 1001 0006',
            ],
            [
                'username'   => 'diana.castro',
                'email'      => 'diana.castro@maewallis.com',
                'first_name' => 'Diana',
                'last_name'  => 'Castro Herrera',
                'role'       => 'TEAM_MEMBER',
                'position'   => 'Desarrolladora Frontend',
                'department' => 'Ingeniería',
                'phone'      => '+52 55 1001 0007',
            ],
            [
                'username'   => 'pablo.herrera',
                'email'      => 'pablo.herrera@maewallis.com',
                'first_name' => 'Pablo',
                'last_name'  => 'Herrera Vázquez',
                'role'       => 'DIRECTOR',
                'position'   => 'Director de Tecnología',
                'department' => 'Tecnología',
                'phone'      => '+52 55 1001 0008',
            ],
        ];

        // Cargar IDs de usuarios existentes
        $existing = $this->db->table('users')->select('id, username')->get()->getResultArray();
        foreach ($existing as $row) {
            $this->u[$row['username']] = (int) $row['id'];
        }

        $now = date('Y-m-d H:i:s');
        foreach ($team as $user) {
            if (isset($this->u[$user['username']])) {
                continue; // ya existe
            }
            $this->db->table('users')->insert(array_merge($user, [
                'password'   => password_hash('Demo1234!', PASSWORD_DEFAULT),
                'is_active'  => 1,
                'is_verified'=> 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
            $this->u[$user['username']] = (int) $this->db->insertID();
        }

        // Admin siempre disponible
        if (!isset($this->u['admin'])) {
            $row = $this->db->table('users')->where('username', 'admin')->get()->getRowArray();
            if ($row) $this->u['admin'] = (int) $row['id'];
        }
    }

    // ══════════════════════════════════════════════
    // CATEGORÍAS
    // ══════════════════════════════════════════════
    private function loadCategories(): void
    {
        $rows = $this->db->table('project_categories')->select('id, name')->get()->getResultArray();
        foreach ($rows as $r) {
            $this->cat[$r['name']] = (int) $r['id'];
        }
    }

    // ══════════════════════════════════════════════
    // PROYECTOS
    // ══════════════════════════════════════════════
    private function seedProjects(): void
    {
        $this->project1_ecommerce();
        $this->project2_mobile();
        $this->project3_cloud();
        $this->project4_ia();
        $this->project5_kpis();
    }

    // ──────────────────────────────────────────────
    // Proyecto 1 — Plataforma E-Commerce B2B
    // ──────────────────────────────────────────────
    private function project1_ecommerce(): void
    {
        $code = 'ECB-2026';
        if ($this->projectExists($code)) return;

        $pid = $this->insertProject([
            'code'                    => $code,
            'name'                    => 'Plataforma E-Commerce B2B',
            'description'             => 'Desarrollo de una plataforma de comercio electrónico para ventas entre empresas, con catálogo de productos, gestión de pedidos, facturación electrónica CFDI 4.0 y panel de reportes.',
            'category_id'             => $this->cat['Desarrollo Web'] ?? 1,
            'status'                  => 'EJECUCION',
            'priority'                => 'ALTA',
            'director_id'             => $this->u['sofia.reyes'],
            'sponsor_id'              => $this->u['admin'],
            'project_manager_name'    => 'Carlos Méndez Ortiz',
            'developer_representative'=> 'Luis Torres Ramírez',
            'client_name'             => 'Distribuidora Nacional S.A.',
            'client_representative'   => 'Lic. Jorge Ramírez',
            'client_email'            => 'jramirez@disnacional.com',
            'client_phone'            => '+52 55 5500 1234',
            'planned_start_date'      => '2026-01-15',
            'planned_end_date'        => '2026-09-30',
            'actual_start_date'       => '2026-01-20',
            'planned_budget'          => 480000.00,
            'actual_budget'           => 168000.00,
            'completion_percentage'   => 35,
            'objectives'              => "1. Crear plataforma web B2B responsiva\n2. Integrar pasarela de pago y facturación CFDI 4.0\n3. Implementar módulo de reportes ejecutivos\n4. Migrar catálogo de 8,000+ SKUs",
            'scope'                   => 'Módulos: Catálogo, Carrito, Pedidos, Clientes, Facturación, Reportes y API REST.',
            'deliverables'            => "• Portal web (React)\n• API backend (Node.js)\n• Panel de administración\n• Integración SAP B1\n• Documentación técnica",
            'identified_risks'        => "• Retraso en integración con SAP\n• Cambio de requerimientos del cliente\n• Disponibilidad del equipo QA",
            'constraints'             => 'Presupuesto fijo. Fecha de entrega inamovible (Oct 2026).',
            'assumptions'             => 'Cliente proporciona acceso a SAP B1 en Fase 2. Contenido de catálogo disponible en Semana 3.',
            'notes'                   => 'Sprint Review cada 2 semanas. Demo al cliente el último viernes de cada mes.',
        ]);
        $this->p[$code] = $pid;

        // Miembros
        $this->addMembers($pid, [
            ['carlos.mendez', 'PM'],
            ['luis.torres',   'DESARROLLADOR'],
            ['diana.castro',  'DESARROLLADOR'],
            ['maria.lopez',   'TESTER'],
            ['roberto.silva', 'ANALISTA'],
        ]);

        // Sprints
        $s1 = $this->addSprint($pid, 1, 'Setup & Arquitectura Base',        '2026-01-20', '2026-02-14', 'CERRADO', 'Definir arquitectura, configurar entornos y CI/CD pipeline.');
        $s2 = $this->addSprint($pid, 2, 'Catálogo y Autenticación',          '2026-02-17', '2026-03-14', 'CERRADO', 'Módulo de productos, categorías, búsqueda y auth JWT.');
        $s3 = $this->addSprint($pid, 3, 'Carrito, Pedidos y Checkout',       '2026-03-17', '2026-04-11', 'ACTIVO',  'Flujo completo de compra con integración de pagos Stripe.');
        $s4 = $this->addSprint($pid, 4, 'Facturación CFDI y Panel Admin',    '2026-04-14', '2026-05-09', 'PLANEADO','Emisión CFDI 4.0, gestión de facturas y módulo admin.');

        // Backlog
        $bi1 = $this->addBacklogItem($pid, $s2, 'Como comprador quiero buscar productos por categoría para encontrar lo que necesito rápidamente', 'ALTA', 8, 'COMPLETADA', "- Filtros por categoría y subcategoría\n- Búsqueda full-text\n- Resultados paginados (24/página)");
        $bi2 = $this->addBacklogItem($pid, $s2, 'Como administrador quiero importar el catálogo desde CSV para cargar los 8,000 SKUs', 'ALTA', 13, 'COMPLETADA', "- Importar CSV con validación\n- Reportar errores de formato\n- Progreso en tiempo real");
        $bi3 = $this->addBacklogItem($pid, $s3, 'Como comprador quiero agregar productos al carrito y completar el checkout', 'ALTA', 13, 'EN_SPRINT', "- Carrito persistente\n- Dirección de envío\n- Resumen de orden\n- Pago con tarjeta");
        $bi4 = $this->addBacklogItem($pid, $s3, 'Como empresa quiero recibir notificaciones de nuevos pedidos por email y WhatsApp', 'MEDIA', 5, 'EN_SPRINT', "- Email al vendedor\n- WhatsApp Business API\n- Log de notificaciones");
        $bi5 = $this->addBacklogItem($pid, $s4, 'Como contador quiero generar CFDI 4.0 automáticamente al confirmar pago', 'ALTA', 8, 'BACKLOG', "- Integración con PAC\n- CFDI 4.0 con todos los campos requeridos\n- PDF y XML descargables");
        $bi6 = $this->addBacklogItem($pid, null, 'Como gerente quiero ver dashboard de ventas con métricas clave en tiempo real', 'MEDIA', 8, 'BACKLOG', "- Ventas del día/semana/mes\n- Top 10 productos\n- Mapa de calor de pedidos");
        $bi7 = $this->addBacklogItem($pid, null, 'Como comprador quiero guardar mis direcciones de envío para agilizar compras futuras', 'BAJA', 3, 'BACKLOG', "- Hasta 5 direcciones guardadas\n- Dirección por defecto\n- Editar y eliminar");

        // Tareas del sprint 1 (CERRADO)
        $this->addTask($s1, 'Configurar repositorio Git y branching strategy',       $this->u['luis.torres'],  'COMPLETADA', 'MEDIA', '2026-02-05', 4,  4.0);
        $this->addTask($s1, 'Provisionar ambientes dev/staging en AWS',               $this->u['luis.torres'],  'COMPLETADA', 'ALTA',  '2026-02-10', 8,  9.5);
        $this->addTask($s1, 'Configurar pipeline CI/CD con GitHub Actions',           $this->u['diana.castro'], 'COMPLETADA', 'ALTA',  '2026-02-12', 6,  7.0);
        $this->addTask($s1, 'Diseño de base de datos y ERD',                          $this->u['roberto.silva'],'COMPLETADA', 'ALTA',  '2026-02-14', 8,  10.0);
        $this->addTask($s1, 'Crear wireframes de flujo de compra',                    $this->u['diana.castro'], 'COMPLETADA', 'MEDIA', '2026-02-14', 6,  5.5);

        // Tareas del sprint 2 (CERRADO)
        $this->addTask($s2, 'Implementar API de catálogo (CRUD productos)',           $this->u['luis.torres'],  'COMPLETADA', 'ALTA',  '2026-03-05', 10, 12.0);
        $this->addTask($s2, 'Crear componentes UI de listado y detalle de producto',  $this->u['diana.castro'], 'COMPLETADA', 'ALTA',  '2026-03-08', 8,  8.5);
        $this->addTask($s2, 'Implementar búsqueda con Elasticsearch',                 $this->u['luis.torres'],  'COMPLETADA', 'MEDIA', '2026-03-10', 8,  11.0);
        $this->addTask($s2, 'Auth JWT con refresh tokens',                            $this->u['luis.torres'],  'COMPLETADA', 'ALTA',  '2026-03-12', 6,  6.0);
        $this->addTask($s2, 'Script importador CSV de catálogo',                      $this->u['diana.castro'], 'COMPLETADA', 'MEDIA', '2026-03-14', 5,  4.5);
        $this->addTask($s2, 'Pruebas funcionales módulo catálogo',                    $this->u['maria.lopez'],  'COMPLETADA', 'MEDIA', '2026-03-14', 6,  7.0);

        // Tareas del sprint 3 (ACTIVO)
        $this->addTask($s3, 'API de carrito y sesión de usuario',                     $this->u['luis.torres'],  'COMPLETADA',  'ALTA',  '2026-03-25', 8,  8.0);
        $this->addTask($s3, 'Componente UI de carrito lateral (drawer)',              $this->u['diana.castro'], 'COMPLETADA',  'ALTA',  '2026-03-27', 6,  6.5);
        $this->addTask($s3, 'Integración con Stripe para cobros en línea',            $this->u['luis.torres'],  'EN_PROGRESO', 'ALTA',  '2026-04-07', 10, 4.0);
        $this->addTask($s3, 'Flujo de checkout multi-paso',                           $this->u['diana.castro'], 'EN_PROGRESO', 'ALTA',  '2026-04-09', 8,  3.0);
        $this->addTask($s3, 'Envío de correos transaccionales (confirmación pedido)', $this->u['diana.castro'], 'PENDIENTE',   'MEDIA', '2026-04-10', 4,  0.0);
        $this->addTask($s3, 'Plan de pruebas de regresión sprint 3',                  $this->u['maria.lopez'],  'PENDIENTE',   'MEDIA', '2026-04-11', 5,  0.0);

        // Hitos
        $this->addMilestone($pid, 'Arquitectura y entornos listos',   '2026-02-14', 1, 1, '2026-02-14 17:00:00');
        $this->addMilestone($pid, 'Catálogo productivo en staging',    '2026-03-14', 1, 1, '2026-03-15 10:00:00');
        $this->addMilestone($pid, 'Demo checkout al cliente',          '2026-04-11', 0, 0, null);
        $this->addMilestone($pid, 'UAT y aprobación del cliente',      '2026-06-30', 0, 0, null);
        $this->addMilestone($pid, 'Go-Live producción',                '2026-09-15', 0, 0, null);

        // Riesgos
        $this->addRisk($pid, 'Retraso en la integración con SAP B1 del cliente por acceso restringido a entornos productivos', 'ALTA', 'ALTO',  'Solicitar sandbox SAP con 4 semanas de anticipación. Definir contrato de interfaz (API specs) antes de iniciar la integración.', 'EN_MITIGACION');
        $this->addRisk($pid, 'Alcance expandido por cambios de requerimientos del cliente a mitad del proyecto', 'MEDIA', 'ALTO', 'Congelar requerimientos al final de la Fase 1. Cualquier cambio pasa por un proceso formal de change request con impacto en costo y tiempo.', 'ACTIVO');
        $this->addRisk($pid, 'Disponibilidad reducida del equipo QA durante semanas de cierre de sprint', 'MEDIA', 'MEDIO', 'Asignar QA dedicado al proyecto. Automatizar pruebas de regresión con Playwright.', 'ACTIVO');
        $this->addRisk($pid, 'Vulnerabilidades de seguridad en el manejo de pagos (PCI-DSS)', 'BAJA', 'ALTO', 'Usar Stripe Elements (nunca procesar datos de tarjeta en servidor). Audit de seguridad en sprint 6.', 'ACTIVO');

        // Incidencias
        $this->addIncident($pid, 'Error en importación CSV: productos con caracteres especiales en nombre fallan silenciosamente', 'ALTA', 'RESUELTA', $this->u['maria.lopez'], $this->u['luis.torres']);
        $this->addIncident($pid, 'Timeout en búsqueda al consultar más de 500 resultados simultáneos en staging', 'MEDIA', 'EN_REVISION', $this->u['maria.lopez'], $this->u['luis.torres']);
        $this->addIncident($pid, 'Descuadre de inventario al agregar producto al carrito desde múltiples sesiones concurrentes', 'ALTA', 'ABIERTA', $this->u['roberto.silva'], $this->u['luis.torres']);
    }

    // ──────────────────────────────────────────────
    // Proyecto 2 — App Móvil de Logística
    // ──────────────────────────────────────────────
    private function project2_mobile(): void
    {
        $code = 'LOG-MOV-2026';
        if ($this->projectExists($code)) return;

        $pid = $this->insertProject([
            'code'                    => $code,
            'name'                    => 'App Móvil de Logística',
            'description'             => 'Aplicación iOS y Android para operadores de ruta que permite capturar entregas, tomar firma digital, reportar incidencias y sincronizar en tiempo real con el ERP.',
            'category_id'             => $this->cat['Desarrollo Móvil'] ?? 2,
            'status'                  => 'PLANIFICACION',
            'priority'                => 'MEDIA',
            'director_id'             => $this->u['pablo.herrera'],
            'sponsor_id'              => null,
            'project_manager_name'    => 'Ana García Vidal',
            'developer_representative'=> 'Diana Castro Herrera',
            'client_name'             => 'TransRed Operaciones S.A.',
            'client_representative'   => 'Ing. Marco Ávila',
            'client_email'            => 'mavila@transred.mx',
            'client_phone'            => '+52 55 6600 5678',
            'planned_start_date'      => '2026-04-01',
            'planned_end_date'        => '2026-12-15',
            'actual_start_date'       => '2026-04-07',
            'planned_budget'          => 250000.00,
            'actual_budget'           => 28000.00,
            'completion_percentage'   => 10,
            'objectives'              => "1. App nativa React Native para iOS y Android\n2. Captura de firma digital y foto de entrega\n3. Sincronización offline-first con ERP\n4. Dashboard web para supervisores",
            'scope'                   => 'App móvil, API de sincronización, dashboard web de supervisión y módulo de reportes.',
            'deliverables'            => "• App iOS (App Store)\n• App Android (Play Store)\n• API de sincronización\n• Panel web de supervisión",
            'identified_risks'        => "• Conectividad limitada en zonas de entrega\n• Heterogeneidad de dispositivos Android\n• Integración con ERP legado",
            'constraints'             => 'App debe funcionar 100% offline. Soportar Android 9+ e iOS 14+.',
            'assumptions'             => 'Cliente proporciona documentación del API del ERP. Dispositivos de los operadores provistos por cliente.',
            'notes'                   => 'Piloto con 20 operadores en Ciudad de México antes del rollout nacional.',
        ]);
        $this->p[$code] = $pid;

        $this->addMembers($pid, [
            ['ana.garcia',   'PM'],
            ['diana.castro', 'DESARROLLADOR'],
            ['luis.torres',  'DESARROLLADOR'],
            ['roberto.silva','ANALISTA'],
            ['maria.lopez',  'TESTER'],
        ]);

        $s1 = $this->addSprint($pid, 1, 'Discovery y Diseño UX',             '2026-04-07', '2026-05-02', 'ACTIVO',  'Investigación de campo con operadores, wireframes y prototipo navegable.');
        $s2 = $this->addSprint($pid, 2, 'Core de Entregas Offline',           '2026-05-05', '2026-05-30', 'PLANEADO','Módulo de entregas con persistencia local (SQLite) y sincronización en background.');
        $s3 = $this->addSprint($pid, 3, 'Firma Digital y Evidencias',         '2026-06-02', '2026-06-27', 'PLANEADO','Captura de firma, foto de evidencia y geolocalización de entrega.');

        $bi1 = $this->addBacklogItem($pid, $s1, 'Como operador quiero ver mi listado de entregas del día ordenado por ruta óptima', 'ALTA', 8, 'EN_SPRINT', "- Ordenado por ruta óptima (TSP simplificado)\n- Sincronizado al iniciar turno\n- Disponible offline");
        $bi2 = $this->addBacklogItem($pid, $s1, 'Como operador quiero registrar la entrega con foto y firma del destinatario', 'ALTA', 13, 'EN_SPRINT', "- Cámara nativa\n- Firma en pantalla táctil\n- Almacenado localmente si no hay red");
        $bi3 = $this->addBacklogItem($pid, $s2, 'Como supervisor quiero ver en tiempo real el avance de todas las rutas en un mapa', 'ALTA', 8, 'BACKLOG', "- Mapa con marcadores por operador\n- Color por estado (en ruta/completada/incidencia)\n- Actualización cada 30s");
        $bi4 = $this->addBacklogItem($pid, $s2, 'Como operador quiero reportar una incidencia (paquete dañado, destinatario ausente) con foto', 'MEDIA', 5, 'BACKLOG', "- Catálogo de tipos de incidencia\n- Foto y descripción\n- Notificación automática al supervisor");
        $bi5 = $this->addBacklogItem($pid, null, 'Como administrador quiero exportar el reporte diario de entregas en PDF y Excel', 'BAJA', 5, 'BACKLOG', "- Filtros por ruta, fecha, operador\n- PDF con firmas incrustadas\n- Excel con datos crudos");

        $this->addTask($s1, 'Entrevistas con 10 operadores de ruta (campo)',          $this->u['roberto.silva'],'EN_PROGRESO','ALTA',  '2026-04-25', 8,  5.0);
        $this->addTask($s1, 'Mapa de flujo actual del proceso de entrega',            $this->u['roberto.silva'],'COMPLETADA', 'MEDIA', '2026-04-18', 4,  4.5);
        $this->addTask($s1, 'Wireframes app (Figma) — pantallas principales',        $this->u['diana.castro'], 'EN_PROGRESO','ALTA',  '2026-04-28', 10, 6.0);
        $this->addTask($s1, 'Setup proyecto React Native + Expo + TypeScript',        $this->u['diana.castro'], 'COMPLETADA', 'ALTA',  '2026-04-14', 4,  3.5);
        $this->addTask($s1, 'Análisis del API del ERP (documentación + mock)',        $this->u['luis.torres'],  'EN_PROGRESO','ALTA',  '2026-04-30', 6,  3.0);
        $this->addTask($s1, 'Definir estrategia offline-first y modelo de conflictos',$this->u['luis.torres'],  'PENDIENTE',  'ALTA',  '2026-05-02', 6,  0.0);

        $this->addMilestone($pid, 'Prototipo navegable aprobado por cliente', '2026-05-02', 0, 0, null);
        $this->addMilestone($pid, 'MVP funcional en dispositivos de prueba',   '2026-07-15', 0, 0, null);
        $this->addMilestone($pid, 'Piloto con 20 operadores CDMX',             '2026-09-01', 0, 0, null);
        $this->addMilestone($pid, 'Publicación en App Store y Play Store',     '2026-11-30', 0, 0, null);

        $this->addRisk($pid, 'Conectividad 3G/4G nula en zonas rurales de entrega — la app debe operar 100% offline', 'ALTA', 'ALTO', 'Implementar arquitectura offline-first con SQLite local y cola de sincronización con reintentos exponenciales.', 'EN_MITIGACION');
        $this->addRisk($pid, 'API del ERP legado no documentada y sin sandbox disponible', 'ALTA', 'MEDIO', 'Solicitar acceso a ERP con contrato SLA. Crear capa de adaptadores para aislar el sistema de cambios en el ERP.', 'ACTIVO');
        $this->addRisk($pid, 'Fragmentación de dispositivos Android: versiones 9 a 14 con cámaras y GPS heterogéneos', 'MEDIA', 'MEDIO', 'Matriz de dispositivos de prueba. Feature detection en lugar de versión. Evitar APIs de cámara nativas.', 'ACTIVO');

        $this->addIncident($pid, 'El prototipo Figma entregado por el diseñador externo no cumple con la guía de marca del cliente', 'MEDIA', 'EN_REVISION', $this->u['ana.garcia'], $this->u['diana.castro']);
        $this->addIncident($pid, 'Retraso en entrega de documentación del ERP por parte del cliente (2 semanas de atraso)', 'ALTA', 'ABIERTA', $this->u['ana.garcia'], null);
    }

    // ──────────────────────────────────────────────
    // Proyecto 3 — Migración Cloud AWS
    // ──────────────────────────────────────────────
    private function project3_cloud(): void
    {
        $code = 'CLOUD-AWS-26';
        if ($this->projectExists($code)) return;

        $pid = $this->insertProject([
            'code'                    => $code,
            'name'                    => 'Migración Infraestructura Cloud AWS',
            'description'             => 'Migración de 12 aplicaciones críticas del datacenter on-premise a AWS. Incluye re-arquitectura de microservicios, implementación de Kubernetes (EKS), base de datos administrada RDS y estrategia de DR multi-región.',
            'category_id'             => $this->cat['Infraestructura'] ?? 3,
            'status'                  => 'EJECUCION',
            'priority'                => 'CRITICA',
            'director_id'             => $this->u['sofia.reyes'],
            'sponsor_id'              => $this->u['admin'],
            'project_manager_name'    => 'Carlos Méndez Ortiz',
            'developer_representative'=> 'Luis Torres Ramírez',
            'client_name'             => 'Corporativo Maewallis',
            'client_representative'   => 'CTO Interno',
            'client_email'            => 'cto@maewallis.com',
            'planned_start_date'      => '2025-11-01',
            'planned_end_date'        => '2026-07-31',
            'actual_start_date'       => '2025-11-01',
            'planned_budget'          => 720000.00,
            'actual_budget'           => 396000.00,
            'completion_percentage'   => 55,
            'objectives'              => "1. Migrar 12 apps críticas a AWS sin downtime\n2. Implementar EKS con auto-scaling\n3. Reducir TCO 40% vs datacenter\n4. RTO < 15min, RPO < 5min con DR multi-región",
            'scope'                   => 'Aplicaciones: ERP, CRM, Portal web, API Gateway, 5 microservicios, 3 sistemas de reportes, BI, Monitoreo.',
            'deliverables'            => "• Arquitectura AWS documentada (IaC con Terraform)\n• Clúster EKS productivo\n• RDS Multi-AZ para todas las BDs\n• Pipeline CI/CD en CodePipeline\n• Runbooks de operación",
            'constraints'             => 'Zero-downtime obligatorio. Mantenimientos solo en ventana sábado 01:00-05:00 hrs.',
            'assumptions'             => 'Presupuesto AWS pre-aprobado. Equipo de networking disponible para reconfiguración de VPN.',
            'notes'                   => 'Proyecto de máxima prioridad estratégica. Revisión semanal con CEO.',
        ]);
        $this->p[$code] = $pid;

        $this->addMembers($pid, [
            ['carlos.mendez','PM'],
            ['luis.torres',  'DESARROLLADOR'],
            ['roberto.silva','ANALISTA'],
            ['pablo.herrera','STAKEHOLDER'],
        ]);

        $s1 = $this->addSprint($pid, 1, 'Assessment y Arquitectura Target',   '2025-11-01', '2025-11-28', 'CERRADO', 'Inventario de apps, análisis 6Rs, definición arquitectura AWS target.');
        $s2 = $this->addSprint($pid, 2, 'Foundation: VPC, IAM y Landing Zone','2025-12-01', '2025-12-26', 'CERRADO', 'Configurar org AWS, landing zone con Control Tower, VPC multi-AZ, IAM.');
        $s3 = $this->addSprint($pid, 3, 'EKS y Primeras 4 Apps Migradas',     '2026-01-05', '2026-01-30', 'CERRADO', 'Desplegar clúster EKS, migrar portal web, API Gateway y 2 microservicios.');
        $s4 = $this->addSprint($pid, 4, 'Bases de Datos y Apps Críticas',     '2026-02-02', '2026-02-27', 'CERRADO', 'Migrar ERP y CRM a RDS Aurora. Migrar 3 microservicios adicionales.');
        $s5 = $this->addSprint($pid, 5, 'BI, Reportes y Monitoreo',           '2026-03-02', '2026-03-27', 'ACTIVO',  'Migrar BI y sistemas de reportes. Implementar CloudWatch, Grafana y alertas.');
        $s6 = $this->addSprint($pid, 6, 'DR Multi-Región y Hardening',        '2026-03-30', '2026-04-24', 'PLANEADO','Configurar región us-east-1 como DR. Pruebas de failover. Security hardening.');

        $bi1 = $this->addBacklogItem($pid, $s1, 'Inventario completo de las 12 aplicaciones con análisis 6Rs (Retain/Retire/Rehost/Replatform/Refactor/Repurchase)', 'ALTA', 13, 'COMPLETADA', "- Ficha técnica por app\n- Análisis de dependencias\n- Estrategia de migración recomendada");
        $bi2 = $this->addBacklogItem($pid, $s2, 'Configurar AWS Landing Zone con Control Tower, SSO y baseline de seguridad', 'ALTA', 8, 'COMPLETADA', "- Control Tower activado\n- AWS SSO configurado\n- SCPs aplicadas");
        $bi3 = $this->addBacklogItem($pid, $s3, 'Desplegar clúster EKS productivo con node groups auto-scaling', 'ALTA', 13, 'COMPLETADA', "- EKS 1.29\n- Node groups: on-demand + spot\n- Karpenter para auto-scaling");
        $bi4 = $this->addBacklogItem($pid, $s5, 'Implementar observabilidad completa: métricas, logs y trazas distribuidas', 'ALTA', 8, 'EN_SPRINT', "- CloudWatch Container Insights\n- OpenTelemetry\n- Grafana dashboards\n- Alertas PagerDuty");
        $bi5 = $this->addBacklogItem($pid, $s6, 'Implementar y probar estrategia DR multi-región (RTO < 15min)', 'ALTA', 13, 'BACKLOG', "- Región secundaria: us-east-1\n- RDS Global Database\n- Route53 Health Checks\n- Runbook de failover documentado");
        $bi6 = $this->addBacklogItem($pid, null,'Capacitación al equipo de operaciones en AWS y Kubernetes', 'MEDIA', 5, 'BACKLOG', "- Taller AWS fundamentals (8h)\n- Taller Kubernetes operaciones (8h)\n- Documentación runbooks");

        // Sprint 5 tareas (ACTIVO)
        $this->addTask($s5, 'Migrar DataWarehouse BI a Redshift',                    $this->u['luis.torres'],  'COMPLETADA',  'ALTA',  '2026-03-15', 16, 18.0);
        $this->addTask($s5, 'Configurar CloudWatch Container Insights en EKS',       $this->u['luis.torres'],  'COMPLETADA',  'ALTA',  '2026-03-18', 6,  6.5);
        $this->addTask($s5, 'Desplegar Grafana + dashboards de infraestructura',     $this->u['luis.torres'],  'EN_PROGRESO', 'ALTA',  '2026-03-24', 8,  4.0);
        $this->addTask($s5, 'Migrar sistema de reportes a Lambda + S3',              $this->u['luis.torres'],  'EN_PROGRESO', 'MEDIA', '2026-03-26', 10, 3.0);
        $this->addTask($s5, 'Configurar alertas PagerDuty para incidentes críticos', $this->u['roberto.silva'],'PENDIENTE',   'ALTA',  '2026-03-27', 4,  0.0);

        $this->addMilestone($pid, 'Assessment y arquitectura target aprobados',            '2025-11-28', 1, 1, '2025-11-27 18:00:00');
        $this->addMilestone($pid, 'Landing Zone AWS operativa',                            '2025-12-26', 1, 1, '2025-12-23 15:00:00');
        $this->addMilestone($pid, 'ERP y CRM migrados a RDS sin downtime',                 '2026-02-27', 1, 1, '2026-02-25 10:00:00');
        $this->addMilestone($pid, 'Todas las apps migradas al clúster EKS',                '2026-03-27', 0, 0, null);
        $this->addMilestone($pid, 'DR multi-región certificado con prueba de failover',    '2026-04-24', 0, 0, null);
        $this->addMilestone($pid, 'Apagado definitivo del datacenter on-premise',          '2026-07-31', 0, 0, null);

        $this->addRisk($pid, 'Downtime no planificado durante ventana de migración del ERP — impacto operativo crítico', 'MEDIA', 'ALTO', 'Blue-green deployment con rollback automatizado en < 5 minutos. Prueba de migración en staging idéntico a producción.', 'CERRADO');
        $this->addRisk($pid, 'Costos AWS superiores al estimado por subestimar transferencia de datos y tráfico entre AZs', 'ALTA', 'MEDIO', 'Activar AWS Cost Anomaly Detection. Revisar arquitectura para minimizar cross-AZ traffic. Budget alerts al 80% y 90%.', 'EN_MITIGACION');
        $this->addRisk($pid, 'Incompatibilidad de versiones de dependencias al re-platformear apps en contenedores', 'MEDIA', 'MEDIO', 'Containerizar en ambiente aislado antes de migrar. Plan de rollback por app.', 'ACTIVO');
        $this->addRisk($pid, 'Equipo de networking sin experiencia en AWS VPC y Transit Gateway', 'BAJA', 'ALTO', 'Contratar consultor AWS Networking especialista por 2 sprints.', 'CERRADO');

        $this->addIncident($pid, 'Latencia anómala en ERP post-migración a RDS: queries lentos por índices no migrados correctamente', 'CRITICA', 'RESUELTA', $this->u['carlos.mendez'], $this->u['luis.torres']);
        $this->addIncident($pid, 'Pods de microservicio auth crasheando en EKS por límite de memoria mal configurado (OOMKilled)', 'ALTA', 'RESUELTA', $this->u['luis.torres'], $this->u['luis.torres']);
        $this->addIncident($pid, 'Costos AWS del mes de febrero excedieron presupuesto mensual en 32% por transferencia de datos no contemplada', 'ALTA', 'EN_REVISION', $this->u['carlos.mendez'], $this->u['roberto.silva']);
    }

    // ──────────────────────────────────────────────
    // Proyecto 4 — Motor IA de Recomendaciones
    // ──────────────────────────────────────────────
    private function project4_ia(): void
    {
        $code = 'IA-REC-2026';
        if ($this->projectExists($code)) return;

        $pid = $this->insertProject([
            'code'                    => $code,
            'name'                    => 'Motor de Recomendaciones con IA',
            'description'             => 'Desarrollo de un motor de recomendaciones basado en aprendizaje automático para personalizar la experiencia de compra de los 500K usuarios de la plataforma e-commerce, incrementando el ticket promedio en 25%.',
            'category_id'             => $this->cat['Inteligencia Artificial'] ?? 6,
            'status'                  => 'INICIACION',
            'priority'                => 'ALTA',
            'director_id'             => $this->u['pablo.herrera'],
            'sponsor_id'              => $this->u['admin'],
            'project_manager_name'    => 'Ana García Vidal',
            'developer_representative'=> 'Luis Torres Ramírez',
            'client_name'             => 'Maewallis Digital S.A.',
            'client_representative'   => 'Dir. Marketing Digital',
            'client_email'            => 'marketing@maewallis.com',
            'planned_start_date'      => '2026-07-01',
            'planned_end_date'        => '2027-04-30',
            'planned_budget'          => 410000.00,
            'actual_budget'           => 15000.00,
            'completion_percentage'   => 5,
            'objectives'              => "1. Modelo de recomendaciones colaborativas y por contenido\n2. API de recomendaciones en tiempo real (< 100ms p99)\n3. A/B testing framework\n4. Incremento del 25% en conversión cross-sell",
            'scope'                   => 'Data pipeline, entrenamiento de modelos, API de inferencia, integración con e-commerce y dashboard de métricas.',
            'deliverables'            => "• Data pipeline en Apache Airflow\n• Modelos ML (collaborative filtering + content-based)\n• API de inferencia (FastAPI)\n• Dashboard de métricas de negocio",
            'identified_risks'        => "• Calidad y volumen insuficiente de datos históricos\n• Cold start para nuevos usuarios/productos\n• Latencia del modelo en producción",
            'constraints'             => 'Privacidad de datos (LFPDPPP). No almacenar PII fuera de México.',
            'assumptions'             => 'Acceso al histórico de compras de 3 años. Equipo de Data Engineering disponible.',
            'notes'                   => 'Fase 0 (Iniciación) actualmente en curso: definición de OKRs y arquitectura técnica.',
        ]);
        $this->p[$code] = $pid;

        $this->addMembers($pid, [
            ['ana.garcia',   'PM'],
            ['luis.torres',  'DESARROLLADOR'],
            ['roberto.silva','ANALISTA'],
            ['pablo.herrera','STAKEHOLDER'],
        ]);

        $s1 = $this->addSprint($pid, 1, 'Discovery y Arquitectura de Datos',   '2026-07-01', '2026-07-31', 'PLANEADO', 'Análisis exploratorio de datos, definición de pipeline y arquitectura ML.');
        $s2 = $this->addSprint($pid, 2, 'Data Pipeline y Feature Engineering', '2026-08-03', '2026-08-28', 'PLANEADO', 'Construir pipeline ETL, feature store y dataset de entrenamiento.');

        $bi1 = $this->addBacklogItem($pid, $s1, 'Como científico de datos quiero acceder al historial de compras de 3 años para el análisis exploratorio', 'ALTA', 8, 'BACKLOG', "- Acceso a DWH\n- Notebook de EDA\n- Reporte de calidad de datos");
        $bi2 = $this->addBacklogItem($pid, $s1, 'Como arquitecto quiero definir la arquitectura ML completa (data → modelo → API → monitoreo)', 'ALTA', 13, 'BACKLOG', "- Diagrama de arquitectura\n- ADRs documentados\n- Tech stack aprobado");
        $bi3 = $this->addBacklogItem($pid, $s2, 'Como ingeniero de datos quiero un pipeline Airflow que actualice el feature store diariamente', 'ALTA', 13, 'BACKLOG', "- DAG de ingestión\n- Feature store en Redis\n- SLA: completar en < 2h");
        $bi4 = $this->addBacklogItem($pid, null,'Como product manager quiero un framework de A/B testing para comparar algoritmos de recomendación', 'MEDIA', 8, 'BACKLOG', "- Asignación determinista por user_id\n- Dashboard de resultados\n- Significancia estadística automática");

        $this->addTask($s1, 'Revisión bibliográfica: SOTA en recommendation systems 2024-2025', $this->u['roberto.silva'],'PENDIENTE','MEDIA','2026-07-10', 8,  0.0);
        $this->addTask($s1, 'Análisis exploratorio de datos (EDA) en Jupyter',                  $this->u['luis.torres'],  'PENDIENTE','ALTA', '2026-07-18', 16, 0.0);
        $this->addTask($s1, 'Definir métricas de negocio y técnicas (CTR, NDCG, MRR)',          $this->u['roberto.silva'],'PENDIENTE','ALTA', '2026-07-15', 6,  0.0);
        $this->addTask($s1, 'Propuesta de arquitectura ML + revisión con stakeholders',          $this->u['luis.torres'],  'PENDIENTE','ALTA', '2026-07-25', 10, 0.0);

        $this->addMilestone($pid, 'Kick-off y OKRs aprobados por dirección',   '2026-06-30', 0, 0, null);
        $this->addMilestone($pid, 'Arquitectura ML aprobada',                   '2026-07-31', 0, 0, null);
        $this->addMilestone($pid, 'Primer modelo baseline en producción',        '2026-10-31', 0, 0, null);
        $this->addMilestone($pid, 'A/B test con 50K usuarios — resultados',     '2027-01-31', 0, 0, null);
        $this->addMilestone($pid, 'Roll-out completo a 500K usuarios',          '2027-04-30', 0, 0, null);

        $this->addRisk($pid, 'Datos históricos insuficientes o con baja calidad (muchos nulls, sesgo de popularidad)', 'ALTA', 'ALTO', 'EDA exhaustivo antes de iniciar modelado. Si calidad < umbral, definir estrategia de cold start con reglas de negocio.', 'ACTIVO');
        $this->addRisk($pid, 'Latencia del modelo de inferencia superior a 100ms p99 en producción', 'MEDIA', 'ALTO', 'Usar ONNX Runtime para inferencia. Cache de recomendaciones pre-computadas para top 80% de usuarios activos.', 'ACTIVO');
        $this->addRisk($pid, 'Rotación del talento especializado en ML/Data Science durante el proyecto', 'MEDIA', 'MEDIO', 'Documentar todos los experimentos en MLflow. Pair programming entre ingenieros para transferencia de conocimiento.', 'ACTIVO');
    }

    // ──────────────────────────────────────────────
    // Proyecto 5 — Portal de KPIs Ejecutivos
    // ──────────────────────────────────────────────
    private function project5_kpis(): void
    {
        $code = 'KPI-EXEC-25';
        if ($this->projectExists($code)) return;

        $pid = $this->insertProject([
            'code'                    => $code,
            'name'                    => 'Portal de KPIs Ejecutivos',
            'description'             => 'Portal web de Business Intelligence para el comité directivo con dashboards en tiempo real de ventas, operaciones, finanzas y capital humano. Integra 6 fuentes de datos y genera reportes ejecutivos automáticos.',
            'category_id'             => $this->cat['Desarrollo Web'] ?? 1,
            'status'                  => 'MONITOREO',
            'priority'                => 'MEDIA',
            'director_id'             => $this->u['sofia.reyes'],
            'sponsor_id'              => $this->u['admin'],
            'project_manager_name'    => 'Ana García Vidal',
            'developer_representative'=> 'Diana Castro Herrera',
            'client_name'             => 'Comité Directivo Maewallis',
            'client_representative'   => 'CEO',
            'client_email'            => 'ceo@maewallis.com',
            'planned_start_date'      => '2025-09-01',
            'planned_end_date'        => '2026-06-15',
            'actual_start_date'       => '2025-09-01',
            'planned_budget'          => 160000.00,
            'actual_budget'           => 138000.00,
            'completion_percentage'   => 82,
            'objectives'              => "1. Dashboard ejecutivo con 40+ KPIs en tiempo real\n2. Integrar 6 fuentes de datos (ERP, CRM, RRHH, etc.)\n3. Reportes ejecutivos PDF automáticos (lunes 8am)\n4. Mobile-first para acceso desde tablet",
            'scope'                   => 'Portal web, conectores ETL, capa de datos, dashboards interactivos y sistema de alertas por email.',
            'deliverables'            => "• Portal web React + Recharts\n• 6 conectores ETL\n• 8 dashboards temáticos\n• Sistema de alertas\n• Reporte ejecutivo automático semanal",
            'constraints'             => 'Solo accesible en red corporativa (VPN). SSO con Azure AD.',
            'notes'                   => 'En fase de monitoreo. Pendiente: ajustes de desempeño en dashboard de RRHH y reporte semanal automático.',
        ]);
        $this->p[$code] = $pid;

        $this->addMembers($pid, [
            ['ana.garcia',   'PM'],
            ['diana.castro', 'DESARROLLADOR'],
            ['roberto.silva','ANALISTA'],
            ['sofia.reyes',  'STAKEHOLDER'],
        ]);

        $s1 = $this->addSprint($pid, 1, 'Arquitectura y Conectores Base',      '2025-09-01', '2025-09-26', 'CERRADO', 'Setup infraestructura, 2 primeros conectores ETL y autenticación SSO.');
        $s2 = $this->addSprint($pid, 2, 'Dashboards de Ventas y Finanzas',     '2025-09-29', '2025-10-24', 'CERRADO', 'Implementar dashboards de ventas (15 KPIs) y finanzas (12 KPIs).');
        $s3 = $this->addSprint($pid, 3, 'Dashboards de Operaciones y RRHH',    '2025-10-27', '2025-11-21', 'CERRADO', 'Dashboards de operaciones, logística, RRHH y nómina.');
        $s4 = $this->addSprint($pid, 4, 'Alertas, Reportes y Optimización',    '2025-11-24', '2025-12-19', 'CERRADO', 'Sistema de alertas, reporte PDF semanal automático y optimización de queries.');
        $s5 = $this->addSprint($pid, 5, 'Ajustes Post-Lanzamiento',            '2026-01-05', '2026-01-30', 'CERRADO', 'Correcciones reportadas por usuarios ejecutivos en primer mes de uso.');
        $s6 = $this->addSprint($pid, 6, 'Mejoras y Dashboard CX',              '2026-02-02', '2026-04-30', 'CERRADO', 'Nuevo dashboard de CX/NPS, mejoras de UX y corrección de discrepancias en datos.');
        $s7 = $this->addSprint($pid, 7, 'Optimización Final y Documentación',  '2026-05-04', '2026-06-15', 'ACTIVO',  'Optimizar dashboard RRHH, automatizar reporte semanal y entregar documentación final.');

        $bi1 = $this->addBacklogItem($pid, $s1, 'Como desarrollador quiero conectores ETL robustos para ERP y CRM que actualicen datos cada 15 minutos', 'ALTA', 8, 'COMPLETADA', "- Conector SAP B1\n- Conector Salesforce\n- Manejo de errores y retry\n- Log de ejecuciones");
        $bi2 = $this->addBacklogItem($pid, $s2, 'Como director de ventas quiero ver mis KPIs de ventas en tiempo real con drill-down por región', 'ALTA', 13, 'COMPLETADA', "- Ventas del día vs meta\n- Embudo de conversión\n- Mapa calor por región\n- Drill-down por vendedor");
        $bi3 = $this->addBacklogItem($pid, $s4, 'Como asistente ejecutivo quiero recibir el reporte semanal en PDF automáticamente cada lunes a las 8am', 'MEDIA', 5, 'COMPLETADA', "- PDF generado con Puppeteer\n- Enviado por email\n- Incluye comparativa semana anterior");
        $bi4 = $this->addBacklogItem($pid, $s7, 'Como director de RRHH quiero que el dashboard de nómina cargue en menos de 3 segundos', 'ALTA', 8, 'EN_SPRINT', "- Query de nómina optimizado (actualmente 12s)\n- Caché de datos con Redis\n- Indicadores de carga");
        $bi5 = $this->addBacklogItem($pid, $s7, 'Como administrador quiero documentación técnica completa para el equipo de soporte', 'MEDIA', 5, 'EN_SPRINT', "- Manual de operaciones\n- Guía de usuario ejecutivo\n- Runbook de incidentes");

        // Sprint 7 tareas (ACTIVO)
        $this->addTask($s7, 'Optimizar query nómina RRHH (de 12s a < 3s)',             $this->u['diana.castro'], 'EN_PROGRESO','ALTA',  '2026-05-20', 8,  5.0);
        $this->addTask($s7, 'Implementar caché Redis para dashboard RRHH',             $this->u['diana.castro'], 'PENDIENTE',  'ALTA',  '2026-05-25', 4,  0.0);
        $this->addTask($s7, 'Automatizar reporte PDF semanal (cron job AWS Lambda)',   $this->u['diana.castro'], 'EN_PROGRESO','MEDIA', '2026-05-28', 6,  3.0);
        $this->addTask($s7, 'Manual de usuario para directivos (Notion)',              $this->u['roberto.silva'],'EN_PROGRESO','MEDIA', '2026-06-05', 8,  4.0);
        $this->addTask($s7, 'Documentación técnica de arquitectura y conectores',     $this->u['roberto.silva'],'PENDIENTE',  'BAJA',  '2026-06-10', 6,  0.0);
        $this->addTask($s7, 'Pruebas de aceptación con 5 directivos (UAT final)',     $this->u['maria.lopez'],  'PENDIENTE',  'ALTA',  '2026-06-12', 4,  0.0);

        $this->addMilestone($pid, 'Lanzamiento a directivos (v1.0)',              '2026-01-05', 1, 1, '2026-01-05 08:00:00');
        $this->addMilestone($pid, 'Dashboard de CX/NPS en producción',            '2026-04-30', 1, 1, '2026-04-28 17:00:00');
        $this->addMilestone($pid, 'Dashboard RRHH optimizado (< 3s)',             '2026-05-25', 0, 0, null);
        $this->addMilestone($pid, 'Reporte semanal automático activado',          '2026-05-30', 0, 0, null);
        $this->addMilestone($pid, 'Entrega final y cierre del proyecto',          '2026-06-15', 0, 0, null);

        $this->addRisk($pid, 'Discrepancias entre datos del ERP y CRM generan confusión en los directivos', 'MEDIA', 'ALTO', 'Implementar capa de validación de coherencia entre fuentes. Definir fuente autoritativa por cada KPI.', 'EN_MITIGACION');
        $this->addRisk($pid, 'Dashboard de RRHH con datos de nómina podría incumplir política de privacidad interna', 'BAJA', 'ALTO', 'Implementar control de acceso por rol (RBAC). Auditoría de accesos. Aprobación del DPO.', 'MITIGADO');

        $this->addIncident($pid, 'KPI "Margen bruto del mes" muestra valor incorrecto por diferencia en criterio contable entre ERP y BI', 'ALTA', 'RESUELTA', $this->u['sofia.reyes'], $this->u['diana.castro']);
        $this->addIncident($pid, 'Dashboard de RRHH tarda 12 segundos en cargar — directivos se quejan de lentitud', 'MEDIA', 'EN_REVISION', $this->u['ana.garcia'], $this->u['diana.castro']);
    }

    // ══════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════

    private function insertProject(array $data): int
    {
        $now = date('Y-m-d H:i:s');
        $this->db->table('projects')->insert(array_merge($data, [
            'is_active'  => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]));
        return (int) $this->db->insertID();
    }

    private function projectExists(string $code): bool
    {
        return (bool) $this->db->table('projects')->where('code', $code)->get()->getRowArray();
    }

    private function addMembers(int $projectId, array $members): void
    {
        $now = date('Y-m-d H:i:s');
        foreach ($members as [$username, $role]) {
            $uid = $this->u[$username] ?? null;
            if (!$uid) continue;
            $exists = $this->db->table('project_members')
                ->where('project_id', $projectId)->where('user_id', $uid)->get()->getRowArray();
            if (!$exists) {
                $this->db->table('project_members')->insert([
                    'project_id'  => $projectId,
                    'user_id'     => $uid,
                    'role'        => $role,
                    'assigned_at' => $now,
                ]);
            }
        }
    }

    private function addSprint(int $projectId, int $number, string $name, string $start, string $end, string $status, string $goal = ''): int
    {
        $now = date('Y-m-d H:i:s');
        $this->db->table('sprints')->insert([
            'project_id' => $projectId,
            'number'     => $number,
            'name'       => $name,
            'goal'       => $goal,
            'start_date' => $start,
            'end_date'   => $end,
            'status'     => $status,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        return (int) $this->db->insertID();
    }

    private function addBacklogItem(int $projectId, ?int $sprintId, string $title, string $priority, int $points, string $status, string $criteria = ''): int
    {
        $now = date('Y-m-d H:i:s');
        $this->db->table('backlog_items')->insert([
            'project_id'          => $projectId,
            'sprint_id'           => $sprintId,
            'title'               => $title,
            'priority'            => $priority,
            'story_points'        => $points,
            'status'              => $status,
            'acceptance_criteria' => $criteria,
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);
        return (int) $this->db->insertID();
    }

    private function addTask(int $sprintId, string $title, ?int $assignedTo, string $status, string $priority, string $dueDate, int $estimated, float $logged): void
    {
        // Use a past updated_at for completed tasks so burndown works realistically
        $completedAt = ($status === 'COMPLETADA')
            ? date('Y-m-d H:i:s', strtotime($dueDate . ' -1 day'))
            : date('Y-m-d H:i:s');

        $this->db->table('tasks')->insert([
            'sprint_id'       => $sprintId,
            'title'           => $title,
            'assigned_to'     => $assignedTo,
            'status'          => $status,
            'priority'        => $priority,
            'due_date'        => $dueDate,
            'estimated_hours' => $estimated,
            'time_logged'     => $logged,
            'created_at'      => date('Y-m-d H:i:s', strtotime($dueDate . ' -7 days')),
            'updated_at'      => $completedAt,
        ]);
    }

    private function addMilestone(int $projectId, string $title, string $dueDate, int $isCompleted, int $order, ?string $completedAt): void
    {
        $now = date('Y-m-d H:i:s');
        $this->db->table('milestones')->insert([
            'project_id'   => $projectId,
            'title'        => $title,
            'due_date'     => $dueDate,
            'is_completed' => $isCompleted,
            'completed_at' => $completedAt,
            'order'        => $order,
            'created_at'   => $now,
            'updated_at'   => $now,
        ]);
    }

    private function addRisk(int $projectId, string $description, string $probability, string $impact, string $mitigation, string $status): void
    {
        $now = date('Y-m-d H:i:s');
        $this->db->table('risks')->insert([
            'project_id'      => $projectId,
            'description'     => $description,
            'probability'     => $probability,
            'impact'          => $impact,
            'mitigation_plan' => $mitigation,
            'status'          => $status,
            'created_at'      => $now,
            'updated_at'      => $now,
        ]);
    }

    private function addIncident(int $projectId, string $title, string $severity, string $status, ?int $reportedBy, ?int $assignedTo): void
    {
        $now = date('Y-m-d H:i:s');
        $this->db->table('incidents')->insert([
            'project_id'  => $projectId,
            'title'       => $title,
            'description' => $title, // usar título como descripción inicial
            'severity'    => $severity,
            'status'      => $status,
            'reported_by' => $reportedBy,
            'assigned_to' => $assignedTo,
            'created_at'  => $now,
            'updated_at'  => $now,
        ]);
    }
}
