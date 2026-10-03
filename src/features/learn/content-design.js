/* Track 3: design with HTML and CSS. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const T = (es, en) => ({ es, en });
  const demo = CS.learn.demo;

  CS.learn.track({
    id: 'design', order: 30, icon: 'palette', tint: 'pink',
    title: T('Diseño: HTML y CSS', 'Design: HTML and CSS'),
    sub: T('Piezas, colores, espacios e imágenes', 'Pieces, colours, spacing and images'),
    desc: T('Aprende de qué está hecha una pantalla y cómo darle tu estilo: textos, colores, cajas, imágenes y sonidos.', 'Learn what a screen is made of and how to give it your style: texts, colours, boxes, images and sounds.'),
    lessons: [
      {
        id: 'design-html', mins: 4,
        title: T('HTML: las piezas', 'HTML: the pieces'),
        sub: T('Títulos, botones y campos', 'Headings, buttons and fields'),
        steps: [
          { t: 'read', art: 'layers', title: T('Tres capas', 'Three layers'),
            body: T('Toda miniapp se construye con tres lenguajes que trabajan juntos:\n\n- **HTML** es el esqueleto: qué piezas hay\n- **CSS** es la ropa: colores, tamaños y posiciones\n- **JavaScript** es el cerebro: qué pasa cuando tocas',
              'Every mini app is built with three languages working together:\n\n- **HTML** is the skeleton: which pieces there are\n- **CSS** is the clothing: colours, sizes and positions\n- **JavaScript** is the brain: what happens when you tap') },
          { t: 'read', title: T('Etiquetas', 'Tags'),
            body: T('En HTML cada pieza es una **etiqueta**. Casi todas se abren y se cierran, y lo de dentro es su contenido. El `id` es un nombre único para encontrar la pieza después.',
              'In HTML each piece is a **tag**. Most of them open and close, and what is inside is their content. The `id` is a unique name to find the piece later.'),
            code: T('<h1>Mi encuesta</h1>\n<p>¿Qué comemos hoy?</p>\n<button id="votar">Votar</button>\n<input id="nombre" placeholder="Tu nombre">', '<h1>My poll</h1>\n<p>What shall we eat today?</p>\n<button id="vote">Vote</button>\n<input id="name" placeholder="Your name">') },
          { t: 'match', q: T('Une cada etiqueta con lo que muestra', 'Match each tag with what it shows'),
            pairs: T([['<h1>', 'Un título grande'], ['<p>', 'Un párrafo de texto'], ['<button>', 'Un botón'], ['<img>', 'Una imagen'], ['<input>', 'Un campo para escribir']],
              [['<h1>', 'A large heading'], ['<p>', 'A paragraph of text'], ['<button>', 'A button'], ['<img>', 'An image'], ['<input>', 'A field to type in']]) },
          { t: 'fill', q: T('Completa el botón para que se abra y se cierre bien', 'Complete the button so it opens and closes properly'),
            code: T('<[[0]] id="jugar">Jugar</[[1]]>', '<[[0]] id="play">Play</[[1]]>'), blanks: ['button', 'button'], extra: ['h1', 'img'],
            why: T('La etiqueta de cierre repite el nombre con una barra: `</button>`.', 'The closing tag repeats the name with a slash: `</button>`.') },
          { t: 'try', q: T('Cambia los textos de las piezas y mira cómo cambia la pantalla.', 'Change the texts of the pieces and watch the screen change.'),
            appName: T('Encuesta', 'Poll'),
            fields: [
              { k: 'h', label: T('Título (h1)', 'Heading (h1)'), value: T('¿Qué comemos hoy?', 'What shall we eat today?') },
              { k: 'p', label: T('Párrafo (p)', 'Paragraph (p)'), value: T('Vota tu favorita', 'Vote for your favourite') },
              { k: 'b', label: T('Botón (button)', 'Button (button)'), value: T('Pizza', 'Pizza') }
            ],
            files: { 'index.html': demo({
              title: T('Encuesta', 'Poll'),
              css: 'main{background:#fff;padding:22px;border-radius:20px;box-shadow:0 10px 30px -18px rgba(0,0,0,.35);max-width:320px}p{color:#6b6f88}button{margin-top:10px}',
              body: '<main><h1>{{h}}</h1><p>{{p}}</p><button>{{b}}</button></main>'
            }) } },
          { t: 'quiz', q: T('¿Para qué sirve el atributo `id`?', 'What is the `id` attribute for?'),
            opts: T(['Para cambiar el color', 'Para dar un nombre único a una pieza y encontrarla', 'Para hacer el texto más grande'], ['To change the colour', 'To give a piece a unique name so it can be found', 'To make the text bigger']), a: 1 }
        ]
      },
      {
        id: 'design-css', mins: 5,
        title: T('CSS: colores y letras', 'CSS: colours and fonts'),
        sub: T('Dale tu estilo', 'Give it your style'),
        steps: [
          { t: 'read', art: 'design', title: T('Reglas de estilo', 'Style rules'),
            body: T('CSS se escribe con **reglas**. Cada regla dice **a quién** se aplica (el selector) y **qué cambia** (propiedades y valores):',
              'CSS is written as **rules**. Each rule says **who** it applies to (the selector) and **what changes** (properties and values):'),
            code: T('button {\n  background: #5146e0;\n  color: white;\n  font-size: 20px;\n  border-radius: 14px;\n}', 'button {\n  background: #5146e0;\n  color: white;\n  font-size: 20px;\n  border-radius: 14px;\n}'),
            note: T('`#votar` aplica solo a la pieza con `id="votar"`. `.grande` aplica a todas las piezas con `class="grande"`.', '`#vote` applies only to the piece with `id="vote"`. `.big` applies to every piece with `class="big"`.') },
          { t: 'try', q: T('Juega con los estilos del botón. Cada control cambia una propiedad CSS.', 'Play with the button styles. Each control changes one CSS property.'),
            appName: T('Estilos', 'Styles'), height: 240,
            fields: [
              { k: 'bg', label: T('background (fondo)', 'background'), type: 'color', value: '#ff5c93' },
              { k: 'fs', label: T('font-size (tamaño de letra)', 'font-size'), type: 'range', min: 12, max: 40, value: '20', unit: 'px' },
              { k: 'r', label: T('border-radius (esquinas)', 'border-radius (corners)'), type: 'range', min: 0, max: 40, value: '14', unit: 'px' }
            ],
            files: { 'index.html': demo({
              title: T('Estilos', 'Styles'),
              css: '#b{background:{{bg}};font-size:{{fs}}px;border-radius:{{r}}px;padding:.6em 1.2em;box-shadow:0 12px 24px -14px {{bg}}}',
              body: T('<button id="b">Mi botón</button>', '<button id="b">My button</button>')
            }) } },
          { t: 'fill', q: T('Completa la regla para que el título sea rojo', 'Complete the rule so the heading is red'),
            code: 'h1 {\n  [[0]]: [[1]];\n}', blanks: ['color', 'red'], extra: ['font-size', 'h1', '20px'] },
          { t: 'match', q: T('Une cada propiedad con lo que cambia', 'Match each property with what it changes'),
            pairs: T([['color', 'El color del texto'], ['background', 'El color de fondo'], ['font-size', 'El tamaño de la letra'], ['border-radius', 'Lo redondeado de las esquinas']],
              [['color', 'The text colour'], ['background', 'The background colour'], ['font-size', 'The font size'], ['border-radius', 'How round the corners are']]) },
          { t: 'quiz', q: T('¿A qué piezas se aplica la regla `.aviso { color: orange; }`?', 'Which pieces does the rule `.notice { color: orange; }` apply to?'),
            opts: T(['A la pieza con id="aviso"', 'A todas las piezas con class="aviso"', 'A todos los párrafos'], ['The piece with id="notice"', 'Every piece with class="notice"', 'Every paragraph']), a: 1,
            why: T('El punto `.` busca clases; la almohadilla `#` busca un id.', 'The dot `.` looks for classes; the hash `#` looks for an id.') }
        ]
      },
      {
        id: 'design-boxes', mins: 5,
        title: T('Cajas y espacios', 'Boxes and spacing'),
        sub: T('Ordenar las piezas en pantalla', 'Arrange pieces on screen'),
        steps: [
          { t: 'read', art: 'design', title: T('Todo es una caja', 'Everything is a box'),
            body: T('Cada pieza de la pantalla es una **caja**. Alrededor del contenido hay espacios:\n\n- `padding`: el relleno, espacio **dentro** de la caja\n- `border`: el borde\n- `margin`: el margen, espacio **fuera** de la caja\n\nPara poner cajas en fila o en columna se usa `display: flex`.',
              'Every piece on screen is a **box**. Around the content there is space:\n\n- `padding`: space **inside** the box\n- `border`: the border\n- `margin`: space **outside** the box\n\nTo put boxes in a row or a column you use `display: flex`.') },
          { t: 'try', q: T('Ordena las tarjetas: cambia la dirección, el espacio entre ellas y el relleno.', 'Arrange the cards: change the direction, the gap between them and the padding.'),
            appName: T('Cajas', 'Boxes'), height: 280,
            fields: [
              { k: 'dir', label: T('flex-direction (dirección)', 'flex-direction'), type: 'choice', options: ['row', 'column'], value: 'row' },
              { k: 'gap', label: T('gap (espacio entre cajas)', 'gap (space between boxes)'), type: 'range', min: 0, max: 30, value: '10', unit: 'px' },
              { k: 'pad', label: T('padding (relleno)', 'padding'), type: 'range', min: 4, max: 30, value: '14', unit: 'px' }
            ],
            files: { 'index.html': demo({
              title: T('Cajas', 'Boxes'),
              css: '.wrap{display:flex;flex-direction:{{dir}};gap:{{gap}}px;align-items:center;justify-content:center}.box{padding:{{pad}}px;border-radius:14px;color:#fff;font-weight:800}.a{background:#5146e0}.b{background:#ff5c93}.c{background:#22b8a0}',
              body: '<div class="wrap"><div class="box a">A</div><div class="box b">B</div><div class="box c">C</div></div>'
            }) } },
          { t: 'quiz', q: T('Quieres más espacio **dentro** de un botón, entre el texto y el borde. ¿Qué propiedad cambias?', 'You want more space **inside** a button, between the text and the edge. Which property do you change?'),
            opts: ['margin', 'padding', 'gap'], a: 1 },
          { t: 'quiz', q: T('Tres botones están uno debajo de otro y los quieres en fila. ¿Qué usas en su contenedor?', 'Three buttons are stacked and you want them in a row. What do you use on their container?'),
            opts: ['display: flex; flex-direction: row;', 'font-size: row;', 'margin: flex;'], a: 0 },
          { t: 'order', mono: true, q: T('Ordena la regla CSS', 'Put the CSS rule in order'),
            items: ['.fila {', '  display: flex;', '  gap: 12px;', '}'] },
          { t: 'read', title: T('Pantallas pequeñas', 'Small screens'),
            body: T('Las miniapps se usan sobre todo en el teléfono. Unos consejos:\n\n- Botones grandes, de al menos **44 píxeles** de alto\n- Usa `max-width` para que el texto no ocupe toda la pantalla en tabletas\n- Prueba siempre en la pestaña **Probar**',
              'Mini apps are mostly used on phones. A few tips:\n\n- Big buttons, at least **44 pixels** tall\n- Use `max-width` so text does not fill the whole screen on tablets\n- Always try it in the **Test** tab') }
        ]
      },
      {
        id: 'design-media', mins: 4,
        title: T('Imágenes y sonidos', 'Images and sounds'),
        sub: T('Dale vida a tu app', 'Bring your app to life'),
        steps: [
          { t: 'read', art: 'pixel', title: T('Tus propios recursos', 'Your own resources'),
            body: T('Las imágenes y sonidos se guardan en la pestaña **Archivos** de tu proyecto. Puedes importarlos o crearlos en el **Estudio**:\n\n- **Pixel art** para personajes y sprites\n- **Editor de imágenes** para recortar y retocar fotos\n- **Laboratorio de sonido** para efectos y música',
              'Images and sounds live in the **Files** tab of your project. You can import them or make them in the **Studio**:\n\n- **Pixel art** for characters and sprites\n- **Image editor** to crop and touch up photos\n- **Sound lab** for effects and music') },
          { t: 'read', title: T('Usarlos en la app', 'Using them in the app'),
            body: T('Una imagen se muestra con `<img>` y el nombre del archivo. Un sonido se reproduce con JavaScript:', 'An image is shown with `<img>` and the file name. A sound is played with JavaScript:'),
            code: T('<img src="gato.png" alt="Mi gato">\n\n<script>\n  const sonido = new Audio(\'moneda.wav\');\n  sonido.play();\n</script>', '<img src="cat.png" alt="My cat">\n\n<script>\n  const sound = new Audio(\'coin.wav\');\n  sound.play();\n</script>') },
          { t: 'quiz', q: T('Dibujaste un personaje y lo guardaste como heroe.png. ¿Cómo lo muestras?', 'You drew a character and saved it as hero.png. How do you show it?'),
            opts: T(['<img src="heroe.png">', '<p>heroe.png</p>', '<button>heroe.png</button>'], ['<img src="hero.png">', '<p>hero.png</p>', '<button>hero.png</button>']), a: 0 },
          { t: 'match', q: T('¿Qué herramienta del Estudio usarías?', 'Which Studio tool would you use?'),
            pairs: T([['Un personaje de 32×32', 'Pixel art'], ['Recortar una foto', 'Editor de imágenes'], ['Un sonido de salto', 'Laboratorio de sonido']], [['A 32\u00d732 character', 'Pixel art'], ['Crop a photo', 'Image editor'], ['A jump sound', 'Sound lab']]) },
          { t: 'quiz', q: T('¿Por qué conviene usar imágenes pequeñas?', 'Why is it a good idea to use small images?'),
            opts: T(['Porque la app viaja por el chat y debe pesar poco', 'Porque las grandes no se ven', 'No importa el tamaño'], ['Because the app travels through the chat and should be light', 'Because big ones are not shown', 'Size does not matter']), a: 0,
            why: T('La miniapp se envía como un archivo. Cuanto menos pese, antes llega a todos.', 'The mini app is sent as a file. The lighter it is, the sooner it reaches everyone.') },
          { t: 'read', art: 'game', title: T('Un consejo de pixel art', 'A pixel art tip'),
            body: T('El pixel art se ve nítido a cualquier tamaño si le dices al navegador que no lo suavice:', 'Pixel art stays crisp at any size if you tell the browser not to smooth it:'),
            code: 'img {\n  image-rendering: pixelated;\n}' }
        ]
      }
    ]
  });
})();
