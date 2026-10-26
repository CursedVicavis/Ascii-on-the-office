/* ==========================================================================
   ASCI ON THE OFFICE - Boss Key (Modo Pánico / Disfraz de Trabajo)
   ========================================================================== */

window.BossKey = (function () {
  let active = false;
  let mode = 1; // 1 = Excel, 2 = Server Logs, 3 = SQL ERP
  let logCounter = 42;
  let originalTitle = document.title;

  const fakeLogLines = [
    '[INFO]  2026-10-26 10:41:09  org.corp.audit.BatchProcessor - Validando asientos contables lote #8841...',
    '[OK]    2026-10-26 10:41:11  org.corp.db.ConnectionPool   - Latencia replica primaria: 1.4ms (TLSv1.3)',
    '[INFO]  2026-10-26 10:41:14  org.corp.erp.TaxEngine       - Conciliacion IVA/ISR completada sin discrepancias',
    '[WARN]  2026-10-26 10:41:18  org.corp.cache.RedisCluster  - Eviccion de claves temporales: 128 entradas limpiadas',
    '[INFO]  2026-10-26 10:41:22  org.corp.k8s.IngressWorker   - Healthcheck pods [prod-eu-west]: 16/16 READY',
    '[INFO]  2026-10-26 10:41:25  org.corp.sec.AuthFilter      - Token JWT renovado para sesion corporativa #409',
    '[OK]    2026-10-26 10:41:29  org.corp.report.Exporter     - Generando anexo presupuestario Q4_Consolidado.csv'
  ];

  function renderExcel() {
    document.title = 'Presupuesto_Operativo_Q4_FINAL_v3.xlsx - Calc';
    return `<div class="boss-excel">ARCHIVO   EDICION   VER   INSERTAR   FORMATO   DATOS   AUDITORIA   VENTANA   AYUDA
+----------------------------------------------------------------------------------------------------------+
|  C14  |  fx  =SUMA(C4:C13)-DESVEST.M(D4:D13)*INDICE(TASA_IMPOSITIVA_2026;1;2)                            |
+----+------------------------------+---------------+---------------+---------------+---------------+------+
|    |              A               |       B       |       C       |       D       |       E       |  F   |
+----+------------------------------+---------------+---------------+---------------+---------------+------+
|  1 | CONSOLIDADO FINANCIERO Q4    | PRESUPUESTO   | EJECUTADO     | DESVIACION    | PROYECCION    | EST  |
|  2 | Departamento / Centro Costo  | (USD Miles)   | (USD Miles)   | (%)           | CIERRE ANUAL  | AUD  |
+----+------------------------------+---------------+---------------+---------------+---------------+------+
|  3 | 101 - Infraestructura Cloud  |     $ 142.500 |     $ 138.920 |        -2.51% |     $ 555.680 | [OK] |
|  4 | 102 - Licencias & SaaS       |      $ 64.200 |      $ 64.180 |        -0.03% |     $ 256.720 | [OK] |
|  5 | 104 - Operaciones Logistica  |     $ 218.000 |     $ 221.450 |        +1.58% |     $ 885.800 | [OK] |
|  6 | 108 - Desarrollo I+D         |     $ 310.000 |     $ 298.400 |        -3.74% |   $ 1.193.600 | [OK] |
|  7 | 112 - Soporte Tecnico N2/N3  |      $ 89.400 |      $ 87.110 |        -2.56% |     $ 348.440 | [OK] |
|  8 | 115 - Ciberseguridad & SOC   |      $ 76.000 |      $ 75.890 |        -0.14% |     $ 303.560 | [OK] |
|  9 | 119 - Administracion Central |      $ 95.300 |      $ 92.040 |        -3.42% |     $ 368.160 | [OK] |
| 10 | 124 - Capacitacion Interna   |      $ 28.500 |      $ 24.900 |       -12.63% |      $ 99.600 | [OK] |
| 11 | 130 - Amortizacion Equipos   |      $ 54.000 |      $ 54.000 |         0.00% |     $ 216.000 | [OK] |
| 12 | 135 - Provision Contingencia |      $ 40.000 |      $ 18.200 |       -54.50% |      $ 72.800 | [OK] |
| 13 | 140 - Servicios Auditoria    |      $ 32.100 |      $ 31.850 |        -0.78% |     $ 127.400 | [OK] |
+----+------------------------------+---------------+---------------+---------------+---------------+------+
| 14 | TOTAL CONSOLIDADO OPERATIVO  |   $ 1.150.000 |   $ 1.106.940 |        -3.74% |   $ 4.427.760 | [OK] |
| 15 | EBITDA Estimado (Post-Imp.)  |     $ 322.000 |     $ 341.890 |        +6.18% |   $ 1.367.560 | [OK] |
+----+------------------------------+---------------+---------------+---------------+---------------+------+
| Hojas: [Resumen_Ejecutivo] [ Flujo_Caja_Q4 ] [ Anexo_Impuestos ] [ Amortizaciones ]                      |
+----------------------------------------------------------------------------------------------------------+
| LISTO  |  CALCULO: AUTOMATICO  |  SUMA = $ 1.106.940  |  [1:Excel  2:Logs  3:SQL  |  F9/TAB/ESC: Volver] |
+----------------------------------------------------------------------------------------------------------+</div>`;
  }

  function renderServerLogs() {
    document.title = 'ssh prod-cluster-01.corp.internal - bash (80x24)';
    const dynamicLines = [];
    for (let i = 0; i < 14; i++) {
      dynamicLines.push(fakeLogLines[(logCounter + i) % fakeLogLines.length]);
    }
    return `<div class="boss-terminal">usuario@prod-cluster-01:~/deploy/erp-backend$ kubectl get pods -n finance-prod -o wide
NAME                                  READY   STATUS    RESTARTS   AGE     IP             NODE
erp-api-gateway-7d98c4b89-2k9x1       2/2     Running   0          14d     10.244.1.104   node-prod-01
erp-api-gateway-7d98c4b89-8m4p2       2/2     Running   0          14d     10.244.2.88    node-prod-02
ledger-worker-66b9f8c4d-9x2v1         1/1     Running   0          9d      10.244.1.192   node-prod-01
PostgreSQL-ha-replica-0               1/1     Running   0          41d     10.244.3.15    node-prod-03
redis-sentinel-cluster-1              1/1     Running   0          41d     10.244.2.41    node-prod-02

usuario@prod-cluster-01:~/deploy/erp-backend$ tail -f /var/log/corp-erp/audit-pipeline.log
${dynamicLines.join('\n')}
[SYNC]  Bloque #${10400 + logCounter} verificado (SHA256: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08)
_
------------------------------------------------------------------------------------------------------------
[MODO DISFRAZ ACTIVO] Presiona cualquier tecla para simular actividad de consola | [1/2/3] Cambiar | [F9/TAB] Volver</div>`;
  }

  function renderSql() {
    document.title = 'pgAdmin / DBeaver - Consulta_Conciliacion_Anual.sql';
    return `<div class="boss-sql">-- =================================================================================
-- AUDITORIA DE CIERRE TRIMESTRAL - CONCILIACION DE LIBRO MAYOR Y SUBCUENTas
-- Base de Datos: CORP_FINANCE_PROD (PostgreSQL 16.4) | Estado: CONECTADO
-- =================================================================================

WITH resumen_centro_costo AS (
    SELECT 
        cc.codigo_departamento,
        cc.nombre_unidad,
        SUM(asiento.debe_usd) AS total_debe,
        SUM(asiento.haber_usd) AS total_haber,
        ROUND(AVG(asiento.tipo_cambio_aplicado), 4) AS tc_promedio
    FROM contabilidad.asientos_diario asiento
    INNER JOIN catalogo.centros_costo cc ON cc.id = asiento.centro_costo_id
    WHERE asiento.fecha_contable BETWEEN '2026-10-01' AND '2026-12-31'
      AND asiento.estado_auditoria = 'APROBADO'
    GROUP BY cc.codigo_departamento, cc.nombre_unidad
)
SELECT 
    codigo_departamento AS "Cod. Unidad",
    nombre_unidad       AS "Unidad de Negocio",
    total_debe          AS "Total Debe ($)",
    total_haber         AS "Total Haber ($)",
    (total_debe - total_haber) AS "Saldo Neto ($)",
    CASE WHEN ABS(total_debe - total_haber) < 0.01 THEN 'CUADRADO' ELSE 'REVISAR' END AS "Estado"
FROM resumen_centro_costo
ORDER BY codigo_departamento ASC;

+-------------+-----------------------------+----------------+----------------+----------------+----------+
| Cod. Unidad | Unidad de Negocio           | Total Debe ($) | Total Haber($) | Saldo Neto ($) | Estado   |
+-------------+-----------------------------+----------------+----------------+----------------+----------+
| FIN-001     | Tesoreria Corporativa       |   1,420,890.00 |   1,420,890.00 |           0.00 | CUADRADO |
| OPS-004     | Cadena de Suministro        |     894,120.50 |     894,120.50 |           0.00 | CUADRADO |
| TEC-009     | Sistemas & Arquitectura     |     612,400.00 |     612,400.00 |           0.00 | CUADRADO |
| RRH-012     | Capital Humano & Nominas    |     530,110.25 |     530,110.25 |           0.00 | CUADRADO |
+-------------+-----------------------------+----------------+----------------+----------------+----------+
4 filas obtenidas en 18 ms.  |  [1:Excel  2:Logs  3:SQL  |  Presiona F9 o TAB para volver al juego]</div>`;
  }

  function render() {
    const el = document.getElementById('boss-overlay');
    if (!el) return;
    if (!active) {
      el.classList.remove('active');
      el.innerHTML = '';
      document.title = originalTitle;
      return;
    }
    el.classList.add('active');
    if (mode === 1) el.innerHTML = renderExcel();
    else if (mode === 2) el.innerHTML = renderServerLogs();
    else el.innerHTML = renderSql();
  }

  return {
    isActive() {
      return active;
    },
    toggle() {
      active = !active;
      window.AsciiAudio.setBossMute(active);
      render();
      return active;
    },
    handleKey(e) {
      if (!active) return false;
      if (e.key === 'F9' || e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
        this.toggle();
        return true;
      }
      if (e.key === '1') { mode = 1; render(); return true; }
      if (e.key === '2') { mode = 2; render(); return true; }
      if (e.key === '3') { mode = 3; render(); return true; }
      // Cualquier otra tecla simula trabajo activo en los logs
      logCounter++;
      render();
      return true;
    }
  };
})();
