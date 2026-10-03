/* "Game engine" blocks: sprites, physics, scenes, sound, pixel art, light 3D and live multiplayer.
 * Each block declares its parameters and a gen(b, h) that returns code lines (see genHelpers in blocks.js).
 * The generated code calls the embedded engine (game-engine.js) through the global G. */
(function () {
  'use strict';
  const CS = (globalThis.CS = globalThis.CS || {});
  const B = CS.blocks;
  if (!B) return;

  /* ---------- Parameter shortcuts ---------- */
  const P = {
    ref: function (key, es, en, def) { return { key: key, type: 'sprite', es: es || 'Sprite', en: en || 'Sprite', def: def, optional: def === '' }; },
    val: function (key, es, en, def) { return { key: key, type: 'value', es: es, en: en, def: def, optional: /vac[ií]o|empty/i.test(es + ' ' + en) }; },
    num: function (key, es, en, def) { return { key: key, type: 'number', es: es, en: en, def: def }; },
    text: function (key, es, en, def) { return { key: key, type: 'text', es: es, en: en, def: def, optional: /opcional|optional/i.test(es + ' ' + en) }; },
    color: function (key, es, en, def) { return { key: key, type: 'color', es: es || 'Color', en: en || 'Color', def: def }; },
    tvar: function (key, es, en) { return { key: key || 'name', type: 'var', es: es || 'Guardar en variable', en: en || 'Save in variable' }; },
    sel: function (key, es, en, options) { return { key: key, type: 'select', es: es, en: en, options: options }; },
    pixels: function (key) { return { key: key, type: 'pixels', es: 'Dibujo', en: 'Drawing', def: DEFAULT_PIXELS }; },
    map: function (key) { return { key: key, type: 'map', es: 'Mapa', en: 'Map', def: DEFAULT_MAP }; },
    asset: function (key) { return { key: key, type: 'asset', es: 'Imagen del proyecto', en: 'Project image' }; }
  };
  const o = function (v, es, en) { return { v: v, es: es, en: en || es }; };

  const DEFAULT_PIXELS = [
    '..aaaa..',
    '.aaaaaa.',
    'aa0aa0aa',
    'aaaaaaaa',
    'a9aaaa9a',
    'aa9999aa',
    '.aaaaaa.',
    '..a..a..'
  ].join('\n');
  const DEFAULT_MAP = [
    '...........',
    '...........',
    '.....o.o...',
    '...=====...',
    '...........',
    '.P....e..G.',
    '###########'
  ].join('\n');

  const SHAPES = [o('rect', 'Rectángulo', 'Rectangle'), o('circle', 'Círculo', 'Circle'), o('emoji', 'Emoji'),
    o('text', 'Texto', 'Text'), o('cube', 'Cubo 3D', '3D cube'), o('pyramid', 'Pirámide 3D', '3D pyramid'), o('gem', 'Gema 3D', '3D gem')];
  const KEYS = [o('left', '← Izquierda (A)', '← Left (A)'), o('right', '→ Derecha (D)', '→ Right (D)'),
    o('up', '↑ Arriba (W)', '↑ Up (W)'), o('down', '↓ Abajo (S)', '↓ Down (S)'),
    o('action', 'Acción (Espacio / A)', 'Action (Space / A)'), o('any', 'Cualquier tecla', 'Any key')];
  const PROPS = [o('x', 'X'), o('y', 'Y'), o('vx', 'Velocidad X', 'Speed X'), o('vy', 'Velocidad Y', 'Speed Y'),
    o('angle', 'Ángulo', 'Angle'), o('spin', 'Giro por fotograma', 'Spin per frame'), o('scale', 'Escala', 'Scale'),
    o('alpha', 'Opacidad (0-1)', 'Opacity (0-1)'), o('w', 'Ancho', 'Width'), o('h', 'Alto', 'Height'),
    o('layer', 'Capa', 'Layer'), o('gravity', 'Gravedad propia', 'Own gravity'), o('bounce', 'Rebote (0-1)', 'Bounce (0-1)'),
    o('friction', 'Fricción (0-1)', 'Friction (0-1)'), o('fps', 'Velocidad de animación', 'Animation speed'),
    o('z', 'Profundidad Z', 'Depth Z'), o('rx', 'Rotación 3D X', '3D rotation X'), o('ry', 'Rotación 3D Y', '3D rotation Y'),
    o('rz', 'Rotación 3D Z', '3D rotation Z')];
  const READ_PROPS = [o('x', 'X'), o('y', 'Y'), o('vx', 'Velocidad X', 'Speed X'), o('vy', 'Velocidad Y', 'Speed Y'),
    o('angle', 'Ángulo', 'Angle'), o('w', 'Ancho', 'Width'), o('h', 'Alto', 'Height'), o('scale', 'Escala', 'Scale'),
    o('onGround', '¿En el suelo?', 'On the ground?'), o('exists', '¿Existe?', 'Exists?'), o('text', 'Texto', 'Text'),
    o('name', 'Nombre', 'Name'), o('tag', 'Etiqueta', 'Tag')];

  const DEFS = {};
  const SUBS = {
    stage: { es: 'Escenario', en: 'Stage' }, sprites: { es: 'Sprites', en: 'Sprites' },
    motion: { es: 'Movimiento', en: 'Motion' }, gphysics: { es: 'Física', en: 'Physics' },
    look: { es: 'Apariencia', en: 'Looks' }, events: { es: 'Eventos del juego', en: 'Game events' },
    scenes: { es: 'Escenas y final', en: 'Scenes & ending' }, camera: { es: 'Cámara y efectos', en: 'Camera & effects' },
    gsound: { es: 'Sonido de juego', en: 'Game sound' }, sense: { es: 'Sensores', en: 'Sensing' },
    pixel: { es: 'Pixel art', en: 'Pixel art' }, three: { es: '3D ligero', en: 'Light 3D' },
    net: { es: 'Multijugador', en: 'Multiplayer' }
  };
  function def(type, sub, es, en, params, gen, extra) {
    DEFS[type] = Object.assign({
      cat: 'engine', sub: sub, container: false, helper: 'wcsGame',
      es: { name: es[0], desc: es[1] }, en: { name: en[0], desc: en[1] },
      params: params, gen: gen
    }, extra || {});
  }
  const EV = { container: true };

  /* ---------- Stage ---------- */
  def('gx_stage', 'stage', ['Crear escenario', 'El lienzo donde vive el juego. Ponlo primero en “Al iniciar”.'],
    ['Create stage', 'The canvas where the game lives. Put it first in “On start”.'],
    [P.text('id', 'Id del lienzo', 'Canvas id', 'game'), P.num('w', 'Ancho', 'Width', 360), P.num('h', 'Alto', 'Height', 640), P.color('bg', 'Fondo', 'Background', '#0f172a')],
    function (b, h) {
      const id = /^[A-Za-z][\w-]{0,40}$/.test(String(b.params.id || '')) ? b.params.id : 'game';
      return ['G.stage(' + JSON.stringify(id) + ', ' + h.num('w', 360) + ', ' + h.num('h', 640) + ', ' + h.color('bg', '#0f172a') + ');'];
    });
  def('gx_world', 'stage', ['Ajustar el mundo', 'Gravedad (0 = espacio, 0.6 = plataformas), fricción o color de fondo.'],
    ['Set the world', 'Gravity (0 = space, 0.6 = platformer), friction or background color.'],
    [P.sel('prop', 'Ajuste', 'Setting', [o('gravity', 'Gravedad', 'Gravity'), o('friction', 'Fricción', 'Friction'), o('bg', 'Color de fondo', 'Background color')]),
      P.val('value', 'Valor', 'Value', '0.6')],
    function (b, h) { return ['G.setWorld(' + h.sel('prop') + ', ' + h.val('value') + ');']; });
  def('gx_pad', 'stage', ['Controles táctiles', 'Botones en pantalla para jugar en el móvil (funcionan como las flechas).'],
    ['Touch controls', 'On-screen buttons to play on phones (they work like the arrow keys).'],
    [P.sel('kind', 'Tipo', 'Kind', [o('platform', '◀ ▶ y salto', '◀ ▶ and jump'), o('dpad', 'Cruceta', 'D-pad'), o('dpad_a', 'Cruceta + A', 'D-pad + A')])],
    function (b, h) { return ['G.pad(' + h.sel('kind') + ');']; });
  def('gx_stars', 'stage', ['Fondo de estrellas', 'Estrellas que caen: perfecto para juegos espaciales.'],
    ['Starfield background', 'Falling stars: perfect for space games.'],
    [P.num('count', 'Cantidad', 'Count', 80), P.num('speed', 'Velocidad', 'Speed', 1)],
    function (b, h) { return ['G.stars(' + h.num('count', 80) + ', ' + h.num('speed', 1) + ');']; });

  /* ---------- Sprites ---------- */
  def('gx_add', 'sprites', ['Crear sprite', 'Un personaje u objeto con nombre. Sin X/Y aparece en el centro.'],
    ['Create sprite', 'A named character or object. Without X/Y it appears in the center.'],
    [P.text('sname', 'Nombre', 'Name', 'player'), P.sel('shape', 'Forma', 'Shape', SHAPES), P.color('color', 'Color', 'Color', '#38bdf8'),
      P.text('text', 'Emoji o texto', 'Emoji or text', '🙂'), P.num('w', 'Ancho', 'Width', 40), P.num('h', 'Alto', 'Height', 40),
      P.val('x', 'X (vacío = centro)', 'X (empty = center)'), P.val('y', 'Y (vacío = centro)', 'Y (empty = center)'),
      P.text('tag', 'Etiqueta (opcional)', 'Tag (optional)', '')],
    function (b, h) {
      const name = spriteName(b.params.sname, h);
      const tag = /^[\w-]{0,30}$/.test(String(b.params.tag || '')) ? String(b.params.tag || '') : '';
      const spec = ['shape: ' + h.sel('shape'), 'color: ' + h.color('color'), 'text: ' + h.text('text', 40),
        'w: ' + h.num('w', 40), 'h: ' + h.num('h', 40), 'tag: ' + JSON.stringify(tag)];
      if (!emptyVal(b.params.x)) spec.push('x: Number(' + h.val('x') + ')');
      if (!emptyVal(b.params.y)) spec.push('y: Number(' + h.val('y') + ')');
      return ['G.add(' + name + ', { ' + spec.join(', ') + ' });'];
    });
  def('gx_clone', 'sprites', ['Clonar sprite', 'Crea una copia (balas, enemigos…). La copia se llama “@clone” en el siguiente bloque.'],
    ['Clone sprite', 'Makes a copy (bullets, enemies…). The next block can use it as “@clone”.'],
    [P.ref('target'), P.val('x', 'X (vacío = igual)', 'X (empty = same)'), P.val('y', 'Y (vacío = igual)', 'Y (empty = same)')],
    function (b, h) {
      return ['G.clone(' + h.ref('target') + ', ' + (emptyVal(b.params.x) ? 'null' : h.val('x')) + ', ' + (emptyVal(b.params.y) ? 'null' : h.val('y')) + ');'];
    });
  def('gx_remove', 'sprites', ['Eliminar sprite', 'Lo quita del juego. Usa “@other” para quitar lo que acabas de tocar.'],
    ['Remove sprite', 'Takes it out of the game. Use “@other” to remove what you just touched.'],
    [P.ref('target', 'Sprite', 'Sprite', '@other')],
    function (b, h) { return ['G.remove(' + h.ref('target') + ');']; });
  def('gx_map', 'sprites', ['Mapa de bloques', 'Dibuja el nivel con letras: # pared, = plataforma, o moneda, * estrella, x pinchos, e enemigo, G meta, P inicio del jugador.'],
    ['Tile map', 'Draw the level with letters: # wall, = platform, o coin, * star, x spikes, e enemy, G goal, P player start.'],
    [P.map('rows'), P.num('size', 'Tamaño de casilla', 'Tile size', 32)],
    function (b, h) { return ['G.map(' + h.text('rows', 6000) + ', ' + h.num('size', 32) + ');']; });

  /* ---------- Pixel art ---------- */
  def('gx_pixels', 'pixel', ['Sprite de pixel art', 'Dibuja tu personaje píxel a píxel. Varios dibujos = animación.'],
    ['Pixel art sprite', 'Draw your character pixel by pixel. Several drawings = animation.'],
    [P.text('sname', 'Nombre', 'Name', 'hero'), P.pixels('rows'), P.num('scale', 'Tamaño del píxel', 'Pixel size', 5),
      P.val('x', 'X (vacío = centro)', 'X (empty = center)'), P.val('y', 'Y (vacío = centro)', 'Y (empty = center)')],
    function (b, h) {
      const name = spriteName(b.params.sname, h);
      const out = ['G.pixels(' + name + ', ' + h.text('rows', 6000) + ', ' + h.num('scale', 5) + ');'];
      if (!emptyVal(b.params.x)) out.push('G.set(' + name + ", 'x', " + h.val('x') + ');');
      if (!emptyVal(b.params.y)) out.push('G.set(' + name + ", 'y', " + h.val('y') + ');');
      return out;
    });
  def('gx_image', 'pixel', ['Sprite con imagen', 'Usa una imagen del proyecto (por ejemplo, la que dibujaste en el editor de imágenes).'],
    ['Image sprite', 'Uses a project image (for example one you drew in the image editor).'],
    [P.text('sname', 'Nombre', 'Name', 'hero'), P.asset('src'), P.num('w', 'Ancho (0 = original)', 'Width (0 = original)', 64)],
    function (b, h) { return ['G.image(' + spriteName(b.params.sname, h) + ', ' + h.asset('src') + ', ' + h.num('w', 64) + ');']; });

  /* ---------- Motion ---------- */
  def('gx_keymove', 'motion', ['Mover con flechas', 'Flechas, WASD o los botones táctiles mueven el sprite.'],
    ['Move with arrows', 'Arrows, WASD or the touch buttons move the sprite.'],
    [P.ref('target', 'Sprite', 'Sprite', 'player'), P.num('speed', 'Velocidad', 'Speed', 4),
      P.sel('mode', 'Direcciones', 'Directions', [o('all', '4 direcciones', '4 directions'), o('horizontal', 'Solo izquierda/derecha', 'Left/right only')])],
    function (b, h) { return ['G.keyMove(' + h.ref('target') + ', ' + h.num('speed', 4) + ', ' + h.sel('mode') + ');']; });
  def('gx_platformer', 'motion', ['Controles de plataformas', 'Todo en uno: gravedad, caminar con ◀ ▶ y saltar con ▲ o espacio.'],
    ['Platformer controls', 'All in one: gravity, walk with ◀ ▶ and jump with ▲ or space.'],
    [P.ref('target', 'Sprite', 'Sprite', 'player'), P.num('speed', 'Velocidad', 'Speed', 4), P.num('jump', 'Fuerza de salto', 'Jump power', 12)],
    function (b, h) { return ['G.platformer(' + h.ref('target') + ', ' + h.num('speed', 4) + ', ' + h.num('jump', 12) + ');']; });
  def('gx_set', 'motion', ['Fijar propiedad', 'Pone un valor: posición, velocidad, ángulo, escala…'],
    ['Set property', 'Sets a value: position, speed, angle, scale…'],
    [P.ref('target'), P.sel('prop', 'Propiedad', 'Property', PROPS), P.val('value', 'Valor', 'Value', '0')],
    function (b, h) { return ['G.set(' + h.ref('target') + ', ' + h.sel('prop') + ', ' + h.val('value') + ');']; });
  def('gx_change', 'motion', ['Cambiar propiedad en', 'Suma (o resta) a una propiedad. Ej.: X en 5 mueve a la derecha.'],
    ['Change property by', 'Adds (or subtracts) to a property. E.g. X by 5 moves right.'],
    [P.ref('target'), P.sel('prop', 'Propiedad', 'Property', PROPS), P.val('delta', 'Cantidad', 'Amount', '5')],
    function (b, h) { return ['G.change(' + h.ref('target') + ', ' + h.sel('prop') + ', ' + h.val('delta') + ');']; });
  def('gx_chase', 'motion', ['Perseguir', 'Se mueve hacia otro sprite. Sin objetivo, persigue tu dedo.'],
    ['Chase', 'Moves toward another sprite. Without a target it follows your finger.'],
    [P.ref('target'), P.ref('other', 'Objetivo (vacío = dedo)', 'Target (empty = finger)', ''), P.num('speed', 'Velocidad', 'Speed', 2)],
    function (b, h) { return ['G.chase(' + h.ref('target') + ', ' + h.optRef('other') + ', ' + h.num('speed', 2) + ');']; });
  def('gx_point', 'motion', ['Apuntar hacia', 'Gira el sprite para mirar a otro (o a tu dedo).'],
    ['Point toward', 'Turns the sprite to face another one (or your finger).'],
    [P.ref('target'), P.ref('other', 'Objetivo (vacío = dedo)', 'Target (empty = finger)', '')],
    function (b, h) { return ['G.pointAt(' + h.ref('target') + ', ' + h.optRef('other') + ');']; });
  def('gx_forward', 'motion', ['Avanzar hacia donde mira', 'Velocidad en la dirección de su ángulo (naves, balas).'],
    ['Move forward', 'Speed in the direction of its angle (ships, bullets).'],
    [P.ref('target'), P.num('speed', 'Velocidad', 'Speed', 6)],
    function (b, h) { return ['G.forward(' + h.ref('target') + ', ' + h.num('speed', 6) + ');']; });
  def('gx_jump', 'motion', ['Saltar', 'Salta solo si está en el suelo.'], ['Jump', 'Jumps only when on the ground.'],
    [P.ref('target', 'Sprite', 'Sprite', 'player'), P.num('power', 'Fuerza', 'Power', 12)],
    function (b, h) { return ['G.jump(' + h.ref('target') + ', ' + h.num('power', 12) + ');']; });

  /* ---------- Physics ---------- */
  def('gx_body', 'gphysics', ['Activar física', 'El sprite cae con la gravedad y choca con lo sólido.'],
    ['Enable physics', 'The sprite falls with gravity and collides with solid things.'],
    [P.ref('target'), P.num('bounce', 'Rebote (0-1)', 'Bounce (0-1)', 0)],
    function (b, h) { return ['G.set(' + h.ref('target') + ", 'body', true);", 'G.set(' + h.ref('target') + ", 'bounce', " + h.num('bounce', 0) + ');']; });
  def('gx_solid', 'gphysics', ['Hacer sólido', 'Paredes y suelos: los sprites con física no lo atraviesan.'],
    ['Make solid', 'Walls and floors: sprites with physics cannot pass through.'],
    [P.ref('target')],
    function (b, h) { return ['G.set(' + h.ref('target') + ", 'solid', true);"]; });
  def('gx_edge', 'gphysics', ['Al llegar al borde', 'Qué hace el sprite en el borde del mundo.'],
    ['At the edge', 'What the sprite does at the edge of the world.'],
    [P.ref('target'), P.sel('mode', 'Comportamiento', 'Behavior', [o('stop', 'Detenerse', 'Stop'), o('bounce', 'Rebotar', 'Bounce'),
      o('wrap', 'Salir por el otro lado', 'Wrap around'), o('destroy', 'Desaparecer', 'Disappear'), o('none', 'Nada', 'Nothing')])],
    function (b, h) { return ['G.set(' + h.ref('target') + ", 'edge', " + h.sel('mode') + ');']; });

  /* ---------- Looks ---------- */
  def('gx_say', 'look', ['Decir', 'Muestra un globo de diálogo sobre el sprite.'], ['Say', 'Shows a speech bubble over the sprite.'],
    [P.ref('target'), P.val('text', 'Texto', 'Text', '¡Hola!'), P.num('secs', 'Segundos', 'Seconds', 2)],
    function (b, h) { return ['G.say(' + h.ref('target') + ', ' + h.val('text') + ', ' + h.num('secs', 2) + ');']; });
  def('gx_visible', 'look', ['Mostrar u ocultar', 'Un sprite oculto no se dibuja ni choca.'], ['Show or hide', 'A hidden sprite is not drawn and does not collide.'],
    [P.ref('target'), P.sel('mode', 'Acción', 'Action', [o('true', 'Mostrar', 'Show'), o('false', 'Ocultar', 'Hide')])],
    function (b, h) { return ['G.set(' + h.ref('target') + ", 'visible', " + (b.params.mode === 'false' ? 'false' : 'true') + ');']; });
  def('gx_color', 'look', ['Cambiar color', 'Nuevo color del sprite.'], ['Change color', 'New sprite color.'],
    [P.ref('target'), P.color('color', 'Color', 'Color', '#f43f5e')],
    function (b, h) { return ['G.set(' + h.ref('target') + ", 'color', " + h.color('color') + ');']; });
  def('gx_text', 'look', ['Cambiar texto o emoji', 'Para sprites de tipo texto o emoji (marcadores, caras…).'],
    ['Change text or emoji', 'For text or emoji sprites (scores, faces…).'],
    [P.ref('target'), P.val('value', 'Texto', 'Text', '😎')],
    function (b, h) { return ['G.set(' + h.ref('target') + ", 'text', String(" + h.val('value') + '));']; });
  def('gx_hud', 'look', ['Mostrar marcador', 'Texto fijo arriba a la izquierda: puntos, vidas, tiempo…'],
    ['Show scoreboard', 'Fixed text at the top left: points, lives, time…'],
    [P.text('label', 'Etiqueta', 'Label', 'Puntos'), P.val('value', 'Valor', 'Value', '0')],
    function (b, h) { return ['G.hud(' + h.text('label', 30) + ', ' + h.val('value') + ');']; });

  /* ---------- Events ---------- */
  def('gx_on_frame', 'events', ['Cada fotograma', 'Se repite unas 60 veces por segundo. Ponlo en “Al iniciar”.'],
    ['Every frame', 'Runs about 60 times per second. Put it in “On start”.'],
    [], function (b, h) { return ['G.onFrame(async () => {', h.body(), '});']; }, EV);
  def('gx_on_key', 'events', ['Al pulsar tecla', 'Una vez por pulsación (también con los botones táctiles).'],
    ['When key pressed', 'Once per press (touch buttons too).'],
    [P.sel('key', 'Tecla', 'Key', KEYS)],
    function (b, h) { return ['G.onKey(' + h.sel('key') + ', async () => {', h.body(), '});']; }, EV);
  def('gx_on_tap', 'events', ['Al tocar sprite', 'Al tocar o hacer clic sobre el sprite (vacío = en cualquier sitio). Dentro, “@tapped” es el tocado.'],
    ['When sprite tapped', 'When the sprite is tapped or clicked (empty = anywhere). Inside, “@tapped” is the one tapped.'],
    [P.ref('target', 'Sprite (vacío = cualquiera)', 'Sprite (empty = anywhere)', '')],
    function (b, h) { return ['G.onTap(' + h.optRef('target') + ', async () => {', h.body(), '});']; }, EV);
  def('gx_on_hit', 'events', ['Cuando choquen', 'Al empezar a tocarse. Dentro, “@me” es el primero y “@other” el segundo. Usa “tag:coin” para todo un grupo.'],
    ['When they collide', 'When they start touching. Inside, “@me” is the first and “@other” the second. Use “tag:coin” for a whole group.'],
    [P.ref('a', 'Sprite', 'Sprite', 'player'), P.ref('b', 'Con', 'With', 'tag:coin')],
    function (b, h) { return ['G.onHit(' + h.ref('a') + ', ' + h.ref('b') + ', async () => {', h.body(), '});']; }, EV);
  def('gx_every', 'events', ['Cada N segundos', 'Repite cada cierto tiempo (aparecer enemigos, cuenta atrás…).'],
    ['Every N seconds', 'Repeats on a timer (spawn enemies, countdown…).'],
    [P.num('secs', 'Segundos', 'Seconds', 1)],
    function (b, h) { return ['G.every(' + h.num('secs', 1) + ', async () => {', h.body(), '});']; }, EV);
  def('gx_if_key', 'events', ['Si la tecla está pulsada', 'Condición para usar dentro de “Cada fotograma”.'],
    ['If key is held', 'Condition to use inside “Every frame”.'],
    [P.sel('key', 'Tecla', 'Key', KEYS.slice(0, 5))],
    function (b, h) { return ['if (G.isDown(' + h.sel('key') + ')) {', h.body(), '}']; }, EV);
  def('gx_if_touch', 'events', ['Si se están tocando', 'Condición mientras dos sprites se tocan.'],
    ['If touching', 'Condition while two sprites touch.'],
    [P.ref('a', 'Sprite', 'Sprite', 'player'), P.ref('b', 'Con', 'With', 'tag:danger')],
    function (b, h) { return ['if (G.touching(' + h.ref('a') + ', ' + h.ref('b') + ')) {', h.body(), '}']; }, EV);
  def('gx_on_scene', 'events', ['Al entrar en escena', 'Crea aquí los sprites de cada nivel o pantalla.'],
    ['When scene starts', 'Create each level or screen’s sprites here.'],
    [P.text('scene', 'Escena', 'Scene', 'nivel1')],
    function (b, h) { return ['G.onScene(' + h.text('scene', 40) + ', async () => {', h.body(), '});']; }, EV);

  /* ---------- Scenes & ending ---------- */
  def('gx_scene', 'scenes', ['Ir a escena', 'Cambia de nivel o pantalla: borra los sprites de la escena anterior.'],
    ['Go to scene', 'Switches level or screen: removes the previous scene’s sprites.'],
    [P.text('scene', 'Escena', 'Scene', 'nivel1')],
    function (b, h) { return ['G.scene(' + h.text('scene', 40) + ');']; });
  def('gx_over', 'scenes', ['Fin del juego', 'Detiene el juego y muestra un mensaje con botón para volver a jugar.'],
    ['Game over', 'Stops the game and shows a message with a play-again button.'],
    [P.val('title', 'Mensaje', 'Message', '¡Fin!'), P.sel('mood', 'Tipo', 'Kind', [o('lose', 'Perdiste', 'Lost'), o('win', 'Ganaste', 'Won')])],
    function (b, h) { return ['G.over(' + h.val('title') + ', ' + h.sel('mood') + ');']; });
  def('gx_pause', 'scenes', ['Pausar o seguir', 'Congela el movimiento sin borrar nada.'], ['Pause or resume', 'Freezes motion without removing anything.'],
    [P.sel('mode', 'Acción', 'Action', [o('pause', 'Pausar', 'Pause'), o('resume', 'Seguir', 'Resume')])],
    function (b, h) { return ['G.pause(' + (b.params.mode === 'resume' ? 'false' : 'true') + ');']; });

  /* ---------- Camera & effects ---------- */
  def('gx_follow', 'camera', ['La cámara sigue a', 'Para niveles más grandes que la pantalla (el mapa de bloques los crea).'],
    ['Camera follows', 'For levels larger than the screen (tile maps create them).'],
    [P.ref('target', 'Sprite', 'Sprite', 'player')],
    function (b, h) { return ['G.follow(' + h.ref('target') + ');']; });
  def('gx_shake', 'camera', ['Sacudir pantalla', 'Un temblor rápido para golpes y explosiones.'], ['Shake screen', 'A quick tremor for hits and explosions.'],
    [P.num('secs', 'Segundos', 'Seconds', 0.3), P.num('power', 'Fuerza', 'Power', 8)],
    function (b, h) { return ['G.shake(' + h.num('secs', 0.3) + ', ' + h.num('power', 8) + ');']; });
  def('gx_burst', 'camera', ['Explosión de partículas', 'Chispas que salen del sprite.'], ['Particle burst', 'Sparks coming out of the sprite.'],
    [P.ref('target', 'Sprite', 'Sprite', '@other'), P.color('color', 'Color', 'Color', '#fde047'), P.num('count', 'Cantidad', 'Count', 16)],
    function (b, h) { return ['G.burst(' + h.ref('target') + ', ' + h.color('color') + ', ' + h.num('count', 16) + ');']; });

  /* ---------- Sound ---------- */
  def('gx_sfx', 'gsound', ['Efecto de sonido', 'Sonidos retro generados al momento: no ocupan espacio.'],
    ['Sound effect', 'Retro sounds generated on the fly: they take no space.'],
    [P.sel('kind', 'Sonido', 'Sound', [o('coin', 'Moneda', 'Coin'), o('jump', 'Salto', 'Jump'), o('hit', 'Golpe', 'Hit'),
      o('explode', 'Explosión', 'Explosion'), o('laser', 'Láser', 'Laser'), o('powerup', 'Poder', 'Power-up'),
      o('click', 'Clic', 'Click'), o('win', 'Victoria', 'Win'), o('lose', 'Derrota', 'Lose')])],
    function (b, h) { return ['G.sfx(' + h.sel('kind') + ');']; });
  def('gx_melody', 'gsound', ['Tocar melodía', 'Notas separadas por espacios: C D E F G A B con octava (C4, D#5…). “-” es silencio.'],
    ['Play melody', 'Space-separated notes: C D E F G A B with octave (C4, D#5…). “-” is a rest.'],
    [P.text('notes', 'Notas', 'Notes', 'C4 E4 G4 C5 - G4 C5'), P.num('bpm', 'Tempo (BPM)', 'Tempo (BPM)', 160)],
    function (b, h) { return ['G.melody(' + h.text('notes', 600) + ', ' + h.num('bpm', 160) + ');']; });

  /* ---------- Sensing (results go into a variable) ---------- */
  def('gx_get', 'sense', ['Leer propiedad', 'Guarda en una variable la posición, velocidad, si está en el suelo…'],
    ['Read property', 'Stores position, speed, whether it is on the ground… in a variable.'],
    [P.tvar(), P.ref('target'), P.sel('prop', 'Propiedad', 'Property', READ_PROPS)],
    function (b, h) { return [h.target() + ' = G.get(' + h.ref('target') + ', ' + h.sel('prop') + ');']; });
  def('gx_touching', 'sense', ['¿Se tocan?', 'true o false en una variable.'], ['Touching?', 'true or false in a variable.'],
    [P.tvar(), P.ref('a', 'Sprite', 'Sprite', 'player'), P.ref('b', 'Con', 'With', 'tag:enemy')],
    function (b, h) { return [h.target() + ' = G.touching(' + h.ref('a') + ', ' + h.ref('b') + ');']; });
  def('gx_distance', 'sense', ['Distancia entre', 'Distancia en píxeles entre dos sprites.'], ['Distance between', 'Distance in pixels between two sprites.'],
    [P.tvar(), P.ref('a', 'Sprite', 'Sprite', 'player'), P.ref('b', 'Y', 'And', 'tag:enemy')],
    function (b, h) { return [h.target() + ' = Math.round(G.distance(' + h.ref('a') + ', ' + h.ref('b') + '));']; });
  def('gx_count', 'sense', ['Contar sprites', 'Cuántos quedan de un grupo (ej.: tag:coin). Útil para ganar al recoger todo.'],
    ['Count sprites', 'How many of a group are left (e.g. tag:coin). Handy to win when all are collected.'],
    [P.tvar(), P.ref('target', 'Grupo', 'Group', 'tag:coin')],
    function (b, h) { return [h.target() + ' = G.count(' + h.ref('target') + ');']; });
  def('gx_key', 'sense', ['¿Tecla pulsada?', 'true mientras se mantiene pulsada (teclado o botones táctiles).'],
    ['Key held?', 'true while it is held (keyboard or touch buttons).'],
    [P.tvar(), P.sel('key', 'Tecla', 'Key', KEYS.slice(0, 5))],
    function (b, h) { return [h.target() + ' = G.isDown(' + h.sel('key') + ');']; });
  def('gx_pointer', 'sense', ['Posición del dedo', 'Dónde está el dedo o el ratón dentro del mundo.'], ['Finger position', 'Where the finger or mouse is in the world.'],
    [P.tvar('xVar', 'Variable X', 'X variable'), P.tvar('yVar', 'Variable Y', 'Y variable')],
    function (b, h) { return [h.target('xVar') + ' = Math.round(G.pointer.x);', h.target('yVar') + ' = Math.round(G.pointer.y);']; });
  def('gx_time', 'sense', ['Tiempo de juego', 'Segundos desde que empezó (sin contar pausas).'], ['Game time', 'Seconds since start (pauses excluded).'],
    [P.tvar()],
    function (b, h) { return [h.target() + ' = Math.floor(G.time);']; });

  /* ---------- Light 3D ---------- */
  def('gx_3d', 'three', ['Crear objeto 3D', 'Cubo, pirámide o gema con luz y sombras.'], ['Create 3D object', 'Cube, pyramid or gem with light and shading.'],
    [P.text('sname', 'Nombre', 'Name', 'cube'), P.sel('shape', 'Forma', 'Shape', SHAPES.slice(4)), P.num('size', 'Tamaño', 'Size', 90),
      P.color('color', 'Color', 'Color', '#6366f1'), P.val('x', 'X (vacío = centro)', 'X (empty = center)'), P.val('y', 'Y (vacío = centro)', 'Y (empty = center)')],
    function (b, h) {
      const spec = ['shape: ' + h.sel('shape'), 'w: ' + h.num('size', 90), 'h: ' + h.num('size', 90), 'color: ' + h.color('color')];
      if (!emptyVal(b.params.x)) spec.push('x: Number(' + h.val('x') + ')');
      if (!emptyVal(b.params.y)) spec.push('y: Number(' + h.val('y') + ')');
      return ['G.add(' + spriteName(b.params.sname, h) + ', { ' + spec.join(', ') + ' });'];
    });
  def('gx_spin3d', 'three', ['Girar en 3D', 'Velocidad de giro en cada eje (grados por fotograma).'], ['Spin in 3D', 'Spin speed on each axis (degrees per frame).'],
    [P.ref('target', 'Objeto', 'Object', 'cube'), P.num('x', 'Eje X', 'X axis', 1), P.num('y', 'Eje Y', 'Y axis', 2), P.num('z', 'Eje Z', 'Z axis', 0)],
    function (b, h) {
      const r = h.ref('target');
      return ['G.set(' + r + ", 'srx', " + h.num('x', 1) + ');', 'G.set(' + r + ", 'sry', " + h.num('y', 2) + ');', 'G.set(' + r + ", 'srz', " + h.num('z', 0) + ');'];
    });

  /* ---------- Live multiplayer ---------- */
  def('gx_share', 'net', ['Multijugador en vivo', 'Los demás del chat ven tu sprite moverse en tiempo real (canal realtime de webxdc).'],
    ['Live multiplayer', 'Others in the chat see your sprite move in real time (webxdc realtime channel).'],
    [P.ref('target', 'Mi sprite', 'My sprite', 'player')],
    function (b, h) { return ['G.share(' + h.ref('target') + ');']; });
  def('gx_players', 'net', ['Jugadores conectados', 'Cuántos jugadores hay ahora mismo (tú incluido).'], ['Players online', 'How many players are here right now (you included).'],
    [P.tvar()],
    function (b, h) { return [h.target() + ' = G.players();']; });

  /* ---------- Helpers ---------- */
  function emptyVal(v) { return !v || (v.kind === 'text' && String(v.value == null ? '' : v.value).trim() === ''); }
  function spriteName(n, h) {
    const s = String(n == null ? '' : n).trim();
    if (/^[\w-]{1,40}$/.test(s)) return JSON.stringify(s);
    return h.fail('id');
  }

  /* ---------- Registration ---------- */
  Object.keys(DEFS).forEach(function (k) { B.DEFS[k] = DEFS[k]; });
  const at = B.CATS.findIndex(function (c) { return c.id === 'game'; });
  B.CATS.splice(at >= 0 ? at : B.CATS.length, 0, { id: 'engine', es: 'Motor de juegos', en: 'Game engine', icon: 'gamepad' });
  Object.keys(SUBS).forEach(function (k) { B.SUB_LABELS[k] = SUBS[k]; });
  B.SPRITE_REFS = ['@me', '@other', '@clone', '@tapped', 'tag:wall', 'tag:coin', 'tag:star', 'tag:danger', 'tag:enemy', 'tag:goal', 'tag:remote'];
  B.GAME = { DEFAULT_PIXELS: DEFAULT_PIXELS, DEFAULT_MAP: DEFAULT_MAP };

  /* ---------- Quick starters: complete, editable block stacks ---------- */
  function nb(type, params, kids) {
    const b = B.newBlock(type);
    if (!b) return null;
    Object.keys(params || {}).forEach(function (k) {
      const v = params[k];
      const pd = B.DEFS[type].params.filter(function (x) { return x.key === k; })[0];
      b.params[k] = pd && pd.type === 'value' && (typeof v !== 'object' || v === null) ? { kind: 'text', value: String(v) } : v;
    });
    if (kids) b.children = kids.filter(Boolean);
    return b;
  }
  const V = function (name) { return { kind: 'var', name: name }; };
  const LEVEL = [
    '......................',
    '......................',
    '..........o.o.o.......',
    '........=======.......',
    '...o.o..............G.',
    '..=====.....o.o...====',
    '.P.......e.=====......',
    '######################'
  ].join('\n');
  B.GAME.STARTERS = [
    {
      id: 'platformer', icon: 'gamepad', vars: [['score', '0']],
      es: ['Plataformas', 'Salta, recoge monedas y llega a la meta 🚩'], en: ['Platformer', 'Jump, collect coins and reach the goal 🚩'],
      build: function () {
        return [
          nb('gx_stage', { id: 'game', w: 360, h: 300, bg: '#0b1026' }),
          nb('gx_stars', { count: 50, speed: 0.4 }),
          nb('gx_pad', { kind: 'platform' }),
          nb('gx_pixels', { sname: 'player', scale: 3 }),
          nb('gx_map', { rows: LEVEL, size: 32 }),
          nb('gx_platformer', { target: 'player', speed: 4, jump: 12 }),
          nb('gx_follow', { target: 'player' }),
          nb('gx_on_hit', { a: 'player', b: 'tag:coin' }, [
            nb('gx_remove', { target: '@other' }), nb('gx_sfx', { kind: 'coin' }),
            nb('gx_burst', { target: 'player', color: '#fde047', count: 12 }), nb('change_var', { name: 'score', delta: '1' })
          ]),
          nb('gx_on_hit', { a: 'player', b: 'tag:enemy' }, [nb('gx_shake', { secs: 0.4, power: 10 }), nb('gx_over', { title: '¡Ay! 👾', mood: 'lose' })]),
          nb('gx_on_hit', { a: 'player', b: 'tag:goal' }, [nb('gx_over', { title: '¡Ganaste! 🏆', mood: 'win' })]),
          nb('gx_on_frame', {}, [nb('gx_hud', { label: 'Puntos', value: V('score') })]),
          nb('gx_say', { target: 'player', text: '¡Vamos!', secs: 2 })
        ];
      }
    },
    {
      id: 'shooter', icon: 'rocket', vars: [['score', '0'], ['rx', '0'], ['sx', '0'], ['sy', '0']],
      es: ['Nave espacial', 'Esquiva y dispara a las rocas con la acción'], en: ['Space shooter', 'Dodge and shoot the rocks with action'],
      build: function () {
        return [
          nb('gx_stage', { id: 'game', w: 360, h: 560, bg: '#020617' }),
          nb('gx_stars', { count: 90, speed: 1.5 }),
          nb('gx_pad', { kind: 'dpad_a' }),
          nb('gx_add', { sname: 'ship', shape: 'emoji', text: '🚀', w: 44, h: 44, x: '180', y: '500' }),
          nb('gx_set', { target: 'ship', prop: 'angle', value: '-45' }),
          nb('gx_keymove', { target: 'ship', speed: 5, mode: 'horizontal' }),
          nb('gx_edge', { target: 'ship', mode: 'stop' }),
          nb('gx_add', { sname: 'rock', shape: 'emoji', text: '🪨', w: 38, h: 38, x: '-200', y: '-200', tag: 'rock' }),
          nb('gx_add', { sname: 'laser', shape: 'rect', color: '#22d3ee', w: 4, h: 18, x: '-200', y: '-300', tag: 'laser' }),
          nb('gx_every', { secs: 0.8 }, [
            nb('random_var', { name: 'rx', min: '20', max: '340' }),
            nb('gx_clone', { target: 'rock', x: V('rx'), y: '-20' }),
            nb('gx_set', { target: '@clone', prop: 'vy', value: '3' }),
            nb('gx_set', { target: '@clone', prop: 'spin', value: '2' }),
            nb('gx_edge', { target: '@clone', mode: 'destroy' })
          ]),
          nb('gx_on_key', { key: 'action' }, [
            nb('gx_get', { name: 'sx', target: 'ship', prop: 'x' }), nb('gx_get', { name: 'sy', target: 'ship', prop: 'y' }),
            nb('gx_clone', { target: 'laser', x: V('sx'), y: V('sy') }),
            nb('gx_set', { target: '@clone', prop: 'vy', value: '-10' }),
            nb('gx_edge', { target: '@clone', mode: 'destroy' }),
            nb('gx_sfx', { kind: 'laser' })
          ]),
          nb('gx_on_hit', { a: 'tag:laser', b: 'tag:rock' }, [
            nb('gx_burst', { target: '@other', color: '#f97316', count: 18 }),
            nb('gx_remove', { target: '@other' }), nb('gx_remove', { target: '@me' }),
            nb('gx_sfx', { kind: 'explode' }), nb('change_var', { name: 'score', delta: '1' })
          ]),
          nb('gx_on_hit', { a: 'ship', b: 'tag:rock' }, [nb('gx_shake', { secs: 0.5, power: 12 }), nb('gx_over', { title: '💥', mood: 'lose' })]),
          nb('gx_on_frame', {}, [nb('gx_hud', { label: 'Puntos', value: V('score') })])
        ];
      }
    },
    {
      id: 'catch', icon: 'target', vars: [['score', '0'], ['rx', '0']],
      es: ['Atrapa la fruta', 'Mueve la cesta y atrapa 10 frutas'], en: ['Catch the fruit', 'Move the basket and catch 10 fruits'],
      build: function () {
        return [
          nb('gx_stage', { id: 'game', w: 360, h: 560, bg: '#ecfeff' }),
          nb('gx_pad', { kind: 'platform' }),
          nb('gx_add', { sname: 'basket', shape: 'emoji', text: '🧺', w: 60, h: 60, x: '180', y: '510' }),
          nb('gx_keymove', { target: 'basket', speed: 6, mode: 'horizontal' }),
          nb('gx_edge', { target: 'basket', mode: 'stop' }),
          nb('gx_add', { sname: 'fruit', shape: 'emoji', text: '🍎', w: 36, h: 36, x: '-200', y: '-200', tag: 'fruit' }),
          nb('gx_every', { secs: 1 }, [
            nb('random_var', { name: 'rx', min: '20', max: '340' }),
            nb('gx_clone', { target: 'fruit', x: V('rx'), y: '-20' }),
            nb('gx_set', { target: '@clone', prop: 'vy', value: '3.5' }),
            nb('gx_edge', { target: '@clone', mode: 'destroy' })
          ]),
          nb('gx_on_hit', { a: 'basket', b: 'tag:fruit' }, [
            nb('gx_remove', { target: '@other' }), nb('gx_sfx', { kind: 'coin' }), nb('change_var', { name: 'score', delta: '1' }),
            nb('if_var', { name: 'score', op: '>=', value: '10' }, [nb('gx_over', { title: '¡10 frutas! 🏆', mood: 'win' })])
          ]),
          nb('gx_on_frame', {}, [nb('gx_hud', { label: 'Frutas', value: V('score') })])
        ];
      }
    }
  ];

  if (typeof module !== 'undefined' && module.exports) { module.exports = DEFS; }
})();
