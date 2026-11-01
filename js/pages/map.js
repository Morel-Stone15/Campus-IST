/* Plan interactif officiel de l'université (Master Plan architectural IST 1000 × 720) */
(function () {
  const { ui } = IST;
  const icon = IST.icon;
  const W = 1000, H = 720;
  const FILTERS = [
    ['tous', 'Tous les lieux'],
    ['batiment', 'Pédagogie & Administration'],
    ['salle', 'Amphis & Salles de cours'],
    ['service', 'Résidences, Sport & Resto'],
  ];
  const st = { filter: 'tous', q: '', selected: null, zoom: null };

  const places = () => IST.data.places;
  const byId = (id) => places().find((p) => p.id === id);
  const markerOf = (p) => (p.parent ? byId(p.parent) : p.x != null ? p : null);
  const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function matches(p) {
    if (st.filter !== 'tous' && p.category !== st.filter) return false;
    const q = norm(st.q.trim());
    if (!q) return true;
    const numMatch = p.num != null && String(p.num) === q;
    return numMatch || norm(p.name + ' ' + (p.desc || '')).includes(q);
  }

  /* ---------- Dessin SVG du Master Plan architectural ---------- */
  function tree(x, y, r = 14) {
    return `<g class="m-tree-grp">
      <circle class="m-tree-shadow" cx="${x + 2}" cy="${y + 3}" r="${r}"/>
      <circle class="m-tree" cx="${x}" cy="${y}" r="${r}"/>
      <circle class="m-tree2" cx="${x - r * 0.28}" cy="${y - r * 0.28}" r="${r * 0.58}"/>
    </g>`;
  }

  function treeCluster(cx, cy, count = 4, spread = 22) {
    let out = '';
    const offsets = [[0, 0], [spread * 0.7, -spread * 0.5], [-spread * 0.6, spread * 0.5], [spread * 0.8, spread * 0.4], [-spread * 0.7, -spread * 0.4]];
    for (let i = 0; i < Math.min(count, offsets.length); i++) {
      out += tree(cx + offsets[i][0], cy + offsets[i][1], 12 + (i % 3) * 2);
    }
    return out;
  }

  function hipLines(x, y, w, h) {
    const inset = Math.min(w, h) * 0.35;
    const x1 = x + inset, y1 = y + inset;
    const x2 = x + w - inset, y2 = y + h - inset;
    return `
      <line class="m-arch-ridge" x1="${x}" y1="${y}" x2="${x1}" y2="${y1}"/>
      <line class="m-arch-ridge" x1="${x + w}" y1="${y}" x2="${x2}" y2="${y1}"/>
      <line class="m-arch-ridge" x1="${x}" y1="${y + h}" x2="${x1}" y2="${y2}"/>
      <line class="m-arch-ridge" x1="${x + w}" y1="${y + h}" x2="${x2}" y2="${y2}"/>
      ${w >= h ? `<line class="m-arch-ridge" x1="${x1}" y1="${y + h / 2}" x2="${x2}" y2="${y + h / 2}"/>` : `<line class="m-arch-ridge" x1="${x + w / 2}" y1="${y1}" x2="${x + w / 2}" y2="${y2}"/>`}
    `;
  }

  function mapSVG() {
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Plan architectural du campus universitaire de l'IST">
      <defs>
        <!-- Texture d'herbe -->
        <pattern id="grass-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle class="m-dot" cx="8" cy="8" r="1.5"/>
          <circle class="m-dot" cx="24" cy="24" r="1.5"/>
        </pattern>
        <!-- Hachures Réserves Foncières -->
        <pattern id="rf-hatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(224, 45, 60, 0.4)" stroke-width="2"/>
        </pattern>
        <!-- Bandes de tonte du terrain de foot -->
        <pattern id="pitch-stripes" width="16" height="84" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="8" height="84" fill="#2e7d32"/>
          <rect x="8" y="0" width="8" height="84" fill="#388e3c"/>
        </pattern>
        <!-- Ombre portée pour les toitures architecturales -->
        <filter id="bld-shadow" x="-8%" y="-8%" width="124%" height="124%">
          <feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="rgba(15, 23, 42, 0.28)"/>
        </filter>
      </defs>

      <!-- 1. SOL & ESPACES VERTS -->
      <rect class="m-grass" width="${W}" height="${H}"/>
      <rect width="${W}" height="${H}" fill="url(#grass-pattern)"/>

      <!-- Clôture / Limite d'enceinte du campus -->
      <rect x="30" y="24" width="${W - 60}" height="${H - 50}" rx="14" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 6"/>

      <!-- 2. RÉSEAU ROUTIER & VOIRIE DU CAMPUS -->
      <!-- Voie extérieure sud (Boulevard d'accès) -->
      <path class="m-pave-walk" d="M30 680 H970 V715 H30 Z"/>
      <path class="m-road" d="M30 697 H970" stroke-width="26" stroke-linejoin="round"/>
      <path class="m-line" d="M30 697 H970" stroke-width="2" stroke-dasharray="14 14"/>

      <!-- Rond-point Entrée Principale (Sud-Est) -->
      <g transform="translate(735, 660)">
        <circle class="m-road" r="32" stroke-width="20"/>
        <circle class="m-grass" r="18"/>
        <circle class="m-tree" cx="-2" cy="-2" r="8"/>
      </g>

      <!-- Boulevard Académique Central (Nord-Sud entre Bât. B et A vers Bât. Administratif) -->
      <path class="m-pave-walk" d="M640 315 H715 V645 H640 Z"/>
      <path class="m-road" d="M677 315 V645" stroke-width="28" stroke-linejoin="round"/>
      <path class="m-line" d="M677 315 V645" stroke-width="1.5" stroke-dasharray="10 10"/>

      <!-- Branche Est vers l'Amphithéâtre -->
      <path class="m-road" d="M735 645 H880 V500 H810" stroke-width="22" stroke-linejoin="round"/>

      <!-- Branche Ouest vers l'Hôtel de Cap -->
      <path class="m-road" d="M640 580 H330 V500" stroke-width="22" stroke-linejoin="round"/>
      <!-- Rond-point dépose-minute Hôtel de Cap -->
      <circle class="m-road" cx="412" cy="580" r="22" stroke-width="16"/>
      <circle class="m-grass" cx="412" cy="580" r="10"/>

      <!-- Voie d'accès Logements Enseignants et Villas (Sud-Ouest) -->
      <path class="m-road" d="M260 697 V545 H120 V440" stroke-width="20" stroke-linejoin="round"/>

      <!-- Allée de ceinture Ouest (entre Dortoirs et Complexe Sportif) -->
      <path class="m-road" d="M305 440 V105 H520" stroke-width="18" stroke-linejoin="round"/>

      <!-- Voie Nord (au-dessus du Bâtiment Administratif vers Bâtiments D, C, E) -->
      <path class="m-road" d="M525 255 H780 V80 H520" stroke-width="20" stroke-linejoin="round"/>

      <!-- Parvis pavés piétons & Places -->
      <!-- Esplanade centrale paysagère entre Bât. B et A -->
      <rect class="m-pave-walk" x="635" y="335" width="85" height="175" rx="6"/>
      <rect x="655" y="355" width="45" height="40" rx="4" fill="#65a30d" opacity="0.4"/>
      <rect x="655" y="420" width="45" height="40" rx="4" fill="#65a30d" opacity="0.4"/>
      ${tree(677, 375, 10)}
      ${tree(677, 440, 10)}

      <!-- Place piétonne entre Bâtiments D et C -->
      <rect class="m-pave-walk" x="620" y="140" width="55" height="95" rx="6"/>
      <text class="m-arch-title-sm" x="647" y="190" style="font-size:12px;letter-spacing:1.5px;fill:#475569">Place</text>
      ${tree(647, 158, 8)}
      ${tree(647, 218, 8)}

      <!-- Place centrale Cité U / Dortoirs -->
      <rect class="m-pave-walk" x="310" y="325" width="90" height="45" rx="4"/>
      <text class="m-arch-title-sm" x="355" y="342">Place</text>

      <!-- 3. ZONES DE STATIONNEMENT (PARKINGS) -->
      <!-- Parking Bâtiment Administratif -->
      <rect class="m-park" x="735" y="260" width="55" height="36" rx="4"/>
      <line class="m-park-line" x1="740" y1="265" x2="785" y2="265"/>
      <line class="m-park-line" x1="740" y1="290" x2="785" y2="290"/>
      <text class="m-arch-title-sm" x="762" y="282" style="fill:#fff;stroke:none">P</text>

      <!-- Parking Hôtel de Cap -->
      <rect class="m-park" x="445" y="565" width="60" height="32" rx="4"/>
      <line class="m-park-line" x1="450" y1="570" x2="500" y2="570"/>
      <line class="m-park-line" x1="450" y1="590" x2="500" y2="590"/>
      <text class="m-arch-title-sm" x="475" y="584" style="fill:#fff;stroke:none">P</text>

      <!-- Parking Enseignants & Villas -->
      <rect class="m-park" x="80" y="590" width="75" height="34" rx="4"/>
      <line class="m-park-line" x1="85" y1="596" x2="150" y2="596"/>
      <line class="m-park-line" x1="85" y1="618" x2="150" y2="618"/>
      <text class="m-arch-title-sm" x="117" y="610" style="fill:#fff;stroke:none">P</text>

      <!-- 4. RÉSERVES FONCIÈRES DU MASTER PLAN -->
      <!-- Réserve Foncière Ouest (entre Sports et Dortoirs) -->
      <g transform="translate(310, 165)">
        <rect class="m-rf-hatch" width="95" height="145" rx="6" fill="url(#rf-hatch)"/>
        <text class="m-arch-title-sm" x="47" y="55">RÉSERVES</text>
        <text class="m-arch-title-sm" x="47" y="70">FONCIÈRES</text>
        <text class="m-arch-title-sm" x="47" y="95" style="font-size:12px;letter-spacing:1px">Place</text>
      </g>

      <!-- Réserve Foncière Sud-Est (face à l'entrée principale) -->
      <g transform="translate(540, 560)">
        <rect class="m-rf-hatch" width="130" height="85" rx="6" fill="url(#rf-hatch)"/>
        <text class="m-arch-title-sm" x="65" y="42">RÉSERVES</text>
        <text class="m-arch-title-sm" x="65" y="56">FONCIÈRES</text>
      </g>

      <!-- 5. BÂTIMENTS DU MASTER PLAN ARCHITECTURAL -->

      <!-- [19] BÂTIMENT PÉDAGOGIQUE E / LOGEMENTS R+2 ÉTUDIANTS (Nord) -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof" x="520" y="70" width="245" height="36" rx="4"/>
        ${hipLines(520, 70, 245, 36)}
        <circle class="m-arch-badge" cx="642" cy="88" r="10"/>
        <text class="m-arch-num" x="642" y="88">19</text>
      </g>
      <text class="m-arch-title" x="642" y="60">BÂTIMENT PÉDAGOGIQUE E (LOGEMENTS R+2)</text>

      <!-- [17] BÂTIMENT PÉDAGOGIQUE D (E-shape avec 3 ailes vers la droite) -->
      <g filter="url(#bld-shadow)">
        <path class="m-arch-roof" d="M530 120 H620 V148 H562 V166 H612 V194 H562 V212 H620 V240 H530 Z"/>
        <!-- Lignes de croupes architecturales -->
        <line class="m-arch-ridge" x1="530" y1="120" x2="562" y2="148"/>
        <line class="m-arch-ridge" x1="562" y1="212" x2="530" y2="240"/>
        <line class="m-arch-ridge" x1="546" y1="148" x2="546" y2="212"/>
        <circle class="m-arch-badge" cx="575" cy="180" r="10"/>
        <text class="m-arch-num" x="575" y="180">17</text>
      </g>
      <text class="m-arch-title-sm" x="575" y="254">BÂTIMENT PÉDAGOGIQUE D</text>

      <!-- [18] BÂTIMENT PÉDAGOGIQUE C (E-shape avec 3 ailes vers la gauche) -->
      <g filter="url(#bld-shadow)">
        <path class="m-arch-roof" d="M760 120 H670 V148 H728 V166 H678 V194 H728 V212 H670 V240 H760 Z"/>
        <line class="m-arch-ridge" x1="760" y1="120" x2="728" y2="148"/>
        <line class="m-arch-ridge" x1="728" y1="212" x2="760" y2="240"/>
        <line class="m-arch-ridge" x1="744" y1="148" x2="744" y2="212"/>
        <circle class="m-arch-badge" cx="715" cy="180" r="10"/>
        <text class="m-arch-num" x="715" y="180">18</text>
      </g>
      <text class="m-arch-title-sm" x="715" y="254">BÂTIMENT PÉDAGOGIQUE C</text>

      <!-- [4] BÂTIMENT ADMINISTRATIF (Central avec porche semi-circulaire) -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof" x="595" y="255" width="130" height="42" rx="4"/>
        ${hipLines(595, 255, 130, 42)}
        <!-- Porche / Rotonde d'entrée -->
        <path class="m-arch-roof-alt" d="M642 297 A18 18 0 0 0 678 297 Z"/>
        <circle class="m-arch-badge" cx="660" cy="276" r="10"/>
        <text class="m-arch-num" x="660" y="276">4</text>
      </g>
      <text class="m-arch-title" x="660" y="318">BÂTIMENT ADMINISTRATIF</text>

      <!-- [2] BÂTIMENT PÉDAGOGIQUE B (E-shape vertical, 3 ailes vers la droite) -->
      <g filter="url(#bld-shadow)">
        <path class="m-arch-roof" d="M545 335 H635 V370 H580 V405 H625 V435 H580 V470 H635 V505 H545 Z"/>
        <line class="m-arch-ridge" x1="545" y1="335" x2="580" y2="370"/>
        <line class="m-arch-ridge" x1="580" y1="470" x2="545" y2="505"/>
        <line class="m-arch-ridge" x1="562" y1="370" x2="562" y2="470"/>
        <circle class="m-arch-badge" cx="590" cy="420" r="10"/>
        <text class="m-arch-num" x="590" y="420">2</text>
      </g>
      <text class="m-arch-title" x="590" y="522">BÂTIMENT PÉDAGOGIQUE B</text>

      <!-- [3] BÂTIMENT PÉDAGOGIQUE A (E-shape vertical, 3 ailes vers la gauche) -->
      <g filter="url(#bld-shadow)">
        <path class="m-arch-roof" d="M815 335 H725 V370 H780 V405 H735 V435 H780 V470 H725 V505 H815 Z"/>
        <line class="m-arch-ridge" x1="815" y1="335" x2="780" y2="370"/>
        <line class="m-arch-ridge" x1="780" y1="470" x2="815" y2="505"/>
        <line class="m-arch-ridge" x1="797" y1="370" x2="797" y2="470"/>
        <circle class="m-arch-badge" cx="770" cy="420" r="10"/>
        <text class="m-arch-num" x="770" y="420">3</text>
      </g>
      <text class="m-arch-title" x="770" y="522">BÂTIMENT PÉDAGOGIQUE A</text>

      <!-- [1] AMPHITHÉÂTRE (Octogonal/facetté à 4 croupes) -->
      <g filter="url(#bld-shadow)">
        <path class="m-arch-roof" d="M770 540 L805 520 L865 520 L900 540 L900 585 L865 605 L805 605 L770 585 Z"/>
        <!-- Arêtes de toiture en croupe convergentes -->
        <line class="m-arch-ridge" x1="770" y1="540" x2="835" y2="562"/>
        <line class="m-arch-ridge" x1="805" y1="520" x2="835" y2="562"/>
        <line class="m-arch-ridge" x1="865" y1="520" x2="835" y2="562"/>
        <line class="m-arch-ridge" x1="900" y1="540" x2="835" y2="562"/>
        <line class="m-arch-ridge" x1="900" y1="585" x2="835" y2="562"/>
        <line class="m-arch-ridge" x1="865" y1="605" x2="835" y2="562"/>
        <line class="m-arch-ridge" x1="805" y1="605" x2="835" y2="562"/>
        <line class="m-arch-ridge" x1="770" y1="585" x2="835" y2="562"/>
        <circle class="m-arch-badge" cx="835" cy="562" r="11"/>
        <text class="m-arch-num" x="835" y="562">1</text>
      </g>
      <text class="m-arch-title" x="835" y="624">AMPHITHÉÂTRE</text>

      <!-- DORTOIRS 1 À 4 (Cité Universitaire Étudiante) -->
      <!-- [12] Dortoir 4 -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof" x="415" y="180" width="82" height="34" rx="4"/>
        ${hipLines(415, 180, 82, 34)}
        <circle class="m-arch-badge" cx="456" cy="197" r="9"/>
        <text class="m-arch-num" x="456" y="197">12</text>
      </g>
      <text class="m-arch-title-sm" x="456" y="174">DORTOIR 4</text>

      <!-- [11] Dortoir 3 -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof" x="415" y="232" width="82" height="34" rx="4"/>
        ${hipLines(415, 232, 82, 34)}
        <circle class="m-arch-badge" cx="456" cy="249" r="9"/>
        <text class="m-arch-num" x="456" y="249">11</text>
      </g>
      <text class="m-arch-title-sm" x="456" y="226">DORTOIR 3</text>

      <!-- [10] Dortoir 2 -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof" x="415" y="284" width="82" height="34" rx="4"/>
        ${hipLines(415, 284, 82, 34)}
        <circle class="m-arch-badge" cx="456" cy="301" r="9"/>
        <text class="m-arch-num" x="456" y="301">10</text>
      </g>
      <text class="m-arch-title-sm" x="456" y="278">DORTOIR 2</text>

      <!-- [9] Dortoir 1 -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof" x="415" y="336" width="82" height="34" rx="4"/>
        ${hipLines(415, 336, 82, 34)}
        <circle class="m-arch-badge" cx="456" cy="353" r="9"/>
        <text class="m-arch-num" x="456" y="353">9</text>
      </g>
      <text class="m-arch-title-sm" x="456" y="330">DORTOIR 1</text>

      <!-- RESTAURANT & SNACK UNIVERSITAIRE (Encart post-it) -->
      <g transform="translate(305, 345)">
        <rect class="m-rf-hatch" width="95" height="65" rx="5" fill="rgba(254, 240, 138, 0.45)" stroke="#ea580c"/>
        <text class="m-arch-title-sm" x="47" y="28" style="fill:#c2410c">RESTAURANT</text>
        <text class="m-arch-title-sm" x="47" y="44" style="fill:#c2410c">&amp; SNACK</text>
      </g>

      <!-- PROJET AMPHITHÉÂTRE 800 PLACES (Encart post-it Nord) -->
      <g transform="translate(325, 95)">
        <rect class="m-rf-hatch" width="85" height="65" rx="5" fill="rgba(254, 205, 211, 0.4)" stroke="#db2777"/>
        <text class="m-arch-title-sm" x="42" y="26" style="fill:#be185d">AMPHI 800</text>
        <text class="m-arch-title-sm" x="42" y="40" style="fill:#be185d">800 PLACES</text>
      </g>

      <!-- [5] HÔTEL DE CAP (Double aile avec hall central) -->
      <g filter="url(#bld-shadow)">
        <!-- Aile Nord -->
        <rect class="m-arch-roof" x="335" y="475" width="155" height="38" rx="4"/>
        ${hipLines(335, 475, 155, 38)}
        <!-- Aile Sud -->
        <rect class="m-arch-roof" x="330" y="525" width="165" height="42" rx="4"/>
        ${hipLines(330, 525, 165, 42)}
        <!-- Hall / Rotonde centrale -->
        <circle class="m-arch-roof-alt" cx="412" cy="513" r="16"/>
        <circle class="m-arch-badge" cx="412" cy="513" r="10"/>
        <text class="m-arch-num" x="412" y="513">5</text>
      </g>
      <text class="m-arch-title" x="412" y="582">HÔTEL DE CAP</text>

      <!-- ZONE RÉSIDENTIELLE ENSEIGNANTS & DIRECTION (Sud-Ouest) -->
      <text class="m-arch-title" x="165" y="432" style="font-size:11.5px;fill:#0369a1">LOGEMENT DES ENSEIGNANTS</text>

      <!-- [6] Logement des Enseignants (L-Shape) -->
      <g filter="url(#bld-shadow)">
        <path class="m-arch-roof" d="M125 450 H205 V482 H160 V530 H125 Z"/>
        <line class="m-arch-ridge" x1="125" y1="450" x2="160" y2="482"/>
        <line class="m-arch-ridge" x1="160" y1="482" x2="205" y2="450"/>
        <circle class="m-arch-badge" cx="165" cy="480" r="10"/>
        <text class="m-arch-num" x="165" y="480">6</text>
      </g>
      <text class="m-arch-title-sm" x="165" y="546">LOGEMENTS PROFS R+2</text>

      <!-- [8] Villa du Vice-Recteur -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof" x="215" y="525" width="40" height="46" rx="4"/>
        ${hipLines(215, 525, 40, 46)}
        <circle class="m-arch-badge" cx="235" cy="548" r="9"/>
        <text class="m-arch-num" x="235" y="548">8</text>
      </g>
      <text class="m-arch-title-sm" x="235" y="582">VILLA DU VICE-RECTEUR</text>

      <!-- [7] Villa du Recteur -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof" x="215" y="595" width="40" height="46" rx="4"/>
        ${hipLines(215, 595, 40, 46)}
        <circle class="m-arch-badge" cx="235" cy="618" r="9"/>
        <text class="m-arch-num" x="235" y="618">7</text>
      </g>
      <text class="m-arch-title-sm" x="235" y="652">VILLA DU RECTEUR</text>

      <!-- 6. COMPLEXE SPORTIF DU CAMPUS (Nord-Ouest) -->
      <!-- [13] TERRAIN DE FOOTBALL & PISTE D'ATHLÉTISME -->
      <g filter="url(#bld-shadow)">
        <!-- Anneau rouge de la piste d'athlétisme -->
        <path class="m-track-ring" d="M125 105 H245 A58 58 0 0 1 245 221 H125 A58 58 0 0 1 125 105 Z"/>
        <!-- Lignes de couloirs blanches -->
        <path class="m-track-lane" d="M125 110 H245 A53 53 0 0 1 245 216 H125 A53 53 0 0 1 125 110 Z"/>
        <path class="m-track-lane" d="M125 116 H245 A47 47 0 0 1 245 210 H125 A47 47 0 0 1 125 116 Z"/>
        <path class="m-track-lane" d="M125 122 H245 A41 41 0 0 1 245 204 H125 A41 41 0 0 1 125 122 Z"/>

        <!-- Pelouse engazonnée avec bandes alternées -->
        <rect class="m-field" x="122" y="126" width="126" height="74" rx="3"/>
        <rect x="122" y="126" width="126" height="74" rx="3" fill="url(#pitch-stripes)" opacity="0.65"/>

        <!-- Lignes blanches de football -->
        <rect class="m-field-line" x="126" y="130" width="118" height="66" rx="1"/>
        <line class="m-field-line" x1="185" y1="130" x2="185" y2="196"/>
        <circle class="m-field-line" cx="185" cy="163" r="16"/>
        <circle cx="185" cy="163" r="2" fill="#fff"/>
        <!-- Surfaces de réparation -->
        <rect class="m-field-line" x="126" y="145" width="22" height="36"/>
        <rect class="m-field-line" x="222" y="145" width="22" height="36"/>
        <!-- Buts -->
        <rect x="122" y="156" width="4" height="14" fill="#fff" opacity="0.9"/>
        <rect x="244" y="156" width="4" height="14" fill="#fff" opacity="0.9"/>

        <!-- Badge officiel 13 -->
        <circle class="m-arch-badge" cx="185" cy="138" r="9"/>
        <text class="m-arch-num" x="185" y="138">13</text>
      </g>
      <text class="m-arch-title" x="185" y="96">TERRAIN DE FOOTBALL &amp; ATHLÉTISME</text>

      <!-- Tribunes du stade (au pied de la piste) -->
      <g filter="url(#bld-shadow)">
        <rect class="m-arch-roof-alt" x="120" y="228" width="130" height="15" rx="3"/>
        <line x1="125" y1="233" x2="245" y2="233" stroke="#fff" stroke-width="1"/>
        <line x1="125" y1="238" x2="245" y2="238" stroke="#fff" stroke-width="1"/>
      </g>

      <!-- PLATEAU MULTISPORTS (Terrains Handball, Basket, Volley, Street Workout) -->
      <g transform="translate(88, 258)">
        <!-- Terrain 1 : Handball / Basketball -->
        <rect class="m-court-poly" x="0" y="0" width="94" height="74" rx="4"/>
        <rect class="m-court-line" x="4" y="4" width="86" height="66" rx="2"/>
        <line class="m-court-line" x1="47" y1="4" x2="47" y2="70"/>
        <circle class="m-court-line" cx="47" cy="37" r="10"/>
        <text class="m-arch-title-sm" x="47" y="78">1. Handball / Basket</text>

        <!-- Terrain 2 : Basketball / Volleyball & Street Workout -->
        <rect class="m-court-poly" x="100" y="0" width="94" height="74" rx="4"/>
        <rect class="m-court-line" x="104" y="4" width="86" height="66" rx="2"/>
        <line class="m-court-line" x1="147" y1="4" x2="147" y2="70"/>
        <circle class="m-court-line" cx="147" cy="37" r="8"/>
        <text class="m-arch-title-sm" x="147" y="78">2. Basket / Volley · Workout</text>
      </g>

      <!-- 7. ENTRÉES & BALISES D'ACCÈS DU PLAN -->
      <!-- Balise Entrée Principale (Cible rouge pulsante de la photo) -->
      <g transform="translate(735, 695)">
        <circle class="m-access-beacon" r="18"/>
        <circle cx="0" cy="0" r="7" fill="#e02d3c"/>
        <text class="m-arch-title" x="0" y="-24" style="fill:#e02d3c;font-size:12px;font-weight:800">VOIE D'ACCÈS</text>
        <text class="m-arch-title-sm" x="0" y="-12" style="fill:#e02d3c">Entrée Principale</text>
      </g>

      <!-- Balise Entrée Hôtel -->
      <g transform="translate(410, 695)">
        <polygon points="410,682 404,694 416,694" fill="#0f172a" transform="translate(-410, -688)"/>
        <text class="m-arch-title-sm" x="0" y="-14">Entrée Hôtel</text>
      </g>

      <!-- Balise Entrée Logements -->
      <g transform="translate(260, 695)">
        <polygon points="260,682 254,694 266,694" fill="#0f172a" transform="translate(-260, -688)"/>
        <text class="m-arch-title-sm" x="0" y="-14">Entrée Logements</text>
      </g>

      <!-- Entrées de service -->
      <text class="m-arch-title-sm" x="885" y="285" style="font-size:8px">Entrée de Service 1</text>
      <text class="m-arch-title-sm" x="825" y="45" style="font-size:8px">Entrée de Service 2</text>
      <text class="m-arch-title-sm" x="38" y="225" style="font-size:8px">Entrée de Service 3</text>

      <!-- 8. ARBRES & AMÉNAGEMENTS PAYSAGERS (Alignements conformes à la maquette) -->
      <!-- Forêt périphérique Est -->
      ${treeCluster(880, 80, 5, 20)}
      ${treeCluster(895, 160, 5, 20)}
      ${treeCluster(885, 360, 4, 18)}
      ${treeCluster(910, 440, 5, 22)}
      ${treeCluster(930, 540, 5, 20)}
      ${treeCluster(920, 640, 5, 22)}

      <!-- Alignements d'arbres Sud le long du boulevard -->
      ${tree(170, 670, 12)}
      ${tree(210, 670, 12)}
      ${tree(330, 670, 12)}
      ${tree(490, 670, 12)}
      ${tree(570, 670, 12)}
      ${tree(640, 670, 12)}
      ${tree(810, 670, 12)}
      ${tree(860, 670, 12)}

      <!-- Arbres cour intérieure Hôtel et Villas -->
      ${tree(130, 560, 13)}
      ${tree(175, 590, 12)}
      ${tree(280, 570, 12)}
      ${tree(280, 620, 12)}
      ${tree(360, 440, 11)}
      ${tree(460, 440, 11)}

      <!-- Arbres secteur nord & terrain de sport -->
      ${tree(50, 80, 13)}
      ${tree(275, 80, 12)}
      ${tree(480, 80, 12)}
      ${tree(790, 80, 13)}
      ${tree(50, 360, 12)}
      ${tree(50, 460, 13)}
    </svg>`;
  }

  /* ---------- Rendu des marqueurs et de l'interface ---------- */
  function markersHTML() {
    const visible = places().filter(matches);
    const active = new Set(visible.map(markerOf).filter(Boolean).map((m) => m.id));
    const sel = st.selected && markerOf(byId(st.selected));
    return places().filter((p) => !p.parent).map((p) => {
      const dim = (st.filter !== 'tous' || st.q) && !active.has(p.id);
      return `<button type="button" class="marker tone-${p.tone} ${sel && sel.id === p.id ? 'active' : ''} ${dim ? 'dim' : ''}"
        style="left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%" data-place="${p.id}" aria-label="${ui.esc(p.name)}">
        <span class="pin">${icon(p.icon)}</span></button>`;
    }).join('');
  }

  function resultsHTML() {
    const list = places().filter(matches);
    if (!list.length) return `<div class="card">${ui.empty('search', 'Aucun lieu trouvé', 'Essaie « 1 », « Amphi », « P107 », « A203 » ou « Dortoir ».')}</div>`;
    return `<div class="list">${list.map((p) => `
      <button type="button" class="list-item" data-place="${p.id}">
        <span class="ic-box sm tone-${p.tone}">${icon(p.icon)}</span>
        <div class="grow"><strong>${ui.esc(p.name)}</strong><small>${ui.esc(p.desc)}</small></div>
        ${icon('chevronRight')}
      </button>`).join('')}</div>`;
  }

  function cardHTML() {
    const p = st.selected && byId(st.selected);
    if (!p) return '';
    const label = { batiment: 'Bâtiment', salle: 'Salle / Amphi', service: 'Service & Équipement' }[p.category] || 'Campus';
    return `<div class="place-card tone-${p.tone}" role="status">
      <span class="ic-box">${icon(p.icon)}</span>
      <div class="grow">
        <strong>${ui.esc(p.name)}</strong>
        <small>${ui.esc(p.desc)}</small>
        <span class="tag" style="margin-top:6px">${label}${p.parent ? ' · ' + ui.esc(byId(p.parent).name) : ''}</span>
      </div>
      <button class="icon-btn" data-unselect aria-label="Fermer">${icon('x')}</button>
    </div>`;
  }

  IST.pages.plan = {
    title: "Plan de l'université",
    subtitle: 'Master Plan officiel : amphithéâtres, bâtiments pédagogiques, cité U et équipements',
    render({ user, params = [] }) {
      const targetParam = params[0] || (new URLSearchParams(location.hash.split('?')[1] || '').get('place'));
      if (targetParam) {
        // Résolution de paramètre salle ou lieu (ex: 'amphi', 'P107', 'batB', 'room-BP107')
        const matched = places().find((p) => p.id === targetParam || norm(p.name).includes(norm(targetParam)) || (p.num && String(p.num) === targetParam));
        if (matched) st.selected = matched.id;
      }
      const mine = IST.db.myRoom(user);
      const mineId = mine && (typeof mine.raw === 'string' ? 'amphi' : 'room-' + (mine.raw[0] || 'X') + mine.raw[1]);
      if (st.zoom == null) st.zoom = window.innerWidth < 700 ? 1.8 : 1;
      return `<div class="map-layout">
        <div class="map-side">
          <label class="searchbar">${icon('search')}<span class="sr-only">Rechercher un lieu</span>
            <input type="search" placeholder="N° de bâtiment, salle, filière (ex. 1, 2, P107, A203, Amphi, Dortoir)" value="${ui.esc(st.q)}" data-q></label>
          <div class="chips">${FILTERS.map(([v, l]) => `<button type="button" class="chip ${v === st.filter ? 'active' : ''}" data-filter="${v}">${l}</button>`).join('')}</div>
          ${mineId ? `<button type="button" class="btn btn-soft btn-block" data-place="${mineId}">${icon('locate')}Où est ma salle ? · ${ui.esc(mine.label)}</button>` : ''}
          <div class="map-results" data-results>${resultsHTML()}</div>
        </div>
        <div class="map-shell">
          <div class="map-wrap" data-wrap>
            <div class="map-canvas" data-canvas style="width:${st.zoom * 100}%">${mapSVG()}<div data-markers>${markersHTML()}</div></div>
          </div>
          <div class="map-controls">
            <button class="icon-btn" data-zoom="1" aria-label="Zoomer">${icon('plus')}</button>
            <button class="icon-btn" data-zoom="-1" aria-label="Dézoomer">${icon('minus')}</button>
            <button class="icon-btn" data-zoom="0" aria-label="Recentrer">${icon('locate')}</button>
          </div>
          <div data-card>${cardHTML()}</div>
        </div>
      </div>`;
    },
    mount(el, { params = [] } = {}) {
      const $ = (s) => el.querySelector(s);
      const wrap = $('[data-wrap]'), canvas = $('[data-canvas]');

      if (params && params[0]) {
        const targetParam = params[0];
        const matched = places().find((p) => p.id === targetParam || norm(p.name).includes(norm(targetParam)) || (p.num && String(p.num) === targetParam));
        if (matched) st.selected = matched.id;
      }

      function update() {
        $('[data-markers]').innerHTML = markersHTML();
        $('[data-results]').innerHTML = resultsHTML();
        $('[data-card]').innerHTML = cardHTML();
      }
      function centerOn(p) {
        const m = markerOf(p);
        if (!m) return;
        wrap.scrollTo({
          left: (m.x / W) * canvas.offsetWidth - wrap.clientWidth / 2,
          top: (m.y / H) * canvas.offsetHeight - wrap.clientHeight / 2,
          behavior: 'smooth'
        });
      }
      function setZoom(z) {
        const cx = (wrap.scrollLeft + wrap.clientWidth / 2) / canvas.offsetWidth;
        const cy = (wrap.scrollTop + wrap.clientHeight / 2) / canvas.offsetHeight;
        st.zoom = z;
        canvas.style.transition = 'none';
        canvas.style.width = z * 100 + '%';
        wrap.scrollLeft = cx * canvas.offsetWidth - wrap.clientWidth / 2;
        wrap.scrollTop = cy * canvas.offsetHeight - wrap.clientHeight / 2;
      }

      $('[data-q]').addEventListener('input', (e) => {
        st.q = e.target.value;
        update();
      });
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-place], [data-filter], [data-zoom], [data-unselect]');
        if (!t) return;
        if (t.dataset.filter) {
          st.filter = t.dataset.filter;
          el.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b === t));
          update();
        } else if (t.dataset.place) {
          st.selected = t.dataset.place;
          update();
          centerOn(byId(st.selected));
          if (window.innerWidth < 1024 && t.classList.contains('list-item')) {
            el.querySelector('.map-shell').scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else if (t.dataset.zoom) {
          const d = +t.dataset.zoom;
          if (d === 0) {
            setZoom(window.innerWidth < 700 ? 1.8 : 1);
            st.selected = null;
            update();
          } else {
            setZoom(Math.min(3, Math.max(1, +(st.zoom + d * 0.5).toFixed(1))));
          }
        } else if (t.hasAttribute('data-unselect')) {
          st.selected = null;
          update();
        }
      });

      requestAnimationFrame(() => {
        if (st.selected) centerOn(byId(st.selected));
        else wrap.scrollTo((canvas.offsetWidth - wrap.clientWidth) / 2, (canvas.offsetHeight - wrap.clientHeight) / 2);
      });
    },
  };
})();
