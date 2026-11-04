/* Original decorative scenery for the private IA Plus shop. No business logic. */
(function (scope) {
  'use strict';
  function markup() {
    return `<svg class="world-map world-map-pro" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 720" role="img" aria-label="Tienda virtual de IA Plus. A la izquierda están recepción, sala de espera e inventario. En el centro, los exhibidores de cuentas digitales y sus pasillos. A la derecha, una oficina de soporte con tres escritorios y dos cajas. La entrada está abajo a la izquierda y la salida abajo a la derecha.">
    <defs>
      <linearGradient id="ws-wall" x2="0" y2="1"><stop stop-color="#587b6d"/><stop offset="1" stop-color="#3c6054"/></linearGradient>
      <linearGradient id="ws-floor" x2="0" y2="1"><stop stop-color="#f5f1e5"/><stop offset="1" stop-color="#e7e8d8"/></linearGradient>
      <linearGradient id="ws-counter" x2="0" y2="1"><stop stop-color="#f3dcb3"/><stop offset="1" stop-color="#e9c796"/></linearGradient>
      <linearGradient id="ws-glass" x2="0.8" y2="1"><stop stop-color="#def1e7" stop-opacity=".95"/><stop offset="1" stop-color="#a7cfc2" stop-opacity=".65"/></linearGradient>
      <radialGradient id="ws-light"><stop stop-color="#fff8cf" stop-opacity=".6"/><stop offset="1" stop-color="#fff8cf" stop-opacity="0"/></radialGradient>
      <pattern id="ws-tiles" width="62" height="62" patternUnits="userSpaceOnUse"><path d="M62 0H0V62" fill="none" stroke="#cbd3bc" stroke-width="1" opacity=".42"/><circle cx="1" cy="1" r="1" fill="#c2cbb3" opacity=".5"/></pattern>
      <pattern id="ws-wood" width="29" height="80" patternUnits="userSpaceOnUse"><rect width="29" height="80" fill="#dcc5a6"/><path d="M29 0H0V80M7 10V33M19 49V74" fill="none" stroke="#c6ad8a" stroke-width=".8"/><path d="M1 40h28" stroke="#ceb594" stroke-width=".8"/></pattern>
      <filter id="ws-shadow" x="-25%" y="-40%" width="150%" height="190%"><feDropShadow dx="0" dy="7" stdDeviation="4" flood-color="#214237" flood-opacity=".16"/></filter>
      <filter id="ws-soft" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#244739" flood-opacity=".12"/></filter>
      <g id="ws-plant"><ellipse cy="15" rx="17" ry="8" fill="#274b3820"/><path d="M-12 3h24l-4 20H-8z" fill="#e1c49a"/><ellipse cy="3" rx="12" ry="5" fill="#b79d76"/><path d="M0 7V-18M0-5l-12-12M0-1l13-12" fill="none" stroke="#567b4d" stroke-width="3"/><ellipse cx="-11" cy="-18" rx="11" ry="7" transform="rotate(35 -11 -18)" fill="#82a376"/><ellipse cx="12" cy="-14" rx="12" ry="7" transform="rotate(-35 12 -14)" fill="#6f9869"/><ellipse cx="1" cy="-29" rx="8" ry="13" fill="#95ae7e"/></g>
      <g id="ws-monitor"><rect x="-19" y="-15" width="38" height="27" rx="4" fill="#315a53"/><rect x="-15" y="-11" width="30" height="18" rx="2" fill="#a8d8c6"/><path d="M-11-6H2M-11-1H9M-11 3H-2" stroke="#649c89" stroke-width="1.4" stroke-linecap="round"/><path d="M0 12v5m-9 0H9" stroke="#315a53" stroke-width="3" stroke-linecap="round"/></g>
      <g id="ws-box"><path d="M-13-7l13-6 13 6v19L0 18l-13-6z" fill="#d5af76"/><path d="M-13-7L0-1l13-6M0-1v19" fill="none" stroke="#b68e54" stroke-width="1.2"/><path d="M-6-10L7-4v7" fill="none" stroke="#f6dfb5" stroke-width="4"/><path d="M5 9l5-2" stroke="#927445" stroke-width="1.2"/></g>
      <g id="ws-lamp"><ellipse cy="13" rx="15" ry="4" fill="#f8e5ab" opacity=".22"/><path d="M0-12v5" stroke="#c8b786" stroke-width="2"/><path d="M-12 6q2-15 12-15T12 6z" fill="#e0c28c"/><ellipse cy="6" rx="12" ry="4" fill="#fff0c4"/></g>
      <style>
        .ws-label{font-family:inherit;font-weight:750;font-size:11px;letter-spacing:1.2px;fill:#4b6857}
        .ws-small{font-family:inherit;font-weight:600;font-size:9px;letter-spacing:.5px;fill:#6c7d66}
        .ws-product{font-family:inherit;font-weight:750;font-size:11px;letter-spacing:-.15px;fill:#fffaf0}
        .ws-title{font-family:inherit;font-weight:800;letter-spacing:1.8px;fill:#f3e8c9}
      </style>
    </defs>

    <!-- Building envelope and layered floor. All character positions remain clear. -->
    <rect x="8" y="9" width="984" height="701" rx="30" fill="#2f5647" opacity=".12"/>
    <rect width="1000" height="710" rx="28" fill="#9ebaa6"/>
    <rect x="27" y="67" width="946" height="607" rx="9" fill="url(#ws-floor)"/>
    <rect x="27" y="89" width="946" height="579" fill="url(#ws-tiles)"/>
    <rect x="27" y="30" width="946" height="59" rx="7" fill="url(#ws-wall)"/>
    <path d="M31 89H969" stroke="#c6d9c2" stroke-width="7"/>
    <path d="M31 94v570h118m122 0h518m112 0h68V94" fill="none" stroke="#71917b" stroke-width="10"/>
    <path d="M39 94v562h109m123 0h518m112 0h60V94" fill="none" stroke="#dae4ce" stroke-width="3"/>
    <rect x="46" y="42" width="226" height="34" rx="10" fill="#294c40"/>
    <text x="63" y="64" class="ws-title" font-size="18">IA+ <tspan font-size="11" dx="7">TIENDA DE CUENTAS</tspan></text>
    <text x="600" y="57" class="ws-title" font-size="10" text-anchor="middle">UN EQUIPO. MUCHAS POSIBILIDADES.</text>
    <path d="M875 48h61M885 56h51M895 64h41" stroke="#91ad8d" stroke-width="2" stroke-linecap="round" opacity=".6"/>
    <circle cx="849" cy="56" r="12" fill="#e6d6a9"/><path d="M849 48v9l5 3" fill="none" stroke="#53785e" stroke-width="2" stroke-linecap="round"/>

    <!-- Soft ceiling light pools and floor zoning, without obscuring paths. -->
    <ellipse cx="175" cy="195" rx="145" ry="110" fill="url(#ws-light)"/>
    <ellipse cx="472" cy="320" rx="210" ry="230" fill="url(#ws-light)"/>
    <ellipse cx="830" cy="490" rx="160" ry="150" fill="url(#ws-light)"/>
    <rect x="50" y="101" width="231" height="192" rx="16" fill="#e7e4d1" stroke="#d5d6bd"/>
    <path d="M69 111H261" stroke="#f7f2dc" stroke-width="2" stroke-linecap="round"/>

    <!-- Reception: desk, welcome board and a clear space in front for Luna. -->
    <rect x="76" y="111" width="168" height="35" rx="9" fill="#436953"/>
    <text x="160" y="133" text-anchor="middle" font-family="inherit" font-size="14" font-weight="750" fill="#f6ecd1">¡BIENVENIDO!</text>
    <g filter="url(#ws-shadow)">
      <rect x="91" y="180" width="159" height="45" rx="11" fill="#aa8761"/>
      <rect x="86" y="166" width="169" height="48" rx="11" fill="url(#ws-counter)"/>
      <path d="M96 176h149" stroke="#fff0d4" stroke-width="2" stroke-linecap="round"/>
      <rect x="122" y="219" width="91" height="5" rx="2.5" fill="#c6a379"/>
      <use href="#ws-monitor" x="129" y="184"/>
      <rect x="187" y="183" width="29" height="17" rx="3" fill="#f9f5e4" transform="rotate(-6 201 191)"/>
      <path d="M193 188h15m-15 4h10" stroke="#a3ad88" stroke-width="1.2"/>
      <rect x="231" y="182" width="12" height="14" rx="3" fill="#7f9d86"/><path d="M234 182l-2-10m5 10 3-12" stroke="#456e5b" stroke-width="2"/>
    </g>
    <text x="100" y="245" class="ws-label">RECEPCIÓN</text>
    <use href="#ws-plant" x="63" y="271" transform="translate(0 0)"/>

    <!-- Waiting lounge and coffee corner. -->
    <rect x="50" y="324" width="228" height="133" rx="18" fill="#d9e6d5" stroke="#c6d6bf"/>
    <text x="67" y="344" class="ws-label">SALA DE ESPERA</text>
    <g filter="url(#ws-soft)">
      <rect x="64" y="362" width="50" height="76" rx="12" fill="#648b78"/>
      <rect x="70" y="366" width="37" height="30" rx="8" fill="#90ae94"/>
      <rect x="70" y="402" width="37" height="30" rx="8" fill="#90ae94"/>
      <path d="M65 372v55" stroke="#557965" stroke-width="5" stroke-linecap="round"/>
      <rect x="143" y="385" width="43" height="39" rx="11" fill="#b89a70"/>
      <rect x="140" y="378" width="49" height="39" rx="11" fill="#e8d2ab"/>
      <rect x="149" y="385" width="16" height="21" rx="2" fill="#f7eed9" transform="rotate(-9 157 395)"/>
      <path d="M151 389h10m-10 5h10m-10 5h7" stroke="#a8b49b" stroke-width="1"/>
      <circle cx="176" cy="397" r="5" fill="#f7f3dd"/><circle cx="176" cy="397" r="3" fill="#8d6c46"/>
      <rect x="223" y="359" width="42" height="70" rx="5" fill="#a78c66"/>
      <rect x="219" y="354" width="50" height="12" rx="4" fill="#f0d5ad"/>
      <rect x="228" y="362" width="26" height="29" rx="5" fill="#38594f"/>
      <rect x="233" y="366" width="15" height="6" rx="2" fill="#92b9a0"/>
      <path d="M237 378h7v8h-7z" fill="#f8f0d8"/><path d="M244 379q6 0 0 5" fill="none" stroke="#f8f0d8" stroke-width="1.5"/>
      <rect x="230" y="402" width="22" height="16" rx="3" fill="#bb9d74"/>
    </g>
    <text x="244" y="443" text-anchor="middle" class="ws-small">CAFÉ</text>

    <!-- Inventory shelving: illustrated stock only, no customer records or credentials. -->
    <rect x="50" y="478" width="228" height="137" rx="14" fill="#e7dfcb" stroke="#d5cbb1"/>
    <text x="65" y="498" class="ws-label">INVENTARIO</text>
    <text x="65" y="511" class="ws-small">Cuentas y productos digitales</text>
    <g filter="url(#ws-soft)">
      <rect x="66" y="525" width="194" height="67" rx="5" fill="#b49770"/>
      <rect x="71" y="522" width="184" height="31" rx="3" fill="#d9c59f"/>
      <rect x="71" y="558" width="184" height="29" rx="3" fill="#d9c59f"/>
      <path d="M76 522v67m84-67v67m89-67v67" stroke="#9c805a" stroke-width="5"/>
      <use href="#ws-box" x="100" y="533"/><use href="#ws-box" x="134" y="533"/><use href="#ws-box" x="190" y="533"/>
      <rect x="217" y="528" width="19" height="20" rx="3" fill="#739482"/><path d="M221 531v14m5-14v14" stroke="#b9ceb4" stroke-width="2"/>
      <rect x="86" y="566" width="25" height="15" rx="3" fill="#7c9c85"/><rect x="116" y="562" width="29" height="19" rx="3" fill="#a4b38b"/>
      <rect x="174" y="565" width="27" height="16" rx="3" fill="#b4a0c0"/><rect x="208" y="562" width="28" height="19" rx="3" fill="#d0aa73"/>
    </g>

    <!-- Central showroom: two low islands with wide circulation on all sides. -->
    <rect x="350" y="111" width="240" height="37" rx="11" fill="#436b57"/>
    <text x="470" y="135" text-anchor="middle" font-family="inherit" font-size="16" font-weight="750" fill="#f7efda">CUENTAS DIGITALES</text>
    <text x="469" y="160" text-anchor="middle" class="ws-small">Explora · pregunta · elige tu plan</text>
    <g filter="url(#ws-shadow)">
      <rect x="374" y="196" width="187" height="46" rx="10" fill="#a98b61"/>
      <rect x="366" y="180" width="203" height="51" rx="12" fill="url(#ws-counter)"/>
      <rect x="374" y="184" width="58" height="36" rx="7" fill="#4d967d"/>
      <path d="M382 190h40" stroke="#9cc5a5" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <text x="403" y="208" text-anchor="middle" class="ws-product">ChatGPT</text>
      <rect x="439" y="184" width="58" height="36" rx="7" fill="#9180b3"/>
      <text x="468" y="208" text-anchor="middle" class="ws-product">Gemini</text>
      <rect x="504" y="184" width="57" height="36" rx="7" fill="#c28e62"/>
      <text x="533" y="208" text-anchor="middle" class="ws-product">Claude</text>
      <path d="M390 233h155" stroke="#cbb08b" stroke-width="4" stroke-linecap="round"/>
    </g>
    <text x="468" y="264" text-anchor="middle" class="ws-small">ESTUDIO · TRABAJO · IDEAS</text>
    <g filter="url(#ws-shadow)">
      <rect x="374" y="410" width="187" height="43" rx="10" fill="#a98b61"/>
      <rect x="366" y="394" width="203" height="48" rx="12" fill="url(#ws-counter)"/>
      <rect x="374" y="398" width="58" height="34" rx="7" fill="#669ca7"/><text x="403" y="421" text-anchor="middle" class="ws-product">Canva</text>
      <rect x="439" y="398" width="58" height="34" rx="7" fill="#4d6668"/><text x="468" y="421" text-anchor="middle" class="ws-product">CapCut</text>
      <rect x="504" y="398" width="57" height="34" rx="7" fill="#92a46e"/><text x="533" y="421" text-anchor="middle" class="ws-product">Más</text>
      <path d="M390 444h155" stroke="#cbb08b" stroke-width="4" stroke-linecap="round"/>
    </g>
    <text x="468" y="476" text-anchor="middle" class="ws-small">DISEÑO · CONTENIDO · CREATIVIDAD</text>
    <rect x="389" y="562" width="164" height="41" rx="18" fill="#dfe6cf" stroke="#c8d3b7"/>
    <text x="471" y="579" text-anchor="middle" class="ws-label" font-size="10">TU PRÓXIMA IDEA</text>
    <text x="471" y="593" text-anchor="middle" class="ws-small">empieza aquí</text>
    <path d="M320 312h20m-8-6 8 6-8 6M604 312h20m-8-6 8 6-8 6" fill="none" stroke="#b7c6a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".65"/>

    <!-- Three-person support office. Worker anchors at (740,235), (825,235), (910,235). -->
    <rect x="690" y="95" width="272" height="214" rx="5" fill="url(#ws-wood)"/>
    <path d="M683 95v219h111m87 0h83" fill="none" stroke="#769181" stroke-width="9"/>
    <path d="M691 101v205h103m87 0h74" fill="none" stroke="#f4e3c7" stroke-width="3"/>
    <text x="707" y="119" class="ws-label">OFICINA DE SOPORTE</text>
    <text x="707" y="132" class="ws-small">Escuchar · resolver · acompañar</text>
    <g filter="url(#ws-soft)">
      <rect x="709" y="166" width="65" height="38" rx="6" fill="#ae8d65"/><rect x="705" y="156" width="73" height="39" rx="7" fill="#f0d6ad"/><use href="#ws-monitor" x="741" y="168"/>
      <rect x="792" y="166" width="65" height="38" rx="6" fill="#ae8d65"/><rect x="788" y="156" width="73" height="39" rx="7" fill="#f0d6ad"/><use href="#ws-monitor" x="824" y="168"/>
      <rect x="877" y="166" width="65" height="38" rx="6" fill="#ae8d65"/><rect x="873" y="156" width="73" height="39" rx="7" fill="#f0d6ad"/><use href="#ws-monitor" x="909" y="168"/>
      <rect x="719" y="190" width="42" height="8" rx="3" fill="#dfc39a"/><rect x="803" y="190" width="42" height="8" rx="3" fill="#dfc39a"/><rect x="888" y="190" width="42" height="8" rx="3" fill="#dfc39a"/>
    </g>
    <rect x="716" y="276" width="63" height="17" rx="5" fill="#c4ac8b"/><path d="M725 280h45m-45 7h45" stroke="#e7d4b8" stroke-width="2"/>
    <rect x="884" y="273" width="55" height="21" rx="6" fill="#b7c2a1"/><path d="M895 280h33m-33 7h23" stroke="#e1e5cc" stroke-width="2"/>
    <path d="M794 311h87" stroke="#c1d2bd" stroke-width="4"/>
    <path d="M797 314v-20q39 0 39 20" fill="none" stroke="#8ca38b" stroke-width="1" opacity=".7"/>

    <!-- Two checkout islands with visible terminals and counters. -->
    <rect x="704" y="367" width="250" height="145" rx="18" fill="#dce7d5" stroke="#c5d5bc"/>
    <text x="719" y="389" class="ws-label">CAJA 01</text>
    <text x="851" y="389" class="ws-label">CAJA 02</text>
    <g filter="url(#ws-shadow)">
      <rect x="719" y="433" width="99" height="57" rx="9" fill="#9d815e"/><rect x="713" y="415" width="111" height="58" rx="11" fill="url(#ws-counter)"/>
      <rect x="850" y="433" width="99" height="57" rx="9" fill="#9d815e"/><rect x="844" y="415" width="111" height="58" rx="11" fill="url(#ws-counter)"/>
      <path d="M731 483h72m60 0h71" stroke="#d4b58a" stroke-width="4" stroke-linecap="round"/>
      <use href="#ws-monitor" x="760" y="431"/><use href="#ws-monitor" x="891" y="431"/>
      <rect x="790" y="439" width="18" height="24" rx="4" fill="#557467"/><rect x="793" y="442" width="12" height="8" rx="2" fill="#b1d0b1"/><path d="M794 455h10m-10 4h7" stroke="#a5c09f" stroke-width="1.5"/>
      <rect x="921" y="439" width="18" height="24" rx="4" fill="#557467"/><rect x="924" y="442" width="12" height="8" rx="2" fill="#b1d0b1"/><path d="M925 455h10m-10 4h7" stroke="#a5c09f" stroke-width="1.5"/>
      <rect x="727" y="452" width="19" height="11" rx="2" fill="#fff6e0"/><rect x="858" y="452" width="19" height="11" rx="2" fill="#fff6e0"/>
    </g>
    <text x="832" y="499" text-anchor="middle" class="ws-small">COMPRAS REGISTRADAS · NUEVOS COMIENZOS</text>
    <path d="M775 590v20m-6-8 6 8 6-8M900 590v20m-6-8 6 8 6-8" fill="none" stroke="#aebfa2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Fixed accents, kept away from all worker anchors and circulation routes. -->
    <use href="#ws-plant" x="309" y="123"/><use href="#ws-plant" x="632" y="125"/>
    <use href="#ws-plant" x="641" y="430"/><use href="#ws-plant" x="950" y="340"/>
    <use href="#ws-plant" x="59" y="632"/><use href="#ws-plant" x="949" y="630"/>
    <use href="#ws-lamp" x="310" y="54"/><use href="#ws-lamp" x="674" y="54"/>
    <rect x="299" y="483" width="27" height="94" rx="8" fill="#e5d9bb" stroke="#c6b78e"/>
    <rect x="305" y="491" width="15" height="29" rx="4" fill="#779d82"/><rect x="305" y="525" width="15" height="19" rx="3" fill="#bbad80"/><rect x="305" y="549" width="15" height="20" rx="3" fill="#a796b4"/>

    <!-- Doorways remain open for entrance, departures and the security team. -->
    <rect x="150" y="660" width="120" height="16" rx="3" fill="#f4dfb7"/>
    <path d="M154 669h112" stroke="#d0b986" stroke-width="2"/>
    <rect x="790" y="660" width="110" height="16" rx="3" fill="#f4dfb7"/>
    <path d="M794 669h102" stroke="#d0b986" stroke-width="2"/>
    <text x="210" y="696" class="ws-label" text-anchor="middle">ENTRADA ↑</text>
    <text x="845" y="696" class="ws-label" text-anchor="middle">SALIDA ↓</text>
    <text x="498" y="696" text-anchor="middle" class="ws-small">IA PLUS · TU TIENDA VIRTUAL</text>
    </svg>`;
  }
  if (typeof module === 'object' && module.exports) module.exports = { markup };
  else scope.IAPWorldScene = Object.freeze({ markup });
})(globalThis);
