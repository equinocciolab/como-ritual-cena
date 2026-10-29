# como.ritual · Landing y reservas de la cena

Landing estática (`index.html`) con formulario que guarda cada reserva en una Google Sheet de la cuenta de como.ritual, mediante un Google Apps Script.

## Archivos

- `index.html`: la landing con el formulario (se publica con GitHub Pages).
- `apps-script/Code.gs`: el script que recibe el formulario y escribe en la hoja.
- `whatsapp-plantillas.md`: respuestas rápidas para WhatsApp Business.

## Conectar el formulario a la hoja (unos 10 minutos)

1. Entra a Google Drive con la cuenta de como.ritual y crea una hoja nueva: **Reservas como.ritual**.
2. En la hoja, abre **Extensiones → Apps Script**. Borra lo que haya y pega todo el contenido de `apps-script/Code.gs`. Guarda.
3. En el editor, elige la función `setup` y pulsa **Ejecutar**. Acepta los permisos. Esto crea las pestañas **Reservas** (con estados y casillas de abono) y **Resumen** (cupos libres).
4. Pulsa **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**. Implementa y copia la URL que termina en `/exec`.
5. En `index.html`, busca `var SCRIPT_URL = "";` y pega la URL entre las comillas. Guarda y sube el cambio a GitHub.
6. Prueba enviando el formulario con datos de ejemplo. Debe aparecer una fila nueva en la pestaña **Reservas** y llegar un correo de aviso. Borra la fila de prueba.

Si cambias el código del script más adelante, hay que crear una **nueva versión** de la implementación para que los cambios se apliquen.

## Publicar en GitHub Pages

1. En el repositorio: **Settings → Pages → Deploy from a branch → main / (root)**.
2. La landing queda en `https://<usuario>.github.io/<repositorio>/`.

## Para editar rápido

- Fecha, hora y valores: en `index.html` (textos de la sección "Brujas, Chamanes y Maestros") y las constantes `PRICE` y `DEPOSIT_PCT` al final del archivo. El script (`Code.gs`) recalcula los totales por su cuenta, así que ajusta también `price` allí.
- Estados de la hoja: lista `STATES` en `Code.gs` (vuelve a ejecutar `setup` solo si empiezas de cero, porque limpia la pestaña Reservas).
