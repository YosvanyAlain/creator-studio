/* Spanish strings: learn hub, lessons, reference, glossary, troubleshooting and search. */
'use strict';
CS.i18n.add('es', {
  /* Hub */
  lr_eyebrow: 'Aprende a crear', lr_intro: 'Lecciones cortas y prácticas para crear tus propias miniapps. Aprende tocando, sin prisas.',
  lr_level_n: 'Nivel {n}', lr_xp_to: '{xp} de {next} XP', lr_xp_max: '{xp} XP · nivel máximo',
  lr_streak_one: 'día', lr_streak_other: 'días', lr_streak_short: 'racha', lr_lessons: 'lecciones', lr_medals: 'medallas',
  lr_continue: 'Continuar', lr_start: 'Empieza aquí', lr_tracks: 'Rutas', lr_lookup: 'Consulta',
  lr_track_n: '{done} de {total} lecciones', lr_track_done: 'Ruta completada', lr_done: 'completada',
  lr_min: '{n} min', lr_steps: '{n} pasos', lr_challenges_one: '{n} reto', lr_challenges_other: '{n} retos', lr_go: 'Empezar',
  lr_look_reference: 'Referencia', lr_look_reference_sub: 'HTML, CSS, JS, webxdc y bloques',
  lr_look_glossary: 'Glosario', lr_look_glossary_sub: 'Palabras explicadas fácil',
  lr_look_trouble: 'Algo no funciona', lr_look_trouble_sub: 'Problemas comunes y soluciones',
  lr_look_medals: 'Medallas', lr_look_medals_sub: 'Tus logros',
  lr_medals_title: 'Medallas', lr_medals_sub: '{got} de {total} conseguidas',
  lr_level_up: '¡Subiste de nivel!', lr_new_medal: 'Nueva medalla',
  lv_1: 'Semilla', lv_2: 'Chispa', lv_3: 'Aprendiz', lv_4: 'Talento', lv_5: 'Maestría', lv_6: 'Leyenda', lv_7: 'Estrella',

  /* Medals */
  md_first: 'Primer paso', md_first_how: 'Completa tu primera lección',
  md_five: 'Buen ritmo', md_five_how: 'Completa 5 lecciones',
  md_ten: 'Imparable', md_ten_how: 'Completa 10 lecciones',
  md_perfect: 'Puntería', md_perfect_how: 'Acierta todos los retos de 3 lecciones a la primera',
  md_streak3: 'Constancia', md_streak3_how: 'Aprende 3 días seguidos',
  md_streak7: 'Semana de oro', md_streak7_how: 'Aprende 7 días seguidos',
  md_curious: 'Curiosidad', md_curious_how: 'Abre la referencia y el glosario',
  md_all: 'Graduación', md_all_how: 'Completa todas las lecciones',
  md_track: 'Ruta: {name}', md_track_how: 'Completa todas las lecciones de esta ruta',

  /* Lesson player */
  ls_missing: 'Esta lección no existe', ls_continue: 'Continuar', ls_check: 'Comprobar', ls_finish: 'Terminar', ls_retry: 'Intentar de nuevo', ls_skip: 'Saltar',
  ls_ok_1: '¡Correcto!', ls_ok_2: '¡Muy bien!', ls_ok_3: '¡Exacto!', ls_ok_4: '¡Así es!',
  ls_soft: '¡Lo lograste!', ls_bad: 'Casi. Inténtalo otra vez',
  ls_order_hint: 'Toca las piezas de abajo en el orden correcto',
  ls_live: 'En vivo', ls_reload: 'Reiniciar', ls_save_app: 'Guardar como app', ls_saved_app: 'Guardado en Mis apps', ls_try_app: 'Ejemplo de lección',
  ls_score: 'aciertos', ls_correct: 'retos', ls_end_title: '¡Lección completada!', ls_end_perfect: '¡Perfecto, sin fallos!',
  ls_end_sub: 'Terminaste «{lesson}».', ls_next_lesson: 'Siguiente lección', ls_back_path: 'Volver a la ruta',
  ls_leave_title: '¿Salir de la lección?', ls_leave_body: 'Perderás el avance de esta lección. Podrás empezarla de nuevo cuando quieras.', ls_leave: 'Salir',

  /* Reference */
  rf_search: 'Buscar en la referencia', rf_count_one: '{n} entrada', rf_count_other: '{n} entradas', rf_related: 'Aprende más',
  rf_cat_webxdc: 'Webxdc', rf_cat_html: 'HTML', rf_cat_css: 'CSS', rf_cat_js: 'JavaScript', rf_cat_blocks: 'Bloques',
  rf_fill: 'Lo que se rellena', rf_where: 'Lo encontrarás en la pestaña Bloques, categoría «{cat}».',
  rf_ptype_element: 'un elemento de la página', rf_ptype_value: 'un valor', rf_ptype_text: 'un texto', rf_ptype_number: 'un número',
  rf_ptype_var: 'una variable', rf_ptype_select: 'una opción', rf_ptype_expr: 'una expresión', rf_ptype_color: 'un color', rf_ptype_func: 'una función',
  kind_tag_pl: 'Etiquetas', kind_attr_pl: 'Atributos', kind_prop_pl: 'Propiedades', kind_keyword_pl: 'Palabras clave', kind_api_pl: 'Funciones y objetos',
  kind_webxdc_pl: 'API de webxdc', kind_snippet_pl: 'Atajos del editor',
  all: 'Todo', clear: 'Borrar',
  search_none: 'Nada para «{q}»', search_none_body: 'Prueba con otra palabra o revisa cómo está escrita.',

  /* Glossary */
  gl_search: 'Buscar una palabra', gl_see: 'Ver también',

  /* Troubleshooting */
  ts_intro: 'Elige lo que te pasa y sigue los pasos. La mayoría de los problemas se arreglan en un minuto.',
  ts_why: 'Por qué pasa', ts_fix: 'Cómo arreglarlo', ts_lesson: 'Lección: {title}',
  ts_area_test: 'Al probar', ts_area_sync: 'Al compartir datos', ts_area_look: 'Aspecto', ts_area_files: 'Archivos y publicación',

  /* Search */
  srch_ph: 'Busca apps, lecciones, código…', srch_ph_learn: 'Busca lecciones, código, palabras…', srch_title_learn: 'Buscar en Aprender',
  srch_recent: 'Búsquedas recientes', srch_try: 'Prueba con',
  srch_hint: 'Encuentra tus apps, lecciones, la referencia, los bloques y las herramientas desde aquí.',
  srch_hint_learn: 'Busca en las lecciones, la referencia, los bloques, el glosario y los problemas comunes.',
  srch_g_projects: 'Mis apps', srch_g_lessons: 'Lecciones', srch_g_reference: 'Referencia', srch_g_blocks: 'Bloques',
  srch_g_glossary: 'Glosario', srch_g_problems: 'Problemas comunes', srch_g_studio: 'Estudio', srch_g_tools: 'Herramientas',
  srch_more_one: 'Ver {n} más', srch_more_other: 'Ver {n} más', srch_less: 'Ver menos'
});
