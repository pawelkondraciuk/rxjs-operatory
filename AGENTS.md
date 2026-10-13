# Instrukcje dla agentów

## Zacznij tutaj

Polska prezentacja „RxJS — Operatory, które znasz, ale bałeś się zagadać”, oparta na Reveal.js. Najpierw przeczytaj ten dokument i README.md (treści, kolejność, speaker notes). Czytaj kod potrzebny do konkretnej zmiany. Zachowuj język polski, identyfikatory slajdów i semantykę RxJS 7.8.2. Po zmianie treści aktualizuj README; po zmianie animacji, architektury lub sterowania także ten plik.

Całość: 50 bazowych slajdów HTML, 67 po rozwinięciu wariantów, 54 animowane. MAIN: 41 slajdów (28 animowanych). EXTRAS: 26 slajdów z 17 bazowych sekcji. Notatki są wspólne dla wariantów sekcji. Scena katalogowa 01-tytul nie jest podpięta do HTML.

18-async zachowuje historyczne ID, ale pokazuje dwie zwykłe subskrypcje niezależnie od frameworka (diagram: subscriptions). Dopiero końcowy podpis wariantu z share wspomina Angular async pipe i React useEffect ze sprzątaniem. 19-share jest w EXTRAS; MAIN przechodzi od porównania dwóch subskrypcji do share/shareReplay.

## Stos i uruchomienie

JavaScript, HTML i CSS, bez frameworka. Reveal.js ^6.0.2, Vite ^8.3.3, qrcode ^1.5.4. RxJS i Angular są tematami przykładów, nie zależnościami wykonawczymi: nie wykonujemy prawdziwych requestów ani potoków. QR są gotowymi SVG w public/. package.json ma type: commonjs; kod przeglądarki używa ESM przez Vite, konfiguracja .mjs, testy .cjs.

Uruchomienie: npm ci, npm run dev. Weryfikacja: npm test, npm run build. Podgląd buildu: npm run preview. Adres/port odczytaj z komunikatu serwera; base to /rxjs-operatory/. Testy używają node --experimental-vm-modules --test tests/*.test.cjs. Prototypy v2: /work/framework-prototypes.html (serwer developerski); 04-operator jako jedyna scena katalogu używa playback.controller: 'stages'; pozostałe MAIN/EXTRAS zachowują dotychczasowe fragmenty i sterowanie.

## Mapa plików

| Plik | Odpowiedzialność |
| --- | --- |
| index.html | Bazowe sekcje, zdjęcia, legenda, kolejność MAIN/EXTRAS, speaker notes HTML. |
| main.js | Reveal, fragmenty/postoje, aktywacja, pauza, klawiatura, druk, wybór ścieżki. |
| animations/format.js | Format sceny: 4:3 (1280×960) domyślnie, ?ratio=16:9 (1280×720); linki z zachowanym formatem i URL klawisza W. |
| animations/speaker-preview.js | Duży tytuł kolejnego slajdu w ramce Upcoming okna Notes; przełącznik Tytuł/Slajd. |
| animations/catalog.js | Wiersze zdarzeń, przedziały, podpisy, warianty i liczniki. |
| animations/presentation.js | prepareSlides(scenes): klonowanie wariantów, tytuły, ID, końcowe konfiguracje. |
| animations/reference-scenes.js | Dane map/share oraz wspólny model, zaakceptowany układ i graf flatteningu dla slajdów i prototypów. |
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
| animations/execution-state.js | Stan wykonań inner (running/completed/cancelled/error, HTTP osobno), liczniki z tego samego stanu. |
| animations/stage-controller.js | Kontroler etapów (playback.controller: 'stages'): →/←, Spacja, M, R, F; wspólny dla QA i Reveal. |
| animations/reveal-stages.js | Podpięcie kontrolera etapów do klawiatury i fragmentów Reveal. |
| animations/reveal-auto-finish.js | Fragment końcowego wyniku: pierwsze „dalej” w AUTO kończy animację, kolejne zmienia slajd. |
| animations/prototype-scenes.js | Prototypy v2 (concatMap, switchMap, mergeMap, exhaustMap, catchError wewnątrz/na zewnątrz, przypadki kontrolne); tylko podgląd QA. |
| tests/animations.test.cjs | Semantyka, geometria, klatki, RAF, warianty i resolver. |
| tests/format*.test.cjs | Format URL/W oraz układ wszystkich wariantów w 4:3 i 16:9. |
| tests/*-v2.test.cjs | Model, widok, sterowanie i prototypy v2 (wspólny v2-harness.cjs). |
| work/ | Materiały pomocnicze i podgląd QA, nie źródło treści. |

Audyt/migracja: zachowano Reveal, rows, lifecycle i planowanie dwóch osi czasu. Wydzielono prymitywy, renderer, kompilator i konfiguracje grafów. Usunięto osobny operator.js oraz wybór renderera według ID w playerze. Szczegółowe starsze grafy są adapterami danych. Nie dodawaj rendererów per slajd, osobnych RAF, GSAP, canvas ani Reveal Auto-Animate.

## Kontrakt sceny

Scena ma id, title, tekst code, opcjonalne codeFrames:[{at,code}] (czas ilustracji; snapshot wybiera ostatni osiągnięty wpis, a wcześniej scene.code), duration (czas modelu), rows, captions, metrics oraz opcjonalnie graph i playback. Wiersz: {label, events, spans, completeAt?}. Zdarzenie: {at,value,color,kind}. Przedział: {start,end,label,color,kind,duration?}; rodzaje work, queue, cancel, subscription, state, window, error. Brak completeAt nie oznacza końca przy ostatniej wartości. duration przedziału zachowuje potencjalny czas pracy po anulowaniu, żeby pasek nie dochodził do 100%. graph.illustratedWork:true (prototypy v2 i migrowana rodzina flatteningu) liczy pasek w czasie ilustracji od subskrypcji do complete/unsubscribe/błędu HTTP, więc nie staje podczas przelotu wartości; wiersz dostaje complete razem z pełnym paskiem. Bez flagi zachowanie jest dotychczasowe.

Katalog ma późniejsze revise(...) i variants nadpisujące wcześniejsze definicje. configureReferences() działa przed checkpointami katalogu. configureScene() działa po wybraniu wariantu w prepareSlides(): tam ustawiaj konfigurację zależną od wariantu.

graph jest obiektem albo czystą funkcją sceny. Ma nodes, edges, trays oraz opcjonalne layout/width/height, panels, queue, timeline, schedule, transforms, activities, tokens.

- Węzły: stabilne id, label, ri (wiersz), work/inner/timer, ready, born lub createdBy:{edge,value}. Cały graf rezerwuje układ przed odtwarzaniem. ready:true pokazuje niepołączonych uczestników, createdBy ujawnia inner dopiero po dotarciu wejścia do projekcji.
- Krawędzie: from, to, events, opcjonalnie logicalStart, logicalEnd:{at,kind}, gateWork, internal, points. internal zachowuje semantykę subskrypcji w planie, ale nie rysuje kabla ani tokenów wewnętrznej krawędzi. Subscribe idzie od odbiorcy ku źródłu; next/complete/error ku odbiorcy. Unsubscribe usuwa połączenia od odbiorcy ku źródłu. gateWork zaczyna inner po dotarciu wejścia i zakończeniu starej subskrypcji.
- layoutDiagram układa poziome kolumny pipeline/fan-out/fan-in. layout: fixed rezerwuje współrzędne. Niezależne przykłady nie dostają sztucznych zależności. W obu układach działa jeden renderer.
- panels i workRow to ogólne prymitywy panelu prac. Flattening pokazuje source → operator → odbiorca u góry, listę prac niżej, bez kresek subskrypcji do wierszy. Wpis kolejki jest szary od pierwszej klatki; żółty oznacza aktywną pracę. Wartość oczekująca w concatMap jest osobnym wierszem kolejki (bez inner i subskrypcji). Prototypy v2 oraz slajdy 08–12, warianty 12a-complete i 13-limit mają panel ze slotami (panel.slots/rowsTop/rowStep): każda wartość ma stałe miejsce, „B (wartość)” wchodzi fade-in przy dotarciu i przechodzi w B$; trzy kolumny bez napisów w panelach (o HTTP mówi podpis na dole): emisje pod źródłem, prace wewnętrzne pod wyśrodkowanym operatorem, odbiór pod odbiorcą (statusInside; historia po kolei w siatce tray.columns/lines/lineStep: emisje w 1 kolumnie, odbiór w 2 kolumnach w kolejności dotarcia, szeroka kapsułka zajmuje całą linię; kapsułki wchodzą fade-in 0,3 s od shownAt (emisja albo dotarcie); wiersze prac w stałej siatce 4 slotów od góry; mergeMap ma przeplot C/D: A1 A2 B1 B2 C1 D1 D2 C2); wynik inner wraca do operatora krótko i niewidocznie (edge.travel), więc kulka wychodzi z operatora. concatAll pokazuje już utworzone Observable. Complete, praca, kolejka i anulowanie mają tekstowy stan, nie tylko kolor.
- trays:{anchor,x,y,w} przypina historię. Opcjonalne events podaje jawne emisje także bez subskrypcji; modelTime:true przelicza ich at przez plan.receivedAt(anchor,event) (emisja źródła lub dotarcie do odbiorcy), z plan.timeOf jako fallback. Jawne events nie są scalane z automatyczną historią krawędzi. Next zachowuje duplikaty; deduplicate:true jest jawną wizualizacją Set. Historia odbiorcy zmienia się dopiero po dotarciu tokena.
- timeline dodaje jawne zdarzenia/podpisy. schedule pozwala określić tempo ilustracji map/microtask w formacie rekordów zgodnym z planFlow, bez drugiego zegara.
- tokens domyślnie używa czasu ilustracji; modelTime:true przelicza at/until przez plan.timeOf. Pozwala pokazać emisję przy źródle już po odłączeniu subskrypcji.

compileScene(scene) zwraca {duration,stops,checkpoints,events,plan,snapshot(time)}. Snapshot jest czysty i deterministyczny; cofanie nie wymaga wcześniejszych klatek. Zawiera geometrię, stany połączeń/pracy, tokeny, historie, kolejkę, podpis i liczniki. renderScene(snapshot) nie zna ID slajdów ani operatorów RxJS.

Zdarzenia mają stabilne ID, czas odtwarzania at i opcjonalny logicalAt. Typy m.in. node-create, subscribe, connected, source-next, value-travel, deliver-next, operator-transform, inner-create/subscribe/next/unsubscribe, stream-complete/error, disconnected, work-start/stop, queue-add/pop, ignore-next, buffer-open/close, flush, cache-hit/miss, in-flight-hit, microtask-schedule/flush, store-update. Dodawaj semantykę do modelu, nie do SVG.

## Dwa czasy i wygląd

planFlow(nodes,links,modelDuration) zwraca records, births, batches, duration, logicalTime(t), timeOf(t), receivedAt(id,event). Wstawia czas na pojawienie (0,3 s), połączenie/przelot (0,8 s) i handoff (0,15 s). Czas modelu stoi podczas ilustracji. Jednoczesne wartości lecą kolejno po tej samej krawędzi. Końcowy next dociera przed complete. Nie zmieniaj przez to kolejności RxJS ani czasu producenta.

04-operator ma na górze wyłącznie pseudokod of(1,2,3).pipe(map(x => x * 2)) przez cały slajd, bez .subscribe(observer) i bez codeFrames. Bez typu OperatorFunction i adnotacji na ekranie. configureOperator ustawia lokalny storyboard i scene.timing: subscribe:3.2, travel:1.2, transform:1.4, receivedHold:.5, gap:.7, terminal:1.2, pipeline:.2 i handoff:.05. Subscribe i complete dzielą czas między dwie krawędzie. graph.schedule i logicalAt:0 zachowują synchroniczne emisje 1/2/3 → 2/4/6; opóźnienia dotyczą wyłącznie ilustracji. Trzy postoje: pipeline, subscribed i first (odbiorca ma 2). Następny klik uruchamia AUTO do complete. Geometria bierze wymiary z frame rodziny flatteningu: źródło/odbiorca 200×76, map 240×76 (4:3 ma własny frame.operator: kafelki 260/380/320×170 i box odbioru 320×150 pod odbiorcą (odstęp 60) jako jedna grupa wyśrodkowana w pionie i poziomie ramki 612, graph.textScale 1,8 i labelScale 2,2, które silnik przenosi do snapshotu zamiast domyślnych skal formatu), map na środku, tekst wycentrowany. Box odbioru ma te same wymiary co kafelek (200×76 px), jest wyrównany do jego krawędzi i pokazuje wyśrodkowany pojedynczy rząd 2/4/6. trays.lines:1 korzysta z tego samego algorytmu układania historii co wiele rzędów; zajęte kapsułki są centrowane w boxie. Źródło i map mają statusInside:true oraz terminalEdge własnego wyjścia: complete pojawia się kolejno na źródle, map i odbiorcy, a końcowe napisy mają tę samą wysokość; źródło nie ma panelu/historii/paska pracy. Wynik transformacji jest pod map wyłącznie od dotarcia wejścia do rozpoczęcia przelotu wyniku; znika przy wyjściu kulki. Box odbioru ma panels[].shownAt ustawione na pierwsze deliver-next: snapshot ustawia visible, a renderer ukrywa zarówno box, jak i łącznik przed tą chwilą, także po cofnięciu. Układ jest stale zarezerwowany. Brak shownAt zachowuje dotychczasową widoczność pozostałych paneli. panels[].showOn:{type,edge,node,value} wybiera chwilę pojawienia się jak selektor postoju (engine ustawia shownAt/visible; nierozwiązany selektor to błąd). node.transformOffset opcjonalnie przesuwa wynik względem środka kafelka; domyślnie jest poniżej. playerLayout:'function' rezerwuje 60/480/72 px na pseudokod/diagram/stopkę, jak expanded (4:3: 108/632/110). Kontroler stages daje Spację, cofanie checkpointów w obu trybach i zatrzymany restart R w wybranym trybie.

05-zrodla (wariant 0) używa configureTimers/timersGraph: kod `timer(2000) / interval(2000)`, playerLayout function, dwa rzędy źródło → Odbiorca → box odbiorów na prawo (panel z poziomym łącznikiem: renderer rysuje H, gdy from.y leży w wysokości panelu). timer(2000) emituje 0 w 2 s i complete; interval(2000) emituje 0, 1, 2 co 2 s bez complete, a w 7 s odbiorca ręcznie robi unsubscribe (edge.logicalEnd unsubscribe, scene.unsubscribeAt; statusy „unsubscribe”/„zatrzymany”). Trzy wartości mieszczą się w boxie bez wielokropka. Postoje: first (oba mają 0), question (disconnected timera), third (0, 1, 2), unsubscribed (disconnected intervalu), finish:hold. Profil frame.timers: 4:3 rzędy 181/431, kafelki 170 (źródło 360, Odbiorca 280), box 340×150 z jednym rzędem (lines:1) i showOn przy pierwszym odbiorze w rzędzie, textScale 1,8, labelScale 2,2; 16:9 rzędy 130/330, kafelki 86, boxy od READY. Bazowe rows katalogu pozostają dla Subject.

05-zrodla-2 używa configureHttp/httpGraph: HTTP (work, ri 0, terminalEdge) → Odbiorca (własny wiersz bez pracy, więc bez paska i „praca trwa”), box odbioru pod Odbiorcą (trays.lines:1), playerLayout function. Między odpowiedzią a complete detail HTTP to „odpowiedź wysłana”. Postój request (modelTime 4), dalej AUTO, finish:hold. Profil frame.http: 4:3 kafelki 400×170 (x 300/940, y 201), box 400×150 (y 346) z showOn przy dotarciu „dane”, textScale 1,8, labelScale 2,2; 16:9 tileY 170, kafelki 86, box 250 od READY.

05-zrodla-3 używa configureSubject/subjectGraph po wyborze wariantu. Zwarte tempo (oba formaty): Subject emituje A w 1 s bez subskrypcji, odbiorca dołącza w 2,5 s (scene.subscribeAt), B w 4 s, C w 5,5 s; odbiera B/C. W 4:3 profil frame.subject: kafelki 400×170 (x 300/940, y 201), pod każdym box 400×150 (y 346) z jednym rzędem wartości (trays.lines:1), grupa wyśrodkowana, textScale 1,8, labelScale 2,2; boxy mają panel.showOn (box emisji przy source-next A, box odbioru przy deliver-next B), a A nie leci tokenem obok Subject. 16:9 zachowuje kolumny z historią w trzech liniach, widoczne od READY, i token A „unobserved”. Dwa boxy pokazują trzy emisje i dwa odbiory. Historia źródła korzysta z trays.events/modelTime i nie oznacza bufora Subject. Ręczne postoje: A bez odbiorcy, connected i dostarczenie B; dalej AUTO do C, finish:hold. Bez complete i unsubscribe w tym przykładzie.

15-debounce-audit porównuje debounceTime, auditTime, throttleTime i sampleTime na wspólnym wejściu i okresie 3,5 s. Adapter grafu dla czterech gałęzi rezerwuje layout: fixed, z historią wewnątrz odbiorców i statusem pod operatorem. Postój w 5 s: throttle A, sample C, audit D, debounce bez emisji. Throttle ma domyślne leading:true/trailing:false; sample pomija takty bez nowych wejść. Osobne warianty 16-czas-cztery pozostają w EXTRAS.

Paleta: źródło #8cd0da, odbiorca #b0a0e6, praca #ffc15c, operator #e7b5f1, complete #087438, error #b51e2e, połączenie #111. Stan jest opisany tekstem. Anulowana praca zachowuje zatrzymany pasek i podpis ABORT (klient); nie otrzymuje complete. Terminalny kolor odbiorcy nie przemalowuje automatycznie producenta. W migrowanej rodzinie node.terminalEdge wiąże źródło i operator z własnym terminalem wyjścia: zielony przy complete, czerwony przy error; unsubscribe nie nadaje koloru complete; wiersz pracy pokazuje własne zakończenie.

b04-catcherror ma dwa grafy layout:fixed z osobnymi bloczkami switchMap i catchError. Na zewnątrz HTTP A przekazuje error przez switchMap, catchError emituje [] z of([]), a wynik complete i odłączenie klik$ blokują HTTP B. Wewnątrz ramki każda praca ma własny catchError i lokalny wynik; complete inner nie kończy odbiorcy. Powrót wyników inner do switchMap jest internal. Postoje: aktywne A, obsługa błędu, pytanie po []. Renderer oznacza workState:errored czerwonym obramowaniem i tekstem, bez warunków zależnych od operatora.

Slajdy techniczne 1280×960 (4:3) lub 1280×720 (16:9): kod i diagram mają pierwszeństwo; migrowane sceny używają playerLayout:expanded, a rx-summary zajmuje dolną stopkę. Pozostałe sceny zachowują dotychczasowy układ. Opcjonalne sterowanie zajmuje dolną strefę. Nie dodawaj drugiego paska podpisów. Linie mają 6 px, tekst jest duży, wartości są kapsułkami; starszą historię skracamy wielokropkiem.

## Playback i Reveal

playback deklaruje entry: manual/auto/static, finish: hold/loop, afterLastManualStop: start-auto i stops. Postój ma id, caption oraz selektor czasu: event:{type,edge,node,value} (tylko potrzebne pola), modelTime albo jawny time ilustracji. Opcjonalne last wybiera ostatnie zdarzenie, offset przesuwa postój, phase: before wybiera początek grupy modelTime zamiast końca. Nierozwiązany postój jest błędem. Czasy muszą rosnąć i mieścić się w scenie.

Przykład postoju: {id:'question', event:{type:'deliver-next',edge:'source-op',value:'B'}, caption:'B dotarło podczas pracy A. Co zrobi operator?'}.

MAIN zwykle zaczyna od READY i kilku ręcznych postojów. W MANUAL ponowne „dalej” podczas rozpoczętego etapu wywołuje player.finishStep(): skok do celu playTo i pauza bez kolejnego RAF. main.js przywraca fragment bieżącego etapu, więc kolejny klik dopiero rozpoczyna następny; pominięcie ostatniego pytania nie uruchamia jeszcze AUTO. Dodatkowe „dalej” po ostatnim pytaniu uruchamia AUTO na tym samym slajdzie. AUTO dochodzi do FINISHED i trzyma wynik. Prawo/Page Down podczas AUTO (także pauzy) najpierw wywołuje finish(), a dopiero następne naciśnięcie zmienia slajd. Naturalne zakończenie od razu udostępnia nawigację dalej. EXTRAS domyślnie działają w pętli, z wyjątkiem jawnych konfiguracji rodzin. finish() zawsze daje nieruchomy kadr.

main.js tworzy niewidoczne rx-step.fragment oraz osobny fragment handoff. fragmentshown wywołuje playTo, fragmenthidden wywołuje seek. W AUTO adapter reveal-auto-finish dodaje jeden niewidoczny fragment wyniku: pokazanie wywołuje finish(), a subskrypcja stanu playera synchronizuje go po zakończeniu, restarcie i zmianie trybu. Fragment obsługuje też natywne przyciski Reveal; nie jest dodawany w druku ani do scen z kontrolerem etapów. Nie zastępuj nawigacji Reveal globalnym handlerem strzałek. Capture na kontrolkach jedynie oddaje strzałki/Page Up/Down pilotowi i usuwa fokus suwaka. Tryb, fragment i pauza są pamiętane na slajdzie.

| Klawisz | Zachowanie |
| --- | --- |
| Prawo/lewo, Page Down/Page Up | MANUAL: odtwarza etap; podczas ruchu kończy go i pauzuje. AUTO: prawo najpierw pokazuje wynik, potem zmienia slajd; lewo wraca do poprzedniego slajdu. |
| A | MANUAL → AUTO; w AUTO odtwarzanie/pauza. |
| M | Ręczny/auto na scenie z postojami; powrót wybiera ostatni osiągnięty postój. |
| [ / ] | Poprzedni/następny krok; sceny z postojami używają Reveal. |
| R | Ręczny: fragment -1 i seek(0). Auto: restart. |
| U | Pokaż/ukryj dolne sterowanie. |
| W | Przeładowanie w drugim formacie (4:3 ↔ 16:9) na tym samym slajdzie i fragmencie; wyłączone w druku. |
| S, Esc | Widok prelegenta i overview Reveal. |

createPlayer(root,scene,controls={}): play, pause, toggle, playTo, playContinuously, seek, step, finishStep, reset/restart, finish, hideControls, toggleControls; gettery time, duration, isPlaying, state, snapshot, stops. Stany: ready/playing/paused/finished. Hooki step/reset/toggle, onStop/onFinish. Tylko player prowadzi RAF (przyrost maks. 0,25 s, odmalowanie co ≥33 ms, pętla po 2 s). Pauza anuluje RAF; odłączony DOM zatrzymuje gracza.

main.js pauzuje przy zmianie slajdu, overview, Reveal pause i document.hidden. Wznawia tylko wcześniej odtwarzaną scenę; ręczna pauza i FINISHED pozostają zatrzymane. Kod przykładów jest escapowanym tekstem (esc + <wbr> po „).”), nie wykonywanym JavaScriptem.

Konfiguracja Reveal: Markdown/Highlight/Notes, hash, numer slajdu, wymiary z FORMATS (1280×960 albo 1280×720), margin 0.05, minScale 0.2, maxScale 2, view slide, navigationMode linear. prepareSlides działa przed inicjalizacją i zwraca Map. Warianty klonują całą sekcję z notes; pierwszy zachowuje ID, kolejne mają -2/-3/-4. rendererId jest kluczem rodziny danych. Odtwarzacze powstają leniwie i są ponownie używane.

Format: formatFromSearch(location.search) wybiera '4:3' (domyślnie) albo '16:9' (?ratio=16:9). main.js ustawia html[data-ratio="4-3"|"16-9"], przekazuje wymiary do Reveal i format do prepareSlides(scenes,{format}), który zapisuje scene.format (grafy mogą dobrać wysokość ramki). CSS ma bazę 4:3 i nadpisania [data-ratio="16-9"] z dawnymi wartościami. Siatka odtwarzacza 4:3: zwykły 108/552/116 (toolbar bottom:-84px), expanded/function 108/632/110; kod 42 px (dłuższy łamie się na 2 linie; player wstawia <wbr> po „).”, więc .pipe/.subscribe przechodzą w całości), podpis 28 (expanded 25). Tytuł slajdu animacji 4:3: 64 px w jednej linii (h2 96 px, nowrap); fitTitles() w main.js mierzy tytuł canvasem w faktycznej czcionce i zmniejsza tylko za długie (min. 44 px, z miejscem na przycisk trybu). W 16:9 tytuł 44 px bez dopasowania.

Diagramy 4:3: GRAPH_HEIGHT w format.js daje wysokość viewBox (zwykły 535, expanded/function 612), TEXT_SCALE 1,15 trafia do snapshot.textScale. Etykiety kafelków (nie wiersze prac) rosną do LABEL_SCALE 1,3 (snapshot.labelScale), jeśli najdłuższa linia mieści się w szerokości kafelka (szacunek 0,55 em/znak); inaczej zostają przy textScale, więc łamanie linii się nie zmienia. Renderer mnoży czcionki, kapsułki (token(...,scale)) i limity znaków przez textScale; przy 1 SVG jest identyczne jak wcześniej. compileScene: grafy auto dostają docelową wysokość w layoutDiagram (wyższe kafelki 96/64, historia +66); grafy fixed bez formatAware przechodzą przez stretchGraph (lifecycle.js: y, wysokości, punkty, tacki, panele i tokeny ×f, f ≤ 1,4, wyśrodkowanie). Rodzina flatteningu, 04 i Subject mają formatAware i profil frameFor(scene) w reference-scenes.js (4:3: 612, kafelki 96, panel 172–592). Karty liczą krok z frame.height. Scena bez format (testy, prototypy) zachowuje geometrię 16:9; strona QA prototypów dopisuje format. tests/format-layout.test.cjs sprawdza wszystkie warianty w 4:3 (mieszczą się w viewBox) i identyczne SVG 16:9 względem sceny bez formatu. Linki ?…/./… przechodzą przez withFormat, więc EXTRAS i powrót zachowują format. W wywołuje location.replace(toggledFormatUrl(href)); zmiana formatu zawsze przeładowuje stronę, a hash odtwarza slajd i fragment, nie czas RAF. Notes ładuje iframe z bieżącym query, więc dziedziczy format.

Używane API Reveal: getCurrentSlide, next/prev, navigateFragment(-1 oznacza początek), sync, addKeyBinding, isOverview/isPaused, initialize. Zdarzenia: slidechanged, fragmentshown/hidden, overviewshown/hidden, paused/resumed. Zdjęcia zachowują natywne fragment/fade-out/current-visible, data-fragment-index i r-stack. Notatki czyta plugin Notes z aside.notes w HTML, nie pole notes katalogu. speaker-preview działa wyłącznie wewnątrz iframe #upcoming-slide standardowego okna Notes. Na wiadomość setState od okna nadrzędnego wybiera kolejny slajd z getSlides(), pomijając fragmenty; nazwę bierze z data-speaker-title lub nagłówka (część po myślniku jest podtytułem). Przełącznik Tytuł/Slajd zapamiętuje wybór w localStorage. Nie modyfikuj kodu Notes w node_modules ani widoku projektora.

## MAIN, EXTRAS, druk i legenda

Sekcje data-extras są usuwane przed wariantami przy zwykłym wejściu. Pilot kończy MAIN na pytania. Menu otwiera ?extras#/id; powrót ./#/pytania. Stare bezpośrednie hashe ID dodatków też włączają EXTRAS. ?print-pdf zawiera całość, bez ręcznych fragmentów/kontrolek; każdy odtwarzacz dostaje finish().

Legenda pozostaje HTML/SVG/CSS: pętle 6 s tylko na present, pauza w overview/Reveal pause, wyłączenie w druku i prefers-reduced-motion. Ograniczenie ruchu dotyczy legendy; JS korzysta z wyboru trybu i pauzy.

## Wprowadzanie zmian i weryfikacja

Nowa scena: model oraz bazowa sekcja animation-slide[data-animation] z rx-player, h2 i notes. Zdefiniuj graph/preset, playback i podpisy. Nie dodawaj kopii generowanych wariantów do HTML. Sprawdź READY, pytanie, FINISHED oraz cofanie. Uwzględniaj późniejsze revise/variants.

Zachowuj rozróżnienia: unsubscribe ≠ callback complete; hot ≠ replay; share ≠ trwały cache; pasek map nie czyni go asynchronicznym; abort klienta nie cofa serwera. concatAll kolejkuje Observable, concatMap wartości przed projekcją, exhaustMap nie tworzy pominiętych inner. Microtask resolvera zbiera synchroniczne ID; globalny bufferTime ma osobne okna od subskrypcji i limit wielkości. Puste resolveMany zwraca pustą Map jako kontrakt aplikacji, nie zachowanie forkJoin([]).

Po zmianach uruchom npm test i npm run build. Testy obejmują wszystkie warianty, deterministyczne klatki, kierunki/terminale, historię, anulowanie, kolejki, handoff, hold/pętle/RAF oraz resolver (czas, rozmiar, in-flight, błąd, puste wejście). W przeglądarce sprawdź pilot, powrót, overview, pauzę, EXTRAS i print-pdf.

Podgląd QA: /rxjs-operatory/work/animation-review.html (serwer developerski), z audytem granic tekstu SVG. Sprawdź 4:3 (1024×768, 1400×1050), 16:9 (?ratio=16:9, 1920×1080) i pomniejszony widok; strony QA mają wybór formatu. Fizyczny projektor i próba 45 minut wymagają prelegenta. Przy zmianach wyłącznie dokumentacyjnych sprawdź dane, linki i diff; nie pisz testów odtwarzających tekst dokumentacji.

## Migracja rodziny flatteningu

`flattenGraph` w reference-scenes.js jest wspólnym adapterem dla prawdziwych slajdów i prototypów; nie utrzymuj osobnej kopii geometrii w prototype-scenes.js. `configureFlattenPlayback` ustawia metryki z executionCounts, przesuwa postoje first i pytanie concatMap o 0,35 s na fade-in wiersza oraz wiąże końcowy podpis z terminalem wyniku. Kontroler stages nie jest włączany w rodzinie flatteningu; jej fragmenty Reveal pozostają dotychczasowe. Migrowane dodatki 12a i 13-limit używają finish:hold.

concatAll ma parę kafelków map/concatAll nad panelem prac: map przy lewej krawędzi panelu, concatAll przy prawej (po 240 px, odstęp 40 px). Panel pozostaje wyśrodkowany; łącznik do prac wychodzi z concatAll. Jego oczekujące inner mają tekst „w kolejce”, bez sugestii subskrypcji. 12a zachowuje potencjalny czas pracy 6 s także po anulowaniu A. Limit współbieżności ma pięć zwartych slotów i pięć miejsc emisji źródła. mergeMap zachowuje wejścia A/B/C/D, ale C trwa 1,9 s, D 0,9 s, aby pokazać przeplot. Testy migration-v2 sprawdzają zgodność z prototypami, kolejkę, complete outer, limit trzech subskrypcji, płynny postęp i cofanie.

`scene.playerLayout:'expanded'` dodaje rx-expanded w playerze. CSS rezerwuje 60/480/72 px na kod/diagram/stopkę (612 px łącznie; 4:3: 108/632/110, 850 px). Większy graf flatteningu ma viewBox 1240×460 (4:3: 1240×612); kafelki 76 px wysokości, panel zaczyna się 60 px pod nimi, odstęp między wierszami to 20 px. Nie wprowadzaj tej geometrii do rendererów per slajd. W tym układzie toolbar po U zastępuje wizualnie stopkę (summary visibility:hidden), a jego ukrycie odsłania podpis i liczniki. Diagram pozostaje widoczny.

Opcjonalne `node.terminalEdge` wskazuje ID krawędzi własnego zakończenia kafelka. Snapshot ustawia notification przy początku terminala tej krawędzi, wyłącznie dla complete/error. Źródło może więc być zielone, gdy operator nadal obsługuje inner i kolejkę. Renderer nadal korzysta tylko z notification/fill, bez rozpoznawania operatorów.
