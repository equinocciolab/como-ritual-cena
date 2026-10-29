/**
 * como.ritual · Reservas de cenas
 * Recibe el formulario de la landing y escribe una fila por reserva en esta hoja.
 *
 * Pasos de instalación: ver README.md (carpeta raíz).
 */

var SHEET_NAME = 'Reservas';
var SUMMARY_NAME = 'Resumen';
var CAPACITY = 11;
var NOTIFY_BY_EMAIL = true; // avisa al correo de la cuenta dueña de la hoja

var HEADERS = [
  'Fecha de registro', 'Cena', 'Nombre', 'WhatsApp', 'Personas',
  'Comensales y restricciones', 'Total (COP)', 'Abono 60% (COP)', 'Saldo (COP)',
  'Cómo se enteró', 'Estado', 'Abono recibido', 'Notas'
];
var STATES = ['Interesada', 'Abonó', 'Confirmada', 'Lista de espera', 'Cancelada'];

/** Ejecuta esta función UNA vez desde el editor para preparar la hoja. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.clear();
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#1b4a25').setFontColor('#fbf0c8');
  sh.setFrozenRows(1);

  var stateCol = HEADERS.indexOf('Estado') + 1;
  var paidCol = HEADERS.indexOf('Abono recibido') + 1;
  sh.getRange(2, stateCol, 500, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATES, true).build());
  sh.getRange(2, paidCol, 500, 1).insertCheckboxes();

  var rules = [
    rule_('Confirmada', '#c9e7cf'), rule_('Abonó', '#fbe7a6'),
    rule_('Interesada', '#ffffff'), rule_('Lista de espera', '#e3d6f0'), rule_('Cancelada', '#f4c7c3')
  ];
  var colLetter = String.fromCharCode(64 + stateCol);
  var rng = sh.getRange(2, 1, 500, HEADERS.length);
  sh.setConditionalFormatRules(rules.map(function (r) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$' + colLetter + '2="' + r.label + '"')
      .setBackground(r.color).setRanges([rng]).build();
  }));
  sh.setColumnWidths(1, HEADERS.length, 130);
  sh.setColumnWidth(6, 360);
  sh.setColumnWidth(3, 180);

  buildSummary_(ss);
}

/** Reconstruye solo la pestaña Resumen (no toca las reservas). Útil si las fórmulas muestran #ERROR!. */
function arreglarResumen() { buildSummary_(SpreadsheetApp.getActiveSpreadsheet()); }

/** Escribe el Resumen probando coma y punto y coma, según la configuración regional de la hoja. */
function buildSummary_(ss) {
  var rs = ss.getSheetByName(SUMMARY_NAME) || ss.insertSheet(SUMMARY_NAME);
  var stateCol = String.fromCharCode(64 + HEADERS.indexOf('Estado') + 1);
  var personasCol = String.fromCharCode(64 + HEADERS.indexOf('Personas') + 1);
  var st = "Reservas!$" + stateCol + ":$" + stateCol;
  var pe = "Reservas!$" + personasCol + ":$" + personasCol;
  var seps = [',', ';'];
  for (var i = 0; i < seps.length; i++) {
    var x = seps[i];
    function sumif(label) { return '=SUMIF(' + st + x + '"' + label + '"' + x + pe + ')'; }
    rs.clear();
    rs.getRange('A1:B7').setValues([
      ['Cupos totales', CAPACITY],
      ['Confirmados (abonaron)', sumif('Confirmada')],
      ['Con abono sin confirmar', sumif('Abonó')],
      ['Interesadas (sin abono)', sumif('Interesada')],
      ['Lista de espera', sumif('Lista de espera')],
      ['Cupos libres', '=B1-B2-B3'],
      ['Abonos por cobrar (COP)', '=SUMIFS(Reservas!$H:$H' + x + st + x + '"Interesada")']
    ]);
    SpreadsheetApp.flush();
    if (rs.getRange('B2:B7').getDisplayValues().join(' ').indexOf('#') < 0) break;
  }
  rs.getRange('A1:A7').setFontWeight('bold');
  rs.setColumnWidth(1, 240);
}

function rule_(label, color) { return { label: label, color: color }; }

/** Recibe el envío del formulario. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents);
    if (d.web) return json_({ ok: true }); // campo trampa

    var guests = (d.comensales || []).slice(0, 12).map(function (g, i) {
      return (i + 1) + '. ' + clean_(g.nombre, 80) + ' — ' + clean_(g.restricciones, 300);
    }).join('\n');

    var n = Math.max(1, Math.min(12, parseInt(d.personas, 10) || 1));
    var price = 170000;
    var total = price * n;
    var abono = Math.round(total * 0.6);

    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var row = [
      new Date(), clean_(d.cena || '2026-11-14', 12), clean_(d.nombre, 80), phone_(d.whatsapp), n,
      guests, total, abono, total - abono,
      clean_(d.fuente, 40), 'Interesada', false, ''
    ];
    sh.appendRow(row);
    // WhatsApp como texto para no perder el + ni ceros
    sh.getRange(sh.getLastRow(), 4).setNumberFormat('@').setValue(phone_(d.whatsapp));

    if (NOTIFY_BY_EMAIL) {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
        'Nueva reserva: ' + clean_(d.nombre, 80) + ' (' + n + ')',
        'WhatsApp: ' + phone_(d.whatsapp) + '\nPersonas: ' + n + '\n\n' + guests);
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return json_({ ok: true, service: 'como.ritual reservas' }); }

/** Limpia texto y evita fórmulas inyectadas (=, +, -, @). */
function clean_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Teléfono: solo dígitos, espacios, + y paréntesis. */
function phone_(v) {
  return String(v == null ? '' : v).replace(/[^0-9+() \-]/g, '').trim().slice(0, 24);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
