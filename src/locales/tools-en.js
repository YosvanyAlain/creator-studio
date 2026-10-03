/* English strings: tools suite. */
'use strict';
CS.i18n.add('en', {
  srch_g_tools: 'Tools', srch_g_templates: 'Templates',
  /* Hub */
  tl_kicker: 'Utilities', tl_title: 'Tools', tl_lead: 'A toolbox for your mini apps. Everything works offline and saves into your projects.',
  tl_search: 'Search tools', tl_recent: 'Recently used', tl_none: 'No tool matches “{q}”', tl_missing: 'This tool does not exist',
  tl_group_design: 'Design', tl_group_share: 'Share', tl_group_data: 'Data and text', tl_group_studio: 'Studio',
  tl_color: 'Colors', tl_color_sub: 'Picker, harmonies, scales and contrast', tl_color_kw: 'palette hex rgb hsl contrast accessible',
  tl_gradient: 'Gradients', tl_gradient_sub: 'Gradient backgrounds and text', tl_gradient_kw: 'background css',
  tl_shadow: 'Shadows and corners', tl_shadow_sub: 'Depth and rounded corners', tl_shadow_kw: 'box-shadow radius corners card',
  tl_icon: 'App icon', tl_icon_sub: 'Design your mini app’s icon.png', tl_icon_kw: 'logo icon png image',
  tl_qr: 'QR code', tl_qr_sub: 'Links, text, Wi-Fi and e-mail', tl_qr_kw: 'qr code scan wifi link',
  tl_json: 'JSON', tl_json_sub: 'Validate, fix and tidy data', tl_json_kw: 'data validate format object',
  tl_regex: 'Regular expressions', tl_regex_sub: 'Find patterns in text, explained', tl_regex_kw: 'regex pattern find replace',
  tl_encode: 'Encode', tl_encode_sub: 'Base64, URL, HTML and files', tl_encode_kw: 'base64 url html data url file',
  tl_sample: 'Sample data', tl_sample_sub: 'Names, e-mails, dates and more', tl_sample_kw: 'fake test list names',
  'tl_st-pixel': 'Pixel editor', 'tl_st-pixel_sub': 'Sprites, icons and animations', 'tl_st-pixel_kw': 'sprite drawing pixel art',
  'tl_st-image': 'Photo editor', 'tl_st-image_sub': 'Crop, adjust and add filters', 'tl_st-image_kw': 'photo image filter crop',
  'tl_st-audio': 'Sound studio', 'tl_st-audio_sub': 'Sound effects and music for games', 'tl_st-audio_kw': 'sound music effect audio',

  /* Shared */
  tl_code: 'CSS', tl_use: 'Use in my app', tl_use_title: 'Add to an app', tl_use_sub: 'It is added at the end of its style sheet. Give the class to any element.',
  tl_class: 'Class name', tl_class_hint: 'Then use it in the HTML: class="class-name"', tl_add: 'Add',
  tl_added: 'Class {name} added to {file}', tl_added_raw: 'Added to {file}', tl_from_tools: 'Made with Tools: {tool}',
  tl_no_projects: 'Create an app first', tl_copied_value: 'Copied: {v}', tl_swap: 'Swap', tl_example: 'Example', tl_clear: 'Clear',
  tl_presets: 'Ideas', tl_style: 'Style', tl_colors: 'Colors', tl_angle: 'Angle', tl_position: 'Position', tl_random: 'Surprise me',

  /* Colors */
  tl_hue: 'Hue', tl_sat: 'Saturation', tl_light: 'Lightness', tl_formats: 'Formats', tl_harmony: 'Harmonies', tl_scale: 'Scale',
  tl_h_complementary: 'Opposite', tl_h_analogous: 'Neighbors', tl_h_triad: 'Trio', tl_h_tetrad: 'Quartet',
  tl_harmony_hint: 'Colors that go well with yours. Tap one to make it the main color.',
  tl_scale_hint: 'From lightest to darkest, same hue. Handy for backgrounds, borders and text. Tap to copy.',
  tl_text_on: 'Text in {c} · contrast {r}:1', tl_white: 'white', tl_black: 'black',
  tl_contrast: 'Contrast', tl_text_color: 'Text color', tl_sample_big: 'Big heading', tl_sample_small: 'This is how regular text reads on this background.',
  tl_ratio_great: 'Great for everyone', tl_ratio_good: 'Good to read', tl_ratio_large: 'Large text only', tl_ratio_bad: 'Hard to read',
  tl_large: 'Large', tl_contrast_hint: 'AA is the recommended minimum so everyone can read well, even in sunlight or with low vision. AAA is even better.',
  tl_palette_css: 'Variables',

  /* Gradients */
  tl_linear: 'Linear', tl_radial: 'Radial', tl_conic: 'Conic', tl_grad_word: 'Hello', tl_grad_text: 'Apply it to the text instead of the background',
  tl_add_color: 'Add color', tl_min_stops: 'A gradient needs at least two colors', tl_class_gradient: 'gradient-bg',

  /* Shadows */
  tl_sp_soft: 'Soft', tl_sp_raised: 'Raised', tl_sp_floating: 'Floating', tl_sp_glow: 'Glow', tl_sp_inset: 'Inset', tl_sp_sharp: 'Hard',
  tl_sh_shape: 'Corners', tl_sh_radius: 'Roundness', tl_sh_light: 'Shadow', tl_sh_x: 'Horizontal', tl_sh_y: 'Vertical', tl_sh_blur: 'Blur',
  tl_sh_spread: 'Size', tl_sh_alpha: 'Strength', tl_sh_color: 'Color', tl_sh_tint: 'Glow color',
  tl_sh_layered: 'Realistic (two layers)', tl_sh_inset: 'Inwards', tl_sh_tinted: 'Use the glow color', tl_class_shadow: 'card',

  /* App icon */
  tl_ic_app: 'My app', tl_icon_design: 'Design', tl_ic_bubble: 'How it looks in the chat', tl_ic_save: 'Save as icon.png',
  tl_ic_glyph: 'Symbol', tl_ic_icon: 'Icon', tl_ic_letters: 'Letters', tl_ic_letters_label: 'Up to 3 letters', tl_ic_letters_hint: 'For example your app’s initial.',
  tl_ic_search: 'Search (star, heart…)', tl_ic_stroke: 'Stroke', tl_ic_size: 'Size', tl_ic_fg: 'Symbol color',
  tl_ic_back: 'Background', tl_ic_gradient: 'Gradient', tl_ic_solid: 'Solid', tl_ic_c1: 'Color 1', tl_ic_c2: 'Color 2',
  tl_ic_shape: 'Shape', tl_ic_full: 'Full', tl_ic_squircle: 'Squircle', tl_ic_rounded: 'Rounded', tl_ic_circle: 'Circle',
  tl_ic_shape_hint: 'Delta Chat already rounds icons on its own, so “Full” usually looks best.',
  tl_ic_shine: 'Shine', tl_ic_depth: 'Shadow', tl_ic_spark: 'Spark',

  /* QR */
  tl_qr_k_link: 'Link', tl_qr_k_text: 'Text', tl_qr_k_wifi: 'Wi-Fi', tl_qr_k_mail: 'E-mail',
  tl_qr_link: 'Web address', tl_qr_text: 'Text', tl_qr_ssid: 'Network name', tl_qr_pass: 'Password', tl_qr_sec: 'Security', tl_qr_open: 'Open',
  tl_qr_mail: 'E-mail', tl_qr_subject: 'Subject (optional)', tl_qr_content: 'Content', tl_qr_look: 'Look', tl_qr_level: 'Damage resistance',
  tl_qr_s_square: 'Squares', tl_qr_s_round: 'Rounded', tl_qr_s_dots: 'Dots', tl_qr_dark: 'Dots', tl_qr_light: 'Background', tl_qr_margin_label: 'Margin',
  tl_qr_level_hint: 'L recovers 7% if the code gets dirty or covered, M 15%, Q 25% and H 30%. More resistance makes the code denser.',
  tl_qr_info: 'Version {v} · {n}×{n} modules · level {l} · {b} bytes',
  tl_qr_too_long: 'That is too much text for a QR code. Shorten it or lower the resistance to L.',
  tl_qr_inverted: 'Dots must be darker than the background; many cameras cannot read inverted codes.',
  tl_qr_low_contrast: 'Low contrast between dots and background: it may not scan.', tl_qr_margin: 'Leave a margin of at least 2 so cameras can find it.',
  tl_qr_save: 'Save image', tl_qr_copy: 'Copy content',

  /* JSON */
  tl_js_empty: 'Paste or type your JSON data', tl_js_valid: 'Valid JSON', tl_js_invalid: 'There is an error', tl_js_at: 'line {line}, column {col}',
  tl_js_array: 'list with {n} items', tl_js_object: 'object with {n} keys', tl_js_value: 'value of type {type}', tl_js_more: 'and {n} more…',
  tl_js_m_comments: 'JSON does not allow comments (// or /* */).', tl_js_m_single: 'Text goes in double quotes "like this", not single ones.',
  tl_js_m_keys: 'Keys need double quotes too: "name": …', tl_js_m_trailing: 'There is an extra comma before } or ].',
  tl_js_fix: 'Fix it for me', tl_js_hint: 'Check commas, double quotes and that every { and [ is closed.', tl_js_fix_first: 'Fix the error first',
  tl_js_format: 'Pretty print', tl_js_minify: 'Minify', tl_js_sort: 'Keys A-Z', tl_js_tree: 'Explore',
  tl_js_tip: 'Tip: in your app, JSON.stringify(data) turns data into text and JSON.parse(text) brings it back. That is how you store it in localStorage or send it with webxdc.',

  /* Regex */
  tl_rx_pattern: 'Pattern', tl_rx_recipes: 'Recipes', tl_rx_text: 'Test text', tl_rx_explain: 'What each part means', tl_rx_code: 'Use it in JavaScript',
  tl_rx_sample: 'Write to alice@example.org or ben.smith@mail.net before 12/10/2026 at 18:30. #party @chloe',
  tl_rx_count_one: '{n} match', tl_rx_count_other: '{n} matches', tl_rx_invalid: 'Invalid pattern',
  tl_rx_behind: 'Lookbehind (?<=) does not work on some older phones.',
  tl_rx_f_g: 'all', tl_rx_f_i: 'ignore case', tl_rx_f_m: 'per line', tl_rx_f_s: 'dot matches newlines',
  tl_rx_r_email: 'E-mails', tl_rx_r_number: 'Numbers', tl_rx_r_date: 'Dates', tl_rx_r_time: 'Times', tl_rx_r_url: 'Links', tl_rx_r_hashtag: 'Hashtags',
  tl_rx_r_mention: 'Mentions', tl_rx_r_hex: 'Hex colors', tl_rx_r_spaces: 'Double spaces', tl_rx_r_capital: 'Capitalized words',
  tl_rx_t_digit: 'a digit (0-9)', tl_rx_t_notdigit: 'anything but a digit', tl_rx_t_word: 'a letter, digit or _', tl_rx_t_notword: 'anything but a letter or digit',
  tl_rx_t_space: 'a space, tab or line break', tl_rx_t_notspace: 'anything but whitespace', tl_rx_t_boundary: 'word boundary', tl_rx_t_newline: 'line break', tl_rx_t_tab: 'tab',
  tl_rx_t_literal: 'the character “{c}” as is', tl_rx_t_text: 'the text “{c}”', tl_rx_t_set: 'one of: {set}', tl_rx_t_notset: 'anything but: {set}',
  tl_rx_t_exact: 'exactly {a} times', tl_rx_t_atleast: '{a} times or more', tl_rx_t_range: 'between {a} and {b} times',
  tl_rx_t_group: 'starts a group (kept as $1, $2…)', tl_rx_t_nocap: 'starts a group that is not kept', tl_rx_t_close: 'closes the group',
  tl_rx_t_ahead: 'looks at what comes next, without including it', tl_rx_t_behind: 'looks at what comes before, without including it',
  tl_rx_t_any: 'any character', tl_rx_t_plus: 'the previous part, once or more', tl_rx_t_star: 'the previous part, zero or more times', tl_rx_t_opt: 'the previous part is optional',
  tl_rx_t_start: 'start of the text', tl_rx_t_end: 'end of the text', tl_rx_t_or: 'or',

  /* Encode */
  tl_en_enc: 'Encode', tl_en_dec: 'Decode', tl_en_result: 'Result', tl_en_file: 'File to data URL',
  tl_en_file_big: 'The file is too big (5 MB max)', tl_en_file_done: '{name} converted ({size})',
  tl_en_bad_base64: 'This is not valid Base64.', tl_en_bad_url: 'There is a % that is not a valid code.', tl_en_bad_html: 'Could not decode it.',
  tl_en_hint_base64: 'Base64 turns any data into safe letters and digits to store or send. It takes 33% more space.',
  tl_en_hint_url: 'Encodes spaces, accents and symbols so they fit inside a link.',
  tl_en_hint_html: 'Escapes < > & and quotes so text shows as text, not HTML. A must for anything other people type.',

  /* Sample data */
  tl_sm_fields: 'Which data', tl_sm_count: 'How many', tl_sm_lines: 'Text', tl_sm_again: 'New data', tl_sm_result: 'Data', tl_sm_var: 'data',
  tl_sm_hint: 'Made-up data to test your app without using anyone’s real information.',
  tl_sm_f_name: 'Name', tl_sm_f_email: 'E-mail', tl_sm_f_phone: 'Phone', tl_sm_f_city: 'City', tl_sm_f_date: 'Date', tl_sm_f_number: 'Number',
  tl_sm_f_price: 'Price', tl_sm_f_bool: 'Yes/No', tl_sm_f_color: 'Color', tl_sm_f_thing: 'Product', tl_sm_f_sentence: 'Sentence', tl_sm_f_id: 'ID',
  tl_sm_key_name: 'name', tl_sm_key_email: 'email', tl_sm_key_phone: 'phone', tl_sm_key_city: 'city', tl_sm_key_date: 'date', tl_sm_key_number: 'number',
  tl_sm_key_price: 'price', tl_sm_key_bool: 'done', tl_sm_key_color: 'color', tl_sm_key_thing: 'product', tl_sm_key_sentence: 'sentence', tl_sm_key_id: 'id'
});
