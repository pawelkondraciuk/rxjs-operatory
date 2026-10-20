# RxJS — Operatory, które znasz, ale bałeś się zagadać

Polska prezentacja Pawła Kondraciuka o sterowaniu pracą, kolejnością, subskrypcjami i współdzieleniem w RxJS. Podstawowy przykład współdzielenia jest niezależny od frameworka; po nim wspominamy zastosowania w Angularze i React. Otwarcie przypomina historię meet.js Białystok; część techniczna używa animowanych bloczków i wartości.

Ten README jest mapą treści: opisuje slajdy, zawartość bloczków i speaker notes. Implementację animacji, mapę plików i używane API znajdziesz w [AGENTS.md](AGENTS.md).

Pełny eksport notatek do weryfikacji dla 24 slajdów technicznych MAIN znajduje się w [work/speaker-notes-main.md](work/speaker-notes-main.md). Dokument uwzględnia aktualną kolejność, końcowe tytuły wariantów i wszystkie notatki checkpointów, od slajdu po „A share?” do podsumowania przed „Pytania?”.

## Uruchomienie i obsługa

```sh
npm ci
npm run dev
```

Otwórz adres podany przez serwer ze ścieżką `/rxjs-operatory/`. `npm run build` buduje prezentację, `npm run preview` uruchamia podgląd zbudowanej wersji. `S` otwiera widok prelegenta z notatkami, `Esc` widok wszystkich slajdów. Strzałki i Page Up/Page Down obsługują nawigację Reveal.js; fragmenty odsłaniają zdjęcia i listy.

Sceny MAIN z pytaniami zaczynają od nieruchomego READY. Prawo / Page Down uruchamia kolejny etap do postoju; ponowne naciśnięcie podczas ruchu natychmiast pokazuje koniec tego etapu i zatrzymuje animację. Następny klik uruchamia kolejny etap; lewo cofa. Pomijanie ruchu działa również przyciskiem „dalej” i pilotem. Dopiero następny klik po ostatnim pytaniu uruchamia AUTO na tym samym slajdzie. Automat zatrzymuje się na wyniku FINISHED. U pokazuje dolne sterowanie, A przechodzi z ręcznego do auto lub pauzuje/wznawia auto, M zmienia tryb, [ i ] zmieniają krok, R zaczyna od początku. Sceny wprowadzające z kontrolerem stages w AUTO kończą bieżący etap i pozwalają cofać checkpointy; R przywraca zatrzymany READY. Spacja pauzuje lub wznawia aktywną animację, a zdjęcia i statyczne otwarcie zachowują natywne sterowanie. W pozostałych scenach w AUTO prawo / Page Down najpierw pokazuje nieruchomy wynik całej animacji; dopiero kolejne naciśnięcie zmienia slajd. Dotyczy to również pilota i przycisków „dalej”. Lewo wraca do poprzedniego slajdu. Tryb, postój i pauza są pamiętane przy powrocie. EXTRAS domyślnie powtarzają pokaz, z wyjątkiem rodzin mających własne postoje.

W oknie prelegenta (`S`) podgląd następnego slajdu domyślnie pokazuje dużą nazwę, np. **switchMap**, i krótki podtytuł. Wskazuje kolejny slajd, także podczas ręcznych postojów bieżącej animacji. Przełącznik **Podgląd: Tytuł / Slajd** w prawym dolnym rogu tego pola przywraca standardowy podgląd. Wybór jest zapamiętywany w przeglądarce. Notatki pozostają w standardowym polu Notes. Opcjonalne `data-speaker-title` na sekcji ustawia własny podpis wyłącznie dla prelegenta.

Dopisanie `?print-pdf` przed hashem ustawia wszystkie animacje, łącznie z EXTRAS, w końcowych nieruchomych kadrach bez kontrolek. Reveal drukuje też kolejne fragmenty pełnego otwarcia na osobnych stronach: obecnie 42 slajdy dają 60 stron PDF (także pięć stanów kodu `05b-http-kod`: bez wyróżnienia i cztery wyróżnione fragmenty, oraz trzy stany pełnego kodu `04b-map-kod`: bez wyróżnienia i dwa kolejne wyróżnienia).

Domyślny format to 4:3 (scena 1280×960) pod projektor 4:3. `?ratio=16:9` przywraca ekran panoramiczny 1280×720. `W` przeładowuje stronę w drugim formacie, zostając na tym samym slajdzie i fragmencie; animacja wraca do stanu tego fragmentu. Linki do EXTRAS i powrót do pytań zachowują wybrany format. Druk działa w obu: `?print-pdf` (4:3) lub `?print-pdf&ratio=16:9`. W 4:3 slajdy wykorzystują pełną wysokość: większe zdjęcia i kody QR, wyższe diagramy, większy tekst i kapsułki w animacjach (×1,15), etykiety kafelków do ×1,3 oraz większy tytuł (64 px; za długi zmniejsza się, by został w jednej linii), kod (42 px, długi łańcuch przechodzi do nowej linii przed .pipe/.subscribe) i podpis.

`12a-switchmap-live` („Wybór operatora”) po slajdzie źródła query$ czeka z ukrytą nazwą operatora. Pierwsze prawo/Page Down/pilot odsłania switchMap i uruchamia ciągły pokaz; kolejne przechodzi do debounceTime. Lewo wraca do źródła query$. Spacja uruchamia lub pauzuje/wznawia, R i ponowne wejście przywracają zamaskowany READY. Badge pozostaje „Ręczny · M”, dopóki prelegent nie zmieni trybu. Druk, F i Upcoming pokazują #3 (rea) zakończony, #4 (re) anulowany i #5 (r) aktywny.

`12b-debounce-switchmap` kontynuuje wyszukiwarkę: ręczne etapy pokazują subskrypcję, timer, pierwszy HTTP i pisanie podczas requestu. Do drugiej emisji debounceTime (ponownie `rea`) prawo odtwarza etap, a ponowne prawo w ruchu kończy bieżący. Od drugiego HTTP pokaz płynie bez końca, a prawo od razu prowadzi do distinctUntilChanged. Wszystkie HTTP kończą się sukcesem i complete inner; główny pipeline nadal działa. Lewo cofa do ręcznego postoju, Spacja pauzuje/wznawia, R i ponowne wejście przywracają zatrzymany początek. Druk, F i Upcoming pokazują trzy zakończone HTTP (rea, rea, r), liczniki 10/3/0.

## Jak czytać spis

Porównania są osobnymi slajdami. Warianty z sufiksami -2/-3/-4 powstają podczas uruchamiania; pierwszy zachowuje ID bazowe. Poniżej podano kolejność MAIN, a dalszy spis opisuje rodziny tematycznie. Pozycje EXTRAS są oznaczone.

Każda pozycja opisuje temat, ekran/bloczki i notatki prelegenta. Tabele wariantów podają rzeczywiste tytuły i kod nad diagramem. Speaker notes przy rodzinie dotyczą wszystkich jej wariantów, ponieważ sekcje są klonowane razem z notatkami. Wyjątkiem są trzy slajdy Subject (`05-zrodla-5`, `05-zrodla-3`, `05-zrodla-4`): mają własne notatki przypisane do checkpointów. Notatki przytoczono z ujednoliconymi odstępami; powtarzaną instrukcję obsługi zwykłych animacji opisano wspólnie wyżej.

Czasy są umownym modelem dydaktycznym. Przelot wartości i pauza przy operatorze spowalniają ilustrację; nie dodają opóźnień do rzeczywistego synchronicznego RxJS. HTTP jest symulowane. Pasek pokazuje czas pracy, a nie pomiar postępu prawdziwego żądania.

## Ścieżka MAIN i czas

Otwarcie do tytułu pozostaje bez zmian: społeczność, historia meet.js, fotografie i autor. Po tytule pokazujemy HTTP, Cold, interval, Subject — ręczną emisję, ręczny multicast HTTP i odłączanie źródła interval, a dopiero potem pytania o znane operatory i share. Budżet **30–35 minut dotyczy tylko części właściwej**; otwarcie, pytania i dogrywka są dodatkowo.

MAIN ma **39 slajdów (26 animowanych)**. EXTRAS zawiera **3 slajdy animowane**. Całość obejmuje 35 bazowych slajdów HTML i 42 slajdy po rozwinięciu wariantów. Warianty powstają przed wyborem ścieżki; końcowe ID zachowują poprzednie znaczenie niezależnie od kolejności.

Kolejność po slajdzie tytułowym:

1. Pierwsze slajdy techniczne pokazują komplet podstawowych zachowań Observable: HTTP — subscribe, next, complete (`05-zrodla-2`) → kod źródłowy httpGet krok po kroku (`05b-http-kod`) → Cold: jedna definicja, trzy wykonania, trzy complete (`04a-dwa-tory`) → interval na żywo — cold, osobne wykonanie każdego odbiorcy, unsubscribe (`05-zrodla`) → Subject — ręczne next, późny subskrybent bez historii i complete (`05-zrodla-5`) → Subject: ręczny multicast HTTP (`05-zrodla-3`) → Subject — kto odłączy źródło? (`05-zrodla-4`). Po nich „Jakie znasz operatory RxJS?” (`02-znane-operatory`) → HTTP GET + map: obiekt User → „Paweł Kondraciuk” (`04-operator`) → kod myMap (`04b-map-kod`) → „A share?” (`03-a-share`), wstęp do share + HTTP.
2. Jedna historia Cold → Subject → share na tych samych przykładach: cold — trzy subskrypcje, trzy HTTP, trzy complete (`04a-dwa-tory`) → Subject + HTTP: jeden HTTP, trzech odbiorców (`05-zrodla-3`) → Subject + interval: odbiorcy odchodzą, źródło nadal działa (`05-zrodla-4`) → pytanie o znane operatory → HTTP GET + map (`04-operator`) → kod myMap (`04b-map-kod`) → „A share?” (`03-a-share`) → share + HTTP: jeden HTTP, trzech odbiorców (`04a-dwa-tory-2`) → share + interval: ostatni odbiorca odłącza źródło (`04a-dwa-tory-3`) → share + HTTP: późny odbiorca uruchamia nowy request (`20-sharereplay`) → shareReplay(1) na interval: odbiorcy odchodzą, źródło pracuje dalej (`20a-sharereplay-interval`) → shareReplay z refCount: true na interval: ostatni odbiorca czyści bufor i odłącza źródło, późny C zaczyna od zera (`20b-sharereplay-refcount`) → shareReplay z refCount: true + HTTP: późny odbiorca dostaje wynik z bufora (`20-sharereplay-2`). Powtarzające je cold timer i oba slajdy `07-hot-cold` zostały usunięte.
3. **map + concatAll (`08-map-strumienie`) pozostaje kluczowym pomostem w MAIN**, bezpośrednio przed concatMap → mergeMap → switchMap → exhaustMap (cztery *Map obok siebie) → „Zaprojektujmy wyszukiwarkę” (`12-intro-wyszukiwarka`) → źródło query$ (`12-query-zrodlo`) → switchMap na żywo (`12a-switchmap-live`) → debounceTime + switchMap (`12b-debounce-switchmap`) → distinctUntilChanged przed switchMap (`11a-distinct-switchmap`, jedyny distinctUntilChanged w MAIN) → catchError wewnątrz switchMap w tej samej wyszukiwarce (`11b-catcherror-search`).
4. catchError na zewnątrz (`b04-catcherror`) → podsumowanie. Osobny wariant „catchError wewnątrz” i porównanie debounce/audit zostały usunięte; lokalną obsługę błędu pokazuje wyszukiwarka (`11b-catcherror-search`).
5. Cztery pytania podsumowania → „Pytania?” → rozmowa z salą albo dodatkowy przykład.

| Część właściwa | Budżet |
| --- | --- |
| HTTP, źródła, map/pipe, wykonania, Subject i share/replay | 10 min |
| map + concatAll, cztery operatory *Map i distinctUntilChanged przed switchMap | 13,5 min |
| catchError | 4 min |
| debounceTime w wyszukiwarce | w bloku wyszukiwarki |
| Podsumowanie | 1,5 min |
| Rezerwa na interakcję i przejścia | 2 min |
| **Łącznie** | **31 min** |

Na map + concatAll i przejście do concatMap przewidziano około 3 minut z bloku flatteningu. Czasy są planem prelegenta, nie pomiarem odtwarzacza.

**EXTRAS zawiera trzy przygotowane dodatkowe przykłady:** `x02-combinelatest-withlatestfrom`, czyli combineLatest z dwoma źródłami i lokalną pamięcią ostatnich wartości; `x03-retry-backoff`, czyli retry z exponential backoff 1 → 2 → 4 s; oraz `x04-defer`, czyli różnica między `from(loadUser())` a `defer(() => loadUser())`. Prelegent uruchamia pierwszy ręcznie z linku na slajdzie „Pytania?”, a pozostałe znajdują się bezpośrednio po nim. Bezpośredni hash dowolnego dodatku włącza pełną ścieżkę EXTRAS, a link „Powrót do pytań” zachowuje wybrany format.

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

**Wspólny język zakończeń** (HTTP `05-zrodla-2`, interval `05-zrodla`, Subject `05-zrodla-5`, operator `04-operator`, Cold `04a-dwa-tory`):

| Zdarzenie | Animacja | Wiersze wykonania | Status przy odbiorcy |
| --- | --- | --- | --- |
| next | kolorowa kulka od źródła do odbiorcy | bez zmian | odbiorca zachowuje wartość (kulka lub pole widoku) |
| complete | zielony impuls downstream | jasnozielone na całej ścieżce | `✓ complete` (zielony) |
| error | czerwony impuls downstream | jasnoczerwone w błędnym wykonaniu | `! error` (czerwony), nigdy complete po error |
| unsubscribe | szary impuls `×` upstream, od odbiorcy do źródła | szare | szary `×` (na interval sam znak, bo wiersz mieści trzy kulki), nigdy checkmark |

Status to mały tekst bez ramki przy prawej krawędzi wiersza odbiorcy, po prawej od otrzymanych danych; pojawia się dopiero po dotarciu impulsu (unsubscribe — po dotarciu `×` do źródła). Kafelki pośrednie (HTTP GET, map, Subject) nie powtarzają napisu — pokazują tylko kolor tła wiersza. Przy polu widoku z długą wartością („Paweł Kondraciuk”) status stoi w linii etykiety pola.

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

**Na ekranie:** tytuł i data 20 stycznia 2015. Najpierw plakat, następnie trzy zdjęcia odsłaniane fragmentami Reveal: prelegent na scenie, sala pełna uczestników i publiczność skupiona na prelekcji.

**Speaker notes:**

> A to wcześniejsze spotkanie: JavaScript Białystok #1, 20 stycznia 2015. Pierwsze meet.js odbyło się miesiąc później, jako spotkanie #2.

> Wtedy jeszcze nie wiedziałem, kim są ci ludzie, którzy przyszli na spotkanie. Dziś kojarzę większość z nich, może nie wszystkich z imienia :) Trochę jak z operatorami z tytułu tej prezentacji: znasz je z widzenia, ale bałeś się zagadać.

> Plakat i kolejne trzy zdjęcia pochodzą z pierwszego spotkania JavaScript Białystok. Pokazuj zdjęcia kolejnymi kliknięciami.

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

> Zapytaj salę: „Jakie znasz operatory RxJS?” i daj chwilę na odpowiedzi. Kolejnymi naciśnięciami strzałki w prawo odsłaniaj po jednym operatorze: map, tap, filter i switchMap. Następny slajd pokazuje, że operator to funkcja, na przykładzie map.

### A share? — `03-a-share`

**Temat:** przejście od popularnych operatorów do współdzielenia.

**Na ekranie:** wyłącznie duże pytanie „A share?”.

**Speaker notes:**

Brak notatek w HTML.

## Źródła, subskrypcje i operatory

### Operator to funkcja — `04-operator`

**MAIN — bezpośrednio po „Jakie znasz operatory RxJS?”; przed „myMap od środka”.** Jedna historia o danych użytkownika: ten sam obiekt `User` (`{ firstName: 'Paweł', lastName: 'Kondraciuk', city: 'Białystok' }`) co na Cold i Subject + HTTP wraca na share + HTTP. Kod:

```ts
httpGet<User>('/api/users/42')
.pipe(map(user => `${user.firstName} ${user.lastName}`))
```

`httpGet<User>()` to nasz klient HTTP zwracający Observable, nie funkcja RxJS: po subskrypcji uruchamia request, przy sukcesie emituje sparsowany obiekt `User`, potem complete. Kod ma dwie linie (36/24 px, klasa `rx-two-lines`), semantycznie jak zapis z `.pipe(` w osobnej linii; `httpGet<User>(…)` ma turkusowe wyróżnienie (kolor HTTP GET, świeci, gdy User płynie do map), a `map(…)` fioletowe (kolor kafelka map, świeci podczas przekształcenia) — jak na torach 04a i Subject + HTTP. Diagram poziomy w wyglądzie torów: HTTP GET (niebieski nagłówek, x/w 170/260, postęp requestu w wierszu) → map (fioletowy, 510/240) → A (kompaktowy odbiorca 960/480 z polem `fullName`); jeden tor A (`#7457D9`, jak na HTTP i interval; S1 zostaje tylko w rodzinie flatteningu), bez dolnej sekcji inner subscriptions. Licznik: Requesty HTTP (kończy na 1).

| Nr | Checkpoint | Na ekranie |
| --- | --- | --- |
| 0 | READY | Kod `httpGet<User>('/api/users/42')`, nagłówek HTTP GET i odbiorca A (ikona inbox, litera A, puste pole `fullName`). Brak wykonania i requestu. |
| 1 | pipeline | Fade-in 0,3 s: druga linia `.pipe(map(...))` i kafelek map. Pipe składa definicję, nie uruchamia HTTP (Requesty 0). |
| 2 | arrived | Chwilowe `.subscribe()` A; subskrypcja biegnie przez map do HTTP, rosną wiersze A, request (Requesty 1), HTTP emituje jedną kulkę „{…}” (cały User, bez JSON-a) — postój, gdy dotarła do wejścia map. |
| 3 | mapped | Kulka stoi w środku wiersza map i zmienia się w „"…"” (string); ta sama subskrypcja, bez nowej pracy. |
| 4 | received | Wynik dociera do A; pole `fullName` pokazuje pełne „Paweł Kondraciuk”. |
| 5 | complete | Zielony impuls z HTTP przez map do A; wiersze HTTP GET, map i A zielenieją, a przy A (nad długim wynikiem, w linii etykiety pola) pojawia się `✓ complete` — bez napisu w HTTP GET i map. Map nie zatrzymuje complete i nie wywołuje drugiego requestu. |
| — | FINISHED | Podpis „Jeden request, jeden User, jeden string. complete zakończył wykonanie”. |

**Speaker notes** (`template[data-checkpoint-notes="04-operator"]`): „Załóżmy, że pobieramy dane użytkownika z HTTP. Dostajemy cały obiekt, ale nasz widok potrzebuje tylko pełnego imienia i nazwiska” → pipe nie uruchamia HTTP → subscribe uruchamia jeden request → „Operator map dostaje pojedynczą wartość i synchronicznie ją przekształca. Tutaj z obiektu User tworzymy string” (map działa dla każdej kolejnej emisji, nasze HTTP emituje jedną) → „HTTP wykonał jeden request i wyemitował jeden obiekt. Map przekształcił go w jeden string. To nadal jedno wykonanie Observable” → „Map nie zmienia sposobu zakończenia — complete przechodzi dalej do odbiorcy” → przejście do „myMap od środka”: zobaczymy w kodzie subskrypcję biegnącą w lewo i emisję płynącą w prawo. Po „A share?” wracamy do surowego `user$ = httpGet<User>('/api/users/42')`, bez map.

Kontroler `stages`: → zaczyna lub kończy etap, ← cofa checkpoint także w AUTO, Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany READY. Tempo ilustracji: etap pipe 0,65 s, pojawienie odbiorcy 0,3 s, subscribe 1 s (0,5 s na odcinek), request 2,6 s, przelot 1,4 s, projekcja 2 s, zatrzymanie odbioru 0,5 s, terminal 1,6 s, cisza 1 s przed FINISHED.

### myMap od środka — `04b-map-kod`

**MAIN — bezpośrednio po „Operator to funkcja”, przed „A share?”.** Cały poniższy kod jest widoczny od wejścia, z ciemnym panelem i kolorowaniem jak na „httpGet od środka” (37 px w 4:3, 36 px w 16:9). Bez zwijania i przewijania; numery linii 1–12 po lewej. Dwa natywne fragmenty Reveal kolejno wyróżniają pary fragmentów (tło i podkreślenie samego tekstu, jak na „httpGet od środka”): `source$: Observable<T>` (linia 2) razem z `source$.subscribe({` (linia 5), a potem parametr `subscriber` (linia 3) razem z `subscriber.next(fn(value))` (linia 6); pierwsze wyróżnienie znika przy drugim. Lewo cofa, a kolejne prawo po drugim wyróżnieniu przechodzi do „A share?”.

```ts
function myMap<T, R>(fn: (value: T) => R) {
  return (source$: Observable<T>) =>
    new Observable<R>(subscriber => {

      return source$.subscribe({
        next: value => subscriber.next(fn(value)),
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      });

    });
}
```

**Speaker notes (początek i dwa fragmenty):** Wywołanie `myMap(fn)` tworzy funkcję operatora, a podanie `source$` tworzy nowy Observable — nadal tylko definicję. `source$` z linii 2 to źródło (u nas HTTP GET); przy subskrypcji wynikowego Observable `source$.subscribe(...)` podłącza je: subskrypcja idzie w lewo, jak od A przez map do HTTP. Zwrócona subskrypcja zapewnia odłączenie źródła przy rezygnacji odbiorcy. `subscriber` z `new Observable<R>(subscriber => {` to odbiorca wynikowego Observable (u nas A). Gdy źródło emituje, `fn(value)` synchronicznie przekształca wartość, a `subscriber.next(...)` wysyła wynik w prawo. `error` i `complete` są przekazywane dalej. Na koniec przypomnij trzy requesty na Cold i jeden HTTP ręcznie podłączony do Subjecta; zapytaj, czy operator może podłączyć źródło za nas. Prawo: „A share?”. Cel: 30–45 s w ramach bloku wprowadzenia.

### Tory wykonania: cold, share() + HTTP i share() + interval — `04a-dwa-tory`, `-2`, `-3`

**Cold (`04a-dwa-tory`) — zaraz po kodzie źródłowym httpGet (`05b-http-kod`), przed interval; `-2` i `-3` w historii Subject/share. Test zapisu wielu subskrypcji.** Kafelek to definicja: stały nagłówek (`HTTP GET`, `map`, `share()`, `Odbiorca A/B`). Pod nagłówkiem rośnie obszar wykonań — każde subscribe dokłada kompaktowy wiersz, gdy do kafelka dociera (krótkie rozszerzenie, nagłówek nie skacze). Wiersze oddziela separator 1 px, mają jaśniejsze tło kafelka i pasek koloru subskrypcji po lewej; zakończone zostają jako historia. Mało tekstu: w wierszu tylko litera toru.

**Paleta.** Nagłówki: źródło `#8FC9D4`, operator `#D8B3E6`, odbiorca `#EAE4F7`; tekst `#26323B`. Subskrypcje: A `#7457D9`, B `#D8840F`, wspólny upstream share `#238F83`. Stany wiersza (tło, akcent): complete `#DDF1E1`/`#26804E`, error `#F7D9D9`/`#C54848`, unsubscribe `#E7E8E8`/`#808890`; aktywny — tło bazowe. Kolor subskrypcji zostaje na pasku wiersza, kablach i portach w każdym stanie. Tło slajdu pozostaje globalnym gradientem (jego środek to praktycznie `#F8F3E9`).

**Postęp i stany.** W HTTP postęp to tło wiersza w łagodnym kolorze subskrypcji, przesuwające się od lewej (symulowane oczekiwanie, nie procent pobrania); po complete cały wiersz przechodzi w delikatną zieleń z krótkim rozbłyskiem, po error w czerwień, po anulowaniu jest przygaszony. map i share nie mają czasowego postępu — tylko stan wiersza i przelatująca wartość.

**Połączenia.** Każdy tor ma własny kabel (~3 px w skali makiety) i porty w kolorze subskrypcji. complete/error: krótki impuls w kolorze akcentu biegnie po kablu do następnego kafelka, tam wiersz zmienia stan, a kabel wraca do koloru toru z mniejszym kryciem jako historia. unsubscribe: bez impulsu, kabel i porty szarzeją i gasną; stan kafelka wyżej zmienia się po dotarciu unsubscribe.

**Cold (`04a-dwa-tory`) — trzy niezależne subskrypcje, trzy complete.** Realistyczny problem: trzy niezależne miejsca widoku potrzebują danych tego samego użytkownika. Kod pokazuje jedną definicję `const user$ = httpGet<User>('/api/users/42');` (marka HTTP świeci, gdy któraś odpowiedź wylatuje); bez `map()`, `pluck()`, `catchError`, osobnych Observable pól, linii subscribe i składni frameworka — zakładamy, że każde pole samo subskrybuje `user$` i wyświetla wynik. Błędów na tym slajdzie nie pokazujemy (mechanizm `coldErrors` w reference-scenes.js zostaje na później). Diagram ma dwie kolumny: kafelek HTTP GET (x/w 272/420) i trzy kompaktowe pola widoku (x/w 960/436) w kolorach A/B/C (`#7457D9`, `#D8840F`, `#2F7ED8`): pasek toru, port, inbox, litera, etykieta właściwości w monospace (`user.firstName`, `user.lastName`, `user.city`) i miejsce na wartość (przerywany slot).

READY (bez zmian względem poprzedniej wersji): sam nagłówek HTTP GET, trzy puste pola, bez liter A/B/C, portów i połączeń; liczniki Observable 1, Requesty HTTP 0. Pierwsze „dalej”: A (1 s czasu modelu), B (1,25 s) i C (1,5 s) subskrybują kolejno — chwilowe `.subscribe()` z literą toru nad kolumną pól, impuls biegnie od pola do HTTP, w HTTP GET rośnie wiersz wykonania i startuje osobny request. Wszystkie trzy trwają równolegle (postęp jako tło wierszy). Drugie „dalej” (received): requesty kończą się kolejno, każde wykonanie emituje cały obiekt User (kulka „{…}”); pola pokazują Paweł, Kondraciuk i Białystok, complete jeszcze nie dotarło. Trzecie „dalej” (complete): trzy zielone impulsy complete, przy polach ✓ complete. Ostatnie „dalej”: AUTO do FINISHED z podpisem „Jedna definicja, trzy wykonania i trzy identyczne requesty — każde z własnym zakończeniem”. Stan końcowy: A — Paweł, B — Kondraciuk, C — Białystok, wszystkie complete; Requesty HTTP 3.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY | Wyobraźmy sobie widok aplikacji. W jednym miejscu wyświetlamy imię użytkownika, w drugim nazwisko, a w trzecim miasto. Wszystkie potrzebują danych tego samego użytkownika. |
| 1 | requests | Mamy jedną definicję user$. Ale każde z tych miejsc niezależnie ją subskrybuje. I co się dzieje? Powstają trzy osobne requesty. |
| 2 | received | Każdy request wraca osobno. Każde pole dostaje swój własny, identyczny obiekt User i pokazuje z niego swoją właściwość. |
| 3 | complete | Każde wykonanie kończy się własnym complete. To trzy niezależne wykonania tego samego cold Observable — każde ma własny cykl życia. |
| 4 | FINISHED | Mamy jedną definicję Observable, ale trzy wykonania. Każde ma własną subskrypcję i własny cykl życia. Wszystkie pytają backend o dokładnie tego samego użytkownika. Czy naprawdę musimy wykonywać trzy requesty? Do tego pytania wrócimy. Prawo: interval. |

**share(): jedno HTTP, trzech odbiorców (`-2`).** Po Subject + HTTP, ten sam przykład co Cold, w układzie i narracji Subject + HTTP (`05-zrodla-3`): HTTP GET x/w 177/230, share() 517/230 w miejscu Subject, pola widoku A (`user.firstName`), B (`user.lastName`) i C (`user.city`) z Cold (960/436), top 178/102, viewBox 1240×612/460, bez `map()`. Kod rośnie jak na Subject (to samo miejsce, font i interlinia): READY `const user$ = httpGet<User>('/api/users/42');`, w pierwszym kroku średnik gaśnie i dochodzi `  .pipe(share());` (marka HTTP świeci podczas odpowiedzi, share() przy rozesłaniu next i complete). Checkpointy (MANUAL, kontroler etapów): **0 READY** — nagłówek HTTP GET i trzy puste pola, bez share(), połączeń i requestu (Odbiorcy 0, Requesty HTTP 0); **1 share-added** — pojawia się kafelek share() i druga linia kodu, nadal bez subskrypcji; **2 subscribed-a** — chwilowe `.subscribe()` A, impuls A dociera do share() (wiersz A), share() subskrybuje HTTP, powstaje jedno wykonanie `#1` (w kolorze A — uruchomił je A, zarządza nim share) i rusza request; **3 joined-b** — pomarańczowy impuls B kończy się na share(), w share() są wiersze A i B, C jeszcze nie subskrybuje, HTTP ma nadal jeden wiersz `#1` w toku (~33%); to kluczowy kadr — pauza MANUAL może trwać dowolnie długo, request czeka; **4 joined-c** — C dołącza tak samo, trzy wiersze w share(), nadal jeden request; **5 multicast** — HTTP emituje jedną kulkę „{…}”, która rozdziela się na porcie share() na trzy identyczne kulki; pola pokazują Paweł, Kondraciuk, Białystok; **6 complete** — zielony impuls przez share() do A, B i C, przy polach `✓ complete`, wartości zostają. Potem AUTO do FINISHED z podpisem „Jeden request, trzech odbiorców. Bez ręcznego podłączania Subjecta do HTTP”. Liczniki: Odbiorcy (kończy na 3) i Requesty HTTP (kończy na 1 — jeden request zamiast trzech); cofanie nie tworzy dodatkowych requestów. Notatki per checkpoint w `template[data-checkpoint-notes="04a-dwa-tory-2"]` (ready, sześć postojów, finished; 45–60 s); joined-b: „B dołącza do istniejącego share. Nie subskrybujemy ponownie HTTP. Obaj odbiorcy korzystają z tego samego wykonania”; finished: „Share współdzieli request automatycznie. Ale współdzielenie to nie wszystko. Co dzieje się ze źródłem, gdy odbiorcy rezygnują?”.

**share(): kto odłączy źródło? (`-3`) — 30–45 sekund.** Odpowiednik wcześniejszego Subject + interval (`05-zrodla-4`), bezpośrednio po share + HTTP (`04a-dwa-tory-2`): ta sama scena na żywo, ten sam układ (interval 212/310 z wierszem `#1`, hub 592/230 z wierszami A/B/C, odbiorcy 1000/366), jedna linia kodu `const shared$ = interval(1000).pipe(share());` — bez ręcznego connection. READY: share() już subskrybuje interval, A, B i C odbierają co sekundę (emisje trwają także między checkpointami). Jedno prawo uruchamia całą sekwencję: `subA.unsubscribe()`, po sekundzie `subB.unsubscribe()`, po kolejnej `subC.unsubscribe()` (migawki kolejno w tym samym miejscu; B i C dostają jeszcze po jednej wartości). A i B — szary impuls × kończy się na share(), interval pracuje; C — ostatni odbiorca odchodzi, więc share() sam odłącza upstream: impuls × biegnie dalej od share() do interval, wiersz `#1` szarzeje, nowych emisji nie ma, fragment `share()` w kodzie świeci podczas odłączania. Bez complete. Scena staje się skończona i dochodzi do FINISHED; następne prawo zmienia slajd, lewo cofa całą sekwencję. Liczniki: Emisje interval i Odbiorcy share(). Postój (umowny kadr dla Reveal, notatek i hasha): unsub-all. Notatki per checkpoint w `template[data-checkpoint-notes="04a-dwa-tory-3"]`; finished: „Share umie odłączyć źródło, kiedy ostatni odbiorca odchodzi. A czy pamięta wyniki zakończonych requestów?”.

**Dawny wariant share za map z unsubscribe A (`lanesMode: 'share-unsub'`).** Nie jest już slajdem; ścieżka `lanesGraph` (HTTP GET → map → share() → odbiorcy, kod `httpGet<number>(url)` / `  .pipe(map(x => x * 2), share())`) zostaje dla scenariuszy `shareScenario` i testów mechanizmu.

**Scenariusze share (dane, nie osobne slajdy).** `shareScenario` (lista Subscriberów `{id, start, unsub?}`) wylicza sesje upstreamu: C (niebieski) dołącza do trwającego upstreamu w trzecim wierszu, bez nowego requestu; odejście ostatniego aktywnego przed odpowiedzią anuluje upstream (HTTP z niedokończonym paskiem, bez complete); późniejszy Subscriber otwiera nową sesję w swoim kolorze (nowy wiersz HTTP/map, połączenie do share z załamaniem). Sprawdzają to testy.

**Speaker notes:** Nagłówki to jedna definicja, wiersze to wykonania. Cold: każdy subscribe tworzy własny request. share współdzieli upstream, ale nie skleja odbiorców — każdy ma własny wiersz i może odejść osobno. Dolne wykonania HTTP dla *Map pozostają bez zmian.

### Źródła — rodzina `05-zrodla`

Warianty zachowują ID, lecz zajmują oddzielne miejsca narracji: **HTTP otwiera część właściwą**, po kodzie httpGet i Cold pokazujemy interval, a potem kolejno Subject — ręczną emisję (next i complete), Subject: ręczny multicast HTTP i „Subject — kto odłączy źródło?”. Dopiero po nich „Jakie znasz operatory RxJS?”, „Operator to funkcja” i „A share?”. Historia współdzielenia: **Cold → ręczna emisja Subjecta → ręczny multicast HTTP przez Subject → ręczne połączenie interval, którego nikt nie odłącza → pytania o operatory i map → automatyczny multicast przez share() → share() odłącza źródło sam**.

| ID | Kod i zachowanie |
| --- | --- |
| 05-zrodla-2 | `httpGet('/api/data')`. READY ma tylko nagłówek HTTP GET. Etapy: receiver (pojawia się odbiorca z ikoną inbox i literą A, bez połączenia) → subscribed (dopisane `.subscribe(render)`, impuls dotarł do HTTP, migawka `.subscribe()` A widoczna, request jeszcze nie ruszył) → response (migawka gaśnie, request w wierszu HTTP, pauza tuż po wylocie „dane”) → first (dane u A przed complete) → AUTO: complete do A i FINISHED. Notatki per checkpoint w `template[data-checkpoint-notes="05-zrodla-2"]` (definicja, odbiorca, subscribe, request i odpowiedź, dane u A, complete i przejście do interval). |
| 05-zrodla | `interval(1000)` na żywo (cold), kafelek podpisany samym `interval`. READY: interval i odbiorca A (ikona inbox, litera A) → `.subscribe()` (dopisane `.subscribe(render)`, postój z migawką `.subscribe()` A, bez emisji) → emisje A 0, 1, 2… bez końca → pojawia się B i subskrybuje: drugi wiersz wykonania w interval, B dostaje własne 0, 1, 2… (pierwsze 0 już 0,6 s po zestawieniu subskrypcji; migawka `.subscribe()` B gaśnie, gdy B zaczyna emitować) → `.unsubscribe()` A → `.unsubscribe()` B (bez complete) → kolejne „dalej” przechodzi dalej. |
| 05-zrodla-5 | Stale tylko `const subject$ = new Subject<number>();`. A subskrybuje i dostaje `subject$.next(1)`; dopiero potem pojawia się B (`subject$.subscribe(observerB)`) i nie dostaje wcześniejszej 1; `subject$.next(2)` trafia do A i B; `subject$.complete()` — zielony impuls do obu, wiersze ✓ complete, historie zostają (A: 1, 2; B: 2). Bez error, unsubscribe i upstreamu. |
| 05-zrodla-3 | Kod rośnie etapami: `const subject$ = new Subject<User>();` → `const http$ = httpGet<User>('/api/users/42');` → `http$.subscribe(subject$);`. A/B/C (pola widoku z Cold) subskrybują Subject od READY; dopiero trzecia linia podłącza jedno HTTP, które przez Subject rozsyła obiekt User i complete do trzech pól. |
| 05-zrodla-4 | `const subject$ = new Subject<number>();` i `const connection = interval(1000).subscribe(subject$);`. Start już działający: interval → Subject → A/B/C; kolejne „dalej” to `subA/subB/subC.unsubscribe()`, a interval emituje dalej do Subjecta bez odbiorców; ostatnie „dalej” wywołuje `connection.unsubscribe()` i zatrzymuje interval (Subject bez complete). |

Cała rodzina ma wygląd torów jak w `04a-dwa-tory` (nagłówek = definicja, wiersz = wykonanie, porty, kulki w wierszu odbiorcy, płaskie kafelki) i te same chwilowe napisy `.subscribe()` z badge'em toru, widoczne od pojawienia się odbiorcy do dotarcia subskrypcji do źródła (w HTTP zostają na postoju subscribed i gasną, gdy rusza request). W interval `.unsubscribe()` A pojawia się pod wierszem odbiorcy, bo rezygnacja zaczyna się przy nim. W Subject jedyny napis to migawka `httpGet<User>('/api/users/42').subscribe(subject$)` z badge'em `#1`, wyśrodkowana nad diagramem. HTTP ma postęp tylko w wierszu A pod HTTP GET (od zestawionej subskrypcji do odpowiedzi); odbiorca czeka, potem trzyma kulkę „dane” w swoim wierszu. Diagram używa harmonogramu: pojawienie odbiorcy w 1 s, subscribe 1,3–2,1 s, odpowiedź 7–7,8 s, complete 8,3–9,1 s, cisza do 9,9 s. Kod i widoczność cofają się razem. Postęp jest symulacją oczekiwania, nie procentem odpowiedzi sieciowej.

interval: kafelek `interval` (340/420, wymiary jak Subject — ręczna emisja) z wierszami wykonań A i B → odbiorcy A/B (910/400). Najpierw zwykły postój subscribe, potem slajd jest wyjątkiem od postojów: emisje trwają tak długo, jak prelegent chce (liczniki „Emisje A/B” rosną bez ograniczeń, w wierszu odbiorcy zostają 3 ostatnie kulki). Kolejne „dalej” to akcje: B dołącza (interval jest cold — nowe wykonanie od 0, A liczy dalej, „Wykonania interval” 2), potem `.unsubscribe()` A i `.unsubscribe()` B: wartość już wysłana dociera, potem szary pocisk „×” jedzie od odbiorcy do interval, wiersz szarzeje, wykonanie przestaje emitować; nie ma zielonego complete. Migawki stoją w jednym miejscu nad diagramem — każda do następnej akcji, ostatnia do końca. AUTO ani pauza nie wykonują akcji same. Lewo cofa ostatnią akcję, potem emisje, subscribe i READY; wyjście ze slajdu sprząta wykonania, a powrót startuje od READY. Druk pokazuje oba wykonania anulowane.

**Subject — ręczna emisja (`05-zrodla-5`) — 45–60 sekund.** Slajd techniczny zaraz po interval i bezpośrednio przed „Subject: ręczny multicast HTTP”. Pokazuje, że Subject można subskrybować, samodzielnie emitować do niego wartości i ręcznie go zakończyć — oraz że Subject jest hot: późny subskrybent nie otrzymuje wcześniejszych wartości. Subject nie jest podłączony do zewnętrznego źródła (bez connection i upstreamu).

Kod demonstracji (na slajdzie stale tylko pierwsza linia; pozostałe wywołania to migawki nad diagramem, x 620, y top/2, size 34 — subscribe i next widoczne do swojego postoju, `complete()` do końca):

```ts
const subject$ = new Subject<number>();

subject$.subscribe(observerA);
subject$.next(1);
subject$.subscribe(observerB);
subject$.next(2);
subject$.complete();
```

Fragment `new Subject<number>()` świeci od każdego ręcznego next do wyjścia powiadomień i od complete() do jego wysłania. Diagram Subject → A/B w wyglądzie torów: kafelek `Subject` x/w 340/420 (jak interval; wiersze rosną z subskrypcjami), kompaktowi odbiorcy A/B 910/400 (jak odbiorca interval) (inbox, litera, do dwóch kulek r 34/font 30), top 178/102, viewBox 1240×612/460, płaskie kafelki, liczniki rx-lanes (Odbiorcy, Emisje next). Odbiorca pojawia się dopiero tuż przed swoim subscribe; w READY nie ma pustych prostokątów A/B. Bez HTTP, innych operatorów, legendy i dodatkowych paneli.

| Nr | Checkpoint | Na ekranie |
| --- | --- | --- |
| 0 | READY | Tylko kafelek `Subject`; Odbiorcy 0, Emisje next 0. |
| 1 | subscribed-a | Pojawia się A i od razu subskrybuje; migawka `subject$.subscribe(observerA)` widoczna na pauzie (gaśnie po wznowieniu), kabel rośnie od A do Subjecta, w Subject powstaje wiersz A. A czeka. |
| 2 | emit-1 | Migawka `subject$.next(1)`; kulka 1 pojawia się w wierszu A Subjecta i stoi. |
| 3 | next-1 | Kulka 1 dojechała do A, migawka zgasła. B jeszcze nie istnieje. |
| 4 | subscribed-b | Pojawia się B i od razu subskrybuje; migawka `subject$.subscribe(observerB)` na pauzie, wiersz B w Subject. B ma pusty inbox, A zachowuje 1 — pytanie do sali, czy B dostanie 1. |
| 5 | emit-2 | Migawka `subject$.next(2)`; kulka 2 startuje ze środka Subjecta, rozchodzi się do wyjść A i B i staje na portach. |
| 6 | next-2 | Dwójka dotarła do A i B, migawka zgasła. A: 1, 2; B: 2. |
| 7 | complete | Zielona migawka `subject$.complete()` (zostaje do końca sceny); zielony impuls do A i B, wiersze Subject, A i B przechodzą w ✓ complete (tło i tekst), historie zostają, Odbiorcy 0. Bez unsubscribe i error. |
| 8 | FINISHED | Podpis „A: 1, 2, complete. B: 2, complete. Subject jest hot — późny odbiorca nie dostaje historii”. |

Harmonogram (czas ilustracji = czas modelu): A pojawia się 0,3 s, subscribe 0,6 s (zestawienie 1 s), next(1) 2,3 s (postój emit-1 2,8; rozesłanie 3,5, dotarcie 4,9), B pojawia się 5,5 s, subscribe 5,8 s, next(2) 7,5 s (rozejście do portów 8,1–8,7 = postój emit-2, dotarcie 10,1), complete 10,8 s (wysłanie 11,4, dotarcie 12,6), podsumowanie 13,6 s, koniec 14,6 s. Cofanie przed subscribe B usuwa odbiorcę B razem z jego wierszem; historia B nigdy nie pojawia się przed subskrypcją.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY | Interval sam produkował kolejne liczby. A co, jeśli chcielibyśmy sami decydować, kiedy pojawi się następna wartość? |
| 1 | subscribed-a | Subject jest jednocześnie Observable, które można subskrybować, i Observerem, któremu możemy przekazywać wartości. Najpierw korzystamy z pierwszej roli: A subskrybuje. |
| 2 | next-1 | Teraz druga rola Subjecta: sami wywołujemy next(1). Subject rozsyła wartość do aktualnych odbiorców — na razie jest tylko A. |
| 3 | subscribed-b | Teraz pojawia się drugi odbiorca. Jak myślicie, czy dostanie jedynkę, którą Subject wyemitował wcześniej? |
| 4 | next-2 | Nie. Subject nie odtwarza wcześniejszych wartości. B dostaje dopiero dwójkę, podczas gdy A otrzymał zarówno jedynkę, jak i dwójkę. |
| 5 | complete | Teraz ręcznie kończymy Subject. Complete trafia do wszystkich odbiorców i zamyka ich subskrypcje. Nie musimy już osobno wywoływać unsubscribe. |
| 6 | FINISHED / podsumowanie | Subject jest przykładem hot Observable — rozsyła emisje do aktualnych subskrybentów. Nowy odbiorca nie dostaje historii. Do różnicy między hot i cold jeszcze wrócimy. Przed chwilą wywoływaliśmy next i complete ręcznie. A jeśli te powiadomienia przyjdą z HTTP? Czy Subject może rozesłać wynik jednego requestu do kilku odbiorców? Prawo: „Subject: ręczny multicast HTTP”. |

**Subject: ręczny multicast HTTP — 60–75 sekund.** Bezpośrednio po „Subject — ręczna emisja”, przed „Subject — kto odłączy źródło?”; odpowiedź na wcześniejszy problem Cold. Te same pola widoku A/B/C (`user.firstName` → Paweł, `user.lastName` → Kondraciuk, `user.city` → Białystok; ten sam wygląd, rozmiar, kolory i kulka `{…}`), ale jeden request zasila je przez Subject. Kod rośnie etapami w tym samym rendererze, z tą samą lewą krawędzią, fontem i interlinią:

```ts
const subject$ = new Subject<User>();
const http$ = httpGet<User>('/api/users/42');

http$.subscribe(subject$);
```

Wyróżnienia jak na share(): `new Subject<User>()` — jasnofioletowe tło i fioletowe podkreślenie (świeci mocniej, gdy Subject rozsyła next i complete), `httpGet<User>('/api/users/42')` — jasnoturkusowe tło i turkusowe podkreślenie (świeci podczas odpowiedzi). `.subscribe(subject$)` ma zwykłe kolorowanie składni i tylko chwilowy akcent w kolorze impulsu subskrypcji (turkus toru `#1`), od pojawienia się linii do chwili po zestawieniu subskrypcji. Miejsce na wszystkie linie jest zarezerwowane od READY (klasa `rx-code-steps`: pierwsza linia stoi tam, gdzie zwykła jednoliniowa, kolejne w pustym pasie nad kafelkami), więc nowe linie nie przesuwają diagramu. Subject jest Observable dla A/B/C i Observerem dla HTTP.

Diagram HTTP GET → Subject → A/B/C (HTTP x/w 177/230, Subject 517/230, pola jak na Cold 960/436, odstępy 110), wygląd i wymiary torów jak na Cold (top 178/102, viewBox 1240×612/460, liczniki rx-lanes). READY: A, B i C są już subskrybentami Subject — trzy aktywne wiersze A/B/C, porty i poziome kable (subskrypcje zestawione przed t = 0, bez animacji), puste pola, brak HTTP GET, Requesty HTTP 0, Odbiorcy 3. Pierwsze „dalej” (defined): dopisuje się `const http$ = httpGet<User>('/api/users/42');` i pojawia się sam niebieski nagłówek HTTP GET — tylko definicja, bez wiersza wykonania, requestu i wartości; nic się nie przesuwa. Drugie „dalej” (connect-http): dopisuje się `http$.subscribe(subject$);` (bez osobnej migawki nad diagramem); impuls subskrypcji biegnie od Subjecta w lewo do HTTP, po dotarciu powstaje jeden wiersz `#1` (turkus `#238F83`, niezależny od A/B/C) i startuje dokładnie jeden request — subskrybujemy HTTP, a Subject jest Observerem. Subskrypcje A/B/C nie uruchamiają HTTP. Wejście upstreamu trafia w wiersz A Subject (prosty, poziomy kabel z wiersza `#1` HTTP); wszystkie połączenia są poziome. HTTP emituje jeden obiekt (kulka `{…}`), który zatrzymuje się na porcie Subject i rozdziela na trzy jednoczesne powiadomienia next w tym samym kolorze emisji; pola pokazują swoje właściwości. Jedno complete HTTP dociera zielonym impulsem do Subject, który przekazuje complete A/B/C; pola zachowują wartości, licznik requestów kończy na 1. Bez logu/bufora, replay, unsubscribe, map i share.

Subject nie odtwarza historii. Odejście odbiorców nie anuluje automatycznie osobnej subskrypcji HTTP — trzeba nią zarządzać samodzielnie; końcowe pytanie prowadzi do problemu niezależnej subskrypcji upstreamu.

**Checkpointy i speaker notes:** notatki w standardowym oknie prelegenta zmieniają się wraz z osiągniętym checkpointem, również w AUTO, po cofnięciu, resecie i wejściu z hasha. Narracja poniżej jest zapisana w HTML; nie jest wyświetlana publiczności.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY | Kontynuujemy przykład Subjecta z poprzedniego slajdu. Tym razem nie wywołujemy next ręcznie — obiekt użytkownika pobierzemy z HTTP. Pamiętacie Cold: trzy komponenty, trzy subskrypcje i trzy identyczne requesty. Tutaj ci sami trzej odbiorcy są już podłączeni do jednego Subjecta. |
| 1 | defined | Dopisujemy const http$ = httpGet&lt;User&gt;('/api/users/42'). Po lewej pojawia się HTTP GET, ale to tylko definicja: nie ma wykonania ani requestu. A, B i C nadal czekają. |
| 2 | connect-http | Widzieliśmy, że Subject potrafi sam emitować wartości przez next(), ale nie musimy robić tego ręcznie. Jest również Observerem, więc możemy przekazać go bezpośrednio do subscribe innego Observable. |
| 3 | multicast | HTTP pracuje — jeden request, niezależnie od liczby odbiorców Subjecta. Backend zwraca jeden obiekt użytkownika. HTTP emituje go do Subjecta, a Subject rozsyła tę samą wartość wszystkim trzem odbiorcom. (Kadr: trzy kulki przy portach A/B/C, pola jeszcze puste.) |
| 4 | complete | Każdy odbiorca dostaje cały obiekt, ale wyświetla tylko potrzebne pole. Potem HTTP kończy się, a Subject przekazuje complete wszystkim odbiorcom. |
| 5 | FINISHED / podsumowanie | Ten sam efekt w widoku, ale zamiast trzech requestów mamy jeden. Subject potrafi rozesłać wynik jednego HTTP do wielu odbiorców. Ale sami musieliśmy podłączyć źródło. Czy RxJS może zrobić to za nas? Do tego pytania wrócimy przy share(). Najpierw sprawdzimy, kto odłączy ręcznie podłączony interval. Prawo: „Subject — kto odłączy źródło?”. |

MANUAL zatrzymuje się w punktach 1–4; po podłączeniu HTTP nie ma postoju w trakcie requestu (2,2 s) — kolejny przystanek to rozesłanie przez Subject, następny krok dowozi wartości do pól i complete; ostatni kończy animację w FINISHED. AUTO przechodzi płynnie przez całość. Ruch kulek tylko ilustruje synchroniczne rozsyłanie powiadomień; pauzy służą wyjaśnieniu. Pełny kod jest przykładem, nie jest wykonywany przez prezentację.

**Subject — kto odłączy źródło? (`05-zrodla-4`) — 45–60 sekund.** Bezpośrednio po Subject: ręczny multicast HTTP (`05-zrodla-3`) i przed „Jakie znasz operatory RxJS?” (`02-znane-operatory`): wracamy do Subjecta, z interval zamiast HTTP. Kod przez cały slajd: `const subject$ = new Subject<number>();` oraz `const connection = interval(1000).subscribe(subject$);` (bez kodu subskrypcji A/B/C). Diagram interval(1000) → Subject → A/B/C w wyglądzie torów Subject + HTTP (te same wysokości nagłówka 79 i wierszy 89, top 178/102, viewBox 1240×612/460): interval x/w 212/310 z jednym wierszem `#1` (turkus `#238F83`), Subject 592/230 z wierszami A/B/C, kompaktowi odbiorcy 1000/366 wyrównani z wierszami Subject (A fioletowy, B pomarańczowy, C niebieski); wszystkie kable poziome, wejście `#1` trafia w wiersz A. Odbiorca pokazuje ostatnią odebraną liczbę (kulka r 34, font 30, kolor emisji `#1`).

Slajd startuje już działający: wszystkie subskrypcje są zestawione przed t = 0, a emisje 0, 1, 2… ruszają przy wejściu (co 1 s, przelot 0,8 s, rozesłanie w Subject 0,4 s). Scena jest na żywo jak interval: postoje nie zatrzymują emisji. Kolejne „dalej”: `subA.unsubscribe()`, `subB.unsubscribe()`, `subC.unsubscribe()` — migawka w miejscu nagłówka kolumny odbiorców z literą i kolorem toru; wartość, która dotarła już do Subjecta, jeszcze dociera, potem szary impuls × biegnie od odbiorcy w lewo i kończy się na Subject; szarzeją tylko wiersz odbiorcy, jego kabel i wiersz w Subject. Tor `#1` zachowuje kolor i nigdy nie dostaje impulsu. Czwarte „dalej” (etap 4) niczego nie wywołuje: wyróżnia w kodzie `interval(1000).subscribe(subject$)`; wartości nadal dochodzą do Subjecta i tam gasną (kurczą się na porcie wejścia), licznik „Emisje interval” rośnie, „Odbiorcy Subject” = 0, A/B/C zachowują ostatnie liczby. Emisje trwają bez końca, aż prowadzący naciśnie „dalej” — nic nie zatrzymuje interval automatycznie. Piąte „dalej” (ostatni checkpoint, `connection`) wywołuje `connection.unsubscribe()`: migawka z etykietą `#1` nad połączeniem interval → Subject, wartość już wysłana jeszcze dociera do Subjecta, potem szary impuls × biegnie od Subjecta w lewo do interval; wiersz `#1` przechodzi w „odsubskrybowano” (szary), kabel szarzeje i przygasa, licznik emisji staje. Subject nie dostaje complete (brak zielonego impulsu, `subject$.complete()` ani zmiany jego wierszy) — pozostaje otwarty; A/B/C pozostają odłączeni. Scena dochodzi do FINISHED, a szóste „dalej” przechodzi do „Jakie znasz operatory RxJS?”. „Dalej” w trakcie animacji unsubscribe tylko ją kończy; lewo cofa ostatnią akcję (po cofnięciu `connection.unsubscribe()` interval znów emituje bez końca, po cofnięciu odbiorcy — odbiorca znów odbiera), z etapu 0 — poprzedni slajd. AUTO i Spacja nie wywołują unsubscribe. Wyjście ze slajdu technicznie sprząta wykonanie, także bez końcowego kroku; powrót zaczyna od stanu początkowego. Druk i „pokaż wynik” dają nieruchomy kadr zatrzymanego źródła.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY (emisje trwają) | Przed chwilą pokazaliśmy, że możemy podłączyć HTTP do Subjecta. Teraz zamiast HTTP wykorzystamy dobrze już znany interval. Mamy trzech odbiorców i jedno wspólne źródło. |
| 1 | unsub-a | Pierwszy odbiorca rezygnuje. Jego subskrypcja się kończy, ale pozostali nadal dostają wartości. |
| 2 | unsub-b | B również się odłącza. C nadal otrzymuje wartości. Ale czy obecność C w ogóle ma wpływ na działanie źródła? (interval działa dzięki osobnej subskrypcji connection, nie dzięki C) |
| 3 | unsub-c | Teraz odłączamy ostatniego. I jak myślicie, co powinno się wydarzyć ze źródłem? |
| 4 | source | Wszyscy odbiorcy już się odłączyli. Ale zobaczcie — interval nadal emituje wartości. Subject ciągle je odbiera, chociaż nikogo już nimi nie powiadamia. |
| 5 | connection | Bo mamy jeszcze jedną subskrypcję, którą sami stworzyliśmy. To połączenie interval z Subjectem. I dopiero teraz ręcznie je odłączamy. |
| — | FINISHED (po zatrzymaniu, druk) | Interval przestaje pracować. Ale Subject nadal istnieje — nie dostał complete. Musieliśmy sami zarządzać tym połączeniem. Do zarządzania źródłem wrócimy przy `share()`. Prawo: „Jakie znasz operatory RxJS?”. |

**Speaker notes pozostałych źródeł:** Angular HttpClient jest przykładem cold źródła; nie generalizować tego na już uruchomiony Promise. Timer kończy automatycznie, interval przez rezygnację odbiorcy.

### httpGet od środka — `05b-http-kod`

**MAIN — zaraz po HTTP (`05-zrodla-2`), przed interval.** Uproszczony środek `httpGet(url)` — tylko tyle:

```ts
return new Observable(subscriber => {
  fetch(url)
    .then(r => r.json())
    .then(data => {
      subscriber.next(data);
      subscriber.complete();
    });
});
```

**Na ekranie:** ciemny panel kodu na całą szerokość slajdu (37 px w 4:3, 36 px w 16:9), kolorowanie składni: słowa kluczowe, typy, funkcje, parametry, a `next`/`complete` pogrubione w kolorach zdarzeń (niebieski, zielony). Cały kod widoczny od wejścia, bez zwijania i przewijania; numery linii 1–8 po lewej. Każdy etap wyróżnia wyłącznie fragment tekstu (żółte tło z podkreśleniem), nie całą linię; poprzednie wyróżnienie znika.

| Nr | Etap | Wyróżnione |
| --- | --- | --- |
| 0 | start | brak — cały kod |
| 1 | fragment 1 | `subscriber` w pierwszej linii |
| 2 | fragment 2 | `fetch` i `r.json()` |
| 3 | fragment 3 | `subscriber.next(data)` |
| 4 | fragment 4 | `complete()` |

Etapy to zwykłe fragmenty Reveal: prawo/lewo w przód i w tył, hash zapamiętuje etap, druk ma osobną stronę na każdy etap.

**Speaker notes:** osobna notatka na każdy etap (w fragmencie): 0 — „Zajrzyjmy do środka naszego httpGet” (cały kod), 1 — subscriber to odbiorca; funkcja z new Observable uruchamia się dopiero przy subscribe, 2 — fetch wysyła request, r.json() parsuje odpowiedź, 3 — next(data) to kulka z diagramu, 4 — complete() od razu po jedynej wartości HTTP. Prawo: Cold.

### A jeśli wartością jest Observable? — `08-map-strumienie`

**Temat:** map może zwrócić Observable, a spłaszczenie wymaga subskrypcji.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 08-map-strumienie | A jeśli wartością jest Observable? | `id$.pipe(map(id => httpGet(url(id))), concatAll())` |

**Na bloczkach:** id$ → map → concatAll → odbiorca S1, wszystkie definicje oraz S1 widoczne od wejścia. Źródło emituje kolejno A i B; B dopiero po complete pierwszego HTTP. map tworzy zimne Observable A$/B$ przy tym samym logicalAt co wartość wejścia. Na dole powstają dwa osobne pipeline’y: #1 → A$ → HTTP GET → inner #1 oraz #2 → B$ → HTTP GET → inner #2. Zakończony wiersz zostaje jako historia. Nie ma kolejki ani placeholderów.

**Widok początkowy i osiem ręcznych kroków:**

| Krok | Checkpoint | Stan na postoju |
| --- | --- | --- |
| 1 | READY | Wszystkie górne kafelki i S1, bez połączeń i requestów. |
| 2 | `subscribe` | S1 subskrybuje id$ przez concatAll i map. |
| 3 | `first` | A dociera do map, jeszcze przed przekształceniem. |
| 4 | `created` | A$ dociera do concatAll. Pełny dolny pipeline #1 jest widoczny, ale pozostaje idle: bez kabla, portów i postępu; liczniki 0/0. |
| 5 | `active` | Szybka subskrypcja inner #1 do HTTP GET; liczniki 1/1, odpowiedź jeszcze nie wysłana. |
| 6 | `received` | Odpowiedź A przechodzi przez inner #1 i concatAll do S1; HTTP jeszcze bez complete. |
| 7 | `complete-a` | HTTP #1 i inner #1 zakończone, główny tor nadal aktywny; liczniki 1/0. |
| 8 | `complete-b` | Jeden płynny krok: B → map → B$ → concatAll → pipeline #2 → subscribe → HTTP → B do S1 → complete HTTP #2. Liczniki 2/0. |
| 9 | `complete` | Complete źródła przez map i concatAll do S1; FINISHED. |

Każde prawo uruchamia kolejny etap; ponowne prawo podczas ruchu kończy bieżący etap. Po kroku 9 kolejne prawo zmienia slajd, bez dodatkowego przekazania do AUTO. Lewo i R przywracają deterministycznie poprzedni checkpoint i READY. AUTO odtwarza cały przebieg, druk pokazuje finał. Tempo tego slajdu: subscribe i complete 0,4 s na odcinek, przelot i projekcja 0,6 s, praca HTTP 0,8 s, pojawienie się wiersza 0,3 s. Postoje zatrzymują wyłącznie ilustrację.

**Wniosek w FINISHED:** „map tworzy Observable. concatAll subskrybuje je po kolei i przekazuje wyniki do S1.” Liczniki: „Innery uruchomione” = 2, „Aktywne” = 0.

**Speaker notes:** osobne notatki dla READY, ośmiu checkpointów i FINISHED w `template[data-checkpoint-notes="08-map-strumienie"]`. Wyjaśniają tworzenie Observable bez requestu, subskrypcję uruchamiającą HTTP oraz rozdzielenie next i complete. Przejście: co, jeśli kolejna wartość przyjdzie podczas trwającego HTTP? Kolejkowanie pokaże concatMap. Na oba przykłady około 3 minut.

### Wspólny problem 09–12: A pracuje, przychodzi B

Cztery slajdy pokazują identyczną sytuację i zmieniają wyłącznie operator. Kod: `id$.pipe(<operator>(id => httpGet(url(id))))`. Te same wejścia, kolory i tempo: A w 0,6 s uruchamia długi HTTP (3 s), B przychodzi w 2,1 s (A w połowie, HTTP B 1,2 s), C w 5,2 s — po zakończeniu A (HTTP C 1,2 s); id$ kończy się w 5,6 s. Kolory prac: A indygo #6D4CD3, B pomarańcz #B85D05, C niebieski #087FAD.

Góra bez zmian: id$ → operator → kompaktowy Odbiorca, jeden główny tor S1 (nie powstaje nowa subskrypcja główna dla wartości). Dół (pod poziomym separatorem, bez napisu): maksymalnie trzy sloty (A, B, C) o stałej wysokości. **Każde uruchomione inner Observable to osobna instancja HTTP GET z własną wewnętrzną subskrypcją**, wyglądająca jak znany z prezentacji pipeline `HTTP GET → inner subscriber`: standardowy kafelek z turkusowym nagłówkiem HTTP GET i jednym execution lane pod nim, zaczynający się przy lewej krawędzi; lane ma nazwę jak tory u góry — pasek koloru pracy i `#1 · A` w tym kolorze — a za nazwą postęp i stan tekstem (długości jak w catchError wewnątrz), po prawej kabel z portami do pełnego inner subscribera (lane jak odbiorca główny: ikona, „inner #n”, wartość, status). complete — jasnozielone lane, anulowanie — szare, error — jasnoczerwone. Wartość bez inner (oczekuje „?”, „w kolejce”, „pominięte”) ma tylko pasek z nazwą `#2 · B` i neutralny placeholder w miejscu reszty lane — bez nagłówka HTTP GET, progressu, portów, kabla i inner subscribera. Po starcie pracy placeholder przechodzi w pełny kafelek w tym samym slocie; „pominięte” nigdy. Ten sam układ mają `08-map-strumienie`, `11a-distinct-switchmap` oraz slajdy catchError na zewnątrz i w wyszukiwarce; w wyszukiwarce każdy rząd to `HTTP GET ── catchError ── inbox`.

**Wspólny postój `question`:** S1 aktywne, HTTP A pracuje (pasek ok. 46% — identyczny na czterech slajdach), kulka B czeka na porcie wejścia operatora, a #2 · B ma tylko identyfikator i znak „?”: bez „w kolejce”, „pominięte”, projekcji, kafelka HTTP GET, inner subscribera, portów i progressu. Następne „dalej” (osobny ręczny postój `answer`) dopiero uruchamia reakcję operatora; AUTO włącza się po odpowiedzi.

**Subskrypcja główna:** tylko concatMap pokazuje pełną sekwencję (subscribe → A → projekcja → inner HTTP). mergeMap, switchMap i exhaustMap zaczynają w READY od zestawionego S1; jedno „dalej” prowadzi przez emisję A, start HTTP A i dotarcie B wprost do pytania.

### concatMap — `09-concatmap`

**Temat:** obsługa pracy po kolei.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 09-concatmap | concatMap — Po kolei | `id$.pipe(concatMap(id => httpGet(url(id))))` |

**Na bloczkach:** postoje subscribe, first (A dociera, projekcja), active (inner A subskrybowany, HTTP A startuje), question, answer. Odpowiedź: #2 · B przechodzi w „w kolejce” (przerywany placeholder) — wartość bez projekcji, inner, kafelka HTTP GET i inner subscribera. Po complete A placeholder płynnie zmienia się w nowy kafelek HTTP GET B z własnym inner subscriberem w tym samym slocie: projekcja, subskrypcja, progress. B kończy się przed przyjściem C (4,8 s vs 5,2 s modelu), więc C trafia na pustą kolejkę i od razu dostaje swój HTTP; gdyby przyszło w trakcie B, czekałoby w kolejce. Wynik A, B, C.

**Speaker notes (per checkpoint, szablon `data-checkpoint-notes`):**

- **Start:** Operatory, które dla każdej wartości mogą uruchomić osobną pracę. Projekcja zwraca Observable, operator decyduje, kiedy go zasubskrybować.
- **subscribe / A / HTTP A:** jedna główna subskrypcja S1; projekcja tylko tworzy Observable (własny kafelek HTTP GET), request rusza dopiero, gdy inner subscriber — go zasubskrybuje.
- **A pracuje, przychodzi B:** Uruchomimy drugi request czy poczekamy?
- **Odpowiedź:** concatMap kolejkowuje B. Dopóki A się nie skończy, nie wywołujemy nawet projekcji dla B.
- **Wynik:** Kolejność zachowana, kolejka zwiększa opóźnienie.
- **Zastosowanie (tylko w notatkach):** kolejkowanie zapisów, gdy kolejność jest ważna (np. autosave formularza).

### mergeMap — `10-mergemap`

**Temat:** równoległe wykonania strumieni wewnętrznych.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 10-mergemap | mergeMap — Równocześnie | `id$.pipe(mergeMap(id => httpGet(url(id))))` |

**Na bloczkach:** READY z zestawionym S1, postoje question i answer. Odpowiedź: projekcja B i druga, osobna instancja HTTP GET z własnym inner subscriberem równolegle z A (dwa kafelki „w trakcie”, licznik aktywne 2). Krótszy HTTP B kończy przed A: odbiorca dostaje B, A, C w kolejności nadejścia.

**Speaker notes:**

- **Wprowadzenie:** Identyczna sytuacja: A pracuje i pojawia się B, ale tym razem mamy mergeMap.
- **Pytanie:** Czy naprawdę musimy czekać na zakończenie A?
- **Odpowiedź:** Nie. mergeMap uruchamia oba wewnętrzne Observable równolegle. Wyniki mogą wracać w dowolnej kolejności.
- **Zastosowanie (tylko w notatkach):** niezależne, równoległe requesty HTTP (np. szczegóły kilku produktów naraz).

### switchMap — `11-switchmap`

**Temat:** nowa wartość zastępuje poprzednią subskrypcję wewnętrzną.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 11-switchmap | switchMap — Najnowsza subskrypcja | `id$.pipe(switchMap(id => httpGet(url(id))))` |

**Na bloczkach:** READY z zestawionym S1, postoje question, answer, started. Odpowiedź: szary impuls × jedzie od inner subscribera #1 po kablu do HTTP GET A — teardown wewnętrznej subskrypcji A (inner subscriber szarzeje od razu); po jego dotarciu lane #1 · A jest „anulowane” (szary, zatrzymany pasek, bez impulsu complete i bez odpowiedzi) i zostaje widoczne do końca. Górny tor S1 pozostaje aktywny. Potem projekcja B: nowy kafelek HTTP GET B z inner subscriberem (postój started); wynik B, potem C.

**Speaker notes:**

- **Wprowadzenie:** A już pracuje. Teraz przychodzi B.
- **Pytanie:** Co stanie się z A? Dokończy pracę czy zostanie anulowane?
- **Odpowiedź:** switchMap odsubskrybowuje poprzednie wewnętrzne Observable i przełącza się na nowe. Główna subskrypcja S1 nadal działa.
- **Pułapka:** ABORT klienta ≠ cofnięcie operacji serwera; unsubscribe ≠ complete.
- **Zastosowanie (tylko w notatkach):** dane dla aktualnie wybranego użytkownika albo aktualnego wyszukiwania.

### exhaustMap — `12-exhaustmap`

**Temat:** podczas aktywnej pracy ignorujemy nowe wejścia.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 12-exhaustmap | exhaustMap — Jestem zajęty | `id$.pipe(exhaustMap(id => httpGet(url(id))))` |

**Na bloczkach:** READY z zestawionym S1, postoje question i answer. Odpowiedź: #2 z kulką B — przygaszony placeholder „POMINIĘTE”, bez projekcji, inner, kafelka HTTP GET, inner subscribera, portów i kolejki; B nie wraca później. A kończy się normalnie; C przychodzi po zakończeniu A i dostaje własny kafelek HTTP GET z inner subscriberem. Wynik A, C.

**Speaker notes:**

- **Wprowadzenie:** A pracuje. Przychodzi B. Poznaliśmy już kolejkowanie, równoległość i anulowanie.
- **Pytanie:** A co, jeśli nie chcemy teraz przyjmować żadnej kolejnej pracy?
- **Odpowiedź:** exhaustMap ignoruje B. Nie uruchamia projekcji, nie tworzy requestu i nie zapisuje B na później. Dopiero po zakończeniu A może przyjąć następną wartość.
- **Zastosowanie (tylko w notatkach):** ignorowanie kolejnych kliknięć „Zapisz”, dopóki obecny zapis trwa.

### Zaprojektujmy wyszukiwarkę — `12-intro-wyszukiwarka`

**MAIN — bezpośrednio po exhaustMap, przed źródłem query$.** Duży, jasny komponent UI w 16:9 i 4:3: kremowe tło, serifowy tytuł, badge „Ręczny · M”, szeroki panel „Search JS frameworks”, renderowane pole z kursorem i pięć dużych wyników. Label ma 32 px, tekst inputa 40 px, wyniki 36 px w SVG; panel znajduje się wysoko pod tytułem. Pole nie przyjmuje tekstu ani fokusu. Na slajdzie nie ma kodu ani schematu.

**Sterowanie:** pokaz startuje od wejścia i działa w pętli bez ręcznych postojów. Wpisuje `r → re → rea`, kasuje do pustego pola, następnie analogicznie `ang`, `vue` i `sve`; po skasowaniu ostatniej frazy zaczyna od nowa. Każda pełna fraza daje pięć wyników po 300 ms ciszy. Strzałki / Page Up / Page Down od razu zmieniają slajd. Spacja pauzuje/wznawia, R restartuje od pustego pola, F pokazuje nieruchomy kadr pięciu wyników `sve`. Powrót na slajd zaczyna pokaz od nowa. Druk i Upcoming pokazują kadr `sve` bez animacji.

**Wyniki:**

| Fraza | Pięć wyników |
| --- | --- |
| rea | React, Preact, React Native, React Router, React Query |
| ang | Angular, Angular Universal, Angular Material, Angular Signals, RxAngular |
| vue | Vue, Vue Router, VueUse, Petite Vue, BootstrapVue |
| sve | Svelte, SvelteKit, Svelte Material UI, Svelte Motion, Svelte Headless UI |

Dopasowanie bez rozróżniania wielkości liter, także wewnątrz nazwy (np. P**rea**ct, Rx**Ang**ular). Podczas kasowania aktualizuje się natychmiast: **rea** → **re** → **r**. Dotychczasowe wyniki pozostają podczas kasowania; po usunięciu ostatniej litery dropdown gaśnie przez 180 ms. Nie pojawia się ponownie podczas wpisywania następnej frazy, dopóki nie nadejdzie nowa odpowiedź. Pusta fraza nie uruchamia zapytania.

Pisanie co 180 ms, kasowanie co 150 ms, przejście przy pustym polu 700 ms, oglądanie wyników 2 s. Debounce oznacza aktualizację wyników po 300 ms ciszy od ostatniej zmiany, a nie cykliczne zapytanie co 300 ms. Dane i odpowiedzi są lokalną symulacją.

**Stopka:** Pokaz działania gotowej wyszukiwarki: fraza zmienia się automatycznie, a lista wyników reaguje i pogrubia dopasowania.

**Speaker notes:** Gotowy komponent startuje automatycznie, pokazuje cztery przykłady po pięć wyników. Zwróć uwagę na dopasowania wewnątrz nazw, skracanie wyróżnień przy kasowaniu i wygaszenie dropdownu przy pustym polu. Debounce czeka na 300 ms ciszy. Następny slajd zagląda pod spód: budujemy źródło query$ ze zdarzeń input.

### Źródło: skąd bierze się query$? — `12-query-zrodlo`

**MAIN — po „Zaprojektujmy wyszukiwarkę”, przed switchMap na żywo.** W 16:9 i 4:3 wejście pokazuje tylko `const query$ = fromEvent(inputEl, 'input')`, kafelek źródła z pustym inputem i dwóch odbiorców. Pierwsze prawo dodaje kod i kafelek map, drugie share, trzecie szybko zestawia subskrypcje i uruchamia pętlę danych. Kolejne prawo podczas emisji prowadzi do switchMap. Lewo cofa etapy; Spacja pauzuje, R wraca do READY. Wyjście odłącza subskrypcje bez animacji i zatrzymuje RAF; powrót zaczyna od definicji.

```ts
const query$ = fromEvent(inputEl, 'input').pipe(
  map(event => (event.target as HTMLInputElement).value.trim()),
  share()
);
```

**Na ekranie:** rozsunięte kafelki (przerwy 90/100/80 jednostek SVG) z nagłówkiem, wierszem wykonania i portami jak na wcześniejszych slajdach: `fromEvent` → `map` → `share` → dwóch odbiorców „podgląd query” i „wyszukiwarka”. Nagłówki źródła i obu odbiorców mają ten sam duży font co pozostałe kafelki (około 41 jednostek SVG). W wierszu źródła jest ten sam input z kursorem co w pokazach wyszukiwarki. Automatycznie wpisuje `a → an → ang → angu → angul → angula → angular`, czeka, kasuje litery do pustego tekstu i zaczyna od nowa. Zdarzenie `{…}` wjeżdża do map, zmienia się w pełny tekst, a share rozdziela tę samą wartość do obu odbiorców. Wartości są szerokimi kapsułkami: font pozostaje stały, a szerokość rośnie z tekstem (np. `angular`), także w trakcie przelotu. U odbiorcy nowa kapsułka zastępuje poprzednią w tym samym miejscu. Pusty string ma oznaczenie `""`. Jedna wspólna subskrypcja upstream przez map, bez HTTP i liczników.

Kod rysuje standardowy odtwarzacz: kolory składni, pastelowe marki źródła/map/share i aktywne wyróżnienia zsynchronizowane z kafelkami. Źródła `fromEvent` i `query$`, operatory `map` i `share` oraz literał `'input'` korzystają ze wspólnej palety. `fromEvent(inputEl, 'input')` emituje zdarzenie, a map czyta wartość z niego: `event.target` ma typ `EventTarget`, więc kod rzutuje go na `HTMLInputElement` ([sygnatury RxJS 7.8.2](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/observable/fromEvent.ts#L56)). Druk, F i Upcoming pokazują `angular` u obu odbiorców.

**Stopka:** fromEvent tworzy strumień ze zdarzeń input, map wyciąga tekst, a share pozwala współdzielić jedno źródło dalej.

**Speaker notes per checkpoint:**

- **ready — 0 — Źródło i odbiorcy:** Skąd bierze się query$? Na razie mamy tylko definicję fromEvent i pusty input. Dwa pola odbiorców są widoczne, ale nikt jeszcze nie subskrybuje: nie ma portów, przewodów ani emisji. Dalej dodaje map.
- **map — 1 — Wyciągamy tekst:** Dopisujemy .pipe(map(event => (event.target as HTMLInputElement).value.trim())). map dostaje zdarzenie input; event.target ma typ EventTarget, więc rzutujemy go na HTMLInputElement, odczytujemy value i usuwamy białe znaki. Kafelek map pojawia się razem z kodem. To nadal tylko definicja, bez subskrypcji i danych. Dalej dodaje share.
- **share — 2 — Wspólne źródło:** Dopisujemy share() i pokazujemy jego kafelek. Współdzielimy jedno źródło i jedno wykonanie map między podglądem query a wyszukiwarką. Dalsze prawo szybko podłączy obu odbiorców i jedyny upstream, a potem uruchomi pisanie.
- **live — 3 — Subskrypcja i dane:** A szybko subskrybuje przez share i map do fromEvent; B dołącza do share bez drugiej subskrypcji źródła. Dopiero teraz input wpisuje a → an → ang → angu → angul → angula → angular, czeka, kasuje litery do pustego tekstu i powtarza. map zamienia zdarzenie na tekst, share rozdziela tę samą kapsułkę do obu odbiorców. Pusty string to "". Przeloty spowalniają ilustrację, nie rzeczywiste operatory. Spacja pauzuje, lewo wraca do etapu share, R do początkowej definicji. Prawo przechodzi do wyboru operatora; wyjście odłącza subskrypcje i zatrzymuje zegar bez animacji. Powrót zaczyna od READY.
- **finished — 4 — Gotowe query$:** Druk, F i Upcoming pokazują pełny pipeline i angular u obu odbiorców. Mamy gotowy strumień tekstu. Na następnym slajdzie wybierzemy operator: co powinno stać się z poprzednim requestem, gdy przychodzi nowa fraza?

### Wybór operatora — `12a-switchmap-live`

**MAIN — po slajdzie źródła query$, przed debounceTime + switchMap.** READY jest nieruchomym pytaniem: pusty input, zero requestów i liczniki 0/0/0. Kod:

```ts
query$.pipe(
           (query => httpGet(url(query)))
)
```

Pierwsze dalej jednocześnie wypełnia puste wyróżnienie kodu i pusty nagłówek operatora nazwą **switchMap**, mocno wyróżnia operator w kodzie i uruchamia pokaz. Miejsce na nazwę jest zarezerwowane, więc kod nie przeskakuje. Góra: turkusowy query$ z inputem → jasnofioletowy operator → bardzo jasnofioletowy odbiorca „wyniki”, bez zbędnych oznaczeń S1. Kremowe tło i czarny serifowy tytuł pasują do prezentacji. Bloczki mają identyczny płaski wygląd jak na slajdzie debounceTime: nagłówek, prostokątny execution lane i boczny pasek; bez dodatkowych ikon pracy i zaokrąglonych wnętrz.

**Przebieg:** szybkie pisanie r → re → rea (HTTP #1/#2 anulowane, #3 udane), szybkie kasowanie re → r (#4 anulowane, #5 udane), zamiana na a → an → ang (#6/#7 anulowane, #8 udane) i kasowanie an → a (#9 anulowane, #10 udane). Cykl 10 emisji powtarza się od r. Szybkie zmiany co 0,9 s, po ostatniej wartości serii 4,8 s ciszy; praca HTTP 2 s. Krótki odstęp powoduje szary × i „anulowane”, dłuższy pozwala dostarczyć wynik do głównego odbiorcy oraz zakończyć inner zielonym complete. Główny pipeline pozostaje aktywny; ostatni udany wynik zostaje do następnej odpowiedzi.

Frazy lecą w badge’ach ze slajdu źródła query$: stały font 30, szerokość dopasowana do tekstu. HTTP emituje tablicę oznaczoną numerem wykonania, np. `[#2]` lub `[#32]`, która trafia do inner subscribera i głównego odbiorcy. Fraza pozostaje etykietą wejścia requestu.

Pod separatorem najwyżej trzy pełne wiersze HTTP GET → inner subscriber. Nowy request dochodzi na dole; najstarszy znika przed przesunięciem pozostałych. Anulowane nie emitują wyniku ani complete. Numery i liczniki „wejścia”, „requesty HTTP”, „aktywne” rosną bez resetu; aktywne ≤ 1.

**Stopka:** Każde nowe query może przerwać poprzedni request i uruchomić nowy.

**Sterowanie i notatki:** READY daje chwilę na odpowiedź sali. Pierwsze dalej odsłania operator i uruchamia pokaz, kolejne zmienia slajd. Spacja pauzuje/wznawia, R i powrót przywracają pytanie. Lewo wraca do źródła query$. Notatki `ready`, `revealed`, `finished` opisują pytanie, pokaz i nieruchomy kadr (#3 completed, #4 cancelled, #5 active, 5/5/1, tablica [#3] dla rea, input r). Anulowanie klienta nie cofa operacji na serwerze. Następny krok: poczekać 300 ms ciszy dzięki debounceTime.

### debounceTime — czekamy na ciszę — `12b-debounce-switchmap`

**MAIN — bezpośrednio po switchMap na żywo, przed distinctUntilChanged.** Drugi etap projektowania wyszukiwarki.

```ts
query$.pipe(
  debounceTime(300),
  switchMap(query => httpGet(url(query))))
```

**Na ekranie:** mniejszy serifowy tytuł wysoko, trzy linie kodu i pipeline query$ → debounceTime → switchMap → odbiorca z ikoną inbox, bez etykiety S1. Wspólny input i badge fraz ze źródła query$, tablice wyników z numerami HTTP (np. [#1]). Kod i odpowiadające mu bloczki podświetlają się razem. Timer pokazuje pozostały czas tylko podczas odliczania; poza nim nie ma kreski. Stała geometria i maksymalnie trzy ostatnie pełne wiersze HTTP GET → inner, bez placeholderów.

**Przebieg:** te same serie co na switchMap na żywo, plus powrót do tej samej frazy: r/re/rea → re/rea → re/r → a/an/ang → an/a. debounceTime przepuszcza kolejno rea, **rea ponownie** (HTTP #2 dla tej samej frazy, bo debounceTime nie porównuje z poprzednią wartością — wstęp do distinctUntilChanged), r, ang i a. Potem cykl od r, bez końca. Każda zmiana emituje wejście; pośrednie wartości zostają zastąpione przed ciszą. Litery co 100 ms modelu, debounce 300 ms; ilustracja 5× wolniejsza (0,5 s / 1,5 s), z osobnymi przelotami. Każda zmiana resetuje timer. Sama cisza bez nowej zmiany nie powtarza emisji.

Kolejne pisanie zaczyna się 1 s po uruchomieniu poprzedniego HTTP. Request trwa 2 s i zdąży dostarczyć wynik oraz complete inner przed kolejną emisją debounce. Wszystkie HTTP kończą się sukcesem, bez error i anulowania. Główna subskrypcja pozostaje aktywna. Numery requestów, wyniki [#N] i liczniki rosną przez kolejne cykle bez resetu.

**Sterowanie:** postoje subscribed, buffered, request-1, typing, complete-1. Postój typing pyta, czy powrót re → rea uruchomi drugi request. Następne prawo odtwarza drugą emisję rea (HTTP #2 dla tej samej frazy) i uruchamia ciągły pokaz (request-2): od tej chwili nie ma dalszych postojów. Ponowne prawo w trakcie przejścia kończy wprowadzenie i zaczyna emisje. Prawo podczas ciągłych emisji od razu zmienia slajd, także przy pauzie. Lewo cofa do complete-1, Spacja pauzuje/wznawia, R i ponowne wejście resetują do zatrzymanego READY. AUTO może odtworzyć całe wprowadzenie bez postojów i kontynuuje bez końca. F, druk i Upcoming pokazują nieruchomy kadr po trzecim udanym HTTP: #1 rea, #2 rea, #3 r, input ang w pamięci debounceTime z odliczaniem, wynik [#3], liczniki 10/3/0. Notatki per checkpoint, request-2 opisuje cały pokaz ciągły.

**Stopka:** debounceTime przepuszcza wartość dopiero po chwili ciszy. Ta sama fraza może uruchomić request ponownie.

### distinctUntilChanged — znowu to samo? — `11a-distinct-switchmap`

**MAIN — bezpośrednio po debounceTime + switchMap.** Kontynuujemy tę samą wyszukiwarkę; pierwsze zapytania mają do trzech znaków, błędne to react. Poprzedni slajd pokazał duplikaty; tutaj distinctUntilChanged jest widoczny od wejścia i od razu pokazujemy jego działanie. Następny slajd (`11b-catcherror-search`) pokazuje ten sam pipeline z catchError wewnątrz switchMap.

Pełny kod jest widoczny od READY:

```ts
query$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => httpGet(url(query)))
)
```

**Na ekranie:** input, timer i płaskie execution lanes poprzednika. Stałe pozycje: węższy query$ z kompaktowym inputem → debounceTime → distinctUntil / Changed → switchMap → poszerzony inbox z miejscem na ikonę i wartość. Wszystkie bloczki oraz kod są od początku, bez pustego slotu i odsłaniania operatora. Bez widocznych S1, z dotychczasowymi portami, przewodami, paskami i impulsami. Najwyżej trzy rzeczywiste HTTP w dole; najstarszy ustępuje kolejnemu. Syntax highlighting i marki: turkusowe źródła/HTTP, fioletowe operatory. Wcięcia są poza pastelowymi wyróżnieniami, więc tła operatorów zaczynają się w tej samej kolumnie.

**Kolejne naciśnięcia w prawo:**

1. `first`: rea przechodzi przez debounce i distinct, HTTP #1 dostarcza wynik i complete inner. Pauza: 3 zmiany inputa / 3 wejścia query$ / 1 emisja debounce / 1 request / 0 aktywnych.
2. `duplicate`: re → rea po 100 ms, debounce emituje ponownie rea, distinct odrzuca duplikat (przygaszona kulka i podpis). Bez nowego HTTP i anulowania. Pauza: 5 / 5 / 2 / 1 / 0.
3. `successes`: ang i vue przechodzą. Wszystkie trzy HTTP kończą się sukcesem i complete inner, główny pipeline działa. Pauza: 13 / 13 / 4 / 3 / 0.
4. `request-error`: pusty → r → re → rea → reac → react. HTTP #4 już pracuje, jeszcze bez błędu. Pauza: 19 / 19 / 5 / 4 / 1. Pasek i request stoją do kolejnej strzałki.
5. `error`: HTTP #4 emituje error 500. Błąd idzie przez switchMap do odbiorcy; szary teardown odłącza distinct, debounce i query$. Ten HTTP i główny pipeline bez complete. Pauza po pełnym odłączeniu: input nadal react, 19 / 19 / 5 / 4 / 0, główna subskrypcja zakończona błędem.
6. FINISHED: input kasuje react literami (reac → … → pusty) i wpisuje angular. Zmienia się wyłącznie UI, bez kulek RxJS, timera, wyników i HTTP #5. Liczniki: 31 / 19 / 5 / 4 / 0; wynik [#3] zostaje w czerwonym odbiorcy. W dole zakończone poprawnie #2 i #3 oraz błędny #4.
7. Dopiero kolejna strzałka przechodzi na następny slajd.

Litery co 100 ms i debounce 300 ms modelu, ilustracja 5× wolniejsza. Każdy z pięciu postojów zatrzymuje MANUAL i AUTO dowolnie długo. Szybkie dalej kończy wyłącznie bieżący etap; nie przeskakuje z sukcesów od razu do finału ani na kolejny slajd. Lewo cofa po checkpointach, R i powrót resetują READY, wyjście zatrzymuje zegar. F/druk/podgląd końcowy pokazują angular i martwy pipeline. Notatki: ready, first, duplicate, successes, request-error, error, finished.

**Stopka końcowa:** Jeden nieobsłużony błąd HTTP zakończył całą wyszukiwarkę.

### catchError — wyszukiwarka działa dalej — `11b-catcherror-search`

**MAIN — bezpośrednio po distinctUntilChanged, przed oboma slajdami catchError z kliknięciami.** Ta sama wyszukiwarka, nowa subskrypcja (nie przywracamy tej zamkniętej błędem). Poprzedni slajd pokazał `react → HTTP 500 → error odbiorcy → angular nie działa`; tutaj `react → HTTP 500 → catchError → [] → angular → HTTP 200 → wynik`.

Pełny kod jest widoczny od READY, bez etapu odsłaniania catchError:

```ts
query$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query =>
    httpGet(url(query)).pipe(
      catchError(() => of([]))
    )
  )
)
```

**Na ekranie:** górny pipeline identyczny z distinct (query$ z inputem → debounceTime → distinctUntil / Changed → switchMap → odbiorca z ostatnim wynikiem, te same pozycje, tory, timer i pamięć). Dół: każde wykonanie to rząd `#n → fraza → HTTP GET → catchError → inner subscriber`; w READY widać same nagłówki HTTP GET i catchError w miejscu pierwszego rzędu. Dwa sloty wykonań, więc diagram jest niższy o jeden slot przy tej samej skali kafelków. Marki kodu: turkusowe query$ i httpGet, fioletowe debounceTime, distinctUntilChanged, switchMap i catchError (świeci przy przechwyceniu błędu i przekazaniu wyniku #2).

**Kolejne naciśnięcia w prawo (wszystkie postoje zatrzymują też AUTO):**

1. `error`: subscribe od odbiorcy do query$, wpisanie react literami, 300 ms ciszy, distinct przepuszcza, switchMap tworzy HTTP #1 (subskrypcja przez catchError do httpGet), request kończy się error 500. Pauza dokładnie przy dotarciu czerwonego impulsu do catchError: HTTP #1 czerwony, odbiorca bez błędu, główna subskrypcja aktywna. Liczniki: 5 wejść / 1 emisja / 1 request / 1 błąd / 0 aktywnych.
2. `fallback`: w catchError pojawia się of([]); [] trafia do inner subscribera i przez switchMap do odbiorcy; zastępczy strumień kończy się complete (zielony catchError i ✓ complete innera). HTTP #1 zostaje error 500.
3. `success` (koniec sceny): kasowanie react i wpisanie angular, każda zmiana trafia do query$; debounce i distinct przepuszczają angular, HTTP #2 zwraca [#2], który przechodzi przez catchError bez zmian do odbiorcy; complete HTTP #2 przechodzi przez catchError i kończy inner. Główny pipeline bez error, complete i teardown. Liczniki: 17 / 2 / 2 requesty / 1 błąd / 0 aktywnych, input angular, wynik [#2].
4. Kolejna strzałka przechodzi na następny slajd.

Szybkie dalej kończy wyłącznie bieżący etap, lewo cofa po checkpointach, R i powrót resetują READY. F/druk/podgląd końcowy pokazują finał. Notatki: ready, error, fallback, success, finished.

**Stopka końcowa:** Błąd jednego requestu nie musi kończyć całego strumienia.

### catchError — `b04-catcherror`

**Temat:** miejsce obsługi błędu wpływa na kolejne zapytania. W MAIN po wyszukiwarce z lokalną obsługą błędu pokazujemy catchError na zewnątrz, a następnie podsumowanie.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b04-catcherror | catchError na zewnątrz | `klik$.pipe(switchMap(id =>`<br>`  httpGet(url(id))), catchError(() => of([])))` |

**Na bloczkach i w animacji:**

- Na zewnątrz (ten sam design): góra „klik$” → „switchMap” → „catchError” → kompaktowy odbiorca S1 — cztery kafelki z execution lanes, porty i kable toru S1 na jednej wysokości. Pod linią podziału (bez napisu) instancja jak w 09–12: `#1 · A`, turkusowy kafelek HTTP GET z lane (progress na pełną wysokość) i krótki kabel do inner subscribera; bez etapu catchError w dole i bez kontenera.
- Przebieg na zewnątrz (czas modelu; końcowy slajd jest szybki — liczy się to, co po błędzie): S1 subskrybuje w 0,3 s, klik A w 0,6 s tworzy inner #1 i HTTP A. HTTP trwa 1 s: w 1,6 s HTTP A emituje error (bez complete): lane HTTP i inner subscriber czerwone (! error), czerwony impuls biegnie do inner subscribera, a potem przez switchMap do zewnętrznego catchError. Po jego dotarciu catchError odłącza pierwotny strumień: szary impuls × od switchMap do klik$, wiersze klik$ i switchMap szare (teardown, bez czerwieni i complete). Następnie w wierszu catchError chwilowo widać `of([])`: catchError subskrybuje Observable zastępczy, kulka [] (kolor S1) wychodzi w 2,3 s, a zielony impuls complete w 2,6 s (catchError i S1 zielone). Klik B w 3,4 s pojawia się w szarym wierszu klik$ i gaśnie: nie dociera do switchMap, nie ma projekcji, inner ani HTTP. Licznik requestów HTTP: 1.
- Postoje na zewnątrz: error (pierwsze dalej przechodzi klik A, krótki HTTP i błąd bez zatrzymania), caught, fallback, click-b, potem AUTO do podsumowania; całość ok. 10,6 s ilustracji. Notatki per checkpoint w `template[data-checkpoint-notes="b04-catcherror"]` (start, klik A i błąd, przechwycenie, fallback, kolejne kliknięcie, podsumowanie).

**Speaker notes:**

> Porównaj ten slajd z poprzednią wyszukiwarką: tam catchError obsługiwał błąd pojedynczego HTTP wewnątrz switchMap, więc kolejne zapytanie działało. Tutaj catchError stoi za switchMap. Klik A uruchamia HTTP, a po błędzie catchError odłącza pierwotny strumień (klik$ i switchMap) i subskrybuje of([]). S1 dostaje [] i complete; klik B nie uruchamia HTTP B. Nie sugeruj, że każdy zewnętrzny catchError zawsze kończy wynik: tutaj wynika to z wyboru of([]).
>
> Na zewnątrz (per checkpoint): „Zobaczmy, co się stanie, gdy HTTP zwróci błąd, a catchError znajduje się na zewnątrz switchMap.” → „Kliknięcie A szybko uruchamia HTTP, a ten od razu zwraca błąd. Wewnątrz nie ma catchError, więc błąd propaguje się przez switchMap. Interesuje nas, co stanie się dalej.” → „Dopiero tutaj łapie go zewnętrzny catchError. Problem polega na tym, że oryginalny strumień zostaje odsubskrybowany.” → „CatchError przełącza się na zastępcze of([]). Dostajemy pustą tablicę, a potem complete.” → „I teraz klikamy ponownie. Nic się nie dzieje. Nie dlatego, że switchMap zignorował kliknięcie, tylko dlatego, że nie mamy już aktywnej subskrypcji kliknięć.” → „W wyszukiwarce obsłużyliśmy błąd pojedynczego HTTP. CatchError na zewnątrz zastępuje cały strumień po błędzie; tutaj of([]) emituje i kończy wynik. Przejdźmy do czterech pytań podsumowania.”

Semantyka zastępowania błędu: [implementacja catchError w RxJS 7.8.2](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/catchError.ts).

## Współdzielenie i zastosowania w UI

### share a shareReplay — `20-sharereplay`

**Temat:** odbiorca dołączający po odpowiedzi i complete HTTP. share() współdzieli aktywne wykonanie, ale domyślnie (resetOnComplete: true) nie przechowuje wyniku po complete. Oba warianty używają wyglądu torów z cold/Subject. shareReplay({ bufferSize: 1, refCount: true }) ma dodatkowo małą kieszeń „bufor” pod kafelkiem operatora: późny odbiorca dostaje wartość z pamięci operatora, a nie z nowego requestu. Licznik requestów w obu wariantach opiera się na stanie wykonań.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 20-sharereplay | share: późny odbiorca uruchamia HTTP | `http$.pipe(share())` |
| 20-sharereplay-2 | shareReplay: późny odbiorca dostaje wynik | `http$.pipe(`<br>`  shareReplay({ bufferSize: 1, refCount: true }))` |

**Na bloczkach i w animacji:**

- share (tory jak cold): trzy kolumny HTTP GET → share() → kompaktowi odbiorcy A/B z inboxami, bez legendy i dodatkowych paneli. Jeden nagłówek „HTTP GET”, dwa wiersze wykonań: #1 (fioletowy, uruchomiony przez A) i #2 (pomarańczowy, uruchomiony przez B); porty HTTP, share() i odbiorców leżą na wspólnym Y toru. Kod `http$.pipe(share())` bez trwałych subscribe; chwilowe „.subscribe()” z literą A/B nad kolumną odbiorców trwa do dotarcia impulsu do HTTP, a po nim nad HTTP GET → share() migawka „request HTTP #1” (A) albo „nowy request HTTP #2” (B) do wysłania odpowiedzi. Kulki 42 mają kolor wykonania i odbiorcy: z HTTP #1 do A fioletowa, z HTTP #2 do B pomarańczowa (jak share 04a i Subject). Po dotarciu complete odbiorca pokazuje zielone „✓ complete”.
- Przebieg (czas modelu, krótkie requesty): A subskrybuje w 0,6 s, HTTP #1 emituje 42 w 1,6 s (request 1 s), complete w 2,1 s (zielony impuls, wiersze A w stanie completed, kable przygaszone). B pojawia się i subskrybuje dopiero w 3,1 s, uruchamia HTTP #2, które emituje nowe 42 w 4,1 s i kończy się w 4,6 s. B nie dostaje wyniku A. Liczniki „Requesty HTTP” (0 → 1 → 2, po zestawieniu subskrypcji A i B) i „Aktywne” (1 tylko w trakcie requestu; na końcu 0).
- Dwa kroki share: complete-a (A dostał 42 i complete, HTTP #1 zakończone) i complete-b (koniec sceny: HTTP #2 dla B, podpis „A kończy się poprawnie. Późny odbiorca B uruchamia nową subskrypcję upstream, więc powstaje HTTP #2.”); kolejne „dalej” zmienia slajd. Notatki prelegenta per checkpoint w `template[data-checkpoint-notes="20-sharereplay"]` (ready, complete-a, complete-b, finished; 45–60 s), jak w Subject.
- shareReplay (tory jak share): HTTP GET → shareReplay(1) → odbiorcy A/B. Jeden nagłówek „HTTP GET” i tylko jedno wykonanie #1 (fioletowe, uruchomione przez A); B nie dostaje toru HTTP. Pod kafelkiem shareReplay(1) wisi kieszeń „bufor” z jednym slotem (przerywany okrąg, gdy pusty), która zjeżdża razem z rosnącymi wierszami.
- Przebieg (czas modelu): A subskrybuje w 1 s i uruchamia HTTP #1; odpowiedź 42 w 5 s rozgałęzia się w wierszu A — jedna kulka jedzie do A, druga do kieszeni bufora (zapis równolegle z rozesłaniem). Complete w 6 s: tory A zakończone, bufor nadal zawiera 42 (refCount: true nie czyści wyniku zakończonego źródła). B subskrybuje w 7 s tylko do shareReplay(1); po zestawieniu subskrypcji kopia 42 wyjeżdża z kieszeni do portu B i trafia do odbiorcy B, potem complete. Kulki w kolorach odbiorców (A fioletowa, B pomarańczowa), w buforze wartość z wykonania #1. Licznik „Requesty HTTP”: 0 → 1 i zostaje 1.
- Postoje shareReplay: subscribed-a, request (HTTP w trakcie, bufor pusty), stored (A i bufor mają 42), complete-a, subscribed-b (przed wyjęciem z bufora), replayed (B ma 42 i complete), potem AUTO do FINISHED z podpisem podsumowania. Notatki per checkpoint w `template[data-checkpoint-notes="20-sharereplay-2"]` (0–7, 45–60 s).

**Speaker notes:**

> share (notatki per checkpoint): A uruchamia HTTP #1, które od razu zwraca 42 i kończy się; share resetuje się po complete, więc późny B uruchamia HTTP #2 — ta sama definicja, nowy request; ostatecznie obaj mają 42, ale były dwa requesty. Przejście do shareReplay. shareReplay (notatki per checkpoint): A uruchamia jedno HTTP; 42 trafia do A i jednocześnie do bufora; request się kończy, wartość zostaje; późny B dostaje 42 bezpośrednio z bufora, a następnie complete, bez drugiego requestu. Kluczowa różnica względem share(): jeden request, a późny odbiorca nadal dostaje wynik. shareReplay({bufferSize:1,refCount:true}) zachowuje wynik poprawnie zakończonego źródła (wewnętrzny ReplaySubject); refCount: true nie usuwa tego bufora. Wersja RxJS 7.8.2.

### shareReplay(1): kto zatrzyma interval? — `20a-sharereplay-interval`

**MAIN — między share z późnym odbiorcą (`20-sharereplay`) a shareReplay z refCount: true na interval (`20b-sharereplay-refcount`). Cel: 45–60 s.** Wygląd, bufor i animacje identyczne jak na „shareReplay: późny odbiorca dostaje wynik”: kod `interval(1000).pipe(` / `  shareReplay(1))`, kafelek `interval(1000)` z torem `#1`, `shareReplay(1)` z kieszenią „bufor” pod spodem, odbiorcy A/B z inboxami. Każda wartość wjeżdża do wiersza shareReplay(1) i rozdziela się: kulka do odbiorcy i kulka do bufora; bez odbiorców jedzie tylko do bufora. Późny odbiorca dostaje najpierw kulkę wyjeżdżającą z kieszeni, potem kolejne na żywo. Liczniki Odbiorcy i Upstream.

**Scena na żywo — interval emituje bez przerwy, także między krokami:**

| Krok | „Dalej” | Co się dzieje |
| --- | --- | --- |
| 0 | READY | Same definicje, pusta kieszeń, Odbiorcy 0 / Upstream 0. |
| 1 | `subscribed-a` | `.subscribe()` A: jedno połączenie z interval i start emisji; od teraz wartości płyną cały czas do A i do bufora. |
| 2 | `unsub-a` | `.unsubscribe()` A: × kończy się na shareReplay(1); interval emituje dalej, wartości trafiają tylko do bufora; 0 / 1. |
| 3 | `subscribed-b` | `.subscribe()` B: najpierw ostatnia wartość z bufora, potem kolejne na żywo; bez drugiego upstreamu. |
| 4 | `unsub-b` | `.unsubscribe()` B: znów zero odbiorców, interval nadal pracuje, bufor się aktualizuje. |

Kolejne „dalej” zmienia slajd, lewo cofa ostatnią akcję. Konkretne liczby zależą od chwili kliknięcia; druk i hash używają umownych chwil akcji. Bez complete i bez odłączenia upstreamu. Notatki per checkpoint w `template[data-checkpoint-notes="20a-sharereplay-interval"]`; finished prowadzi do shareReplay({ bufferSize: 1, refCount: true }) na tym samym interval.

### shareReplay z refCount: kiedy znika bufor? — `20b-sharereplay-refcount`

**MAIN — między shareReplay(1) na interval (`20a-sharereplay-interval`) a shareReplay z refCount: true na HTTP (`20-sharereplay-2`). Cel: 60–75 s.** Wygląd jak `20a`: kod `interval(1000).pipe(` / `  shareReplay({ bufferSize: 1, refCount: true }))`, kafelek `interval(1000)` z wierszami wykonań `#1` i `#2`, `shareReplay(1)` z kieszenią „bufor”, odbiorcy A/B/C. Liczniki Odbiorcy i Upstream.

**Scena na żywo — każde „dalej” to jedna akcja; szybkie „dalej” w trakcie animacji tylko ją kończy:**

| Krok | „Dalej” | Co się dzieje |
| --- | --- | --- |
| 0 | READY | Same definicje, pusta kieszeń, Odbiorcy 0 / Upstream 0. |
| 1 | `subscribed-a` | `.subscribe()` A: połączenie #1 z interval, emisje płyną do A i do bufora. |
| 2 | `subscribed-b` | Pauza animacji (napis „pauza animacji” nad interval): interval nie emituje, ostatnia wartość dojeżdża do bufora. `.subscribe()` B dostaje ją z kieszeni; nadal jeden upstream (2 / 1). |
| 3 | `resumed` | interval znowu emituje do A i B. Pytanie: kiedy bufor zostanie wyczyszczony — przy unsubscribe czy przy kolejnym subscribe? |
| 4 | `unsub-all` | `subA.unsubscribe()`, `subB.unsubscribe()`: refCount = 0, shareReplay od razu robi reset — kulka w buforze gaśnie, × biegnie do interval #1 (0 / 0). |
| 5 | `subscribed-c` | `.subscribe()` C: pusty bufor, nowe wykonanie interval #2 liczy od 0 (1 / 1). |
| 6 | `unsub-c` | `.unsubscribe()` C: ponowny reset, interval #2 odłączony, koniec sceny; następne „dalej” zmienia slajd. |

Odpowiedź na pytanie (RxJS 7.8.2): bufor znika przy unsubscribe ostatniego odbiorcy. `shareReplay({ refCount: true })` to `share()` z `ReplaySubject`, `resetOnRefCountZero: true` i `resetOnComplete: false`: przy refCount 0 stary ReplaySubject przepada, nowy powstaje przy następnej subskrypcji. Gdy źródło wcześniej wysłało complete (HTTP na następnym slajdzie), resetu nie ma i bufor zostaje. Konkretne liczby zależą od chwili kliknięcia; druk i hash używają umownych chwil akcji. Notatki per checkpoint w `template[data-checkpoint-notes="20b-sharereplay-refcount"]`.

### Cztery pytania przed kolejnym pipe — `25-podsumowanie`

**Temat:** pytania pomagające dobrać operatory do rzeczywistej potrzeby.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 25-podsumowanie | Cztery pytania przed kolejnym pipe | Brak; karty podsumowania. |

**Na bloczkach:** cztery pojawiające się karty: „Czy trzeba?”, „Kiedy zacząć?”, „Co z poprzednią pracą?”, „Czy można współdzielić?”. Podpisy przypominają kolejno distinctUntilChanged; debounceTime/auditTime; concatMap/mergeMap/switchMap/exhaustMap; share/shareReplay.

**Speaker notes:** narracja przez cztery karty, potem zakończenie z nawiązaniem do tytułu.

- **Czy trzeba?** Zanim wykonamy kolejną operację, sprawdźmy, czy rzeczywiście pojawiła się nowa wartość. Czasem distinctUntilChanged oszczędzi nam cały request.
- **Kiedy zacząć?** Nie zawsze musimy reagować natychmiast. Czasem warto poczekać na ciszę, a czasem regularnie aktualizować ostatnią wartość.
- **Co z poprzednią pracą?** Czy nowa operacja ma czekać, działać równolegle, anulować poprzednią, czy zostać zignorowana? Tutaj wybieramy odpowiedni operator *Map.
- **Czy można współdzielić?** Jeśli kilku odbiorców potrzebuje tych samych danych, zastanówmy się, czy naprawdę każdy musi uruchamiać własne wykonanie.
- **Zakończenie:** Nie chodzi o zapamiętanie wszystkich operatorów RxJS. Chodzi o to, żeby rozumieć, jakie decyzje podejmują za nas — wtedy z operatorami, które znamy, możemy wreszcie spokojnie zagadać.

## Pytania i dodatki

### Pytania? — `pytania`

**Temat:** zakończenie głównej części i wejście do dodatku.

**Na ekranie:** koniec MAIN i link do pierwszego dodatkowego przykładu: combineLatest (`x02-combinelatest-withlatestfrom`). Pilot nie przechodzi automatycznie z MAIN do dodatków. Wszystkie trzy dodatki mają link „Powrót do pytań”.

**Speaker notes:** Zaproś do pytań. Jeśli chcesz rozwinąć temat, otwórz dodatkowy przykład combineLatest.

### combineLatest — ostatnie wartości z wielu źródeł — `x02-combinelatest-withlatestfrom`

**Pierwszy slajd EXTRAS, zaraz po „Pytania?”.** Dwa kontrolowane źródła przekazują wartości do jednego wykonania `combineLatest`. Kod: `combineLatest([userId$, language$])`.

**Na bloczkach:** `userId$` i `language$` stoją jeden pod drugim i mają osobne przewody do fioletowego `combineLatest`. Operator ma jeden fioletowy nagłówek i trzy przylegające pasy: pomarańczowy id i niebieski lang ze slotami ostatnich wartości przy prawej krawędzi oraz jeden fioletowy pas wyjściowy S1. Osie wejść są wyrównane z execution lanes źródeł. Kompaktowy odbiorca z ikoną i oznaczeniem S1 stoi na osi wyjścia; trzy dwukolorowe pary mieszczą się w jednej poziomej historii. Niższe nagłówki źródeł pozwalają ustawić je blisko siebie bez kolizji. READY ma puste sloty i brak połączeń. Subskrypcja S1 najpierw dociera do operatora, który następnie podłącza oba źródła. Nie ma panelu prac, timerów, complete, error ani unsubscribe.

| Checkpoint | Stan operatora | Historia S1 |
| --- | --- | --- |
| `subscribed` | `id: —`, `lang: —`; dwa aktywne wejścia | pusta |
| `user-42` | `id: 42`, `lang: —` | pusta |
| `language-pl` | `id: 42`, `lang: PL` | `[42, PL]` |
| `language-en` | `id: 42`, `lang: EN` | `[42, PL]`, `[42, EN]` |
| `user-43` | `id: 43`, `lang: EN` | `[42, PL]`, `[42, EN]`, `[43, EN]` |
| `summary` | ostatnie wartości 43 i EN; połączenia aktywne | trzy dwukolorowe pary |

`userId$` jest pomarańczowy, a `language$` niebieski przez cały przepływ. Wynik jest jedną zwartą parą z dwoma kolorowymi segmentami, zarówno podczas przelotu, jak i w historii. Speaker notes podkreślają warunek pierwszej wartości ze wszystkich źródeł oraz późniejszą reakcję na każdą zmianę dowolnego wejścia.

### retry — nie udało się? Spróbuj później — `x03-retry-backoff`

**Drugi slajd EXTRAS, bezpośrednio po combineLatest.** Kod używa współczesnego API `retry({ count, delay })`: `count: 3` pozwala na trzy ponowienia poza pierwszym wykonaniem, czyli maksymalnie cztery requesty HTTP. Funkcja `delay` zwraca `timer(1000 * 2 ** (retryCount - 1))`, dlatego kolejne odstępy wynoszą 1, 2 i 4 sekundy.

**Na bloczkach:** jeden niezmienny pipeline HTTP GET → retry → pełny odbiorca A, bez dolnego panelu. A pojawia się przy subskrypcji i subskrybuje tylko raz. Pod jednym niebieskim nagłówkiem HTTP GET rośnie stos wykonań tego samego cold Observable: najnowsze jest zawsze na górze, a wcześniejsze płynnie przesuwają się niżej i pozostają jako historia. Pierwsze trzy wiersze `#1–#3` kończą się czerwonym error; `#4` pokazuje User i complete. Tylko górne wykonanie ma aktywny port i przewód do jednego operatora retry; historyczne wiersze nie mają własnych odbiorców ani przewodów.

Po każdym z trzech błędów czerwony impuls kończy się na retry i nie dociera do A. MANUAL zatrzymuje się przy błędzie; następne prawo uruchamia pełne odliczanie w jedynym lane operatora (`czekam 1,0 s`, `2,0 s`, `4,0 s`) i dopiero po jego zakończeniu nową subskrypcję źródła; ponowne „dalej” w trakcie odliczania kończy etap (skok do nowej subskrypcji), jak na pozostałych slajdach. Wtedy zakończone wiersze przesuwają się o jedną pozycję w dół, a nowa próba pojawia się bezpośrednio pod nagłówkiem HTTP GET. AUTO zachowuje pełne odstępy. W czasie backoff licznik „Aktywne” wynosi 0. Wyjście ze slajdu resetuje scenę i zatrzymuje wspólny RAF.

Checkpointy: request-1, error-1, request-2, error-2, request-3, error-3 (pytanie o następne 8 s), request-4, success i summary. Finał: Requesty HTTP 4, Aktywne 0; A otrzymał `next(User) → complete`, bez trzech pośrednich błędów. Notatki przypominają o terminalnym error po wyczerpaniu prób, maksymalnym opóźnieniu, jitterze i ponawianiu wyłącznie odpowiednich błędów przejściowych.

### defer — nie wywołuj mnie jeszcze — `x04-defer`

**Trzeci slajd EXTRAS, bezpośrednio po retry.** Pokazuje moment wywołania funkcji fabrykującej źródło. `loadUser()` to `fetch('/api/users/42').then(response => response.json())` — zwraca Promise i uruchamia request już w chwili wywołania. Jeden diagram ma dwie kolejne fazy, nigdy widoczne jednocześnie.

**Faza 1 — `const user$ = from(loadUser());`.** READY: niebieski nagłówek `from(loadUser())` i wiersz wykonania `HTTP #1` w stanie `pending`, który już się wypełnia, choć nie ma odbiorców ani przewodów; chwilowe `loadUser()` #1 nad kafelkiem, `loadUser()` w kodzie wyróżnione. Liczniki: Wywołania loadUser() 1, Requesty HTTP 1. A (fiolet), potem B (pomarańcz) subskrybują — impuls `.subscribe()` biegnie do `from`, w kafelku rosną ich wiersze subskrypcji, ale nie powstaje drugi request. Promise się rozwiązuje (`✓ resolved`): jedna kulka „{…}” wychodzi z wiersza `HTTP #1` do portów A i B; oba pola dostają User i `✓ complete`. To nie `share()` — współdzielona jest operacja rozpoczęta wcześniej.

**Faza 2 — `const user$ = defer(() => loadUser());`.** Diagram, kod i liczniki zaczynają od zera: sam nagłówek `defer(() => loadUser())`, bez wykonań i odbiorców, liczniki 0/0 (fioletowe wyróżnienie `defer`). Subskrypcja A wywołuje fabrykę (`loadUser()` #1): w wierszu A startuje HTTP #1. Subskrypcja B — zanim HTTP #1 się skończy — wywołuje ją drugi raz (`loadUser()` #2): dwa requesty trwają równolegle. A dostaje User i complete, gdy B jeszcze czeka; potem B. Finał: 2 wywołania, 2 requesty.

Postoje: from-a, from-b, from-complete, defer-definition, defer-a, defer-b, defer-a-complete, defer-b-complete, summary. MANUAL zatrzymuje się na każdym. AUTO zatrzymuje się dwa razy: na wyniku `from` (from-complete) i na pustej definicji `defer` (defer-definition); kolejne „dalej” odtwarza resztę do FINISHED. Cofanie przez granicę faz przywraca dokładny kadr wyniku `from`. Wyjście ze slajdu resetuje scenę. Bez error, retry i unsubscribe.

Notatki zawierają tabelę 1/1 vs 2/2 oraz praktyczny przykład bez animacji: ``defer(() => httpGet<User>(`/api/users/${selectedId}`))`` odczytuje aktualne `selectedId` dopiero przy subskrypcji (A → 42, zmiana na 43, B → 43); sama zmiana zmiennej niczego nie emituje ani nie subskrybuje, a zwykły `httpGet` ze stałym URL nie wymaga defer, bo już jest cold.

## Gdzie jest źródło treści

- `index.html`: statyczne slajdy, kolejność i speaker notes (`<aside class="notes">`).
- `animations/catalog.js`: wartości, czasy, podpisy pod diagramem, liczniki i dane scen.
- `animations/reference-scenes.js`, `scene-config.js`: konfiguracje rodzin, zakresy catchError i postoje.
- `animations/presentation.js`: końcowe tytuły i warianty tworzonych slajdów.
- `public/`: fotografie, plakaty, logo i QR.

Scena `01-tytul` istnieje w katalogu, ale nie jest podpięta do slajdów; widoczny tytuł to statyczny `#tytul`. Spis dokumentuje aktualną treść repozytorium, łącznie z historycznymi datami i planami podanymi na slajdach.

## Weryfikacja i podgląd

Wszystkie animowane warianty korzystają z jednego kompilatora, renderera SVG i odtwarzacza. Panel prac wewnętrznych ma lokalne poziome połączenia, bez stałych przewodów między górą a dołem slajdu. Kolejka jest szara od pierwszej klatki. Panel jest wspólnym prymitywem: pasek pracy, complete, kolejka i anulowanie mają również opis tekstowy. Na migrowanych slajdach diagram zajmuje większą część ekranu, a podpis jest w dolnej stopce; w pozostałych scenach zachowano dotychczasowe proporcje.

Podgląd developerski: /work/animation-review.html (lokalna konfiguracja Vite ma base `/`; build ma `/rxjs-operatory/`) — wybór sceny i formatu (4:3/16:9), READY, pytanie, FINISHED i audyt granic tekstu. Uruchom npm test oraz npm run build po zmianach animacji. Próba na fizycznym projektorze i próba 30–35 minut części właściwej wymagają prelegenta; otwarcie i dogrywka są dodatkowo.

## Zaakceptowany układ rodziny *Map

Slajdy MAIN 08–12 korzystają ze wspólnego adaptera `configureHttpWorkPanel` na bazie `flattenGraph`. Góra pokazuje jeden S1 z execution lanes, pastelowymi nagłówkami i kolorowymi poziomymi połączeniami. Źródło nie trzyma historii emisji; do czterech odpowiedzi HTTP mieści się w kompaktowym odbiorcy. Kulki mają białe litery i pełną paletę A indygo #6D4CD3 / B pomarańcz #B85D05 / C niebieski #087FAD / D malinowy #B73770. Tę samą paletę mają porty, paski i linie prac; progress jest łagodniejszy, complete jasnozielone.

Dół: poziomy separator i do trzech wewnętrznych pipeline'ów jeden pod drugim (na wprowadzeniu `08-map-strumienie` dwa kolejne wykonania). Każde utworzone i subskrybowane inner to pełny rząd: **ID wykonania (#1) → kulka wartości wejścia (A / A$) → HTTP GET (nagłówek + pełny execution lane z postępem i stanem tekstem) → opcjonalny operator (catchError) → inner subscriber** — pełny lane jak odbiorca główny, z ikoną, etykietą „inner #1”, odebraną wartością i statusem (`✓ complete`, `! error`, `× odłączono`). Standardowe kolumny rodziny *Map i catchError są wspólne dla wszystkich wykonań: ID od x 50, kulka, HTTP GET 180–480, catchError 540–780, subscriber 840–1210 (pod odbiorcą głównym); bez operatora kabel HTTP → subscriber jest po prostu dłuższy. Wartość bez utworzonego inner ma ID, kulkę i neutralny placeholder o wysokości lane: „?” (pytanie), „W KOLEJCE” (concatMap — wartość przed projekcją) albo przygaszone „POMINIĘTE” (exhaustMap) — bez HTTP GET, subscribera i portów. switchMap zachowuje cały anulowany pipeline #1 (szary impuls × od subscribera do HTTP, ID szare, `× odłączono`, bez complete). distinctUntilChanged odrzuca duplikaty w górnym operatorze, bez dolnego wiersza; jego wyszukiwarka korzysta z kolumn poprzedniego slajdu debounceTime (ID x 40, kulka x 180, HTTP x 280, subscriber x 720). Nie ma napisu nad pracami, ramki sekcji ani przewodów między poziomami; wynik inner logicznie wraca przez górny operator.

**Kod na wszystkich slajdach** ma subtelne kolorowanie składni (źródła i `httpGet`, operatory RxJS, literały, parametry funkcji, typy, słowa kluczowe) jako osobną warstwę pod pastelowymi wyróżnieniami fragmentów powiązanych z kafelkami; jasne tło i duże fonty bez zmian.

Prototypy QA zachowują poprzednie modele oraz geometrię. Cold/share pozostają bez zmian. Slajdy catchError korzystają z tego samego adaptera z panelem instancji jak 09–12 — w wyszukiwarce każdy rząd to #n → kulka → HTTP GET → catchError → inner subscriber, na zewnątrz #n → kulka → HTTP GET → inner subscriber, a catchError stoi w górnym potoku.

W concatMap B pojawia się jako wartość W KOLEJCE; dopiero po complete poprzednika powstaje B$ i jego subskrypcja. Wprowadzenie map + concatAll pokazuje A$/B$ i dwa kolejne udane HTTP, bez kolejki; pierwszy pełny pipeline pojawia się przed wewnętrzną subskrypcją. Wiersze zakończone pozostają zielone; pominięte wejścia exhaustMap nie tworzą wykonań. Kapsułki emisji i odbioru wchodzą przez 0,3 s. Postęp jest wyliczany w czasie ilustracji; w MAIN 08–12 kulka najpierw przechodzi po lokalnym wyjściu do prawej granicy panelu, a potem wychodzi z operatora. Prototypy zachowują krótki, niewidoczny powrót.

Liczniki uruchomionych i aktywnych inner korzystają ze stanu faktycznych subskrypcji. Nawigacja i postoje Reveal rodziny flatteningu pozostają dotychczasowe. Kontroler `stages` działa w podglądzie prototypów oraz w przebudowanym wprowadzeniu (04, wszystkie 05, oba 20). Spacja pauzuje/wznawia także pozostałe animacje, bez zmiany natywnej obsługi statycznego otwarcia. Zachowano identyfikatory i działające demonstracje; kolejność części właściwej odpowiada opisanej wyżej narracji 30–35 minut.

Na migrowanych slajdach diagram zajmuje 480 px wysokości. Większe kafelki mają 76 px wysokości, a odstęp do paneli 60 px; wiersze prac w prototypach są rozdzielone o 20 px, a MAIN 08–12 ma przylegające wiersze nowego panelu. Mniejszy podpis i liczniki są w stopce przy dole slajdu. U pokazuje kontrolki w miejscu stopki; ukrycie kontrolek przywraca podpis.

W `map + concatAll` górny pipeline ma cztery poziome kolumny: id$ → map → concatAll → odbiorca. Kulka A/B wjeżdża do map i zmienia się w A$/B$ w czasie ilustracji 0,6 s, bez czasowego progressu. Każdy dolny pipeline ujawnia się po dotarciu Observable do concatAll; pierwszy ma osobny postój przed subskrypcją. Tempo 08: subscribe 0,4 s na odcinek, przelot 0,6 s, terminal 0,4 s; pozostałe 09–12: subscribe 0,5 s na odcinek (także subskrypcja inner), przelot 1 s.

W MAIN 08–12 przy complete zielony staje się execution lane, a nagłówek definicji pozostaje pastelowy. Pozostałe migrowane sceny zmieniają tło całego kafelka przy własnym complete. Źródło może zakończyć się wcześniej; *Map pozostaje aktywne aż do zakończenia wymaganych inner i kolejki. Nieobsłużony error daje czerwony operator, a odsubskrybowane źródło zachowuje swój kolor.


Płaski styl kafelków obejmuje 04-operator, całą rodzinę 05-zrodla, 04a-dwa-tory (cold, share, share-interval) oraz slajdy 08–12 (map + concatAll, concatMap, mergeMap, switchMap i exhaustMap): klasa `rx-flat-tiles` w scene.playerClass usuwa obrys i zaokrąglenie głównego prostokąta kafelka. Boksy historii (data-panel-box) w tych slajdach też są płaskie, z ciemniejszym tłem #ECE6DA zamiast ramki. Panel prac 08–12 jest rysowany płasko natywnie. Placeholder kolejki zachowuje przerywany obrys. Geometria, fonty, porty, progress, stany i animacje pozostają bez zmian; pozostałe slajdy nie otrzymują tej klasy.
