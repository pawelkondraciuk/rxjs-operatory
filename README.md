# RxJS — Operatory, które znasz, ale bałeś się zagadać

Polska prezentacja Pawła Kondraciuka o sterowaniu pracą, kolejnością, subskrypcjami i współdzieleniem w RxJS. Podstawowy przykład współdzielenia jest niezależny od frameworka; po nim wspominamy zastosowania w Angularze i React. Otwarcie przypomina historię meet.js Białystok; część techniczna używa animowanych bloczków i wartości.

Ten README jest mapą treści: opisuje slajdy, zawartość bloczków i speaker notes. Implementację animacji, mapę plików i używane API znajdziesz w [AGENTS.md](AGENTS.md).

Pełny eksport notatek do weryfikacji dla 21 slajdów technicznych MAIN znajduje się w [work/speaker-notes-main.md](work/speaker-notes-main.md). Dokument uwzględnia aktualną kolejność, końcowe tytuły wariantów i wszystkie notatki checkpointów, od slajdu po „A share?” do podsumowania przed „Pytania?”.

## Uruchomienie i obsługa

```sh
npm ci
npm run dev
```

Otwórz adres podany przez serwer ze ścieżką `/rxjs-operatory/`. `npm run build` buduje prezentację, `npm run preview` uruchamia podgląd zbudowanej wersji. `S` otwiera widok prelegenta z notatkami, `Esc` widok wszystkich slajdów. Strzałki i Page Up/Page Down obsługują nawigację Reveal.js; fragmenty odsłaniają zdjęcia i listy.

Sceny MAIN z pytaniami zaczynają od nieruchomego READY. Prawo / Page Down uruchamia kolejny etap do postoju; ponowne naciśnięcie podczas ruchu natychmiast pokazuje koniec tego etapu i zatrzymuje animację. Następny klik uruchamia kolejny etap; lewo cofa. Pomijanie ruchu działa również przyciskiem „dalej” i pilotem. Dopiero następny klik po ostatnim pytaniu uruchamia AUTO na tym samym slajdzie. Automat zatrzymuje się na wyniku FINISHED. U pokazuje dolne sterowanie, A przechodzi z ręcznego do auto lub pauzuje/wznawia auto, M zmienia tryb, [ i ] zmieniają krok, R zaczyna od początku. Sceny wprowadzające z kontrolerem stages w AUTO kończą bieżący etap i pozwalają cofać checkpointy; R przywraca zatrzymany READY. Spacja pauzuje lub wznawia aktywną animację, a zdjęcia i statyczne otwarcie zachowują natywne sterowanie. W pozostałych scenach w AUTO prawo / Page Down najpierw pokazuje nieruchomy wynik całej animacji; dopiero kolejne naciśnięcie zmienia slajd. Dotyczy to również pilota i przycisków „dalej”. Lewo wraca do poprzedniego slajdu. Tryb, postój i pauza są pamiętane przy powrocie. EXTRAS domyślnie powtarzają pokaz, z wyjątkiem rodzin mających własne postoje.

W oknie prelegenta (`S`) podgląd następnego slajdu domyślnie pokazuje dużą nazwę, np. **switchMap**, i krótki podtytuł. Wskazuje kolejny slajd, także podczas ręcznych postojów bieżącej animacji. Przełącznik **Podgląd: Tytuł / Slajd** w prawym dolnym rogu tego pola przywraca standardowy podgląd. Wybór jest zapamiętywany w przeglądarce. Notatki pozostają w standardowym polu Notes. Opcjonalne `data-speaker-title` na sekcji ustawia własny podpis wyłącznie dla prelegenta.

Dopisanie `?print-pdf` przed hashem ustawia wszystkie animacje, łącznie z EXTRAS, w końcowych nieruchomych kadrach bez kontrolek. Reveal drukuje też kolejne fragmenty pełnego otwarcia na osobnych stronach: obecnie 33 slajdy dają 49 stron PDF.

Domyślny format to 4:3 (scena 1280×960) pod projektor 4:3. `?ratio=16:9` przywraca ekran panoramiczny 1280×720. `W` przeładowuje stronę w drugim formacie, zostając na tym samym slajdzie i fragmencie; animacja wraca do stanu tego fragmentu. Linki do EXTRAS i powrót do pytań zachowują wybrany format. Druk działa w obu: `?print-pdf` (4:3) lub `?print-pdf&ratio=16:9`. W 4:3 slajdy wykorzystują pełną wysokość: większe zdjęcia i kody QR, wyższe diagramy, większy tekst i kapsułki w animacjach (×1,15), etykiety kafelków do ×1,3 oraz większy tytuł (64 px; za długi zmniejsza się, by został w jednej linii), kod (42 px, długi łańcuch przechodzi do nowej linii przed .pipe/.subscribe) i podpis.

## Jak czytać spis

Porównania są osobnymi slajdami. Warianty z sufiksami -2/-3/-4 powstają podczas uruchamiania; pierwszy zachowuje ID bazowe. Poniżej podano kolejność MAIN, a dalszy spis opisuje rodziny tematycznie. Pozycje EXTRAS są oznaczone.

Każda pozycja opisuje temat, ekran/bloczki i notatki prelegenta. Tabele wariantów podają rzeczywiste tytuły i kod nad diagramem. Speaker notes przy rodzinie dotyczą wszystkich jej wariantów, ponieważ sekcje są klonowane razem z notatkami. Wyjątkiem są trzy slajdy Subject (`05-zrodla-5`, `05-zrodla-3`, `05-zrodla-4`): mają własne notatki przypisane do checkpointów. Notatki przytoczono z ujednoliconymi odstępami; powtarzaną instrukcję obsługi zwykłych animacji opisano wspólnie wyżej.

Czasy są umownym modelem dydaktycznym. Przelot wartości i pauza przy operatorze spowalniają ilustrację; nie dodają opóźnień do rzeczywistego synchronicznego RxJS. HTTP jest symulowane. Pasek pokazuje czas pracy, a nie pomiar postępu prawdziwego żądania.

## Ścieżka MAIN i czas

Pełne otwarcie pozostaje bez zmian: społeczność, historia meet.js, fotografie, autor, tytuł i pytania o operatory. Budżet **30–35 minut dotyczy tylko części właściwej**; otwarcie, pytania i dogrywka są dodatkowo.

MAIN ma **32 slajdy (21 animowanych)**. EXTRAS zawiera **1 slajd animowany**. Całość obejmuje 25 bazowych slajdów HTML i 33 slajdy po rozwinięciu wariantów. Warianty powstają przed wyborem ścieżki; końcowe ID zachowują poprzednie znaczenie niezależnie od kolejności.

Kolejność po otwarciu:

1. Trzy pierwsze slajdy techniczne pokazują komplet podstawowych zachowań Observable: HTTP — subscribe, next, complete (`05-zrodla-2`) → interval na żywo — wielokrotne next, unsubscribe (`05-zrodla`) → Subject — ręczne next, późny subskrybent bez historii i complete (`05-zrodla-5`). Zaraz po nich HTTP GET + map: obiekt User → „Paweł Kondraciuk” (`04-operator`), wstęp do Cold.
2. Jedna historia Cold → Subject → share, w parach Subject/share na tych samych przykładach: cold — trzy subskrypcje, trzy HTTP, B kończy się błędem (`04a-dwa-tory`) → Subject + HTTP: jeden HTTP, trzech odbiorców (`05-zrodla-3`) → share + HTTP: jeden HTTP, trzech odbiorców (`04a-dwa-tory-2`) → Subject + interval: odbiorcy odchodzą, źródło nadal działa (`05-zrodla-4`) → share + interval: ostatni odbiorca odłącza źródło (`04a-dwa-tory-3`) → share + HTTP: późny odbiorca uruchamia nowy request (`20-sharereplay`) → shareReplay + HTTP: późny odbiorca dostaje wynik z bufora (`20-sharereplay-2`). Powtarzające je cold timer i oba slajdy `07-hot-cold` zostały usunięte.
3. **map + concatAll (`08-map-strumienie`) pozostaje kluczowym pomostem w MAIN**, bezpośrednio przed concatMap → mergeMap → switchMap → exhaustMap (cztery *Map obok siebie) → distinctUntilChanged przed switchMap (`11a-distinct-switchmap`, jedyny distinctUntilChanged w MAIN).
4. catchError wewnątrz/na zewnątrz → wspólne porównanie debounceTime i auditTime (`16-czas-cztery`).
5. Cztery pytania podsumowania → „Pytania?” → rozmowa z salą albo dodatkowy przykład.

| Część właściwa | Budżet |
| --- | --- |
| HTTP, źródła, map/pipe, wykonania, Subject i share/replay | 10 min |
| map + concatAll, cztery operatory *Map i distinctUntilChanged przed switchMap | 13,5 min |
| catchError | 4 min |
| debounceTime, auditTime | 3 min |
| Podsumowanie | 1,5 min |
| Rezerwa na interakcję i przejścia | 2 min |
| **Łącznie** | **34 min** |

Na map + concatAll i przejście do concatMap przewidziano około 3 minut z bloku flatteningu. Czasy są planem prelegenta, nie pomiarem odtwarzacza.

**EXTRAS zawiera jeden przygotowany dodatkowy przykład:** `x01-sharereplay-interval`, czyli shareReplay z `refCount: false` na źródle interval. Prelegent uruchamia go ręcznie z linku na slajdzie „Pytania?”. Bezpośredni hash zachowanego dodatku włącza ścieżkę EXTRAS, a link „Powrót do pytań” zachowuje wybrany format.

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

**MAIN — po HTTP, interval i Subject — ręcznej emisji; przed Cold.** Jedna historia o danych użytkownika: ten sam obiekt `User` (`{ firstName: 'Paweł', lastName: 'Kondraciuk', city: 'Białystok' }`) wraca na Cold. Kod:

```ts
http.get<User>('/api/users/42')
.pipe(map(user => `${user.firstName} ${user.lastName}`))
```

`http.get<User>()` to nasz klient HTTP zwracający Observable, nie funkcja RxJS: po subskrypcji uruchamia request, przy sukcesie emituje sparsowany obiekt `User`, potem complete. Kod ma dwie linie (36/24 px, klasa `rx-two-lines`), semantycznie jak zapis z `.pipe(` w osobnej linii. Diagram poziomy w wyglądzie torów: HTTP GET (niebieski nagłówek, x/w 170/260, postęp requestu w wierszu) → map (fioletowy, 510/240) → A (kompaktowy odbiorca 960/480 z polem `fullName`); jeden tor A (`#7457D9`, jak na HTTP i interval; S1 zostaje tylko w rodzinie flatteningu), bez dolnej sekcji inner subscriptions. Licznik: Requesty HTTP (kończy na 1).

| Nr | Checkpoint | Na ekranie |
| --- | --- | --- |
| 0 | READY | Kod `http.get<User>('/api/users/42')` i sam nagłówek HTTP GET. Brak wykonania i requestu. |
| 1 | pipeline | Fade-in 0,3 s: druga linia `.pipe(map(...))` i kafelek map. Pipe składa definicję, nie uruchamia HTTP (Requesty 0). |
| 2 | subscribed | Odbiorca A i chwilowe `.subscribe()` A; subskrypcja biegnie przez map do HTTP, rosną wiersze A, rusza postęp requestu (Requesty 1). |
| 3 | response | HTTP kończy pobieranie i emituje jedną kulkę „{…}” (cały User, bez JSON-a) — postój w połowie drogi do map. |
| 4 | mapped | Kulka stoi w środku wiersza map i zmienia się w „"…"” (string); ta sama subskrypcja, bez nowej pracy. |
| 5 | received | Wynik dociera do A; pole `fullName` pokazuje pełne „Paweł Kondraciuk”. |
| 6 | complete | Zielony impuls z HTTP przez map do A; wiersze HTTP GET, map i A zielenieją, a przy A (nad długim wynikiem, w linii etykiety pola) pojawia się `✓ complete` — bez napisu w HTTP GET i map. Map nie zatrzymuje complete i nie wywołuje drugiego requestu. |
| — | FINISHED | Podpis „Jeden request, jeden User, jeden string. complete zakończył wykonanie”. |

**Speaker notes** (`template[data-checkpoint-notes="04-operator"]`): „Załóżmy, że pobieramy dane użytkownika z HTTP. Dostajemy cały obiekt, ale nasz widok potrzebuje tylko pełnego imienia i nazwiska” → pipe nie uruchamia HTTP → subscribe uruchamia jeden request → „Operator map dostaje pojedynczą wartość i synchronicznie ją przekształca. Tutaj z obiektu User tworzymy string” (map działa dla każdej kolejnej emisji, nasze HTTP emituje jedną) → „HTTP wykonał jeden request i wyemitował jeden obiekt. Map przekształcił go w jeden string. To nadal jedno wykonanie Observable” → „Map nie zmienia sposobu zakończenia — complete przechodzi dalej do odbiorcy” → przejście do Cold: „Na razie mamy jeden widok, który wyświetla pełne imię i nazwisko. Ale aplikacja się rozrasta. Co jeśli trzy niezależne elementy interfejsu będą potrzebowały różnych pól tego samego użytkownika?”. Cold wraca do surowego `user$ = http.get<User>('/api/users/42')`, bez map.

Kontroler `stages`: → zaczyna lub kończy etap, ← cofa checkpoint także w AUTO, Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany READY. Tempo ilustracji: etap pipe 0,65 s, pojawienie odbiorcy 0,3 s, subscribe 3,2 s, request 2,6 s, przelot 1,4 s, projekcja 2 s, zatrzymanie odbioru 0,5 s, terminal 1,6 s, cisza 1 s przed FINISHED.

### Tory wykonania: cold, share() + HTTP i share() + interval — `04a-dwa-tory`, `-2`, `-3`

**MAIN — zaraz po 04-operator, test zapisu wielu subskrypcji.** Kafelek to definicja: stały nagłówek (`HTTP GET`, `map`, `share()`, `Odbiorca A/B`). Pod nagłówkiem rośnie obszar wykonań — każde subscribe dokłada kompaktowy wiersz, gdy do kafelka dociera (krótkie rozszerzenie, nagłówek nie skacze). Wiersze oddziela separator 1 px, mają jaśniejsze tło kafelka i pasek koloru subskrypcji po lewej; zakończone zostają jako historia. Mało tekstu: w wierszu tylko litera toru.

**Paleta.** Nagłówki: źródło `#8FC9D4`, operator `#D8B3E6`, odbiorca `#EAE4F7`; tekst `#26323B`. Subskrypcje: A `#7457D9`, B `#D8840F`, wspólny upstream share `#238F83`. Stany wiersza (tło, akcent): complete `#DDF1E1`/`#26804E`, error `#F7D9D9`/`#C54848`, unsubscribe `#E7E8E8`/`#808890`; aktywny — tło bazowe. Kolor subskrypcji zostaje na pasku wiersza, kablach i portach w każdym stanie. Tło slajdu pozostaje globalnym gradientem (jego środek to praktycznie `#F8F3E9`).

**Postęp i stany.** W HTTP postęp to tło wiersza w łagodnym kolorze subskrypcji, przesuwające się od lewej (symulowane oczekiwanie, nie procent pobrania); po complete cały wiersz przechodzi w delikatną zieleń z krótkim rozbłyskiem, po error w czerwień, po anulowaniu jest przygaszony. map i share nie mają czasowego postępu — tylko stan wiersza i przelatująca wartość.

**Połączenia.** Każdy tor ma własny kabel (~3 px w skali makiety) i porty w kolorze subskrypcji. complete/error: krótki impuls w kolorze akcentu biegnie po kablu do następnego kafelka, tam wiersz zmienia stan, a kabel wraca do koloru toru z mniejszym kryciem jako historia. unsubscribe: bez impulsu, kabel i porty szarzeją i gasną; stan kafelka wyżej zmienia się po dotarciu unsubscribe.

**Cold (`04a-dwa-tory`) — trzy niezależne subskrypcje, jeden błąd.** Realistyczny problem: trzy niezależne miejsca widoku potrzebują danych tego samego użytkownika. Kod pokazuje jedną definicję `const user$ = http.get<User>('/api/users/42');` (marka HTTP świeci, gdy któraś odpowiedź wylatuje); bez `map()`, `pluck()`, `catchError`, osobnych Observable pól, linii subscribe i składni frameworka — zakładamy, że każde pole samo subskrybuje `user$` i obsługuje wynik albo błąd. Diagram ma dwie kolumny: kafelek HTTP GET (x/w 272/420) i trzy kompaktowe pola widoku (x/w 960/436) w kolorach A/B/C (`#7457D9`, `#D8840F`, `#2F7ED8`): pasek toru, port, inbox, litera, etykieta właściwości w monospace (`user.firstName`, `user.lastName`, `user.city`) i miejsce na wartość (przerywany slot).

READY (bez zmian względem poprzedniej wersji): sam nagłówek HTTP GET, trzy puste pola, bez liter A/B/C, portów i połączeń; liczniki Observable 1, Requesty HTTP 0. Pierwsze „dalej”: A (1 s czasu modelu), B (1,25 s) i C (1,5 s) subskrybują kolejno — chwilowe `.subscribe()` z literą toru nad kolumną pól, impuls biegnie od pola do HTTP, w HTTP GET rośnie wiersz wykonania i startuje osobny request. Wszystkie trzy trwają równolegle (postęp jako tło wierszy). Drugie „dalej”: HTTP B kończy się błędem (2,8 s), gdy A i C nadal pracują — postęp B staje, czerwony impuls error biegnie do pola B, wiersz B robi się czerwony, a w miejscu placeholdera `user.lastName` pojawia się „Błąd” (fade-in 0,3 s); B nie emituje User ani complete. Trzecie „dalej”: A i C kończą request, emitują cały obiekt User (kulka „{…}”) i complete (zielony impuls); pola pokazują Paweł i Białystok. Ostatnie „dalej”: AUTO do FINISHED z podpisem „Jedna definicja, trzy wykonania i trzy identyczne requesty — każde z własnym zakończeniem”. Stan końcowy: A — Paweł, complete; B — Błąd, error; C — Białystok, complete; Requesty HTTP 3 (uruchomione, nie udane).

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY | Wyobraźmy sobie widok aplikacji. W jednym miejscu wyświetlamy imię użytkownika, w drugim nazwisko, a w trzecim miasto. Wszystkie potrzebują danych tego samego użytkownika. |
| 1 | requests | Mamy jedną definicję user$. Ale każde z tych miejsc niezależnie ją subskrybuje. I co się dzieje? Powstają trzy osobne requesty. |
| 2 | error | Drugi request się nie udał. Czy to oznacza, że pozostałe również się zatrzymają? |
| 3 | answer | Nie. To trzy niezależne wykonania tego samego cold Observable. B kończy się błędem, ale A i C nadal pracują i kończą się poprawnie. |
| 4 | FINISHED | Mamy jedną definicję Observable, ale trzy wykonania. Każde ma własną subskrypcję i własny cykl życia. Wszystkie pytają backend o dokładnie tego samego użytkownika. Czy naprawdę musimy wykonywać trzy requesty? Prawo: Subject + HTTP. |

**share(): jedno HTTP, trzech odbiorców (`-2`).** Po Subject + HTTP, ten sam przykład co Cold: `const user$ = http.get<User>('/api/users/42')` / `  .pipe(share());` (marka HTTP świeci podczas odpowiedzi, share() przy rozesłaniu next i complete), bez `map()`. Wygląd Subject + HTTP (`05-zrodla-3`): HTTP GET x/w 177/230, share() 517/230 w miejscu Subject, pola widoku A (`user.firstName`), B (`user.lastName`) i C (`user.city`) z Cold (960/436), top 178/102, viewBox 1240×612/460. READY: tylko nagłówki HTTP GET i share(), Requesty HTTP 0. A subskrybuje w 1 s: chwilowe `.subscribe()` A trwa do dotarcia impulsu przez share() do HTTP; powstaje jeden wiersz `#1` w HTTP GET (wspólne wykonanie w kolorze A — uruchomił je A, zarządza nim share) i wiersz A w share(), request startuje. B (2,6 s) i C (3,2 s) subskrybują tę samą instancję user$ przed odpowiedzią; ich `.subscribe()` biegnie tylko do share(), w share() pojawiają się wiersze B i C z lewym paskiem w kolorze wspólnego upstreamu, HTTP nadal ma jeden wiersz i ten sam postęp, porty się nie przesuwają. W 5 s HTTP emituje jedną kulkę „{…}”, która rozdziela się na porcie share() na trzy identyczne kulki; pola pokazują Paweł, Kondraciuk, Białystok. complete w 6 s: zielony impuls przez share() do A, B i C. Liczniki: Odbiorcy (3) i Requesty HTTP (kończy na 1 — jeden request zamiast trzech). Postoje: subscribed-a, joined (B i C dołączyli), multicast, complete, potem AUTO do FINISHED z podpisem „Jeden request, trzech odbiorców. Bez ręcznego podłączania Subjecta do HTTP”. Notatki per checkpoint w `template[data-checkpoint-notes="04a-dwa-tory-2"]` (ready, cztery postoje, finished; 45–60 s); finished: „Share współdzieli request automatycznie. Ale współdzielenie to nie wszystko. Co dzieje się ze źródłem, gdy odbiorcy rezygnują?”.

**share(): kto odłączy źródło? (`-3`) — 45–60 sekund.** Bezpośredni odpowiednik Subject + interval (`05-zrodla-4`), po nim w MAIN: ta sama scena na żywo, ten sam układ (interval 212/310 z wierszem `#1`, hub 592/230 z wierszami A/B/C, odbiorcy 1000/366), jedna linia kodu `const shared$ = interval(1000).pipe(share());` — bez ręcznego connection. READY: share() już subskrybuje interval, A, B i C odbierają co sekundę (emisje trwają także między checkpointami). Prawo: `subA.unsubscribe()` — szary impuls × kończy się na share(), interval pracuje; prawo: `subB.unsubscribe()` — tak samo, został C; prawo: `subC.unsubscribe()` — ostatni odbiorca odchodzi, więc share() sam odłącza upstream: impuls × biegnie dalej od share() do interval, wiersz `#1` szarzeje, nowych emisji nie ma, fragment `share()` w kodzie świeci podczas odłączania. Bez complete. Scena staje się skończona i dochodzi do FINISHED; następne prawo zmienia slajd, lewo cofa ostatnią akcję. Liczniki: Emisje interval i Odbiorcy share(). Postoje (umowne kadry dla Reveal, notatek i hasha): unsub-a, unsub-b, unsub-c. Notatki per checkpoint w `template[data-checkpoint-notes="04a-dwa-tory-3"]`; finished: „Share umie odłączyć źródło, kiedy ostatni odbiorca odchodzi. A czy pamięta wyniki zakończonych requestów?”.

**Dawny wariant share za map z unsubscribe A (`lanesMode: 'share-unsub'`).** Nie jest już slajdem; ścieżka `lanesGraph` (HTTP GET → map → share() → odbiorcy, kod `http.get<number>(url)` / `  .pipe(map(x => x * 2), share())`) zostaje dla scenariuszy `shareScenario` i testów mechanizmu.

**Scenariusze share (dane, nie osobne slajdy).** `shareScenario` (lista Subscriberów `{id, start, unsub?}`) wylicza sesje upstreamu: C (niebieski) dołącza do trwającego upstreamu w trzecim wierszu, bez nowego requestu; odejście ostatniego aktywnego przed odpowiedzią anuluje upstream (HTTP z niedokończonym paskiem, bez complete); późniejszy Subscriber otwiera nową sesję w swoim kolorze (nowy wiersz HTTP/map, połączenie do share z załamaniem). Sprawdzają to testy.

**Speaker notes:** Nagłówki to jedna definicja, wiersze to wykonania. Cold: każdy subscribe tworzy własny request. share współdzieli upstream, ale nie skleja odbiorców — każdy ma własny wiersz i może odejść osobno. Dolne wykonania HTTP dla *Map pozostają bez zmian.

### Źródła — rodzina `05-zrodla`

Warianty zachowują ID, lecz zajmują oddzielne miejsca narracji: **HTTP otwiera część właściwą**, interval jest drugi, a Subject — ręczna emisja (next i complete) trzeci, przed „Operator to funkcja”. Dwa pozostałe Subjecty stoją między Cold i share: **Cold → ręczny multicast HTTP przez Subject → automatyczny multicast przez share() → ręczne połączenie, którego nikt nie odłącza → share() odłącza źródło sam**.

| ID | Kod i zachowanie |
| --- | --- |
| 05-zrodla-2 | `http.get('/api/data')`; pierwsze „dalej” dopisuje `.subscribe(render)` (fade-in razem z odbiorcą A). READY ma tylko nagłówek HTTP GET; subscribe odsłania odbiorcę i wiersz A. Postój request pokazuje pracę po podłączeniu, postój first odebrane dane przed complete. |
| 05-zrodla | `interval(1000)` na żywo. Pierwsze „dalej” robi `.subscribe()`, potem emisje 0, 1, 2, 3… co sekundę bez końca; drugie „dalej” robi `.unsubscribe()` (bez complete); trzecie przechodzi dalej. |
| 05-zrodla-5 | Stale tylko `const subject$ = new Subject<number>();`. A subskrybuje i dostaje `subject$.next(1)`; dopiero potem pojawia się B (`subject$.subscribe(observerB)`) i nie dostaje wcześniejszej 1; `subject$.next(2)` trafia do A i B; `subject$.complete()` — zielony impuls do obu, wiersze ✓ complete, historie zostają (A: 1, 2; B: 2). Bez error, unsubscribe i upstreamu. |
| 05-zrodla-3 | Stale tylko `const subject$ = new Subject<User>();`. A/B/C (pola widoku z Cold) subskrybują Subject od READY; migawka `http.get<User>('/api/users/42').subscribe(subject$)` podłącza jedno HTTP, które przez Subject rozsyła obiekt User i complete do trzech pól. |
| 05-zrodla-4 | `const subject$ = new Subject<number>();` i `const connection = interval(1000).subscribe(subject$);`. Start już działający: interval → Subject → A/B/C; kolejne „dalej” to `subA/subB/subC.unsubscribe()`, a interval emituje dalej do Subjecta bez odbiorców; ostatnie „dalej” wywołuje `connection.unsubscribe()` i zatrzymuje interval (Subject bez complete). |

Cała rodzina ma wygląd torów jak w `04a-dwa-tory` (nagłówek = definicja, wiersz = wykonanie, porty, kulki w wierszu odbiorcy, płaskie kafelki) i te same chwilowe napisy `.subscribe()` z badge'em toru, widoczne od pojawienia się odbiorcy do dotarcia subskrypcji do źródła. W interval `.unsubscribe()` A pojawia się pod wierszem odbiorcy, bo rezygnacja zaczyna się przy nim. W Subject jedyny napis to migawka `http.get<User>('/api/users/42').subscribe(subject$)` z badge'em `#1`, wyśrodkowana nad diagramem. HTTP ma postęp tylko w wierszu A pod HTTP GET (od zestawionej subskrypcji do odpowiedzi); odbiorca czeka, potem trzyma kulkę „dane” w swoim wierszu. Diagram używa harmonogramu: pojawienie odbiorcy w 1 s, subscribe 1,3–2,1 s, odpowiedź 7–7,8 s, complete 8,3–9,1 s, cisza do 9,9 s. Kod i widoczność cofają się razem. Postęp jest symulacją oczekiwania, nie procentem odpowiedzi sieciowej.

interval to jeden rząd: `interval(1000)` → odbiorca A. Slajd jest wyjątkiem od postojów: po `.subscribe()` emisje trwają tak długo, jak prelegent chce (licznik „emisje” rośnie bez ograniczeń, w wierszu odbiorcy zostają 3 ostatnie kulki, starsza płynnie wypada). Kolejne „dalej” wywołuje `.unsubscribe()` na istniejącym wykonaniu: wartość już wysłana dociera, potem szary pocisk „×” jedzie od odbiorcy w lewo do interval, przebyty kabel i wiersze szarzeją, emisje ustają; nie ma zielonego complete. AUTO ani pauza nie wywołują unsubscribe same. Lewo cofa etap (z anulowanego do emisji od zera, z emisji do READY); wyjście ze slajdu sprząta wykonanie, a powrót startuje od READY. Druk pokazuje anulowany kadr po wartościach 0, 1, 2.

**Subject — ręczna emisja (`05-zrodla-5`) — 45–60 sekund.** Trzeci slajd techniczny, zaraz po interval i bezpośrednio przed „Operator to funkcja”. Pokazuje, że Subject można subskrybować, samodzielnie emitować do niego wartości i ręcznie go zakończyć — oraz że Subject jest hot: późny subskrybent nie otrzymuje wcześniejszych wartości. Subject nie jest podłączony do zewnętrznego źródła (bez connection i upstreamu). Error pojawi się dopiero na Cold z trzema requestami.

Kod demonstracji (na slajdzie stale tylko pierwsza linia; pozostałe wywołania to chwilowe migawki nad diagramem, x 620, y top/2, size 34):

```ts
const subject$ = new Subject<number>();

subject$.subscribe(observerA);
subject$.next(1);
subject$.subscribe(observerB);
subject$.next(2);
subject$.complete();
```

Fragment `new Subject<number>()` świeci od każdego ręcznego next do wyjścia powiadomień i od complete() do jego wysłania. Diagram Subject → A/B w wyglądzie torów: kafelek `Subject<number>` x/w 217/340 (wiersze rosną z subskrypcjami), kompaktowi odbiorcy A/B 960/466 (inbox, litera, do dwóch kulek r 34/font 30), top 178/102, viewBox 1240×612/460, płaskie kafelki, liczniki rx-lanes (Odbiorcy, Emisje next). Odbiorca pojawia się dopiero tuż przed swoim subscribe; w READY nie ma pustych prostokątów A/B. Bez HTTP, innych operatorów, legendy i dodatkowych paneli.

| Nr | Checkpoint | Na ekranie |
| --- | --- | --- |
| 0 | READY | Tylko kafelek `Subject<number>`; Odbiorcy 0, Emisje next 0. |
| 1 | subscribed-a | Pojawia się A; migawka `subject$.subscribe(observerA)`, kabel rośnie od A do Subjecta, w Subject powstaje wiersz A. A czeka. |
| 2 | next-1 | Migawka `subject$.next(1)`; kulka 1 w wierszu A Subjecta jedzie do A. A ma 1, B jeszcze nie istnieje. |
| 3 | subscribed-b | Pojawia się B; migawka `subject$.subscribe(observerB)`, wiersz B w Subject. B ma pusty inbox, A zachowuje 1 — pytanie do sali, czy B dostanie 1. |
| 4 | next-2 | Migawka `subject$.next(2)`; kulka rozdziela się na dwa powiadomienia. A: 1, 2; B: 2. |
| 5 | complete | Zielona migawka `subject$.complete()`; zielony impuls do A i B, wiersze Subject, A i B przechodzą w ✓ complete (tło i tekst), historie zostają, Odbiorcy 0. Bez unsubscribe i error. |
| 6 | FINISHED | Podpis „A: 1, 2, complete. B: 2, complete. Subject jest hot — późny odbiorca nie dostaje historii”. |

Harmonogram (czas ilustracji = czas modelu): A pojawia się 0,3 s, subscribe 0,6 s (zestawienie 1 s), next(1) 2,6 s (rozesłanie 3,8, dotarcie 5,2), B pojawia się 5,9 s, subscribe 6,2 s, next(2) 8,6 s (9,8 → 11,2), complete 12,2 s (wysłanie 12,8, dotarcie 14,0), podsumowanie 14,8 s, koniec 15,8 s. Cofanie przed subscribe B usuwa odbiorcę B razem z jego wierszem; historia B nigdy nie pojawia się przed subskrypcją.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY | Interval sam produkował kolejne liczby. A co, jeśli chcielibyśmy sami decydować, kiedy pojawi się następna wartość? |
| 1 | subscribed-a | Subject jest jednocześnie Observable, które można subskrybować, i Observerem, któremu możemy przekazywać wartości. Najpierw korzystamy z pierwszej roli: A subskrybuje. |
| 2 | next-1 | Teraz druga rola Subjecta: sami wywołujemy next(1). Subject rozsyła wartość do aktualnych odbiorców — na razie jest tylko A. |
| 3 | subscribed-b | Teraz pojawia się drugi odbiorca. Jak myślicie, czy dostanie jedynkę, którą Subject wyemitował wcześniej? |
| 4 | next-2 | Nie. Subject nie odtwarza wcześniejszych wartości. B dostaje dopiero dwójkę, podczas gdy A otrzymał zarówno jedynkę, jak i dwójkę. |
| 5 | complete | Teraz ręcznie kończymy Subject. Complete trafia do wszystkich odbiorców i zamyka ich subskrypcje. Nie musimy już osobno wywoływać unsubscribe. |
| 6 | FINISHED / podsumowanie | Subject jest przykładem hot Observable — rozsyła emisje do aktualnych subskrybentów. Nowy odbiorca nie dostaje historii. Do różnicy między hot i cold jeszcze wrócimy. Wiemy już, skąd pochodzą wartości: z HTTP, z interval albo z ręcznego next. A co, jeśli chcielibyśmy je po drodze przekształcić? Prawo: Operator to funkcja. |

**Subject: ręczny multicast HTTP — 60–75 sekund.** Bezpośrednio po Cold i odpowiedź na jego problem; Subject znamy już z ręcznej emisji. Te same pola widoku A/B/C (`user.firstName` → Paweł, `user.lastName` → Kondraciuk, `user.city` → Białystok; ten sam wygląd, rozmiar, kolory i kulka `{…}`), ale jeden request zasila je przez Subject. Stały kod to tylko `const subject$ = new Subject<User>();` (fragment `new Subject<User>()` świeci, gdy Subject rozsyła next i complete). Subject jest Observable dla A/B/C i Observerem dla HTTP.

Diagram HTTP GET → Subject → A/B/C (HTTP x/w 177/230, Subject 517/230, pola jak na Cold 960/436, odstępy 110), wygląd i wymiary torów jak na Cold (top 178/102, viewBox 1240×612/460, liczniki rx-lanes). READY: A, B i C są już subskrybentami Subject — trzy aktywne wiersze A/B/C, porty i poziome kable (subskrypcje zestawione przed t = 0, bez animacji), puste pola, brak HTTP GET, Requesty HTTP 0, Odbiorcy 3. Pierwsze „dalej”: pojawia się nagłówek HTTP GET i duża migawka prawdziwej składni `http.get<User>('/api/users/42').subscribe(subject$)` z badge'em `#1`; impuls subskrypcji biegnie od Subjecta w lewo do HTTP, powstaje jeden wiersz `#1` (turkus `#238F83`, niezależny od A/B/C) i startuje request. Subskrypcje A/B/C nie uruchamiają HTTP. Wejście upstreamu trafia w wiersz A Subject (prosty, poziomy kabel z wiersza `#1` HTTP); wszystkie połączenia są poziome. HTTP emituje jeden obiekt (kulka `{…}`), który zatrzymuje się na porcie Subject i rozdziela na trzy jednoczesne powiadomienia next w tym samym kolorze emisji; pola pokazują swoje właściwości. Jedno complete HTTP dociera zielonym impulsem do Subject, który przekazuje complete A/B/C; pola zachowują wartości, licznik requestów kończy na 1. Bez logu/bufora, replay, unsubscribe, map i share.

Subject nie odtwarza historii. Odejście odbiorców nie anuluje automatycznie osobnej subskrypcji HTTP — trzeba nią zarządzać samodzielnie; końcowe pytanie prowadzi do problemu niezależnej subskrypcji upstreamu.

**Checkpointy i speaker notes:** notatki w standardowym oknie prelegenta zmieniają się wraz z osiągniętym checkpointem, również w AUTO, po cofnięciu, resecie i wejściu z hasha. Narracja poniżej jest zapisana w HTML; nie jest wyświetlana publiczności.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY | Wracamy do Subjecta, który poznaliśmy na początku. Tym razem nie wywołujemy next ręcznie — obiekt użytkownika pobierzemy z HTTP. Pamiętacie Cold: trzy komponenty, trzy subskrypcje i trzy identyczne requesty. Tutaj ci sami trzej odbiorcy są już podłączeni do jednego Subjecta. |
| 1 | connect-http | Widzieliśmy, że Subject potrafi sam emitować wartości przez next(), ale nie musimy robić tego ręcznie. Jest również Observerem, więc możemy przekazać go bezpośrednio do subscribe innego Observable. |
| 2 | request | Dopiero teraz rusza HTTP. Zwróćcie uwagę: jeden request, niezależnie od liczby odbiorców Subjecta. |
| 3 | received | Backend zwraca jeden obiekt użytkownika. HTTP emituje go do Subjecta. |
| 4 | multicast | Subject rozsyła tę samą wartość wszystkim trzem odbiorcom. Każdy dostaje cały obiekt, ale wyświetla tylko potrzebne pole. |
| 5 | complete | HTTP kończy się, a Subject przekazuje complete wszystkim odbiorcom. |
| 6 | FINISHED / podsumowanie | Ten sam efekt w widoku, ale zamiast trzech requestów mamy jeden. Subject potrafi rozesłać wynik jednego HTTP do wielu odbiorców. Ale sami musieliśmy podłączyć źródło. Czy RxJS może zrobić to za nas? |

MANUAL zatrzymuje się w punktach 1–5; kolejny krok kończy animację w FINISHED. AUTO przechodzi płynnie przez całość. Ruch kulek tylko ilustruje synchroniczne rozsyłanie powiadomień; pauzy służą wyjaśnieniu. Pełny kod jest przykładem, nie jest wykonywany przez prezentację.

**Subject — kto odłączy źródło? (`05-zrodla-4`) — 45–60 sekund.** Po share() + HTTP (`04a-dwa-tory-2`) i przed share() + interval (`04a-dwa-tory-3`): wracamy do Subjecta, z interval zamiast HTTP. Kod przez cały slajd: `const subject$ = new Subject<number>();` oraz `const connection = interval(1000).subscribe(subject$);` (bez kodu subskrypcji A/B/C). Diagram interval(1000) → Subject → A/B/C w wyglądzie torów Subject + HTTP (te same wysokości nagłówka 79 i wierszy 89, top 178/102, viewBox 1240×612/460): interval x/w 212/310 z jednym wierszem `#1` (turkus `#238F83`), Subject 592/230 z wierszami A/B/C, kompaktowi odbiorcy 1000/366 wyrównani z wierszami Subject (A fioletowy, B pomarańczowy, C niebieski); wszystkie kable poziome, wejście `#1` trafia w wiersz A. Odbiorca pokazuje ostatnią odebraną liczbę (kulka r 34, font 30, kolor emisji `#1`).

Slajd startuje już działający: wszystkie subskrypcje są zestawione przed t = 0, a emisje 0, 1, 2… ruszają przy wejściu (co 1 s, przelot 0,8 s, rozesłanie w Subject 0,4 s). Scena jest na żywo jak interval: postoje nie zatrzymują emisji. Kolejne „dalej”: `subA.unsubscribe()`, `subB.unsubscribe()`, `subC.unsubscribe()` — migawka w miejscu nagłówka kolumny odbiorców z literą i kolorem toru; wartość, która dotarła już do Subjecta, jeszcze dociera, potem szary impuls × biegnie od odbiorcy w lewo i kończy się na Subject; szarzeją tylko wiersz odbiorcy, jego kabel i wiersz w Subject. Tor `#1` zachowuje kolor i nigdy nie dostaje impulsu. Czwarte „dalej” (etap 4) niczego nie wywołuje: wyróżnia w kodzie `interval(1000).subscribe(subject$)`; wartości nadal dochodzą do Subjecta i tam gasną (kurczą się na porcie wejścia), licznik „Emisje interval” rośnie, „Odbiorcy Subject” = 0, A/B/C zachowują ostatnie liczby. Emisje trwają bez końca, aż prowadzący naciśnie „dalej” — nic nie zatrzymuje interval automatycznie. Piąte „dalej” (ostatni checkpoint, `connection`) wywołuje `connection.unsubscribe()`: migawka z etykietą `#1` nad połączeniem interval → Subject, wartość już wysłana jeszcze dociera do Subjecta, potem szary impuls × biegnie od Subjecta w lewo do interval; wiersz `#1` przechodzi w „odsubskrybowano” (szary), kabel szarzeje i przygasa, licznik emisji staje. Subject nie dostaje complete (brak zielonego impulsu, `subject$.complete()` ani zmiany jego wierszy) — pozostaje otwarty; A/B/C pozostają odłączeni. Scena dochodzi do FINISHED, a szóste „dalej” przechodzi do share(). „Dalej” w trakcie animacji unsubscribe tylko ją kończy; lewo cofa ostatnią akcję (po cofnięciu `connection.unsubscribe()` interval znów emituje bez końca, po cofnięciu odbiorcy — odbiorca znów odbiera), z etapu 0 — poprzedni slajd. AUTO i Spacja nie wywołują unsubscribe. Wyjście ze slajdu technicznie sprząta wykonanie, także bez końcowego kroku; powrót zaczyna od stanu początkowego. Druk i „pokaż wynik” dają nieruchomy kadr zatrzymanego źródła.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY (emisje trwają) | Przed chwilą pokazaliśmy, że możemy podłączyć HTTP do Subjecta. Teraz zamiast HTTP wykorzystamy dobrze już znany interval. Mamy trzech odbiorców i jedno wspólne źródło. |
| 1 | unsub-a | Pierwszy odbiorca rezygnuje. Jego subskrypcja się kończy, ale pozostali nadal dostają wartości. |
| 2 | unsub-b | B również się odłącza. C nadal otrzymuje wartości. Ale czy obecność C w ogóle ma wpływ na działanie źródła? (interval działa dzięki osobnej subskrypcji connection, nie dzięki C) |
| 3 | unsub-c | Teraz odłączamy ostatniego. I jak myślicie, co powinno się wydarzyć ze źródłem? |
| 4 | source | Wszyscy odbiorcy już się odłączyli. Ale zobaczcie — interval nadal emituje wartości. Subject ciągle je odbiera, chociaż nikogo już nimi nie powiadamia. |
| 5 | connection | Bo mamy jeszcze jedną subskrypcję, którą sami stworzyliśmy. To połączenie interval z Subjectem. I dopiero teraz ręcznie je odłączamy. |
| — | FINISHED (po zatrzymaniu, druk) | Interval przestaje pracować. Ale Subject nadal istnieje — nie dostał complete. Musieliśmy sami zarządzać tym połączeniem. Za chwilę zobaczymy, jak `share()` robi to automatycznie. |

**Speaker notes pozostałych źródeł:** Angular HttpClient jest przykładem cold źródła; nie generalizować tego na już uruchomiony Promise. Timer kończy automatycznie, interval przez rezygnację odbiorcy.

### A jeśli wartością jest Observable? — `08-map-strumienie`

**Temat:** map może zwrócić Observable, a spłaszczenie wymaga subskrypcji.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 08-map-strumienie | A jeśli wartością jest Observable? | `source$.pipe(map(id => http.get(url(id))), concatAll())` |

**Na bloczkach:** source$ → map → concatAll → Odbiorca. Góra ma jeden główny tor S1, pastelowe nagłówki i execution lanes. Kulka A zmienia się w map w A$ — zimne Observable, nie rozpoczęty request. Dół jak w 09–12: każdy subskrybowany inner to instancja HTTP GET z ID #1, kulką A$ i inner subscriberem. Utworzone B$ i C$ czekają jako #2 · B$ i #3 · C$ z placeholderem W KOLEJCE · Observable, bez nagłówka HTTP GET, portów, subskrypcji i postępu. Kolejne complete zwalniają miejsce na następny HTTP. Jeden request daje jedną odpowiedź; wynik A, B, C trafia do kompaktowego odbiorcy w dużych kolorowych kulkach z białymi literami.

**Speaker notes:**

- **Pytanie:** A$ pracuje, B$/C$ czekają — ile HTTP działa? Jeden.
- **map:** Tworzy zimne Observable; samo utworzenie nie uruchamia HTTP.
- **concatAll:** Subskrybuje po kolei: A$ → B$ → C$.
- **Różnica:** concatAll kolejkuje Observable; concatMap wartości przed projekcją.

### Wspólny problem 09–12: A pracuje, przychodzi B

Cztery slajdy pokazują identyczną sytuację i zmieniają wyłącznie operator. Kod: `source$.pipe(<operator>(id => http.get(url(id))))`. Te same wejścia, kolory i tempo: A w 0,6 s uruchamia długi HTTP (3 s), B przychodzi w 2,1 s (A w połowie, HTTP B 1,2 s), C w 5,2 s — po zakończeniu A (HTTP C 1,2 s); source$ kończy się w 5,6 s. Kolory prac: A indygo #6D4CD3, B pomarańcz #B85D05, C niebieski #087FAD.

Góra bez zmian: source$ → operator → kompaktowy Odbiorca, jeden główny tor S1 (nie powstaje nowa subskrypcja główna dla wartości). Dół (pod poziomym separatorem, bez napisu): maksymalnie trzy sloty (A, B, C) o stałej wysokości. **Każde uruchomione inner Observable to osobna instancja HTTP GET z własną wewnętrzną subskrypcją**, wyglądająca jak znany z prezentacji pipeline `HTTP GET → inner subscriber`: standardowy kafelek z turkusowym nagłówkiem HTTP GET i jednym execution lane pod nim, zaczynający się przy lewej krawędzi; lane ma nazwę jak tory u góry — pasek koloru pracy i `#1 · A` w tym kolorze — a za nazwą postęp i stan tekstem (długości jak w catchError wewnątrz), po prawej kabel z portami do pełnego inner subscribera (lane jak odbiorca główny: ikona, „inner #n”, wartość, status). complete — jasnozielone lane, anulowanie — szare, error — jasnoczerwone. Wartość bez inner (oczekuje „?”, „w kolejce”, „pominięte”) ma tylko pasek z nazwą `#2 · B` i neutralny placeholder w miejscu reszty lane — bez nagłówka HTTP GET, progressu, portów, kabla i inner subscribera. Po starcie pracy placeholder przechodzi w pełny kafelek w tym samym slocie; „pominięte” nigdy. Ten sam układ mają `08-map-strumienie`, `11a-distinct-switchmap` i oba slajdy catchError; w catchError wewnątrz każdy rząd to `HTTP GET ── catchError ── inbox`.

**Wspólny postój `question`:** S1 aktywne, HTTP A pracuje (pasek ok. 46% — identyczny na czterech slajdach), kulka B czeka na porcie wejścia operatora, a #2 · B ma tylko identyfikator i znak „?”: bez „w kolejce”, „pominięte”, projekcji, kafelka HTTP GET, inner subscribera, portów i progressu. Następne „dalej” (osobny ręczny postój `answer`) dopiero uruchamia reakcję operatora; AUTO włącza się po odpowiedzi.

**Subskrypcja główna:** tylko concatMap pokazuje pełną sekwencję (subscribe → A → projekcja → inner HTTP). mergeMap, switchMap i exhaustMap zaczynają w READY od zestawionego S1; jedno „dalej” prowadzi przez emisję A, start HTTP A i dotarcie B wprost do pytania.

### concatMap — `09-concatmap`

**Temat:** obsługa pracy po kolei.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 09-concatmap | concatMap — Po kolei | `source$.pipe(concatMap(id => http.get(url(id))))` |

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
| 10-mergemap | mergeMap — Równocześnie | `source$.pipe(mergeMap(id => http.get(url(id))))` |

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
| 11-switchmap | switchMap — Najnowsza subskrypcja | `source$.pipe(switchMap(id => http.get(url(id))))` |

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
| 12-exhaustmap | exhaustMap — Jestem zajęty | `source$.pipe(exhaustMap(id => http.get(url(id))))` |

**Na bloczkach:** READY z zestawionym S1, postoje question i answer. Odpowiedź: #2 z kulką B — przygaszony placeholder „POMINIĘTE”, bez projekcji, inner, kafelka HTTP GET, inner subscribera, portów i kolejki; B nie wraca później. A kończy się normalnie; C przychodzi po zakończeniu A i dostaje własny kafelek HTTP GET z inner subscriberem. Wynik A, C.

**Speaker notes:**

- **Wprowadzenie:** A pracuje. Przychodzi B. Poznaliśmy już kolejkowanie, równoległość i anulowanie.
- **Pytanie:** A co, jeśli nie chcemy teraz przyjmować żadnej kolejnej pracy?
- **Odpowiedź:** exhaustMap ignoruje B. Nie uruchamia projekcji, nie tworzy requestu i nie zapisuje B na później. Dopiero po zakończeniu A może przyjąć następną wartość.
- **Zastosowanie (tylko w notatkach):** ignorowanie kolejnych kliknięć „Zapisz”, dopóki obecny zapis trwa.

### distinctUntilChanged przed switchMap — `11a-distinct-switchmap`

**MAIN — bezpośrednio po exhaustMap, zamyka rodzinę *Map; jedyny distinctUntilChanged w MAIN.** **Temat:** sam switchMap przy powtórzonym ID anuluje request i uruchamia go od nowa; distinctUntilChanged przed nim zatrzymuje kolejne powtórzenia.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 11a-distinct-switchmap | distinctUntilChanged — czy coś się zmieniło? | `selectedUserId$.pipe(distinctUntilChanged(),`<br>`  switchMap(id => http.get(url(id))))` |

**Na bloczkach:** jeden potok „selectedUserId$” → „distinctUntilChanged” → „switchMap” → kompaktowy odbiorca S1 (S1 zestawione w READY, bez animacji subscribe). W wierszu S1 operatora distinctUntilChanged pamięć to jedna kulka ostatniej przepuszczonej wartości tuż przed portem wyjścia (jak w debounceTime/auditTime; bez prostokąta i napisu `prev:`, przed pierwszą wartością pusto); przepuszczona kulka podmienia ją, gdy ją mija, porównanie z powtórzeniem daje krótki puls. Dół jak w 09–12 (separator bez napisu) — każde uruchomione HTTP to `#n` z kulką X, kafelek HTTP GET z lane i inner subscriber. Wejścia A, A, B, B, A (A zawsze indygo, B pomarańczowe). Powtórzenie wjeżdża do wiersza distinctUntilChanged, stoi na pytaniu i gaśnie — bez kabla dalej, bez HTTP, inner subscribera i placeholdera, bez anulowania trwającej pracy. B po A i A po B przechodzą: switchMap anuluje poprzedni HTTP (szary impuls ×) i startuje nowy. Do switchMap trafia A, B, A: 3 requesty zamiast 5. #3 · A zwraca wynik do S1 i kończy się complete; S1, źródło i operatory pozostają aktywne. Postęp HTTP liczony w czasie modelu, więc stoi podczas przelotów i pytania.

Postoje: first (przed drugim A, HTTP A ~45%), question (drugie A w operatorze), answer (zgasło, w pamięci A, HTTP A pracuje), switched (#1 anulowane, #2 · B), repeat-b (drugie B odrzucone), again-a (#3 · A, w pamięci A), potem AUTO do wyniku. Notatki per checkpoint w `template[data-checkpoint-notes="11a-distinct-switchmap"]` (60–90 s).

**Speaker notes (skrót):** switchMap anuluje przy każdej nowej wartości, także identycznej → distinctUntilChanged pamięta ostatnią przepuszczoną wartość i porównuje przez === → nie jest cache'em: A po B przechodzi.

### catchError — `b04-catcherror`

**Temat:** miejsce obsługi błędu wpływa na kolejne zapytania. W MAIN najpierw wewnątrz (`-2`), potem na zewnątrz.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b04-catcherror-2 | catchError wewnątrz | `klik$.pipe(switchMap(id =>`<br>`  http.get(url(id)).pipe(catchError(() => of([])))))` |
| b04-catcherror | catchError na zewnątrz | `klik$.pipe(switchMap(id =>`<br>`  http.get(url(id))), catchError(() => of([])))` |

**Na bloczkach i w animacji:**

- Wewnątrz (wygląd MAIN switchMap): góra „klik$” → „switchMap” → kompaktowy odbiorca S1, jeden tor S1 przez cały czas aktywny (bez complete). Pod linią podziału (bez napisu) instancja na każdy inner jak w 09–12: kafelek HTTP GET z lane #1 · A (#2 · B), kabel, kafelek catchError, kabel i inner subscriber — w jednym rzędzie. Bez kontenera.
- Przebieg wewnątrz (czas modelu): subscribe S1 w 0,3 s, klik A w 1 s uruchamia HTTP A. W 4 s HTTP A kończy się błędem: czerwony impuls biegnie tylko do catchError, etap HTTP pokazuje „error”, do S1 nic nie dociera. catchError pokazuje chwilową pigułkę `of([])`, w 4,5 s emituje kulkę [] (przez switchMap do S1), w 5 s inner A kończy się complete (zielony etap catchError). Klik B w 6,5 s tworzy #2 · B i nowy HTTP, który w 9 s zwraca B → S1 i kończy inner B. S1 ma [] i B, nadal słucha kliknięć. Licznik requestów HTTP: 1, potem 2.
- Postoje wewnątrz: subscribe, click-a, request, error, fallback, click-b, potem AUTO do sukcesu B. Notatki per checkpoint w `template[data-checkpoint-notes="b04-catcherror-2"]` (0–7, 60–90 s).
- Na zewnątrz (ten sam design): góra „klik$” → „switchMap” → „catchError” → kompaktowy odbiorca S1 — cztery kafelki z execution lanes, porty i kable toru S1 na jednej wysokości. Pod linią podziału (bez napisu) instancja jak w 09–12: `#1 · A`, turkusowy kafelek HTTP GET z lane (progress na pełną wysokość) i krótki kabel do inner subscribera; bez etapu catchError w dole i bez kontenera.
- Przebieg na zewnątrz (czas modelu): S1 subskrybuje w 0,3 s, klik A w 1 s tworzy inner #1 i HTTP A. W 4 s HTTP A emituje error (bez complete): lane HTTP i inner subscriber czerwone (! error), czerwony impuls biegnie do inner subscribera, a potem przez switchMap do zewnętrznego catchError. Po jego dotarciu catchError odłącza pierwotny strumień: szary impuls × od switchMap do klik$, wiersze klik$ i switchMap szare (teardown, bez czerwieni i complete). Następnie w wierszu catchError chwilowo widać `of([])`: catchError subskrybuje Observable zastępczy, kulka [] (kolor S1) dociera do S1 w 5,5 s, a zielony impuls complete w 6 s (catchError i S1 zielone). Klik B w 7,3 s pojawia się w szarym wierszu klik$ i gaśnie: nie dociera do switchMap, nie ma projekcji, inner ani HTTP. Licznik requestów HTTP: 1.
- Postoje na zewnątrz: click-a, error, caught, fallback, click-b, potem AUTO do podsumowania. Notatki per checkpoint w `template[data-checkpoint-notes="b04-catcherror"]` (start, HTTP A, błąd, przechwycenie, fallback, kolejne kliknięcie, podsumowanie).

**Speaker notes:**

> Porównaj położenie catchError: wewnątrz pipe każdego HTTP albo osobny operator za switchMap. Każde kliknięcie tworzy nową subskrypcję http.get(url(id)). W obu wariantach catchError subskrybuje of([]), które emituje i kończy się. Wewnątrz kończy się tylko inner A: kolejne kliknięcie uruchamia HTTP B z własnym catchError i przekazuje wynik B. Na zewnątrz catchError odłącza pierwotny strumień (klik$ i switchMap), a S1 dostaje [] i complete; klik B nie uruchamia HTTP B. Nie sugeruj, że każdy zewnętrzny catchError zawsze kończy wynik: tutaj wynika to z wyboru of([]).
>
> Na zewnątrz (per checkpoint): „Przed chwilą catchError znajdował się wewnątrz switchMap. Teraz przenosimy go na zewnątrz. Zobaczmy, co się zmieni.” → „Pierwsze kliknięcie uruchamia request. Na razie zachowanie jest dokładnie takie samo.” → „HTTP emituje błąd. Ale wewnątrz nie mamy już catchError, więc błąd propaguje się przez switchMap.” → „Dopiero tutaj łapie go zewnętrzny catchError. Problem polega na tym, że oryginalny strumień zostaje odsubskrybowany.” → „CatchError przełącza się na zastępcze of([]). Dostajemy pustą tablicę, a potem complete.” → „I teraz klikamy ponownie. Nic się nie dzieje. Nie dlatego, że switchMap zignorował kliknięcie, tylko dlatego, że nie mamy już aktywnej subskrypcji kliknięć.” → „CatchError wewnątrz ratuje pojedynczą operację. CatchError na zewnątrz zastępuje cały strumień po błędzie. Samo umiejscowienie operatora zmienia zachowanie aplikacji.”

Semantyka zastępowania błędu: [implementacja catchError w RxJS 7.8.2](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/catchError.ts).

## Ograniczanie emisji i wyzwalanie pracy

### Cztery sposoby ograniczania emisji — `16-czas-cztery`

**MAIN:** debounceTime i auditTime na jednej planszy: dwa proste potoki jeden pod drugim — „zdarzenia$” → „debounceTime” → S1 (fiolet) i „zdarzenia$” → „auditTime” → S2 (pomarańcz), kolumny wyrównane, kompaktowe odbiorcy z inboxem. Kafelek „zdarzenia$” jest powtórzony dla czytelności; obie subskrypcje dostają tę samą listę zdarzeń: A 0 s, B 1 s, C 2 s, D 4 s, E 5 s (dwie identyczne kulki lecą jednocześnie, chwilowy napis `next(C) · 2,0 s` między potokami). Timery żyją w wierszach operatorów (tło na pełną wysokość wiersza, stan `cisza: 2,4 s` / `okno: 2,4 s`; zapamiętana wartość to sama kulka przed portem wyjścia, jak w distinctUntilChanged — wejście dojeżdża do niej przez wiersz i ją podmienia, przy emisji kulka opuszcza operator i pamięć jest pusta) i płyną w czasie modelu — stoją podczas przelotu kulek. debounce przy każdej wartości wraca do początku; audit otwiera okno przy A i D, kolejne wartości tylko podmieniają pamięć. S2 dostaje C (3,5 s) i E (7,5 s), S1 dopiero E (8,5 s); bez complete. Postoje a, b, c (pytanie: kto pierwszy?), audit-c, d, e, audit-e, potem AUTO do emisji debounce. Notatki per checkpoint w `template[data-checkpoint-notes="16-czas-cztery"]` (75–90 s).

**Temat:** porównanie ciszy i okna na wspólnym wejściu.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 16-czas-cztery | debounceTime i auditTime: cisza czy okno? | `zdarzenia$.pipe(debounceTime(3500))`<br>`zdarzenia$.pipe(auditTime(3500))` |

## Współdzielenie i zastosowania w UI

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

> share (notatki per checkpoint): A uruchamia HTTP #1, które zwraca 42 i kończy się; share resetuje się po complete, więc późny B uruchamia HTTP #2 — ta sama definicja, nowy request; ostatecznie obaj mają 42, ale były dwa requesty. Przejście do shareReplay. shareReplay (notatki per checkpoint): A uruchamia jedno HTTP; 42 trafia do A i jednocześnie do bufora; request się kończy, wartość zostaje; późny B dostaje 42 bezpośrednio z bufora, a następnie complete, bez drugiego requestu. Kluczowa różnica względem share(): jeden request, a późny odbiorca nadal dostaje wynik. shareReplay({bufferSize:1,refCount:true}) zachowuje wynik poprawnie zakończonego źródła (wewnętrzny ReplaySubject); refCount: true nie usuwa tego bufora. Wersja RxJS 7.8.2.

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

## Pytania i dodatek

### Pytania? — `pytania`

**Temat:** zakończenie głównej części i wejście do dodatku.

**Na ekranie:** koniec MAIN i jeden link do dodatkowego przykładu shareReplay z `refCount: false` na interval (`x01-sharereplay-interval`). Pilot nie przechodzi automatycznie z MAIN do dodatku. Dodatek ma link „Powrót do pytań”.

**Speaker notes:** Zaproś do pytań. Jeśli chcesz rozwinąć temat, otwórz dodatkowy przykład shareReplay i interval.

### shareReplay — kto zatrzyma interval? — `x01-sharereplay-interval`

**Jedyny slajd EXTRAS, zaraz po „Pytania?”** Rozwinięcie share/shareReplay z MAIN. Cel: 60–90 s.

**Kod:** `const shared$ = interval(1000).pipe(` / `  shareReplay({ bufferSize: 1, refCount: false }));` — marka na `shareReplay` i osobna na `refCount: false` (czerwonawa, świeci od etapu „zero odbiorców” do subskrypcji B).

**Na bloczkach:** interval(1000) (niebieski, jeden wiersz `#1`) → shareReplay(1) (fioletowy: wiersz `#1` z kulką pamięci ostatniej wartości — bez prostokąta „bufor” — oraz wiersze A i B) → odbiorcy A (fioletowy) i B (pomarańczowy), pełne kafelki torów, wszystkie połączenia poziome. Bez dolnej sekcji inner. Liczniki: Odbiorcy i Upstream.

Scena na żywo (interval emituje co sekundę także na postojach, kontroler etapów jak Subject + interval):

| Etap | Na ekranie | Odbiorcy / Upstream |
| --- | --- | --- |
| READY | Same definicje, interval nie działa, pamięć pusta (`refCount: false` nie uruchamia źródła przed subscribe). | 0 / 0 |
| dalej: A subskrybuje | Migawka `const subA = shared$.subscribe(…)`; impuls od A przez shareReplay do interval, jedno upstream `#1`. Liczby 0, 1, 2… wpadają do kulki pamięci i dalej do A. | 1 / 1 |
| `unsub-a` | `subA.unsubscribe()`: szary × od A kończy się na shareReplay, wiersz A szary, przy A ×. Upstream aktywny. Pytanie: czy interval się zatrzymał? | 0 / 1 |
| `zero` | Zero odbiorców: interval nadal emituje, kulka pamięci się podmienia (3, 4, 5… — tyle, ile faktycznie minie), nic nie płynie dalej; wyróżnione `refCount: false`. | 0 / 1 |
| `sub-b` | `const subB = shared$.subscribe(…)`: impuls kończy się na shareReplay (bez drugiego interval). B od razu dostaje wartość zapamiętaną w chwili subskrypcji — tylko ostatnią — potem kolejne emisje na żywo. | 1 / 1 |
| `summary` | A odłączony, B aktywny, to samo wykonanie interval, pamięć z ostatnią wartością. Bez complete i bez unsubscribe B. | 1 / 1 |

Prawo po podsumowaniu przechodzi dalej; lewo cofa ostatnią akcję; wyjście ze slajdu sprząta wykonanie (powrót od READY). Druk i podgląd Notes używają umownych chwil akcji (A dostaje 0, 1, 2).

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY / A subskrybuje | Na MAIN widzieliśmy, że shareReplay potrafi zapamiętać wynik HTTP. Ale HTTP samo się kończy. Co się stanie, jeśli współdzielimy źródło, które nigdy się nie kończy? — Pierwszy subskrybent uruchamia interval. ShareReplay zapamiętuje ostatnią wyemitowaną wartość. |
| 1 | unsub-a | A się odłącza. Nie mamy już odbiorców. Czy to oznacza, że interval też przestał działać? |
| 2 | zero | Nie. Przy refCount ustawionym na false shareReplay utrzymuje połączenie upstream. Interval dalej emituje, a bufor nadal się aktualizuje. |
| 3 | sub-b | Nowy odbiorca natychmiast dostaje ostatnią zapamiętaną wartość. Potem otrzymuje kolejne emisje na żywo. Nie powstaje nowa subskrypcja interval. |
| 4 | summary | To potencjalna pułapka: nie mamy już odbiorców, ale źródło nadal może zużywać zasoby. A co zmieniłoby refCount: true? |

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

Dół: poziomy separator i do trzech wewnętrznych pipeline'ów jeden pod drugim. Każde utworzone i subskrybowane inner to pełny rząd: **ID wykonania (#1) → kulka wartości wejścia (A / A$) → HTTP GET (nagłówek + pełny execution lane z postępem i stanem tekstem) → opcjonalny operator (catchError) → inner subscriber** — pełny lane jak odbiorca główny, z ikoną, etykietą „inner #1”, odebraną wartością i statusem (`✓ complete`, `! error`, `× odłączono`). Kolumny są wspólne dla wszystkich ośmiu slajdów i wszystkich wykonań: ID od x 50, kulka, HTTP GET 180–480, catchError 540–780, subscriber 840–1210 (pod odbiorcą głównym); bez operatora kabel HTTP → subscriber jest po prostu dłuższy. Wartość bez utworzonego inner ma ID, kulkę i neutralny placeholder o wysokości lane: „?” (pytanie), „W KOLEJCE” (concatMap — wartość przed projekcją), „W KOLEJCE · Observable” (concatAll — już utworzone B$/C$, bez requestu) albo przygaszone „POMINIĘTE” (exhaustMap) — bez HTTP GET, subscribera i portów. switchMap zachowuje cały anulowany pipeline #1 (szary impuls × od subscribera do HTTP, ID szare, `× odłączono`, bez complete). distinctUntilChanged odrzuca duplikaty w górnym operatorze, bez dolnego wiersza. Nie ma napisu nad pracami, ramki sekcji ani przewodów między poziomami; wynik inner logicznie wraca przez górny operator.

**Kod na wszystkich slajdach** ma subtelne kolorowanie składni (źródła i `http.get`, operatory RxJS, literały, parametry funkcji, typy, słowa kluczowe) jako osobną warstwę pod pastelowymi wyróżnieniami fragmentów powiązanych z kafelkami; jasne tło i duże fonty bez zmian.

Prototypy QA zachowują poprzednie modele oraz geometrię. Cold/share pozostają bez zmian. Oba warianty catchError korzystają z tego samego adaptera: oba z panelem instancji jak 09–12 — wewnątrz każdy rząd to #n → kulka → HTTP GET → catchError → inner subscriber, na zewnątrz #n → kulka → HTTP GET → inner subscriber, a catchError stoi w górnym potoku.

W concatMap B pojawia się jako wartość W KOLEJCE; dopiero po complete poprzednika powstaje B$ i jego subskrypcja. concatAll pokazuje istniejące B$ i C$ czekające bez subskrypcji; wpis kolejki wchodzi z fade-in dopiero, gdy Observable utworzone przez map dotrze do concatAll. Wiersze zakończone pozostają zielone; pominięte wejścia exhaustMap nie tworzą wykonań. Standardowa siatka ma cztery miejsca. Kapsułki emisji i odbioru wchodzą przez 0,3 s. Postęp jest wyliczany w czasie ilustracji; w MAIN 08–12 kulka najpierw przechodzi po lokalnym wyjściu do prawej granicy panelu, a potem wychodzi z operatora. Prototypy zachowują krótki, niewidoczny powrót.

Liczniki uruchomionych i aktywnych inner korzystają ze stanu faktycznych subskrypcji. Nawigacja i postoje Reveal rodziny flatteningu pozostają dotychczasowe. Kontroler `stages` działa w podglądzie prototypów oraz w przebudowanym wprowadzeniu (04, wszystkie 05, oba 20). Spacja pauzuje/wznawia także pozostałe animacje, bez zmiany natywnej obsługi statycznego otwarcia. Zachowano identyfikatory i działające demonstracje; kolejność części właściwej odpowiada opisanej wyżej narracji 30–35 minut.

Na migrowanych slajdach diagram zajmuje 480 px wysokości. Większe kafelki mają 76 px wysokości, a odstęp do paneli 60 px; wiersze prac w prototypach są rozdzielone o 20 px, a MAIN 08–12 ma przylegające wiersze nowego panelu. Mniejszy podpis i liczniki są w stopce przy dole slajdu. U pokazuje kontrolki w miejscu stopki; ukrycie kontrolek przywraca podpis.

W `map + concatAll` górny pipeline ma cztery poziome kolumny: source$ → map → concatAll → odbiorca. kulka A wjeżdża do map, zatrzymuje się na 1,4 s i zmienia w A$ (jak 21 → 42 w 04a), bez czasowego progressu. Tempo całej rodziny 08–12 odpowiada 04a: krok subscribe 0,8 s, przelot 1 s, terminal 0,8 s. Oczekujące wiersze pojawiają się dopiero po dotarciu A$/B$/C$ do concatAll.

W MAIN 08–12 przy complete zielony staje się execution lane, a nagłówek definicji pozostaje pastelowy. Pozostałe migrowane sceny zmieniają tło całego kafelka przy własnym complete. Źródło może zakończyć się wcześniej; *Map pozostaje aktywne aż do zakończenia wymaganych inner i kolejki. Nieobsłużony error daje czerwony operator, a odsubskrybowane źródło zachowuje swój kolor.


Płaski styl kafelków obejmuje 04-operator, całą rodzinę 05-zrodla, 04a-dwa-tory (cold, share, share-interval) oraz slajdy 08–12 (map + concatAll, concatMap, mergeMap, switchMap i exhaustMap): klasa `rx-flat-tiles` w scene.playerClass usuwa obrys i zaokrąglenie głównego prostokąta kafelka. Boksy historii (data-panel-box) w tych slajdach też są płaskie, z ciemniejszym tłem #ECE6DA zamiast ramki. Panel prac 08–12 jest rysowany płasko natywnie. Placeholder kolejki zachowuje przerywany obrys. Geometria, fonty, porty, progress, stany i animacje pozostają bez zmian; pozostałe slajdy nie otrzymują tej klasy.
