# Instrukcje dla agentów

## Zacznij tutaj

Polska prezentacja „RxJS — Operatory, które znasz, ale bałeś się zagadać”, oparta na Reveal.js. Najpierw przeczytaj ten dokument i README.md (treści, kolejność, speaker notes). Czytaj kod potrzebny do konkretnej zmiany. Zachowuj język polski, identyfikatory slajdów i semantykę RxJS 7.8.2. Po zmianie treści aktualizuj README; po zmianie animacji, architektury lub sterowania także ten plik.

Całość: 49 bazowych slajdów HTML, 66 po rozwinięciu wariantów, 54 animowane. MAIN: 40 slajdów (28 animowanych). EXTRAS: 26 slajdów z 17 bazowych sekcji. Notatki są wspólne dla wariantów sekcji. Scena katalogowa 01-tytul nie jest podpięta do HTML.

18-async zachowuje historyczne ID, ale pokazuje dwie zwykłe subskrypcje niezależnie od frameworka (diagram: subscriptions). Dopiero końcowy podpis wariantu z share wspomina Angular async pipe i React useEffect ze sprzątaniem. 19-share jest w EXTRAS; MAIN przechodzi od porównania dwóch subskrypcji do share/shareReplay.

## Stos i uruchomienie

JavaScript, HTML i CSS, bez frameworka. Reveal.js ^6.0.2, Vite ^8.3.3, qrcode ^1.5.4. RxJS i Angular są tematami przykładów, nie zależnościami wykonawczymi: nie wykonujemy prawdziwych requestów ani potoków. QR są gotowymi SVG w public/. package.json ma type: commonjs; kod przeglądarki używa ESM przez Vite, konfiguracja .mjs, testy .cjs.

Uruchomienie: npm ci, npm run dev. Weryfikacja: npm test, npm run build. Podgląd buildu: npm run preview. Adres/port odczytaj z komunikatu serwera; base to /rxjs-operatory/. Testy używają node --experimental-vm-modules --test tests/animations.test.cjs.

## Mapa plików

| Plik | Odpowiedzialność |
| --- | --- |
| index.html | Bazowe sekcje, zdjęcia, legenda, kolejność MAIN/EXTRAS, speaker notes HTML. |
| main.js | Reveal, fragmenty/postoje, aktywacja, pauza, klawiatura, druk, wybór ścieżki. |
| animations/catalog.js | Wiersze zdarzeń, przedziały, podpisy, warianty i liczniki. |
| animations/presentation.js | prepareSlides(scenes): klonowanie wariantów, tytuły, ID, końcowe konfiguracje. |
| animations/reference-scenes.js | Dane map/share oraz wspólny model i graf flatteningu. |
| animations/catch-scenes.js | Model i graf dwóch zakresów catchError, błąd A, fallback i klik B. |
| animations/scene-config.js | Playback i checkpointy po wybraniu wariantu. |
| animations/graph-presets.js | Adapter katalogu do grafu; bez SVG, zegara i DOM. |
| animations/engine.js | compileScene(scene): graf → plan zdarzeń → deterministyczny snapshot. |
| animations/renderer.js | Jeden renderer SVG: węzły, połączenia, tokeny, praca, historia, kolejka, panel, karty. |
| animations/primitives.js | Tekst, zawijanie, tokeny, geometria i pomocnicze kolory. |
| animations/flow.js | planFlow: ilustracja subskrypcji/emisji/zakończeń bez zmiany czasu modelu. |
| animations/lifecycle.js | layoutDiagram, paleta, terminal, fazy połączeń. |
| animations/player.js | Jedyny RAF, DOM odtwarzacza, transport, suwak, podpis i liczniki. |
| animations/resolver.js | Czyste modele microtask, bufora, cache, in-flight, wyników i błędów. |
| animations/resolver-scenes.js | Trzy sceny finału korzystające z tego samego silnika. |
| animations/reveal.css | Slajdy techniczne, sterowanie, legenda, czytelność, druk. |
| custom.css, public/ | Ogólna estetyka i zasoby statyczne. |
| tests/animations.test.cjs | Semantyka, geometria, klatki, RAF, warianty i resolver. |
| work/ | Materiały pomocnicze i podgląd QA, nie źródło treści. |

Audyt/migracja: zachowano Reveal, rows, lifecycle i planowanie dwóch osi czasu. Wydzielono prymitywy, renderer, kompilator i konfiguracje grafów. Usunięto osobny operator.js oraz wybór renderera według ID w playerze. Szczegółowe starsze grafy są adapterami danych. Nie dodawaj rendererów per slajd, osobnych RAF, GSAP, canvas ani Reveal Auto-Animate.

## Kontrakt sceny

Scena ma id, title, tekst code, duration (czas modelu), rows, captions, metrics oraz opcjonalnie graph i playback. Wiersz: {label, events, spans, completeAt?}. Zdarzenie: {at,value,color,kind}. Przedział: {start,end,label,color,kind,duration?}; rodzaje work, queue, cancel, subscription, state, window, error. Brak completeAt nie oznacza końca przy ostatniej wartości. duration przedziału zachowuje potencjalny czas pracy po anulowaniu, żeby pasek nie dochodził do 100%.

Katalog ma późniejsze revise(...) i variants nadpisujące wcześniejsze definicje. configureReferences() działa przed checkpointami katalogu. configureScene() działa po wybraniu wariantu w prepareSlides(): tam ustawiaj konfigurację zależną od wariantu.

graph jest obiektem albo czystą funkcją sceny. Ma nodes, edges, trays oraz opcjonalne layout/width/height, panels, queue, timeline, schedule, transforms, activities, tokens.

- Węzły: stabilne id, label, ri (wiersz), work/inner/timer, ready, born lub createdBy:{edge,value}. Cały graf rezerwuje układ przed odtwarzaniem. ready:true pokazuje niepołączonych uczestników, createdBy ujawnia inner dopiero po dotarciu wejścia do projekcji.
- Krawędzie: from, to, events, opcjonalnie logicalStart, logicalEnd:{at,kind}, gateWork, internal, points. internal zachowuje semantykę subskrypcji w planie, ale nie rysuje kabla ani tokenów wewnętrznej krawędzi. Subscribe idzie od odbiorcy ku źródłu; next/complete/error ku odbiorcy. Unsubscribe usuwa połączenia od odbiorcy ku źródłu. gateWork zaczyna inner po dotarciu wejścia i zakończeniu starej subskrypcji.
- layoutDiagram układa poziome kolumny pipeline/fan-out/fan-in. layout: fixed rezerwuje współrzędne. Niezależne przykłady nie dostają sztucznych zależności. W obu układach działa jeden renderer.
- panels i workRow to ogólne prymitywy panelu prac. Flattening pokazuje source → operator → odbiorca u góry, listę prac niżej, bez kresek subskrypcji do wierszy. Wpis kolejki jest szary od pierwszej klatki; żółty oznacza aktywną pracę. Wartość oczekująca w concatMap jest osobnym wierszem kolejki (bez inner i subskrypcji). concatAll pokazuje już utworzone Observable. Complete, praca, kolejka i anulowanie mają tekstowy stan, nie tylko kolor.
- trays:{anchor,x,y,w} przypina historię. Next zachowuje duplikaty; deduplicate:true jest jawną wizualizacją Set. Historia odbiorcy zmienia się dopiero po dotarciu tokena.
- timeline dodaje jawne zdarzenia/podpisy. schedule pozwala określić tempo ilustracji map/microtask w formacie rekordów zgodnym z planFlow, bez drugiego zegara.
- tokens domyślnie używa czasu ilustracji; modelTime:true przelicza at/until przez plan.timeOf. Pozwala pokazać emisję przy źródle już po odłączeniu subskrypcji.

compileScene(scene) zwraca {duration,stops,checkpoints,events,plan,snapshot(time)}. Snapshot jest czysty i deterministyczny; cofanie nie wymaga wcześniejszych klatek. Zawiera geometrię, stany połączeń/pracy, tokeny, historie, kolejkę, podpis i liczniki. renderScene(snapshot) nie zna ID slajdów ani operatorów RxJS.

Zdarzenia mają stabilne ID, czas odtwarzania at i opcjonalny logicalAt. Typy m.in. node-create, subscribe, connected, source-next, value-travel, deliver-next, operator-transform, inner-create/subscribe/next/unsubscribe, stream-complete/error, disconnected, work-start/stop, queue-add/pop, ignore-next, buffer-open/close, flush, cache-hit/miss, in-flight-hit, microtask-schedule/flush, store-update. Dodawaj semantykę do modelu, nie do SVG.

## Dwa czasy i wygląd

planFlow(nodes,links,modelDuration) zwraca records, births, batches, duration, logicalTime(t), timeOf(t), receivedAt(id,event). Wstawia czas na pojawienie (0,3 s), połączenie/przelot (0,8 s) i handoff (0,15 s). Czas modelu stoi podczas ilustracji. Jednoczesne wartości lecą kolejno po tej samej krawędzi. Końcowy next dociera przed complete. Nie zmieniaj przez to kolejności RxJS ani czasu producenta.

Map zachowuje wejścia 1/2/3, wyniki 10/20/30 wewnątrz odbiorcy i next(4) po unsubscribe tylko przy źródle. Ręcznie: połączenie 4 s, dotarcie 6 s, transformacja 6,25 s, odbiór 7,5 s. Kolejny klik uruchamia resztę w AUTO. Pauza transformacji jest dydaktyczna; callback map pozostaje synchroniczny.

15-debounce-audit porównuje debounceTime, auditTime, throttleTime i sampleTime na wspólnym wejściu i okresie 3,5 s. Adapter grafu dla czterech gałęzi rezerwuje layout: fixed, z historią wewnątrz odbiorców i statusem pod operatorem. Postój w 5 s: throttle A, sample C, audit D, debounce bez emisji. Throttle ma domyślne leading:true/trailing:false; sample pomija takty bez nowych wejść. Osobne warianty 16-czas-cztery pozostają w EXTRAS.

Paleta: źródło #8cd0da, odbiorca #b0a0e6, praca #ffc15c, operator #e7b5f1, complete #087438, error #b51e2e, połączenie #111. Stan jest opisany tekstem. Anulowana praca zachowuje zatrzymany pasek i podpis ABORT (klient); nie otrzymuje complete. Terminalny kolor odbiorcy nie przemalowuje automatycznie producenta; wiersz pracy pokazuje własne zakończenie.

b04-catcherror ma dwa grafy layout:fixed z osobnymi bloczkami switchMap i catchError. Na zewnątrz HTTP A przekazuje error przez switchMap, catchError emituje [] z of([]), a wynik complete i odłączenie klik$ blokują HTTP B. Wewnątrz ramki każda praca ma własny catchError i lokalny wynik; complete inner nie kończy odbiorcy. Powrót wyników inner do switchMap jest internal. Postoje: aktywne A, obsługa błędu, pytanie po []. Renderer oznacza workState:errored czerwonym obramowaniem i tekstem, bez warunków zależnych od operatora.

Slajdy techniczne 1280×720: kod, diagram i istniejąca rx-summary mieszczą się powyżej dolnych 20%. Opcjonalne sterowanie zajmuje dolną strefę. Nie dodawaj drugiego paska podpisów. Linie mają 6 px, tekst jest duży, wartości są kapsułkami; starszą historię skracamy wielokropkiem.

## Playback i Reveal

playback deklaruje entry: manual/auto/static, finish: hold/loop, afterLastManualStop: start-auto i stops. Postój ma id, caption oraz selektor czasu: event:{type,edge,node,value} (tylko potrzebne pola), modelTime albo jawny time ilustracji. Opcjonalne last wybiera ostatnie zdarzenie, offset przesuwa postój, phase: before wybiera początek grupy modelTime zamiast końca. Nierozwiązany postój jest błędem. Czasy muszą rosnąć i mieścić się w scenie.

Przykład postoju: {id:'question', event:{type:'deliver-next',edge:'source-op',value:'B'}, caption:'B dotarło podczas pracy A. Co zrobi operator?'}.

MAIN zwykle zaczyna od READY i kilku ręcznych postojów. Dodatkowe „dalej” po ostatnim pytaniu uruchamia AUTO na tym samym slajdzie. AUTO dochodzi do FINISHED i trzyma wynik. Dalsze strzałki nawigują po slajdach. EXTRAS domyślnie działają w pętli, z wyjątkiem jawnych konfiguracji rodzin. finish() zawsze daje nieruchomy kadr.

main.js tworzy niewidoczne rx-step.fragment oraz osobny fragment handoff. fragmentshown wywołuje playTo, fragmenthidden wywołuje seek. Nie zastępuj nawigacji Reveal globalnym handlerem strzałek. Capture na kontrolkach jedynie oddaje strzałki/Page Up/Down pilotowi i usuwa fokus suwaka. Tryb, fragment i pauza są pamiętane na slajdzie.

| Klawisz | Zachowanie |
| --- | --- |
| Prawo/lewo, Page Down/Page Up | Natywne fragmenty/slajdy; w MANUAL postoje sceny. |
| A | MANUAL → AUTO; w AUTO odtwarzanie/pauza. |
| M | Ręczny/auto na scenie z postojami; powrót wybiera ostatni osiągnięty postój. |
| [ / ] | Poprzedni/następny krok; sceny z postojami używają Reveal. |
| R | Ręczny: fragment -1 i seek(0). Auto: restart. |
| U | Pokaż/ukryj dolne sterowanie. |
| S, Esc | Widok prelegenta i overview Reveal. |

createPlayer(root,scene,controls={}): play, pause, toggle, playTo, playContinuously, seek, step, reset/restart, finish, hideControls, toggleControls; gettery time, duration, isPlaying, state, snapshot, stops. Stany: ready/playing/paused/finished. Hooki step/reset/toggle, onStop/onFinish. Tylko player prowadzi RAF (przyrost maks. 0,25 s, odmalowanie co ≥33 ms, pętla po 2 s). Pauza anuluje RAF; odłączony DOM zatrzymuje gracza.

main.js pauzuje przy zmianie slajdu, overview, Reveal pause i document.hidden. Wznawia tylko wcześniej odtwarzaną scenę; ręczna pauza i FINISHED pozostają zatrzymane. Kod przykładów jest tekstem (textContent), nie wykonywanym JavaScriptem.

Konfiguracja Reveal: Markdown/Highlight/Notes, hash, numer slajdu, 1280×720, margin 0.05, minScale 0.2, maxScale 2, view slide, navigationMode linear. prepareSlides działa przed inicjalizacją i zwraca Map. Warianty klonują całą sekcję z notes; pierwszy zachowuje ID, kolejne mają -2/-3/-4. rendererId jest kluczem rodziny danych. Odtwarzacze powstają leniwie i są ponownie używane.

Używane API Reveal: getCurrentSlide, next/prev, navigateFragment(-1 oznacza początek), sync, addKeyBinding, isOverview/isPaused, initialize. Zdarzenia: slidechanged, fragmentshown/hidden, overviewshown/hidden, paused/resumed. Zdjęcia zachowują natywne fragment/fade-out/current-visible, data-fragment-index i r-stack. Notatki czyta plugin Notes z aside.notes w HTML, nie pole notes katalogu.

## MAIN, EXTRAS, druk i legenda

Sekcje data-extras są usuwane przed wariantami przy zwykłym wejściu. Pilot kończy MAIN na pytania. Menu otwiera ?extras#/id; powrót ./#/pytania. Stare bezpośrednie hashe ID dodatków też włączają EXTRAS. ?print-pdf zawiera całość, bez ręcznych fragmentów/kontrolek; każdy odtwarzacz dostaje finish().

Legenda pozostaje HTML/SVG/CSS: pętle 6 s tylko na present, pauza w overview/Reveal pause, wyłączenie w druku i prefers-reduced-motion. Ograniczenie ruchu dotyczy legendy; JS korzysta z wyboru trybu i pauzy.

## Wprowadzanie zmian i weryfikacja

Nowa scena: model oraz bazowa sekcja animation-slide[data-animation] z rx-player, h2 i notes. Zdefiniuj graph/preset, playback i podpisy. Nie dodawaj kopii generowanych wariantów do HTML. Sprawdź READY, pytanie, FINISHED oraz cofanie. Uwzględniaj późniejsze revise/variants.

Zachowuj rozróżnienia: unsubscribe ≠ callback complete; hot ≠ replay; share ≠ trwały cache; pasek map nie czyni go asynchronicznym; abort klienta nie cofa serwera. concatAll kolejkuje Observable, concatMap wartości przed projekcją, exhaustMap nie tworzy pominiętych inner. Microtask resolvera zbiera synchroniczne ID; globalny bufferTime ma osobne okna od subskrypcji i limit wielkości. Puste resolveMany zwraca pustą Map jako kontrakt aplikacji, nie zachowanie forkJoin([]).

Po zmianach uruchom npm test i npm run build. Testy obejmują wszystkie warianty, deterministyczne klatki, kierunki/terminale, historię, anulowanie, kolejki, handoff, hold/pętle/RAF oraz resolver (czas, rozmiar, in-flight, błąd, puste wejście). W przeglądarce sprawdź pilot, powrót, overview, pauzę, EXTRAS i print-pdf.

Podgląd QA: /rxjs-operatory/work/animation-review.html (serwer developerski), z audytem granic tekstu SVG. Sprawdź 1280×720, 1920×1080 i pomniejszony widok. Fizyczny projektor i próba 45 minut wymagają prelegenta. Przy zmianach wyłącznie dokumentacyjnych sprawdź dane, linki i diff; nie pisz testów odtwarzających tekst dokumentacji.
