/* Spanish strings: tools suite. */
'use strict';
CS.i18n.add('es', {
  srch_g_tools: 'Herramientas', srch_g_templates: 'Plantillas',
  /* Hub */
  tl_kicker: 'Utilidades', tl_title: 'Herramientas', tl_lead: 'Una caja de herramientas para tus miniapps. Todo funciona sin conexión y se guarda en tus proyectos.',
  tl_search: 'Buscar herramienta', tl_recent: 'Usadas hace poco', tl_none: 'Ninguna herramienta coincide con «{q}»', tl_missing: 'Esta herramienta no existe',
  tl_group_design: 'Diseño', tl_group_share: 'Compartir', tl_group_data: 'Datos y texto', tl_group_studio: 'Estudio',
  tl_color: 'Colores', tl_color_sub: 'Selector, armonías, escalas y contraste', tl_color_kw: 'paleta hex rgb hsl contraste accesible',
  tl_gradient: 'Degradados', tl_gradient_sub: 'Fondos y textos con degradado', tl_gradient_kw: 'gradient fondo css',
  tl_shadow: 'Sombras y bordes', tl_shadow_sub: 'Profundidad y esquinas redondeadas', tl_shadow_kw: 'box-shadow radio esquinas tarjeta',
  tl_icon: 'Icono de la app', tl_icon_sub: 'Diseña el icon.png de tu miniapp', tl_icon_kw: 'logo icon png imagen',
  tl_qr: 'Código QR', tl_qr_sub: 'Enlaces, textos, wifi y correo', tl_qr_kw: 'qr codigo escanear wifi enlace',
  tl_json: 'JSON', tl_json_sub: 'Valida, arregla y ordena datos', tl_json_kw: 'datos validar formato objeto',
  tl_regex: 'Expresiones regulares', tl_regex_sub: 'Busca patrones en texto, explicado', tl_regex_kw: 'regex patron buscar reemplazar',
  tl_encode: 'Codificar', tl_encode_sub: 'Base64, URL, HTML y archivos', tl_encode_kw: 'base64 url html data url archivo',
  tl_sample: 'Datos de ejemplo', tl_sample_sub: 'Nombres, correos, fechas y más', tl_sample_kw: 'falsos prueba lista nombres',
  'tl_st-pixel': 'Editor de píxeles', 'tl_st-pixel_sub': 'Sprites, iconos y animaciones', 'tl_st-pixel_kw': 'sprite dibujo pixel art',
  'tl_st-image': 'Editor de fotos', 'tl_st-image_sub': 'Recorta, ajusta y aplica filtros', 'tl_st-image_kw': 'foto imagen filtro recortar',
  'tl_st-audio': 'Estudio de sonido', 'tl_st-audio_sub': 'Efectos y música para juegos', 'tl_st-audio_kw': 'sonido musica efecto audio',

  /* Shared */
  tl_code: 'CSS', tl_use: 'Usar en mi app', tl_use_title: 'Añadir a una app', tl_use_sub: 'Se añade al final de su hoja de estilos. Ponle la clase a cualquier elemento.',
  tl_class: 'Nombre de la clase', tl_class_hint: 'Luego ponla en el HTML: class="nombre-de-la-clase"', tl_add: 'Añadir',
  tl_added: 'Clase {name} añadida a {file}', tl_added_raw: 'Añadido a {file}', tl_from_tools: 'Creado con Herramientas: {tool}',
  tl_no_projects: 'Primero crea una app', tl_copied_value: 'Copiado: {v}', tl_swap: 'Intercambiar', tl_example: 'Ejemplo', tl_clear: 'Vaciar',
  tl_presets: 'Ideas', tl_style: 'Estilo', tl_colors: 'Colores', tl_angle: 'Ángulo', tl_position: 'Posición', tl_random: 'Sorpréndeme',

  /* Colors */
  tl_hue: 'Tono', tl_sat: 'Saturación', tl_light: 'Luz', tl_formats: 'Formatos', tl_harmony: 'Armonías', tl_scale: 'Escala',
  tl_h_complementary: 'Opuesto', tl_h_analogous: 'Vecinos', tl_h_triad: 'Trío', tl_h_tetrad: 'Cuarteto',
  tl_harmony_hint: 'Colores que combinan con el tuyo. Toca uno para usarlo como color principal.',
  tl_scale_hint: 'Del más claro al más oscuro, con el mismo tono. Útil para fondos, bordes y texto. Toca para copiar.',
  tl_text_on: 'Texto en {c} · contraste {r}:1', tl_white: 'blanco', tl_black: 'negro',
  tl_contrast: 'Contraste', tl_text_color: 'Color del texto', tl_sample_big: 'Título grande', tl_sample_small: 'Así se lee un texto normal sobre este fondo.',
  tl_ratio_great: 'Excelente para todos', tl_ratio_good: 'Bien para leer', tl_ratio_large: 'Solo para textos grandes', tl_ratio_bad: 'Cuesta leerlo',
  tl_large: 'Grande', tl_contrast_hint: 'AA es el mínimo recomendado para que todo el mundo lea bien, también al sol o con poca vista. AAA es aún mejor.',
  tl_palette_css: 'Variables',

  /* Gradients */
  tl_linear: 'Lineal', tl_radial: 'Radial', tl_conic: 'Cónico', tl_grad_word: 'Hola', tl_grad_text: 'Aplicarlo al texto en vez de al fondo',
  tl_add_color: 'Añadir color', tl_min_stops: 'Un degradado necesita al menos dos colores', tl_class_gradient: 'fondo-degradado',

  /* Shadows */
  tl_sp_soft: 'Suave', tl_sp_raised: 'Elevada', tl_sp_floating: 'Flotante', tl_sp_glow: 'Brillo', tl_sp_inset: 'Hundida', tl_sp_sharp: 'Dura',
  tl_sh_shape: 'Esquinas', tl_sh_radius: 'Redondeo', tl_sh_light: 'Sombra', tl_sh_x: 'Horizontal', tl_sh_y: 'Vertical', tl_sh_blur: 'Desenfoque',
  tl_sh_spread: 'Tamaño', tl_sh_alpha: 'Intensidad', tl_sh_color: 'Color', tl_sh_tint: 'Color del brillo',
  tl_sh_layered: 'Realista (dos capas)', tl_sh_inset: 'Hacia dentro', tl_sh_tinted: 'Usar el color del brillo', tl_class_shadow: 'tarjeta',

  /* App icon */
  tl_ic_app: 'Mi app', tl_icon_design: 'Diseñar', tl_ic_bubble: 'Así se verá en el chat', tl_ic_save: 'Guardar como icon.png',
  tl_ic_glyph: 'Dibujo', tl_ic_icon: 'Icono', tl_ic_letters: 'Letras', tl_ic_letters_label: 'Hasta 3 letras', tl_ic_letters_hint: 'Por ejemplo la inicial de tu app.',
  tl_ic_search: 'Buscar (en inglés: star, heart…)', tl_ic_stroke: 'Grosor', tl_ic_size: 'Tamaño', tl_ic_fg: 'Color del dibujo',
  tl_ic_back: 'Fondo', tl_ic_gradient: 'Degradado', tl_ic_solid: 'Liso', tl_ic_c1: 'Color 1', tl_ic_c2: 'Color 2',
  tl_ic_shape: 'Forma', tl_ic_full: 'Completo', tl_ic_squircle: 'Squircle', tl_ic_rounded: 'Redondeado', tl_ic_circle: 'Círculo',
  tl_ic_shape_hint: 'Delta Chat ya redondea los iconos por su cuenta, así que «Completo» suele quedar mejor.',
  tl_ic_shine: 'Brillo', tl_ic_depth: 'Sombra', tl_ic_spark: 'Chispa',

  /* QR */
  tl_qr_k_link: 'Enlace', tl_qr_k_text: 'Texto', tl_qr_k_wifi: 'Wi-Fi', tl_qr_k_mail: 'Correo',
  tl_qr_link: 'Dirección web', tl_qr_text: 'Texto', tl_qr_ssid: 'Nombre de la red', tl_qr_pass: 'Contraseña', tl_qr_sec: 'Seguridad', tl_qr_open: 'Abierta',
  tl_qr_mail: 'Correo', tl_qr_subject: 'Asunto (opcional)', tl_qr_content: 'Contenido', tl_qr_look: 'Aspecto', tl_qr_level: 'Resistencia a daños',
  tl_qr_s_square: 'Cuadrados', tl_qr_s_round: 'Redondeados', tl_qr_s_dots: 'Puntos', tl_qr_dark: 'Puntos', tl_qr_light: 'Fondo', tl_qr_margin_label: 'Margen',
  tl_qr_level_hint: 'L recupera el 7 % si el código se mancha o se tapa, M el 15 %, Q el 25 % y H el 30 %. Más resistencia hace el código más denso.',
  tl_qr_info: 'Versión {v} · {n}×{n} módulos · nivel {l} · {b} bytes',
  tl_qr_too_long: 'Es demasiado texto para un código QR. Acórtalo o baja la resistencia a L.',
  tl_qr_inverted: 'Los puntos deben ser más oscuros que el fondo; muchas cámaras no leen códigos invertidos.',
  tl_qr_low_contrast: 'Poco contraste entre puntos y fondo: puede que no se lea.', tl_qr_margin: 'Deja al menos 2 de margen para que las cámaras lo encuentren.',
  tl_qr_save: 'Guardar imagen', tl_qr_copy: 'Copiar contenido',

  /* JSON */
  tl_js_empty: 'Pega o escribe tus datos JSON', tl_js_valid: 'JSON correcto', tl_js_invalid: 'Hay un error', tl_js_at: 'línea {line}, columna {col}',
  tl_js_array: 'lista con {n} elementos', tl_js_object: 'objeto con {n} claves', tl_js_value: 'valor de tipo {type}', tl_js_more: 'y {n} más…',
  tl_js_m_comments: 'JSON no admite comentarios (// o /* */).', tl_js_m_single: 'Los textos van entre comillas dobles "así", no simples.',
  tl_js_m_keys: 'Las claves también llevan comillas dobles: "nombre": …', tl_js_m_trailing: 'Sobra una coma antes de } o ].',
  tl_js_fix: 'Arreglarlo por mí', tl_js_hint: 'Revisa comas, comillas dobles y que cada { y [ tenga su pareja.', tl_js_fix_first: 'Primero corrige el error',
  tl_js_format: 'Ordenar bonito', tl_js_minify: 'Compactar', tl_js_sort: 'Claves A-Z', tl_js_tree: 'Explorar',
  tl_js_tip: 'Consejo: en tu app, JSON.stringify(datos) convierte datos en texto y JSON.parse(texto) los recupera. Así se guardan en localStorage o se envían con webxdc.',

  /* Regex */
  tl_rx_pattern: 'Patrón', tl_rx_recipes: 'Recetas', tl_rx_text: 'Texto de prueba', tl_rx_explain: 'Qué significa cada parte', tl_rx_code: 'Úsalo en JavaScript',
  tl_rx_sample: 'Escribe a ana@example.org o a beto.perez@correo.net antes del 12/10/2026 a las 18:30. #fiesta @carla',
  tl_rx_count_one: '{n} coincidencia', tl_rx_count_other: '{n} coincidencias', tl_rx_invalid: 'Patrón no válido',
  tl_rx_behind: 'Mirar hacia atrás (?<=) no funciona en algunos móviles antiguos.',
  tl_rx_f_g: 'todas', tl_rx_f_i: 'sin mayúsculas', tl_rx_f_m: 'por línea', tl_rx_f_s: 'punto incluye saltos',
  tl_rx_r_email: 'Correos', tl_rx_r_number: 'Números', tl_rx_r_date: 'Fechas', tl_rx_r_time: 'Horas', tl_rx_r_url: 'Enlaces', tl_rx_r_hashtag: 'Hashtags',
  tl_rx_r_mention: 'Menciones', tl_rx_r_hex: 'Colores hex', tl_rx_r_spaces: 'Espacios dobles', tl_rx_r_capital: 'Palabras con mayúscula',
  tl_rx_t_digit: 'un dígito (0-9)', tl_rx_t_notdigit: 'cualquier cosa menos un dígito', tl_rx_t_word: 'una letra, número o _', tl_rx_t_notword: 'cualquier cosa menos letra o número',
  tl_rx_t_space: 'un espacio, tabulador o salto', tl_rx_t_notspace: 'cualquier cosa menos espacios', tl_rx_t_boundary: 'borde de palabra', tl_rx_t_newline: 'salto de línea', tl_rx_t_tab: 'tabulador',
  tl_rx_t_literal: 'el carácter «{c}» tal cual', tl_rx_t_text: 'el texto «{c}»', tl_rx_t_set: 'uno de estos: {set}', tl_rx_t_notset: 'cualquiera menos: {set}',
  tl_rx_t_exact: 'exactamente {a} veces', tl_rx_t_atleast: '{a} veces o más', tl_rx_t_range: 'entre {a} y {b} veces',
  tl_rx_t_group: 'empieza un grupo (se guarda como $1, $2…)', tl_rx_t_nocap: 'empieza un grupo que no se guarda', tl_rx_t_close: 'cierra el grupo',
  tl_rx_t_ahead: 'mira lo que viene después, sin incluirlo', tl_rx_t_behind: 'mira lo que hay antes, sin incluirlo',
  tl_rx_t_any: 'cualquier carácter', tl_rx_t_plus: 'lo anterior, una vez o más', tl_rx_t_star: 'lo anterior, cero o más veces', tl_rx_t_opt: 'lo anterior es opcional',
  tl_rx_t_start: 'inicio del texto', tl_rx_t_end: 'final del texto', tl_rx_t_or: 'o bien',

  /* Encode */
  tl_en_enc: 'Codificar', tl_en_dec: 'Decodificar', tl_en_result: 'Resultado', tl_en_file: 'Archivo a data URL',
  tl_en_file_big: 'El archivo es demasiado grande (máximo 5 MB)', tl_en_file_done: '{name} convertido ({size})',
  tl_en_bad_base64: 'No es Base64 válido.', tl_en_bad_url: 'Hay un % que no forma un código válido.', tl_en_bad_html: 'No se pudo decodificar.',
  tl_en_hint_base64: 'Base64 convierte cualquier dato en letras y números seguros para guardar o enviar. Ocupa un 33 % más.',
  tl_en_hint_url: 'Codifica espacios, tildes y símbolos para ponerlos dentro de un enlace.',
  tl_en_hint_html: 'Escapa < > & y comillas para mostrar texto como texto y no como HTML. Imprescindible con lo que escriben otras personas.',

  /* Sample data */
  tl_sm_fields: 'Qué datos quieres', tl_sm_count: 'Cuántos', tl_sm_lines: 'Texto', tl_sm_again: 'Otros datos', tl_sm_result: 'Datos', tl_sm_var: 'datos',
  tl_sm_hint: 'Datos inventados para probar tu app sin usar información real de nadie.',
  tl_sm_f_name: 'Nombre', tl_sm_f_email: 'Correo', tl_sm_f_phone: 'Teléfono', tl_sm_f_city: 'Ciudad', tl_sm_f_date: 'Fecha', tl_sm_f_number: 'Número',
  tl_sm_f_price: 'Precio', tl_sm_f_bool: 'Sí/No', tl_sm_f_color: 'Color', tl_sm_f_thing: 'Producto', tl_sm_f_sentence: 'Frase', tl_sm_f_id: 'ID',
  tl_sm_key_name: 'nombre', tl_sm_key_email: 'correo', tl_sm_key_phone: 'telefono', tl_sm_key_city: 'ciudad', tl_sm_key_date: 'fecha', tl_sm_key_number: 'numero',
  tl_sm_key_price: 'precio', tl_sm_key_bool: 'hecho', tl_sm_key_color: 'color', tl_sm_key_thing: 'producto', tl_sm_key_sentence: 'frase', tl_sm_key_id: 'id'
});
