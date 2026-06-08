# Funnel Analytics Mini-App — Összefoglaló

## 1. A probléma megértése

A marketingesek látják, hogy egy többlépcsős popup-kampány **összességében** hány százalékon
konvertál, de azt nem, hogy a folyamat **melyik lépésénél** esnek ki az emberek. Az összesített
konverzió elrejti a tényleges szűk keresztmetszetet: egyetlen szám alapján nem derül ki, hol van a
valódi probléma. A feladat tehát az volt, hogy a lépésenkénti teljesítményt láthatóvá tegyük, és
egy nem műszaki felhasználó számára is azonnal kiderüljön, melyik lépés a gyenge pont.

## 2. A választott v1 hatókör és a tudatos kihagyások

**Amit megépítettem:** kampánylista (minden kampány az összesített konverziójával) → egy kampányra
kattintva részletes tölcsér-nézet (lépésenkénti konverzió és lemorzsolódás, **arányban és
darabszámban is**) → a legnagyobb lemorzsolódás **kiemelt, közérthető megfogalmazása** (kezeli azt is,
ha a legnagyobb *arányú* és a legtöbb *embert vesztő* lépés nem ugyanaz) → opcionálisan 2–3
szabályalapú **javaslat**. A számítások tiszta, egységtesztelt függvényekben élnek (`funnel.js` a
tölcsér-matematikához, `insights.js` a javaslat-szabályokhoz).
Technológia: Vue 3 + Vite + Tailwind + Vitest; az adat a hivatalos feladatkiírás (`task.md`) három
kampányt tartalmazó mintája.

A statikus JSON-t egy **minimális Express backend** szolgálja ki (`GET /api/campaigns`), amelyet a
frontend futásidőben kér le a `useCampaigns()` composable-ön keresztül (a Vite a `/api` kéréseket
proxyzza); **adatbázis és bejelentkezés viszont nincs**.

**Amit a ~4–6 órás időkeret miatt tudatosan kihagytam:** nincs adatbázis vagy bejelentkezés; nincs
útválasztó (router) — a nézetváltást egyszerű kiválasztási állapot kezeli az `App.vue`-ban; nincs
külön diagram-könyvtár (a sávokat sima Tailwind oldja meg); egyetlen
adathalmaz; nincs Playwright/e2e teszt (a billentyűzetes aktiválás
tesztje dokumentált hiányosság); a „legrosszabb lépést" az arány alapján jelöljük ki, az abszolút
számot külön mutatjuk; a javaslatok 3 egyszerű szabályra korlátozódnak.

## 3. A megoldás rövid leírása (architektúra + fő komponensek)

A lényeg egy **tiszta számítási réteg** a `src/lib/` mappában (`funnel.js`, `insights.js`,
`format.js`), amelyet a megjelenítő Vue-komponensek használnak — a komponensek soha nem számolnak
újra, csak megjelenítenek. Az adatokat a `useCampaigns` composable tölti be. A két képernyő közti
váltást (lista ↔ részletek) az `App.vue` intézi kiválasztási állapot alapján. A felület
Fő komponensek: `CampaignList` / `CampaignCard` (lista), `FunnelDetail` / `FunnelStep` (tölcsér + legrosszabb lépés
kiemelése), `Insights` (javaslatok). Az **akadálymentességre** is figyeltünk: következetes
címsor-hierarchia (h1→h2→h3), billentyűzetes fókuszkezelés a lista ↔ részletek nézetváltáskor,
látható fókuszgyűrűk, és a legrosszabb lépést nem csak szín, hanem **szöveges címke** is jelzi — egy
kontrasztra ellenőrzött palettán.

## 4. Az AI-eszközök használata

A projekt **Claude Code**-dal készült, **több-ügynökös (multi-agent) felépítésben**: egy fő
*orchestrator* koordinálta a szakosodott alügynököket — *product-owner* (backlog, hatókör és
iteráció-választás), *ui-designer* (dizájn-specifikációk), *senior-developer*
(implementáció) és *qa-tester* (Vitest egység- és komponenstesztek). A munka **iterációról
iterációra**, specifikáció- és tesztvezérelt módon haladt; az ügynökök közti döntéseket az
orchestrator oldotta fel. A *ui-designer* a felület szerkezetét és elrendezését tervezte. Az ügynökök
**tartós memóriát** is használtak, így a korábbi iterációk
emlékei (függvény-szignatúrák, adatok, konvenciók) iterációk között is megmaradtak.

## 5. Mit fejlesztenék a v2-ben

Valódi adatforrás (adatbázis) a mostani, statikus JSON-t kiszolgáló végpont mögé; útválasztó és
megosztható mély-linkek; gazdagabb, interaktív diagramok; e2e- és akadálymentességi
(képernyőolvasó / billentyűzet) tesztlefedettség; több kampány **összehasonlítása**; a felület már
most teljesen magyar, így a v2-ben a **több nyelv közti váltás** (valódi i18n) jönne; valamint a
kiválasztott állapot megőrzése (perzisztencia).

Néhány konkrét pont, ami nagyobb / valós adatnál válik fontossá:

- **Nagy kampánylista kezelése** — keresés, szűrés és lapozás (vagy lista-virtualizálás), hogy sok
  száz kampánynál is gyors maradjon; a kampány-kikeresés indexelése (`Map`) a mostani lineáris
  keresés helyett.
- **Adat-épségi ellenőrzés** — a valós adatban előfordulhat hibás sor (pl. `proceeds > views`), ami
  most negatív lemorzsolódást adna; egy egyszerű korlátozás (clamp) és a gyanús sorok jelzése
  megvédené a számokat.
- **Hangolható, relatív javaslat-szabályok** — a mostani fix küszöbök (pl. 7% / 12% konverzió)
  helyett kampánytípushoz / eszközhöz igazított, illetve a portfólió átlagához viszonyított
  küszöbök, és új lépéstípusok (pl. `sms`, `quiz`) lefedése a javaslatokban.
