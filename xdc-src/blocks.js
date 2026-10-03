/* =========================================================================
 * Webxdc Creator Studio — blocks.js
 * Visual block system for no-code users.
 * Expanded palette: game, advanced math, UI, webxdc, advanced.
 * Model persisted in project.blocks.model.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  /* ------------------------------------------------------------------ *
   * Block definitions
   * param types: text | number | element | var | value | select | expr
   * ------------------------------------------------------------------ */
  const OPS = [
    { v: '==', es: '= (igual)', en: '== (equal)' },
    { v: '!=', es: '≠ (distinto)', en: '!= (not equal)' },
    { v: '>', es: '> (mayor)', en: '> (greater)' },
    { v: '<', es: '< (menor)', en: '< (less)' },
    { v: '>=', es: '≥ (mayor o igual)', en: '>= (greater or equal)' },
    { v: '<=', es: '≤ (menor o igual)', en: '<= (less or equal)' }
  ];

  const TAG_OPTIONS = [
    { v: 'button', es: 'Botón', en: 'Button' },
    { v: 'h1', es: 'Título grande', en: 'Big heading' },
    { v: 'h2', es: 'Título', en: 'Heading' },
    { v: 'p', es: 'Párrafo', en: 'Paragraph' },
    { v: 'div', es: 'Contenedor (caja)', en: 'Container (box)' },
    { v: 'span', es: 'Texto en línea', en: 'Inline text' },
    { v: 'ul', es: 'Lista', en: 'List' }
  ];
  const ANIM_OPTIONS = [
    { v: 'wcs-pop', es: 'Aparecer con pop', en: 'Pop in' },
    { v: 'wcs-fade', es: 'Desvanecer', en: 'Fade' },
    { v: 'wcs-shake', es: 'Sacudir', en: 'Shake' },
    { v: 'wcs-spin', es: 'Girar', en: 'Spin' },
    { v: 'wcs-bounce', es: 'Botar', en: 'Bounce' }
  ];
  const WAVE_OPTIONS = [
    { v: 'square', es: 'Cuadrada (8-bit)', en: 'Square (8-bit)' },
    { v: 'sine', es: 'Suave (seno)', en: 'Smooth (sine)' },
    { v: 'triangle', es: 'Triángulo', en: 'Triangle' },
    { v: 'sawtooth', es: 'Sierra', en: 'Sawtooth' }
  ];
  const ARITH_OPTIONS = [
    { v: '+', es: '+ (sumar)', en: '+ (add)' },
    { v: '-', es: '− (restar)', en: '− (subtract)' },
    { v: '*', es: '× (multiplicar)', en: '× (multiply)' },
    { v: '/', es: '÷ (dividir)', en: '÷ (divide)' },
    { v: '%', es: 'resto (módulo)', en: 'remainder (modulo)' }
  ];

  const DEFS = {
    /* ---- Basics ---- */
    set_text: {
      cat: 'basics', container: false,
      es: { name: 'Fijar texto', desc: 'Cambia el texto visible de un elemento de la página.' },
      en: { name: 'Set text', desc: 'Changes the visible text of an element on the page.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'value', type: 'value', es: 'Nuevo texto', en: 'New text' }
      ],
      example: 'set_text #output ← "¡Hola!"'
    },
    set_html: {
      cat: 'basics', container: false,
      es: { name: 'Fijar HTML', desc: 'Reemplaza el contenido HTML de un elemento. Cuidado: solo usa contenido confiable (p. ej. texto plano de variables).' },
      en: { name: 'Set HTML', desc: 'Replaces the HTML content of an element. Careful: only use trusted content (e.g. plain variables).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'value', type: 'value', es: 'Nuevo HTML', en: 'New HTML' }
      ]
    },
    set_style: {
      cat: 'basics', container: false,
      es: { name: 'Cambiar estilo', desc: 'Modifica una propiedad CSS de un elemento (p. ej. background-color, font-size).' },
      en: { name: 'Set style', desc: 'Changes a CSS property of an element (e.g. background-color, font-size).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'prop', type: 'text', es: 'Propiedad CSS', en: 'CSS property', placeholder: 'background-color' },
        { key: 'val', type: 'text', es: 'Valor', en: 'Value', placeholder: 'blue' }
      ]
    },
    show: {
      cat: 'basics', container: false,
      es: { name: 'Mostrar elemento', desc: 'Hace visible de nuevo un elemento ocultado con "Ocultar".' },
      en: { name: 'Show element', desc: 'Makes an element hidden with "Hide" visible again.' },
      params: [{ key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' }]
    },
    hide: {
      cat: 'basics', container: false,
      es: { name: 'Ocultar elemento', desc: 'Esconde un elemento de la página (se puede volver a mostrar).' },
      en: { name: 'Hide element', desc: 'Hides an element on the page (can be shown again).' },
      params: [{ key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' }]
    },
    toast: {
      cat: 'basics', container: false, helper: 'toast',
      es: { name: 'Mostrar aviso', desc: 'Muestra un mensaje temporal en la parte baja de la pantalla.' },
      en: { name: 'Show toast', desc: 'Shows a temporary message at the bottom of the screen.' },
      params: [{ key: 'value', type: 'value', es: 'Mensaje', en: 'Message' }]
    },
    delay: {
      cat: 'basics', container: false, helper: 'sleep', asyncOnly: true,
      es: { name: 'Esperar', desc: 'Pausa este evento durante unos milisegundos antes del siguiente bloque.' },
      en: { name: 'Wait', desc: 'Pauses this event for some milliseconds before the next block.' },
      params: [{ key: 'ms', type: 'number', es: 'Milisegundos', en: 'Milliseconds', placeholder: '500' }]
    },
    comment: {
      cat: 'basics', container: false,
      es: { name: 'Comentario', desc: 'Anota algo en el código generado; no hace nada.' },
      en: { name: 'Comment', desc: 'Writes a note into the generated code; does nothing.' },
      params: [{ key: 'text', type: 'text', es: 'Texto', en: 'Text', placeholder: '…' }]
    },

    /* ---- Variables / logic ---- */
    set_var: {
      cat: 'logic', container: false,
      es: { name: 'Asignar variable', desc: 'Guarda un valor (texto, número, otra variable o el contenido de un input) en una variable.' },
      en: { name: 'Set variable', desc: 'Stores a value (text, number, another variable or an input value) into a variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    change_var: {
      cat: 'logic', container: false,
      es: { name: 'Sumar/restar a variable', desc: 'Suma (o resta, con número negativo) una cantidad a una variable numérica.' },
      en: { name: 'Change variable by', desc: 'Adds (or subtracts, with a negative number) an amount to a numeric variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'delta', type: 'number', es: 'Cantidad (±)', en: 'Amount (±)', placeholder: '1' }
      ]
    },
    if_var: {
      cat: 'logic', container: true,
      es: { name: 'Si… (condición)', desc: 'Ejecuta los bloques internos solo si la condición se cumple.' },
      en: { name: 'If… (condition)', desc: 'Runs the inner blocks only when the condition holds.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'op', type: 'select', options: OPS, es: 'Comparación', en: 'Comparison' },
        { key: 'value', type: 'value', es: 'Comparar con', en: 'Compare with' }
      ]
    },
    repeat: {
      cat: 'logic', container: true,
      es: { name: 'Repetir N veces', desc: 'Ejecuta los bloques internos varias veces.' },
      en: { name: 'Repeat N times', desc: 'Runs the inner blocks several times.' },
      params: [{ key: 'times', type: 'number', es: 'Veces', en: 'Times', placeholder: '3' }]
    },

    /* ---- Math ---- */
    random_var: {
      cat: 'math', container: false,
      es: { name: 'Número aleatorio', desc: 'Guarda en la variable un entero aleatorio entre un mínimo y un máximo (incluidos).' },
      en: { name: 'Random number', desc: 'Stores a random integer between min and max (inclusive) in the variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'min', type: 'number', es: 'Mínimo', en: 'Min', placeholder: '1' },
        { key: 'max', type: 'number', es: 'Máximo', en: 'Max', placeholder: '6' }
      ]
    },
    round_var: {
      cat: 'math', container: false,
      es: { name: 'Redondear variable', desc: 'Redondea al entero más cercano.' },
      en: { name: 'Round variable', desc: 'Rounds to the nearest integer.' },
      params: [{ key: 'name', type: 'var', es: 'Variable', en: 'Variable' }]
    },
    math_expr: {
      cat: 'math', container: false,
      es: { name: 'Expresión matemática', desc: 'Para usuarios avanzados: asigna una expresión JS, p. ej. total * 1.21.' },
      en: { name: 'Math expression', desc: 'For advanced users: assigns a JS expression, e.g. total * 1.21.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'expr', type: 'expr', es: 'Expresión', en: 'Expression', placeholder: 'total * 1.21' }
      ]
    },

    /* ---- UI simple ---- */
    set_input_value: {
      cat: 'ui', container: false,
      es: { name: 'Rellenar input', desc: 'Fija el valor de un campo de formulario.' },
      en: { name: 'Fill input', desc: 'Sets the value of a form field.' },
      params: [
        { key: 'id', type: 'element', es: 'Input (#id)', en: 'Input (#id)' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    add_list_item: {
      cat: 'ui', container: false, helper: 'addListItem',
      es: { name: 'Añadir a lista', desc: 'Añade un elemento <li> con texto al final de una lista <ul>/<ol>.' },
      en: { name: 'Add to list', desc: 'Appends a <li> item with text to a <ul>/<ol> list.' },
      params: [
        { key: 'id', type: 'element', es: 'Lista (#id)', en: 'List (#id)' },
        { key: 'value', type: 'value', es: 'Texto del elemento', en: 'Item text' }
      ]
    },
    clear_element: {
      cat: 'ui', container: false,
      es: { name: 'Vaciar elemento', desc: 'Elimina todo el contenido de un elemento (p. ej. limpia una lista).' },
      en: { name: 'Clear element', desc: 'Removes all content of an element (e.g. clears a list).' },
      params: [{ key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' }]
    },
    vibrate: {
      cat: 'ui', container: false,
      es: { name: 'Vibrar', desc: 'Hace vibrar el dispositivo (según lo permita la app y el ajuste del sistema).' },
      en: { name: 'Vibrate', desc: 'Vibrates the device (as allowed by the app and the system setting).' },
      params: [{ key: 'ms', type: 'number', es: 'Milisegundos', en: 'Milliseconds', placeholder: '200' }]
    },
    set_page_title: {
      cat: 'ui', container: false,
      es: { name: 'Título de la página', desc: 'Cambia el texto de la pestaña/título de la miniapp.' },
      en: { name: 'Page title', desc: 'Changes the miniapp tab/title text.' },
      params: [{ key: 'value', type: 'value', es: 'Título', en: 'Title' }]
    },

    /* ---- Page (HTML) ---- */
    create_element: {
      cat: 'html', container: false,
      es: { name: 'Crear elemento', desc: 'Añade a la página un elemento nuevo (botón, título, párrafo, caja, lista…). Opcionalmente dentro de otro elemento.' },
      en: { name: 'Create element', desc: 'Adds a new element to the page (button, heading, paragraph, box, list…). Optionally inside another element.' },
      params: [
        { key: 'tag', type: 'select', options: TAG_OPTIONS, es: 'Tipo', en: 'Type' },
        { key: 'id', type: 'element', es: 'Id (#, opcional)', en: 'Id (#, optional)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    create_image: {
      cat: 'html', container: false,
      es: { name: 'Crear imagen', desc: 'Añade una imagen del proyecto (p. ej. assets/logo.png) a la página.' },
      en: { name: 'Create image', desc: 'Adds a project image (e.g. assets/logo.png) to the page.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#, opcional)', en: 'Id (#, optional)' },
        { key: 'src', type: 'text', es: 'Archivo (ruta)', en: 'File (path)', placeholder: 'assets/imagen.png' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    remove_element: {
      cat: 'html', container: false,
      es: { name: 'Eliminar elemento', desc: 'Quita un elemento de la página.' },
      en: { name: 'Remove element', desc: 'Removes an element from the page.' },
      params: [{ key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' }]
    },
    set_attribute: {
      cat: 'html', container: false,
      es: { name: 'Fijar atributo', desc: 'Cambia un atributo HTML (p. ej. placeholder, href, alt, type).' },
      en: { name: 'Set attribute', desc: 'Changes an HTML attribute (e.g. placeholder, href, alt, type).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'attr', type: 'text', es: 'Atributo', en: 'Attribute', placeholder: 'placeholder' },
        { key: 'val', type: 'text', es: 'Valor', en: 'Value', placeholder: 'Escribe algo…' }
      ]
    },
    set_image: {
      cat: 'html', container: false,
      es: { name: 'Cambiar imagen', desc: 'Cambia el archivo que muestra un <img> de la página.' },
      en: { name: 'Change image', desc: 'Changes the file shown by an <img> on the page.' },
      params: [
        { key: 'id', type: 'element', es: 'Imagen (#id)', en: 'Image (#id)' },
        { key: 'src', type: 'text', es: 'Archivo (ruta)', en: 'File (path)', placeholder: 'assets/imagen.png' }
      ]
    },

    /* ---- Estilo (CSS) ---- */
    set_bg_color: {
      cat: 'css', container: false,
      es: { name: 'Color de fondo', desc: 'Pinta el fondo de un elemento con un color elegido.' },
      en: { name: 'Background color', desc: 'Paints an element background with a chosen color.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'color', type: 'color', def: '#4f46e5', es: 'Color', en: 'Color' }
      ]
    },
    set_text_color: {
      cat: 'css', container: false,
      es: { name: 'Color del texto', desc: 'Cambia el color del texto de un elemento.' },
      en: { name: 'Text color', desc: 'Changes the text color of an element.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'color', type: 'color', def: '#d6336c', es: 'Color', en: 'Color' }
      ]
    },
    set_font_size: {
      cat: 'css', container: false,
      es: { name: 'Tamaño de letra', desc: 'Cambia el tamaño del texto en píxeles.' },
      en: { name: 'Font size', desc: 'Changes the text size in pixels.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'px', type: 'number', es: 'Píxeles', en: 'Pixels', placeholder: '24' }
      ]
    },
    set_font_family: {
      cat: 'css', container: false,
      es: { name: 'Tipo de letra', desc: 'Cambia el tipo de letra de un elemento (redonda, con serifa, de máquina de escribir…).' },
      en: { name: 'Font family', desc: 'Changes the font family of an element (rounded, serif, typewriter…).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'family', type: 'select', options: [
          { v: 'system', es: 'Normal del sistema', en: 'System default' },
          { v: 'rounded', es: 'Redonda', en: 'Rounded' },
          { v: 'serif', es: 'Con serifa (periódico)', en: 'Serif (newspaper)' },
          { v: 'mono', es: 'De máquina de escribir', en: 'Typewriter' },
          { v: 'caps', es: 'Mayúsculas elegantes', en: 'Elegant caps' }
        ], es: 'Estilo', en: 'Style' }
      ]
    },
    set_size: {
      cat: 'css', container: false,
      es: { name: 'Tamaño del elemento', desc: 'Fija anchura y altura (p. ej. 120px, 50% o auto).' },
      en: { name: 'Element size', desc: 'Sets width and height (e.g. 120px, 50% or auto).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'w', type: 'text', es: 'Ancho', en: 'Width', placeholder: '120px' },
        { key: 'h', type: 'text', es: 'Alto', en: 'Height', placeholder: '60px' }
      ]
    },
    add_class: {
      cat: 'css', container: false,
      es: { name: 'Añadir clase', desc: 'Añade una clase CSS al elemento (útil con estilos del proyecto).' },
      en: { name: 'Add class', desc: 'Adds a CSS class to the element (useful with project styles).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'cls', type: 'text', es: 'Clase', en: 'Class', placeholder: 'destacado' }
      ]
    },
    remove_class: {
      cat: 'css', container: false,
      es: { name: 'Quitar clase', desc: 'Retira una clase CSS del elemento.' },
      en: { name: 'Remove class', desc: 'Removes a CSS class from the element.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'cls', type: 'text', es: 'Clase', en: 'Class', placeholder: 'destacado' }
      ]
    },
    toggle_class: {
      cat: 'css', container: false,
      es: { name: 'Alternar clase', desc: 'Añade la clase si no está y la quita si está (ideal para marcar/seleccionar).' },
      en: { name: 'Toggle class', desc: 'Adds the class if missing, removes it if present (great for marking/selecting).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'cls', type: 'text', es: 'Clase', en: 'Class', placeholder: 'elegido' }
      ]
    },
    animate: {
      cat: 'css', container: false,
      es: { name: 'Animar', desc: 'Aplica una animación corta: aparecer, sacudir, girar, botar…' },
      en: { name: 'Animate', desc: 'Applies a short animation: pop, shake, spin, bounce…' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'anim', type: 'select', options: ANIM_OPTIONS, es: 'Animación', en: 'Animation' }
      ]
    },

    /* ---- Listas ---- */
    list_new: {
      cat: 'lists', container: false,
      es: { name: 'Crear lista vacía', desc: 'Convierte la variable en una lista vacía (para guardar varios elementos).' },
      en: { name: 'Create empty list', desc: 'Turns the variable into an empty list (to hold several items).' },
      params: [{ key: 'name', type: 'var', es: 'Variable', en: 'Variable' }]
    },
    list_push: {
      cat: 'lists', container: false,
      es: { name: 'Añadir a la lista', desc: 'Agrega un valor al final de la lista.' },
      en: { name: 'Add to list', desc: 'Appends a value to the end of the list.' },
      params: [
        { key: 'name', type: 'var', es: 'Lista', en: 'List' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    list_get: {
      cat: 'lists', container: false,
      es: { name: 'Leer elemento de la lista', desc: 'Guarda en una variable el elemento número N (1 es el primero).' },
      en: { name: 'Read list item', desc: 'Stores item number N into a variable (1 is the first).' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'name', type: 'var', es: 'Lista', en: 'List' },
        { key: 'index', type: 'number', es: 'Número (1…)', en: 'Number (1…)', placeholder: '1' }
      ]
    },
    list_length: {
      cat: 'lists', container: false,
      es: { name: 'Longitud de la lista', desc: 'Guarda cuántos elementos tiene la lista.' },
      en: { name: 'List length', desc: 'Stores how many items the list has.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'name', type: 'var', es: 'Lista', en: 'List' }
      ]
    },
    list_remove: {
      cat: 'lists', container: false,
      es: { name: 'Quitar elemento N', desc: 'Elimina de la lista el elemento número N (1 es el primero).' },
      en: { name: 'Remove item N', desc: 'Removes item number N from the list (1 is the first).' },
      params: [
        { key: 'name', type: 'var', es: 'Lista', en: 'List' },
        { key: 'index', type: 'number', es: 'Número (1…)', en: 'Number (1…)', placeholder: '1' }
      ]
    },
    list_clear: {
      cat: 'lists', container: false,
      es: { name: 'Vaciar lista', desc: 'Deja la lista vacía.' },
      en: { name: 'Clear list', desc: 'Empties the list.' },
      params: [{ key: 'name', type: 'var', es: 'Lista', en: 'List' }]
    },
    list_contains: {
      cat: 'lists', container: false,
      es: { name: '¿Está en la lista?', desc: 'Guarda verdadero (true) o falso (false) según el valor esté o no en la lista.' },
      en: { name: 'Is it in the list?', desc: 'Stores true or false depending on whether the value is in the list.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'name', type: 'var', es: 'Lista', en: 'List' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    list_join: {
      cat: 'lists', container: false,
      es: { name: 'Lista a texto', desc: 'Une todos los elementos de la lista en un texto, separados por el texto indicado.' },
      en: { name: 'List to text', desc: 'Joins all list elements into one text, separated by the given text.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'name', type: 'var', es: 'Lista', en: 'List' },
        { key: 'sep', type: 'value', es: 'Separador', en: 'Separator', placeholder: ', ' }
      ]
    },
    list_sort: {
      cat: 'lists', container: false,
      es: { name: 'Ordenar lista', desc: 'Guarda una copia ordenada de la lista (A→Z o Z→A). La lista original no cambia.' },
      en: { name: 'Sort list', desc: 'Stores a sorted copy of the list (A→Z or Z→A). The original list is not changed.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'name', type: 'var', es: 'Lista', en: 'List' },
        { key: 'order', type: 'select', options: [
          { v: 'az', es: 'A → Z', en: 'A → Z' },
          { v: 'za', es: 'Z → A', en: 'Z → A' }
        ], es: 'Orden', en: 'Order' }
      ]
    },
    list_reverse: {
      cat: 'lists', container: false,
      es: { name: 'Invertir lista', desc: 'Guarda una copia de la lista con los elementos al revés.' },
      en: { name: 'Reverse list', desc: 'Stores a copy of the list with elements in reverse order.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'name', type: 'var', es: 'Lista', en: 'List' }
      ]
    },

    /* ---- Texto ---- */
    str_concat: {
      cat: 'text', container: false,
      es: { name: 'Unir textos', desc: 'Guarda en una variable la unión de dos textos/valores.' },
      en: { name: 'Join texts', desc: 'Stores the joining of two texts/values into a variable.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'a', type: 'value', es: 'Texto A', en: 'Text A' },
        { key: 'b', type: 'value', es: 'Texto B', en: 'Text B' }
      ]
    },
    str_length: {
      cat: 'text', container: false,
      es: { name: 'Longitud del texto', desc: 'Guarda cuántos caracteres tiene un texto.' },
      en: { name: 'Text length', desc: 'Stores how many characters a text has.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'x', type: 'value', es: 'Texto', en: 'Text' }
      ]
    },
    str_case: {
      cat: 'text', container: false,
      es: { name: 'MAYÚSCULAS / minúsculas', desc: 'Convierte un texto a mayúsculas o a minúsculas.' },
      en: { name: 'UPPERCASE / lowercase', desc: 'Converts a text to upper- or lowercase.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'x', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'mode', type: 'select', options: [
          { v: 'upper', es: 'MAYÚSCULAS', en: 'UPPERCASE' },
          { v: 'lower', es: 'minúsculas', en: 'lowercase' }
        ], es: 'Convertir a', en: 'Convert to' }
      ]
    },
    str_trim: {
      cat: 'text', container: false,
      es: { name: 'Quitar espacios', desc: 'Elimina los espacios del principio y del final de un texto.' },
      en: { name: 'Trim spaces', desc: 'Removes spaces from the start and end of a text.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'x', type: 'value', es: 'Texto', en: 'Text' }
      ]
    },
    str_replace: {
      cat: 'text', container: false,
      es: { name: 'Buscar y reemplazar', desc: 'Reemplaza en un texto todas las apariciones de otro texto.' },
      en: { name: 'Find and replace', desc: 'Replaces every occurrence of a text inside another text.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'x', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'find', type: 'value', es: 'Buscar', en: 'Find' },
        { key: 'rep', type: 'value', es: 'Reemplazar por', en: 'Replace with' }
      ]
    },
    str_part: {
      cat: 'text', container: false,
      es: { name: 'Trozo de texto', desc: 'Guarda un trozo de un texto: posición inicial y cantidad de caracteres.' },
      en: { name: 'Part of text', desc: 'Stores a part of a text: start position and number of characters.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'x', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'start', type: 'number', es: 'Posición (1…)', en: 'Position (1…)', placeholder: '1' },
        { key: 'len', type: 'number', es: 'Caracteres', en: 'Characters', placeholder: '3' }
      ]
    },

    /* ---- Math ---- */
    math_op: {
      cat: 'math', container: false,
      es: { name: 'Operación', desc: 'Guarda en una variable el resultado de operar dos valores.' },
      en: { name: 'Operation', desc: 'Stores the result of operating two values into a variable.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'a', type: 'value', es: 'Valor A', en: 'Value A' },
        { key: 'op', type: 'select', options: ARITH_OPTIONS, es: 'Operación', en: 'Operation' },
        { key: 'b', type: 'value', es: 'Valor B', en: 'Value B' }
      ]
    },
    math_clamp: {
      cat: 'math', container: false,
      es: { name: 'Limitar valor', desc: 'Guarda un número recortado para que quede entre un mínimo y un máximo (útil para vidas, puntos, barras…).' },
      en: { name: 'Clamp value', desc: 'Stores a number clipped between a minimum and a maximum (useful for lives, scores, bars…).' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'x', type: 'value', es: 'Valor', en: 'Value' },
        { key: 'mn', type: 'number', es: 'Mínimo', en: 'Minimum', placeholder: '0' },
        { key: 'mx', type: 'number', es: 'Máximo', en: 'Maximum', placeholder: '100' }
      ]
    },

    /* ---- Tiempo ---- */
    every_ms: {
      cat: 'timers', container: true,
      es: { name: 'Cada X milisegundos', desc: 'Repite los bloques internos una y otra vez, con el nombre dado (para poder detenerlo).' },
      en: { name: 'Every X milliseconds', desc: 'Repeats the inner blocks over and over, under the given name (so you can stop it).' },
      params: [
        { key: 'name', type: 'text', es: 'Nombre', en: 'Name', placeholder: 't1' },
        { key: 'ms', type: 'number', es: 'Milisegundos', en: 'Milliseconds', placeholder: '500' }
      ]
    },
    after_ms: {
      cat: 'timers', container: true,
      es: { name: 'Después de X ms', desc: 'Ejecuta los bloques internos una sola vez, transcurrido el tiempo.' },
      en: { name: 'After X ms', desc: 'Runs the inner blocks once, after the time passes.' },
      params: [{ key: 'ms', type: 'number', es: 'Milisegundos', en: 'Milliseconds', placeholder: '1000' }]
    },
    stop_timer: {
      cat: 'timers', container: false,
      es: { name: 'Detener repetición', desc: 'Detiene un «Cada X ms» por su nombre.' },
      en: { name: 'Stop repetition', desc: 'Stops an “Every X ms” by its name.' },
      params: [{ key: 'name', type: 'text', es: 'Nombre', en: 'Name', placeholder: 't1' }]
    },

    /* ---- Sonido ---- */
    play_tone: {
      cat: 'audio', container: false,
      es: { name: 'Tocar nota', desc: 'Emite un tono con el altavoz (WebAudio local). No necesita archivos.' },
      en: { name: 'Play tone', desc: 'Plays a tone on the speaker (local WebAudio). No files needed.' },
      params: [
        { key: 'freq', type: 'number', es: 'Frecuencia (Hz)', en: 'Frequency (Hz)', placeholder: '440' },
        { key: 'ms', type: 'number', es: 'Duración (ms)', en: 'Duration (ms)', placeholder: '300' },
        { key: 'wave', type: 'select', options: WAVE_OPTIONS, es: 'Forma', en: 'Wave' },
        { key: 'vol', type: 'number', es: 'Volumen (0–1)', en: 'Volume (0–1)', placeholder: '0.5' }
      ]
    },
    play_sound: {
      cat: 'audio', container: false,
      es: { name: 'Reproducir sonido', desc: 'Reproduce un archivo de audio del proyecto (crea efectos en Multimedia → Audio).' },
      en: { name: 'Play sound', desc: 'Plays an audio file from the project (create effects in Media → Audio).' },
      params: [
        { key: 'src', type: 'text', es: 'Archivo (ruta)', en: 'File (path)', placeholder: 'assets/sonido-1.wav' },
        { key: 'vol', type: 'number', es: 'Volumen (0–1)', en: 'Volume (0–1)', placeholder: '0.8' }
      ]
    },
    stop_all_sounds: {
      cat: 'audio', container: false,
      es: { name: 'Silenciar todo', desc: 'Detiene todos los sonidos en curso.' },
      en: { name: 'Silence all', desc: 'Stops every sound currently playing.' },
      params: []
    },

    /* ---- Dibujo (canvas) ---- */
    canvas_clear: {
      cat: 'canvas', container: false,
      es: { name: 'Limpiar canvas', desc: 'Borra todo lo dibujado en un <canvas>.' },
      en: { name: 'Clear canvas', desc: 'Erases everything drawn on a <canvas>.' },
      params: [{ key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' }]
    },
    canvas_rect: {
      cat: 'canvas', container: false,
      es: { name: 'Dibujar rectángulo', desc: 'Dibuja un rectángulo de color en un canvas (x, y, ancho, alto).' },
      en: { name: 'Draw rectangle', desc: 'Draws a colored rectangle on a canvas (x, y, width, height).' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'x', type: 'value', es: 'X', en: 'X' },
        { key: 'y', type: 'value', es: 'Y', en: 'Y' },
        { key: 'w', type: 'value', es: 'Ancho', en: 'Width' },
        { key: 'h', type: 'value', es: 'Alto', en: 'Height' },
        { key: 'color', type: 'color', def: '#37b24d', es: 'Color', en: 'Color' }
      ]
    },
    canvas_circle: {
      cat: 'canvas', container: false,
      es: { name: 'Dibujar círculo', desc: 'Dibuja un círculo de color (x, y del centro y radio).' },
      en: { name: 'Draw circle', desc: 'Draws a colored circle (center x, y and radius).' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'x', type: 'value', es: 'Centro X', en: 'Center X' },
        { key: 'y', type: 'value', es: 'Centro Y', en: 'Center Y' },
        { key: 'r', type: 'value', es: 'Radio', en: 'Radius' },
        { key: 'color', type: 'color', def: '#e8590c', es: 'Color', en: 'Color' }
      ]
    },
    canvas_text: {
      cat: 'canvas', container: false,
      es: { name: 'Dibujar texto', desc: 'Escribe texto de color sobre el canvas.' },
      en: { name: 'Draw text', desc: 'Writes colored text onto the canvas.' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'x', type: 'value', es: 'X', en: 'X' },
        { key: 'y', type: 'value', es: 'Y', en: 'Y' },
        { key: 'size', type: 'number', es: 'Tamaño (px)', en: 'Size (px)', placeholder: '20' },
        { key: 'color', type: 'color', def: '#1c2430', es: 'Color', en: 'Color' }
      ]
    },
    canvas_image: {
      cat: 'canvas', container: false, helper: 'wcsDrawImage', asyncOnly: true,
      es: { name: 'Dibujar imagen', desc: 'Dibuja una imagen del proyecto (sprite) en el canvas, en x, y con ancho y alto.' },
      en: { name: 'Draw image', desc: 'Draws a project image (sprite) on the canvas, at x, y with width and height.' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'src', type: 'text', es: 'Archivo (ruta)', en: 'File (path)', placeholder: 'assets/sprite.png' },
        { key: 'x', type: 'value', es: 'X', en: 'X' },
        { key: 'y', type: 'value', es: 'Y', en: 'Y' },
        { key: 'w', type: 'value', es: 'Ancho', en: 'Width' },
        { key: 'h', type: 'value', es: 'Alto', en: 'Height' }
      ]
    },
    canvas_size: {
      cat: 'canvas', container: false,
      es: { name: 'Tamaño del canvas', desc: 'Guarda el ancho o el alto del canvas en píxeles (útil para centrar cosas o detectar bordes).' },
      en: { name: 'Canvas size', desc: 'Stores the canvas width or height in pixels (useful to center things or detect edges).' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'dim', type: 'select', options: [
          { v: 'w', es: 'Ancho', en: 'Width' },
          { v: 'h', es: 'Alto', en: 'Height' }
        ], es: 'Medida', en: 'Measure' }
      ]
    },
    touch_pos: {
      cat: 'canvas', container: false, helper: 'wcsTouch',
      es: { name: 'Posición del toque', desc: 'Guarda en dos variables dónde se tocó por última vez (X e Y). Pensado para “Al tocar” en un canvas.' },
      en: { name: 'Touch position', desc: 'Stores into two variables where it was last touched (X and Y). Meant for “On touch” on a canvas.' },
      params: [
        { key: 'intoX', type: 'var', es: 'Guardar X en', en: 'Store X into' },
        { key: 'intoY', type: 'var', es: 'Guardar Y en', en: 'Store Y into' }
      ]
    },

    /* ---- Guardar datos ---- */
    storage_set: {
      cat: 'storage', container: false,
      es: { name: 'Guardar dato', desc: 'Guarda un valor en este dispositivo (localStorage): sobrevive al cerrar la app.' },
      en: { name: 'Save data', desc: 'Stores a value on this device (localStorage): survives closing the app.' },
      params: [
        { key: 'key', type: 'text', es: 'Clave', en: 'Key', placeholder: 'puntos' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    storage_get: {
      cat: 'storage', container: false,
      es: { name: 'Leer dato', desc: 'Lee un valor guardado (null si nunca se guardó).' },
      en: { name: 'Read data', desc: 'Reads a stored value (null if never saved).' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'key', type: 'text', es: 'Clave', en: 'Key', placeholder: 'puntos' }
      ]
    },

    /* ---- Dialogs ---- */
    alert_dialog: {
      cat: 'dialogs', container: false,
      es: { name: 'Mostrar aviso', desc: 'Muestra una ventana de aviso del sistema con un mensaje.' },
      en: { name: 'Show alert', desc: 'Shows a system alert window with a message.' },
      params: [{ key: 'msg', type: 'value', es: 'Mensaje', en: 'Message' }]
    },
    confirm_dialog: {
      cat: 'dialogs', container: false,
      es: { name: 'Preguntar sí/no', desc: 'Pregunta al usuario y guarda verdadero/falso en una variable.' },
      en: { name: 'Ask yes/no', desc: 'Asks the user and stores true/false into a variable.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'msg', type: 'value', es: 'Pregunta', en: 'Question' }
      ]
    },
    prompt_dialog: {
      cat: 'dialogs', container: false,
      es: { name: 'Pedir texto', desc: 'Pide un texto al usuario y lo guarda en una variable.' },
      en: { name: 'Ask for text', desc: 'Asks the user for text and stores it in a variable.' },
      params: [
        { key: 'into', type: 'var', es: 'Guardar en', en: 'Store into' },
        { key: 'msg', type: 'value', es: 'Pregunta', en: 'Question' }
      ]
    },

    /* ---- Extra logic ---- */
    if_else: {
      cat: 'logic', container: true, elseBranch: true,
      es: { name: 'Si… si no…', desc: 'Ejecuta unos bloques si la condición se cumple y otros si no.' },
      en: { name: 'If… else…', desc: 'Runs some blocks when the condition holds and others when not.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'op', type: 'select', options: OPS, es: 'Comparación', en: 'Comparison' },
        { key: 'value', type: 'value', es: 'Comparar con', en: 'Compare with' }
      ]
    },
    while_var: {
      cat: 'logic', container: true,
      es: { name: 'Repetir mientras…', desc: 'Repite los bloques internos mientras la condición se cumpla (con tope de seguridad).' },
      en: { name: 'Repeat while…', desc: 'Repeats the inner blocks while the condition holds (with a safety cap).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'op', type: 'select', options: OPS, es: 'Comparación', en: 'Comparison' },
        { key: 'value', type: 'value', es: 'Comparar con', en: 'Compare with' }
      ]
    },
    for_each: {
      cat: 'logic', container: true,
      es: { name: 'Para cada elemento', desc: 'Repite los bloques internos con cada elemento de una lista.' },
      en: { name: 'For each item', desc: 'Repeats the inner blocks for every item of a list.' },
      params: [
        { key: 'name', type: 'var', es: 'Lista', en: 'List' },
        { key: 'item', type: 'text', es: 'Nombre del elemento', en: 'Item name', placeholder: 'item' }
      ]
    },
    call_action: {
      cat: 'logic', container: false,
      es: { name: 'Llamar función', desc: 'Ejecuta una función creada en la sección Funciones (reutiliza bloques).' },
      en: { name: 'Call function', desc: 'Runs a function created in the Functions section (reuses blocks).' },
      params: [{ key: 'fn', type: 'func', es: 'Función', en: 'Function' }]
    },

    /* ---- Webxdc ---- */
    send_update: {
      cat: 'webxdc', container: false,
      es: { name: 'Enviar update', desc: 'Envía un dato a todos los miembros del chat vía sendUpdate(). En el preview solo se simula.' },
      en: { name: 'Send update', desc: 'Sends a piece of data to all chat members via sendUpdate(). Only simulated in preview.' },
      params: [
        { key: 'key', type: 'text', es: 'Clave del dato', en: 'Data key', placeholder: 'counter' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' },
        { key: 'info', type: 'text', es: 'Texto en el chat (opcional)', en: 'Chat text (optional)', placeholder: '' },
        { key: 'summary', type: 'text', es: 'Resumen corto (opcional)', en: 'Short summary (optional)', placeholder: '' }
      ]
    },
    send_to_chat: {
      cat: 'webxdc', container: false,
      es: { name: 'Enviar al chat', desc: 'Abre el selector del mensajero (sendToChat) con un texto. Puede cerrar la miniapp.' },
      en: { name: 'Send to chat', desc: 'Opens the messenger picker (sendToChat) with text. May close the mini app.' },
      params: [
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' }
      ]
    },
    import_files: {
      cat: 'webxdc', container: false,
      es: { name: 'Importar archivos', desc: 'Pide archivos al usuario (importFiles). Cliente-dependiente; comprueba que existe.' },
      en: { name: 'Import files', desc: 'Asks the user for files (importFiles). Client-dependent; check it exists.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino (lista)', en: 'Target variable (list)' }
      ]
    },
    read_update: {
      cat: 'webxdc', container: false, context: 'onUpdate',
      es: { name: 'Leer dato del update', desc: 'Solo en "Al recibir update": guarda en una variable un dato que llegó en el payload.' },
      en: { name: 'Read data from update', desc: 'Only in "On update received": stores into a variable a piece of data from the payload.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'key', type: 'text', es: 'Clave del dato', en: 'Data key', placeholder: 'counter' }
      ]
    },
    set_var_self_name: {
      cat: 'webxdc', container: false,
      es: { name: 'Mi nombre (selfName)', desc: 'Guarda el nombre visible del usuario actual en el mensajero.' },
      en: { name: 'My name (selfName)', desc: 'Stores the current user\'s display name in the messenger.' },
      params: [{ key: 'name', type: 'var', es: 'Variable', en: 'Variable' }]
    },
    update_info: {
      cat: 'webxdc', container: false, context: 'onUpdate',
      es: { name: 'Texto del update', desc: 'Solo en “Al recibir update”: guarda el texto informativo que acompañó al dato recibido.' },
      en: { name: 'Update text', desc: 'Only in “On update received”: stores the info text that came with the received data.' },
      params: [{ key: 'name', type: 'var', es: 'Variable', en: 'Variable' }]
    },
    update_serial: {
      cat: 'webxdc', container: false, context: 'onUpdate',
      es: { name: 'Número del update', desc: 'Solo en “Al recibir update”: guarda el número de serie del update (crece con cada mensaje; sirve para saber cuál llegó antes).' },
      en: { name: 'Update number', desc: 'Only in “On update received”: stores the update serial number (grows with each message; useful to know which came first).' },
      params: [{ key: 'name', type: 'var', es: 'Variable', en: 'Variable' }]
    },

    /* ========== Premium palette expansion ========== */

    /* ---- math (extra) ---- */
    math_abs: {
      cat: 'math', sub: 'ops', container: false,
      es: { name: 'Valor absoluto', desc: 'Guarda en una variable el valor absoluto de un número (sin signo).' },
      en: { name: 'Absolute value', desc: 'Stores the absolute value of a number (without sign).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Número', en: 'Number' }
      ]
    },
    math_min_max: {
      cat: 'math', sub: 'ops', container: false,
      es: { name: 'Mínimo o máximo', desc: 'Elige el menor o el mayor de dos valores y lo guarda.' },
      en: { name: 'Min or max', desc: 'Picks the smaller or larger of two values and stores it.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'mode', type: 'select', options: [
          { v: 'min', es: 'Mínimo', en: 'Minimum' },
          { v: 'max', es: 'Máximo', en: 'Maximum' }
        ], es: 'Modo', en: 'Mode' },
        { key: 'a', type: 'value', es: 'Valor A', en: 'Value A' },
        { key: 'b', type: 'value', es: 'Valor B', en: 'Value B' }
      ]
    },
    math_sqrt: {
      cat: 'math', sub: 'ops', container: false,
      es: { name: 'Raíz cuadrada', desc: 'Calcula la raíz cuadrada y la guarda en una variable.' },
      en: { name: 'Square root', desc: 'Computes the square root into a variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Número', en: 'Number' }
      ]
    },
    math_pow: {
      cat: 'math', sub: 'ops', container: false,
      es: { name: 'Potencia', desc: 'Eleva un número a una potencia (base^exponente).' },
      en: { name: 'Power', desc: 'Raises a number to a power (base^exponent).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'base', type: 'value', es: 'Base', en: 'Base' },
        { key: 'exp', type: 'value', es: 'Exponente', en: 'Exponent' }
      ]
    },
    math_mod: {
      cat: 'math', sub: 'ops', container: false,
      es: { name: 'Resto (módulo)', desc: 'Guarda el resto de dividir A entre B.' },
      en: { name: 'Remainder (modulo)', desc: 'Stores the remainder of A divided by B.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'a', type: 'value', es: 'Dividendo', en: 'Dividend' },
        { key: 'b', type: 'value', es: 'Divisor', en: 'Divisor' }
      ]
    },
    math_trig: {
      cat: 'math', sub: 'trig', container: false,
      es: { name: 'Seno / coseno / tangente', desc: 'Función trigonométrica (ángulo en grados).' },
      en: { name: 'Sine / cosine / tangent', desc: 'Trig function (angle in degrees).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'fn', type: 'select', options: [
          { v: 'sin', es: 'Seno', en: 'Sine' },
          { v: 'cos', es: 'Coseno', en: 'Cosine' },
          { v: 'tan', es: 'Tangente', en: 'Tangent' }
        ], es: 'Función', en: 'Function' },
        { key: 'deg', type: 'value', es: 'Ángulo (°)', en: 'Angle (°)' }
      ]
    },
    math_floor_ceil: {
      cat: 'math', sub: 'ops', container: false,
      es: { name: 'Redondear abajo/arriba', desc: 'Trunca hacia abajo (floor) o hacia arriba (ceil).' },
      en: { name: 'Floor / ceil', desc: 'Rounds down (floor) or up (ceil).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'mode', type: 'select', options: [
          { v: 'floor', es: 'Abajo (floor)', en: 'Floor' },
          { v: 'ceil', es: 'Arriba (ceil)', en: 'Ceil' }
        ], es: 'Modo', en: 'Mode' },
        { key: 'value', type: 'value', es: 'Número', en: 'Number' }
      ]
    },
    math_random_between: {
      cat: 'math', sub: 'random', container: false,
      es: { name: 'Aleatorio entre A y B', desc: 'Número entero aleatorio inclusivo entre dos límites.' },
      en: { name: 'Random between A and B', desc: 'Inclusive random integer between two bounds.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'a', type: 'value', es: 'Mínimo', en: 'Minimum' },
        { key: 'b', type: 'value', es: 'Máximo', en: 'Maximum' }
      ]
    },
    math_chance: {
      cat: 'math', sub: 'random', container: false,
      es: { name: 'Probabilidad %', desc: 'Guarda true/false según un porcentaje de probabilidad (0–100).' },
      en: { name: 'Chance %', desc: 'Stores true/false according to a probability percentage (0–100).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'pct', type: 'value', es: 'Probabilidad %', en: 'Chance %' }
      ]
    },
    math_distance: {
      cat: 'math', sub: 'geo', container: false,
      es: { name: 'Distancia entre puntos', desc: 'Distancia euclídea entre (x1,y1) y (x2,y2).' },
      en: { name: 'Distance between points', desc: 'Euclidean distance between (x1,y1) and (x2,y2).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'x1', type: 'value', es: 'X1', en: 'X1' },
        { key: 'y1', type: 'value', es: 'Y1', en: 'Y1' },
        { key: 'x2', type: 'value', es: 'X2', en: 'X2' },
        { key: 'y2', type: 'value', es: 'Y2', en: 'Y2' }
      ]
    },

    /* ---- text (extra) ---- */
    str_includes: {
      cat: 'text', sub: 'search', container: false,
      es: { name: '¿Texto contiene…?', desc: 'Guarda true si el texto incluye un fragmento.' },
      en: { name: 'Text contains…?', desc: 'Stores true if the text includes a fragment.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'part', type: 'value', es: 'Fragmento', en: 'Fragment' }
      ]
    },
    str_split: {
      cat: 'text', sub: 'transform', container: false,
      es: { name: 'Dividir texto', desc: 'Parte un texto por un separador y guarda la lista.' },
      en: { name: 'Split text', desc: 'Splits text by a separator into a list.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable lista', en: 'List variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'sep', type: 'text', es: 'Separador', en: 'Separator', placeholder: ',' }
      ]
    },
    str_index: {
      cat: 'text', sub: 'search', container: false,
      es: { name: 'Posición en texto', desc: 'Índice donde aparece un fragmento (−1 si no está).' },
      en: { name: 'Index in text', desc: 'Index where a fragment appears (−1 if missing).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'part', type: 'value', es: 'Fragmento', en: 'Fragment' }
      ]
    },
    str_repeat: {
      cat: 'text', sub: 'transform', container: false,
      es: { name: 'Repetir texto', desc: 'Repite un texto N veces.' },
      en: { name: 'Repeat text', desc: 'Repeats text N times.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'n', type: 'value', es: 'Veces', en: 'Times' }
      ]
    },
    str_pad: {
      cat: 'text', sub: 'transform', container: false,
      es: { name: 'Rellenar texto', desc: 'Rellena a la izquierda o derecha hasta un largo.' },
      en: { name: 'Pad text', desc: 'Pads left or right to a length.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'len', type: 'number', es: 'Largo', en: 'Length', placeholder: '4' },
        { key: 'side', type: 'select', options: [
          { v: 'start', es: 'Izquierda', en: 'Left' },
          { v: 'end', es: 'Derecha', en: 'Right' }
        ], es: 'Lado', en: 'Side' },
        { key: 'ch', type: 'text', es: 'Carácter', en: 'Character', placeholder: '0' }
      ]
    },
    str_lines: {
      cat: 'text', sub: 'transform', container: false,
      es: { name: 'Unir con saltos de línea', desc: 'Une una lista en un texto multilínea.' },
      en: { name: 'Join with newlines', desc: 'Joins a list into multiline text.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'list', type: 'var', es: 'Lista', en: 'List' }
      ]
    },

    /* ---- lists (extra) ---- */
    list_index_of: {
      cat: 'lists', sub: 'query', container: false,
      es: { name: 'Índice en lista', desc: 'Posición del valor en la lista (−1 si no está).' },
      en: { name: 'Index in list', desc: 'Position of a value in the list (−1 if missing).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'list', type: 'var', es: 'Lista', en: 'List' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    list_set: {
      cat: 'lists', sub: 'mutate', container: false,
      es: { name: 'Poner ítem en índice', desc: 'Reemplaza el elemento en una posición de la lista.' },
      en: { name: 'Set item at index', desc: 'Replaces the element at a list index.' },
      params: [
        { key: 'list', type: 'var', es: 'Lista', en: 'List' },
        { key: 'index', type: 'value', es: 'Índice (0…)', en: 'Index (0…)' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    list_insert: {
      cat: 'lists', sub: 'mutate', container: false,
      es: { name: 'Insertar en lista', desc: 'Inserta un valor en un índice (empuja el resto).' },
      en: { name: 'Insert into list', desc: 'Inserts a value at an index (shifts the rest).' },
      params: [
        { key: 'list', type: 'var', es: 'Lista', en: 'List' },
        { key: 'index', type: 'value', es: 'Índice', en: 'Index' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    list_pop: {
      cat: 'lists', sub: 'mutate', container: false,
      es: { name: 'Sacar último', desc: 'Quita el último elemento y lo guarda en una variable.' },
      en: { name: 'Pop last', desc: 'Removes the last element into a variable.' },
      params: [
        { key: 'list', type: 'var', es: 'Lista', en: 'List' },
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' }
      ]
    },
    list_shuffle: {
      cat: 'lists', sub: 'mutate', container: false,
      es: { name: 'Barajar lista', desc: 'Mezcla aleatoriamente el orden de la lista.' },
      en: { name: 'Shuffle list', desc: 'Randomly shuffles the list order.' },
      params: [{ key: 'list', type: 'var', es: 'Lista', en: 'List' }]
    },
    list_unique: {
      cat: 'lists', sub: 'query', container: false,
      es: { name: 'Lista sin duplicados', desc: 'Crea una lista con valores únicos.' },
      en: { name: 'Unique list', desc: 'Builds a list with unique values.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'list', type: 'var', es: 'Lista origen', en: 'Source list' }
      ]
    },
    list_slice: {
      cat: 'lists', sub: 'query', container: false,
      es: { name: 'Recortar lista', desc: 'Copia un trozo de la lista [desde, hasta).' },
      en: { name: 'Slice list', desc: 'Copies a slice of the list [from, to).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'list', type: 'var', es: 'Lista', en: 'List' },
        { key: 'from', type: 'value', es: 'Desde', en: 'From' },
        { key: 'to', type: 'value', es: 'Hasta', en: 'To' }
      ]
    },

    /* ---- logic (extra) ---- */
    logic_and_or: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: 'Y / O lógico', desc: 'Combina dos condiciones booleanas (AND/OR).' },
      en: { name: 'Logical AND / OR', desc: 'Combines two boolean conditions.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'op', type: 'select', options: [
          { v: '&&', es: 'Y (ambas)', en: 'AND (both)' },
          { v: '||', es: 'O (alguna)', en: 'OR (either)' }
        ], es: 'Operación', en: 'Operation' },
        { key: 'a', type: 'value', es: 'Condición A', en: 'Condition A' },
        { key: 'b', type: 'value', es: 'Condición B', en: 'Condition B' }
      ]
    },
    logic_not: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: 'Negar (NOT)', desc: 'Invierte true↔false.' },
      en: { name: 'Not', desc: 'Flips true↔false.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    logic_ternary: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: 'Si… entonces… si no… (valor)', desc: 'Elige un valor u otro según una comparación.' },
      en: { name: 'If… then… else… (value)', desc: 'Picks one value or another from a comparison.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'left', type: 'value', es: 'Izquierda', en: 'Left' },
        { key: 'op', type: 'select', options: [
          { v: '==', es: '=', en: '==' }, { v: '!=', es: '≠', en: '!=' },
          { v: '>', es: '>', en: '>' }, { v: '<', es: '<', en: '<' },
          { v: '>=', es: '≥', en: '>=' }, { v: '<=', es: '≤', en: '<=' }
        ], es: 'Comparación', en: 'Compare' },
        { key: 'right', type: 'value', es: 'Derecha', en: 'Right' },
        { key: 'thenV', type: 'value', es: 'Si sí', en: 'If true' },
        { key: 'elseV', type: 'value', es: 'Si no', en: 'If false' }
      ]
    },
    set_bool: {
      cat: 'logic', sub: 'vars', container: false,
      es: { name: 'Poner verdadero/falso', desc: 'Asigna true o false a una variable.' },
      en: { name: 'Set true/false', desc: 'Assigns true or false to a variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'val', type: 'select', options: [
          { v: 'true', es: 'Verdadero', en: 'True' },
          { v: 'false', es: 'Falso', en: 'False' }
        ], es: 'Valor', en: 'Value' }
      ]
    },
    copy_var: {
      cat: 'logic', sub: 'vars', container: false,
      es: { name: 'Copiar variable', desc: 'Copia el valor de una variable a otra.' },
      en: { name: 'Copy variable', desc: 'Copies one variable into another.' },
      params: [
        { key: 'from', type: 'var', es: 'Origen', en: 'From' },
        { key: 'to', type: 'var', es: 'Destino', en: 'To' }
      ]
    },
    swap_vars: {
      cat: 'logic', sub: 'vars', container: false,
      es: { name: 'Intercambiar variables', desc: 'Intercambia los valores de dos variables.' },
      en: { name: 'Swap variables', desc: 'Swaps the values of two variables.' },
      params: [
        { key: 'a', type: 'var', es: 'Variable A', en: 'Variable A' },
        { key: 'b', type: 'var', es: 'Variable B', en: 'Variable B' }
      ]
    },

    /* ---- css / ui extra ---- */
    set_opacity: {
      cat: 'css', sub: 'look', container: false,
      es: { name: 'Opacidad', desc: 'Transparencia de un elemento (0 a 1).' },
      en: { name: 'Opacity', desc: 'Element transparency (0 to 1).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'val', type: 'number', es: 'Opacidad', en: 'Opacity', placeholder: '0.5' }
      ]
    },
    set_border: {
      cat: 'css', sub: 'look', container: false,
      es: { name: 'Borde', desc: 'Define borde (grosor, estilo, color).' },
      en: { name: 'Border', desc: 'Sets border (width, style, color).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'w', type: 'text', es: 'Grosor', en: 'Width', placeholder: '2px' },
        { key: 'style', type: 'select', options: [
          { v: 'solid', es: 'Continuo', en: 'Solid' },
          { v: 'dashed', es: 'Discontinuo', en: 'Dashed' },
          { v: 'dotted', es: 'Punteado', en: 'Dotted' },
          { v: 'none', es: 'Ninguno', en: 'None' }
        ], es: 'Estilo', en: 'Style' },
        { key: 'color', type: 'color', def: '#334155', es: 'Color', en: 'Color' }
      ]
    },
    set_radius: {
      cat: 'css', sub: 'look', container: false,
      es: { name: 'Esquinas redondeadas', desc: 'border-radius del elemento.' },
      en: { name: 'Rounded corners', desc: 'Element border-radius.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'r', type: 'text', es: 'Radio', en: 'Radius', placeholder: '12px' }
      ]
    },
    set_padding: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Relleno interno', desc: 'padding del elemento.' },
      en: { name: 'Padding', desc: 'Element padding.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'val', type: 'text', es: 'Valor', en: 'Value', placeholder: '12px' }
      ]
    },
    set_margin: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Margen externo', desc: 'margin del elemento.' },
      en: { name: 'Margin', desc: 'Element margin.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'val', type: 'text', es: 'Valor', en: 'Value', placeholder: '8px' }
      ]
    },
    set_position: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Posición (x, y)', desc: 'Coloca el elemento en coordenadas (position absolute).' },
      en: { name: 'Position (x, y)', desc: 'Places the element at coordinates (absolute).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'x', type: 'value', es: 'X (px)', en: 'X (px)' },
        { key: 'y', type: 'value', es: 'Y (px)', en: 'Y (px)' }
      ]
    },
    set_zindex: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Capa (z-index)', desc: 'Orden de apilado del elemento.' },
      en: { name: 'Layer (z-index)', desc: 'Stacking order of the element.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'z', type: 'number', es: 'Z-index', en: 'Z-index', placeholder: '10' }
      ]
    },
    set_display: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Modo de display', desc: 'Cambia display (flex, grid, none…).' },
      en: { name: 'Display mode', desc: 'Changes display (flex, grid, none…).' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'mode', type: 'select', options: [
          { v: 'block', es: 'Bloque', en: 'Block' },
          { v: 'flex', es: 'Flex', en: 'Flex' },
          { v: 'grid', es: 'Grid', en: 'Grid' },
          { v: 'inline-block', es: 'En línea-bloque', en: 'Inline-block' },
          { v: 'none', es: 'Oculto', en: 'None' }
        ], es: 'Modo', en: 'Mode' }
      ]
    },
    flex_center: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Centrar con flex', desc: 'Centra el contenido del contenedor con flexbox.' },
      en: { name: 'Center with flex', desc: 'Centers container content with flexbox.' },
      params: [{ key: 'id', type: 'element', es: 'Contenedor (#id)', en: 'Container (#id)' }]
    },

    /* ---- html extra ---- */
    create_input: {
      cat: 'html', sub: 'create', container: false, helper: 'wcsCreate',
      es: { name: 'Crear campo de texto', desc: 'Crea un <input> y lo inserta en la página.' },
      en: { name: 'Create text input', desc: 'Creates an <input> and inserts it on the page.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'placeholder', type: 'text', es: 'Placeholder', en: 'Placeholder', placeholder: 'Escribe…' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    create_textarea: {
      cat: 'html', sub: 'create', container: false, helper: 'wcsCreate',
      es: { name: 'Crear área de texto', desc: 'Crea un <textarea> multilínea.' },
      en: { name: 'Create textarea', desc: 'Creates a multiline <textarea>.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    focus_element: {
      cat: 'html', sub: 'interact', container: false,
      es: { name: 'Enfocar elemento', desc: 'Pone el foco del teclado en un campo.' },
      en: { name: 'Focus element', desc: 'Moves keyboard focus to a field.' },
      params: [{ key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' }]
    },
    scroll_into_view: {
      cat: 'html', sub: 'interact', container: false,
      es: { name: 'Desplazar hasta elemento', desc: 'Hace scroll para que el elemento sea visible.' },
      en: { name: 'Scroll into view', desc: 'Scrolls so the element becomes visible.' },
      params: [{ key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' }]
    },
    set_disabled: {
      cat: 'html', sub: 'interact', container: false,
      es: { name: 'Activar / desactivar', desc: 'Habilita o deshabilita un botón o input.' },
      en: { name: 'Enable / disable', desc: 'Enables or disables a button or input.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'state', type: 'select', options: [
          { v: 'true', es: 'Desactivar', en: 'Disable' },
          { v: 'false', es: 'Activar', en: 'Enable' }
        ], es: 'Estado', en: 'State' }
      ]
    },
    get_text: {
      cat: 'html', sub: 'read', container: false,
      es: { name: 'Leer texto de elemento', desc: 'Copia textContent a una variable.' },
      en: { name: 'Read element text', desc: 'Copies textContent into a variable.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' }
      ]
    },
    get_input: {
      cat: 'html', sub: 'read', container: false,
      es: { name: 'Leer valor de input', desc: 'Copia el .value de un campo a una variable.' },
      en: { name: 'Read input value', desc: 'Copies an input .value into a variable.' },
      params: [
        { key: 'id', type: 'element', es: 'Campo (#id)', en: 'Field (#id)' },
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' }
      ]
    },

    /* ---- timers extra ---- */
    stop_all_timers: {
      cat: 'timers', sub: 'control', container: false, helper: 'wcsTimers',
      es: { name: 'Parar todos los timers', desc: 'Cancela intervalos y timeouts registrados por bloques.' },
      en: { name: 'Stop all timers', desc: 'Cancels intervals and timeouts registered by blocks.' },
      params: []
    },
    timestamp_now: {
      cat: 'timers', sub: 'clock', container: false,
      es: { name: 'Marca de tiempo actual', desc: 'Guarda Date.now() (ms desde 1970).' },
      en: { name: 'Current timestamp', desc: 'Stores Date.now() (ms since 1970).' },
      params: [{ key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' }]
    },
    format_clock: {
      cat: 'timers', sub: 'clock', container: false,
      es: { name: 'Reloj HH:MM:SS', desc: 'Formatea segundos totales como reloj.' },
      en: { name: 'Clock HH:MM:SS', desc: 'Formats total seconds as a clock string.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'secs', type: 'value', es: 'Segundos', en: 'Seconds' }
      ]
    },

    /* ---- audio extra ---- */
    play_beep: {
      cat: 'audio', sub: 'sfx', container: false, helper: 'wcsTone',
      es: { name: 'Beep rápido', desc: 'Pitido corto predefinido (éxito / error / click).' },
      en: { name: 'Quick beep', desc: 'Short preset beep (success / error / click).' },
      params: [{
        key: 'kind', type: 'select', options: [
          { v: 'ok', es: 'Éxito', en: 'Success' },
          { v: 'err', es: 'Error', en: 'Error' },
          { v: 'click', es: 'Click', en: 'Click' },
          { v: 'coin', es: 'Moneda', en: 'Coin' }
        ], es: 'Tipo', en: 'Kind'
      }]
    },
    set_master_volume: {
      cat: 'audio', sub: 'mix', container: false, helper: 'wcsTone',
      es: { name: 'Volumen maestro', desc: 'Ajusta el volumen global de los tonos (0–1).' },
      en: { name: 'Master volume', desc: 'Sets global tone volume (0–1).' },
      params: [{ key: 'vol', type: 'number', es: 'Volumen', en: 'Volume', placeholder: '0.3' }]
    },

    /* ---- canvas extra ---- */
    canvas_line: {
      cat: 'canvas', sub: 'draw', container: false, helper: 'wcsCanvas',
      es: { name: 'Línea en canvas', desc: 'Dibuja una línea entre dos puntos.' },
      en: { name: 'Canvas line', desc: 'Draws a line between two points.' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'x1', type: 'value', es: 'X1', en: 'X1' },
        { key: 'y1', type: 'value', es: 'Y1', en: 'Y1' },
        { key: 'x2', type: 'value', es: 'X2', en: 'X2' },
        { key: 'y2', type: 'value', es: 'Y2', en: 'Y2' },
        { key: 'color', type: 'color', def: '#111827', es: 'Color', en: 'Color' },
        { key: 'w', type: 'number', es: 'Grosor', en: 'Width', placeholder: '2' }
      ]
    },
    canvas_fill_style: {
      cat: 'canvas', sub: 'style', container: false, helper: 'wcsCanvas',
      es: { name: 'Color de relleno', desc: 'Define el fillStyle del canvas.' },
      en: { name: 'Fill color', desc: 'Sets canvas fillStyle.' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'color', type: 'color', def: '#4f46e5', es: 'Color', en: 'Color' }
      ]
    },
    canvas_stroke_style: {
      cat: 'canvas', sub: 'style', container: false, helper: 'wcsCanvas',
      es: { name: 'Color de trazo', desc: 'Define el strokeStyle del canvas.' },
      en: { name: 'Stroke color', desc: 'Sets canvas strokeStyle.' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'color', type: 'color', def: '#111827', es: 'Color', en: 'Color' }
      ]
    },
    canvas_font: {
      cat: 'canvas', sub: 'style', container: false, helper: 'wcsCanvas',
      es: { name: 'Fuente del canvas', desc: 'Define ctx.font (ej. 16px sans-serif).' },
      en: { name: 'Canvas font', desc: 'Sets ctx.font (e.g. 16px sans-serif).' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'font', type: 'text', es: 'Fuente', en: 'Font', placeholder: '16px sans-serif' }
      ]
    },
    canvas_clear_rect: {
      cat: 'canvas', sub: 'draw', container: false, helper: 'wcsCanvas',
      es: { name: 'Borrar rectángulo', desc: 'Limpia una zona rectangular del canvas.' },
      en: { name: 'Clear rectangle', desc: 'Clears a rectangular area of the canvas.' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'x', type: 'value', es: 'X', en: 'X' },
        { key: 'y', type: 'value', es: 'Y', en: 'Y' },
        { key: 'w', type: 'value', es: 'Ancho', en: 'Width' },
        { key: 'h', type: 'value', es: 'Alto', en: 'Height' }
      ]
    },

    /* ---- game ---- */
    game_score_set: {
      cat: 'game', sub: 'score', container: false,
      es: { name: 'Poner puntuación', desc: 'Asigna un valor a la variable de puntuación.' },
      en: { name: 'Set score', desc: 'Assigns a value to the score variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable puntos', en: 'Score variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    game_score_add: {
      cat: 'game', sub: 'score', container: false,
      es: { name: 'Sumar puntos', desc: 'Suma (o resta) puntos a la puntuación.' },
      en: { name: 'Add score', desc: 'Adds (or subtracts) points to the score.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable puntos', en: 'Score variable' },
        { key: 'delta', type: 'value', es: 'Cantidad', en: 'Amount' }
      ]
    },
    game_lives: {
      cat: 'game', sub: 'score', container: false,
      es: { name: 'Cambiar vidas', desc: 'Suma o resta vidas; opcionalmente ejecuta si llegan a 0.' },
      en: { name: 'Change lives', desc: 'Adds or removes lives; optionally runs when reaching 0.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable vidas', en: 'Lives variable' },
        { key: 'delta', type: 'value', es: 'Cambio (+/−)', en: 'Change (+/−)' }
      ]
    },
    collide_aabb: {
      cat: 'game', sub: 'physics', container: false,
      es: { name: '¿Colisión de cajas?', desc: 'true si dos rectángulos (x,y,w,h) se solapan.' },
      en: { name: 'Box collision?', desc: 'true if two rectangles (x,y,w,h) overlap.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'x1', type: 'value', es: 'X1', en: 'X1' },
        { key: 'y1', type: 'value', es: 'Y1', en: 'Y1' },
        { key: 'w1', type: 'value', es: 'Ancho1', en: 'Width1' },
        { key: 'h1', type: 'value', es: 'Alto1', en: 'Height1' },
        { key: 'x2', type: 'value', es: 'X2', en: 'X2' },
        { key: 'y2', type: 'value', es: 'Y2', en: 'Y2' },
        { key: 'w2', type: 'value', es: 'Ancho2', en: 'Width2' },
        { key: 'h2', type: 'value', es: 'Alto2', en: 'Height2' }
      ]
    },
    key_pressed: {
      cat: 'game', sub: 'input', container: false, helper: 'wcsKeys',
      es: { name: '¿Tecla pulsada?', desc: 'true si la tecla está abajo (requiere foco en la página).' },
      en: { name: 'Key pressed?', desc: 'true if the key is down (page must be focused).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'key', type: 'select', options: [
          { v: 'ArrowLeft', es: '← Izquierda', en: '← Left' },
          { v: 'ArrowRight', es: '→ Derecha', en: '→ Right' },
          { v: 'ArrowUp', es: '↑ Arriba', en: '↑ Up' },
          { v: 'ArrowDown', es: '↓ Abajo', en: '↓ Down' },
          { v: ' ', es: 'Espacio', en: 'Space' },
          { v: 'Enter', es: 'Enter', en: 'Enter' },
          { v: 'a', es: 'A', en: 'A' },
          { v: 'd', es: 'D', en: 'D' },
          { v: 'w', es: 'W', en: 'W' },
          { v: 's', es: 'S', en: 'S' }
        ], es: 'Tecla', en: 'Key' }
      ]
    },
    sprite_set_xy: {
      cat: 'game', sub: 'sprite', container: false,
      es: { name: 'Sprite: poner X/Y', desc: 'Guarda coordenadas de un “sprite” en variables.' },
      en: { name: 'Sprite: set X/Y', desc: 'Stores sprite coordinates into variables.' },
      params: [
        { key: 'xVar', type: 'var', es: 'Variable X', en: 'X variable' },
        { key: 'yVar', type: 'var', es: 'Variable Y', en: 'Y variable' },
        { key: 'x', type: 'value', es: 'X', en: 'X' },
        { key: 'y', type: 'value', es: 'Y', en: 'Y' }
      ]
    },
    sprite_move: {
      cat: 'game', sub: 'sprite', container: false,
      es: { name: 'Sprite: mover', desc: 'Suma deltaX/deltaY a las variables de posición.' },
      en: { name: 'Sprite: move', desc: 'Adds deltaX/deltaY to position variables.' },
      params: [
        { key: 'xVar', type: 'var', es: 'Variable X', en: 'X variable' },
        { key: 'yVar', type: 'var', es: 'Variable Y', en: 'Y variable' },
        { key: 'dx', type: 'value', es: 'Delta X', en: 'Delta X' },
        { key: 'dy', type: 'value', es: 'Delta Y', en: 'Delta Y' }
      ]
    },
    sprite_wrap: {
      cat: 'game', sub: 'sprite', container: false,
      es: { name: 'Sprite: envolver pantalla', desc: 'Si sale del borde, aparece por el lado opuesto.' },
      en: { name: 'Sprite: wrap screen', desc: 'If it leaves the edge, it reappears on the opposite side.' },
      params: [
        { key: 'xVar', type: 'var', es: 'Variable X', en: 'X variable' },
        { key: 'yVar', type: 'var', es: 'Variable Y', en: 'Y variable' },
        { key: 'w', type: 'value', es: 'Ancho pantalla', en: 'Screen width' },
        { key: 'h', type: 'value', es: 'Alto pantalla', en: 'Screen height' }
      ]
    },
    sprite_clamp: {
      cat: 'game', sub: 'sprite', container: false,
      es: { name: 'Sprite: limitar a bordes', desc: 'Mantiene X/Y dentro del rectángulo de juego.' },
      en: { name: 'Sprite: clamp to edges', desc: 'Keeps X/Y inside the play rectangle.' },
      params: [
        { key: 'xVar', type: 'var', es: 'Variable X', en: 'X variable' },
        { key: 'yVar', type: 'var', es: 'Variable Y', en: 'Y variable' },
        { key: 'minX', type: 'value', es: 'Min X', en: 'Min X' },
        { key: 'minY', type: 'value', es: 'Min Y', en: 'Min Y' },
        { key: 'maxX', type: 'value', es: 'Max X', en: 'Max X' },
        { key: 'maxY', type: 'value', es: 'Max Y', en: 'Max Y' }
      ]
    },
    game_loop_flag: {
      cat: 'game', sub: 'loop', container: false,
      es: { name: 'Bandera de juego activo', desc: 'Pone true/false en una variable “juego en marcha”.' },
      en: { name: 'Game running flag', desc: 'Sets true/false on a “game running” variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable', en: 'Variable' },
        { key: 'val', type: 'select', options: [
          { v: 'true', es: 'En marcha', en: 'Running' },
          { v: 'false', es: 'Detenido', en: 'Stopped' }
        ], es: 'Estado', en: 'State' }
      ]
    },

    /* ---- storage extra ---- */
    storage_remove: {
      cat: 'storage', sub: 'data', container: false,
      es: { name: 'Borrar dato guardado', desc: 'Elimina una clave de localStorage.' },
      en: { name: 'Remove stored data', desc: 'Deletes a key from localStorage.' },
      params: [{ key: 'key', type: 'text', es: 'Clave', en: 'Key', placeholder: 'highscore' }]
    },
    storage_clear: {
      cat: 'storage', sub: 'data', container: false,
      es: { name: 'Borrar todo lo guardado', desc: 'Limpia localStorage de esta miniapp.' },
      en: { name: 'Clear all stored data', desc: 'Clears localStorage for this miniapp.' },
      params: []
    },
    storage_has: {
      cat: 'storage', sub: 'data', container: false,
      es: { name: '¿Existe dato guardado?', desc: 'true si la clave existe en localStorage.' },
      en: { name: 'Has stored data?', desc: 'true if the key exists in localStorage.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'key', type: 'text', es: 'Clave', en: 'Key', placeholder: 'highscore' }
      ]
    },

    /* ---- webxdc extra ---- */
    send_update_score: {
      cat: 'webxdc', sub: 'sync', container: false,
      es: { name: 'Enviar puntuación', desc: 'sendUpdate con {score} y un texto visible.' },
      en: { name: 'Send score', desc: 'sendUpdate with {score} and a visible info text.' },
      params: [
        { key: 'score', type: 'value', es: 'Puntos', en: 'Score' },
        { key: 'info', type: 'value', es: 'Texto visible', en: 'Visible text' }
      ]
    },
    send_update_payload: {
      cat: 'webxdc', sub: 'sync', container: false,
      es: { name: 'Enviar dato (clave/valor)', desc: 'sendUpdate con una clave y un valor del payload.' },
      en: { name: 'Send data (key/value)', desc: 'sendUpdate with one payload key and value.' },
      params: [
        { key: 'key', type: 'text', es: 'Clave', en: 'Key', placeholder: 'move' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' },
        { key: 'info', type: 'value', es: 'Texto visible', en: 'Visible text' }
      ]
    },
    is_self_addr: {
      cat: 'webxdc', sub: 'identity', container: false,
      es: { name: '¿Soy yo (selfAddr)?', desc: 'Compara una variable con webxdc.selfAddr.' },
      en: { name: 'Is it me (selfAddr)?', desc: 'Compares a variable to webxdc.selfAddr.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'addr', type: 'value', es: 'Dirección a comparar', en: 'Address to compare' }
      ]
    },
    set_var_self_addr: {
      cat: 'webxdc', sub: 'identity', container: false,
      es: { name: 'Mi dirección (selfAddr)', desc: 'Guarda webxdc.selfAddr en una variable.' },
      en: { name: 'My address (selfAddr)', desc: 'Stores webxdc.selfAddr in a variable.' },
      params: [{ key: 'name', type: 'var', es: 'Variable', en: 'Variable' }]
    },

    /* ---- advanced ---- */
    console_log: {
      cat: 'advanced', sub: 'debug', container: false,
      es: { name: 'Log en consola', desc: 'Escribe un valor en la consola del desarrollador.' },
      en: { name: 'Console log', desc: 'Writes a value to the developer console.' },
      params: [{ key: 'value', type: 'value', es: 'Valor', en: 'Value' }]
    },
    json_stringify: {
      cat: 'advanced', sub: 'data', container: false,
      es: { name: 'Objeto → texto JSON', desc: 'Convierte un valor a texto JSON.' },
      en: { name: 'Value → JSON text', desc: 'Converts a value to JSON text.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    json_parse: {
      cat: 'advanced', sub: 'data', container: false,
      es: { name: 'Texto JSON → valor', desc: 'Parsea JSON; si falla, guarda null.' },
      en: { name: 'JSON text → value', desc: 'Parses JSON; on failure stores null.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto JSON', en: 'JSON text' }
      ]
    },
    object_set: {
      cat: 'advanced', sub: 'data', container: false,
      es: { name: 'Poner propiedad de objeto', desc: 'obj[clave] = valor (crea el objeto si hace falta).' },
      en: { name: 'Set object property', desc: 'obj[key] = value (creates object if needed).' },
      params: [
        { key: 'obj', type: 'var', es: 'Variable objeto', en: 'Object variable' },
        { key: 'key', type: 'text', es: 'Clave', en: 'Key', placeholder: 'hp' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    object_get: {
      cat: 'advanced', sub: 'data', container: false,
      es: { name: 'Leer propiedad de objeto', desc: 'Guarda obj[clave] en una variable.' },
      en: { name: 'Get object property', desc: 'Stores obj[key] into a variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'obj', type: 'var', es: 'Variable objeto', en: 'Object variable' },
        { key: 'key', type: 'text', es: 'Clave', en: 'Key', placeholder: 'hp' }
      ]
    },
    try_catch: {
      cat: 'advanced', sub: 'control', container: true,
      es: { name: 'Intentar / si falla', desc: 'Ejecuta bloques; si hay error, ejecuta la rama alternativa.' },
      en: { name: 'Try / on error', desc: 'Runs blocks; on error runs the alternate branch.' },
      params: []
    },

    /* ===== Matriz no-code P0 (navigation, components, forms, data, recipes) ===== */
    nav_create_screen: {
      cat: 'navigation', sub: 'screens', container: false,
      es: { name: 'Crear pantalla', desc: 'Crea un contenedor de pantalla (div) oculto por defecto, listo para navegar.' },
      en: { name: 'Create screen', desc: 'Creates a screen container (div), hidden by default, ready for navigation.' },
      params: [
        { key: 'id', type: 'element', es: 'Id de pantalla', en: 'Screen id' },
        { key: 'title', type: 'value', es: 'Título opcional', en: 'Optional title' }
      ]
    },
    nav_show_screen: {
      cat: 'navigation', sub: 'screens', container: false,
      es: { name: 'Mostrar pantalla', desc: 'Muestra una pantalla y oculta las demás con clase wcs-screen.' },
      en: { name: 'Show screen', desc: 'Shows one screen and hides other .wcs-screen elements.' },
      params: [
        { key: 'id', type: 'element', es: 'Id de pantalla', en: 'Screen id' }
      ]
    },
    nav_hide_screen: {
      cat: 'navigation', sub: 'screens', container: false,
      es: { name: 'Ocultar pantalla', desc: 'Oculta una pantalla concreta.' },
      en: { name: 'Hide screen', desc: 'Hides a specific screen.' },
      params: [
        { key: 'id', type: 'element', es: 'Id de pantalla', en: 'Screen id' }
      ]
    },
    nav_go_screen: {
      cat: 'navigation', sub: 'screens', container: false,
      es: { name: 'Ir a pantalla', desc: 'Navega a una pantalla (igual que mostrar, con historial simple).' },
      en: { name: 'Go to screen', desc: 'Navigates to a screen (show + simple history).' },
      params: [
        { key: 'id', type: 'element', es: 'Id de pantalla', en: 'Screen id' }
      ]
    },
    nav_back: {
      cat: 'navigation', sub: 'screens', container: false,
      es: { name: 'Volver', desc: 'Vuelve a la pantalla anterior del historial de navegación.' },
      en: { name: 'Back', desc: 'Goes back to the previous screen in navigation history.' },
      params: [
        
      ]
    },
    nav_home: {
      cat: 'navigation', sub: 'screens', container: false,
      es: { name: 'Ir al inicio', desc: 'Muestra la primera pantalla registrada o #home.' },
      en: { name: 'Go home', desc: 'Shows the first registered screen or #home.' },
      params: [
        
      ]
    },
    nav_modal_open: {
      cat: 'navigation', sub: 'modals', container: false,
      es: { name: 'Abrir modal', desc: 'Muestra un elemento como modal (overlay).' },
      en: { name: 'Open modal', desc: 'Shows an element as a modal overlay.' },
      params: [
        { key: 'id', type: 'element', es: 'Id del modal', en: 'Modal id' }
      ]
    },
    nav_modal_close: {
      cat: 'navigation', sub: 'modals', container: false,
      es: { name: 'Cerrar modal', desc: 'Cierra el modal abierto (o uno concreto).' },
      en: { name: 'Close modal', desc: 'Closes the open modal (or a specific one).' },
      params: [
        { key: 'id', type: 'element', es: 'Id (opcional)', en: 'Id (optional)' }
      ]
    },
    nav_modal_toggle: {
      cat: 'navigation', sub: 'modals', container: false,
      es: { name: 'Alternar modal', desc: 'Abre el modal si está cerrado; lo cierra si está abierto.' },
      en: { name: 'Toggle modal', desc: 'Opens the modal if closed; closes it if open.' },
      params: [
        { key: 'id', type: 'element', es: 'Id del modal', en: 'Modal id' }
      ]
    },
    cmp_button: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear botón', desc: 'Crea un botón accesible con texto e id únicos.' },
      en: { name: 'Create button', desc: 'Creates an accessible button with text and unique id.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_card: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear tarjeta', desc: 'Contenedor con estilo de tarjeta para agrupar contenido.' },
      en: { name: 'Create card', desc: 'Card-styled container to group content.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_header: {
      cat: 'components', sub: 'layout', container: false,
      es: { name: 'Crear encabezado', desc: 'Encabezado de página con título.' },
      en: { name: 'Create header', desc: 'Page header with title.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Título', en: 'Title' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_badge: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear insignia', desc: 'Chip/insignia de estado con texto.' },
      en: { name: 'Create badge', desc: 'Status chip/badge with text.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_progress: {
      cat: 'components', sub: 'feedback', container: false,
      es: { name: 'Crear barra de progreso', desc: 'Barra 0–100 con valor inicial.' },
      en: { name: 'Create progress bar', desc: '0–100 bar with initial value.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'value', type: 'value', es: 'Valor 0–100', en: 'Value 0–100' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_set_progress: {
      cat: 'components', sub: 'feedback', container: false,
      es: { name: 'Actualizar progreso', desc: 'Cambia el valor de una barra de progreso (0–100).' },
      en: { name: 'Update progress', desc: 'Changes a progress bar value (0–100).' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'value', type: 'value', es: 'Valor 0–100', en: 'Value 0–100' }
      ]
    },
    cmp_spinner: {
      cat: 'components', sub: 'feedback', container: false,
      es: { name: 'Crear indicador de carga', desc: 'Muestra un spinner simple de carga.' },
      en: { name: 'Create spinner', desc: 'Shows a simple loading spinner.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_divider: {
      cat: 'components', sub: 'layout', container: false,
      es: { name: 'Crear separador', desc: 'Línea horizontal separadora.' },
      en: { name: 'Create divider', desc: 'Horizontal divider line.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_empty_state: {
      cat: 'components', sub: 'feedback', container: false,
      es: { name: 'Crear estado vacío', desc: 'Mensaje amable cuando no hay contenido.' },
      en: { name: 'Create empty state', desc: 'Friendly message when there is no content.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Mensaje', en: 'Message' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_alert: {
      cat: 'components', sub: 'feedback', container: false,
      es: { name: 'Crear alerta', desc: 'Caja de alerta visible en la página (no diálogo del sistema).' },
      en: { name: 'Create alert', desc: 'In-page alert box (not a system dialog).' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Mensaje', en: 'Message' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_list: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear lista visual', desc: 'Lista vacía (ul) lista para añadir elementos.' },
      en: { name: 'Create visual list', desc: 'Empty list (ul) ready for items.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_field_text: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Campo de texto', desc: 'Crea un input de texto con etiqueta opcional.' },
      en: { name: 'Text field', desc: 'Creates a text input with optional label.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', placeholder: 'Nombre', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_field_number: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Campo numérico', desc: 'Input numérico con etiqueta opcional.' },
      en: { name: 'Number field', desc: 'Numeric input with optional label.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', placeholder: 'Cantidad', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_field_email: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Campo email', desc: 'Input de correo electrónico.' },
      en: { name: 'Email field', desc: 'Email input field.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', placeholder: 'Email', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_checkbox: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Casilla', desc: 'Checkbox con etiqueta.' },
      en: { name: 'Checkbox', desc: 'Checkbox with label.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_select: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Selector', desc: 'Lista desplegable; opciones separadas por coma.' },
      en: { name: 'Select', desc: 'Dropdown; options separated by commas.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', es: 'Etiqueta', en: 'Label' },
        { key: 'options', type: 'text', placeholder: 'A,B,C', es: 'Opciones (a,b,c)', en: 'Options (a,b,c)' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_values: {
      cat: 'forms', sub: 'data', container: false,
      es: { name: 'Obtener valores del formulario', desc: 'Guarda en una variable un objeto con los valores de los campos (ids separados por coma).' },
      en: { name: 'Get form values', desc: 'Stores into a variable an object of field values (ids comma-separated).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'ids', type: 'text', placeholder: 'nombre,email', es: 'Ids de campos (a,b,c)', en: 'Field ids (a,b,c)' }
      ]
    },
    form_clear: {
      cat: 'forms', sub: 'data', container: false,
      es: { name: 'Limpiar campos', desc: 'Vacía los campos indicados (ids separados por coma).' },
      en: { name: 'Clear fields', desc: 'Clears the given fields (comma-separated ids).' },
      params: [
        { key: 'ids', type: 'text', es: 'Ids de campos (a,b,c)', en: 'Field ids (a,b,c)' }
      ]
    },
    form_valid_required: {
      cat: 'forms', sub: 'validation', container: false,
      es: { name: '¿Campos requeridos llenos?', desc: 'true si todos los campos listados tienen valor.' },
      en: { name: 'Required fields filled?', desc: 'true if all listed fields have a value.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'ids', type: 'text', es: 'Ids requeridos (a,b)', en: 'Required ids (a,b)' }
      ]
    },
    form_show_error: {
      cat: 'forms', sub: 'validation', container: false,
      es: { name: 'Mostrar error de campo', desc: 'Pone un mensaje de error junto al campo (elemento mensaje).' },
      en: { name: 'Show field error', desc: 'Sets an error message on a message element.' },
      params: [
        { key: 'id', type: 'element', es: 'Id del mensaje', en: 'Message element id' },
        { key: 'text', type: 'value', es: 'Error', en: 'Error' }
      ]
    },
    data_create_collection: {
      cat: 'data', sub: 'collections', container: false,
      es: { name: 'Crear colección', desc: 'Inicializa una colección vacía en localStorage si no existe.' },
      en: { name: 'Create collection', desc: 'Initializes an empty collection in localStorage if missing.' },
      params: [
        { key: 'name', type: 'text', placeholder: 'tareas', es: 'Nombre colección', en: 'Collection name' }
      ]
    },
    data_create_record: {
      cat: 'data', sub: 'records', container: false,
      es: { name: 'Crear registro', desc: 'Añade un registro (objeto) a la colección; guarda el id nuevo en variable opcional.' },
      en: { name: 'Create record', desc: 'Appends a record (object) to the collection; optional new-id variable.' },
      params: [
        { key: 'collection', type: 'text', placeholder: 'tareas', es: 'Colección', en: 'Collection' },
        { key: 'value', type: 'value', es: 'Datos (objeto)', en: 'Data (object)' },
        { key: 'name', type: 'var', es: 'Variable id nuevo (opc.)', en: 'New id variable (opt.)' }
      ]
    },
    data_get_record: {
      cat: 'data', sub: 'records', container: false,
      es: { name: 'Leer registro', desc: 'Obtiene un registro por id y lo guarda en una variable.' },
      en: { name: 'Get record', desc: 'Fetches a record by id into a variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'collection', type: 'text', es: 'Colección', en: 'Collection' },
        { key: 'id', type: 'value', es: 'Id del registro', en: 'Record id' }
      ]
    },
    data_update_record: {
      cat: 'data', sub: 'records', container: false,
      es: { name: 'Actualizar registro', desc: 'Actualiza un registro existente por id.' },
      en: { name: 'Update record', desc: 'Updates an existing record by id.' },
      params: [
        { key: 'collection', type: 'text', es: 'Colección', en: 'Collection' },
        { key: 'id', type: 'value', es: 'Id', en: 'Id' },
        { key: 'value', type: 'value', es: 'Datos nuevos', en: 'New data' }
      ]
    },
    data_delete_record: {
      cat: 'data', sub: 'records', container: false,
      es: { name: 'Eliminar registro', desc: 'Borra un registro por id.' },
      en: { name: 'Delete record', desc: 'Deletes a record by id.' },
      params: [
        { key: 'collection', type: 'text', es: 'Colección', en: 'Collection' },
        { key: 'id', type: 'value', es: 'Id', en: 'Id' }
      ]
    },
    data_find_many: {
      cat: 'data', sub: 'query', container: false,
      es: { name: 'Listar registros', desc: 'Guarda en una variable todos los registros de la colección.' },
      en: { name: 'List records', desc: 'Stores all collection records into a variable.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'collection', type: 'text', es: 'Colección', en: 'Collection' }
      ]
    },
    data_count: {
      cat: 'data', sub: 'query', container: false,
      es: { name: 'Contar registros', desc: 'Número de registros en la colección.' },
      en: { name: 'Count records', desc: 'Number of records in the collection.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'collection', type: 'text', es: 'Colección', en: 'Collection' }
      ]
    },
    str_capitalize: {
      cat: 'text', sub: 'transform', container: false,
      es: { name: 'Capitalizar', desc: 'Primera letra mayúscula.' },
      en: { name: 'Capitalize', desc: 'First letter uppercase.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' }
      ]
    },
    str_starts: {
      cat: 'text', sub: 'search', container: false,
      es: { name: '¿Empieza por?', desc: 'true si el texto empieza por el fragmento.' },
      en: { name: 'Starts with?', desc: 'true if text starts with the fragment.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'part', type: 'value', es: 'Fragmento', en: 'Fragment' }
      ]
    },
    str_ends: {
      cat: 'text', sub: 'search', container: false,
      es: { name: '¿Termina por?', desc: 'true si el texto termina por el fragmento.' },
      en: { name: 'Ends with?', desc: 'true if text ends with the fragment.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'part', type: 'value', es: 'Fragmento', en: 'Fragment' }
      ]
    },
    str_template: {
      cat: 'text', sub: 'transform', container: false,
      es: { name: 'Texto con variables', desc: 'Reemplaza {nombre} en la plantilla con el valor de la variable.' },
      en: { name: 'Text with variables', desc: 'Replaces {name} in the template with the variable value.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'template', type: 'text', placeholder: 'Hola {nombre}', es: 'Plantilla', en: 'Template' },
        { key: 'varName', type: 'var', es: 'Variable a insertar', en: 'Variable to insert' }
      ]
    },
    logic_is_empty: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: '¿Está vacío?', desc: 'true si el valor es null, "" o lista vacía.' },
      en: { name: 'Is empty?', desc: 'true if value is null, "" or empty list.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    logic_is_number: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: '¿Es número?', desc: 'true si el valor es numérico finito.' },
      en: { name: 'Is number?', desc: 'true if the value is a finite number.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    logic_between: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: '¿Está entre?', desc: 'true si el valor está entre min y max (inclusivo).' },
      en: { name: 'Is between?', desc: 'true if value is between min and max (inclusive).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' },
        { key: 'min', type: 'value', es: 'Mín', en: 'Min' },
        { key: 'max', type: 'value', es: 'Máx', en: 'Max' }
      ]
    },
    style_align: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Alinear contenido', desc: 'align-items en un contenedor flex.' },
      en: { name: 'Align content', desc: 'align-items on a flex container.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'align', type: 'select', options: [
          { v: 'flex-start', es: 'Inicio', en: 'Start' },
          { v: 'center', es: 'Centro', en: 'Center' },
          { v: 'flex-end', es: 'Final', en: 'End' },
          { v: 'stretch', es: 'Estirar', en: 'Stretch' }
        ], es: 'Alineación', en: 'Align' }
      ]
    },
    style_gap: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Separación (gap)', desc: 'Espacio entre hijos en flex/grid.' },
      en: { name: 'Gap', desc: 'Space between children in flex/grid.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'val', type: 'text', placeholder: '8px', es: 'Valor', en: 'Value' }
      ]
    },
    style_text_align: {
      cat: 'css', sub: 'look', container: false,
      es: { name: 'Alinear texto', desc: 'text-align del elemento.' },
      en: { name: 'Text align', desc: 'Element text-align.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'align', type: 'select', options: [
          { v: 'left', es: 'Izquierda', en: 'Left' },
          { v: 'center', es: 'Centro', en: 'Center' },
          { v: 'right', es: 'Derecha', en: 'Right' }
        ], es: 'Alineación', en: 'Align' }
      ]
    },
    style_shadow: {
      cat: 'css', sub: 'look', container: false,
      es: { name: 'Sombra', desc: 'box-shadow suave predefinida.' },
      en: { name: 'Shadow', desc: 'Soft predefined box-shadow.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' }
      ]
    },
    recipe_counter: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Crear contador', desc: 'Receta: variable + etiqueta + botones +1/−1 (estructura legible).' },
      en: { name: 'Create counter', desc: 'Recipe: variable + label + +1/−1 buttons (readable structure).' },
      params: [
        { key: 'labelId', type: 'element', es: 'Id etiqueta', en: 'Label id' },
        { key: 'varName', type: 'var', es: 'Variable contador', en: 'Counter variable' }
      ]
    },
    recipe_toast_save: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Guardar y avisar', desc: 'Guarda un valor en storage y muestra un toast de confirmación.' },
      en: { name: 'Save and notify', desc: 'Stores a value and shows a confirmation toast.' },
      params: [
        { key: 'key', type: 'text', placeholder: 'dato', es: 'Clave', en: 'Key' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' },
        { key: 'msg', type: 'value', es: 'Mensaje', en: 'Message' }
      ]
    },

    /* ===== Matriz no-code lote completo ===== */
    cmp_footer: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear pie', desc: 'Crear pie con estilo listo.' },
      en: { name: 'Create footer', desc: 'Create footer with ready styling.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_navbar: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear barra de navegación', desc: 'Crear barra de navegación con estilo listo.' },
      en: { name: 'Create navbar', desc: 'Create navbar with ready styling.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_chip: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear chip', desc: 'Crear chip con estilo listo.' },
      en: { name: 'Create chip', desc: 'Create chip with ready styling.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_banner: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear banner', desc: 'Crear banner con estilo listo.' },
      en: { name: 'Create banner', desc: 'Create banner with ready styling.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_skeleton: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear skeleton', desc: 'Crear skeleton con estilo listo.' },
      en: { name: 'Create skeleton', desc: 'Create skeleton with ready styling.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_tooltip: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear tooltip', desc: 'Crear tooltip con estilo listo.' },
      en: { name: 'Create tooltip', desc: 'Create tooltip with ready styling.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_stat: {
      cat: 'components', sub: 'basic', container: false,
      es: { name: 'Crear tarjeta estadística', desc: 'Crear tarjeta estadística con estilo listo.' },
      en: { name: 'Create stat card', desc: 'Create stat card with ready styling.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    cmp_modal: {
      cat: 'components', sub: 'layout', container: false,
      es: { name: 'Crear modal', desc: 'Contenedor modal oculto; ábrelo con Navegación → Abrir modal.' },
      en: { name: 'Create modal', desc: 'Hidden modal container; open with Navigation → Open modal.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'text', type: 'value', es: 'Contenido inicial', en: 'Initial content' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_field_password: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Campo contraseña', desc: 'Campo de formulario tipo password.' },
      en: { name: 'Password field', desc: 'Form field of type password.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_field_date: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Campo fecha', desc: 'Campo de formulario tipo date.' },
      en: { name: 'Date field', desc: 'Form field of type date.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_field_time: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Campo hora', desc: 'Campo de formulario tipo time.' },
      en: { name: 'Time field', desc: 'Form field of type time.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_search: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Buscador', desc: 'Campo de formulario tipo search.' },
      en: { name: 'Search field', desc: 'Form field of type search.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_switch: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Interruptor', desc: 'Checkbox estilizado como interruptor (usa checkbox nativo).' },
      en: { name: 'Switch', desc: 'Checkbox styled as a switch (native checkbox).' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_slider: {
      cat: 'forms', sub: 'fields', container: false,
      es: { name: 'Deslizador', desc: 'Input range 0–100.' },
      en: { name: 'Slider', desc: 'Range input 0–100.' },
      params: [
        { key: 'id', type: 'element', es: 'Id (#)', en: 'Id (#)' },
        { key: 'label', type: 'text', es: 'Etiqueta', en: 'Label' },
        { key: 'parent', type: 'element', es: 'Dentro de (#, opcional)', en: 'Inside (#, optional)' }
      ]
    },
    form_disable: {
      cat: 'forms', sub: 'data', container: false,
      es: { name: 'Desactivar campos', desc: 'Deshabilita los campos listados.' },
      en: { name: 'Disable fields', desc: 'Disables the listed fields.' },
      params: [
        { key: 'ids', type: 'text', es: 'Ids (a,b,c)', en: 'Ids (a,b,c)' }
      ]
    },
    form_enable: {
      cat: 'forms', sub: 'data', container: false,
      es: { name: 'Activar campos', desc: 'Habilita los campos listados.' },
      en: { name: 'Enable fields', desc: 'Enables the listed fields.' },
      params: [
        { key: 'ids', type: 'text', es: 'Ids (a,b,c)', en: 'Ids (a,b,c)' }
      ]
    },
    nav_tab_show: {
      cat: 'navigation', sub: 'tabs', container: false,
      es: { name: 'Mostrar pestaña', desc: 'Muestra un panel de pestaña y oculta hermanos con clase wcs-tab.' },
      en: { name: 'Show tab', desc: 'Shows a tab panel and hides siblings with class wcs-tab.' },
      params: [
        { key: 'id', type: 'element', es: 'Id panel', en: 'Panel id' }
      ]
    },
    nav_drawer_open: {
      cat: 'navigation', sub: 'drawers', container: false,
      es: { name: 'Abrir panel lateral', desc: 'Muestra un panel lateral (drawer).' },
      en: { name: 'Open drawer', desc: 'Shows a side drawer panel.' },
      params: [
        { key: 'id', type: 'element', es: 'Id drawer', en: 'Drawer id' }
      ]
    },
    nav_drawer_close: {
      cat: 'navigation', sub: 'drawers', container: false,
      es: { name: 'Cerrar panel lateral', desc: 'Oculta el panel lateral.' },
      en: { name: 'Close drawer', desc: 'Hides the side drawer.' },
      params: [
        { key: 'id', type: 'element', es: 'Id drawer', en: 'Drawer id' }
      ]
    },
    data_find_record: {
      cat: 'data', sub: 'query', container: false,
      es: { name: 'Buscar registro por campo', desc: 'Primer registro donde campo == valor.' },
      en: { name: 'Find record by field', desc: 'First record where field == value.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'collection', type: 'text', es: 'Colección', en: 'Collection' },
        { key: 'field', type: 'text', placeholder: 'nombre', es: 'Campo', en: 'Field' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    data_clear_collection: {
      cat: 'data', sub: 'collections', container: false,
      es: { name: 'Vaciar colección', desc: 'Elimina todos los registros de la colección.' },
      en: { name: 'Clear collection', desc: 'Removes all records from the collection.' },
      params: [
        { key: 'collection', type: 'text', es: 'Colección', en: 'Collection' }
      ]
    },
    a11y_label: {
      cat: 'accessibility', sub: 'attrs', container: false,
      es: { name: 'Etiqueta accesible', desc: 'aria-label del elemento.' },
      en: { name: 'Accessible label', desc: 'Element aria-label.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'text', type: 'value', es: 'Etiqueta', en: 'Label' }
      ]
    },
    a11y_alt: {
      cat: 'accessibility', sub: 'attrs', container: false,
      es: { name: 'Texto alternativo', desc: 'alt de una imagen.' },
      en: { name: 'Alt text', desc: 'Image alt attribute.' },
      params: [
        { key: 'id', type: 'element', es: 'Imagen (#id)', en: 'Image (#id)' },
        { key: 'text', type: 'value', es: 'Texto alt', en: 'Alt text' }
      ]
    },
    a11y_announce: {
      cat: 'accessibility', sub: 'live', container: false,
      es: { name: 'Anunciar mensaje', desc: 'Mensaje para lectores de pantalla (aria-live).' },
      en: { name: 'Announce message', desc: 'Screen-reader announcement (aria-live).' },
      params: [
        { key: 'text', type: 'value', es: 'Mensaje', en: 'Message' }
      ]
    },
    a11y_reduce_motion: {
      cat: 'accessibility', sub: 'prefs', container: false,
      es: { name: '¿Reducir animaciones?', desc: 'true si el usuario pide menos movimiento.' },
      en: { name: 'Reduce motion?', desc: 'true if the user prefers reduced motion.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' }
      ]
    },
    str_words: {
      cat: 'text', sub: 'transform', container: false,
      es: { name: 'Contar palabras', desc: 'Número de palabras en el texto.' },
      en: { name: 'Word count', desc: 'Number of words in the text.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' }
      ]
    },
    str_char_at: {
      cat: 'text', sub: 'transform', container: false,
      es: { name: 'Obtener carácter', desc: 'Carácter en la posición (0…).' },
      en: { name: 'Get character', desc: 'Character at index (0…).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' },
        { key: 'index', type: 'value', es: 'Índice', en: 'Index' }
      ]
    },
    str_compare_ignore_case: {
      cat: 'text', sub: 'search', container: false,
      es: { name: 'Comparar ignorando mayúsculas', desc: 'true si los textos son iguales sin importar mayúsculas.' },
      en: { name: 'Compare ignore case', desc: 'true if texts are equal ignoring case.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'a', type: 'value', es: 'Texto A', en: 'Text A' },
        { key: 'b', type: 'value', es: 'Texto B', en: 'Text B' }
      ]
    },
    logic_is_text: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: '¿Es texto?', desc: 'true si el valor es string.' },
      en: { name: 'Is text?', desc: 'true if value is a string.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    logic_is_list: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: '¿Es lista?', desc: 'true si el valor es un array.' },
      en: { name: 'Is list?', desc: 'true if value is an array.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    logic_is_object: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: '¿Es objeto?', desc: 'true si es objeto (no lista).' },
      en: { name: 'Is object?', desc: 'true if object (not list).' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    logic_exists: {
      cat: 'logic', sub: 'boolean', container: false,
      es: { name: '¿Existe?', desc: 'true si el valor no es null ni undefined.' },
      en: { name: 'Exists?', desc: 'true if value is not null/undefined.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'value', type: 'value', es: 'Valor', en: 'Value' }
      ]
    },
    game_restart: {
      cat: 'game', sub: 'loop', container: false,
      es: { name: 'Reiniciar variables de juego', desc: 'Pone puntuación y vidas a valores dados.' },
      en: { name: 'Restart game vars', desc: 'Sets score and lives to given values.' },
      params: [
        { key: 'score', type: 'var', es: 'Variable puntos', en: 'Score variable' },
        { key: 'lives', type: 'var', es: 'Variable vidas', en: 'Lives variable' },
        { key: 'scoreVal', type: 'value', es: 'Puntos iniciales', en: 'Initial score' },
        { key: 'livesVal', type: 'value', es: 'Vidas iniciales', en: 'Initial lives' }
      ]
    },
    game_win: {
      cat: 'game', sub: 'loop', container: false,
      es: { name: 'Victoria', desc: 'Marca bandera de victoria y opcionalmente muestra texto en un elemento.' },
      en: { name: 'Win', desc: 'Sets win flag and optionally shows text on an element.' },
      params: [
        { key: 'flag', type: 'var', es: 'Variable victoria', en: 'Win variable' },
        { key: 'id', type: 'element', es: 'Elemento mensaje (opc.)', en: 'Message element (opt.)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' }
      ]
    },
    game_over: {
      cat: 'game', sub: 'loop', container: false,
      es: { name: 'Game Over', desc: 'Marca bandera de fin de partida.' },
      en: { name: 'Game Over', desc: 'Sets game-over flag.' },
      params: [
        { key: 'flag', type: 'var', es: 'Variable fin', en: 'End variable' },
        { key: 'id', type: 'element', es: 'Elemento mensaje (opc.)', en: 'Message element (opt.)' },
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' }
      ]
    },
    game_floating_text: {
      cat: 'game', sub: 'fx', container: false,
      es: { name: 'Texto flotante', desc: 'Muestra un texto temporal sobre la página (toast-like).' },
      en: { name: 'Floating text', desc: 'Shows temporary floating text (toast-like).' },
      params: [
        { key: 'text', type: 'value', es: 'Texto', en: 'Text' }
      ]
    },
    canvas_point: {
      cat: 'canvas', sub: 'draw', container: false,
      es: { name: 'Punto en canvas', desc: 'Dibuja un punto (círculo pequeño).' },
      en: { name: 'Canvas point', desc: 'Draws a point (small circle).' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'x', type: 'value', es: 'X', en: 'X' },
        { key: 'y', type: 'value', es: 'Y', en: 'Y' },
        { key: 'color', type: 'color', def: '#111', es: 'Color', en: 'Color' },
        { key: 'r', type: 'number', placeholder: '2', es: 'Radio', en: 'Radius' }
      ]
    },
    canvas_arc: {
      cat: 'canvas', sub: 'draw', container: false,
      es: { name: 'Arco en canvas', desc: 'Dibuja un arco.' },
      en: { name: 'Canvas arc', desc: 'Draws an arc.' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'x', type: 'value', es: 'X', en: 'X' },
        { key: 'y', type: 'value', es: 'Y', en: 'Y' },
        { key: 'r', type: 'value', es: 'Radio', en: 'Radius' },
        { key: 'color', type: 'color', def: '#111', es: 'Color', en: 'Color' }
      ]
    },
    canvas_save: {
      cat: 'canvas', sub: 'style', container: false,
      es: { name: 'Guardar estado canvas', desc: 'ctx.save().' },
      en: { name: 'Save canvas state', desc: 'ctx.save().' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' }
      ]
    },
    canvas_restore: {
      cat: 'canvas', sub: 'style', container: false,
      es: { name: 'Restaurar estado canvas', desc: 'ctx.restore().' },
      en: { name: 'Restore canvas state', desc: 'ctx.restore().' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' }
      ]
    },
    canvas_alpha: {
      cat: 'canvas', sub: 'style', container: false,
      es: { name: 'Opacidad del canvas', desc: 'globalAlpha 0–1.' },
      en: { name: 'Canvas opacity', desc: 'globalAlpha 0–1.' },
      params: [
        { key: 'id', type: 'element', es: 'Canvas (#id)', en: 'Canvas (#id)' },
        { key: 'val', type: 'number', placeholder: '0.5', es: 'Opacidad', en: 'Opacity' }
      ]
    },
    recipe_todo: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Añadir a lista de tareas', desc: 'Añade el texto como <li> a una lista.' },
      en: { name: 'Add todo item', desc: 'Appends text as <li> to a list.' },
      params: [
        { key: 'listId', type: 'element', es: 'Id lista (ul)', en: 'List id (ul)' },
        { key: 'text', type: 'value', es: 'Texto tarea', en: 'Todo text' }
      ]
    },
    recipe_quiz_score: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Sumar acierto de quiz', desc: 'Suma puntos y actualiza etiqueta de puntuación.' },
      en: { name: 'Add quiz point', desc: 'Adds score and updates score label.' },
      params: [
        { key: 'varName', type: 'var', es: 'Variable puntos', en: 'Score variable' },
        { key: 'delta', type: 'value', es: 'Puntos', en: 'Points' },
        { key: 'labelId', type: 'element', es: 'Id etiqueta', en: 'Label id' }
      ]
    },
    recipe_raffle: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Sortear de lista', desc: 'Elige un elemento aleatorio de una lista y lo guarda.' },
      en: { name: 'Raffle from list', desc: 'Picks a random list item into a variable.' },
      params: [
        { key: 'list', type: 'var', es: 'Variable lista', en: 'List variable' },
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' }
      ]
    },
    recipe_dice: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Tirar dado', desc: 'Guarda un número aleatorio entre 1 y caras.' },
      en: { name: 'Roll dice', desc: 'Stores a random number from 1 to sides.' },
      params: [
        { key: 'name', type: 'var', es: 'Variable destino', en: 'Target variable' },
        { key: 'sides', type: 'value', es: 'Caras', en: 'Sides' }
      ]
    },
    recipe_timer_tick: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Tick de temporizador', desc: 'Resta 1 a una variable y actualiza etiqueta; opcional si llega a 0.' },
      en: { name: 'Timer tick', desc: 'Subtracts 1 from a variable and updates label.' },
      params: [
        { key: 'varName', type: 'var', es: 'Variable segundos', en: 'Seconds variable' },
        { key: 'labelId', type: 'element', es: 'Id etiqueta', en: 'Label id' }
      ]
    },
    recipe_expenses_add: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Añadir gasto', desc: 'Suma un monto a total y lo muestra.' },
      en: { name: 'Add expense', desc: 'Adds an amount to total and displays it.' },
      params: [
        { key: 'total', type: 'var', es: 'Variable total', en: 'Total variable' },
        { key: 'amount', type: 'value', es: 'Monto', en: 'Amount' },
        { key: 'labelId', type: 'element', es: 'Id etiqueta', en: 'Label id' }
      ]
    },
    recipe_scoreboard: {
      cat: 'recipes', sub: 'apps', container: false,
      es: { name: 'Actualizar marcador', desc: 'Envía puntuación por webxdc y actualiza etiqueta local.' },
      en: { name: 'Update scoreboard', desc: 'Sends score via webxdc and updates local label.' },
      params: [
        { key: 'score', type: 'value', es: 'Puntos', en: 'Score' },
        { key: 'labelId', type: 'element', es: 'Id etiqueta', en: 'Label id' },
        { key: 'info', type: 'value', es: 'Texto visible', en: 'Visible text' }
      ]
    },
    style_width: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Ancho', desc: 'width del elemento.' },
      en: { name: 'Width', desc: 'Element width.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'val', type: 'text', placeholder: '100%', es: 'Valor', en: 'Value' }
      ]
    },
    style_height: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Alto', desc: 'height del elemento.' },
      en: { name: 'Height', desc: 'Element height.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'val', type: 'text', placeholder: '40px', es: 'Valor', en: 'Value' }
      ]
    },
    style_font_weight: {
      cat: 'css', sub: 'look', container: false,
      es: { name: 'Grosor de letra', desc: 'font-weight.' },
      en: { name: 'Font weight', desc: 'font-weight.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'val', type: 'select', options: [{ v: '400', es: 'Normal', en: 'Normal' }, { v: '600', es: 'Semi-negrita', en: 'Semibold' }, { v: '700', es: 'Negrita', en: 'Bold' }], es: 'Grosor', en: 'Weight' }
      ]
    },
    style_overflow: {
      cat: 'css', sub: 'layout', container: false,
      es: { name: 'Desbordamiento', desc: 'overflow del elemento.' },
      en: { name: 'Overflow', desc: 'Element overflow.' },
      params: [
        { key: 'id', type: 'element', es: 'Elemento (#id)', en: 'Element (#id)' },
        { key: 'val', type: 'select', options: [{ v: 'auto', es: 'Auto', en: 'Auto' }, { v: 'hidden', es: 'Oculto', en: 'Hidden' }, { v: 'scroll', es: 'Scroll', en: 'Scroll' }], es: 'Modo', en: 'Mode' }
      ]
    }
  };

  const CATS = [
    { id: 'basics', es: 'Básicos', en: 'Basics', icon: 'star' },
    { id: 'html', es: 'Página (HTML)', en: 'Page (HTML)', icon: 'pages' },
    { id: 'css', es: 'Estilo (CSS)', en: 'Style (CSS)', icon: 'palette' },
    { id: 'components', es: 'Piezas en runtime', en: 'Runtime widgets', icon: 'blocks' },
    { id: 'forms', es: 'Formularios', en: 'Forms', icon: 'list' },
    { id: 'navigation', es: 'Navegación', en: 'Navigation', icon: 'globe' },
    { id: 'logic', es: 'Variables y lógica', en: 'Variables & logic', icon: 'fn' },
    { id: 'lists', es: 'Listas', en: 'Lists', icon: 'list' },
    { id: 'text', es: 'Texto', en: 'Text', icon: 'file' },
    { id: 'math', es: 'Matemáticas', en: 'Math', icon: 'plus' },
    { id: 'data', es: 'Datos', en: 'Data', icon: 'db' },
    { id: 'timers', es: 'Tiempo', en: 'Time', icon: 'wait' },
    { id: 'ui', es: 'UI simple', en: 'Simple UI', icon: 'phone' },
    { id: 'audio', es: 'Sonido', en: 'Sound', icon: 'audio' },
    { id: 'canvas', es: 'Dibujo (canvas)', en: 'Drawing (canvas)', icon: 'pencil' },
    { id: 'game', es: 'Juego', en: 'Game', icon: 'play' },
    { id: 'storage', es: 'Guardar datos', en: 'Store data', icon: 'db' },
    { id: 'dialogs', es: 'Diálogos', en: 'Dialogs', icon: 'chat' },
    { id: 'webxdc', es: 'Webxdc', en: 'Webxdc', icon: 'radioOn' },
    { id: 'recipes', es: 'Recetas', en: 'Recipes', icon: 'book' },
    { id: 'accessibility', es: 'Accesibilidad', en: 'Accessibility', icon: 'users' },
    { id: 'advanced', es: 'Avanzado', en: 'Advanced', icon: 'gear' },
    { id: 'events', es: 'Eventos', en: 'Events', icon: 'bolt' }
  ];

  /* ------------------------------------------------------------------ *
   * Utilidades del modelo
   * ------------------------------------------------------------------ */
  function newModel() {
    return {
      version: 2,
      vars: [],
      contexts: {
        onStart: [], onUpdate: [], onClick: [], onChange: [], onTouch: [],
        functions: []   /* [{ target: 'nombre', blocks: [] }] */
      }
    };
  }

  function normalizeModel(model) {
    const m = model && typeof model === 'object' ? model : newModel();
    if (!Array.isArray(m.vars)) m.vars = [];
    m.vars = m.vars.filter(function (v) { return v && U.isVarName(v.name); });
    const c = m.contexts || {};
    m.contexts = {
      onStart: Array.isArray(c.onStart) ? c.onStart : [],
      onUpdate: Array.isArray(c.onUpdate) ? c.onUpdate : [],
      onClick: Array.isArray(c.onClick) ? c.onClick : [],
      onChange: Array.isArray(c.onChange) ? c.onChange : [],
      onTouch: Array.isArray(c.onTouch) ? c.onTouch : [],
      functions: Array.isArray(c.functions) ? c.functions : []
    };
    m.contexts.onClick = m.contexts.onClick.filter(function (t) { return t && U.isElementId(t.target) && Array.isArray(t.blocks); });
    m.contexts.onChange = m.contexts.onChange.filter(function (t) { return t && U.isElementId(t.target) && Array.isArray(t.blocks); });
    m.contexts.onTouch = m.contexts.onTouch.filter(function (t) { return t && U.isElementId(t.target) && Array.isArray(t.blocks); });
    m.contexts.functions = m.contexts.functions.filter(function (t) { return t && U.isVarName(t.target) && Array.isArray(t.blocks); });
    m.version = 2;
    return m;
  }

  function newBlock(type) {
    const def = DEFS[type];
    if (!def) return null;
    const params = {};
    def.params.forEach(function (p) {
      if (p.type === 'value') params[p.key] = { kind: 'text', value: '' };
      else if (p.type === 'select') params[p.key] = p.options[0].v;
      else if (p.type === 'color') params[p.key] = p.def || '#4f46e5';
      else params[p.key] = '';
    });
    const b = { id: U.uid(), type: type, params: params };
    if (def.container) b.children = [];
    return b;
  }

  /* Recorre recursivamente todos los bloques de un array (incluye hijos). */
  function walkBlocks(blocks, fn) {
    (blocks || []).forEach(function (b) {
      if (!b || !b.type) return;
      fn(b);
      walkBlocks(b.children, fn);
      walkBlocks(b.childrenElse, fn);
    });
  }

  function allContextArrays(m) {
    const arrs = [m.contexts.onStart, m.contexts.onUpdate];
    m.contexts.onClick.forEach(function (t) { arrs.push(t.blocks); });
    m.contexts.onChange.forEach(function (t) { arrs.push(t.blocks); });
    m.contexts.onTouch.forEach(function (t) { arrs.push(t.blocks); });
    m.contexts.functions.forEach(function (t) { arrs.push(t.blocks); });
    return arrs;
  }

  /* Nombres de temporizadores declarados con every_ms (para el stop_timer). */
  function collectTimerNames(model) {
    const names = new Set();
    allContextArrays(model).forEach(function (arr) {
      walkBlocks(arr, function (b) {
        if (b.type === 'every_ms' && U.isVarName(b.params && b.params.name)) names.add(b.params.name);
      });
    });
    return Array.from(names);
  }

  /* ------------------------------------------------------------------ *
   * CODEGEN — genera JavaScript legible
   * ------------------------------------------------------------------ */

  /* Expression for a value { kind: text|number|var|input, ... } */
  function valueExpr(v, ctx) {
    v = v || {};
    if (v.kind === 'var') {
      if (ctx.vars.indexOf(v.name) >= 0) return v.name;
      return null;
    }
    if (v.kind === 'number') {
      const n = Number(v.value);
      return isFinite(n) ? String(n) : null;
    }
    if (v.kind === 'input') {
      if (!U.isElementId(v.id)) return null;
      return "document.getElementById('" + v.id + "').value";
    }
    /* text */
    return JSON.stringify(String(v.value == null ? '' : v.value));
  }

  function numberParam(b, key) {
    const n = Number(b.params && b.params[key]);
    return isFinite(n) ? n : null;
  }

  function isHexColor(c) { return /^#[0-9a-fA-F]{3,8}$/.test(String(c || '')); }
  function isClassName(c) { return /^[-\w]{1,40}$/.test(String(c || '')); }
  function isAttrName(a) { return /^[\w-]{1,30}$/.test(String(a || '')); }
  function storageKey(k) { return /^[\w.-]{1,40}$/.test(String(k || '')); }
  function safeAssetPath(p) {
    const s = String(p || '').trim();
    return s && s.length <= 120 && !/['"\\]/.test(s) && !/\.\./.test(s) ? s : null;
  }
  function cssSize(s) {
    const v = String(s || '').trim();
    if (v === 'auto') return 'auto';
    if (!/^[\d.]+(px|%)?$/.test(v) || v === '.') return null;
    return /px|%$/.test(v) ? v : v + 'px';
  }
  function valKindIn(v, arr) { return arr.some(function (o) { return o.v === v; }); }

  function idParam(b) {
    const id = b.params && b.params.id;
    return U.isElementId(id) ? id : null;
  }

  function varParam(b, ctx, key) {
    const name = b.params && b.params[(key || 'name')];
    return ctx.vars.indexOf(name) >= 0 ? name : null;
  }

  /* Generate lines for a block (with indentation). Returns
     { lines: [...], problems: [...], helpers: Set, valid } */
  function genBlock(b, ctx, indent) {
    const pad = '  '.repeat(indent);
    const out = [];
    const problems = [];
    const helpers = new Set();
    const def = DEFS[b.type];
    if (!def) {
      out.push(pad + '/* bloque desconocido: ' + b.type + ' */');
      problems.push({ id: b.id, type: b.type, reason: 'unknown' });
      return { lines: out, problems, helpers };
    }
    let ok = true;

    /* Emit child blocks (then or else branch) with indentation. */
    const emit = function (list) {
      const res = genBlocks(list || [], ctx, indent + 1);
      res.helpers.forEach(function (h) { helpers.add(h); });
      res.problems.forEach(function (p2) { problems.push(p2); });
      return res.lines;
    };

    switch (b.type) {
      case 'set_text': {
        const id = idParam(b); const val = valueExpr(b.params.value, ctx);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        if (!val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'value' }); }
        if (ok) out.push(pad + "document.getElementById('" + id + "').textContent = " + val + ';');
        break;
      }
      case 'set_html': {
        const id = idParam(b); const val = valueExpr(b.params.value, ctx);
        if (!id || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: id ? 'value' : 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').innerHTML = " + val + ';');
        break;
      }
      case 'set_style': {
        const id = idParam(b); const prop = String(b.params.prop || '').trim();
        const val = String(b.params.val || '').trim();
        if (!id || !/^-?[a-zA-Z-]+$/.test(prop) || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.setProperty('" + prop + "', '" + val.replace(/'/g, "\\'") + "');");
        break;
      }
      case 'show': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.display = '';");
        break;
      }
      case 'hide': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.display = 'none';");
        break;
      }
      case 'toast': {
        const val = valueExpr(b.params.value, ctx);
        if (!val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'value' }); }
        else { out.push(pad + 'toast(' + val + ');'); helpers.add('toast'); }
        break;
      }
      case 'delay': {
        const ms = numberParam(b, 'ms');
        if (ms === null || ms < 0) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'ms' }); }
        else { out.push(pad + 'await sleep(' + Math.floor(ms) + ');'); helpers.add('sleep'); }
        break;
      }
      case 'comment': {
        out.push(pad + '/* ' + String(b.params.text || '').replace(/\*\//g, '*\u200b/') + ' */');
        break;
      }
      case 'set_var': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else if (!val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'value' }); }
        else out.push(pad + name + ' = ' + val + ';');
        break;
      }
      case 'change_var': {
        const name = varParam(b, ctx); const d = numberParam(b, 'delta');
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else if (d === null) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'delta' }); }
        else out.push(pad + name + ' = ' + name + (d < 0 ? ' - ' + Math.abs(d) : ' + ' + d) + ';');
        break;
      }
      case 'if_var': {
        const name = varParam(b, ctx);
        const op = b.params.op; const val = valueExpr(b.params.value, ctx);
        if (!name || OPS.every(function (o) { return o.v !== op; }) || !val) {
          ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' });
        } else {
          out.push(pad + 'if (' + name + ' ' + op + ' ' + val + ') {');
          const res = genBlocks(b.children || [], ctx, indent + 1);
          res.helpers.forEach(function (h) { helpers.add(h); });
          res.problems.forEach(function (p2) { problems.push(p2); });
          out.push.apply(out, res.lines);
          out.push(pad + '}');
        }
        break;
      }
      case 'repeat': {
        const n = numberParam(b, 'times');
        if (n === null || n < 1 || n > 1000) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'times' }); }
        else {
          out.push(pad + 'for (let i = 0; i < ' + Math.floor(n) + '; i++) {');
          const res = genBlocks(b.children || [], ctx, indent + 1);
          res.helpers.forEach(function (h) { helpers.add(h); });
          res.problems.forEach(function (p2) { problems.push(p2); });
          out.push.apply(out, res.lines);
          out.push(pad + '}');
        }
        break;
      }
      case 'random_var': {
        const name = varParam(b, ctx);
        const mn = numberParam(b, 'min'); const mx = numberParam(b, 'max');
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else if (mn === null || mx === null || mx < mn) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'range' }); }
        else out.push(pad + name + ' = Math.floor(Math.random() * (' + Math.floor(mx) + ' - ' + Math.floor(mn) + ' + 1)) + ' + Math.floor(mn) + ';');
        break;
      }
      case 'math_clamp': {
        const into = varParam(b, ctx, 'into');
        const x = valueExpr(b.params.x, ctx);
        const mn = numberParam(b, 'mn'); const mx = numberParam(b, 'mx');
        if (!into || !x) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else if (mn === null || mx === null || mx < mn) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'range' }); }
        else out.push(pad + into + ' = Math.min(Math.max(Number(' + x + '), ' + Math.floor(mn) + '), ' + Math.floor(mx) + ');');
        break;
      }
      case 'round_var': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else out.push(pad + name + ' = Math.round(' + name + ');');
        break;
      }
      case 'math_expr': {
        const name = varParam(b, ctx); const expr = String(b.params.expr || '').trim();
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else if (!expr || expr.length > 120 || /[;{}]/.test(expr)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'expr' }); }
        else out.push(pad + name + ' = (' + expr + ');');
        break;
      }
      case 'set_input_value': {
        const id = idParam(b); const val = valueExpr(b.params.value, ctx);
        if (!id || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: id ? 'value' : 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').value = " + val + ';');
        break;
      }
      case 'add_list_item': {
        const id = idParam(b); const val = valueExpr(b.params.value, ctx);
        if (!id || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: id ? 'value' : 'id' }); }
        else { out.push(pad + "addListItem('" + id + "', " + val + ');'); helpers.add('addListItem'); }
        break;
      }
      case 'vibrate': {
        const ms = numberParam(b, 'ms');
        if (ms === null || ms < 1 || ms > 10000) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'range' }); }
        else out.push(pad + 'try { if (navigator.vibrate) navigator.vibrate(' + Math.floor(ms) + '); } catch (e) {}');
        break;
      }
      case 'set_page_title': {
        const val = valueExpr(b.params.value, ctx);
        if (!val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'value' }); }
        else out.push(pad + 'document.title = String(' + val + ');');
        break;
      }
      case 'clear_element': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + '{');
          out.push(pad + '  const el = ' + "document.getElementById('" + id + "');");
          out.push(pad + '  while (el.firstChild) el.removeChild(el.firstChild);');
          out.push(pad + '}');
        }
        break;
      }
      case 'send_update': {
        const key = String(b.params.key || '').trim();
        const val = valueExpr(b.params.value, ctx);
        const info = String(b.params.info || '').trim();
        const summ = String(b.params.summary || '').trim();
        const esc = function (s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
        if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(key)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'key' }); }
        else if (!val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'value' }); }
        else {
          out.push(pad + 'if (window.webxdc) {');
          out.push(pad + '  window.webxdc.sendUpdate({');
          out.push(pad + '    payload: { ' + key + ': ' + val + ' },' + (info ? " info: '" + esc(info) + "'," : ''));
          out.push(pad + "    summary: '" + (summ ? esc(summ) + "'" : key + ": ' + " + (b.params.value && b.params.value.kind === 'var' ? b.params.value.name : val)));
          out.push(pad + "  }, '');");
          out.push(pad + '} else {');
          out.push(pad + "  console.warn('webxdc not available (preview?)');");
          out.push(pad + '}');
        }
        break;
      }
      case 'send_to_chat': {
        const val = valueExpr(b.params.text, ctx);
        if (!val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'text' }); }
        else {
          out.push(pad + 'if (window.webxdc && typeof window.webxdc.sendToChat === "function") {');
          out.push(pad + '  window.webxdc.sendToChat({ text: String(' + val + ') });');
          out.push(pad + '} else {');
          out.push(pad + "  console.warn('sendToChat not available');");
          out.push(pad + '}');
        }
        break;
      }
      case 'import_files': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else {
          out.push(pad + 'if (window.webxdc && typeof window.webxdc.importFiles === "function") {');
          out.push(pad + '  ' + name + ' = await window.webxdc.importFiles({});');
          out.push(pad + '} else {');
          out.push(pad + '  ' + name + ' = [];');
          out.push(pad + "  console.warn('importFiles not available');");
          out.push(pad + '}');
        }
        break;
      }
      case 'update_info': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else out.push(pad + name + " = String((update && update.info) || '');");
        break;
      }
      case 'update_serial': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else out.push(pad + name + ' = (update && update.serial) || 0;');
        break;
      }
      case 'read_update': {
        const name = varParam(b, ctx); const key = String(b.params.key || '').trim();
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(key)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'key' }); }
        else {
          out.push(pad + "if (update.payload && update.payload['" + key + "'] !== undefined) {");
          out.push(pad + '  ' + name + " = update.payload['" + key + "'];");
          out.push(pad + '}');
        }
        break;
      }
      case 'set_var_self_name': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else out.push(pad + name + " = (window.webxdc && window.webxdc.selfName) || 'me';");
        break;
      }
      /* ---------------- Page (HTML) ---------------- */
      case 'create_element': {
        const tag = b.params.tag;
        const id = b.params.id;
        const parent = b.params.parent;
        const text = valueExpr(b.params.text, ctx);
        if (!valKindIn(tag, TAG_OPTIONS)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'tag' }); }
        else if ((id && !U.isElementId(id)) || (parent && !U.isElementId(parent))) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          const opts = [];
          if (id) opts.push("id: '" + id + "'");
          if (text && text !== '""') opts.push('text: ' + text);
          if (parent) opts.push("parent: '" + parent + "'");
          out.push(pad + "wcsCreate('" + tag + "', { " + opts.join(', ') + ' });');
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'create_image': {
        const id = b.params.id;
        const src = safeAssetPath(b.params.src);
        const parent = b.params.parent;
        if (!src) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'src' }); }
        else if ((id && !U.isElementId(id)) || (parent && !U.isElementId(parent))) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          const opts = ["src: '" + src + "'"];
          if (id) opts.push("id: '" + id + "'");
          if (parent) opts.push("parent: '" + parent + "'");
          out.push(pad + "wcsCreate('img', { " + opts.join(', ') + ' });');
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'remove_element': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + '{');
          out.push(pad + "  const el = document.getElementById('" + id + "');");
          out.push(pad + '  if (el) el.remove();');
          out.push(pad + '}');
        }
        break;
      }
      case 'set_attribute': {
        const id = idParam(b);
        const attr = b.params.attr;
        const val = String(b.params.val == null ? '' : b.params.val);
        if (!id || !isAttrName(attr)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').setAttribute('" + attr + "', " + JSON.stringify(val) + ');');
        break;
      }
      case 'set_image': {
        const id = idParam(b);
        const src = safeAssetPath(b.params.src);
        if (!id || !src) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + "wcsSetSrc('" + id + "', '" + src + "');"); helpers.add('wcsSetSrc'); }
        break;
      }

      /* ---------------- Estilo (CSS) ---------------- */
      case 'set_bg_color':
      case 'set_text_color': {
        const id = idParam(b);
        const color = b.params.color;
        const prop = b.type === 'set_bg_color' ? 'background-color' : 'color';
        if (!id || !isHexColor(color)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.setProperty('" + prop + "', '" + color + "');");
        break;
      }
      case 'set_font_size': {
        const id = idParam(b);
        const px = numberParam(b, 'px');
        if (!id || px === null || px < 4 || px > 200) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.setProperty('font-size', '" + Math.round(px) + "px');");
        break;
      }
      case 'set_font_family': {
        const id = idParam(b);
        const stacks = {
          system: 'system-ui, sans-serif',
          rounded: 'ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif',
          serif: 'Georgia, "Times New Roman", serif',
          mono: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
          caps: '"Palatino Linotype", "Book Antiqua", Georgia, serif'
        };
        const fam = stacks[b.params.family] || stacks.system;
        const extra = b.params.family === 'caps' ? "'; el.style.setProperty('letter-spacing', '0.06em'); el.style.setProperty('text-transform', 'uppercase" : '';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "{ const el = document.getElementById('" + id + "'); el.style.setProperty('font-family', '" + fam + extra + "'); }");
        break;
      }
      case 'set_size': {
        const id = idParam(b);
        const w = cssSize(b.params.w);
        const h = cssSize(b.params.h);
        if (!id || !w || !h) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "document.getElementById('" + id + "').style.setProperty('width', '" + w + "');");
          out.push(pad + "document.getElementById('" + id + "').style.setProperty('height', '" + h + "');");
        }
        break;
      }
      case 'add_class':
      case 'remove_class':
      case 'toggle_class': {
        const id = idParam(b);
        const cls = b.params.cls;
        const method = b.type === 'add_class' ? 'add' : (b.type === 'remove_class' ? 'remove' : 'toggle');
        if (!id || !isClassName(cls)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').classList." + method + "('" + cls + "');");
        break;
      }
      case 'animate': {
        const id = idParam(b);
        const anim = b.params.anim;
        if (!id || !valKindIn(anim, ANIM_OPTIONS)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + "wcsAnimate('" + id + "', '" + anim + "');"); helpers.add('wcsAnimate'); }
        break;
      }

      /* ---------------- Listas ---------------- */
      case 'list_new': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else out.push(pad + name + ' = [];');
        break;
      }
      case 'list_push': {
        const name = varParam(b, ctx);
        const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + '.push(' + val + ');');
        break;
      }
      case 'list_get': {
        const into = varParam(b, ctx, 'into');
        const name = varParam(b, ctx);
        const idx = numberParam(b, 'index');
        if (!into || !name || idx === null || idx < 1) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = ' + name + '[' + Math.floor(idx) + ' - 1];');
        break;
      }
      case 'list_length': {
        const into = varParam(b, ctx, 'into');
        const name = varParam(b, ctx);
        if (!into || !name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = ' + name + '.length;');
        break;
      }
      case 'list_remove': {
        const name = varParam(b, ctx);
        const idx = numberParam(b, 'index');
        if (!name || idx === null || idx < 1) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + '.splice(' + Math.floor(idx) + ' - 1, 1);');
        break;
      }
      case 'list_clear': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else out.push(pad + name + ' = [];');
        break;
      }
      case 'list_contains': {
        const into = varParam(b, ctx, 'into');
        const name = varParam(b, ctx);
        const val = valueExpr(b.params.value, ctx);
        if (!into || !name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = ' + name + '.indexOf(' + val + ') >= 0;');
        break;
      }
      case 'list_join': {
        const into = varParam(b, ctx, 'into');
        const name = varParam(b, ctx);
        const sep = valueExpr(b.params.sep, ctx);
        if (!into || !name || !sep) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = ' + name + '.map(String).join(String(' + sep + '));');
        break;
      }
      case 'list_sort': {
        const into = varParam(b, ctx, 'into');
        const name = varParam(b, ctx);
        const az = b.params.order !== 'za';
        if (!into || !name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = ' + name + '.slice().sort()' + (az ? '' : '.reverse()') + ';');
        break;
      }
      case 'list_reverse': {
        const into = varParam(b, ctx, 'into');
        const name = varParam(b, ctx);
        if (!into || !name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = ' + name + '.slice().reverse();');
        break;
      }

      /* ---------------- Texto ---------------- */
      case 'str_case': {
        const into = varParam(b, ctx, 'into');
        const x = valueExpr(b.params.x, ctx);
        const up = b.params.mode !== 'lower';
        if (!into || !x) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = String(' + x + ').' + (up ? 'toUpperCase()' : 'toLowerCase()') + ';');
        break;
      }
      case 'str_trim': {
        const into = varParam(b, ctx, 'into');
        const x = valueExpr(b.params.x, ctx);
        if (!into || !x) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = String(' + x + ').trim();');
        break;
      }
      case 'str_replace': {
        const into = varParam(b, ctx, 'into');
        const x = valueExpr(b.params.x, ctx);
        const find = valueExpr(b.params.find, ctx);
        const rep = valueExpr(b.params.rep, ctx);
        if (!into || !x || !find || !rep) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + " = String(" + x + ").split(String(" + find + ")).join(String(" + rep + "));");
        break;
      }
      case 'str_part': {
        const into = varParam(b, ctx, 'into');
        const x = valueExpr(b.params.x, ctx);
        const start = numberParam(b, 'start');
        const len = numberParam(b, 'len');
        if (!into || !x) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else if (start === null || len === null || start < 1 || len < 1) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'range' }); }
        else out.push(pad + into + ' = String(' + x + ').slice(' + (Math.floor(start) - 1) + ', ' + (Math.floor(start) - 1 + Math.floor(len)) + ');');
        break;
      }
      case 'str_concat': {
        const into = varParam(b, ctx, 'into');
        const a = valueExpr(b.params.a, ctx);
        const bb = valueExpr(b.params.b, ctx);
        if (!into || !a || !bb) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = String(' + a + ') + String(' + bb + ');');
        break;
      }
      case 'str_length': {
        const into = varParam(b, ctx, 'into');
        const x = valueExpr(b.params.x, ctx);
        if (!into || !x) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = String(' + x + ').length;');
        break;
      }

      /* ---------------- Math ---------------- */
      case 'math_op': {
        const into = varParam(b, ctx, 'into');
        const a = valueExpr(b.params.a, ctx);
        const bb = valueExpr(b.params.b, ctx);
        const op = b.params.op;
        if (!into || !a || !bb || !valKindIn(op, ARITH_OPTIONS)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = ' + a + ' ' + op + ' ' + bb + ';');
        break;
      }

      /* ---------------- Tiempo ---------------- */
      case 'every_ms': {
        const nm = b.params.name;
        const ms = numberParam(b, 'ms');
        if (!U.isVarName(nm) || ms === null || ms < 10 || ms > 60000) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + nm + ' = setInterval(async () => {');
          emit(b.children).forEach(function (l) { out.push(l); });
          out.push(pad + '}, ' + Math.floor(ms) + ');');
          out.push(pad + 'wcsTimerIds.push(' + nm + ');');
          helpers.add('wcsTimers');
        }
        break;
      }
      case 'after_ms': {
        const ms = numberParam(b, 'ms');
        if (ms === null || ms < 10 || ms > 60000) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'ms' }); }
        else {
          out.push(pad + 'wcsTimerIds.push(setTimeout(async () => {');
          emit(b.children).forEach(function (l) { out.push(l); });
          out.push(pad + '}, ' + Math.floor(ms) + '));');
          helpers.add('wcsTimers');
        }
        break;
      }
      case 'stop_timer': {
        const nm = b.params.name;
        if (!U.isVarName(nm) || ctx.timers.indexOf(nm) < 0) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'name' }); }
        else out.push(pad + 'clearInterval(' + nm + ');');
        break;
      }

      /* ---------------- Sonido ---------------- */
      case 'play_tone': {
        const freq = numberParam(b, 'freq');
        const ms = numberParam(b, 'ms');
        const wave = b.params.wave;
        let vol = numberParam(b, 'vol');
        if (vol === null) vol = 0.5;
        if (freq === null || freq < 20 || freq > 20000 || ms === null || ms < 30 || ms > 5000 || !valKindIn(wave, WAVE_OPTIONS) || vol < 0 || vol > 1) {
          ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' });
        } else { out.push(pad + 'wcsTone(' + Math.round(freq) + ', ' + Math.round(ms) + ", '" + wave + "', " + vol + ');'); helpers.add('wcsTone'); }
        break;
      }
      case 'play_sound': {
        const src = safeAssetPath(b.params.src);
        let vol = numberParam(b, 'vol');
        if (vol === null) vol = 0.8;
        if (!src || vol < 0 || vol > 1) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + "wcsPlaySound('" + src + "', " + vol + ');'); helpers.add('wcsPlaySound'); }
        break;
      }
      case 'stop_all_sounds': {
        out.push(pad + 'wcsStopSounds();');
        helpers.add('wcsStopSounds');
        break;
      }

      /* ---------------- Dibujo (canvas) ---------------- */
      case 'canvas_clear': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + '{');
          out.push(pad + "  const cv = document.getElementById('" + id + "');");
          out.push(pad + "  if (cv && cv.getContext) { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); }");
          out.push(pad + '}');
        }
        break;
      }
      case 'canvas_rect': {
        const id = idParam(b);
        const x = valueExpr(b.params.x, ctx), y = valueExpr(b.params.y, ctx);
        const w = valueExpr(b.params.w, ctx), h = valueExpr(b.params.h, ctx);
        const color = b.params.color;
        if (!id || !x || !y || !w || !h || !isHexColor(color)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + '{');
          out.push(pad + "  const c = wcsCanvas('" + id + "');");
          out.push(pad + "  if (c) { c.fillStyle = '" + color + "'; c.fillRect(" + x + ', ' + y + ', ' + w + ', ' + h + '); }');
          out.push(pad + '}');
          helpers.add('wcsCanvas');
        }
        break;
      }
      case 'canvas_circle': {
        const id = idParam(b);
        const x = valueExpr(b.params.x, ctx), y = valueExpr(b.params.y, ctx), r = valueExpr(b.params.r, ctx);
        const color = b.params.color;
        if (!id || !x || !y || !r || !isHexColor(color)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + '{');
          out.push(pad + "  const c = wcsCanvas('" + id + "');");
          out.push(pad + "  if (c) { c.fillStyle = '" + color + "'; c.beginPath(); c.arc(" + x + ', ' + y + ', ' + r + ', 0, Math.PI * 2); c.fill(); }');
          out.push(pad + '}');
          helpers.add('wcsCanvas');
        }
        break;
      }
      case 'canvas_text': {
        const id = idParam(b);
        const text = valueExpr(b.params.text, ctx);
        const x = valueExpr(b.params.x, ctx), y = valueExpr(b.params.y, ctx);
        const size = numberParam(b, 'size');
        const color = b.params.color;
        if (!id || !text || !x || !y || size === null || size < 6 || size > 200 || !isHexColor(color)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + '{');
          out.push(pad + "  const c = wcsCanvas('" + id + "');");
          out.push(pad + "  if (c) { c.fillStyle = '" + color + "'; c.font = '" + Math.round(size) + "px system-ui, sans-serif'; c.fillText(" + text + ', ' + x + ', ' + y + '); }');
          out.push(pad + '}');
          helpers.add('wcsCanvas');
        }
        break;
      }

      case 'canvas_image': {
        const id = idParam(b);
        const src = safeAssetPath(b.params.src);
        const x = valueExpr(b.params.x, ctx), y = valueExpr(b.params.y, ctx);
        const w = valueExpr(b.params.w, ctx), h = valueExpr(b.params.h, ctx);
        if (!id || !src || !x || !y || !w || !h) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "await wcsDrawImage('" + id + "', '" + src + "', " + x + ', ' + y + ', ' + w + ', ' + h + ');');
          helpers.add('wcsCanvas');
          helpers.add('wcsDrawImage');
        }
        break;
      }
      case 'canvas_size': {
        const into = varParam(b, ctx, 'into');
        const id = idParam(b);
        const isW = b.params.dim !== 'h';
        if (!into || !id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + " = (document.getElementById('" + id + "') || { " + (isW ? 'width' : 'height') + ': 0 }).' + (isW ? 'width' : 'height') + ';');
        break;
      }
      case 'touch_pos': {
        const intoX = varParam(b, ctx, 'intoX');
        const intoY = varParam(b, ctx, 'intoY');
        if (!intoX || !intoY) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + intoX + ' = wcsLastTouch.x;');
          out.push(pad + intoY + ' = wcsLastTouch.y;');
          helpers.add('wcsTouch');
        }
        break;
      }

      /* ---------------- Guardar datos ---------------- */
      case 'storage_set': {
        const key = b.params.key;
        const val = valueExpr(b.params.value, ctx);
        if (!storageKey(key) || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "try { localStorage.setItem('" + key + "', String(" + val + ')); } catch (e) { /* sin almacenamiento */ }');
        break;
      }
      case 'storage_get': {
        const into = varParam(b, ctx, 'into');
        const key = b.params.key;
        if (!into || !storageKey(key)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "try { " + into + " = localStorage.getItem('" + key + "'); } catch (e) { " + into + ' = null; }');
        break;
      }

      /* ---------------- Dialogs ---------------- */
      case 'alert_dialog': {
        const msg = valueExpr(b.params.msg, ctx);
        if (!msg) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'msg' }); }
        else out.push(pad + 'window.alert(' + msg + ');');
        break;
      }
      case 'confirm_dialog': {
        const into = varParam(b, ctx, 'into');
        const msg = valueExpr(b.params.msg, ctx);
        if (!into || !msg) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = window.confirm(' + msg + ');');
        break;
      }
      case 'prompt_dialog': {
        const into = varParam(b, ctx, 'into');
        const msg = valueExpr(b.params.msg, ctx);
        if (!into || !msg) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + into + ' = window.prompt(' + msg + ") || '';");
        break;
      }

      /* ---------------- Extra logic ---------------- */
      case 'if_else': {
        const name = varParam(b, ctx);
        const op = b.params.op;
        const val = valueExpr(b.params.value, ctx);
        if (!name || OPS.every(function (o) { return o.v !== op; }) || !val) {
          ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' });
        } else {
          out.push(pad + 'if (' + name + ' ' + op + ' ' + val + ') {');
          emit(b.children).forEach(function (l) { out.push(l); });
          out.push(pad + '} else {');
          emit(b.childrenElse).forEach(function (l) { out.push(l); });
          out.push(pad + '}');
        }
        break;
      }
      case 'while_var': {
        const name = varParam(b, ctx);
        const op = b.params.op;
        const val = valueExpr(b.params.value, ctx);
        if (!name || OPS.every(function (o) { return o.v !== op; }) || !val) {
          ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' });
        } else {
          out.push(pad + '{');
          out.push(pad + '  let __guard = 0;');
          out.push(pad + '  while ((' + name + ' ' + op + ' ' + val + ') && (__guard < 10000)) {');
          out.push(pad + '    __guard++;');
          emit(b.children).forEach(function (l) { out.push('  ' + l); });
          out.push(pad + '  }');
          out.push(pad + '}');
        }
        break;
      }
      case 'for_each': {
        const name = varParam(b, ctx);
        const item = b.params.item;
        if (!name || !U.isVarName(item)) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + 'for (const ' + item + ' of (' + name + ' || [])) {');
          emit(b.children).forEach(function (l) { out.push(l); });
          out.push(pad + '}');
        }
        break;
      }
      case 'call_action': {
        const fn = b.params.fn;
        if (!U.isVarName(fn) || ctx.functions.indexOf(fn) < 0) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'fn' }); }
        else out.push(pad + 'await ' + fn + '();');
        break;
      }

      case 'math_abs': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Math.abs(Number(' + val + '));');
        break;
      }
      case 'math_min_max': {
        const name = varParam(b, ctx); const a = valueExpr(b.params.a, ctx); const bv = valueExpr(b.params.b, ctx);
        const mode = b.params.mode === 'max' ? 'max' : 'min';
        if (!name || !a || !bv) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Math.' + mode + '(Number(' + a + '), Number(' + bv + '));');
        break;
      }
      case 'math_sqrt': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Math.sqrt(Number(' + val + '));');
        break;
      }
      case 'math_pow': {
        const name = varParam(b, ctx); const base = valueExpr(b.params.base, ctx); const exp = valueExpr(b.params.exp, ctx);
        if (!name || !base || !exp) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Math.pow(Number(' + base + '), Number(' + exp + '));');
        break;
      }
      case 'math_mod': {
        const name = varParam(b, ctx); const a = valueExpr(b.params.a, ctx); const bv = valueExpr(b.params.b, ctx);
        if (!name || !a || !bv) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (Number(' + a + ') % Number(' + bv + '));');
        break;
      }
      case 'math_trig': {
        const name = varParam(b, ctx); const deg = valueExpr(b.params.deg, ctx);
        const fn = ({ sin: 'sin', cos: 'cos', tan: 'tan' })[b.params.fn] || 'sin';
        if (!name || !deg) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Math.' + fn + '(Number(' + deg + ') * Math.PI / 180);');
        break;
      }
      case 'math_floor_ceil': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        const mode = b.params.mode === 'ceil' ? 'ceil' : 'floor';
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Math.' + mode + '(Number(' + val + '));');
        break;
      }
      case 'math_random_between': {
        const name = varParam(b, ctx); const a = valueExpr(b.params.a, ctx); const bv = valueExpr(b.params.b, ctx);
        if (!name || !a || !bv) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + '{ const __a = Math.min(Number(' + a + '), Number(' + bv + ')); const __b = Math.max(Number(' + a + '), Number(' + bv + '));');
          out.push(pad + '  ' + name + ' = Math.floor(__a + Math.random() * (__b - __a + 1)); }');
        }
        break;
      }
      case 'math_chance': {
        const name = varParam(b, ctx); const pct = valueExpr(b.params.pct, ctx);
        if (!name || !pct) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (Math.random() * 100) < Number(' + pct + ');');
        break;
      }
      case 'math_distance': {
        const name = varParam(b, ctx);
        const x1 = valueExpr(b.params.x1, ctx), y1 = valueExpr(b.params.y1, ctx);
        const x2 = valueExpr(b.params.x2, ctx), y2 = valueExpr(b.params.y2, ctx);
        if (!name || !x1 || !y1 || !x2 || !y2) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Math.hypot(Number(' + x2 + ') - Number(' + x1 + '), Number(' + y2 + ') - Number(' + y1 + '));');
        break;
      }
      case 'str_includes': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx); const part = valueExpr(b.params.part, ctx);
        if (!name || !text || !part) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = String(' + text + ').includes(String(' + part + '));');
        break;
      }
      case 'str_split': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx);
        const sep = String(b.params.sep != null ? b.params.sep : ',').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (!name || !text) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = String(' + text + ").split('" + sep + "');");
        break;
      }
      case 'str_index': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx); const part = valueExpr(b.params.part, ctx);
        if (!name || !text || !part) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = String(' + text + ').indexOf(String(' + part + '));');
        break;
      }
      case 'str_repeat': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx); const n = valueExpr(b.params.n, ctx);
        if (!name || !text || !n) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = String(' + text + ').repeat(Math.max(0, Math.floor(Number(' + n + '))));');
        break;
      }
      case 'str_pad': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx);
        const len = Math.max(0, parseInt(b.params.len, 10) || 0);
        const side = b.params.side === 'end' ? 'End' : 'Start';
        let ch = String(b.params.ch != null ? b.params.ch : ' ').charAt(0);
        ch = ch.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (!name || !text) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = String(' + text + ').pad' + side + '(' + len + ", '" + ch + "');");
        break;
      }
      case 'str_lines': {
        const name = varParam(b, ctx);
        const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list) >= 0) ? b.params.list : null;
        if (!name || !list) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (' + list + ' || []).join("\\n");');
        break;
      }
      case 'list_index_of': {
        const name = varParam(b, ctx); const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list) >= 0) ? b.params.list : null;
        const val = valueExpr(b.params.value, ctx);
        if (!name || !list || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (' + list + ' || []).indexOf(' + val + ');');
        break;
      }
      case 'list_set': {
        const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list) >= 0) ? b.params.list : null;
        const idx = valueExpr(b.params.index, ctx); const val = valueExpr(b.params.value, ctx);
        if (!list || !idx || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + 'if (Array.isArray(' + list + ')) ' + list + '[Math.floor(Number(' + idx + '))] = ' + val + ';');
        break;
      }
      case 'list_insert': {
        const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list) >= 0) ? b.params.list : null;
        const idx = valueExpr(b.params.index, ctx); const val = valueExpr(b.params.value, ctx);
        if (!list || !idx || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + 'if (Array.isArray(' + list + ')) ' + list + '.splice(Math.floor(Number(' + idx + ')), 0, ' + val + ');');
        break;
      }
      case 'list_pop': {
        const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list) >= 0) ? b.params.list : null;
        const name = varParam(b, ctx);
        if (!list || !name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Array.isArray(' + list + ') ? ' + list + '.pop() : undefined;');
        break;
      }
      case 'list_shuffle': {
        const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list) >= 0) ? b.params.list : null;
        if (!list) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + 'if (Array.isArray(' + list + ')) {');
          out.push(pad + '  for (let __i = ' + list + '.length - 1; __i > 0; __i--) {');
          out.push(pad + '    const __j = Math.floor(Math.random() * (__i + 1));');
          out.push(pad + '    const __t = ' + list + '[__i]; ' + list + '[__i] = ' + list + '[__j]; ' + list + '[__j] = __t;');
          out.push(pad + '  }');
          out.push(pad + '}');
        }
        break;
      }
      case 'list_unique': {
        const name = varParam(b, ctx);
        const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list) >= 0) ? b.params.list : null;
        if (!name || !list) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Array.from(new Set(' + list + ' || []));');
        break;
      }
      case 'list_slice': {
        const name = varParam(b, ctx);
        const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list) >= 0) ? b.params.list : null;
        const fr = valueExpr(b.params.from, ctx); const to = valueExpr(b.params.to, ctx);
        if (!name || !list || !fr || !to) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (' + list + ' || []).slice(Number(' + fr + '), Number(' + to + '));');
        break;
      }
      case 'logic_and_or': {
        const name = varParam(b, ctx); const a = valueExpr(b.params.a, ctx); const bv = valueExpr(b.params.b, ctx);
        const op = b.params.op === '||' ? '||' : '&&';
        if (!name || !a || !bv) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = !!(!(' + a + ' === false || ' + a + ' === 0 || ' + a + ' === "" || ' + a + ' == null) ' + op + ' !(' + bv + ' === false || ' + bv + ' === 0 || ' + bv + ' === "" || ' + bv + ' == null));');
        break;
      }
      case 'logic_not': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = !(' + val + ');');
        break;
      }
      case 'logic_ternary': {
        const name = varParam(b, ctx);
        const left = valueExpr(b.params.left, ctx); const right = valueExpr(b.params.right, ctx);
        const thenV = valueExpr(b.params.thenV, ctx); const elseV = valueExpr(b.params.elseV, ctx);
        const op = b.params.op; const okOp = OPS.some(function (o) { return o.v === op; });
        if (!name || !left || !right || !thenV || !elseV || !okOp) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = ((' + left + ') ' + op + ' (' + right + ')) ? (' + thenV + ') : (' + elseV + ');');
        break;
      }
      case 'set_bool': {
        const name = varParam(b, ctx); const val = b.params.val === 'false' ? 'false' : 'true';
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = ' + val + ';');
        break;
      }
      case 'copy_var': {
        const from = (b.params.from && U.isVarName(b.params.from) && ctx.vars.indexOf(b.params.from) >= 0) ? b.params.from : null;
        const to = (b.params.to && U.isVarName(b.params.to) && ctx.vars.indexOf(b.params.to) >= 0) ? b.params.to : null;
        if (!from || !to) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + to + ' = ' + from + ';');
        break;
      }
      case 'swap_vars': {
        const a = (b.params.a && U.isVarName(b.params.a) && ctx.vars.indexOf(b.params.a) >= 0) ? b.params.a : null;
        const bv = (b.params.b && U.isVarName(b.params.b) && ctx.vars.indexOf(b.params.b) >= 0) ? b.params.b : null;
        if (!a || !bv) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + '{ const __t = ' + a + '; ' + a + ' = ' + bv + '; ' + bv + ' = __t; }');
        break;
      }
      case 'set_opacity': {
        const id = idParam(b); const val = String(b.params.val || '').trim();
        if (!id || val === '') { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.opacity = '" + val.replace(/'/g, "\\'") + "';");
        break;
      }
      case 'set_border': {
        const id = idParam(b); const w = String(b.params.w || '1px').replace(/'/g, "\\'");
        const style = String(b.params.style || 'solid').replace(/'/g, "\\'");
        const color = String(b.params.color || '#000').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.border = '" + w + ' ' + style + ' ' + color + "';");
        break;
      }
      case 'set_radius': {
        const id = idParam(b); const r = String(b.params.r || '0').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.borderRadius = '" + r + "';");
        break;
      }
      case 'set_padding': {
        const id = idParam(b); const val = String(b.params.val || '0').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.padding = '" + val + "';");
        break;
      }
      case 'set_margin': {
        const id = idParam(b); const val = String(b.params.val || '0').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.margin = '" + val + "';");
        break;
      }
      case 'set_position': {
        const id = idParam(b); const x = valueExpr(b.params.x, ctx); const y = valueExpr(b.params.y, ctx);
        if (!id || !x || !y) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "{ const __el = document.getElementById('" + id + "'); __el.style.position = 'absolute';");
          out.push(pad + "  __el.style.left = (Number(" + x + ") || 0) + 'px'; __el.style.top = (Number(" + y + ") || 0) + 'px'; }");
        }
        break;
      }
      case 'set_zindex': {
        const id = idParam(b); const z = String(b.params.z || '0').replace(/[^\d-]/g, '') || '0';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.zIndex = '" + z + "';");
        break;
      }
      case 'set_display': {
        const id = idParam(b); const mode = String(b.params.mode || 'block').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.display = '" + mode + "';");
        break;
      }
      case 'flex_center': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "{ const __el = document.getElementById('" + id + "'); __el.style.display = 'flex';");
          out.push(pad + "  __el.style.alignItems = 'center'; __el.style.justifyContent = 'center'; }");
        }
        break;
      }
      case 'create_input': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const ph = String(b.params.placeholder || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('input', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "document.getElementById('" + id + "').placeholder = '" + ph + "';");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'create_textarea': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsCreate('textarea', { id: '" + id + "', parent: '" + parent + "' });"); helpers.add('wcsCreate'); }
        break;
      }
      case 'focus_element': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "try { document.getElementById('" + id + "').focus(); } catch (e) {}");
        break;
      }
      case 'scroll_into_view': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "try { document.getElementById('" + id + "').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}");
        break;
      }
      case 'set_disabled': {
        const id = idParam(b); const st = b.params.state === 'false' ? 'false' : 'true';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').disabled = " + st + ';');
        break;
      }
      case 'get_text': {
        const id = idParam(b); const name = varParam(b, ctx);
        if (!id || !name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = (document.getElementById('" + id + "') || {}).textContent || '';");
        break;
      }
      case 'get_input': {
        const id = idParam(b); const name = varParam(b, ctx);
        if (!id || !name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = (document.getElementById('" + id + "') || {}).value || '';");
        break;
      }
      case 'stop_all_timers': {
        out.push(pad + 'wcsStopAllTimers();');
        helpers.add('wcsTimers');
        break;
      }
      case 'timestamp_now': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Date.now();');
        break;
      }
      case 'format_clock': {
        const name = varParam(b, ctx); const secs = valueExpr(b.params.secs, ctx);
        if (!name || !secs) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + '{ let __s = Math.max(0, Math.floor(Number(' + secs + ') || 0));');
          out.push(pad + "  const __h = Math.floor(__s / 3600); __s %= 3600; const __m = Math.floor(__s / 60); const __sec = __s % 60;");
          out.push(pad + "  const __p = (n) => String(n).padStart(2, '0');");
          out.push(pad + '  ' + name + ' = (__h ? __p(__h) + ":" : "") + __p(__m) + ":" + __p(__sec); }');
        }
        break;
      }
      case 'play_beep': {
        const kind = String(b.params.kind || 'ok');
        const map = { ok: [880, 120], err: [220, 200], click: [600, 40], coin: [1200, 80] };
        const pair = map[kind] || map.ok;
        out.push(pad + 'wcsTone(' + pair[0] + ', ' + pair[1] + ", 'square', (typeof wcsMasterVol === 'number' ? wcsMasterVol : 0.2));");
        helpers.add('wcsTone');
        break;
      }
      case 'set_master_volume': {
        const vol = parseFloat(b.params.vol); const v = isFinite(vol) ? Math.max(0, Math.min(1, vol)) : 0.3;
        out.push(pad + 'wcsMasterVol = ' + v + ';');
        helpers.add('wcsTone');
        break;
      }
      case 'canvas_line': {
        const id = idParam(b);
        const x1 = valueExpr(b.params.x1, ctx), y1 = valueExpr(b.params.y1, ctx);
        const x2 = valueExpr(b.params.x2, ctx), y2 = valueExpr(b.params.y2, ctx);
        const color = String(b.params.color || '#000').replace(/'/g, "\\'");
        const w = parseFloat(b.params.w) || 2;
        if (!id || !x1 || !y1 || !x2 || !y2) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) { const ctx = c.getContext('2d');");
          out.push(pad + "  ctx.strokeStyle = '" + color + "'; ctx.lineWidth = " + w + '; ctx.beginPath();');
          out.push(pad + '  ctx.moveTo(Number(' + x1 + '), Number(' + y1 + ')); ctx.lineTo(Number(' + x2 + '), Number(' + y2 + ')); ctx.stroke(); } }');
          helpers.add('wcsCanvas');
        }
        break;
      }
      case 'canvas_fill_style': {
        const id = idParam(b); const color = String(b.params.color || '#000').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) c.getContext('2d').fillStyle = '" + color + "'; }"); helpers.add('wcsCanvas'); }
        break;
      }
      case 'canvas_stroke_style': {
        const id = idParam(b); const color = String(b.params.color || '#000').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) c.getContext('2d').strokeStyle = '" + color + "'; }"); helpers.add('wcsCanvas'); }
        break;
      }
      case 'canvas_font': {
        const id = idParam(b); const font = String(b.params.font || '16px sans-serif').replace(/'/g, "\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) c.getContext('2d').font = '" + font + "'; }"); helpers.add('wcsCanvas'); }
        break;
      }
      case 'canvas_clear_rect': {
        const id = idParam(b);
        const x = valueExpr(b.params.x, ctx), y = valueExpr(b.params.y, ctx);
        const w = valueExpr(b.params.w, ctx), h = valueExpr(b.params.h, ctx);
        if (!id || !x || !y || !w || !h) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) c.getContext('2d').clearRect(Number(" + x + '), Number(' + y + '), Number(' + w + '), Number(' + h + ')); }');
          helpers.add('wcsCanvas');
        }
        break;
      }
      case 'game_score_set': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Number(' + val + ');');
        break;
      }
      case 'game_score_add': {
        const name = varParam(b, ctx); const d = valueExpr(b.params.delta, ctx);
        if (!name || !d) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Number(' + name + ' || 0) + Number(' + d + ');');
        break;
      }
      case 'game_lives': {
        const name = varParam(b, ctx); const d = valueExpr(b.params.delta, ctx);
        if (!name || !d) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Number(' + name + ' || 0) + Number(' + d + ');');
        break;
      }
      case 'collide_aabb': {
        const name = varParam(b, ctx);
        const keys = ['x1','y1','w1','h1','x2','y2','w2','h2'];
        const vals = keys.map(function(k){ return valueExpr(b.params[k], ctx); });
        if (!name || vals.some(function(v){ return !v; })) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + '{ const __x1=Number(' + vals[0] + '),__y1=Number(' + vals[1] + '),__w1=Number(' + vals[2] + '),__h1=Number(' + vals[3] + '),');
          out.push(pad + '  __x2=Number(' + vals[4] + '),__y2=Number(' + vals[5] + '),__w2=Number(' + vals[6] + '),__h2=Number(' + vals[7] + ');');
          out.push(pad + '  ' + name + ' = __x1 < __x2 + __w2 && __x1 + __w1 > __x2 && __y1 < __y2 + __h2 && __y1 + __h1 > __y2; }');
        }
        break;
      }
      case 'key_pressed': {
        const name = varParam(b, ctx); const key = String(b.params.key || 'ArrowLeft').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + name + " = !!wcsKeys['" + key + "'];"); helpers.add('wcsKeys'); }
        break;
      }
      case 'sprite_set_xy': {
        const xVar = (b.params.xVar && U.isVarName(b.params.xVar) && ctx.vars.indexOf(b.params.xVar) >= 0) ? b.params.xVar : null;
        const yVar = (b.params.yVar && U.isVarName(b.params.yVar) && ctx.vars.indexOf(b.params.yVar) >= 0) ? b.params.yVar : null;
        const x = valueExpr(b.params.x, ctx); const y = valueExpr(b.params.y, ctx);
        if (!xVar || !yVar || !x || !y) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + xVar + ' = Number(' + x + ');'); out.push(pad + yVar + ' = Number(' + y + ');'); }
        break;
      }
      case 'sprite_move': {
        const xVar = (b.params.xVar && U.isVarName(b.params.xVar) && ctx.vars.indexOf(b.params.xVar) >= 0) ? b.params.xVar : null;
        const yVar = (b.params.yVar && U.isVarName(b.params.yVar) && ctx.vars.indexOf(b.params.yVar) >= 0) ? b.params.yVar : null;
        const dx = valueExpr(b.params.dx, ctx); const dy = valueExpr(b.params.dy, ctx);
        if (!xVar || !yVar || !dx || !dy) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + xVar + ' = Number(' + xVar + ' || 0) + Number(' + dx + ');'); out.push(pad + yVar + ' = Number(' + yVar + ' || 0) + Number(' + dy + ');'); }
        break;
      }
      case 'sprite_wrap': {
        const xVar = (b.params.xVar && U.isVarName(b.params.xVar) && ctx.vars.indexOf(b.params.xVar) >= 0) ? b.params.xVar : null;
        const yVar = (b.params.yVar && U.isVarName(b.params.yVar) && ctx.vars.indexOf(b.params.yVar) >= 0) ? b.params.yVar : null;
        const w = valueExpr(b.params.w, ctx); const h = valueExpr(b.params.h, ctx);
        if (!xVar || !yVar || !w || !h) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + '{ const __W=Number(' + w + ')||0, __H=Number(' + h + ')||0;');
          out.push(pad + '  if (' + xVar + ' < 0) ' + xVar + ' = __W; if (' + xVar + ' > __W) ' + xVar + ' = 0;');
          out.push(pad + '  if (' + yVar + ' < 0) ' + yVar + ' = __H; if (' + yVar + ' > __H) ' + yVar + ' = 0; }');
        }
        break;
      }
      case 'sprite_clamp': {
        const xVar = (b.params.xVar && U.isVarName(b.params.xVar) && ctx.vars.indexOf(b.params.xVar) >= 0) ? b.params.xVar : null;
        const yVar = (b.params.yVar && U.isVarName(b.params.yVar) && ctx.vars.indexOf(b.params.yVar) >= 0) ? b.params.yVar : null;
        const minX = valueExpr(b.params.minX, ctx), minY = valueExpr(b.params.minY, ctx);
        const maxX = valueExpr(b.params.maxX, ctx), maxY = valueExpr(b.params.maxY, ctx);
        if (!xVar || !yVar || !minX || !minY || !maxX || !maxY) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + xVar + ' = Math.min(Number(' + maxX + '), Math.max(Number(' + minX + '), Number(' + xVar + ' || 0)));');
          out.push(pad + yVar + ' = Math.min(Number(' + maxY + '), Math.max(Number(' + minY + '), Number(' + yVar + ' || 0)));');
        }
        break;
      }
      case 'game_loop_flag': {
        const name = varParam(b, ctx); const val = b.params.val === 'false' ? 'false' : 'true';
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = ' + val + ';');
        break;
      }
      case 'storage_remove': {
        const key = String(b.params.key || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (!key) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "try { localStorage.removeItem('" + key + "'); } catch (e) {}");
        break;
      }
      case 'storage_clear': {
        out.push(pad + 'try { localStorage.clear(); } catch (e) {}');
        break;
      }
      case 'storage_has': {
        const name = varParam(b, ctx); const key = String(b.params.key || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (!name || !key) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + 'try { ' + name + " = localStorage.getItem('" + key + "') != null; } catch (e) { " + name + ' = false; }');
        break;
      }
      case 'send_update_score': {
        const score = valueExpr(b.params.score, ctx); const info = valueExpr(b.params.info, ctx);
        if (!score) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + 'window.webxdc.sendUpdate({ payload: { score: ' + score + ' }, info: String(' + (info || "''") + ') });');
        break;
      }
      case 'send_update_payload': {
        const key = String(b.params.key || 'data').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const val = valueExpr(b.params.value, ctx); const info = valueExpr(b.params.info, ctx);
        if (!val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "window.webxdc.sendUpdate({ payload: { '" + key + "': " + val + ' }, info: String(' + (info || "''") + ') });');
        break;
      }
      case 'is_self_addr': {
        const name = varParam(b, ctx); const addr = valueExpr(b.params.addr, ctx);
        if (!name || !addr) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (window.webxdc && window.webxdc.selfAddr) === String(' + addr + ');');
        break;
      }
      case 'set_var_self_addr': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (window.webxdc && window.webxdc.selfAddr) || "";');
        break;
      }
      case 'console_log': {
        const val = valueExpr(b.params.value, ctx);
        if (!val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + 'console.log(' + val + ');');
        break;
      }
      case 'json_stringify': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + 'try { ' + name + ' = JSON.stringify(' + val + '); } catch (e) { ' + name + ' = null; }');
        break;
      }
      case 'json_parse': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx);
        if (!name || !text) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + 'try { ' + name + ' = JSON.parse(String(' + text + ')); } catch (e) { ' + name + ' = null; }');
        break;
      }
      case 'object_set': {
        const obj = (b.params.obj && U.isVarName(b.params.obj) && ctx.vars.indexOf(b.params.obj) >= 0) ? b.params.obj : null;
        const key = String(b.params.key || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const val = valueExpr(b.params.value, ctx);
        if (!obj || !key || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + 'if (!' + obj + ' || typeof ' + obj + ' !== "object") ' + obj + ' = {}; ' + obj + "['" + key + "'] = " + val + ';');
        break;
      }
      case 'object_get': {
        const name = varParam(b, ctx);
        const obj = (b.params.obj && U.isVarName(b.params.obj) && ctx.vars.indexOf(b.params.obj) >= 0) ? b.params.obj : null;
        const key = String(b.params.key || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (!name || !obj || !key) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (' + obj + " && typeof " + obj + " === 'object') ? " + obj + "['" + key + "'] : undefined;");
        break;
      }
      case 'try_catch': {
        out.push(pad + 'try {');
        emit(b.children).forEach(function (l) { out.push(l); });
        out.push(pad + '} catch (__err) {');
        emit(b.childrenElse).forEach(function (l) { out.push(l); });
        out.push(pad + '}');
        break;
      }

      case 'nav_create_screen': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "' });");
          out.push(pad + "{ const __s = document.getElementById('" + id + "'); __s.className = 'wcs-screen'; __s.style.display = 'none'; }");
          helpers.add('wcsCreate'); helpers.add('wcsNav');
        }
        break;
      }
      case 'nav_show_screen': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsNavShow('" + id + "');"); helpers.add('wcsNav'); }
        break;
      }
      case 'nav_hide_screen': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "document.getElementById('" + id + "').style.display = 'none';"); }
        break;
      }
      case 'nav_go_screen': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsNavGo('" + id + "');"); helpers.add('wcsNav'); }
        break;
      }
      case 'nav_back': {
        out.push(pad + 'wcsNavBack();'); helpers.add('wcsNav');
        break;
      }
      case 'nav_home': {
        out.push(pad + 'wcsNavHome();'); helpers.add('wcsNav');
        break;
      }
      case 'nav_modal_open': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsModalOpen('" + id + "');"); helpers.add('wcsNav'); }
        break;
      }
      case 'nav_modal_close': {
        const id = idParam(b);
        out.push(pad + "wcsModalClose('" + (id || '') + "');"); helpers.add('wcsNav');
        break;
      }
      case 'nav_modal_toggle': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsModalToggle('" + id + "');"); helpers.add('wcsNav'); }
        break;
      }
      case 'cmp_button': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('button', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "document.getElementById('" + id + "').textContent = " + txt + ";");
          out.push(pad + "document.getElementById('" + id + "').type = 'button';");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_card': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); __e.className = 'wcs-card'; __e.style.cssText = 'padding:12px;border-radius:12px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);margin:8px 0;'; }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_header': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('header', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); __e.textContent = ''; const __h = document.createElement('h1'); __h.style.cssText = 'margin:0;font-size:1.25rem'; __h.textContent = " + txt + "; __e.appendChild(__h); __e.style.cssText = 'padding:12px 16px;font-weight:700;'; }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_badge': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('span', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); __e.textContent = " + txt + "; __e.style.cssText='display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:.8rem;'; }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_progress': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const val = valueExpr(b.params.value, ctx) || '0';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "wcsProgress('" + id + "', " + val + ");");
          helpers.add('wcsCreate'); helpers.add('wcsCmp');
        }
        break;
      }
      case 'cmp_set_progress': {
        const id = idParam(b); const val = valueExpr(b.params.value, ctx);
        if (!id || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + "wcsProgress('" + id + "', " + val + ");"); helpers.add('wcsCmp'); }
        break;
      }
      case 'cmp_spinner': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "document.getElementById('" + id + "').innerHTML = '⏳';");
          out.push(pad + "document.getElementById('" + id + "').setAttribute('role','status');");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_divider': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('hr', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "document.getElementById('" + id + "').style.cssText = 'border:none;border-top:1px solid #e2e8f0;margin:12px 0;';");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_empty_state': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "'Sin datos'";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); __e.textContent = " + txt + "; __e.style.cssText='text-align:center;color:#64748b;padding:24px;'; }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_alert': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); __e.setAttribute('role','alert'); __e.textContent = " + txt + "; __e.style.cssText='padding:10px 12px;border-radius:8px;background:#fef3c7;color:#92400e;margin:8px 0;'; }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_list': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('ul', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "document.getElementById('" + id + "').style.cssText = 'list-style:none;padding:0;margin:0;';");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'form_field_text': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsFormField('text', '" + id + "', '" + lab + "', '" + parent + "');");
          helpers.add('wcsForm');
        }
        break;
      }
      case 'form_field_number': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsFormField('number', '" + id + "', '" + lab + "', '" + parent + "');");
          helpers.add('wcsForm');
        }
        break;
      }
      case 'form_field_email': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsFormField('email', '" + id + "', '" + lab + "', '" + parent + "');");
          helpers.add('wcsForm');
        }
        break;
      }
      case 'form_checkbox': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsFormField('checkbox', '" + id + "', '" + lab + "', '" + parent + "');");
          helpers.add('wcsForm');
        }
        break;
      }
      case 'form_select': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const opts = String(b.params.options || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsFormSelect('" + id + "', '" + lab + "', '" + opts + "', '" + parent + "');");
          helpers.add('wcsForm');
        }
        break;
      }
      case 'form_values': {
        const name = varParam(b, ctx);
        const ids = String(b.params.ids || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        if (!name || !ids.length) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + name + ' = {};');
          ids.forEach(function(fid) {
            if (!U.isElementId(fid)) return;
            out.push(pad + "{ const __el = document.getElementById('" + fid + "');");
            out.push(pad + "  if (__el) " + name + "['" + fid + "'] = (__el.type === 'checkbox') ? !!__el.checked : __el.value; }");
          });
        }
        break;
      }
      case 'form_clear': {
        const ids = String(b.params.ids || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        if (!ids.length) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          ids.forEach(function(fid) {
            if (!U.isElementId(fid)) return;
            out.push(pad + "{ const __el = document.getElementById('" + fid + "'); if (__el) { if (__el.type==='checkbox') __el.checked=false; else __el.value=''; } }");
          });
        }
        break;
      }
      case 'form_valid_required': {
        const name = varParam(b, ctx);
        const ids = String(b.params.ids || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        if (!name || !ids.length) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + name + ' = true;');
          ids.forEach(function(fid) {
            if (!U.isElementId(fid)) return;
            out.push(pad + "{ const __el = document.getElementById('" + fid + "'); const __v = __el && (__el.type==='checkbox' ? __el.checked : String(__el.value||'').trim()); if (!__v) " + name + " = false; }");
          });
        }
        break;
      }
      case 'form_show_error': {
        const id = idParam(b); const txt = valueExpr(b.params.text, ctx);
        if (!id || !txt) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.textContent = " + txt + "; __e.style.color = '#b91c1c'; __e.style.fontSize = '.85rem'; } }");
        }
        break;
      }
      case 'data_create_collection': {
        const key = String(b.params.name || '').trim().replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!key) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "wcsDataEnsure('" + key + "');");
          helpers.add('wcsData');
        }
        break;
      }
      case 'data_create_record': {
        const col = String(b.params.collection || '').trim().replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const val = valueExpr(b.params.value, ctx);
        const name = (b.params.name && U.isVarName(b.params.name) && ctx.vars.indexOf(b.params.name) >= 0) ? b.params.name : null;
        if (!col || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + (name ? (name + ' = ') : '') + "wcsDataCreate('" + col + "', " + val + ");");
          helpers.add('wcsData');
        }
        break;
      }
      case 'data_get_record': {
        const name = varParam(b, ctx); const col = String(b.params.collection || '').trim().replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const rid = valueExpr(b.params.id, ctx);
        if (!name || !col || !rid) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + name + " = wcsDataGet('" + col + "', " + rid + ");");
          helpers.add('wcsData');
        }
        break;
      }
      case 'data_update_record': {
        const col = String(b.params.collection || '').trim().replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const rid = valueExpr(b.params.id, ctx); const val = valueExpr(b.params.value, ctx);
        if (!col || !rid || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "wcsDataUpdate('" + col + "', " + rid + ", " + val + ");");
          helpers.add('wcsData');
        }
        break;
      }
      case 'data_delete_record': {
        const col = String(b.params.collection || '').trim().replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const rid = valueExpr(b.params.id, ctx);
        if (!col || !rid) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "wcsDataDelete('" + col + "', " + rid + ");");
          helpers.add('wcsData');
        }
        break;
      }
      case 'data_find_many': {
        const name = varParam(b, ctx); const col = String(b.params.collection || '').trim().replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!name || !col) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + name + " = wcsDataAll('" + col + "');");
          helpers.add('wcsData');
        }
        break;
      }
      case 'data_count': {
        const name = varParam(b, ctx); const col = String(b.params.collection || '').trim().replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!name || !col) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + name + " = wcsDataAll('" + col + "').length;");
          helpers.add('wcsData');
        }
        break;
      }
      case 'str_capitalize': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx);
        if (!name || !text) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = (function(s){ s=String(s||''); return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; })(" + text + ");");
        break;
      }
      case 'str_starts': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx); const part = valueExpr(b.params.part, ctx);
        if (!name || !text || !part) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = String(' + text + ').startsWith(String(' + part + '));');
        break;
      }
      case 'str_ends': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx); const part = valueExpr(b.params.part, ctx);
        if (!name || !text || !part) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = String(' + text + ').endsWith(String(' + part + '));');
        break;
      }
      case 'str_template': {
        const name = varParam(b, ctx);
        const tpl = String(b.params.template || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const vn = (b.params.varName && U.isVarName(b.params.varName) && ctx.vars.indexOf(b.params.varName) >= 0) ? b.params.varName : null;
        if (!name || !vn) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = '" + tpl + "'.split('{" + vn + "}').join(String(" + vn + "));");
        break;
      }
      case 'logic_is_empty': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (' + val + ' == null || ' + val + ' === "" || (Array.isArray(' + val + ') && ' + val + '.length===0));');
        break;
      }
      case 'logic_is_number': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Number.isFinite(Number(' + val + '));');
        break;
      }
      case 'logic_between': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx); const min = valueExpr(b.params.min, ctx); const max = valueExpr(b.params.max, ctx);
        if (!name || !val || !min || !max) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (Number(' + val + ') >= Number(' + min + ') && Number(' + val + ') <= Number(' + max + '));');
        break;
      }
      case 'style_align': {
        const id = idParam(b); const al = String(b.params.align || 'center').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "{ const __e=document.getElementById('" + id + "'); __e.style.display='flex'; __e.style.alignItems='" + al + "'; }");
        break;
      }
      case 'style_gap': {
        const id = idParam(b); const val = String(b.params.val || '8px').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.gap = '" + val + "';");
        break;
      }
      case 'style_text_align': {
        const id = idParam(b); const al = String(b.params.align || 'left').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.textAlign = '" + al + "';");
        break;
      }
      case 'style_shadow': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.boxShadow = '0 2px 8px rgba(0,0,0,.12)';");
        break;
      }
      case 'recipe_counter': {
        const lid = (b.params.labelId && U.isElementId(b.params.labelId)) ? b.params.labelId : null;
        const vn = varParam(b, ctx);
        if (!lid || !vn) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + vn + ' = Number(' + vn + ' || 0);');
          out.push(pad + "document.getElementById('" + lid + "').textContent = String(" + vn + ");");
        }
        break;
      }
      case 'recipe_toast_save': {
        const key = String(b.params.key || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const val = valueExpr(b.params.value, ctx); const msg = valueExpr(b.params.msg, ctx) || "'Guardado'";
        if (!key || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "try { localStorage.setItem('" + key + "', String(" + val + ")); } catch (e) {}");
          out.push(pad + 'toast(' + msg + ');');
          helpers.add('toast');
        }
        break;
      }

      case 'cmp_footer': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('footer', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.textContent = " + txt + "; __e.className = 'wcs-footer'; } }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_navbar': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('nav', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.textContent = " + txt + "; __e.className = 'wcs-navbar'; } }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_chip': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('span', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.textContent = " + txt + "; __e.className = 'wcs-chip'; } }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_banner': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.textContent = " + txt + "; __e.className = 'wcs-banner'; } }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_skeleton': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.className = 'wcs-skeleton'; __e.style.minHeight = '16px'; __e.style.background = '#e2e8f0'; } }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_tooltip': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('span', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.textContent = " + txt + "; __e.className = 'wcs-tooltip'; } }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_stat': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.textContent = " + txt + "; __e.className = 'wcs-stat'; } }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'cmp_modal': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const txt = valueExpr(b.params.text, ctx) || "''";
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsCreate('div', { id: '" + id + "', parent: '" + parent + "' });");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); __e.style.display = 'none'; const __box = document.createElement('div'); __box.style.cssText = 'background:#fff;padding:16px;border-radius:12px;max-width:90%'; __box.textContent = String(" + txt + "); __e.appendChild(__box); }");
          helpers.add('wcsCreate');
        }
        break;
      }
      case 'form_field_password': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsFormField('password', '" + id + "', '" + lab + "', '" + parent + "');"); helpers.add('wcsForm'); }
        break;
      }
      case 'form_field_date': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsFormField('date', '" + id + "', '" + lab + "', '" + parent + "');"); helpers.add('wcsForm'); }
        break;
      }
      case 'form_field_time': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsFormField('time', '" + id + "', '" + lab + "', '" + parent + "');"); helpers.add('wcsForm'); }
        break;
      }
      case 'form_search': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsFormField('search', '" + id + "', '" + lab + "', '" + parent + "');"); helpers.add('wcsForm'); }
        break;
      }
      case 'form_switch': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "wcsFormField('checkbox', '" + id + "', '" + lab + "', '" + parent + "');"); helpers.add('wcsForm'); }
        break;
      }
      case 'form_slider': {
        const id = idParam(b); const parent = (b.params.parent && U.isElementId(b.params.parent)) ? b.params.parent : '';
        const lab = String(b.params.label || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "wcsFormField('range', '" + id + "', '" + lab + "', '" + parent + "');");
          out.push(pad + "{ const __e = document.getElementById('" + id + "'); if (__e) { __e.min='0'; __e.max='100'; } }");
          helpers.add('wcsForm');
        }
        break;
      }
      case 'form_disable': {
        const ids = String(b.params.ids || '').split(',').map(function(s){return s.trim();}).filter(Boolean);
        if (!ids.length) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else ids.forEach(function(fid){ if (U.isElementId(fid)) out.push(pad + "{ const __e=document.getElementById('" + fid + "'); if (__e) __e.disabled = true; }"); });
        break;
      }
      case 'form_enable': {
        const ids = String(b.params.ids || '').split(',').map(function(s){return s.trim();}).filter(Boolean);
        if (!ids.length) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else ids.forEach(function(fid){ if (U.isElementId(fid)) out.push(pad + "{ const __e=document.getElementById('" + fid + "'); if (__e) __e.disabled = false; }"); });
        break;
      }
      case 'nav_tab_show': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else {
          out.push(pad + "{ const __t = document.getElementById('" + id + "'); if (__t && __t.parentElement) { __t.parentElement.querySelectorAll('.wcs-tab').forEach(function(el){ el.style.display='none'; }); __t.style.display=''; __t.classList.add('wcs-tab'); } }");
        }
        break;
      }
      case 'nav_drawer_open': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "{ const __e=document.getElementById('" + id + "'); if (__e) { __e.style.display=''; __e.style.position='fixed'; __e.style.left='0'; __e.style.top='0'; __e.style.bottom='0'; __e.style.width='80%'; __e.style.maxWidth='320px'; __e.style.zIndex='9998'; __e.style.background='#fff'; } }");
        break;
      }
      case 'nav_drawer_close': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.display = 'none';");
        break;
      }
      case 'data_find_record': {
        const name = varParam(b, ctx); const col = String(b.params.collection || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const field = String(b.params.field || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const val = valueExpr(b.params.value, ctx);
        if (!name || !col || !field || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + name + " = wcsDataAll('" + col + "').find(function(r){ return r && r['" + field + "'] == " + val + "; }) || null;");
          helpers.add('wcsData');
        }
        break;
      }
      case 'data_clear_collection': {
        const col = String(b.params.collection || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        if (!col) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + "wcsDataSave('" + col + "', []);"); helpers.add('wcsData'); }
        break;
      }
      case 'a11y_label': {
        const id = idParam(b); const txt = valueExpr(b.params.text, ctx);
        if (!id || !txt) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').setAttribute('aria-label', String(" + txt + "));");
        break;
      }
      case 'a11y_alt': {
        const id = idParam(b); const txt = valueExpr(b.params.text, ctx);
        if (!id || !txt) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').setAttribute('alt', String(" + txt + "));");
        break;
      }
      case 'a11y_announce': {
        const txt = valueExpr(b.params.text, ctx);
        if (!txt) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "{ let __l = document.getElementById('wcs-a11y-live'); if (!__l) { __l = document.createElement('div'); __l.id='wcs-a11y-live'; __l.setAttribute('aria-live','polite'); __l.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)'; document.body.appendChild(__l); } __l.textContent = String(" + txt + "); }");
        }
        break;
      }
      case 'a11y_reduce_motion': {
        const name = varParam(b, ctx);
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);");
        break;
      }
      case 'str_words': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx);
        if (!name || !text) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = String(" + text + ").trim() ? String(" + text + ").trim().split(/\\s+/).length : 0;");
        break;
      }
      case 'str_char_at': {
        const name = varParam(b, ctx); const text = valueExpr(b.params.text, ctx); const idx = valueExpr(b.params.index, ctx);
        if (!name || !text || !idx) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = String(" + text + ").charAt(Number(" + idx + "));");
        break;
      }
      case 'str_compare_ignore_case': {
        const name = varParam(b, ctx); const a = valueExpr(b.params.a, ctx); const bv = valueExpr(b.params.b, ctx);
        if (!name || !a || !bv) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = String(' + a + ').toLowerCase() === String(' + bv + ').toLowerCase();');
        break;
      }
      case 'logic_is_text': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = (typeof (" + val + ") === 'string');");
        break;
      }
      case 'logic_is_list': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = Array.isArray(' + val + ');');
        break;
      }
      case 'logic_is_object': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + " = !!(" + val + " && typeof " + val + " === 'object' && !Array.isArray(" + val + "));");
        break;
      }
      case 'logic_exists': {
        const name = varParam(b, ctx); const val = valueExpr(b.params.value, ctx);
        if (!name || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (' + val + ' != null);');
        break;
      }
      case 'game_restart': {
        const sc = (b.params.score && U.isVarName(b.params.score) && ctx.vars.indexOf(b.params.score)>=0) ? b.params.score : null;
        const lv = (b.params.lives && U.isVarName(b.params.lives) && ctx.vars.indexOf(b.params.lives)>=0) ? b.params.lives : null;
        const sv = valueExpr(b.params.scoreVal, ctx) || '0'; const lvV = valueExpr(b.params.livesVal, ctx) || '3';
        if (!sc && !lv) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          if (sc) out.push(pad + sc + ' = Number(' + sv + ');');
          if (lv) out.push(pad + lv + ' = Number(' + lvV + ');');
        }
        break;
      }
      case 'game_win': {
        const flag = varParam(b, ctx);
        if (!flag) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + flag + ' = true;');
          const id = idParam(b); const txt = valueExpr(b.params.text, ctx);
          if (id && txt) out.push(pad + "document.getElementById('" + id + "').textContent = String(" + txt + ");");
        }
        break;
      }
      case 'game_over': {
        const flag = varParam(b, ctx);
        if (!flag) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + flag + ' = true;');
          const id = idParam(b); const txt = valueExpr(b.params.text, ctx);
          if (id && txt) out.push(pad + "document.getElementById('" + id + "').textContent = String(" + txt + ");");
        }
        break;
      }
      case 'game_floating_text': {
        const txt = valueExpr(b.params.text, ctx);
        if (!txt) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else { out.push(pad + 'toast(' + txt + ');'); helpers.add('toast'); }
        break;
      }
      case 'canvas_point': {
        const id = idParam(b); const x = valueExpr(b.params.x, ctx); const y = valueExpr(b.params.y, ctx);
        const color = String(b.params.color || '#111').replace(/'/g,"\\'"); const r = parseFloat(b.params.r) || 2;
        if (!id || !x || !y) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) { const ctx = c.getContext('2d'); ctx.fillStyle = '" + color + "'; ctx.beginPath(); ctx.arc(Number(" + x + "), Number(" + y + "), " + r + ", 0, Math.PI*2); ctx.fill(); } }");
          helpers.add('wcsCanvas');
        }
        break;
      }
      case 'canvas_arc': {
        const id = idParam(b); const x = valueExpr(b.params.x, ctx); const y = valueExpr(b.params.y, ctx); const r = valueExpr(b.params.r, ctx);
        const color = String(b.params.color || '#111').replace(/'/g,"\\'");
        if (!id || !x || !y || !r) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) { const ctx = c.getContext('2d'); ctx.strokeStyle = '" + color + "'; ctx.beginPath(); ctx.arc(Number(" + x + "), Number(" + y + "), Number(" + r + "), 0, Math.PI*2); ctx.stroke(); } }");
          helpers.add('wcsCanvas');
        }
        break;
      }
      case 'canvas_save': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) c.getContext('2d').save(); }"); helpers.add('wcsCanvas'); }
        break;
      }
      case 'canvas_restore': {
        const id = idParam(b);
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) c.getContext('2d').restore(); }"); helpers.add('wcsCanvas'); }
        break;
      }
      case 'canvas_alpha': {
        const id = idParam(b); const val = String(b.params.val || '1');
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else { out.push(pad + "{ const c = wcsCanvas('" + id + "'); if (c) c.getContext('2d').globalAlpha = " + val + "; }"); helpers.add('wcsCanvas'); }
        break;
      }
      case 'recipe_todo': {
        const lid = (b.params.listId && U.isElementId(b.params.listId)) ? b.params.listId : null;
        const txt = valueExpr(b.params.text, ctx);
        if (!lid || !txt) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + "{ const __ul = document.getElementById('" + lid + "'); if (__ul) { const __li = document.createElement('li'); __li.textContent = String(" + txt + "); __li.style.cssText='padding:8px;border-bottom:1px solid #e2e8f0;'; __ul.appendChild(__li); } }");
        }
        break;
      }
      case 'recipe_quiz_score': {
        const vn = varParam(b, ctx); const d = valueExpr(b.params.delta, ctx) || '1';
        const lid = (b.params.labelId && U.isElementId(b.params.labelId)) ? b.params.labelId : null;
        if (!vn) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + vn + ' = Number(' + vn + ' || 0) + Number(' + d + ');');
          if (lid) out.push(pad + "document.getElementById('" + lid + "').textContent = String(" + vn + ");");
        }
        break;
      }
      case 'recipe_raffle': {
        const list = (b.params.list && U.isVarName(b.params.list) && ctx.vars.indexOf(b.params.list)>=0) ? b.params.list : null;
        const name = varParam(b, ctx);
        if (!list || !name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = (Array.isArray(' + list + ') && ' + list + '.length) ? ' + list + '[Math.floor(Math.random()*' + list + '.length)] : null;');
        break;
      }
      case 'recipe_dice': {
        const name = varParam(b, ctx); const sides = valueExpr(b.params.sides, ctx) || '6';
        if (!name) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + name + ' = 1 + Math.floor(Math.random() * Math.max(1, Number(' + sides + ')));');
        break;
      }
      case 'recipe_timer_tick': {
        const vn = varParam(b, ctx);
        const lid = (b.params.labelId && U.isElementId(b.params.labelId)) ? b.params.labelId : null;
        if (!vn) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + vn + ' = Math.max(0, Number(' + vn + ' || 0) - 1);');
          if (lid) out.push(pad + "document.getElementById('" + lid + "').textContent = String(" + vn + ");");
        }
        break;
      }
      case 'recipe_expenses_add': {
        const tot = varParam(b, ctx); const amt = valueExpr(b.params.amount, ctx);
        const lid = (b.params.labelId && U.isElementId(b.params.labelId)) ? b.params.labelId : null;
        if (!tot || !amt) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          out.push(pad + tot + ' = Number(' + tot + ' || 0) + Number(' + amt + ');');
          if (lid) out.push(pad + "document.getElementById('" + lid + "').textContent = String(" + tot + ");");
        }
        break;
      }
      case 'recipe_scoreboard': {
        const score = valueExpr(b.params.score, ctx); const info = valueExpr(b.params.info, ctx) || "''";
        const lid = (b.params.labelId && U.isElementId(b.params.labelId)) ? b.params.labelId : null;
        if (!score) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else {
          if (lid) out.push(pad + "document.getElementById('" + lid + "').textContent = String(" + score + ");");
          out.push(pad + 'window.webxdc.sendUpdate({ payload: { score: ' + score + ' }, info: String(' + info + ') });');
        }
        break;
      }
      case 'style_width': {
        const id = idParam(b); const val = String(b.params.val || '').replace(/'/g,"\\'");
        if (!id || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.width = '" + val + "';");
        break;
      }
      case 'style_height': {
        const id = idParam(b); const val = String(b.params.val || '').replace(/'/g,"\\'");
        if (!id || !val) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'params' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.height = '" + val + "';");
        break;
      }
      case 'style_font_weight': {
        const id = idParam(b); const val = String(b.params.val || '400').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.fontWeight = '" + val + "';");
        break;
      }
      case 'style_overflow': {
        const id = idParam(b); const val = String(b.params.val || 'auto').replace(/'/g,"\\'");
        if (!id) { ok = false; problems.push({ id: b.id, type: b.type, reason: 'id' }); }
        else out.push(pad + "document.getElementById('" + id + "').style.overflow = '" + val + "';");
        break;
      }

      default:
        ok = false;
        problems.push({ id: b.id, type: b.type, reason: 'unknown' });
    }

    if (!ok) {
      const label = (def.es && def.es.name) || b.type;
      out.unshift(pad + '/* ⚠ bloque incompleto, no generado: ' + label + ' */');
    }
    return { lines: out, problems, helpers };
  }

  function genBlocks(blocks, ctx, indent) {
    const out = []; const problems = []; const helpers = new Set();
    (blocks || []).forEach(function (b) {
      if (!b || !b.type) return;
      const res = genBlock(b, ctx, indent);
      res.lines.forEach(function (l) { out.push(l); });
      res.problems.forEach(function (p) { problems.push(p); });
      res.helpers.forEach(function (h) { helpers.add(h); });
    });
    return { lines: out, problems, helpers };
  }

  /* Helpers que se incluyen en el archivo generado (solo si se usan) */
  const HELPER_SRC = {
    toast: [
      'function toast(message) {',
      '  let t = document.getElementById("wcs-toast");',
      '  if (!t) {',
      '    t = document.createElement("div");',
      '    t.id = "wcs-toast";',
      '    t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'background:#222;color:#fff;padding:10px 16px;border-radius:10px;z-index:99999;' +
      'font:14px system-ui,sans-serif;max-width:80%;text-align:center";',
      '    document.body.appendChild(t);',
      '  }',
      '  t.textContent = message;',
      '  t.style.display = "block";',
      '  setTimeout(function () { t.style.display = "none"; }, 2200);',
      '}'
    ],
    addListItem: [
      'function addListItem(listId, text) {',
      '  const list = document.getElementById(listId);',
      '  if (!list) return;',
      '  const li = document.createElement("li");',
      '  li.textContent = text;',
      '  list.appendChild(li);',
      '}'
    ],
    sleep: [
      'function sleep(ms) {',
      '  return new Promise(function (resolve) { setTimeout(resolve, ms); });',
      '}'
    ],
    wcsCreate: [
      'function wcsCreate(tag, opts) {',
      '  opts = opts || {};',
      '  const el = document.createElement(tag);',
      '  if (opts.id) el.id = opts.id;',
      '  if (opts.text) el.textContent = opts.text;',
      '  if (opts.src) el.src = (window.__wcsAssets && window.__wcsAssets[opts.src]) || opts.src;',
      '  if (opts.parent) {',
      '    const p = document.getElementById(opts.parent);',
      '    (p || document.body).appendChild(el);',
      '  } else {',
      '    document.body.appendChild(el);',
      '  }',
      '  return el;',
      '}'
    ],
    wcsSetSrc: [
      'function wcsSetSrc(id, src) {',
      '  const el = document.getElementById(id);',
      '  if (el) el.src = (window.__wcsAssets && window.__wcsAssets[src]) || src;',
      '}'
    ],
    wcsAnimate: [
      'function wcsAnimate(id, name) {',
      '  let s = document.getElementById("wcs-anim-style");',
      '  if (!s) {',
      '    s = document.createElement("style");',
      '    s.id = "wcs-anim-style";',
      '    s.textContent = "@keyframes wcs-pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}" +',
      '      "@keyframes wcs-fade{from{opacity:0}to{opacity:1}}" +',
      '      "@keyframes wcs-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}" +',
      '      "@keyframes wcs-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}" +',
      '      "@keyframes wcs-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}";',
      '    document.head.appendChild(s);',
      '  }',
      '  const el = document.getElementById(id);',
      '  if (el) { el.style.animation = "none"; void el.offsetWidth; el.style.animation = name + " .5s"; }',
      '}'
    ],
    wcsKeys: [
      'const wcsKeys = Object.create(null);',
      "(function () {",
      "  function down(e) { wcsKeys[e.key] = true; }",
      "  function up(e) { wcsKeys[e.key] = false; }",
      "  window.addEventListener('keydown', down);",
      "  window.addEventListener('keyup', up);",
      "  window.addEventListener('blur', function () { for (const k of Object.keys(wcsKeys)) wcsKeys[k] = false; });",
      "})();"
    ],
    wcsTimers: [
      'const wcsTimerIds = [];',
      'function wcsStopAllTimers() {',
      '  wcsTimerIds.forEach(function (id) { clearInterval(id); clearTimeout(id); });',
      '  wcsTimerIds.length = 0;',
      '}'
    ],

    wcsNav: [
      'const wcsNavStack = [];',
      "function wcsNavShow(id) {",
      "  document.querySelectorAll('.wcs-screen').forEach(function(el){ el.style.display = 'none'; });",
      "  const el = document.getElementById(id); if (el) { el.style.display = ''; el.classList.add('wcs-screen'); }",
      '}',
      "function wcsNavGo(id) { wcsNavStack.push(id); wcsNavShow(id); }",
      "function wcsNavBack() { wcsNavStack.pop(); const id = wcsNavStack[wcsNavStack.length-1]; if (id) wcsNavShow(id); }",
      "function wcsNavHome() { const first = document.querySelector('.wcs-screen'); if (first) { wcsNavStack.length = 0; wcsNavGo(first.id); } else { const h = document.getElementById('home'); if (h) { wcsNavStack.length = 0; wcsNavGo('home'); } } }",
      "function wcsModalOpen(id) { const el = document.getElementById(id); if (!el) return; el.style.display = ''; el.setAttribute('data-wcs-modal','1'); el.style.cssText += ';position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;'; }",
      "function wcsModalClose(id) { if (id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; return; } document.querySelectorAll('[data-wcs-modal]').forEach(function(el){ el.style.display='none'; }); }",
      "function wcsModalToggle(id) { const el = document.getElementById(id); if (!el) return; if (el.style.display === 'none' || !el.style.display) wcsModalOpen(id); else wcsModalClose(id); }"
    ],
    wcsCmp: [
      "function wcsProgress(id, val) {",
      "  const el = document.getElementById(id); if (!el) return;",
      "  const v = Math.max(0, Math.min(100, Number(val) || 0));",
      "  el.setAttribute('role','progressbar'); el.setAttribute('aria-valuenow', String(v));",
      "  el.style.cssText = 'height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;';",
      "  el.innerHTML = '<div style=\"height:100%;width:'+v+'%;background:#4f46e5;border-radius:999px\"></div>';",
      '}'
    ],
    wcsForm: [
      "function wcsFormField(kind, id, label, parent) {",
      "  const wrap = document.createElement('div'); wrap.style.margin = '8px 0';",
      "  if (label) { const lab = document.createElement('label'); lab.textContent = label; lab.htmlFor = id; lab.style.display='block'; lab.style.fontSize='.85rem'; wrap.appendChild(lab); }",
      "  let input;",
      "  if (kind === 'checkbox') { input = document.createElement('input'); input.type = 'checkbox'; input.id = id; }",
      "  else { input = document.createElement('input'); input.type = kind || 'text'; input.id = id; input.style.cssText='width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;'; }",
      "  wrap.appendChild(input);",
      "  const root = parent ? document.getElementById(parent) : document.body;",
      "  if (root) root.appendChild(wrap);",
      '}',
      "function wcsFormSelect(id, label, options, parent) {",
      "  const wrap = document.createElement('div'); wrap.style.margin = '8px 0';",
      "  if (label) { const lab = document.createElement('label'); lab.textContent = label; lab.htmlFor = id; lab.style.display='block'; wrap.appendChild(lab); }",
      "  const sel = document.createElement('select'); sel.id = id; sel.style.cssText='width:100%;padding:8px;border-radius:8px;';",
      "  String(options||'').split(',').map(function(s){return s.trim();}).filter(Boolean).forEach(function(o){ const opt=document.createElement('option'); opt.value=o; opt.textContent=o; sel.appendChild(opt); });",
      "  wrap.appendChild(sel);",
      "  const root = parent ? document.getElementById(parent) : document.body;",
      "  if (root) root.appendChild(wrap);",
      '}'
    ],
    wcsData: [
      "function wcsDataKey(name) { return 'wcs_col_' + name; }",
      "function wcsDataEnsure(name) { try { if (!localStorage.getItem(wcsDataKey(name))) localStorage.setItem(wcsDataKey(name), '[]'); } catch (e) {} }",
      "function wcsDataAll(name) { try { return JSON.parse(localStorage.getItem(wcsDataKey(name)) || '[]'); } catch (e) { return []; } }",
      "function wcsDataSave(name, arr) { try { localStorage.setItem(wcsDataKey(name), JSON.stringify(arr)); } catch (e) {} }",
      "function wcsDataCreate(name, data) { wcsDataEnsure(name); const arr = wcsDataAll(name); const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); const rec = Object.assign({ id: id }, (data && typeof data === 'object') ? data : { value: data }); arr.push(rec); wcsDataSave(name, arr); return id; }",
      "function wcsDataGet(name, id) { return wcsDataAll(name).find(function(r){ return r && r.id === id; }) || null; }",
      "function wcsDataUpdate(name, id, data) { const arr = wcsDataAll(name); const i = arr.findIndex(function(r){ return r && r.id === id; }); if (i < 0) return; arr[i] = Object.assign({}, arr[i], (data && typeof data === 'object') ? data : { value: data }, { id: id }); wcsDataSave(name, arr); }",
      "function wcsDataDelete(name, id) { wcsDataSave(name, wcsDataAll(name).filter(function(r){ return !r || r.id !== id; })); }"
    ],
    wcsTone: [
      'function wcsTone(freq, ms, wave, vol) {',
      '  try {',
      '    wcsTone.ctx = wcsTone.ctx || new (window.AudioContext || window.webkitAudioContext)();',
      '    const ctx = wcsTone.ctx;',
      '    const o = ctx.createOscillator();',
      '    const g = ctx.createGain();',
      '    o.type = wave || "square"; o.frequency.value = freq || 440;',
      '    const v = Math.min(1, Math.max(0, vol == null ? 0.5 : vol));',
      '    const t = ctx.currentTime;',
      '    g.gain.setValueAtTime(0.0001, t);',
      '    g.gain.exponentialRampToValueAtTime(Math.max(0.001, v * 0.5), t + 0.015);',
      '    g.gain.exponentialRampToValueAtTime(0.0001, t + (ms || 300) / 1000);',
      '    o.connect(g); g.connect(ctx.destination);',
      '    o.start(t); o.stop(t + (ms || 300) / 1000 + 0.05);',
      '  } catch (e) { /* sin audio en este entorno */ }',
      '}'
    ],
    wcsPlaySound: [
      'wcsPlaySound._playing = [];',
      'function wcsPlaySound(src, vol) {',
      '  try {',
      '    const a = new Audio((window.__wcsAssets && window.__wcsAssets[src]) || src);',
      '    a.volume = Math.min(1, Math.max(0, vol == null ? 0.8 : vol));',
      '    wcsPlaySound._playing.push(a);',
      '    if (wcsPlaySound._playing.length > 16) wcsPlaySound._playing.shift();',
      '    a.play().catch(function () {});',
      '  } catch (e) { /* sin audio */ }',
      '}'
    ],
    wcsStopSounds: [
      'function wcsStopSounds() {',
      '  (wcsPlaySound._playing || []).forEach(function (a) { try { a.pause(); } catch (e) {} });',
      '  wcsPlaySound._playing = [];',
      '  try { if (wcsTone.ctx) wcsTone.ctx.close && wcsTone.ctx.close(); wcsTone.ctx = null; } catch (e) {}',
      '}'
    ],
    wcsCanvas: [
      'function wcsCanvas(id) {',
      '  const cv = document.getElementById(id);',
      '  if (!cv || !cv.getContext) return null;',
      '  return cv.getContext("2d");',
      '}'
    ],
    wcsTouch: [
      'var wcsLastTouch = { x: 0, y: 0 };'
    ],
    wireTouch: [
      'function wireTouch(id, handler) {',
      '  const el = document.getElementById(id);',
      '  if (!el) return;',
      '  const down = function (ev) {',
      '    const r = el.getBoundingClientRect();',
      '    const cx = (ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0));',
      '    const cy = (ev.clientY != null ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0));',
      '    let x = cx - r.left, y = cy - r.top;',
      '    if (el.width != null && r.width) x = Math.round(x * (el.width / r.width));',
      '    if (el.height != null && r.height) y = Math.round(y * (el.height / r.height));',
      '    wcsLastTouch.x = x; wcsLastTouch.y = y;',
      '    ev.preventDefault();',
      '    handler(x, y);',
      '  };',
      '  if (window.PointerEvent) el.addEventListener("pointerdown", down, { passive: false });',
      '  else {',
      '    el.addEventListener("touchstart", function (e) { down(e.touches[0]); }, { passive: false });',
      '    el.addEventListener("mousedown", down);',
      '  }',
      '  if (el.style) { el.style.touchAction = "none"; el.style.userSelect = "none"; }',
      '}'
    ],
    wcsDrawImage: [
      'wcsDrawImage._cache = {};',
      'function wcsDrawImage(id, src, x, y, w, h) {',
      '  const c = wcsCanvas(id);',
      '  if (!c) return Promise.resolve(false);',
      '  if (wcsDrawImage._cache[src]) {',
      '    c.drawImage(wcsDrawImage._cache[src], x, y, w, h);',
      '    return Promise.resolve(true);',
      '  }',
      '  return new Promise(function (resolve) {',
      '    const im = new Image();',
      '    im.onload = function () {',
      '      wcsDrawImage._cache[src] = im;',
      '      c.drawImage(im, x, y, w, h);',
      '      resolve(true);',
      '    };',
      '    im.onerror = function () { resolve(false); };',
      '    im.src = (window.__wcsAssets && window.__wcsAssets[src]) || src;',
      '  });',
      '}'
    ],
    wireTap: [
      'function wireTap(id, handler) {',
      '  const el = document.getElementById(id);',
      '  if (el) el.addEventListener("click", handler);',
      '}'
    ],
    wireChange: [
      'function wireChange(id, handler) {',
      '  const el = document.getElementById(id);',
      '  if (el) el.addEventListener("change", handler);',
      '}'
    ]
  };

  /* Genera el archivo JS completo a partir del modelo. */
  function generate(model, opts) {
    opts = opts || {};
    model = normalizeModel(model);
    const varNames = model.vars.map(function (v) { return v.name; });
    const fnNames = model.contexts.functions.map(function (f) { return f.target; });
    const timerNames = collectTimerNames(model);
    const ctx = { vars: varNames, functions: fnNames, timers: timerNames };
    const problems = [];
    const helpers = new Set();

    const L = [];
    L.push('/* ============================================================');
    L.push(' * Code generated by Webxdc Creator Studio — Blocks view.');
      L.push(' * You can edit it by hand; regenerating will ask for confirmation.');
    L.push(' * Studio will warn if it detects manual edits.');
    L.push(' * ' + new Date().toISOString());
    L.push(' * ============================================================ */');
    L.push("'use strict';");
    L.push('');

    /* Variables */
    if (model.vars.length) {
      L.push('/* ---- Variables ---- */');
      model.vars.forEach(function (v) {
        let init;
        if (v.value === '' || v.value == null) init = 'null';
        else {
          const n = Number(v.value);
          init = (v.value !== '' && isFinite(n) && /^[+-]?\d+(\.\d+)?$/.test(String(v.value).trim()))
            ? String(n)
            : JSON.stringify(String(v.value));
        }
        L.push('let ' + v.name + ' = ' + init + ';');
      });
      L.push('');
    }

    /* Temporizadores declarados con «Cada X ms» */
    if (timerNames.length) {
      L.push('/* ---- Temporizadores (repetidores) ---- */');
      L.push('let ' + timerNames.join(', ') + ';');
      L.push('');
    }

    /* Eventos de clic / cambio */
    const wireHelpers = new Set();
    const clickSections = [];
    model.contexts.onClick.forEach(function (t) {
      const res = genBlocks(t.blocks, ctx, 1);
      res.problems.forEach(function (p) { problems.push(p); });
      res.helpers.forEach(function (h) { helpers.add(h); });
      if (!res.lines.length) return;
      wireHelpers.add('wireTap');
      const sec = [];
      sec.push('/* ---- Al pulsar #' + t.target + ' ---- */');
      sec.push("wireTap('" + t.target + "', async () => {");
      res.lines.forEach(function (l) { sec.push(l); });
      sec.push('});');
      clickSections.push(sec);
    });
    model.contexts.onTouch.forEach(function (t) {
      const res = genBlocks(t.blocks, ctx, 1);
      res.problems.forEach(function (p) { problems.push(p); });
      res.helpers.forEach(function (h) { helpers.add(h); });
      if (!res.lines.length) return;
      wireHelpers.add('wireTouch');
      const sec = [];
      sec.push('/* ---- On touch #' + t.target + ' ---- */');
      sec.push("wireTouch('" + t.target + "', async (x, y) => {");
      res.lines.forEach(function (l) { sec.push(l); });
      sec.push('});');
      clickSections.push(sec);
    });
    model.contexts.onChange.forEach(function (t) {
      const res = genBlocks(t.blocks, ctx, 1);
      res.problems.forEach(function (p) { problems.push(p); });
      res.helpers.forEach(function (h) { helpers.add(h); });
      if (!res.lines.length) return;
      wireHelpers.add('wireChange');
      const sec = [];
      sec.push('/* ---- On change #' + t.target + ' ---- */');
      sec.push("wireChange('" + t.target + "', async () => {");
      res.lines.forEach(function (l) { sec.push(l); });
      sec.push('});');
      clickSections.push(sec);
    });

    /* On start */
    const startRes = genBlocks(model.contexts.onStart, ctx, 1);
    startRes.problems.forEach(function (p) { problems.push(p); });
    startRes.helpers.forEach(function (h) { helpers.add(h); });
    const hasStart = startRes.lines.length > 0;

    /* On update */
    const updateRes = genBlocks(model.contexts.onUpdate, ctx, 1);
    updateRes.problems.forEach(function (p) { problems.push(p); });
    updateRes.helpers.forEach(function (h) { helpers.add(h); });
    const hasUpdate = updateRes.lines.length > 0;

    /* User-defined functions */
    const fnSections = [];
    model.contexts.functions.forEach(function (f) {
      const res = genBlocks(f.blocks, ctx, 1);
      res.problems.forEach(function (p) { problems.push(p); });
      res.helpers.forEach(function (h) { helpers.add(h); });
      if (!res.lines.length) return;
      const sec = [];
      sec.push('/* ---- Function ' + f.target + ' ---- */');
      sec.push('async function ' + f.target + '() {');
      res.lines.forEach(function (l) { sec.push(l); });
      sec.push('}');
      fnSections.push(sec);
    });

    /* Helpers */
    const allHelpers = new Set(helpers);
    wireHelpers.forEach(function (h) { allHelpers.add(h); });
    const helperLines = [];
    ['wcsTouch', 'wireTouch', 'wcsDrawImage', 'wireTap', 'wireChange', 'toast', 'addListItem', 'sleep', 'wcsCreate', 'wcsSetSrc', 'wcsAnimate', 'wcsTone', 'wcsPlaySound', 'wcsStopSounds', 'wcsCanvas', 'wcsKeys', 'wcsTimers', 'wcsNav', 'wcsCmp', 'wcsForm', 'wcsData'].forEach(function (h) {
      if (allHelpers.has(h)) helperLines.push.apply(helperLines, HELPER_SRC[h]);
    });

    if (allHelpers.has('wireTouch') || helpers.has('touch_pos')) allHelpers.add('wcsTouch');
    if (helperLines.length) {
      L.push('/* ---- Funciones auxiliares (generadas) ---- */');
      helperLines.forEach(function (h) { L.push(h); });
      L.push('');
    }

    fnSections.forEach(function (sec) {
      sec.forEach(function (l) { L.push(l); });
      L.push('');
    });

    clickSections.forEach(function (sec) {
      sec.forEach(function (l) { L.push(l); });
      L.push('');
    });

    if (hasStart) {
      L.push('/* ---- On app start ---- */');
      L.push("document.addEventListener('DOMContentLoaded', async () => {");
      startRes.lines.forEach(function (l) { L.push(l); });
      L.push('});');
      L.push('');
    }

    if (hasUpdate) {
      L.push('/* ---- On webxdc update ---- */');
      L.push('if (window.webxdc && window.webxdc.setUpdateListener) {');
      L.push('  window.webxdc.setUpdateListener((update) => {');
      L.push('    /* clients may deliver one or many updates at once */');
      L.push('    (Array.isArray(update) ? update : [update]).forEach((u) => { handleUpdate(u); });');
      L.push('  }, 0);');
      L.push('} else {');
      L.push("  console.warn('webxdc not available (are you in the preview?)');");
      L.push('}');
      L.push('');
      L.push('async function handleUpdate(update) {');
      updateRes.lines.forEach(function (l) { L.push(l); });
      L.push('}');
      L.push('');
    }

    if (!model.vars.length && !hasStart && !hasUpdate && !clickSections.length && !timerNames.length && !fnSections.length) {
      L.push('/* (No blocks yet: add blocks in the Blocks view) */');
    }

    return { code: L.join('\n') + '\n', problems: problems };
  }

  /* ------------------------------------------------------------------ *
   * Analysis for the Validator
   * ------------------------------------------------------------------ */
  /* Element #ids referenced by blocks (includes click/change context
     targets: those are element references too). */
  function referencedElements(model) {
    model = normalizeModel(model);
    const ids = new Set();
    const vars = model.vars.map(function (v) { return v.name; });
    function walk(blocks) {
      (blocks || []).forEach(function (b) {
        const def = DEFS[b.type];
        if (!def) return;
        def.params.forEach(function (p) {
          if (p.type === 'element' && U.isElementId(b.params[p.key])) ids.add(b.params[p.key]);
          if (p.type === 'value' && b.params[p.key] && b.params[p.key].kind === 'input' && U.isElementId(b.params[p.key].id)) {
            ids.add(b.params[p.key].id);
          }
        });
        walk(b.children);
        walk(b.childrenElse);
      });
    }
    walk(model.contexts.onStart); walk(model.contexts.onUpdate);
    model.contexts.onClick.forEach(function (t) {
      if (U.isElementId(t.target)) ids.add(t.target);
      walk(t.blocks);
    });
    model.contexts.onChange.forEach(function (t) {
      if (U.isElementId(t.target)) ids.add(t.target);
      walk(t.blocks);
    });
    model.contexts.onTouch.forEach(function (t) {
      if (U.isElementId(t.target)) ids.add(t.target);
      walk(t.blocks);
    });
    model.contexts.functions.forEach(function (t) { walk(t.blocks); });
    return { ids: Array.from(ids), vars: vars };
  }

  /* Insert <div id> into HTML if a block points at a missing id.
   * So the block puzzle creates real code AND files (index.html). */
  function ensurePlaceholders(html, ids) {
    html = String(html || '');
    const added = [];
    (ids || []).forEach(function (id) {
      if (!U.isElementId(id)) return;
      if (html.indexOf('id="' + id + '"') >= 0 || html.indexOf("id='" + id + "'") >= 0) return;
      added.push(id);
    });
    if (!added.length) return { html: html, added: added };
    const snippet = added.map(function (id) {
      return '<div id="' + id + '" data-cs-placeholder="1"></div>';
    }).join('\n');
    const close = html.search(/<\/body>/i);
    if (close >= 0) html = html.slice(0, close) + snippet + '\n' + html.slice(close);
    else html += '\n' + snippet;
    return { html: html, added: added };
  }

  /* ------------------------------------------------------------------ *
   * Export
   * ------------------------------------------------------------------ */
  CS.blocks = {
    DEFS, CATS, OPS,
    newModel, normalizeModel, newBlock,
    generate, genBlock, valueExpr, referencedElements, ensurePlaceholders,
    isHexColor,
    meta: function (type, lang) {
      const d = DEFS[type];
      return d ? (d[lang] || d.es) : null;
    }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.blocks; }
})();
