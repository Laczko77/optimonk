# Funnel Analytics Mini-App — Összefoglaló

## 1. A probléma megértése

A marketingesek látják, hogy egy többlépcsős popup-kampány **összességében** hány százalékon
konvertál, de azt nem, hogy a folyamat **melyik lépésénél** esnek ki az emberek. Az összesített
konverzió elrejti a tényleges szűk keresztmetszetet: egyetlen szám alapján nem derül ki, hol van a
valódi probléma. A feladat tehát az volt, hogy a lépésenkénti teljesítményt láthatóvá tegyük, és
egy nem műszaki felhasználó számára is azonnal kiderüljön, melyik lépés a gyenge pont.

## 2. A választott v1 hatókör és a tudatos kihagyások

**Amit megépítettünk:** kampánylista (minden kampány az összesített konverziójával) → egy kampányra
kattintva részletes tölcsér-nézet (lépésenkénti konverzió és lemorzsolódás, **arányban és
darabszámban is**) → a legnagyobb lemorzsolódás **kiemelt, közérthető megfogalmazása** (kezeli azt is,
ha a legnagyobb *arányú* és a legtöbb *embert vesztő* lépés nem ugyanaz) → opcionálisan 2–3
szabályalapú **javaslat**. A számítások tiszta, egységtesztelt függvényekben élnek (`funnel.js` a
tölcsér-matematikához, `insights.js` a javaslat-szabályokhoz). Technológia: Vue 3 + Vite + Tailwind
+ Vitest, egyetlen statikus JSON adathalmazon.

**Amit a ~4–6 órás időkeret miatt tudatosan kihagytunk:** nincs backend, adatbázis vagy
bejelentkezés (csak statikus JSON); nincs útválasztó (router) — a nézetváltást egyszerű kiválasztási
állapot kezeli az `App.vue`-ban; nincs külön diagram-könyvtár (a sávokat sima Tailwind oldja meg);
egyetlen, gondosan összeállított adathalmaz; nincs Playwright/e2e teszt (a billentyűzetes aktiválás
tesztje dokumentált hiányosság); a „legrosszabb lépést" az arány alapján jelöljük ki, az abszolút
számot külön mutatjuk; a javaslatok 3 egyszerű szabályra korlátozódnak.

## 3. A megoldás rövid leírása (architektúra + fő komponensek)

A lényeg egy **tiszta számítási réteg** a `src/lib/` mappában (`funnel.js`, `insights.js`,
`format.js`), amelyet a megjelenítő Vue-komponensek használnak — a komponensek soha nem számolnak
újra, csak megjelenítenek. Az adatokat a `useCampaigns` composable tölti be. A két képernyő közti
váltást (lista ↔ részletek) az `App.vue` intézi kiválasztási állapot alapján. A felület minden
elemét előre megírt **dizájn-specifikációk** vezérelték (`docs/ui/`). Fő komponensek:
`CampaignList` / `CampaignCard` (lista), `FunnelDetail` / `FunnelStep` (tölcsér + legrosszabb lépés
kiemelése), `Insights` (javaslatok).

## 4. Az AI-eszközök használata

A projekt **Claude Code**-dal készült, **több-ügynökös (multi-agent) felépítésben**: egy fő
*orchestrator* koordinálta a szakosodott alügynököket — *product-owner* (backlog, hatókör és
iteráció-választás), *ui-designer* (markdown dizájn-specifikációk), *senior-developer*
(implementáció) és *qa-tester* (Vitest egység- és komponenstesztek). A munka **iterációról
iterációra**, specifikáció- és tesztvezérelt módon haladt; az ügynökök közti döntéseket az
orchestrator oldotta fel. Az ügynökök **tartós memóriát** is használtak, így a korábbi iterációk
szerződései (függvény-szignatúrák, adatok, konvenciók) iterációk között is megmaradtak.

## 5. Mit fejlesztenénk a v2-ben

Valódi adatforrás / API a statikus JSON helyett; útválasztó és megosztható mély-linkek; gazdagabb,
interaktív diagramok; több és **hangolható** javaslat-szabály; e2e- és akadálymentességi
(képernyőolvasó / billentyűzet) tesztlefedettség; több kampány **összehasonlítása**; többnyelvűség
(i18n); valamint a kiválasztott állapot megőrzése (perzisztencia).
