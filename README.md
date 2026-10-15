# RxJS — Operatory, które znasz, ale bałeś się zagadać

Polska prezentacja Pawła Kondraciuka o sterowaniu pracą, kolejnością, subskrypcjami i współdzieleniem w RxJS. Podstawowy przykład współdzielenia jest niezależny od frameworka; po nim wspominamy zastosowania w Angularze i React. Otwarcie przypomina historię meet.js Białystok; część techniczna używa animowanych bloczków i wartości.

Ten README jest mapą treści: opisuje slajdy, zawartość bloczków i speaker notes. Implementację animacji, mapę plików i używane API znajdziesz w [AGENTS.md](AGENTS.md).

## Uruchomienie i obsługa

```sh
npm ci
npm run dev
```

Otwórz adres podany przez serwer ze ścieżką `/rxjs-operatory/`. `npm run build` buduje prezentację, `npm run preview` uruchamia podgląd zbudowanej wersji. `S` otwiera widok prelegenta z notatkami, `Esc` widok wszystkich slajdów. Strzałki i Page Up/Page Down obsługują nawigację Reveal.js; fragmenty odsłaniają zdjęcia i listy.

Sceny MAIN z pytaniami zaczynają od nieruchomego READY. Prawo / Page Down uruchamia kolejny etap do postoju; ponowne naciśnięcie podczas ruchu natychmiast pokazuje koniec tego etapu i zatrzymuje animację. Następny klik uruchamia kolejny etap; lewo cofa. Pomijanie ruchu działa również przyciskiem „dalej” i pilotem. Dopiero następny klik po ostatnim pytaniu uruchamia AUTO na tym samym slajdzie. Automat zatrzymuje się na wyniku FINISHED. U pokazuje dolne sterowanie, A przechodzi z ręcznego do auto lub pauzuje/wznawia auto, M zmienia tryb, [ i ] zmieniają krok, R zaczyna od początku. Sceny wprowadzające z kontrolerem stages w AUTO kończą bieżący etap i pozwalają cofać checkpointy; R przywraca zatrzymany READY. Spacja pauzuje lub wznawia aktywną animację, a zdjęcia i statyczne otwarcie zachowują natywne sterowanie. W pozostałych scenach w AUTO prawo / Page Down najpierw pokazuje nieruchomy wynik całej animacji; dopiero kolejne naciśnięcie zmienia slajd. Dotyczy to również pilota i przycisków „dalej”. Lewo wraca do poprzedniego slajdu. Tryb, postój i pauza są pamiętane przy powrocie. EXTRAS domyślnie powtarzają pokaz, z wyjątkiem rodzin mających własne postoje.

W oknie prelegenta (`S`) podgląd następnego slajdu domyślnie pokazuje dużą nazwę, np. **switchMap**, i krótki podtytuł. Wskazuje kolejny slajd, także podczas ręcznych postojów bieżącej animacji. Przełącznik **Podgląd: Tytuł / Slajd** w prawym dolnym rogu tego pola przywraca standardowy podgląd. Wybór jest zapamiętywany w przeglądarce. Notatki pozostają w standardowym polu Notes. Opcjonalne `data-speaker-title` na sekcji ustawia własny podpis wyłącznie dla prelegenta.

Dopisanie `?print-pdf` przed hashem ustawia wszystkie animacje, łącznie z EXTRAS, w końcowych nieruchomych kadrach bez kontrolek. Reveal drukuje też kolejne fragmenty pełnego otwarcia na osobnych stronach: obecnie 65 slajdów daje 81 stron PDF.

Domyślny format to 4:3 (scena 1280×960) pod projektor 4:3. `?ratio=16:9` przywraca ekran panoramiczny 1280×720. `W` przeładowuje stronę w drugim formacie, zostając na tym samym slajdzie i fragmencie; animacja wraca do stanu tego fragmentu. Linki do EXTRAS i powrót do pytań zachowują wybrany format. Druk działa w obu: `?print-pdf` (4:3) lub `?print-pdf&ratio=16:9`. W 4:3 slajdy wykorzystują pełną wysokość: większe zdjęcia i kody QR, wyższe diagramy, większy tekst i kapsułki w animacjach (×1,15), etykiety kafelków do ×1,3 oraz większy tytuł (64 px; za długi zmniejsza się, by został w jednej linii), kod (42 px, długi łańcuch przechodzi do nowej linii przed .pipe/.subscribe) i podpis.

## Jak czytać spis

Porównania są osobnymi slajdami. Warianty z sufiksami -2/-3/-4 powstają podczas uruchamiania; pierwszy zachowuje ID bazowe. Poniżej podano kolejność MAIN, a dalszy spis opisuje rodziny tematycznie. Pozycje EXTRAS są oznaczone.

Każda pozycja opisuje temat, ekran/bloczki i notatki prelegenta. Tabele wariantów podają rzeczywiste tytuły i kod nad diagramem. Speaker notes przy rodzinie dotyczą wszystkich jej wariantów, ponieważ sekcje są klonowane razem z notatkami. Wyjątkiem jest Subject (`05-zrodla-3`): ma własne notatki przypisane do checkpointów. Notatki przytoczono z ujednoliconymi odstępami; powtarzaną instrukcję obsługi zwykłych animacji opisano wspólnie wyżej.

Czasy są umownym modelem dydaktycznym. Przelot wartości i pauza przy operatorze spowalniają ilustrację; nie dodają opóźnień do rzeczywistego synchronicznego RxJS. HTTP jest symulowane. Pasek pokazuje czas pracy, a nie pomiar postępu prawdziwego żądania.

## Ścieżka MAIN i czas

Pełne otwarcie pozostaje bez zmian: społeczność, historia meet.js, fotografie, autor, tytuł i pytania o operatory. Budżet **30–35 minut dotyczy tylko części właściwej**; otwarcie, pytania i dogrywka są dodatkowo.

MAIN ma **30 slajdów (19 animowanych)**. EXTRAS zawiera **35 wariantów**. Całość obejmuje 48 bazowych slajdów HTML, 65 po rozwinięciu, 54 animowane. Warianty powstają przed wyborem ścieżki; końcowe ID zachowują poprzednie znaczenie niezależnie od kolejności.

Kolejność po otwarciu:

1. HTTP (`05-zrodla-2`) → interval na żywo (`05-zrodla`) → map, pipe i wykonanie (`04-operator`) → cold (`04a-dwa-tory`) → ręczny multicast HTTP przez Subject (`05-zrodla-3`) → share() za map (`04a-dwa-tory-2`) → share z unsubscribe A (`04a-dwa-tory-3`).
2. Następnie późny odbiorca z share/shareReplay (`20-sharereplay`, `20-sharereplay-2`). Cold i współdzielenie HTTP pokazują wcześniej tory `04a`; powtarzające je cold timer i oba slajdy `07-hot-cold` zostały usunięte.
3. **map + concatAll (`08-map-strumienie`) pozostaje kluczowym pomostem w MAIN**, bezpośrednio przed concatMap → mergeMap → switchMap → exhaustMap.
4. catchError na zewnątrz/wewnątrz → distinctUntilChanged → wspólne porównanie debounceTime i auditTime (`16-czas-cztery`).
5. Cztery pytania podsumowania → „Pytania?” → rozmowa z salą albo dodatkowe przykłady.

| Część właściwa | Budżet |
| --- | --- |
| HTTP, źródła, map/pipe, wykonania, Subject i share/replay | 9 min |
| map + concatAll oraz cztery operatory *Map | 12 min |
| catchError | 4 min |
| distinctUntilChanged, debounceTime, auditTime | 4 min |
| Podsumowanie | 1,5 min |
| Rezerwa na interakcję i przejścia | 2 min |
| **Łącznie** | **32,5 min** |

Na map + concatAll i przejście do concatMap przewidziano około 3 minut z bloku flatteningu. Czasy są planem prelegenta, nie pomiarem odtwarzacza.

**EXTRAS to przygotowana dogrywka przy braku pytań**, a także materiał do odpowiedzi na konkretne pytanie. Domyślne wejście prowadzi kolejno przez `12a-complete`, `12a-complete-2` i `13-limit`: complete outer, dalsza praca inner oraz limit współbieżności. Trzy slajdy zajmują około 4–6 minut i przechodzą zwykłym pilotem. Po limicie można wrócić do menu albo wybrać następny blok.

Pozostałe bloki obejmują pozycję share/refCount, dodatkowe porównania subskrypcji, cztery operatory czasu, operatory kombinacyjne, Angular/React i resolver. Hot pozostaje w EXTRAS pod ID `06a-cold-hot-2`; refCount i resolver również pozostają dostępne. Menu otwiera `?extras#/id`, a stare bezpośrednie hashe dodatków również włączają EXTRAS. Powrót zachowuje format. Dodatki nigdy nie uruchamiają się automatycznie wskutek braku pytań — wybiera je prelegent.

## Legenda bloczków

| Element | Znaczenie |
| --- | --- |
| Błękitny bloczek | Źródło wartości. |
| Różowy bloczek | Operator przetwarzający lub współdzielący. |
| Fioletowy bloczek | Odbiorca wartości. |
| Żółty bloczek z paskiem | Aktywna praca, np. HTTP lub inner Observable. |
| Czarna linia | Subskrypcja: powstaje od odbiorcy ku źródłu; unsubscribe usuwa ją w tym samym kierunku. |
| Zielone/czerwone zakończenie | Complete/error idzie od źródła ku odbiorcy; odbiorca otrzymuje kolor terminalny. |
| Kółka/kapsułki z liczbą lub tekstem | Emitowane wartości next i historia odebranych wartości. |

Kolory wartości rozróżniają też gałęzie A/B/C. Unsubscribe nie oznacza complete producenta i nie wywołuje callbacku complete odbiorcy.

## Otwarcie i społeczność

### Społeczność — `spolecznosc`

**Temat:** zaproszenie do społeczności JavaScript.

**Na ekranie:** dwie kolumny: Discord „meet.js Poland” z QR i podpisem „Dołącz do rozmowy”; Facebook „JavaScript i front-end Białystok” z QR i podpisem „Dołącz do grupy”.

**Speaker notes:**

> Powitaj uczestników i wspomnij, że współorganizujesz meet.js Białystok. Po lewej jest kod do serwera Discord meet.js Poland, gdzie spotyka się też społeczność Białegostoku. Po prawej jest grupa „JavaScript i front-end Białystok” na Facebooku. Daj chwilę na zeskanowanie kodów, a potem przejdź do pytania o pierwsze spotkanie.

### Pierwsze meet.js: pytanie — `pierwsze-meetjs-pytanie`

**Temat:** pytanie do publiczności o początek spotkań.

**Na ekranie:** duże pytanie „Kiedy odbyło się pierwsze spotkanie meet.js w Białymstoku?”. Odpowiedź pojawia się na następnym slajdzie.

**Speaker notes:**

> Zadaj pytanie sali i daj chwilę na odpowiedzi. To podchwytliwe pytanie. Odpowiedź pokaż dopiero na następnym slajdzie.

### meet.js Białystok #2 — `pierwsze-meetjs-odpowiedz`

**Temat:** pierwsze spotkanie pod nazwą meet.js miało numer #2.

**Na ekranie:** tytuł, data 24 lutego 2015 i plakat spotkania w Zmianie Klimatu.

**Speaker notes:**

> Pierwsze spotkanie pod szyldem meet.js odbyło się 24 lutego 2015, ale miało numer #2. Spotkanie #1 odbyło się wcześniej jako JavaScript Białystok. Stąd podchwytliwe pytanie.

> Plakat pokazuje datę spotkania. Kolejne kliknięcie przechodzi do JavaScript Białystok #1.

### JavaScript Białystok #1 — `javascript-bialystok-1`

**Temat:** wcześniejsze spotkanie, przed przyjęciem nazwy meet.js.

**Na ekranie:** tytuł i data 20 stycznia 2015. Najpierw plakat, następnie siedem zdjęć odsłanianych fragmentami Reveal.

**Speaker notes:**

> A to wcześniejsze spotkanie: JavaScript Białystok #1, 20 stycznia 2015. Pierwsze meet.js odbyło się miesiąc później, jako spotkanie #2.

> Wtedy jeszcze nie wiedziałem, kim są ci ludzie, którzy przyszli na spotkanie. Dziś kojarzę większość z nich, może nie wszystkich z imienia :) Trochę jak z operatorami z tytułu tej prezentacji: znasz je z widzenia, ale bałeś się zagadać.

> Plakat i kolejne siedem zdjęć pochodzą z pierwszego spotkania JavaScript Białystok. Pokazuj zdjęcia kolejnymi kliknięciami.

### Historia meet.js Białystok — `historia-meetjs`

**Temat:** historia spotkań i miejsc w latach 2015–2026.

**Na ekranie:** oś lat z numerami edycji, datami i linkami do wydarzeń; podtytuł „62 spotkania · 7 miejsc · 2015–2026”. Kolory oznaczają Zmianę Klimatu, SoftwareHut, HACKLAG, Explorer HQ, Instapage Poland, 6-Ścian PUB Sześcian i Klub GWINT. Legenda zawiera udziały miejsc i oznaczenie odwołanych #34 i #38. Slajd obejmuje także planowaną edycję #65.

**Speaker notes:**

> Pokaż wizualnie pełną historię spotkań: od pierwszego w 2015 aż do teraz. Zauważ przerwę w 2020 (pandemia COVID). 62 spotkania w 7 miejscach. Edycje #34 i #38 odwołano. Edycja #65 jest planowana na 22 października 2026. Edycja #65 odbędzie się w Zmianie Klimatu. Kolory tła dat oznaczają miejsca zgodnie z legendą.

### Zawsze gdzieś się przewijałem

**Temat:** osobista historia uczestnictwa autora w spotkaniach.

**Na ekranie:** stos sześciu archiwalnych zdjęć autora na widowni, odsłanianych kolejnymi fragmentami. Slajd nie ma własnego ID w HTML.

**Speaker notes:**

> Świetny moment na uśmiech z widownią: pokaż, że bez względu na edycję zawsze gdzieś byłeś w kadrze! Klikaj spację, żeby odsłaniać kolejne archiwalne zdjęcia.

### Poprzednie wystąpienia

**Temat:** dwie wcześniejsze prelekcje autora.

**Na ekranie:** dwie karty ze zdjęciami: „Jak zostać mobile deweloperem w 1 dzień” — podpis „17. lipiec 2016 · meet.js #8”; „Trening na redukcję: jak spalić kilobajty” — „17. maj 2017 · meet.js #15”. Slajd nie ma własnego ID w HTML.

**Speaker notes:**

> Wspomnij o swoich poprzednich prelekcjach: w 2016 roku mówiłeś o mobile developmencie (meet.js #8), a w 2017 roku o redukcji wagi skryptów i spalaniu kilobajtów (meet.js #15).

### Tytuł prezentacji — `tytul`

**Temat:** przedstawienie autora i dzisiejszego tematu.

**Na ekranie:** „RxJS — Operatory, które znasz, ale bałeś się zagadać”. Karta: Paweł Kondraciuk, awatar, X/GitHub `@pawelkondraciuk`, Discord meet.js Poland, „Sr. JavaScript Developer” i logo Tradeweb. To statyczny slajd.

**Speaker notes:**

> A dziś porozmawiamy o RxJS. Na tej prezentacji odczarujemy trudne operatory z RxJS. Pokażę Wam, że nie taki diabeł straszny. Pamiętajcie o uśmiechu! Przejście od poprzednich wystąpień do dzisiejszego tematu. Zapowiedz decyzje o pracy, kolejności i współdzieleniu. Tytuł można pozostawić jako statyczny slajd.

## Wprowadzenie do RxJS

### Jakie znasz operatory RxJS? — `02-znane-operatory`

**Temat:** rozmowa z publicznością o znanych operatorach.

**Na ekranie:** pytanie i odsłaniane pojedynczo bloczki tekstowe: `map`, `tap`, `filter`, `switchMap`.

**Speaker notes:**

> Zapytaj salę: „Jakie znasz operatory RxJS?” i daj chwilę na odpowiedzi. Kolejnymi naciśnięciami strzałki w prawo odsłaniaj po jednym operatorze: map, tap, filter i switchMap. Następny slajd pyta o share.

### A share? — `03-a-share`

**Temat:** przejście od popularnych operatorów do współdzielenia.

**Na ekranie:** wyłącznie duże pytanie „A share?”.

**Speaker notes:**

Brak notatek w HTML.

## Źródła, subskrypcje i operatory

### Operator to funkcja — `04-operator`

**MAIN — po HTTP i interval.** Wygląd torów jak w `04a-dwa-tory`: nagłówek kafelka to definicja, wiersz pod nim — wykonanie A. READY pokazuje kod `of(1, 2, 3)` i sam nagłówek `of(1, 2, 3)`. Źródło emituje kolejno trzy osobne liczby: 1, 2, 3.

Pierwsze prawo odsłania jednocześnie `.pipe(map(x => x * 2))` w drugiej linii kodu oraz nagłówek map. Oba pojawiają się łagodnym fade-in przez 0,3 s, bez przesuwania układu. Pipe składa definicję, nie uruchamia źródła. Następny etap: pojawia się odbiorca A (wiersz z inboxem) i chwilowy napis `.subscribe()` A nad pipeline'em, potem subskrypcja biegnie od niego ku źródłu, a pod nagłówkami map i of rosną wiersze A; napis znika, gdy subskrypcja dotrze do of.

Pierwsza wartość przechodzi ręcznie: kulka 1 wjeżdża do wiersza map, zatrzymuje się, zmienia w 2 i jedzie do odbiorcy. Jeden RxJS map podwaja każdą z trzech kolejnych emisji, bez zagnieżdżonego map. Następny krok włącza AUTO dla 2 → 4, 3 → 6 i complete (impuls na kablach); w wierszu odbiorcy zostają kulki 2/4/6. Zielone wiersze oznaczają zakończenie tego wykonania, nie trwałe zamknięcie definicji Observable — nagłówki pozostają pastelowe.

**Speaker notes:** Najpierw źródło trzech osobnych wartości, potem składanie definicji przez pipe i uruchomienie przez subscribe. Operator dostaje Observable i zwraca Observable; map(project) tworzy funkcję przekazaną do pipe. Projekcja x => x * 2 przekształca pojedynczą liczbę. of, projekcja i odbiór są synchroniczne; postoje i przeloty dotyczą ilustracji.

Kontroler `stages`: → zaczyna lub kończy etap, ← cofa checkpoint także w AUTO, Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany READY w wybranym trybie. Fade-in cofa się i resetuje razem z kodem i diagramem. Tempo ilustracji: etap pipe 0,65 s, pojawienie odbiorcy 0,3 s, subscribe 3,2 s, przelot 1,2 s, transformacja 1,4 s, zatrzymanie odbioru 0,5 s, terminal 1,2 s, cisza 0,8 s przed FINISHED (rozbłysk wierszy wygasa).

### Tory wykonania: cold, share() i unsubscribe — `04a-dwa-tory`, `-2`, `-3` (slajdy testowe)

**MAIN — zaraz po 04-operator, test zapisu wielu subskrypcji.** Kafelek to definicja: stały nagłówek (`HTTP GET`, `map`, `share()`, `Odbiorca A/B`). Pod nagłówkiem rośnie obszar wykonań — każde subscribe dokłada kompaktowy wiersz, gdy do kafelka dociera (krótkie rozszerzenie, nagłówek nie skacze). Wiersze oddziela separator 1 px, mają jaśniejsze tło kafelka i pasek koloru subskrypcji po lewej; zakończone zostają jako historia. Mało tekstu: w wierszu tylko litera toru.

**Paleta.** Nagłówki: źródło `#8FC9D4`, operator `#D8B3E6`, odbiorca `#EAE4F7`; tekst `#26323B`. Subskrypcje: A `#7457D9`, B `#D8840F`, wspólny upstream share `#238F83`. Stany wiersza (tło, akcent): complete `#DDF1E1`/`#26804E`, error `#F7D9D9`/`#C54848`, unsubscribe `#E7E8E8`/`#808890`; aktywny — tło bazowe. Kolor subskrypcji zostaje na pasku wiersza, kablach i portach w każdym stanie. Tło slajdu pozostaje globalnym gradientem (jego środek to praktycznie `#F8F3E9`).

**Postęp i stany.** W HTTP postęp to tło wiersza w łagodnym kolorze subskrypcji, przesuwające się od lewej (symulowane oczekiwanie, nie procent pobrania); po complete cały wiersz przechodzi w delikatną zieleń z krótkim rozbłyskiem, po error w czerwień, po anulowaniu jest przygaszony. map i share nie mają czasowego postępu — tylko stan wiersza i przelatująca wartość.

**Połączenia.** Każdy tor ma własny kabel (~3 px w skali makiety) i porty w kolorze subskrypcji. complete/error: krótki impuls w kolorze akcentu biegnie po kablu do następnego kafelka, tam wiersz zmienia stan, a kabel wraca do koloru toru z mniejszym kryciem jako historia. unsubscribe: bez impulsu, kabel i porty szarzeją i gasną; stan kafelka wyżej zmienia się po dotarciu unsubscribe.

**Cold (`04a-dwa-tory`).** Kod pokazuje stale tylko definicję pipeline'u, bez nazwy `data$`: `http.get<number>(url).pipe(map(x => x * 2))`, z delikatnym tłem i podkreśleniem w kolorach klocków (`http.get<number>(url)` — turkus HTTP, `map(x => x * 2)` — fiolet map; `pipe` i nawiasy neutralne); fragment świeci mocniej, gdy jego klocek pracuje (map podczas przekształcenia, HTTP gdy odpowiedź wylatuje). Subskrypcję pokazuje chwilowy napis nad pipeline'em: duży monospace `.subscribe()` w kolorze toru, na delikatnym tle, z badge'em A/B (identyfikator wykonania w wizualizacji, nie argument subscribe). Napis pojawia się z odbiorcą, trwa podczas impulsu subskrypcji od odbiorcy przez map do HTTP i znika, gdy impuls dotrze do źródła (~1,9 s) — nie czeka na request. Nie pojawia się przy complete; slajd nie ma ręcznego unsubscribe. HTTP zwraca `21`, map daje `42`: kulka zatrzymuje się na środku wiersza map, zmienia wartość z krótkim pulsem i jedzie dalej. Odbiorcy to kompaktowe wiersze na wysokości torów: pasek koloru, drugorzędna ikona inbox, litera A/B i kulki wartości (najwyżej 3 ostatnie, stały rozmiar); połączenia są poziome. Wymiary dla 1024×768 (te same w 16:9): pipeline ~90% szerokości, nagłówek ~62 px (napis ~32 px), wiersz ~70 px (litera ~27 px), kulka ~46 px (wartość ~28 px), inbox ~22 px, porty 18 px, kabel 4 px, narożnik 6 px. Liczniki: „Pipeline 1” i „Requesty HTTP”, większe niż na innych slajdach. A kończy w 5 s, B trwa i kończy osobno w 7 s. Postoje: first (napis A już zniknął), question (B zaczyna subscribe — widać `.subscribe()` B), second, done (tor A zakończony, B trwa), potem AUTO/hold.

**share() za map (`-2`).** Ten sam wygląd co cold (wymiary pod projektor, kulki, kompaktowi odbiorcy, kod z kolorami klocków, chwilowe napisy). Kod: `http.get<number>(url)` / `  .pipe(map(x => x * 2), share())`. Cztery kolumny ~90% szerokości: HTTP GET → map → share() → odbiorcy. Pierwszy Subscriber A uruchamia wspólne wykonanie upstream — ma ono kolor A (fiolet), nie osobny kolor: jeden wiersz HTTP i map, fioletowe połączenia HTTP → map → share. Kolor identyfikuje wykonanie zainicjowane przez A, nie właściciela — zarządza nim share. W share każdy Subscriber ma własny wiersz (dodawany w dół): lewy pasek w kolorze wspólnego upstreamu, tło, litera, port i wyjście w kolorze Subscribera. B dołącza: jego `.subscribe()` trwa tylko do share — bez impulsu do map/HTTP i bez drugiego requestu. Emisja: jedna fioletowa kulka 21 → 42 przez map wjeżdża do share, zatrzymuje się w punkcie rozdzielenia i rozchodzi na osobne powiadomienia next — po kulce w kolorze każdego aktywnego Subscribera (przerywane ścieżki tylko w tej chwili). Liczniki: Pipeline 1, Requesty HTTP 1, Odbiorcy share. Postoje: first, question (drugi request?), second, done.

**share(): A rezygnuje (`-3`).** Jak `-2`, ale w 4 s `.unsubscribe()` A. Wiersz A w share (również lewy pasek), port, połączenie i odbiorca A szarzeją; wiersz B zostaje z fioletowym paskiem, HTTP i map dalej fioletowe, request trwa. Przy emisji z jednej kulki powstaje tylko pomarańczowa dla B. Postoje: first, second, question (czy request zostanie przerwany?), cancelled, done.

**Scenariusze share (dane, nie osobne slajdy).** `shareScenario` (lista Subscriberów `{id, start, unsub?}`) wylicza sesje upstreamu: C (niebieski) dołącza do trwającego upstreamu w trzecim wierszu, bez nowego requestu; odejście ostatniego aktywnego przed odpowiedzią anuluje upstream (HTTP z niedokończonym paskiem, bez complete); późniejszy Subscriber otwiera nową sesję w swoim kolorze (nowy wiersz HTTP/map, połączenie do share z załamaniem). Sprawdzają to testy.

**Speaker notes:** Nagłówki to jedna definicja data$, wiersze to wykonania. Cold: każdy subscribe tworzy własną subskrypcję map i request. share współdzieli upstream, ale nie skleja odbiorców — każdy ma własny wiersz i może odejść osobno. Panele PRAC WEWNĘTRZNYCH dla *Map pozostają bez zmian.

### Źródła — rodzina `05-zrodla`

Warianty zachowują ID, lecz zajmują oddzielne miejsca narracji: **HTTP otwiera część właściwą**, interval jest drugi, Subject stoi między Cold i share: **Cold → ręczny multicast przez Subject → automatyczny multicast przez share()**.

| ID | Kod i zachowanie |
| --- | --- |
| 05-zrodla-2 | `http.get('/api/data')`; pierwsze „dalej” dopisuje `.subscribe(render)` (fade-in razem z odbiorcą A). READY ma tylko nagłówek HTTP GET; subscribe odsłania odbiorcę i wiersz A. Postój request pokazuje pracę po podłączeniu, postój first odebrane dane przed complete. |
| 05-zrodla | `interval(1000)` na żywo. Pierwsze „dalej” robi `.subscribe()`, potem emisje 0, 1, 2, 3… co sekundę bez końca; drugie „dalej” robi `.unsubscribe()` (bez complete); trzecie przechodzi dalej. |
| 05-zrodla-3 | `const subject$ = new Subject<number>();`, subskrypcje A/B i osobne `http.get<number>(url).subscribe(subject$);`. Jedno HTTP rozsyła `42` i complete do obu odbiorców. |

Cała rodzina ma wygląd torów jak w `04a-dwa-tory` (nagłówek = definicja, wiersz = wykonanie, porty, kulki w wierszu odbiorcy, płaskie kafelki) i te same chwilowe napisy `.subscribe()` z badge'em toru, widoczne od pojawienia się odbiorcy do dotarcia subskrypcji do źródła. W interval `.unsubscribe()` A pojawia się pod wierszem odbiorcy, bo rezygnacja zaczyna się przy nim. W Subject napisy A i B stoją nad kolumną odbiorców. HTTP ma postęp tylko w wierszu A pod HTTP GET (od zestawionej subskrypcji do odpowiedzi); odbiorca czeka, potem trzyma kulkę „dane” w swoim wierszu. Diagram używa harmonogramu: pojawienie odbiorcy w 1 s, subscribe 1,3–2,1 s, odpowiedź 7–7,8 s, complete 8,3–9,1 s, cisza do 9,9 s. Kod i widoczność cofają się razem. Postęp jest symulacją oczekiwania, nie procentem odpowiedzi sieciowej.

interval to jeden rząd: `interval(1000)` → odbiorca A. Slajd jest wyjątkiem od postojów: po `.subscribe()` emisje trwają tak długo, jak prelegent chce (licznik „emisje” rośnie bez ograniczeń, w wierszu odbiorcy zostają 3 ostatnie kulki, starsza płynnie wypada). Kolejne „dalej” wywołuje `.unsubscribe()` na istniejącym wykonaniu: wartość już wysłana dociera, potem szary pocisk „×” jedzie od odbiorcy w lewo do interval, przebyty kabel i wiersze szarzeją, emisje ustają; nie ma zielonego complete. AUTO ani pauza nie wywołują unsubscribe same. Lewo cofa etap (z anulowanego do emisji od zera, z emisji do READY); wyjście ze slajdu sprząta wykonanie, a powrót startuje od READY. Druk pokazuje anulowany kadr po wartościach 0, 1, 2.

**Subject: ręczny multicast HTTP — 75–90 sekund.** Stały kod ma cztery linie: definicję `Subject<number>`, `subject$.subscribe(v => renderA(v));`, analogiczną subskrypcję B oraz `http.get<number>(url).subscribe(subject$);`. Stałe wyróżnienie mają tylko fragmenty `new Subject<number>()`, `http.get<number>(url)` i `subject$`; linie subscribe A/B są zwykłym tekstem i dostają kolor toru z obrysem tylko w trakcie swojej subskrypcji. Subject jest jednocześnie Observable dla A/B i Observerem HTTP, odbierającym next/error/complete.

Diagram HTTP GET → Subject → A/B używa tych samych kafelków i portów co Cold/share. A i B podłączają się do Subject, a HTTP nadal nie działa. Przy przekazaniu Subject jako Observer nad HTTP pojawia się chwilowy napis `.subscribe(subject$)` z identyfikatorem wykonania `#1`. Dopiero osobne subscribe uruchamia jeden request. Jedna `42` w jasnym kolorze toru HTTP (wiersz „#1”) dociera do portu Subject i tam, na samym wejściu, rozdziela się na dwa powiadomienia w kolorach odbiorców (fioletowa A, pomarańczowa B), które równocześnie trafiają do odbiorców. Następnie HTTP complete kończy Subject oraz obu odbiorców. Fioletowy tor A i pomarańczowy B zachowują kolory; upstream ma niezależny kolor zielonoturkusowy z jasnym postępem requestu. Licznik requestów rośnie dopiero po zestawieniu subskrypcji HTTP. Nie ma logu/bufora ani ręcznego unsubscribe.

Subject nie odtwarza historii. Odejście A i B nie anuluje automatycznie osobnej subskrypcji HTTP — trzeba nią zarządzać samodzielnie. Następny slajd pokazuje share(), który podłącza upstream przy pierwszej subskrypcji i zarządza jego odłączeniem.

**Checkpointy i speaker notes:** notatki w standardowym oknie prelegenta zmieniają się wraz z osiągniętym checkpointem, również w AUTO, po cofnięciu, resecie i wejściu z hasha. Narracja poniżej jest zapisana w HTML; nie jest wyświetlana publiczności.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY | Przed chwilą widzieliśmy, że dwie subskrypcje zimnego Observable uruchamiają dwa osobne requesty HTTP. A co, jeśli chcemy wykonać request tylko raz i przekazać jego wynik wielu odbiorcom? |
| 1 | A podłączony | Do tego możemy wykorzystać Subject. To taki Observable, do którego sami możemy dostarczać wartości. Najpierw podłączamy pierwszego odbiorcę. |
| 2 | B podłączony | Podłączamy drugiego. Mamy dwóch odbiorców, ale zwróćcie uwagę — żaden request jeszcze nie wystartował. |
| 3 | Przed subskrypcją HTTP | Teraz robimy coś ciekawego. Subject może być nie tylko Observable, ale również Observerem. Możemy więc przekazać go bezpośrednio do subscribe naszego HTTP. |
| 4 | HTTP pracuje | Dopiero ta subskrypcja uruchamia request. Jeden, niezależnie od tego, ilu odbiorców podłączyliśmy do Subjecta. |
| 5 | Jedna 42 w Subject | HTTP zwraca jedną wartość. Subject ją odbiera i rozsyła do wszystkich aktualnych odbiorców. |
| 6 | A i B mają 42 | Obaj dostają tę samą wartość. Jedna emisja źródła, dwa powiadomienia „next”. |
| 7 | Complete obu odbiorców | HTTP się kończy, a Subject przekazuje również „complete” do obu odbiorców. |
| 8 | FINISHED / przejście | Rozwiązaliśmy problem dwóch requestów. Ale jest jeden haczyk: to my ręcznie podłączyliśmy Subject do HTTP. Gdyby odbiorcy zrezygnowali, musielibyśmy sami zadbać o anulowanie tego requestu. A gdyby RxJS mógł zarządzać tym za nas? I tu pojawia się „share()”. |

MANUAL zatrzymuje się w punktach 1–7; kolejny krok kończy animację w FINISHED. AUTO przechodzi płynnie przez całość. Ruch kulek tylko ilustruje synchroniczne rozsyłanie powiadomień; pauzy służą wyjaśnieniu. Pełny kod jest przykładem, nie jest wykonywany przez prezentację.

**Speaker notes pozostałych źródeł:** Angular HttpClient jest przykładem cold źródła; nie generalizować tego na już uruchomiony Promise. Timer kończy automatycznie, interval przez rezygnację odbiorcy.

### Co uruchamia pracę? — `06-subskrypcja`

**EXTRAS — dodatkowy przykład definicji i subskrypcji.**

**Temat:** utworzenie zimnego Observable HTTP nie wysyła żądania.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 06-subskrypcja | Co uruchamia pracę? | `const data$ = http.get('/api/data')` |

**Na bloczkach:** „HTTP” (od początku z opisem „bez requestu”) i „Odbiorca”, który pojawia się dopiero przy subscribe w 6 s, jak na slajdzie HTTP z otwarcia części właściwej. Request zaczyna się przy subskrypcji w 6 s; odpowiedź i complete w 12 s. Podpisy rozróżniają deklarację Observable od jego wykonania.

**Speaker notes:**

> Przykład dotyczy zimnego Observable z Angular HttpClient. Nie generalizuj leniwości na już uruchomiony Promise.

### Hot: późny odbiorca — `06a-cold-hot-2`

**EXTRAS — samodzielny dodatek zachowujący historyczne ID wariantu hot.**

**Temat:** dołączenie do już działającego producenta, bez odtwarzania wcześniejszych wartości.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 06a-cold-hot-2 | Hot: dołączasz do działającego źródła | `hot: jeden timer → Subject → A i B` |

**Na bloczkach:** „wspólny timer” → „Subject” → „Odbiorca A” i „Odbiorca B”. Jeden producent. B dołącza w 6 s; w 7 s obaj dostają 2. B nie dostaje wcześniejszych 0 i 1.

**Speaker notes:**

> Jeden timer powstaje niezależnie od odbiorców i nadaje przez zwykły Subject. B dołącza w 6 s i odbiera 2 w 7 s. Hot nie oznacza replay.

### A jeśli wartością jest Observable? — `08-map-strumienie`

**Temat:** map może zwrócić Observable, a spłaszczenie wymaga subskrypcji.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 08-map-strumienie | A jeśli wartością jest Observable? | `source$.pipe(map(id => http.get(url(id))), concatAll())` |

**Na bloczkach:** source$ → map → concatAll → Odbiorca. Góra ma jeden główny tor S1, pastelowe nagłówki i execution lanes. Kulka A zmienia się w map w A$ — zimne Observable, nie rozpoczęty request. Dolny panel HTTP GET ma stałe wiersze #1 · A$, #2 · B$, #3 · C$. Utworzone B$ i C$ mają W KOLEJCE · Observable, bez portów, subskrypcji i postępu. Kolejne complete zwalniają miejsce na następny HTTP. Jeden request daje jedną odpowiedź; wynik A, B, C trafia do kompaktowego odbiorcy w dużych kolorowych kulkach z białymi literami.

**Speaker notes:**

- **Pytanie:** A$ pracuje, B$/C$ czekają — ile HTTP działa? Jeden.
- **map:** Tworzy zimne Observable; samo utworzenie nie uruchamia HTTP.
- **concatAll:** Subskrybuje po kolei: A$ → B$ → C$.
- **Różnica:** concatAll kolejkuje Observable; concatMap wartości przed projekcją.

### concatMap — `09-concatmap`

**Temat:** obsługa pracy po kolei.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 09-concatmap | concatMap — Po kolei | `source$.pipe(concatMap(id => http.get(url(id))))` |

**Na bloczkach:** source$ → concatMap → kompaktowy Odbiorca, jeden główny tor S1 w kolorze fioletowym. Źródło i operator mają stały pastelowy nagłówek oraz dynamiczny execution lane. Porty i połączenia są poziome; Wiersz źródła zawiera tylko S1, bez historii emisji. Odbiorca mieści cztery kulki stałego rozmiaru, powiększone o 18%, z białymi literami — po jednej odpowiedzi na request. Kolory prac i odpowiedzi: A indygo #6D4CD3, B pomarańcz #B85D05, C niebieski #087FAD, D malinowy #B73770. Porty, paski i linie zachowują tę paletę; progress jest delikatnym odcieniem pracy, a complete pozostaje jasnozielone. Poniżej poziomego separatora jest kafelek HTTP GET (PRACE WEWNĘTRZNE obok nagłówka), bez otaczającej ramki: stałe, przylegające wiersze #1 · A, #2 · B, #3 · C, #4 · D. Aktywna praca ma postęp w tle, porty i lokalne wyjście do prawej granicy. Oczekująca wartość ma placeholder W KOLEJCE bez inner, subskrypcji i progressu. Po complete poprzednika placeholder zmienia się w utworzoną pracę w tym samym slocie, potem startuje subskrypcja i progress. Nagłówek dolnej kolumny to HTTP GET. url(id) wybiera endpoint; każdy inner emituje jedną odpowiedź i complete. Wspólne wejście A, B, C, D; praca trwa 1,2 s od subskrypcji. Wynik A, B, C, D — jedna wartość na request.

**Speaker notes:**

- **Pytanie:** B przychodzi podczas A$ — czy powstało już B$? Nie.
- **Kolejka:** B/C/D czekają jako wartości; jeszcze bez projekcji i HTTP.
- **Moment:** Complete A$ → projekcja B → subskrypcja B$.
- **Wniosek:** Jedna praca naraz; kolejność zachowana, kolejka zwiększa opóźnienie.

### mergeMap — `10-mergemap`

**Temat:** równoległe wykonania strumieni wewnętrznych.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 10-mergemap | mergeMap — Równocześnie | `source$.pipe(mergeMap(id => http.get(url(id))))` |

**Na bloczkach:** source$ → mergeMap → kompaktowy Odbiorca, jeden główny tor S1. Szeroki panel HTTP GET ma przylegające wiersze #1–#4, osobne porty, kolory i postęp w tle. Każde wejście A/B/C/D natychmiast tworzy i subskrybuje HTTP, bez kolejki. Każdy request emituje jedną odpowiedź i complete. C pracuje 1,9 s, a D 0,9 s: nakładają się, lecz późniejszy D kończy przed C. Odbiorca mieści wszystkie cztery odpowiedzi A, B, D, C w kolejności dotarcia.

**Speaker notes:**

- **Pytanie:** A$ trwa, przychodzi B — czeka czy startuje? Startuje.
- **Równolegle:** Każde wejście uruchamia inner; domyślnie bez limitu współbieżności.
- **Kolejność:** C$ trwa dłużej, D$ kończy wcześniej: odpowiedź D dociera przed C.
- **Wniosek:** Odbiór według dotarcia; kolejność wejść nie gwarantuje kolejności wyników.

### switchMap — `11-switchmap`

**Temat:** nowa wartość zastępuje poprzednią subskrypcję wewnętrzną.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 11-switchmap | switchMap — Najnowsza subskrypcja | `id$.pipe(switchMap(id => http.get(url(id))))` |

**Na bloczkach:** id$ → switchMap → kompaktowy Odbiorca, jeden tor S1. Panel HTTP GET ma stałe, przylegające wiersze #1–#4. Postój przy B następuje, gdy HTTP A nadal pracuje. Dalej: unsubscribe A, szary wiersz „anulowane”, zatrzymany postęp i przygaszony kabel bez impulsu complete, następnie start B. Kolejne wejścia anulują B i C; tylko D dostarcza jedną odpowiedź i complete. Nagłówki definicji się nie zmieniają.

**Speaker notes:**

- **Pytanie:** B przychodzi podczas HTTP A — co stanie się z A$?
- **Moment:** Unsubscribe A$ → dopiero start B$; pasek A zatrzymany.
- **Wynik:** B/C/D zastępują poprzednika; tylko D dostarcza odpowiedź.
- **Pułapka:** ABORT klienta ≠ cofnięcie operacji serwera; unsubscribe ≠ complete.

### exhaustMap — `12-exhaustmap`

**Temat:** podczas aktywnej pracy ignorujemy nowe wejścia.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 12-exhaustmap | exhaustMap — Jestem zajęty | `source$.pipe(exhaustMap(id => http.get(url(id))))` |

**Na bloczkach:** source$ → exhaustMap → kompaktowy Odbiorca, tor S1 oraz panel HTTP GET. B i C podczas A zachowują identyfikatory i stałe oznaczenie „pominięte”, bez utworzonego HTTP, portów, kolejki i subskrypcji. Wiersze mają stałe sloty; D startuje po complete A. Każdy uruchomiony HTTP daje jedną odpowiedź; wynik A, D. Zakończone wiersze są jasnozielone z przygaszonymi połączeniami.

**Speaker notes:**

- **Pytanie:** A$ trwa, przychodzi B — czy powstanie B$? Nie.
- **Pominięcie:** B i C bez projekcji, inner i kolejki.
- **Moment:** Po complete A$ dopiero nowe D uruchamia D$.
- **Wniosek:** Trwająca praca ma pierwszeństwo; wynik A, D — po jednej odpowiedzi na request.

### source$: complete — `12a-complete`

**EXTRAS — poza główną ścieżką.**

**Temat:** complete źródła zewnętrznego nie kończy automatycznie pracy wewnętrznej.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 12a-complete | concatMap: complete czeka na kolejkę | `source$.pipe(concatMap(makeInner$))` |
| 12a-complete-2 | switchMap: complete czeka na ostatni inner | `source$.pipe(switchMap(makeInner$))` |

**Na bloczkach i w animacji:**

- concatMap: „source$”, „concatMap”, „A$”, „B$”, „Odbiorca”. source$ kończy się w 5 s, B nadal czeka, potem wykonuje się; wynik complete dopiero w 13 s.
- switchMap: odpowiedni operator „switchMap”; B zastępuje A, po complete source$ w 5 s aktywne B$ trwa dalej. Wynik complete w 10 s.
- Oba warianty pokazują stan source$ i wyniku oraz status „czeka na inner”.

**Speaker notes:**

- **Pytanie:** Źródło robi complete — czy wynik też już kończy?
- **concatMap:** Dokańcza aktywny inner i całą kolejkę.
- **switchMap:** Czeka na aktualny inner; jego complete kończy wynik.
- **Pułapka:** Complete źródła ≠ unsubscribe; inner bez końca może blokować complete wyniku.

### 100 zadań. Ile naraz? — `13-limit`

**EXTRAS — poza główną ścieżką.**

**Temat:** limit równoległych subskrypcji wewnętrznych.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 13-limit | 100 zadań. Ile naraz? | `mergeMap(request$, 3)` |

**Na bloczkach:** „mergeMap” z opisem „limit: 3”, zadania „A”, „B”, „C”, „D”, „E” i „Odbiorca”. A/B/C startują, D/E czekają na wolne miejsce. Liczniki „aktywne / 3” i „w kolejce”. Tytuł mówi o 100 zadaniach, diagram pokazuje pięć przykładowych.

**Speaker notes:**

- **Pytanie:** Pięć wejść, limit 3 — ile prac działa naraz?
- **Start:** A/B/C aktywne; D/E czekają jako wartości.
- **Moment:** Complete jednej pracy zwalnia miejsce następnej.
- **Wniosek:** Limit współbieżności ≠ limit requestów/s; kolejka nadal może rosnąć.

## Ograniczanie emisji i wyzwalanie pracy

### distinctUntilChanged — `14-distinct`

**Temat:** pomijanie kolejnych identycznych identyfikatorów przed kosztownym HTTP.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 14-distinct | Czy ten sam identyfikator wymaga kolejnego HTTP? | `map(x => x.id) → distinctUntilChanged() → mergeMap(http)` |

**Na bloczkach:** „id$” rozdziela się na „bez filtra” → „HTTP” i „distinctUntilChanged” → „HTTP”. Wejście A, A, B, B, A. Bez filtra 5 requestów, z filtrem 3; A po B przechodzi ponownie. Pytanie pada, gdy drugie A dolatuje do operatorów, zanim widać drugi request i liczniki. Liczniki pokazują obie liczby żądań. Kolor kapsułki należy do wartości (A pomarańczowe, B zielone) w obu potokach.

**Speaker notes:**

> Porównanie z ostatnią przepuszczoną wartością; domyślnie ===. Identyfikator jest prymitywem. To nie jest globalne usuwanie duplikatów.

### debounceTime, auditTime, throttleTime i sampleTime — `15-debounce-audit`

**EXTRAS — pełne porównanie czterech strategii.**

**Temat:** cztery sposoby ograniczania emisji na wspólnym strumieniu wejściowym.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 15-debounce-audit | Czekać na ciszę czy aktualizować w trakcie? | `debounceTime(3500) / auditTime(3500) / throttleTime(3500) / sampleTime(3500)` |

**Na bloczkach:** „zdarzenia$” rozdziela się na cztery operatory, każdy z własnym odbiorcą i historią wewnątrz bloczka. Okno 3,5 s: debounce czeka na ciszę, audit emituje ostatnią wartość okna, throttle przepuszcza pierwszą, sample odczytuje najnowszą w stałym rytmie. Przy postoju w 5 s throttle ma A, sample C, audit D, a debounce jeszcze czeka. Sample pomija pusty takt w 17,5 s. Statusy pokazują odliczanie lub otwarte okno.

**Speaker notes:**

> Przykład trwającego źródła, bez complete i error podczas pokazu. W aplikacji czasy często będą krótsze. Audit otwiera okno zdarzeniem, a debounce czeka na ciszę. Throttle przepuszcza pierwszą wartość i pomija kolejne przez 3,5 s (domyślnie leading: true, trailing: false). Sample odlicza takty od subskrypcji i emituje tylko wtedy, gdy od poprzedniego taktu przyszła nowa wartość. Pomijamy zdarzenia dokładnie na granicach okien.

### Cztery sposoby ograniczania emisji — `16-czas-cztery`

**MAIN:** debounceTime i auditTime na jednej planszy: jedno źródło, dwa operatory i dwóch odbiorców z osobnymi boxami wyników. Postoje: pytanie przed pierwszym wynikiem → D z audit podczas trwania wejścia → G z debounce po ciszy → AUTO do końca pokazu. **EXTRAS:** samodzielny auditTime pod dotychczasowym ID -2, throttleTime i sampleTime. W notes: wyszukiwanie po przerwie w pisaniu i aktualizacja podczas resize.

**Temat:** porównanie ciszy i okna na wspólnym wejściu oraz samodzielne przykłady pozostałych strategii w EXTRAS.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 16-czas-cztery | debounceTime i auditTime: cisza czy okno? | `debounceTime(3500) / auditTime(3500)` |
| 16-czas-cztery-2 | auditTime: ostatnia wartość okna | `auditTime(3500)` |
| 16-czas-cztery-3 | throttleTime: pierwsza wartość okna | `throttleTime(3500)` |
| 16-czas-cztery-4 | sampleTime: odczyt w stałym rytmie | `sampleTime(3500)` |

**Na bloczkach i w animacji:**

- „zdarzenia$” → „debounceTime” → „Odbiorca”: wynik po 3,5 s ciszy; nowe wejście odnawia odliczanie. Na postoju debounce przy źródle widać wychodzące H; podpis mówi, że znów zaczyna odliczanie.
- „zdarzenia$” → „auditTime” → „Odbiorca”: pierwsze wejście otwiera okno 3,5 s, na końcu przechodzi ostatnia wartość.
- „zdarzenia$” → „throttleTime” → „Odbiorca”: pierwsza wartość przechodzi, kolejne w oknie są pomijane; leading=true, trailing=false.
- „zdarzenia$” → „sampleTime” → „Odbiorca”: odczyt co 3,5 s od subskrypcji; brak nowej wartości oznacza brak nowej emisji.

**Speaker notes:**

> Wszystkie źródła pozostają aktywne. Sample nie jest replay co takt. Używamy domyślnych opcji throttleTime. Nie porównujemy wartości pojawiających się dokładnie w chwili końca okna.

### withLatestFrom a combineLatest — `17-latest`

**EXTRAS — poza główną ścieżką.**

**Temat:** które źródło może wyzwolić wynik?

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 17-latest | Kto ma prawo uruchomić pracę? | `klik$.pipe(withLatestFrom(filtry$))` |

**Na bloczkach:** „filtry$” i „klik$” zasilają „withLatestFrom” oraz „combineLatest”; każdy ma własnego „Odbiorcę”. withLatestFrom daje K1/F1, K2/F2; combineLatest dodatkowo K1/F2 i K2/F3 przy zmianach filtra. Liczniki pokazują liczbę wyników.

**Speaker notes:**

> Oba warianty potrzebują pierwszych wartości odpowiednich źródeł. withLatestFrom subskrybuje także źródła pomocnicze; nie odkłada ich subskrypcji do kliknięcia.

## Współdzielenie i zastosowania w UI

### Dwie subskrypcje — `18-async`

**EXTRAS — dodatkowe porównanie niezależne od frameworka.**

**Temat:** dwie subskrypcje tego samego zimnego Observable HTTP, bez współdzielenia i z share. Historyczne ID pozostają bez zmian.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 18-async | Dwie subskrypcje: dwa wykonania HTTP | `const user$ = http$; user$.subscribe(observerA); user$.subscribe(observerB);` |
| 18-async-2 | Dwie subskrypcje z share: jedno HTTP | `const user$ = http$.pipe(share()); user$.subscribe(observerA); user$.subscribe(observerB);` |

**Na bloczkach i w animacji:**

- Bez share: „HTTP A”, „HTTP B”, „Odbiorca A”, „Odbiorca B”. Dwa wykonania user$, dwie odpowiedzi i licznik 2 requestów.
- Z share: `data$` → `share()` → „Odbiorca A” i „Odbiorca B”. Źródło ma podpis zmiennej `data$`, a bloczek `share()` jest ukryty w READY i pojawia się fade-in przez 0,3 s po pierwszym prawie. Jedna odpowiedź „user” trafia do obu odbiorców; licznik 1 requestu. Po odpowiedzi końcowy podpis wspomina Angular async pipe oraz subscribe w React useEffect z unsubscribe przy sprzątaniu.

**Speaker notes:**

> Najpierw pokaż dwie zwykłe subskrypcje A i B. http$ oznacza zimne Observable HTTP, np. ajax.getJSON z rxjs/ajax. Obie subskrypcje zaczynają się przed odpowiedzią. share stosujemy raz do wspólnej instancji user$. Dopiero po porównaniu odnieś odbiorców do Angular async pipe albo subscribe w React useEffect ze sprzątaniem przez unsubscribe. W React zachowaj stabilną instancję user$ poza komponentami; nie twórz osobnego share w każdym efekcie. AsyncPipe zarządza własną subskrypcją, ale nie dodaje współdzielenia. share nie jest trwałym cache.

Podstawa wzmianki o cyklu życia: [Angular AsyncPipe](https://angular.dev/api/common/AsyncPipe), [React — synchronizacja i sprzątanie efektów](https://react.dev/learn/synchronizing-with-effects).

### share — `19-share`

**EXTRAS — poza główną ścieżką.** Osobny pokaz zachowany jako dodatek; MAIN porównuje niezależne i współdzielone wykonania na torach `04a`, a potem pokazuje późnego odbiorcę w parze share/shareReplay.

**Temat:** jedno wykonanie podczas nakładających się subskrypcji.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 19-share | share — wspólne wykonanie | `http$.pipe(share())` |

**Na bloczkach:** „HTTP” → „share()” → „Odbiorca A” i „Odbiorca B”. A dołącza w 1 s, B w 3 s; wspólne „dane” i complete w 7 s. Licznik 1 requestu.

**Speaker notes:**

> A i B mają nakładające się subskrypcje. share() nie gwarantuje jednego wykonania na zawsze ani cache dla późniejszych odbiorców.

### share a shareReplay — `20-sharereplay`

**Temat:** odbiorca dołączający po odpowiedzi i complete HTTP. share() współdzieli aktywne wykonanie, ale domyślnie (resetOnComplete: true) nie przechowuje wyniku po complete. Oba warianty używają wyglądu torów z cold/Subject. shareReplay({ bufferSize: 1, refCount: true }) ma dodatkowo małą kieszeń „bufor” pod kafelkiem operatora: późny odbiorca dostaje wartość z pamięci operatora, a nie z nowego requestu. Licznik requestów w obu wariantach opiera się na stanie wykonań.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 20-sharereplay | share: późny odbiorca uruchamia HTTP | `http$.pipe(share())` |
| 20-sharereplay-2 | shareReplay: późny odbiorca dostaje wynik | `http$.pipe(`<br>`  shareReplay({ bufferSize: 1, refCount: true }))` |

**Na bloczkach i w animacji:**

- share (tory jak cold): trzy kolumny HTTP GET → share() → kompaktowi odbiorcy A/B z inboxami, bez legendy i dodatkowych paneli. Jeden nagłówek „HTTP GET”, dwa wiersze wykonań: #1 (fioletowy, uruchomiony przez A) i #2 (pomarańczowy, uruchomiony przez B); porty HTTP, share() i odbiorców leżą na wspólnym Y toru. Kod `http$.pipe(share())` bez trwałych subscribe; chwilowe „.subscribe()” z literą A/B nad kolumną odbiorców trwa do dotarcia impulsu do HTTP. Kulki 42 mają kolor wykonania i odbiorcy: z HTTP #1 do A fioletowa, z HTTP #2 do B pomarańczowa (jak share 04a i Subject).
- Przebieg (czas modelu): A subskrybuje w 1 s, HTTP #1 emituje 42 w 5 s, complete w 6 s (zielony impuls, wiersze A w stanie completed, kable przygaszone). B pojawia się i subskrybuje dopiero w 7 s, uruchamia HTTP #2, które emituje nowe 42 w 11 s i kończy się w 12 s. B nie dostaje wyniku A. Licznik „Requesty HTTP”: 0 → 1 (po zestawieniu subskrypcji A) → 1 po complete → 2 (po zestawieniu subskrypcji B); next go nie zmienia.
- Postoje share: subscribed-a, received-a, complete-a, subscribed-b, complete-b, potem AUTO do FINISHED z podpisem podsumowania. Notatki prelegenta per checkpoint w `template[data-checkpoint-notes="20-sharereplay"]` (0–6, 45–60 s), jak w Subject.
- shareReplay (tory jak share): HTTP GET → shareReplay(1) → odbiorcy A/B. Jeden nagłówek „HTTP GET” i tylko jedno wykonanie #1 (fioletowe, uruchomione przez A); B nie dostaje toru HTTP. Pod kafelkiem shareReplay(1) wisi kieszeń „bufor” z jednym slotem (przerywany okrąg, gdy pusty), która zjeżdża razem z rosnącymi wierszami.
- Przebieg (czas modelu): A subskrybuje w 1 s i uruchamia HTTP #1; odpowiedź 42 w 5 s rozgałęzia się w wierszu A — jedna kulka jedzie do A, druga do kieszeni bufora (zapis równolegle z rozesłaniem). Complete w 6 s: tory A zakończone, bufor nadal zawiera 42 (refCount: true nie czyści wyniku zakończonego źródła). B subskrybuje w 7 s tylko do shareReplay(1); po zestawieniu subskrypcji kopia 42 wyjeżdża z kieszeni do portu B i trafia do odbiorcy B, potem complete. Kulki w kolorach odbiorców (A fioletowa, B pomarańczowa), w buforze wartość z wykonania #1. Licznik „Requesty HTTP”: 0 → 1 i zostaje 1.
- Postoje shareReplay: subscribed-a, request (HTTP w trakcie, bufor pusty), stored (A i bufor mają 42), complete-a, subscribed-b (przed wyjęciem z bufora), replayed (B ma 42 i complete), potem AUTO do FINISHED z podpisem podsumowania. Notatki per checkpoint w `template[data-checkpoint-notes="20-sharereplay-2"]` (0–7, 45–60 s).

**Speaker notes:**

> share (notatki per checkpoint): A uruchamia HTTP #1, które zwraca 42 i kończy się; share resetuje się po complete, więc późny B uruchamia HTTP #2 — ta sama definicja, nowy request; ostatecznie obaj mają 42, ale były dwa requesty. Przejście do shareReplay. shareReplay (notatki per checkpoint): A uruchamia jedno HTTP; 42 trafia do A i jednocześnie do bufora; request się kończy, wartość zostaje; późny B dostaje ją od razu z bufora, bez nowego HTTP. Kluczowa różnica względem share(): jeden request, a późny odbiorca nadal dostaje wynik. shareReplay({bufferSize:1,refCount:true}) zachowuje wynik poprawnie zakończonego źródła (wewnętrzny ReplaySubject); refCount: true nie usuwa tego bufora. Wersja RxJS 7.8.2.

### Kosztowny map: bez share i z share — `21-share-miejsce`

**EXTRAS — poza główną ścieżką.**

**Temat:** czy obliczenie wykonuje się osobno dla każdego odbiorcy?

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 21-share-miejsce | Bez share: obliczenia dla każdego odbiorcy | `subject$.pipe(map(expensive))` |
| 21-share-miejsce-2 | map przed share: jedno wspólne obliczenie | `subject$.pipe(map(expensive), share())` |

**Na bloczkach i w animacji:**

- Bez share: „Subject” → dwa „map(expensive)” → „Odbiorca A” / „Odbiorca B”. Trzy emisje A/B/C dają 6 wywołań expensive.
- Z share: „Subject” → jedno „map(expensive)” → „share()” → „Odbiorca A” i „Odbiorca B”. Te same emisje dają 3 wywołania expensive.

**Speaker notes:**

> Źródłem jest jeden Subject. Dwóch odbiorców subskrybuje przed pierwszą emisją. Bez share mają dwa wykonania map(expensive) na każde next. share umieszczone za map współdzieli także kosztowne obliczenie i przekazuje ten sam wynik obu odbiorcom. Podświetlenie przez 0,9 s symbolizuje koszt, nie opóźnienie map. Callback map pozostaje synchroniczny.

### Pozycja share w pipe — `21a-share-pozycja`

**EXTRAS — poza główną ścieżką.**

**Temat:** miejsce granicy współdzielenia zmienia liczbę obliczeń.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 21a-share-pozycja | map przed share: wspólne obliczenie | `subject$.pipe(map(expensive), share())` |
| 21a-share-pozycja-2 | map za share: osobne obliczenia | `subject$.pipe(share(), map(expensive))` |

**Na bloczkach i w animacji:**

- map przed share: „Subject” → „map(expensive)” → „share()” → „Odbiorca A” i „Odbiorca B”. Jedno obliczenie na emisję, 3 łącznie.
- map za share: „Subject” → „share()” → osobne „map(expensive)” → „Odbiorca A” / „Odbiorca B”. Dwa obliczenia na emisję, 6 łącznie.

**Speaker notes:**

> Paski czasu przy map są ilustracją kosztu, nie asynchroniczną zmianą semantyki map. Obaj odbiorcy subskrybują przed pierwszą emisją.

### refCount — `22-refcount`

**EXTRAS — dalszy blok o czasie życia współdzielenia.**

**Temat:** co dzieje się z długotrwałym źródłem po odejściu odbiorców?

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 22-refcount | refCount: false — timer działa po odejściu | `interval(3000).pipe(shareReplay({bufferSize: 1, refCount: false}))` |
| 22-refcount-2 | refCount: true — ostatni odbiorca odłącza źródło | `interval(3000).pipe(shareReplay({bufferSize: 1, refCount: true}))` |

**Na bloczkach i w animacji:**

- false: „interval” → „shareReplay(1)” z „refCount: false” → „Widok A” i „Widok B”. Po odejściu A w 7 s i B w 10 s timer nadal emituje. Status „nadal emituje!”, komunikat „0 odbiorców → zasoby nadal zajęte”, licznik emisji bez odbiorców.
- true: te same bloczki z „refCount: true”. Odejście ostatniego widoku w 10 s odłącza źródło. Status „zatrzymany”, komunikat „0 odbiorców → źródło odłączone”.

**Speaker notes:**

> Przykład interval, które nie kończy się samo, z poprawnym teardown. A znika w 7 s, B w 10 s; oba async odsubskrybowują. Przy refCount:false shareReplay nadal utrzymuje subskrypcję źródła, więc timer pracuje bez odbiorców. To ryzyko niechcianego zatrzymania zasobów i wycieku, a nie dowód liniowego wzrostu pamięci: bufferSize wynosi 1. Przy true ostatnie unsubscribe rozłącza źródło. Skończone HTTP i jego cache to inna sytuacja.

### Jeden async z aliasem — `23-angular-alias`

**EXTRAS — poza główną ścieżką.**

**Temat:** jeden wynik użyty w wielu miejscach jednego szablonu.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 23-angular-alias | Jeden wynik w kilku miejscach widoku | `@if (user$ \| async; as user) { … user … user … }` |

**Na bloczkach:** „HTTP” → „async · alias user” → „UI · A”, „UI · B”, „UI · C”. Jeden wynik „user” i jedna subskrypcja HTTP; nad diagramem kod `@if` z aliasem.

**Speaker notes:**

> To alternatywa dla wielu async w jednym zakresie szablonu. Dla niezależnych odbiorców nadal może być potrzebne współdzielenie. user jest w przykładzie obiektem.

### A co z signals? — `24-signals`

**EXTRAS — poza główną ścieżką.**

**Temat:** jedno toSignal subskrybuje Observable i udostępnia stan.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 24-signals | A co z signals? | `const user = toSignal(user$)` |

**Na bloczkach:** „HTTP” → „toSignal” → „user()”. Początkowo stan undefined, po odpowiedzi „dane”; kolejne odczyty w 8/12/16 s. Liczniki requestów i odczytów signala.

**Speaker notes:**

> Twórz toSignal raz i używaj wyniku. Przykład bez initialValue, więc przed pierwszą emisją jest undefined. Domyślne sprzątanie subskrypcji wiąże się z kontekstem zniszczenia.

## EXTRAS: praktyczny przykład resolvera metadanych

### Problem: brak pełnej nazwy właściciela — `26-resolver-problem`

**Na ekranie:** GET /api/items → getOrEnqueue → cache/pending; trafienie X uzupełnia store. Diagram reprezentuje 100 elementów przez powtarzające się ownerId A, B, A, C, X. Postój po dotarciu listy pozwala zapytać, jak uniknąć 100 HTTP.

**Speaker notes:** Lista ma ownerId, ale nie ownerFullName. Trafienie cache jest natychmiastowe; brak dopisujemy do wspólnego pending. To krok wzbogacania danych, nie request na każdą komórkę widoku.

### Jeden microtask — `27-resolver-microtask`

**Na ekranie:** items.forEach → pending Set → microtask / resolveMany. A, B, A, C pojawiają się w tej samej turze synchronicznej; Set zawiera A, B, C. Licznik zaplanowanych microtasków wynosi 1. Po zakończeniu pętli flush przekazuje unikalne ID.

**Speaker notes:** Pierwszy miss planuje Promise.resolve().then(flushQueue). Kolejne wywołania przed końcem bieżącego kodu dopisują ID do tego samego zbioru. Microtask nie wyznacza jeszcze chwili wysłania HTTP — tym zajmuje się drugi, niezależny poziom batchowania.

### Wspólne HTTP, osobne komplety — `28-resolver-batch`

**Na ekranie:** resolveMany([A,B,C]) i resolveMany([C,D,E]) → cache/in-flight → bufferTime 250 ms → HTTP batch → dwa forkJoin → Map. C korzysta z istniejącego in-flight; jeden fizyczny request zawiera A…E. Każde wywołanie dostaje własny komplet, który uzupełnia store.

**Speaker notes:** Długowieczna subskrypcja otwiera okna bufferTime od początku działania resolvera. W przykładzie maxBatchSize = 10; okno 250 ms zbiera pięć ID. Limit wielkości może opróżnić bufor wcześniej i rozpocząć nowe okno. Puste paczki są filtrowane. Każdy resolve(id) emituje wynik i kończy się, więc forkJoin może złożyć Map. Puste resolveMany jawnie zwraca pustą Map — samo forkJoin([]) kończy bez emisji. Błąd wspólnej paczki dociera do wszystkich zależnych wywołań; przykład nie udaje pełnej polityki retry/cache TTL. Sprzątanie dotyczy długowiecznej subskrypcji resolvera.

Modele są symulacją dydaktyczną, nie usługą produkcyjną. Testy sprawdzają także wcześniejszy flush po limicie rozmiaru, późne wywołanie w istniejącym oknie, współdzielenie C, błąd oraz puste wejście. Semantyka: [bufferTime w RxJS 7.8.2](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/bufferTime.ts), [forkJoin w RxJS 7.8.2](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/observable/forkJoin.ts).

### Cztery pytania przed kolejnym pipe — `25-podsumowanie`

**Temat:** pytania pomagające dobrać operatory do rzeczywistej potrzeby.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 25-podsumowanie | Cztery pytania przed kolejnym pipe | Brak; karty podsumowania. |

**Na bloczkach:** cztery pojawiające się karty: „Czy trzeba?”, „Kiedy zacząć?”, „Co z poprzednią pracą?”, „Czy można współdzielić?”. Podpisy przypominają kolejno distinctUntilChanged; debounceTime/auditTime; concatMap/mergeMap/switchMap/exhaustMap; share/shareReplay.

**Speaker notes:**

> Zakończ pytaniami, które publiczność może zastosować we własnym kodzie. Przywróć tytułową analogię znajomości operatorów.

## Pytania i dodatkowe przykłady

### Pytania? — `pytania`

**Temat:** zakończenie głównej części i wybór dodatków.

**Na ekranie:** koniec MAIN i pogrupowane menu EXTRAS. Wyróżnione wejście do dogrywki otwiera complete outer, potem drugi wariant i limit współbieżności. Pilot nie przechodzi automatycznie z MAIN do dodatków. Każdy dodatek ma link powrotny „Dodatkowe przykłady”.

**Speaker notes:** Zaproś do pytań. Jeśli ich nie ma: „Zobaczmy jeszcze kilka sytuacji”. Otwórz dogrywkę i prowadź trzy kolejne przykłady pilotem. Po limicie współbieżności jest naturalny punkt zakończenia; można wrócić do menu albo wybrać następny temat.

### defer — `b01-defer`

**EXTRAS — poza główną ścieżką.**

**Temat:** odczyt wartości podczas budowania Observable lub dopiero przy subskrypcji.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b01-defer | Kiedy odczytujesz wartość? | `of(token) vs defer(() => of(token))` |

**Na bloczkach:** „token” (A, później B), „of(token)”, „defer(() => of(token))” i dwa bloczki „Odbiorca”. Po zmianie zmiennej subskrypcja of dostaje A, a defer B.

**Speaker notes:**

> defer jest funkcją tworzącą Observable. Każda subskrypcja wywołuje fabrykę. Przykład izoluje czas odczytu zmiennej, nie czas odpowiedzi HTTP.

### first() i take(1) — `b02-first-take`

**EXTRAS — poza główną ścieżką.**

**Temat:** podobieństwo przy pierwszej wartości i różnica przy pustym źródle.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b02-first-take | Pierwsza wartość: take(1) i first() | `of('A').pipe(take(1)) / of('A').pipe(first())` |
| b02-first-take-2 | Puste źródło: take(1) kończy, first() zgłasza błąd | `EMPTY.pipe(take(1)) / EMPTY.pipe(first())` |

**Na bloczkach i w animacji:**

- Z wartością: niezależne „take(1) · wartość” i „first() · wartość”, każdy z „Odbiorcą”. Oba przekazują A i complete.
- Pusto: „take(1) · pusto” i „first() · pusto”, każdy z „Odbiorcą”. EMPTY: take(1) kończy bez wartości, first() zgłasza EmptyError.

**Speaker notes:**

> first bez wartości domyślnej. Gdy źródło milczy i nie kończy się, oba czekają. null jest wartością. Wiersze są niezależnymi przykładami.

### bufferTime — `b03-buffertime`

**EXTRAS — poza główną ścieżką.**

**Temat:** zachowanie wszystkich zdarzeń i wysyłanie ich w paczkach.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b03-buffertime | Potrzebuję wszystkich zdarzeń — w paczkach | `bufferTime(6000) → filter(xs => xs.length > 0) → HTTP` |

**Na bloczkach:** „zdarzenia” → „bufferTime()” → „HTTP · paczka” → „Odbiorca”. Odbiorca subskrybuje od początku (odbiorca → HTTP → bufferTime → zdarzenia), a okno bufferTime otwiera się dopiero po zestawieniu subskrypcji. A/B/C tworzą ABC, D/E tworzą DE, F osobną paczkę. Okna 6 s; 6 zdarzeń, 3 zbiorcze requesty. Kod nad diagramem zawiera też filtr pustych paczek.

**Speaker notes:**

> Zwykłe nienakładające się okna bufferTime. Odfiltruj puste paczki. Potrzebny jest endpoint obsługujący paczki; trzeba osobno zaprojektować błędy i powtórki.

### catchError — `b04-catcherror`

**Temat:** miejsce obsługi błędu wpływa na kolejne zapytania.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b04-catcherror | catchError na zewnątrz | `klik$.pipe(switchMap(() => http$), catchError(() => of([])))` |
| b04-catcherror-2 | catchError wewnątrz | `klik$.pipe(switchMap(() => http$.pipe(catchError(() => of([])))))` |

**Na bloczkach i w animacji:**

- Na zewnątrz: górny potok „klik$” → „switchMap” → „catchError” → „Odbiorca”. W ramce poniżej HTTP A; błąd dociera przez switchMap do zewnętrznego catchError. Odbiorca otrzymuje [] i complete. Klik B pozostaje przy odłączonym źródle, bez utworzenia HTTP B.
- Wewnątrz: górny potok „klik$” → „switchMap” → „Odbiorca”. Ramka prac pokazuje osobno HTTP A → catchError → [] i późniejsze HTTP B → catchError → B. Complete dotyczy tylko inner; po wynikach [] i B odbiorca nadal subskrybuje kliknięcia.
- HTTP A pokazuje „× error” w chwili wysłania błędu; klik$ zostaje odłączony dopiero po dotarciu błędu do switchMap. Zewnętrzny catchError robi się zielony („✓ complete”) dopiero po wysłaniu complete za [].
- Error jest oznaczony podpisem i czerwonym obramowaniem pracy. Ręczne postoje: HTTP A pracuje → błąd → [] i pytanie o klik B. Kolejny krok uruchamia AUTO do wyniku. Historia odbiorcy zmienia się po dotarciu wartości. Licznik pokazuje 1 lub 2 requesty.

**Speaker notes:**

> Porównaj położenie catchError: osobny operator za switchMap albo operator wewnątrz ramki każdego HTTP. http$ jest zimnym Observable, a każde kliknięcie tworzy jego nową subskrypcję. Ręczne postoje pokazują pracę A, błąd i wynik zastępczy []. W obu wariantach catchError subskrybuje of([]), które emituje i kończy się. Na zewnątrz kończy się cały wynik, a subskrypcja klik$ znika. Klik B nadal może wystąpić w źródle, lecz nie uruchamia HTTP B. Wewnątrz kończy się tylko inner A: kolejne kliknięcie uruchamia HTTP B z własnym catchError i przekazuje wynik B. Przerywana linia wskazuje zakres prac tworzonych przez switchMap; nie jest subskrypcją. Nie sugeruj, że każdy zewnętrzny catchError zawsze kończy wynik: tutaj wynika to z wyboru of([]).

Semantyka zastępowania błędu: [implementacja catchError w RxJS 7.8.2](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/catchError.ts).

### finalize — `b05-finalize`

**EXTRAS — poza główną ścieżką.**

**Temat:** sprzątanie zakresu subskrypcji przy trzech sposobach zakończenia.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b05-finalize | finalize po complete | `request$.pipe(finalize(cleanup))` |
| b05-finalize-2 | finalize po error | `request$.pipe(finalize(cleanup))` |
| b05-finalize-3 | finalize po unsubscribe | `request$.pipe(finalize(cleanup))` |

**Na bloczkach i w animacji:** każdy wariant ma „HTTP” → „Odbiorca”. Osobno pokazujemy complete, error i unsubscribe. W każdym przypadku licznik finalize zmienia się w `cleanup()`; przy unsubscribe dzieje się to mimo braku callbacku complete.

**Speaker notes:**

> finalize sprząta dany zakres subskrypcji. Przy wielu równoległych requestach jedna wspólna flaga loading może wymagać licznika.

### forkJoin — `b06-forkjoin`

**EXTRAS — poza główną ścieżką.**

**Temat:** jeden zestaw wyników po zakończeniu wszystkich żądań.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b06-forkjoin | Czekam na komplet zakończonych żądań | `forkJoin({ user: user$, roles: roles$, settings: settings$ })` |

**Na bloczkach:** „user$”, „roles$”, „settings$” → „forkJoin” → „Odbiorca”. Wyniki U, R, S kończą się w różnym czasie; dopiero ostatni daje U/R/S i complete.

**Speaker notes:**

> Każde wejście musi wyemitować co najmniej raz i poprawnie się zakończyć. W RxJS 7.8.2 wejście kończące się bez wartości daje zakończenie bez wyniku. Błąd przerywa całość.

### zip — `b07-zip`

**EXTRAS — poza główną ścieżką.**

**Temat:** parowanie według numeru emisji.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b07-zip | Pierwsze z pierwszym. Drugie z drugim. | `zip(fast$, slow$)` |

**Na bloczkach:** „fast$”, „slow$” → „zip” → „Odbiorca”. Pary A1/B1, A2/B2, A3/B3; szybkie wartości czekają na wolne. Licznik „czeka w fast$”.

**Speaker notes:**

> Przy nierównym tempie źródeł bufor może rosnąć. Źródła są tu skończonymi przykładami zdarzeń, a ich complete pominięto dla czytelności.

### merge — `b08-merge`

**EXTRAS — poza główną ścieżką.**

**Temat:** kilka istniejących strumieni jako źródło odświeżenia.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b08-merge | Kilka powodów do odświeżenia | `merge(button$, timer$, saved$)` |

**Na bloczkach:** „przycisk”, „timer”, „zapis” → „merge” → „Odbiorca”. W kolejności nadejścia: klik, tick, saved, klik. Bez parowania i bez zestawu najnowszych wartości.

**Speaker notes:**

> merge łączy emisje istniejących strumieni. mergeMap dodatkowo mapuje wartości na strumienie wewnętrzne. W przykładzie źródła nie kończą się podczas animacji.

### pairwise — `b09-pairwise`

**EXTRAS — poza główną ścieżką.**

**Temat:** porównanie bieżącej wartości z poprzednią.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b09-pairwise | Co zmieniło się od poprzedniej wartości? | `position$.pipe(pairwise())` |

**Na bloczkach:** „pozycja$” → „pairwise()” → „map · różnica”. Pozycje 10, 15, 12, 20; pary 10→15, 15→12, 12→20; różnice +5, −3, +8. Pierwsza pozycja sama nie tworzy pary.

**Speaker notes:**

> pairwise emituje nakładające się pary kolejnych wartości. Przy obiektach mutowanych w miejscu nadal trzeba uważać na współdzielone referencje.

## Gdzie jest źródło treści

- `index.html`: statyczne slajdy, kolejność i speaker notes (`<aside class="notes">`).
- `animations/catalog.js`: wartości, czasy, podpisy pod diagramem, liczniki i dane scen.
- `animations/reference-scenes.js`, `catch-scenes.js`, `scene-config.js`, `resolver-scenes.js`: konfiguracje rodzin, zakresy catchError, postoje i finał resolvera.
- `animations/presentation.js`: końcowe tytuły i warianty tworzonych slajdów.
- `public/`: fotografie, plakaty, logo i QR.

Scena `01-tytul` istnieje w katalogu, ale nie jest podpięta do slajdów; widoczny tytuł to statyczny `#tytul`. Spis dokumentuje aktualną treść repozytorium, łącznie z historycznymi datami i planami podanymi na slajdach.

## Weryfikacja i podgląd

Wszystkie animowane warianty korzystają z jednego kompilatora, renderera SVG i odtwarzacza. Panel prac wewnętrznych ma lokalne poziome połączenia, bez stałych przewodów między górą a dołem slajdu. Kolejka jest szara od pierwszej klatki. Panel jest wspólnym prymitywem: pasek pracy, complete, kolejka i anulowanie mają również opis tekstowy. Na migrowanych slajdach diagram zajmuje większą część ekranu, a podpis jest w dolnej stopce; w pozostałych scenach zachowano dotychczasowe proporcje.

Podgląd developerski: /work/animation-review.html (lokalna konfiguracja Vite ma base `/`; build ma `/rxjs-operatory/`) — wybór sceny i formatu (4:3/16:9), READY, pytanie, FINISHED i audyt granic tekstu. Uruchom npm test oraz npm run build po zmianach animacji. Próba na fizycznym projektorze i próba 30–35 minut części właściwej wymagają prelegenta; otwarcie i dogrywka są dodatkowo.

## Zaakceptowany układ rodziny *Map

Slajdy MAIN 08–12 korzystają ze wspólnego adaptera `configureHttpWorkPanel` na bazie `flattenGraph`. Góra pokazuje jeden S1 z execution lanes, pastelowymi nagłówkami i kolorowymi poziomymi połączeniami. Źródło nie trzyma historii emisji; do czterech odpowiedzi HTTP mieści się w kompaktowym odbiorcy. Kulki mają białe litery i pełną paletę A indygo #6D4CD3 / B pomarańcz #B85D05 / C niebieski #087FAD / D malinowy #B73770. Tę samą paletę mają porty, paski i linie prac; progress jest łagodniejszy, complete jasnozielone.

Dół zajmuje ponad 90% szerokości diagramu: poziomy separator, kafelek HTTP GET pod źródłem i operatorem (nagłówek tej samej wysokości co u góry, wiersze prac jak tory: pasek koloru, #1 · A, postęp w tle, stan tekstem) oraz napis PRACE WEWNĘTRZNE obok nagłówka, nad kablami wyników. Postęp HTTP kończy się z odpowiedzią. Nie ma zaokrąglonego kontenera ani przewodów między poziomami. Wynik wychodzi do prawej granicy panelu, a dopiero potem z górnego operatora do odbiorcy. Każdy zakończony request daje jedną odpowiedź; anulowany nie daje complete. concatAll kolejkuje już utworzone Observable (#2 · B$, W KOLEJCE · Observable); concatMap kolejkuje wartości przed projekcją. mergeMap uruchamia równoległe wiersze i zachowuje odpowiedź D przed C. switchMap szarzy anulowane prace bez terminalnego impulsu. exhaustMap zachowuje wiersze pominiętych wejść z identyfikatorami i napisem „pominięte”, bez inner i kolejki.

Dodatki 12a/13-limit i prototypy QA zachowują poprzednie modele oraz geometrię. Cold/share i catchError również pozostają bez zmian; dodatkowa obsługa catchError w nowym panelu jest odłożona.

W concatMap B pojawia się jako wartość W KOLEJCE; dopiero po complete poprzednika powstaje B$ i jego subskrypcja. concatAll pokazuje istniejące B$ i C$ czekające bez subskrypcji; wpis kolejki wchodzi z fade-in dopiero, gdy Observable utworzone przez map dotrze do concatAll. Wiersze zakończone pozostają zielone; pominięte wejścia exhaustMap nie tworzą wykonań. Standardowa siatka ma cztery miejsca; przykład limitu używa pięciu. Kapsułki emisji i odbioru wchodzą przez 0,3 s. Postęp jest wyliczany w czasie ilustracji; w MAIN 08–12 kulka najpierw przechodzi po lokalnym wyjściu do prawej granicy panelu, a potem wychodzi z operatora. Dodatki i prototypy zachowują krótki, niewidoczny powrót.

Liczniki uruchomionych i aktywnych inner korzystają ze stanu faktycznych subskrypcji. Sceny z tej rodziny trzymają nieruchomy wynik również w EXTRAS. Nawigacja i postoje Reveal rodziny flatteningu pozostają dotychczasowe. Kontroler `stages` działa w podglądzie prototypów oraz w przebudowanym wprowadzeniu (04, wszystkie 05, oba 20). Spacja pauzuje/wznawia także pozostałe animacje, bez zmiany natywnej obsługi statycznego otwarcia. Zachowano identyfikatory i działające demonstracje; kolejność części właściwej odpowiada opisanej wyżej narracji 30–35 minut.

Na migrowanych slajdach diagram zajmuje 480 px wysokości. Większe kafelki mają 76 px wysokości, a odstęp do paneli 60 px; wiersze prac w dodatkach są rozdzielone o 20 px, a MAIN 08–12 ma przylegające wiersze nowego panelu. Mniejszy podpis i liczniki są w stopce przy dole slajdu. U pokazuje kontrolki w miejscu stopki; ukrycie kontrolek przywraca podpis.

W `map + concatAll` górny pipeline ma cztery poziome kolumny: source$ → map → concatAll → odbiorca. kulka A wjeżdża do map, zatrzymuje się na 1,4 s i zmienia w A$ (jak 21 → 42 w 04a), bez czasowego progressu. Tempo całej rodziny 08–12 odpowiada 04a: krok subscribe 0,8 s, przelot 1 s, terminal 0,8 s. Oczekujące wiersze pojawiają się dopiero po dotarciu A$/B$/C$ do concatAll.

W MAIN 08–12 przy complete zielony staje się execution lane, a nagłówek definicji pozostaje pastelowy. Pozostałe migrowane sceny zmieniają tło całego kafelka przy własnym complete. Źródło może zakończyć się wcześniej; *Map pozostaje aktywne aż do zakończenia wymaganych inner i kolejki. Nieobsłużony error daje czerwony operator, a odsubskrybowane źródło zachowuje swój kolor.


Płaski styl kafelków obejmuje 04-operator, całą rodzinę 05-zrodla, 04a-dwa-tory (cold, share, share-unsub), 06a-cold-hot-2 (hot w EXTRAS) oraz slajdy 08–12 (map + concatAll, concatMap, mergeMap, switchMap i exhaustMap): klasa `rx-flat-tiles` w scene.playerClass (player przyjmuje kilka klas rozdzielonych spacją; 04a ma `rx-lanes rx-flat-tiles`, hot dostaje ją w configureScene) usuwa obrys i zaokrąglenie głównego prostokąta kafelka. Boksy historii (data-panel-box) w tych slajdach też są płaskie, z ciemniejszym tłem #ECE6DA zamiast ramki. Panel prac 08–12 jest rysowany płasko natywnie. Placeholder kolejki zachowuje przerywany obrys. Geometria, fonty, porty, progress, stany i animacje pozostają bez zmian; pozostałe slajdy nie otrzymują tej klasy.
