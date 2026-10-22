# RxJS — Operatory, które znasz, ale bałeś się zagadać

Polska prezentacja Pawła Kondraciuka o sterowaniu pracą, kolejnością, subskrypcjami i współdzieleniem w RxJS. Podstawowy przykład współdzielenia jest niezależny od frameworka; po nim wspominamy zastosowania w Angularze i React. Otwarcie przypomina historię meet.js Białystok; część techniczna używa animowanych bloczków i wartości.

Ten README jest mapą treści: opisuje slajdy, zawartość bloczków i speaker notes. Implementację animacji, mapę plików i używane API znajdziesz w [AGENTS.md](AGENTS.md).

Pełny eksport notatek dla **42 slajdów MAIN**, od powitania do pytań i feedbacku, znajduje się w [work/speaker-notes-main.md](work/speaker-notes-main.md). Uwzględnia plan 33 tematów, aktualną kolejność wariantów oraz wszystkie notatki checkpointów i fragmentów. Źródłem notatek wyświetlanych przez Reveal pozostaje `index.html`.

## Uruchomienie i obsługa

```sh
npm ci
npm run dev
```

Otwórz adres podany przez serwer ze ścieżką `/rxjs-operatory/`. `npm run build` buduje prezentację, `npm run preview` uruchamia podgląd zbudowanej wersji. `S` otwiera widok prelegenta z notatkami, `Esc` widok wszystkich slajdów. Strzałki i Page Up/Page Down obsługują nawigację Reveal.js; fragmenty odsłaniają zdjęcia i listy.

Sceny MAIN z pytaniami zaczynają od nieruchomego READY. Prawo / Page Down uruchamia kolejny etap do postoju; ponowne naciśnięcie podczas ruchu natychmiast pokazuje koniec tego etapu i zatrzymuje animację. Następny klik uruchamia kolejny etap; lewo cofa. Pomijanie ruchu działa również przyciskiem „dalej” i pilotem. Dopiero następny klik po ostatnim pytaniu uruchamia AUTO na tym samym slajdzie. Automat zatrzymuje się na wyniku FINISHED. U pokazuje dolne sterowanie, A przechodzi z ręcznego do auto lub pauzuje/wznawia auto, M zmienia tryb, [ i ] zmieniają krok, R zaczyna od początku. Sceny wprowadzające z kontrolerem stages w AUTO kończą bieżący etap i pozwalają cofać checkpointy; R przywraca zatrzymany READY. Spacja pauzuje lub wznawia aktywną animację, a zdjęcia i statyczne otwarcie zachowują natywne sterowanie. W pozostałych scenach w AUTO prawo / Page Down najpierw pokazuje nieruchomy wynik całej animacji; dopiero kolejne naciśnięcie zmienia slajd. Dotyczy to również pilota i przycisków „dalej”. Lewo wraca do poprzedniego slajdu. Tryb, postój i pauza są pamiętane przy powrocie.

W oknie prelegenta (`S`) podgląd następnego slajdu domyślnie pokazuje dużą nazwę, np. **switchMap**, i krótki podtytuł. Wskazuje kolejny slajd, także podczas ręcznych postojów bieżącej animacji. Przełącznik **Podgląd: Tytuł / Slajd** w prawym dolnym rogu tego pola przywraca standardowy podgląd. Wybór jest zapamiętywany w przeglądarce. Notatki pozostają w standardowym polu Notes. Opcjonalne `data-speaker-title` na sekcji ustawia własny podpis wyłącznie dla prelegenta.

Dopisanie `?print-pdf` przed hashem ustawia wszystkie animacje w końcowych nieruchomych kadrach bez kontrolek. Reveal drukuje też kolejne fragmenty pełnego otwarcia na osobnych stronach: obecnie 42 slajdy; plansza `01b-rx-marbles` dodaje jedną stronę do dotychczasowych 60 stron PDF (także pięć stanów kodu `05b-http-kod`: bez wyróżnienia i cztery wyróżnione fragmenty, trzy stany pełnego kodu `04b-map-kod`: bez wyróżnienia i dwa kolejne wyróżnienia).

Domyślny format to 4:3 (scena 1280×960) pod projektor 4:3. `?ratio=16:9` przywraca ekran panoramiczny 1280×720. `W` przeładowuje stronę w drugim formacie, zostając na tym samym slajdzie i fragmencie; animacja wraca do stanu tego fragmentu. Druk działa w obu: `?print-pdf` (4:3) lub `?print-pdf&ratio=16:9`. W 4:3 slajdy wykorzystują pełną wysokość: większe zdjęcia i kody QR, wyższe diagramy, większy tekst i kapsułki w animacjach (×1,15), etykiety kafelków do ×1,3 oraz większy tytuł (64 px; za długi zmniejsza się, by został w jednej linii), kod (42 px, długi łańcuch przechodzi do nowej linii przed .pipe/.subscribe) i podpis.

`12a-switchmap-live` („Wybór operatora”) po slajdzie źródła query$ czeka z ukrytą nazwą operatora. Pierwsze prawo/Page Down/pilot odsłania switchMap i uruchamia r → re → rea. Po wyniku i complete HTTP #3 pokaz zatrzymuje się automatycznie, także w AUTO: #1 i #2 anulowane, #3 zakończone, wynik [#3], input rea, liczniki 3/3/0. Kolejne dalej przechodzi do debounceTime; szybkie dalej podczas animacji tylko pokazuje końcowy kadr. Lewo wraca do źródła query$. Spacja uruchamia lub pauzuje/wznawia, R i ponowne wejście przywracają zamaskowany READY. Badge pozostaje „Ręczny · M”, dopóki prelegent nie zmieni trybu. Druk, F i Upcoming pokazują ten sam końcowy kadr trzech requestów.

`12b-debounce-switchmap` kontynuuje wyszukiwarkę: ręczne etapy pokazują subskrypcję, timer, pierwszy HTTP i pisanie podczas requestu. Do trzeciej emisji debounceTime (`ang`) prawo odtwarza etap, a ponowne prawo w ruchu kończy bieżący. Od drugiego HTTP pokaz płynie bez końca, a prawo od razu prowadzi do distinctUntilChanged. Wszystkie HTTP kończą się sukcesem i complete inner; główny pipeline nadal działa. Lewo cofa do ręcznego postoju, Spacja pauzuje/wznawia, R i ponowne wejście przywracają zatrzymany początek. Druk, F i Upcoming pokazują HTTP #1 rea anulowany oraz #2 rea i #3 ang zakończone, liczniki 15/3/0.

Na slajdach debounceTime (`12b`), distinctUntilChanged (`11a`), catchError w wyszukiwarce (`11b`), catchError na zewnątrz (`b04`) i retry (`x03`) cała początkowa subskrypcja jest już widoczna w READY. Pierwsze prawo uruchamia zdarzenia przykładu, bez powtarzania subscribe. W retry HTTP #1 jest już podłączone z postępem 0% (liczniki 1/1); pierwszy postój to error-1. Przyszłe innery, fallback i kolejne próby nadal subskrybują w odpowiednich momentach.

## Jak czytać spis

Porównania są osobnymi slajdami. Warianty z sufiksami -2/-3/-4 powstają podczas uruchamiania; pierwszy zachowuje ID bazowe. Poniżej podano kolejność MAIN, a dalszy spis opisuje rodziny tematycznie.

Każda pozycja opisuje temat, ekran/bloczki i notatki prelegenta. Tabele wariantów podają rzeczywiste tytuły i kod nad diagramem. Bazowe speaker notes rodzin są klonowane z sekcją; gdy wariant ma `template[data-checkpoint-notes]` dla swojego ID, jego notatki checkpointów zastępują bazowy opis w oknie prelegenta. Notatki przytoczono z ujednoliconymi odstępami; powtarzaną instrukcję obsługi zwykłych animacji opisano wspólnie wyżej.

Notatki są dopasowane do planu 33 tematów: krótkie punkty bazowe, **❓ SALA** przy pytaniach i **⏸ PAUZA** przy postojach animacji. Otwarcie obejmuje powrót do Zmiany Klimatu, lokalną społeczność i konkurs WebStorm; slajd tytułowy pyta „Kto zna? Kto używa? Kto lubi?” oraz wprowadza źródło → operatory → odbiorcę. Rozwinięcia checkpointów zachowują wskazówki do demonstracji.

Czasy są umownym modelem dydaktycznym. Przelot wartości i pauza przy operatorze spowalniają ilustrację; nie dodają opóźnień do rzeczywistego synchronicznego RxJS. HTTP jest symulowane. Pasek pokazuje czas pracy, a nie pomiar postępu prawdziwego żądania.

## Ścieżka MAIN i czas

Otwarcie do tytułu pozostaje bez zmian: społeczność, historia meet.js, fotografie i autor. Po tytule krótkie rysunkowe intro „fabryka soku” i żartobliwa plansza klasycznych Rx marbles, potem HTTP, Cold, interval, Subject — ręczną emisję, ręczny multicast HTTP i odłączanie źródła interval, a dopiero potem pytania o znane operatory i share. Budżet **30–35 minut dotyczy tylko części właściwej**; otwarcie i pytania są dodatkowo.

Prezentacja ma **42 slajdy (28 scen odtwarzacza)**, z 36 bazowych sekcji HTML po rozwinięciu wariantów. Nie ma slajdów EXTRAS. Warianty powstają przed wyborem ścieżki; końcowe ID zachowują poprzednie znaczenie niezależnie od kolejności.

Kolejność po slajdzie tytułowym:

1. Intro dla początkujących bez kodu: fabryka soku na taśmociągu — źródło → operatory → odbiorca (`01a-fabryka-soku`), a po niej żart: śmiertelnie poważne klasyczne diagramy marbles bez komentarza (`01b-rx-marbles`, puenta wyłącznie ustna).
2. Pierwsze slajdy techniczne pokazują komplet podstawowych zachowań Observable: HTTP — subscribe, next, complete (`05-zrodla-2`) → kod źródłowy httpGet krok po kroku (`05b-http-kod`) → Cold: jedna definicja, trzy wykonania, trzy complete (`04a-dwa-tory`) → interval na żywo — cold, osobne wykonanie każdego odbiorcy, unsubscribe (`05-zrodla`) → Subject — ręczne next, późny subskrybent bez historii, complete, subskrypcja po zakończeniu i ignorowane next(3) (`05-zrodla-5`) → Subject: ręczny multicast HTTP (`05-zrodla-3`) → Subject — kto odłączy źródło? (`05-zrodla-4`). Po nich „Jakie znasz operatory RxJS?” (`02-znane-operatory`) → HTTP GET + map: obiekt User → „Paweł Kondraciuk” (`04-operator`) → kod myMap (`04b-map-kod`) → „A share?” (`03-a-share`), wstęp do share + HTTP.
3. Jedna historia Cold → Subject → share na tych samych przykładach: cold — trzy subskrypcje, trzy HTTP, trzy complete (`04a-dwa-tory`) → Subject + HTTP: jeden request dla A/B, późny C dostaje tylko complete (`05-zrodla-3`) → Subject + interval: odbiorcy odchodzą, źródło nadal działa (`05-zrodla-4`) → pytanie o znane operatory → HTTP GET + map (`04-operator`) → kod myMap (`04b-map-kod`) → „A share?” (`03-a-share`) → share + HTTP: A/B współdzielą request #1, po complete pytanie z sali i późny C uruchamia request #2 (`04a-dwa-tory-2`) → share + interval: A/B odchodzą, późny C uruchamia nowe interval od 0 (`04a-dwa-tory-3`) → shareReplay(1) na interval: odbiorcy odchodzą, źródło pracuje dalej (`20a-sharereplay-interval`) → shareReplay z refCount: true na interval: ostatni odbiorca czyści bufor i odłącza źródło, późny C zaczyna od zera (`20b-sharereplay-refcount`) → shareReplay z refCount: true + HTTP: późny odbiorca dostaje wynik z bufora (`20-sharereplay-2`). Powtarzające je cold timer i oba slajdy `07-hot-cold` zostały usunięte.
4. **map + concatAll (`08-map-strumienie`) pozostaje kluczowym pomostem w MAIN**, bezpośrednio przed concatMap → mergeMap → switchMap → exhaustMap (cztery *Map obok siebie) → „Zaprojektujmy wyszukiwarkę” (`12-intro-wyszukiwarka`) → źródło query$ (`12-query-zrodlo`) → switchMap na żywo (`12a-switchmap-live`) → debounceTime + switchMap (`12b-debounce-switchmap`) → distinctUntilChanged przed switchMap (`11a-distinct-switchmap`, jedyny distinctUntilChanged w MAIN) → catchError wewnątrz switchMap w tej samej wyszukiwarce (`11b-catcherror-search`).
5. catchError na zewnątrz (`b04-catcherror`) → retry z backoff 1/2/4 s (`x03-retry-backoff`) → cztery operatory czasowe (`16-czas-cztery`) → RxJS w liczbach (`24-rxjs-liczby`) → „Pytania?”. Osobny wariant „catchError wewnątrz” został usunięty; lokalną obsługę błędu pokazuje wyszukiwarka (`11b-catcherror-search`).
6. „Pytania?” z kodem QR do feedbacku → rozmowa z salą.

| Część właściwa | Budżet |
| --- | --- |
| Intro: fabryka soku i żart z Rx marbles | 1 min (z rezerwy) |
| HTTP, źródła, map/pipe, wykonania, Subject i share/replay | 10 min |
| map + concatAll, cztery operatory *Map i distinctUntilChanged przed switchMap | 13,5 min |
| catchError i retry | 5 min |
| debounceTime w wyszukiwarce | w bloku wyszukiwarki |
| RxJS w liczbach | 1 min (60–90 s) |
| Podsumowanie | 1,5 min |
| Rezerwa na interakcję i przejścia | 1 min |
| **Łącznie** | **33 min** |

Na map + concatAll i przejście do concatMap przewidziano około 3 minut z bloku flatteningu. Czasy są planem prelegenta, nie pomiarem odtwarzacza.


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

Status to mały tekst bez ramki przy prawej krawędzi wiersza odbiorcy, po prawej od otrzymanych danych; pojawia się dopiero po dotarciu impulsu (unsubscribe — po dotarciu `×` do źródła). Kafelki pośrednie (HTTP GET, map, Subject) nie powtarzają napisu — pokazują tylko kolor tła wiersza. Przy każdym polu widoku status stoi w prawym górnym rogu, w linii etykiety, niezależnie od długości wartości.

## Otwarcie i społeczność

### Społeczność — `spolecznosc`

**Temat:** zaproszenie do społeczności JavaScript.

**Na ekranie:** dwie kolumny: Discord „meet.js Poland” z QR i podpisem „Dołącz do rozmowy”; Facebook „JavaScript i front-end Białystok” z QR i podpisem „Dołącz do grupy”.

**Speaker notes:**

- Powitanie meet.js Białystok — wracamy do Zmiany Klimatu.
- Lokalna społeczność: Discord meet.js Poland i grupa JavaScript i front-end Białystok. Daj chwilę na zeskanowanie QR.
- WebStorm — zapowiedz konkurs / giveaway; wrócimy do niego na końcu.
- Przejście do pytania: kiedy odbyło się pierwsze spotkanie?

### Pierwsze meet.js: pytanie — `pierwsze-meetjs-pytanie`

**Temat:** pytanie do publiczności o początek spotkań.

**Na ekranie:** duże pytanie „Kiedy odbyło się pierwsze spotkanie meet.js w Białymstoku?”. Odpowiedź pojawia się na następnym slajdzie.

**Speaker notes:**

- ❓ SALA: Kiedy odbyło się pierwsze spotkanie meet.js w Białymstoku?
- Daj chwilę na odpowiedzi. To podchwytliwe pytanie — odpowiedź na następnym slajdzie.

### meet.js Białystok #2 — `pierwsze-meetjs-odpowiedz`

**Temat:** pierwsze spotkanie pod nazwą meet.js miało numer #2.

**Na ekranie:** tytuł, data 24 lutego 2015 i plakat spotkania w Zmianie Klimatu.

**Speaker notes:**

- 24 lutego 2015, Zmiana Klimatu — pierwsze spotkanie pod szyldem meet.js, ale numer #2.
- Numer #1 odbył się wcześniej jako JavaScript Białystok. Dalej: początki przed meet.js.

### JavaScript Białystok #1 — `javascript-bialystok-1`

**Temat:** wcześniejsze spotkanie, przed przyjęciem nazwy meet.js.

**Na ekranie:** tytuł i data 20 stycznia 2015. Najpierw plakat, następnie trzy zdjęcia odsłaniane fragmentami Reveal: prelegent na scenie, sala pełna uczestników i publiczność skupiona na prelekcji.

**Speaker notes:**

- 20 stycznia 2015 — pierwsze spotkanie JavaScript Białystok, jeszcze przed meet.js.
- Angular — Karol Rogowski. Adam Piotrowski, Hubert i znajome twarze na zdjęciach.
- Zmiana Klimatu — dzisiejsze spotkanie to powrót do korzeni.
- Odsłaniaj zdjęcia kolejnymi kliknięciami. Wtedy obcy ludzie, dziś znajome twarze — jak operatorzy z tytułu.

### Historia meet.js Białystok — `historia-meetjs`

**Temat:** historia spotkań i miejsc w latach 2015–2026.

**Na ekranie:** oś lat z numerami edycji, datami i linkami do wydarzeń; podtytuł „62 spotkania · 7 miejsc · 2015–2026”. Kolory oznaczają Zmianę Klimatu, SoftwareHut, HACKLAG, Explorer HQ, Instapage Poland, 6-Ścian PUB Sześcian i Klub GWINT. Legenda zawiera udziały miejsc i oznaczenie odwołanych #34 i #38. Slajd obejmuje także planowaną edycję #65.

**Speaker notes:**

- 62 spotkania; numeracja nie opisuje całej historii — początki przed meet.js i odwołane edycje.
- Zmiana Klimatu → SoftwareHut → Instapage i kolejne miejsca. Kolory na osi odpowiadają legendzie.
- Rozwój → COVID → przerwy → powroty.
- Lokalna społeczność, ci sami ludzie przez lata. Cel: regularne spotkania.

### Zawsze gdzieś się przewijałem

**Temat:** osobista historia uczestnictwa autora w spotkaniach.

**Na ekranie:** stos sześciu archiwalnych zdjęć autora na widowni, odsłanianych kolejnymi fragmentami. Slajd nie ma własnego ID w HTML.

**Speaker notes:**

- Zawsze gdzieś się przewijałem — znajdź mnie na archiwalnych zdjęciach.
- Ci sami ludzie przez lata tworzą lokalną społeczność. Kolejne kliknięcia odsłaniają zdjęcia.

### Poprzednie wystąpienia

**Temat:** dwie wcześniejsze prelekcje autora.

**Na ekranie:** dwie karty ze zdjęciami: „Jak zostać mobile deweloperem w 1 dzień” — podpis „17. lipiec 2016 · meet.js #8”; „Trening na redukcję: jak spalić kilobajty” — „17. maj 2017 · meet.js #15”. Slajd nie ma własnego ID w HTML.

**Speaker notes:**

- Dwa wcześniejsze wystąpienia, około 10 lat temu: mobile development (2016) i redukcja wagi skryptów (2017).
- Programowanie wtedy a AI dzisiaj — wiele się zmieniło.
- Dzisiaj RxJS: praktyczne zachowanie operatorów i decyzje o pracy, kolejności oraz współdzieleniu.

### Tytuł prezentacji — `tytul`

**Temat:** przedstawienie autora i dzisiejszego tematu.

**Na ekranie:** „RxJS — Operatory, które znasz, ale bałeś się zagadać”. Karta: Paweł Kondraciuk, awatar, X/GitHub `@pawelkondraciuk`, Discord meet.js Poland, „Sr. JavaScript Developer” i logo Tradeweb. To statyczny slajd.

**Speaker notes:**

- ❓ SALA: Kto zna RxJS? Kto używa? Kto lubi?
- Asynchroniczne zdarzenia i wartości: kliknięcia, HTTP, WebSocket, timery.
- Źródło → operatory → odbiorca. Emisje w czasie i deklaratywne przetwarzanie.
- Dziś przyglądamy się praktycznemu zachowaniu operatorów. Zaczynamy od HTTP.

## Wprowadzenie do RxJS

### RxJS — o co w tym chodzi? — `01a-fabryka-soku`

**MAIN — między slajdem tytułowym a HTTP.** Intro ELI5 dla osób, które RxJS widzą pierwszy raz (około minuty), bez kodu i liczników.

**Na ekranie:** rysunkowa fabryka soku — podajnik, taśma, bramka „tylko jabłka”, wyciskarka i odbiorca za stołem; skrzynka na odrzucone owoce pod taśmą. Kremowe tło, grube kontury, pastelowe kolory prezentacji. Wejście: nieruchomy zarys fabryki bez napisów. Cztery „dalej”:

1. **Źródło** — podajnik wypuszcza kolejno jabłko, gruszkę i jabłko; taśma przesuwa je w stronę bramki. Podpis „Źródło”.
2. **Bramka** — jabłka przechodzą (zielona lampka), ramię spycha gruszkę do skrzynki (czerwona lampka). Podpis „Tylko jabłka”.
3. **Wyciskarka** — każde jabłko znika w maszynie i wyjeżdża jako jedna szklanka soku. Podpisy „Zamień na sok” i klamra „Operatory” nad bramką i wyciskarką.
4. **Odbiorca** — dwie szklanki dojeżdżają na stół, odbiorca unosi ręce. Podpis „Odbiorca” i puenta: *„Opisujesz, co zrobić z kolejną wartością, kiedy się pojawi.”*

Stopka opisuje bieżący etap. Postój po każdym etapie także w AUTO; po finale „dalej” prowadzi do planszy Rx marbles. Szybkie „dalej” kończy etap, „wstecz” cofa do poprzedniego postoju, powrót na slajd przywraca wejście. Przy ograniczonym ruchu każdy etap od razu pokazuje stan końcowy; druk — finał. Pauzy taśmy są zabiegiem ilustracyjnym, nie modelem buforowania.

**Speaker notes (per checkpoint):**

- Wejście: „Zanim zobaczymy kod: wyobraźcie sobie małą fabrykę soku.”
- Źródło: owoce pojawiają się jeden po drugim, w czasie — podajnik to Observable.
- Bramka: wybieramy, co nas interesuje — filter.
- Wyciskarka: jedno jabłko → jedna szklanka — map; bramka i wyciskarka to operatory.
- Finał: puenta i zapowiedź „A teraz klasyczne diagramy RxJS…” — z poważną miną.

### Rx marbles (żart) — `01b-rx-marbles`

**MAIN — między fabryką soku a HTTP.** Statyczna plansza na 5–10 sekund, bez tytułu, komentarza, legendy, animacji i fragmentów; jedno „dalej” prowadzi do HTTP.

**Na ekranie:** klasyczny diagram marbles łańcucha dwóch operatorów, w osadzonym SVG na kremowym tle: źródło 1, 2, 3, 4 → `map(x => x * 10)` → 10, 20, 30, 40 → `filter(x => x > 20)` → 30, 40. Wynik map jest jednocześnie wejściem filter (jedna wspólna oś pośrodku). Poziome osie ze strzałkami, kolorowe kulki z liczbami (wynik w kolorze swojego wejścia, wyrównany w czasie), biały prostokąt operatora, pionowa kreska complete. Style `.rx-marbles` w custom.css (4:3 i 16:9). Podgląd prelegenta pokazuje nazwę „Rx marbles” (`data-speaker-title`).

**Speaker notes:** 2–3 sekundy poważnej ciszy („no i zaczęło się”), potem puenta: „Dobra, żartowałem. Zobaczmy coś z życia.” Przejście: „A teraz zamiast jabłka — odpowiedź z serwera.”

### Jakie znasz operatory RxJS? — `02-znane-operatory`

**Temat:** rozmowa z publicznością o znanych operatorach.

**Na ekranie:** pytanie i odsłaniane pojedynczo bloczki tekstowe: `map`, `tap`, `filter`, `switchMap`.

**Speaker notes:**

- ❓ SALA: Jakie znasz operatory RxJS? Daj chwilę na odpowiedzi.
- Odsłaniaj kolejno: map, tap, filter, switchMap.
- Dalej: operator to funkcja — User → fullName na przykładzie map.

### A share? — `03-a-share`

**Temat:** przejście od popularnych operatorów do współdzielenia.

**Na ekranie:** wyłącznie duże pytanie „A share?”.

**Speaker notes:**

- ❓ SALA: A share? Kto używa i co właściwie współdzielimy?
- Przypomnij: Cold — trzy requesty; Subject + HTTP — jeden request, ale ręczne podłączenie.
- Czy operator może podłączyć źródło i zarządzać nim za nas? Dalej: share(), wspólny request A/B i późny C.

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
| 2 | subscribed-map | Chwilowe `.subscribe()` A; impuls subscribe dotarł od A do map i tam stoi (ręczna pauza). Wiersz A w map, HTTP GET bez wykonania (Requesty 0). „Subskrypcja idzie od odbiorcy do źródła, a wartości wracają w przeciwnym kierunku.” |
| 3 | arrived | Jeden etap bez postoju w trakcie requestu: map subskrybuje HTTP (impuls biegnie dalej w lewo, Requesty 1), request z postępem, potem HTTP emituje jedną kulkę „{…}” (cały User, bez JSON-a) — postój, gdy dotarła do wejścia map. |
| 4 | mapped | Kulka stoi w środku wiersza map i zmienia się w „"…"” (string); ta sama subskrypcja, bez nowej pracy. |
| 5 | received | Wynik dociera do A; pole `fullName` pokazuje pełne „Paweł Kondraciuk”. |
| 6 | complete | Zielony impuls z HTTP przez map do A; wiersze HTTP GET, map i A zielenieją, a przy A (nad długim wynikiem, w linii etykiety pola) pojawia się `✓ complete` — bez napisu w HTTP GET i map. Map nie zatrzymuje complete i nie wywołuje drugiego requestu. |
| — | FINISHED | Podpis „Jeden request, jeden User, jeden string. complete zakończył wykonanie”. |

**Speaker notes** (`template[data-checkpoint-notes="04-operator"]`): „Załóżmy, że pobieramy dane użytkownika z HTTP. Dostajemy cały obiekt, ale nasz widok potrzebuje tylko pełnego imienia i nazwiska” → pipe nie uruchamia HTTP → subscribe uruchamia jeden request → „Operator map dostaje pojedynczą wartość i synchronicznie ją przekształca. Tutaj z obiektu User tworzymy string” (map działa dla każdej kolejnej emisji, nasze HTTP emituje jedną) → „HTTP wykonał jeden request i wyemitował jeden obiekt. Map przekształcił go w jeden string. To nadal jedno wykonanie Observable” → „Map nie zmienia sposobu zakończenia — complete przechodzi dalej do odbiorcy” → przejście do „myMap od środka”: zobaczymy w kodzie subskrypcję biegnącą w lewo i emisję płynącą w prawo. Po „A share?” wracamy do surowego `user$ = httpGet<User>('/api/users/42')`, bez map.

Kontroler `stages`: → zaczyna lub kończy etap, ← cofa checkpoint także w AUTO, Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany READY. Tempo ilustracji: etap pipe 0,65 s, pojawienie odbiorcy 0,3 s, subscribe 1 s (0,5 s na odcinek, między odcinkami postój 0,6 s na map — `timing.mapHold`), request 2 s, przelot 1,4 s, projekcja 2 s, zatrzymanie odbioru 0,5 s, terminal 1,6 s, cisza 1 s przed FINISHED.

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

**share(): wspólny request i późny odbiorca (`-2`).** READY pokazuje definicję user$, HTTP GET i dwa pola A (`user.firstName`) oraz B (`user.lastName`). Pierwszy krok (`share-added`) dopisuje `.pipe(share())`. Następny krok odtwarza bez pośrednich postojów subskrypcję A, dołączenie B do trwającego HTTP #1, odpowiedź User do obu pól i complete. Postęp HTTP trwa 1,2 s; imię i nazwisko pokazują Paweł i Kondraciuk. Postój `complete`: 0 odbiorców, 1 request; ⏸ PAUZA również w AUTO i pytanie „A co, jeśli ktoś zasubskrybuje po zakończeniu requestu?”. Kolejne prawo w jednym etapie ujawnia C (`user.city`), uruchamia HTTP #2 (postęp także 1,2 s), pokazuje Białystok i complete (`complete-c`). A/B zachowują dane i zakończone subskrypcje. Żaden request ani dostarczenie jego wyniku nie wymaga osobnego kliknięcia w trakcie. Łącznie trzy postoje: share-added, complete, complete-c. Requesty kończą na 2, Odbiorcy na 0; potem FINISHED i share + interval. Osobny `20-sharereplay` pozostaje tylko modelem QA.

**share(): kto odłączy źródło? (`-3`) — 45–60 sekund.** READY ma tylko A/B i jedno już działające wykonanie interval #1, kod `const shared$ = interval(1000).pipe(share());`. Pierwsze „dalej” wywołuje `subA.unsubscribe()` — B nadal odbiera. Drugie to `subB.unsubscribe()`: ostatni odbiorca odchodzi, × B kończy się na share() i scena staje (⏸ PAUZA także w AUTO): Odbiorców 0, połączenie share() → interval #1 nadal zestawione, bez nowych emisji — pytanie do publiczności „Co się wydarzy?”. Trzecie „dalej” (`disconnect`) pokazuje odpowiedź: share() sam odłącza upstream (× do interval), #1 szarzeje i przestaje emitować, bez complete; licznik emisji stoi dowolnie długo. To rozdzielenie ilustracji — w RxJS odłączenie następuje synchronicznie przy unsubscribe B. Czwarte „dalej” ujawnia późnego C i pokazuje jego subscribe przez share() do źródła: powstaje interval #2, liczący od 0; C nie dostaje historii A/B. Dawne #1 i A/B pozostają odłączeni. Emisje do C trwają na żywo, następne prawo zmienia slajd. Szybkie prawo jedynie kończy bieżącą animację, lewo cofa ostatnią akcję; reset przywraca A/B i #1. Postoje: unsub-a, unsub-b, disconnect, subscribed-c. Druk/F pokazują zatrzymane #1 i aktywne #2 z C; jeden wspólny renderer i zegar. Notatki per checkpoint; dalej shareReplay(1) na interval.

**Dawny wariant share za map z unsubscribe A (`lanesMode: 'share-unsub'`).** Nie jest już slajdem; ścieżka `lanesGraph` (HTTP GET → map → share() → odbiorcy, kod `httpGet<number>(url)` / `  .pipe(map(x => x * 2), share())`) zostaje dla scenariuszy `shareScenario` i testów mechanizmu.

**Scenariusze share (dane, nie osobne slajdy).** `shareScenario` (lista Subscriberów `{id, start, unsub?}`) wylicza sesje upstreamu: C (niebieski) dołącza do trwającego upstreamu w trzecim wierszu, bez nowego requestu; odejście ostatniego aktywnego przed odpowiedzią anuluje upstream (HTTP z niedokończonym paskiem, bez complete); późniejszy Subscriber otwiera nową sesję w swoim kolorze (nowy wiersz HTTP/map, połączenie do share z załamaniem). Sprawdzają to testy.

**Speaker notes:** Nagłówki to jedna definicja, wiersze to wykonania. Cold: każdy subscribe tworzy własny request. share współdzieli upstream, ale nie skleja odbiorców — każdy ma własny wiersz i może odejść osobno. Dolne wykonania HTTP dla *Map pozostają bez zmian.

### Źródła — rodzina `05-zrodla`

Warianty zachowują ID, lecz zajmują oddzielne miejsca narracji: **HTTP otwiera część właściwą**, po kodzie httpGet i Cold pokazujemy interval, a potem kolejno Subject — ręczną emisję (next i complete), Subject: ręczny multicast HTTP i „Subject — kto odłączy źródło?”. Dopiero po nich „Jakie znasz operatory RxJS?”, „Operator to funkcja” i „A share?”. Historia współdzielenia: **Cold → ręczna emisja Subjecta → ręczny multicast HTTP przez Subject → ręczne połączenie interval, którego nikt nie odłącza → pytania o operatory i map → automatyczny multicast przez share() → share() odłącza źródło sam**.

| ID | Kod i zachowanie |
| --- | --- |
| 05-zrodla-2 | `httpGet('/api/data')`. READY ma tylko nagłówek HTTP GET. Etapy: receiver (pojawia się odbiorca z ikoną inbox i literą A, bez połączenia) → subscribed (dopisane `.subscribe(render)`, impuls dotarł do HTTP, migawka `.subscribe()` A widoczna, request jeszcze nie ruszył) → response (migawka gaśnie, request w wierszu HTTP, pauza tuż po wylocie „dane”) → first (dane u A przed complete) → AUTO: complete do A i FINISHED. Notatki per checkpoint w `template[data-checkpoint-notes="05-zrodla-2"]` (definicja, odbiorca, subscribe, request i odpowiedź, dane u A, complete i przejście do kodu httpGet). |
| 05-zrodla | `interval(1000)` na żywo (cold), kafelek podpisany samym `interval`. READY: interval i odbiorca A (ikona inbox, litera A) → `.subscribe()` (dopisane `.subscribe(render)`, postój z migawką `.subscribe()` A, bez emisji) → emisje A 0, 1, 2… bez końca → pojawia się B i subskrybuje: drugi wiersz wykonania w interval, B dostaje własne 0, 1, 2… (pierwsze 0 już 0,6 s po zestawieniu subskrypcji; migawka `.subscribe()` B gaśnie, gdy B zaczyna emitować) → `.unsubscribe()` A → `.unsubscribe()` B (bez complete) → kolejne „dalej” przechodzi dalej. |
| 05-zrodla-5 | Stale tylko `const subject$ = new Subject<number>();`. A subskrybuje i dostaje `subject$.next(1)`; dopiero potem pojawia się B (`subject$.subscribe(observerB)`) i nie dostaje wcześniejszej 1; `subject$.next(2)` trafia do A i B; `subject$.complete()` — zielony impuls do obu, wiersze ✓ complete, historie zostają (A: 1, 2; B: 2). Następnie C subskrybuje zakończony Subject i dostaje tylko complete, bez wartości; next(3) jest ignorowane. Odbiorcy nadal 0. Bez error, unsubscribe i upstreamu. |
| 05-zrodla-3 | Kod rośnie etapami: `const subject$ = new Subject<User>();` → `const http$ = httpGet<User>('/api/users/42');` → `http$.subscribe(subject$);`. A/B (firstName/lastName) subskrybują Subject od READY; trzecia instrukcja podłącza jedno HTTP i rozsyła User oraz complete do A/B. Dopiero po complete następny krok dodaje city: późny C dostaje samo complete, bez danych i nowego requestu. |
| 05-zrodla-4 | `const subject$ = new Subject<number>();` i `const connection = interval(1000).subscribe(subject$);`. Start już działający: interval → Subject → A/B/C; kolejne „dalej” to `subA/subB/subC.unsubscribe()`, a interval emituje dalej do Subjecta bez odbiorców; ostatnie „dalej” wywołuje `connection.unsubscribe()` i zatrzymuje interval (Subject bez complete). |

Cała rodzina ma wygląd torów jak w `04a-dwa-tory` (nagłówek = definicja, wiersz = wykonanie, porty, kulki w wierszu odbiorcy, płaskie kafelki) i te same chwilowe napisy `.subscribe()` z badge'em toru, widoczne od pojawienia się odbiorcy do dotarcia subskrypcji do źródła (w HTTP zostają na postoju subscribed i gasną, gdy rusza request). W interval `.unsubscribe()` A pojawia się pod wierszem odbiorcy, bo rezygnacja zaczyna się przy nim. W Subject jedyny napis to migawka `httpGet<User>('/api/users/42').subscribe(subject$)` z badge'em `#1`, wyśrodkowana nad diagramem. HTTP ma postęp tylko w wierszu A pod HTTP GET (od zestawionej subskrypcji do odpowiedzi); odbiorca czeka, potem trzyma kulkę „dane” w swoim wierszu. Diagram używa harmonogramu: pojawienie odbiorcy w 1 s, subscribe 1,3–2,1 s, odpowiedź 7–7,8 s, complete 8,3–9,1 s, cisza do 9,9 s. Kod i widoczność cofają się razem. Postęp jest symulacją oczekiwania, nie procentem odpowiedzi sieciowej.

interval: kafelek `interval` (340/420, wymiary jak Subject — ręczna emisja) z wierszami wykonań A i B → odbiorcy A/B (910/400). Najpierw zwykły postój subscribe, potem slajd jest wyjątkiem od postojów: emisje trwają tak długo, jak prelegent chce (liczniki „Emisje A/B” rosną bez ograniczeń, w wierszu odbiorcy zostają 3 ostatnie kulki). Kolejne „dalej” to akcje: B dołącza (interval jest cold — nowe wykonanie od 0, A liczy dalej, „Wykonania interval” 2), potem `.unsubscribe()` A i `.unsubscribe()` B: wartość już wysłana dociera, potem szary pocisk „×” jedzie od odbiorcy do interval, wiersz szarzeje, wykonanie przestaje emitować; nie ma zielonego complete. Migawki stoją w jednym miejscu nad diagramem — każda do następnej akcji, ostatnia do końca. AUTO ani pauza nie wykonują akcji same. Lewo cofa ostatnią akcję, potem emisje, subscribe i READY; wyjście ze slajdu sprząta wykonania, a powrót startuje od READY. Druk pokazuje oba wykonania anulowane.

**Subject — ręczna emisja (`05-zrodla-5`) — 60–75 sekund.** Slajd techniczny zaraz po interval i bezpośrednio przed „Subject: ręczny multicast HTTP”. Pokazuje, że Subject można subskrybować, samodzielnie emitować do niego wartości i ręcznie go zakończyć — oraz że Subject jest hot: późny subskrybent nie otrzymuje wcześniejszych wartości. Po complete() nowy odbiorca dostaje natychmiast tylko complete, a kolejne next() nie wznawia emisji. Subject nie jest podłączony do zewnętrznego źródła (bez connection i upstreamu).

Kod demonstracji (na slajdzie stale tylko pierwsza linia; pozostałe wywołania to migawki nad diagramem, x 620, y top/2, size 34 — subscribe i next widoczne do swojego postoju; `complete()` gaśnie przed pojawieniem się C, ignorowane `next(3)` zostaje do końca):

```ts
const subject$ = new Subject<number>();

subject$.subscribe(observerA);
subject$.next(1);
subject$.subscribe(observerB);
subject$.next(2);
subject$.complete();
subject$.subscribe(observerC); // natychmiast complete, bez next
subject$.next(3); // ignorowane — Subject jest zakończony
```

Fragment `new Subject<number>()` świeci od każdego ręcznego next do wyjścia powiadomień i od complete() do jego wysłania. Diagram Subject → A/B/C w wyglądzie torów: kafelek `Subject` x/w 340/420 (jak interval; wiersze rosną z subskrypcjami), kompaktowi odbiorcy A/B/C 910/400 (jak odbiorca interval) (inbox, litera, do dwóch kulek r 34/font 30), top 178/102, viewBox 1240×612/460, płaskie kafelki, liczniki rx-lanes (Odbiorcy, Emisje next). Odbiorca pojawia się dopiero tuż przed swoim subscribe; w READY nie ma pustych prostokątów A/B/C. A i B zachowują dotychczasowe położenie; C zajmuje trzeci tor. Bez HTTP, innych operatorów, legendy i dodatkowych paneli.

| Nr | Checkpoint | Na ekranie |
| --- | --- | --- |
| 0 | READY | Tylko kafelek `Subject`; Odbiorcy 0, Emisje next 0. |
| 1 | subscribed-a | Pojawia się A i od razu subskrybuje; migawka `subject$.subscribe(observerA)` widoczna na pauzie (gaśnie po wznowieniu), kabel rośnie od A do Subjecta, w Subject powstaje wiersz A. A czeka. |
| 2 | emit-1 | Migawka `subject$.next(1)`; kulka 1 pojawia się w wierszu A Subjecta i stoi. |
| 3 | next-1 | Kulka 1 dojechała do A, migawka zgasła. B jeszcze nie istnieje. |
| 4 | subscribed-b | Pojawia się B i od razu subskrybuje; migawka `subject$.subscribe(observerB)` na pauzie, wiersz B w Subject. B ma pusty inbox, A zachowuje 1 — pytanie do sali, czy B dostanie 1. |
| 5 | emit-2 | Migawka `subject$.next(2)`; kulka 2 startuje ze środka Subjecta, rozchodzi się do wyjść A i B i staje na portach. |
| 6 | next-2 | Dwójka dotarła do A i B, migawka zgasła. A: 1, 2; B: 2. |
| 7 | complete | Zielona migawka `subject$.complete()` (gaśnie przed C); zielony impuls do A i B, wiersze Subject, A i B przechodzą w ✓ complete (tło i tekst), historie zostają, Odbiorcy 0. Bez unsubscribe i error. |
| 8 | subscribed-c | Po zakończeniu A i B pojawia się C; `subject$.subscribe(observerC)` i impuls od C do Subjecta. Subject natychmiast wysyła complete do C (zielony impuls), bez next i bez historii. C: pusty inbox, ✓ complete. A i B bez zmian, Odbiorcy stale 0. |
| 9 | next-ignored | Migawka `subject$.next(3)`, bez kulek i bez zmiany historii lub statusów. Zakończony Subject już nie emituje. Odbiorcy 0, Emisje next nadal 2. |
| 10 | FINISHED | Podpis „A: 1, 2, complete. B: 2, complete. C: tylko complete. Subject nie odtwarza historii; po complete nie emituje”. |

Harmonogram (czas ilustracji = czas modelu): A pojawia się 0,3 s, subscribe 0,6 s (zestawienie 1 s), next(1) 2,3 s (postój emit-1 2,8; rozesłanie 3,5, dotarcie 4,9), B pojawia się 5,5 s, subscribe 5,8 s, next(2) 7,5 s (rozejście do portów 8,1–8,7 = postój emit-2, dotarcie 10,1), complete 10,8 s (wysłanie 11,4, dotarcie 12,6), C pojawia się 13,7 s, subscribe 14 s → zestawienie i natychmiastowe complete 15 s → dotarcie 16,2 s (postój 16,7), ignorowane next(3) 17,5 s (postój 18), podsumowanie 19,2 s, koniec 20,2 s. Cofanie przed subscribe B/C usuwa odpowiedniego odbiorcę razem z jego wierszem; historia B nigdy nie pojawia się przed subskrypcją, C zawsze ma pustą historię. Wydłużenie przelotu complete służy ilustracji — Subject nie czeka i nie otwiera ponownie emisji.

| Nr | Checkpoint | Notatka prelegenta |
| --- | --- | --- |
| 0 | READY | Interval sam produkował kolejne liczby. A co, jeśli chcielibyśmy sami decydować, kiedy pojawi się następna wartość? |
| 1 | subscribed-a | Subject jest jednocześnie Observable, które można subskrybować, i Observerem, któremu możemy przekazywać wartości. Najpierw korzystamy z pierwszej roli: A subskrybuje. |
| 2 | emit-1 | Teraz druga rola Subjecta: sami wywołujemy next(1). Komu Subject przekaże tę wartość? |
| 3 | next-1 | Subject rozsyła wartość do aktualnych odbiorców — na razie jest tylko A. |
| 4 | subscribed-b | Teraz pojawia się drugi odbiorca. Jak myślicie, czy dostanie jedynkę, którą Subject wyemitował wcześniej? |
| 5 | emit-2 | Wywołujemy next(2): jedna wartość rozchodzi się na powiadomienia do A i B. |
| 6 | next-2 | Nie. Subject nie odtwarza wcześniejszych wartości. B dostaje dopiero dwójkę, podczas gdy A otrzymał zarówno jedynkę, jak i dwójkę. |
| 7 | complete | Teraz ręcznie kończymy Subject. Complete trafia do wszystkich odbiorców i zamyka ich subskrypcje. Nie musimy już osobno wywoływać unsubscribe. |
| 8 | subscribed-c | C subskrybuje zakończony Subject: dostaje od razu complete, bez wartości next. A i B bez zmian, Odbiorcy stale 0. |
| 9 | next-ignored | subject$.next(3) nic nie emituje. Zakończonego Subjecta nie można wznowić kolejnym next. |
| 10 | FINISHED / podsumowanie | Subject jest przykładem hot Observable — rozsyła emisje do aktualnych subskrybentów. Nowy odbiorca nie dostaje historii; po complete dostaje tylko complete. Przed chwilą wywoływaliśmy next i complete ręcznie. A jeśli te powiadomienia przyjdą z HTTP? Czy Subject może rozesłać wynik jednego requestu do kilku odbiorców? Prawo: „Subject: ręczny multicast HTTP”. |

**Subject: ręczny multicast HTTP — 60–75 sekund.** Bezpośrednio po „Subject — ręczna emisja”, przed „Subject — kto odłączy źródło?”; odpowiedź na wcześniejszy problem Cold. Te same pola widoku A/B/C (`user.firstName` → Paweł, `user.lastName` → Kondraciuk, `user.city` → Białystok; ten sam wygląd, rozmiar, kolory i kulka `{…}`), ale jeden request zasila je przez Subject. Kod rośnie etapami w tym samym rendererze, z tą samą lewą krawędzią, fontem i interlinią:

```ts
const subject$ = new Subject<User>();
const http$ = httpGet<User>('/api/users/42');

http$.subscribe(subject$);
```

Wyróżnienia jak na share(): `new Subject<User>()` — jasnofioletowe tło i fioletowe podkreślenie (świeci mocniej, gdy Subject rozsyła next i complete), `httpGet<User>('/api/users/42')` — jasnoturkusowe tło i turkusowe podkreślenie (świeci podczas odpowiedzi). `.subscribe(subject$)` ma zwykłe kolorowanie składni i tylko chwilowy akcent w kolorze impulsu subskrypcji (turkus toru `#1`), od pojawienia się linii do chwili po zestawieniu subskrypcji. Miejsce na wszystkie linie jest zarezerwowane od READY (klasa `rx-code-steps`: pierwsza linia stoi tam, gdzie zwykła jednoliniowa, kolejne w pustym pasie nad kafelkami), więc nowe linie nie przesuwają diagramu. Subject jest Observable dla A/B/C i Observerem dla HTTP.

Diagram HTTP GET → Subject → pola A/B, z miejscem na późnego C (HTTP 177/230, Subject 517/230, pola 960/460). READY: tylko firstName i lastName, dwa aktywne połączenia do Subjecta, puste pola, Odbiorcy 2 i Requesty HTTP 0. Pole city oraz jego porty i połączenie są ukryte. Geometria rezerwuje miejsce od początku.

| Krok | Checkpoint | Stan |
| --- | --- | --- |
| 1 | defined | Definicja http$ i sam nagłówek HTTP GET, bez wykonania. |
| 2 | multicast | Dopisane http$.subscribe(subject$), impuls subscribe i jeden request HTTP bez postoju; jeden User rozdziela się na dwie identyczne kulki do A/B. |
| 3 | complete | A: Paweł, B: Kondraciuk; oba pola z complete. HTTP i Subject zakończone, 0 odbiorców. City nadal nie ma. |
| 4 | subscribed-c | Dopiero teraz pojawia się user.city; C subskrybuje zakończony Subject. Dostaje samo complete, bez wartości i bez nowego requestu. Pole pozostaje puste z ✓ complete. |
| 5 | FINISHED | A/B zachowują dane i statusy, C ma tylko complete; 1 request, 0 aktywnych odbiorców. |

MANUAL zatrzymuje się po każdym z czterech etapów (bez postoju podczas subscribe i requestu); następny krok po complete dodaje city i pokazuje subscribe oraz natychmiastowe complete. AUTO odtwarza tę samą kolejność. Subject nie odtwarza historii i nie uruchamia HTTP po późnej subskrypcji. Jeden next z HTTP trafia tylko do A/B. Późny C pozostaje poza licznikiem aktywnych odbiorców zakończonego Subjecta. Notatki READY, każdego checkpointu i FINISHED są w index.html; po podsumowaniu przechodzimy do Subject + interval.

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

**MAIN — zaraz po HTTP (`05-zrodla-2`), przed Cold.** Uproszczony środek `httpGet(url)` — tylko tyle:

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

**Na bloczkach:** id$ → map → concatAll → odbiorca S1, wszystkie definicje oraz S1 widoczne od wejścia. Proste wprowadzenie: źródło emituje A, a po complete innera #1 także B. map tworzy zimne Observable A$ / B$ przy tym samym logicalAt co wartość wejścia. Na dole powstaje pipeline #1 → A$ → HTTP GET → inner #1, a po emisji B — #2 → B$ → HTTP GET → inner #2. B przychodzi, gdy nic nie pracuje, więc nie ma kolejki ani placeholderów — kolejkowanie pokazuje dopiero concatMap. Drugi request pokazuje, że dopóki źródło nie wyśle complete, mogą przychodzić kolejne wartości i kolejne requesty.

**Widok początkowy i osiem ręcznych kroków:**

| Krok | Checkpoint | Stan na postoju |
| --- | --- | --- |
| 1 | READY | Wszystkie górne kafelki i S1, bez połączeń i requestów. |
| 2 | `first` | Subskrypcja, emisja A i projekcja w jednym kroku. A$ stoi na środku map, przed concatAll; panel innerów pusty, liczniki 0/0. |
| 3 | `created` | map przekazał A$ do concatAll. Pełny dolny pipeline #1 jest widoczny, ale pozostaje idle: bez kabla, portów i postępu; liczniki 0/0 — HTTP jeszcze nie wystartowało (pauza ręczna). |
| 4 | `active` | concatAll subskrybuje A$: inner #1 subskrybuje HTTP GET i rusza HTTP #1; liczniki 1/1, odpowiedź jeszcze nie wysłana. |
| 5 | `received` | Odpowiedź A przechodzi przez inner #1 i concatAll do S1; HTTP jeszcze bez complete. |
| 6 | `complete-a` | HTTP #1 kończy inner #1 przez complete; główny tor nadal aktywny (id$ jeszcze trwa); liczniki 1/0. |
| 7 | `active-b` | id$ nadal bez complete: emisja B → B$ w map → concatAll subskrybuje B$, rusza HTTP #2; liczniki 2/1. |
| 8 | `complete-b` | Wynik B dociera do S1 (A, B), HTTP #2 kończy inner #2; S1 nadal czeka na id$; liczniki 2/0. |
| 9 | `complete` | Complete id$ przez map i concatAll do S1 — źródło zakończone, żaden inner nie jest aktywny; FINISHED. |

Każde prawo uruchamia kolejny etap; ponowne prawo podczas ruchu kończy bieżący etap. Po kroku 9 kolejne prawo zmienia slajd, bez dodatkowego przekazania do AUTO. Lewo i R przywracają deterministycznie poprzedni checkpoint i READY. AUTO odtwarza cały przebieg, druk pokazuje finał. Tempo tego slajdu: subscribe i complete 0,4 s na odcinek, przelot i projekcja 0,6 s, praca HTTP 0,8 s, pojawienie się wiersza 0,3 s. Postoje zatrzymują wyłącznie ilustrację.

**Wniosek w FINISHED:** „map tworzy Observable, concatAll je subskrybuje. id$ i oba innery zakończone — S1 dostaje complete.” Liczniki: „Innery uruchomione” = 2, „Aktywne” = 0.

**Speaker notes:** osobne notatki dla READY, ośmiu checkpointów i FINISHED w `template[data-checkpoint-notes="08-map-strumienie"]`. Wyjaśniają tworzenie Observable bez requestu, subskrypcję uruchamiającą HTTP, rozdzielenie next i complete oraz to, że po complete innera #1 źródło może emitować dalej (B → HTTP #2), dopóki samo nie wyśle complete. Przejście: co, jeśli kolejna wartość przyjdzie podczas trwającego HTTP? Kolejkowanie pokaże concatMap. Na oba przykłady około 3 minut.

### Wspólny problem 09–12: A pracuje, przychodzi B

Cztery slajdy pokazują identyczną sytuację i zmieniają wyłącznie operator. Kod: `id$.pipe(<operator>(id => httpGet(url(id))))`. Te same wejścia, kolory i tempo: A w 0,6 s uruchamia długi HTTP (3 s), B przychodzi w 2,1 s (A w połowie, HTTP B 1,2 s), C w 5,2 s — po zakończeniu A (HTTP C 1,2 s); id$ kończy się w 5,6 s. Wyjątek: switchMap ma krótszy finał — C w 4,1 s (po zakończeniu B), id$ kończy się w 4,5 s, a przeloty i terminale końcówki trwają 0,5 s. Kolory prac: A indygo #6D4CD3, B pomarańcz #B85D05, C niebieski #087FAD.

Góra bez zmian: id$ → operator → kompaktowy Odbiorca, jeden główny tor S1 (nie powstaje nowa subskrypcja główna dla wartości). Dół (pod poziomym separatorem, bez napisu): maksymalnie trzy sloty (A, B, C) o stałej wysokości. **Każde uruchomione inner Observable to osobna instancja HTTP GET z własną wewnętrzną subskrypcją**, wyglądająca jak znany z prezentacji pipeline `HTTP GET → inner subscriber`: standardowy kafelek z turkusowym nagłówkiem HTTP GET i jednym execution lane pod nim, zaczynający się przy lewej krawędzi; lane ma nazwę jak tory u góry — pasek koloru pracy i `#1 · A` w tym kolorze — a za nazwą postęp i stan tekstem (długości jak w catchError wewnątrz), po prawej kabel z portami do pełnego inner subscribera (lane jak odbiorca główny: ikona, „inner #n”, wartość, status). complete — jasnozielone lane, anulowanie — szare, error — jasnoczerwone. Wartość bez inner (oczekuje „?”, „w kolejce”, „pominięte”) ma tylko pasek z nazwą `#2 · B` i neutralny placeholder w miejscu reszty lane — bez nagłówka HTTP GET, progressu, portów, kabla i inner subscribera. Po starcie pracy placeholder przechodzi w pełny kafelek w tym samym slocie; „pominięte” nigdy. Ten sam układ mają `08-map-strumienie`, `11a-distinct-switchmap` oraz slajdy catchError na zewnątrz i w wyszukiwarce; w wyszukiwarce każdy rząd to `HTTP GET ── catchError ── inbox`.

**Wspólny postój `question`:** S1 aktywne, HTTP A pracuje (pasek ok. 46% — identyczny na czterech slajdach), kulka B czeka na porcie wejścia operatora, a #2 · B ma tylko identyfikator i znak „?”: bez „w kolejce”, „pominięte”, projekcji, kafelka HTTP GET, inner subscribera, portów i progressu. Następne „dalej” (osobny ręczny postój `answer`) dopiero uruchamia reakcję operatora; AUTO włącza się po odpowiedzi.

**Tytuł bez spoilera:** do postoju `question` tytuł pokazuje samą nazwę operatora (np. „concatMap”). Podtytuł po myślniku („Po kolei”, „Równocześnie”, „Najnowsza subskrypcja”, „Jestem zajęty”) pojawia się (fade 0,4 s), gdy animacja ruszy dalej od pytania; cofnięcie do pytania znowu go ukrywa. Druk, F i FINISHED pokazują pełny tytuł. Miejsce na podtytuł jest zarezerwowane, więc nazwa się nie przesuwa.

**Subskrypcja główna:** wszystkie cztery slajdy zaczynają w READY od zestawionego S1 (bez animacji subscribe). concatMap pokazuje osobno emisję A (projekcja) i start HTTP A; mergeMap, switchMap i exhaustMap jednym „dalej” prowadzą przez emisję A, start HTTP A i dotarcie B wprost do pytania.

### concatMap — `09-concatmap`

**Temat:** obsługa pracy po kolei.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 09-concatmap | concatMap — Po kolei | `id$.pipe(concatMap(id => httpGet(url(id))))` |

**Na bloczkach:** S1 zasubskrybowany od READY; postoje first (A dociera, projekcja), active (inner A subskrybowany, HTTP A startuje), question, answer. Odpowiedź: #2 · B przechodzi w „w kolejce” (przerywany placeholder) — wartość bez projekcji, inner, kafelka HTTP GET i inner subscribera. Po complete A placeholder płynnie zmienia się w nowy kafelek HTTP GET B z własnym inner subscriberem w tym samym slocie: projekcja, subskrypcja, progress. B kończy się przed przyjściem C (4,8 s vs 5,2 s modelu), więc C trafia na pustą kolejkę i od razu dostaje swój HTTP; gdyby przyszło w trakcie B, czekałoby w kolejce. Wynik A, B, C.

**Speaker notes (per checkpoint, szablon `data-checkpoint-notes`):**

- **Start:** Operatory, które dla każdej wartości mogą uruchomić osobną pracę. Projekcja zwraca Observable, operator decyduje, kiedy go zasubskrybować.
- **READY / A / HTTP A:** jedna główna subskrypcja S1, zestawiona już w READY; projekcja tylko tworzy Observable (własny kafelek HTTP GET), request rusza dopiero, gdy inner subscriber — go zasubskrybuje.
- **A pracuje, przychodzi B:** Uruchomimy drugi request czy poczekamy?
- **Odpowiedź:** concatMap kolejkowuje B. Dopóki A się nie skończy, nie wywołujemy nawet projekcji dla B.
- **Wynik:** Kolejność zachowana, kolejka zwiększa opóźnienie.
- **Zastosowanie (tylko w notatkach):** kolejkowanie zapisów, gdy kolejność jest ważna (np. autosave formularza).

### mergeMap — `10-mergemap`

**Temat:** równoległe wykonania strumieni wewnętrznych.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 10-mergemap | mergeMap — Równocześnie | `id$.pipe(mergeMap(id => httpGet(url(id))))` |

**Na bloczkach:** READY z zestawionym S1, postoje question, answer i c-result. Odpowiedź: projekcja B i druga, osobna instancja HTTP GET z własnym inner subscriberem równolegle z A (dwa kafelki „w trakcie”, licznik aktywne 2). Krótszy HTTP B kończy przed A: odbiorca dostaje B, A, C w kolejności nadejścia. Każdy inner najpierw dostarcza wynik do S1, a dopiero potem (osobny kadr, `timing.valueTerminalGap` 0,5 s) kończy się complete. Postój c-result: wynik C u S1, inner C jeszcze w toku, S1 bez complete (id$ już zakończone). Kolejne „dalej”: complete inner C, a po nim (przerwa `timing.terminalGap` 0,4 s) complete S1.

**Speaker notes:**

- **Wprowadzenie:** Identyczna sytuacja: A pracuje i pojawia się B, ale tym razem mamy mergeMap.
- **Pytanie:** Czy naprawdę musimy czekać na zakończenie A?
- **Odpowiedź:** Nie. mergeMap uruchamia oba wewnętrzne Observable równolegle. Wyniki mogą wracać w dowolnej kolejności.
- **Wynik C:** każdy inner najpierw dostarcza wynik, potem complete; globalne complete dopiero po zakończeniu id$ i wszystkich innerów.
- **Zastosowanie (tylko w notatkach):** niezależne, równoległe requesty HTTP (np. szczegóły kilku produktów naraz).

### switchMap — `11-switchmap`

**Temat:** nowa wartość zastępuje poprzednią subskrypcję wewnętrzną.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 11-switchmap | switchMap — Najnowsza subskrypcja | `id$.pipe(switchMap(id => httpGet(url(id))))` |

**Na bloczkach:** READY z zestawionym S1, postoje question, answer, started. Odpowiedź: szary impuls × jedzie od inner subscribera #1 po kablu do HTTP GET A — teardown wewnętrznej subskrypcji A (inner subscriber szarzeje od razu); po jego dotarciu lane #1 · A jest „anulowane” (szary, zatrzymany pasek, bez impulsu complete i bez odpowiedzi) i zostaje widoczne do końca. Górny tor S1 pozostaje aktywny. Potem projekcja B: nowy kafelek HTTP GET B z inner subscriberem (postój started); dalej szybszy finał (przeloty i terminale 0,5 s, C zaraz po B): wynik B, potem C, complete. Cała scena ok. 17,8 s zamiast 22 s.

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
- **Przejście:** „Znamy już cztery sposoby obsługi kolejnych requestów. Zbudujmy teraz wyszukiwarkę i zobaczmy, które operatory rzeczywiście są nam potrzebne.” (to samo zdanie otwiera notatki `12-intro-wyszukiwarka`).

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

**Przebieg:** szybkie pisanie r → re → rea, trzy emisje query$ i trzy requesty. Zmiany co 0,9 s anulują HTTP #1 i #2 (szary × i „anulowane”); HTTP #3 pracuje 2 s, dostarcza wynik [#3] do głównego odbiorcy i kończy inner zielonym complete. Po 0,2 s od zakończenia ilustracja zatrzymuje się automatycznie. Input pozostaje rea, liczniki 3/3/0; nie ma kasowania frazy ani czwartego requestu. Główny pipeline pozostaje aktywny — pauza animacji nie emituje complete ani unsubscribe.

Frazy lecą w badge’ach ze slajdu źródła query$: stały font 30, szerokość dopasowana do tekstu. HTTP #3 emituje tablicę `[#3]`, która trafia do inner subscribera i głównego odbiorcy. Fraza pozostaje etykietą wejścia requestu.

Pod separatorem trzy pełne wiersze HTTP GET → inner subscriber; wszystkie pozostają widoczne w końcowym kadrze. Anulowane nie emitują wyniku ani complete. Liczniki „wejścia” i „requesty HTTP” dochodzą do 3, a „aktywne” do 0; aktywne ≤ 1.

**Stopka:** Każde nowe query może przerwać poprzedni request i uruchomić nowy.

**Sterowanie i notatki:** READY daje chwilę na odpowiedź sali. Pierwsze dalej odsłania operator i uruchamia pokaz do automatycznego postoju. Szybkie dalej kończy animację na tym samym slajdzie; dopiero dalej z końcowego kadru zmienia slajd. Spacja pauzuje/wznawia, R i powrót przywracają pytanie. Lewo wraca do źródła query$. Notatki `ready`, `revealed`, `finished` opisują pytanie, pokaz i nieruchomy kadr (#1/#2 cancelled, #3 completed, 3/3/0, tablica [#3], input rea); ostatni ma własny fragment Reveal. Druk, F i Upcoming pokazują ten sam wynik. Anulowanie klienta nie cofa operacji na serwerze. Następny krok: poczekać 300 ms ciszy dzięki debounceTime.

### debounceTime — czekamy na ciszę — `12b-debounce-switchmap`

**MAIN — bezpośrednio po switchMap na żywo, przed distinctUntilChanged.** Drugi etap projektowania wyszukiwarki.

```ts
query$.pipe(
  debounceTime(300),
  switchMap(query => httpGet(url(query))))
```

**Na ekranie:** mniejszy serifowy tytuł wysoko, trzy linie kodu i pipeline query$ → debounceTime → switchMap → odbiorca z ikoną inbox, bez etykiety S1. Wspólny input i badge fraz ze źródła query$, tablice wyników z numerami HTTP (np. [#1]). Kod i odpowiadające mu bloczki podświetlają się razem. Timer pokazuje pozostały czas tylko podczas odliczania; poza nim nie ma kreski. Stała geometria i maksymalnie trzy ostatnie pełne wiersze HTTP GET → inner, bez placeholderów.

**Przebieg (powtórki):** serie r/re/rea → re/r/re/rea (skasowanie a, e i dopisanie ich w tym samym oknie) → re/r/pusty/a/an/ang → an/ang (skasowanie i dopisanie g). debounceTime przepuszcza kolejno rea, rea, ang, ang — każda emisja to nowy HTTP dla tej samej frazy, bo debounceTime nie porównuje wartości (to zadanie distinctUntilChanged na następnym slajdzie). Potem cykl an/a/pusty/r/re/rea → re/r/re/rea → … → an/ang, bez końca. **Anulowanie przez debounce:** HTTP #1 dla rea trwa dłużej (6 s); w trakcie użytkownik kasuje i dopisuje e, a. HTTP #1 nadal działa, dopóki debounceTime czeka na 300 ms ciszy — samo naciśnięcie klawisza nie przerywa requestu. Dopiero gdy debounceTime wyemituje ponownie rea, switchMap odsubskrybowuje HTTP #1 (szary ×, pasek zatrzymany, „anulowane”, bez wyniku i complete) i po 0,4 s tworzy HTTP #2 dla tej samej frazy rea. Ten sam przypadek powtarza się w każdym cyklu. Każda zmiana emituje wejście; pośrednie wartości zostają zastąpione przed ciszą. Litery co 100 ms modelu, debounce 300 ms; ilustracja 5× wolniejsza (0,5 s / 1,5 s), z osobnymi przelotami. Każda zmiana resetuje timer. Sama cisza bez nowej zmiany nie powtarza emisji.

Kolejne pisanie zaczyna się 1 s po uruchomieniu poprzedniego HTTP. Pozostałe requesty trwają 2 s i zdążą dostarczyć wynik oraz complete inner przed kolejną emisją debounce. Bez error; jedyne unsubscribe innera to anulowanie długiego rea przez ponowne rea. Główna subskrypcja pozostaje aktywna. Numery requestów, wyniki [#N] i liczniki rosną przez kolejne cykle bez resetu.

**Sterowanie:** READY ma już całą subskrypcję, bez requestu; pierwsze prawo uruchamia wpisywanie. Postoje buffered, request-1, typing, switched, complete-2. Postój typing (ręczna pauza): ponownie wpisane rea w pamięci debounceTime, timer odlicza, HTTP #1 rea nadal trwa — pytanie, czy klawisz już przerwał request. switched: debounceTime wyemitował znowu rea, HTTP #1 anulowany, HTTP #2 (rea) zestawiony. complete-2: wynik [#2] i complete. Następne prawo uruchamia ciągły pokaz (request-3, HTTP #3 dla ang): od tej chwili nie ma dalszych postojów. Ponowne prawo w trakcie przejścia kończy wprowadzenie i zaczyna emisje. Prawo podczas ciągłych emisji od razu zmienia slajd, także przy pauzie. Lewo cofa do complete-2, Spacja pauzuje/wznawia, R i ponowne wejście resetują do zatrzymanego READY. AUTO może odtworzyć całe wprowadzenie bez postojów i kontynuuje bez końca. F, druk i Upcoming pokazują nieruchomy kadr: #1 rea anulowany, #2 rea i #3 ang zakończone, input ang (po skasowaniu i dopisaniu g) w pamięci debounceTime z odliczaniem, wynik [#3], liczniki 15/3/0. Notatki per checkpoint, request-3 opisuje cały pokaz ciągły.

**Stopka:** debounceTime przepuszcza wartość dopiero po chwili ciszy. Samo naciśnięcie klawisza nie przerywa requestu.

### distinctUntilChanged — znowu to samo? — `11a-distinct-switchmap`

**MAIN — bezpośrednio po debounceTime + switchMap.** Kontynuujemy tę samą wyszukiwarkę. distinctUntilChanged jest widoczny od wejścia i od razu pokazujemy jego działanie: pamięta jedną wartość — ostatnią wyemitowaną — a nie całą historię. Następny slajd (`11b-catcherror-search`) pokazuje ten sam pipeline z catchError wewnątrz switchMap.

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

1. `first`: r → re → rea → reac → react; react przechodzi przez debounce i distinct, HTTP #1 dostarcza wynik i complete inner. Pauza: 5 zmian inputa / 5 wejść query$ / 1 emisja debounce / 1 request / 0 aktywnych.
2. `duplicate`: szybkie skasowanie ostatniej litery i dopisanie t (reac → react w < 300 ms). Wpisane: react, reac, react; wyszły z debounceTime: react, react — środkowe reac zastąpione w pamięci debounce. distinct porównuje react z ostatnim wyemitowanym react i odrzuca duplikat: w wierszu distinctUntilChanged widać obok siebie przygaszoną odrzucaną kulkę react i kulkę pamięci react, podpis „duplikat”. Bez nowego HTTP i anulowania. Pauza: 7 / 7 / 2 / 1 / 0.
3. `successes`: vue i ang przechodzą. Wszystkie trzy HTTP (react, vue, ang) kończą się sukcesem i complete inner, główny pipeline działa. Pauza: 15 / 15 / 4 / 3 / 0.
4. `request-error`: pusty → r → re → rea → reac → react. Znowu react przechodzi, bo ostatnio wyemitowano ang (distinct pamięta tylko ostatnią). HTTP #4 już pracuje, jeszcze bez błędu. Pauza: 21 / 21 / 5 / 4 / 1. Pasek i request stoją do kolejnej strzałki.
5. `error`: HTTP #4 emituje error 500. Błąd idzie przez switchMap do odbiorcy; szary teardown odłącza distinct, debounce i query$. Ten HTTP i główny pipeline bez complete. Pauza po pełnym odłączeniu: input nadal react, 21 / 21 / 5 / 4 / 0, główna subskrypcja zakończona błędem.
6. FINISHED: input kasuje react literami (reac → … → pusty) i wpisuje angular. Zmienia się wyłącznie UI, bez kulek RxJS, timera, wyników i HTTP #5. Liczniki: 33 / 21 / 5 / 4 / 0; wynik [#3] zostaje w czerwonym odbiorcy. W dole zakończone poprawnie #2 i #3 oraz błędny #4.
7. Dopiero kolejna strzałka przechodzi na następny slajd.

Litery co 100 ms i debounce 300 ms modelu, ilustracja 5× wolniejsza. Każdy z pięciu postojów zatrzymuje MANUAL i AUTO dowolnie długo. Szybkie dalej kończy wyłącznie bieżący etap; nie przeskakuje z sukcesów od razu do finału ani na kolejny slajd. Lewo cofa po checkpointach, R i powrót resetują READY, wyjście zatrzymuje zegar. F/druk/podgląd końcowy pokazują angular i martwy pipeline. Notatki: ready, first, duplicate, successes, request-error, error, finished.

**Stopka końcowa:** Jeden nieobsłużony błąd HTTP zakończył całą wyszukiwarkę.

### catchError — wyszukiwarka działa dalej — `11b-catcherror-search`

**MAIN — bezpośrednio po distinctUntilChanged, przed catchError na zewnątrz z kliknięciami.** Ta sama wyszukiwarka, nowa subskrypcja (nie przywracamy tej zamkniętej błędem). Poprzedni slajd pokazał `react → HTTP 500 → error odbiorcy → angular nie działa`; tutaj `react → HTTP 500 → catchError → [] → angular → HTTP 200 → wynik`.

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

1. `request`: główna subskrypcja jest gotowa od READY; wpisanie react literami, 300 ms ciszy, distinct przepuszcza, switchMap tworzy HTTP #1 (subskrypcja przez catchError do httpGet). Pauza w trakcie requestu: 5 wejść / 1 emisja / 1 request / 0 błędów / 1 aktywny.
2. `error`: request kończy się error 500; czerwony impuls (0,8 s) biegnie do catchError. Pauza dokładnie przy jego dotarciu, przed of([]): HTTP #1 czerwony, odbiorca bez błędu, główna subskrypcja aktywna. Liczniki: 5 wejść / 1 emisja / 1 request / 1 błąd / 0 aktywnych.
3. `fallback`: po pauzie 1 s w catchError pojawia się of([]); [] trafia do inner subscribera i przez switchMap do odbiorcy; zastępczy strumień kończy się complete (zielony catchError i ✓ complete innera). HTTP #1 zostaje error 500.
4. `success` (koniec sceny): kasowanie react i wpisanie angular, każda zmiana trafia do query$; debounce i distinct przepuszczają angular, HTTP #2 zwraca [#2], który przechodzi przez catchError bez zmian do odbiorcy; complete HTTP #2 przechodzi przez catchError i kończy inner. Główny pipeline bez error, complete i teardown. Liczniki: 17 / 2 / 2 requesty / 1 błąd / 0 aktywnych, input angular, wynik [#2].
5. Kolejna strzałka przechodzi na następny slajd.

Szybkie dalej kończy wyłącznie bieżący etap, lewo cofa po checkpointach, R i powrót resetują READY. F/druk/podgląd końcowy pokazują finał. Notatki: ready, request, error, fallback, success, finished.

**Stopka końcowa:** Błąd jednego requestu nie musi kończyć całego strumienia.

### catchError — `b04-catcherror`

**Temat:** miejsce obsługi błędu wpływa na kolejne zapytania. W MAIN po wyszukiwarce z lokalną obsługą błędu pokazujemy catchError na zewnątrz, a następnie retry.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| b04-catcherror | catchError na zewnątrz | `klik$.pipe(switchMap(id =>`<br>`  httpGet(url(id))), catchError(() => of([])))` |

**Na bloczkach i w animacji:**

- Na zewnątrz (ten sam design): góra „klik$” → „switchMap” → „catchError” → kompaktowy odbiorca S1 — cztery kafelki z execution lanes, porty i kable toru S1 na jednej wysokości. Pod linią podziału (bez napisu) instancja jak w 09–12: `#1 · A`, turkusowy kafelek HTTP GET z lane (progress na pełną wysokość) i krótki kabel do inner subscribera; bez etapu catchError w dole i bez kontenera.
- Przebieg na zewnątrz (czas modelu): S1 jest już podłączony od READY; klik A w 0,6 s tworzy inner #1 i HTTP A. HTTP trwa 1,8 s (widoczny postęp): w 2,4 s HTTP A emituje error (bez complete): lane HTTP i inner subscriber czerwone (! error), czerwony impuls biegnie do inner subscribera, a potem przez switchMap do zewnętrznego catchError. Po jego dotarciu catchError odłącza pierwotny strumień: szary impuls × od switchMap do klik$, wiersze klik$ i switchMap szare (teardown, bez czerwieni i complete). Następnie w wierszu catchError chwilowo widać `of([])`: catchError subskrybuje Observable zastępczy, kulka [] (kolor S1) wychodzi w 3,1 s, a zielony impuls complete w 3,4 s (catchError i S1 zielone). Klik B w 4,2 s pojawia się w szarym wierszu klik$ i gaśnie: nie dociera do switchMap, nie ma projekcji, inner ani HTTP. Licznik requestów HTTP: 1.
- Postoje na zewnątrz: request (HTTP A w trakcie), http-error (error opuścił HTTP A, switchMap, catchError, klik$ i S1 jeszcze działają), error (błąd w catchError, klik$ nadal podłączony — pauza przed fallbackiem), caught (teardown), fallback, click-b, potem AUTO do podsumowania; terminale 0,7 s, całość ok. 12,2 s ilustracji. Notatki per checkpoint w `template[data-checkpoint-notes="b04-catcherror"]` (start, klik A, błąd HTTP, błąd w catchError, przechwycenie, fallback, kolejne kliknięcie, podsumowanie).

**Speaker notes:**

> Porównaj ten slajd z poprzednią wyszukiwarką: tam catchError obsługiwał błąd pojedynczego HTTP wewnątrz switchMap, więc kolejne zapytanie działało. Tutaj catchError stoi za switchMap. Klik A uruchamia HTTP, a po błędzie catchError odłącza pierwotny strumień (klik$ i switchMap) i subskrybuje of([]). S1 dostaje [] i complete; klik B nie uruchamia HTTP B. Nie sugeruj, że każdy zewnętrzny catchError zawsze kończy wynik: tutaj wynika to z wyboru of([]).
>
> Na zewnątrz (per checkpoint): „Zobaczmy, co się stanie, gdy HTTP zwróci błąd, a catchError znajduje się na zewnątrz switchMap.” → klik A uruchamia HTTP → HTTP zwraca error 500, wewnątrz nie ma catchError → błąd przeszedł przez switchMap do catchError, klik$ nadal podłączony (pytanie: czy kolejne kliknięcia zadziałają?) → „Dopiero tutaj łapie go zewnętrzny catchError. Problem polega na tym, że oryginalny strumień zostaje odsubskrybowany.” → „CatchError przełącza się na zastępcze of([]). Dostajemy pustą tablicę, a potem complete.” → „I teraz klikamy ponownie. Nic się nie dzieje. Nie dlatego, że switchMap zignorował kliknięcie, tylko dlatego, że nie mamy już aktywnej subskrypcji kliknięć.” → „W wyszukiwarce obsłużyliśmy błąd pojedynczego HTTP. CatchError na zewnątrz zastępuje cały strumień po błędzie; tutaj of([]) emituje i kończy wynik. Teraz zobaczmy retry: zamiast zastępować strumień, ponowimy subskrypcję źródła.”

Semantyka zastępowania błędu: [implementacja catchError w RxJS 7.8.2](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/catchError.ts).

## Współdzielenie i zastosowania w UI

### shareReplay: późny odbiorca dostaje wynik — `20-sharereplay-2`

**MAIN — po obu pokazach shareReplay na interval, przed map + concatAll.** Osobny wariant share został połączony ze slajdem `04a-dwa-tory-2`; ID shareReplay pozostaje bez zmian.

HTTP GET → shareReplay(1) → A/B, jedna kieszeń bufora. READY pozostaje nieruchomy. Pierwsze prawo: A subskrybuje → HTTP zwraca 42 do A i bufora → complete → późny B subskrybuje i scena staje (`subscribed-b`, ⏸ pytanie „Co teraz dostanie B?”): subskrypcja B zestawiona, 42 leży w buforze, nic nie leci, bez nowego HTTP. Drugie prawo: 42 powoli wyjeżdża z kieszeni (1,2 s) i leci do B (0,8 s), potem complete. Request trwa około 1 s; przekazanie 42 z HTTP do shareReplay i do A — przeloty 0,6 s, rozdzielenie 0,5 s; terminale 0,4 s. Zostaje jeden request i bufor zakończonego źródła, również przy refCount: true. FINISHED czeka na następne prawo; szybkie prawo podczas ruchu kończy bieżący etap. Notatki: READY, subscribed-b (pytanie) i FINISHED — różnica względem share().

### shareReplay(1): kto zatrzyma interval? — `20a-sharereplay-interval`

**MAIN — między share() + interval (`04a-dwa-tory-3`) a shareReplay z refCount: true na interval (`20b-sharereplay-refcount`). Cel: 45–60 s.** Kod w jednej linii: `interval(1000).pipe(shareReplay(1))`, w tym samym miejscu co jednoliniowy kod share + interval (slajd shareReplay z refCount: true na interval wyrównuje do niej pierwszą z dwóch linii). Wygląd, bufor i animacje identyczne jak na „shareReplay: późny odbiorca dostaje wynik”: kafelek `interval(1000)` z torem `#1`, `shareReplay(1)` z kieszenią „bufor” pod spodem, odbiorcy A/B z inboxami. Każda wartość wjeżdża do wiersza shareReplay(1) i rozdziela się: kulka do odbiorcy i kulka do bufora; bez odbiorców jedzie tylko do bufora. Późny odbiorca dostaje najpierw kulkę wyjeżdżającą z kieszeni, potem kolejne na żywo. Liczniki Odbiorcy i Upstream.

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

Ta sama scena interval i bufor ostatniej wartości. Kod ma dwie linie (zamykający nawias pipe bezpośrednio za shareReplay):

```ts
interval(1000).pipe(
  shareReplay({ bufferSize: 1, refCount: true }))
```

READY: definicje i pusty bufor. Pierwsze prawo podłącza A i uruchamia emisje. Dalej: pauza ilustracji i B z bufora (`subscribed-b`), wznowienie (`resumed`), odłączenie A i potem B (`unsub-all`). **Nowa pauza występuje wyłącznie po B**: obaj odłączeni, Odbiorcy 0 / Upstream 1, bufor pełny, zwykłe aktywne połączenie interval → shareReplay. ❓ SALA: czy interval będzie nadal emitował, czy nastąpi unsubscribe? Kadr jest zamrożony, bez nowych emisji i bez podpowiedzi.

Kolejne prawo (`reset`) pokazuje odpowiedź: reset bufora i × do interval, Odbiorcy 0 / Upstream 0. To rozdzielenie ilustracji synchronicznego resetu RxJS, nie opóźnienie działania operatora. Następnie C zaczyna od 0 w nowym wykonaniu #2 (`subscribed-c`), a jego odejście (`unsub-c`) ponownie czyści bufor i kończy scenę, bez dodatkowej pauzy na pytanie. MANUAL/AUTO zatrzymują się po B; szybkie prawo podczas odłączania jedynie kończy ten etap. Dalej: ta sama konfiguracja na zakończonym HTTP.

### retry — nie udało się? Spróbuj później — `x03-retry-backoff`

**MAIN — bezpośrednio po catchError na zewnątrz, przed czterema operatorami czasowymi.** Kod używa współczesnego API `retry({ count, delay })`: `count: 3` pozwala na trzy ponowienia poza pierwszym wykonaniem, czyli maksymalnie cztery requesty HTTP. Funkcja `delay` zwraca `timer(1000 * 2 ** (retryCount - 1))`, dlatego kolejne odstępy wynoszą 1, 2 i 4 sekundy.

**Na bloczkach:** jeden niezmienny pipeline HTTP GET → retry → pełny odbiorca A, bez dolnego panelu. A jest widoczny i podłączony od READY; subskrybuje tylko raz. Pod jednym niebieskim nagłówkiem HTTP GET rośnie stos wykonań tego samego cold Observable: najnowsze jest zawsze na górze, a wcześniejsze płynnie przesuwają się niżej i pozostają jako historia. Pierwsze trzy wiersze `#1–#3` kończą się czerwonym error; `#4` pokazuje User i complete. Tylko górne wykonanie ma aktywny port i przewód do jednego operatora retry; historyczne wiersze nie mają własnych odbiorców ani przewodów.

Po każdym z trzech błędów czerwony impuls kończy się na retry i nie dociera do A. MANUAL zatrzymuje się przy błędzie; następne prawo uruchamia pełne odliczanie w jedynym lane operatora (`czekam 1,0 s`, `2,0 s`, `4,0 s`) i dopiero po jego zakończeniu nową subskrypcję źródła; ponowne „dalej” w trakcie odliczania kończy etap (skok do nowej subskrypcji), jak na pozostałych slajdach. Wtedy zakończone wiersze przesuwają się o jedną pozycję w dół, a nowa próba pojawia się bezpośrednio pod nagłówkiem HTTP GET. AUTO zachowuje pełne odstępy. W czasie backoff licznik „Aktywne” wynosi 0. Wyjście ze slajdu resetuje scenę i zatrzymuje wspólny RAF.

READY ma A i HTTP #1 już podłączone (0% pracy, 1/1). Checkpointy: error-1, request-2, error-2, request-3, error-3 (pytanie o następne 8 s), request-4, success i summary. Finał: Requesty HTTP 4, Aktywne 0; A otrzymał `next(User) → complete`, bez trzech pośrednich błędów. Notatki przypominają o terminalnym error po wyczerpaniu prób, maksymalnym opóźnieniu, jitterze i ponawianiu wyłącznie odpowiednich błędów przejściowych.

### Cztery operatory, jeden strumień — `16-czas-cztery`

**MAIN — po retry, przed RxJS w liczbach.** Trzy pary na istniejącym slajdzie, w każdej tylko dwa wiersze `source$ → operator → odbiorca`, zasubskrybowane od początku. Źródło nie ma paska postępu. W rundach 1–2 emituje w pętli **ABC · DEF** (A 100, B 180, C 260, D 720, E 820, F 940 ms; cykl 1200 ms, ok. 2,7 min na parę). Można obserwować przebieg, a następnie przejść dalej. Odbiorca pokazuje pięć ostatnich kulek. Timery płyną także podczas przelotów wartości; pauza zatrzymuje cały pokaz.

| Para | Górny wiersz | Dolny wiersz | Stopka |
|---|---|---|---|
| 1 | `debounceTime(300)` | `throttleTime(300)` | Debounce czeka na ciszę. Throttle bierze pierwszą wartość z okna. |
| 2 | `auditTime(300)` | `throttleTime(300)` | Throttle bierze pierwszą. Audit oddaje ostatnią z okna. |
| 3 | `sampleTime(300)` | `throttleTime(300, asyncScheduler, { leading: false, trailing: true })` | Throttle liczy od zdarzenia. Sample działa według własnego zegara. |

Rundy 1–2 zachowują dotychczasowy scenariusz, wygląd i tempo: 300 ms trwa 2 s. Wyniki na cykl (RxJS 7.8.2): debounce C@560, F@1240; throttle domyślny A@100, D@720; audit C@400, F@1020. Debounce restartuje odliczanie przy każdym wejściu; audit tylko podmienia pamięć. Domyślny throttle przepuszcza pierwszą wartość przez wiersz, a pozostałe gasną w czasie blokady.

Runda 3 odtwarza raz wspólny scenariusz **A@350, B@450, C@550, D@1000, E@1100 ms** — źródło rusza dopiero po pierwszym takcie, więc najpierw widać, że sample tyka sam, a throttle stoi. Sample emituje **C@600, E@1200**, a throttle trailing-only **C@650, E@1300**. Obaj odbiorcy dostają C, E, lecz w innych chwilach. 300 ms trwa tu 3 s, więc różnice wynoszą odpowiednio 0,5 i 1 s pokazu. Throttle rozpoczyna okno od zdarzenia, po emisji trailing otwiera kolejne, a po pustym oknie przestaje odliczać (950–1000 ms i po 1600 ms). Sample tyka stale co 300 ms od subskrypcji, również podczas ciszy; bez nowej wartości nie emituje niczego. Zatrzymanie odtwarzacza nie oznacza complete ani unsubscribe.

Sterowanie: READY → prawo uruchamia pętlę pary 1 → prawo (także po pauzie) czyści stan i od razu uruchamia pętlę pary 2 → prawo podczas emisji uruchamia przejście i jednorazową rundę 3 bez dodatkowego kliknięcia. Lewo w trakcie pary resetuje ją do czystego, zatrzymanego postoju (`round-2`/`round-3`); kolejne prawo uruchamia ją od początku. Audit znika, throttle zostaje na dole i dostaje wyróżniony podpis `leading: false, trailing: true`, a sample pojawia się od razu na swoim miejscu. Oba źródła, pamięci, timery i historie zaczynają od zera; emisje startują po przygotowaniu pary. Po rundzie 3 pokaz sam zatrzymuje się (`summary`); następne prawo prowadzi do RxJS w liczbach. AUTO nadal zatrzymuje się na gotowych parach; hash `round-2`/`round-3` pokazuje nieruchomą, wyczyszczoną parę. Spacja pauzuje/wznawia (timery i emisje stoją), R wraca do READY. Druk i F pokazują końcowe C, E u obu odbiorców. Notatki: `ready`, `round-2`, `round-3`, `summary`, `finished`.

### RxJS w prawdziwym kodzie — kto wygrywa? — `24-rxjs-liczby`

**MAIN — po czterech operatorach czasowych, przed „Pytania?”.** Lekki finał części technicznej (60–90 s): ciekawostki z zestawienia rxjs-usage — liczba wywołań w kodzie wybranego zbioru, nie wykonań w runtime i nie ranking całego ekosystemu.

**Na ekranie:** tytuł serif, nagłówek **„Cztery Map. Jeden zdecydowany zwycięzca.”** i płaski wykres poziomy bez osi, siatki i legendy. Paski na wspólnej skali 100% (jasne tło toru = 100%):

| Operator | Wywołania | Udział w czwórce | Kolor |
| --- | ---: | ---: | --- |
| concatMap | 96 | 5,4% | pomarańczowy |
| mergeMap | 251 | 14,0% | niebieski |
| switchMap | 1418 | 79,1% | fiolet |
| exhaustMap | 28 | 1,6% | zielony |

Wiersze od wejścia do finału zachowują kolejność z prezentacji: concatMap → mergeMap → switchMap → exhaustMap. Pierwsze „dalej” odsłania paski i wartości bez przestawiania operatorów według popularności.

Suma 1793; procenty zaokrąglone. Pod wykresem trzy duże liczby bez kart: **4282** `map()` „Najczęściej używany”, **3,7×** `shareReplay vs share` „926 kontra 252”, **1** `concatAll()` „Tylko jedno wywołanie!”. Stopka: „Źródło: analiza wybranego zbioru kodu RxJS · liczba wywołań w kodzie, nie wykonań w runtime”.

| Checkpoint | Na ekranie |
| --- | --- |
| 0 `ready` | Tytuł, nagłówek, nazwy operatorów i puste tory; bez pasków, wartości i liczb. ❓ SALA: który *Map wygrywa? |
| 1 `ranking` | Paski rosną razem (0,6 s), procenty i liczby wywołań pojawiają się (0,3 s). |
| 2 `map` | 4282 · map() (0,3 s). |
| 3 `share-replay` | 3,7× · shareReplay vs share (0,3 s). |
| 4 `concat-all` | 1 · concatAll() (0,3 s). |
| 5 `finished` | Bez zmian na ekranie; notatka końcowa. Następne „dalej” → „Pytania?”. |

MANUAL i AUTO zatrzymują się po każdym odsłonięciu (tempo z pilota); szybkie „dalej” kończy bieżący etap, „wstecz” cofa o etap, wyjście ze slajdu resetuje go. Przy ograniczeniu ruchu odsłonięcia są natychmiastowe. Druk i podgląd Notes pokazują pełny finał.

**Speaker notes:** pytanie o najczęstszy *Map; ranking („prawie 80%…”); map („ponad cztery tysiące wywołań”); shareReplay („niemal cztery razy częściej niż zwykły share”); concatAll („tylko jeden raz”); finał — to konkretny zbiór kodu, nie ranking świata; najważniejsze to rozumieć zachowanie operatorów i umieć wybrać właściwy. Przejście: „Pytania?” — zaproś do pytań i feedbacku.

## Pytania i feedback

### Pytania? — `pytania`

**Ostatni slajd prezentacji.** Duże „Pytania?” (150 px w 4:3, 130 px w 16:9), pod nim czarno-biały kod QR (380/320 px) do [formularza feedbacku na Crossweb](https://crossweb.pl/feedback/aks-lwt/). QR jest również klikalnym linkiem. Na dole cytat z feedbacku jak testimonial: „taki kurczę deep dive bardziej nawet i zajrzenie pod maskę niekiedy” (kursywa, #55515C, 36/30 px), a pod nim podpis „~ Hubert Zub” (#7457D9, 28/24 px), bez ramki, tła i animacji. Bez adresu strony, dodatkowych tekstów, linków do dodatków i dalszych slajdów. Gotowy SVG z białym marginesem znajduje się w `public/feedback-qr.svg` i działa także offline oraz w druku.

**Speaker notes:** zaproś do pytań o przykłady i operatory, poproś o feedback przez QR, przypomnij konkurs WebStorm i podziękuj za udział.

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

Dół: poziomy separator i do trzech wewnętrznych pipeline'ów jeden pod drugim (na wprowadzeniu `08-map-strumienie` dwa wykonania, jedno po drugim). Każde utworzone i subskrybowane inner to pełny rząd: **ID wykonania (#1) → kulka wartości wejścia (A / A$) → HTTP GET (nagłówek + pełny execution lane z postępem i stanem tekstem) → opcjonalny operator (catchError) → inner subscriber** — pełny lane jak odbiorca główny, z ikoną, etykietą „inner #1”, odebraną wartością i statusem (`✓ complete`, `! error`, `× odłączono`). Standardowe kolumny rodziny *Map i catchError są wspólne dla wszystkich wykonań: ID od x 50, kulka, HTTP GET 180–480, catchError 540–780, subscriber 840–1210 (pod odbiorcą głównym); bez operatora kabel HTTP → subscriber jest po prostu dłuższy. Wartość bez utworzonego inner ma ID, kulkę i neutralny placeholder o wysokości lane: „?” (pytanie), „W KOLEJCE” (concatMap — wartość przed projekcją) albo przygaszone „POMINIĘTE” (exhaustMap) — bez HTTP GET, subscribera i portów. switchMap zachowuje cały anulowany pipeline #1 (szary impuls × od subscribera do HTTP, ID szare, `× odłączono`, bez complete). distinctUntilChanged odrzuca duplikaty w górnym operatorze, bez dolnego wiersza; jego wyszukiwarka korzysta z kolumn poprzedniego slajdu debounceTime (ID x 40, kulka x 180, HTTP x 280, subscriber x 720). Nie ma napisu nad pracami, ramki sekcji ani przewodów między poziomami; wynik inner logicznie wraca przez górny operator.

**Kod na wszystkich slajdach** ma subtelne kolorowanie składni (źródła i `httpGet`, operatory RxJS, literały, parametry funkcji, typy, słowa kluczowe) jako osobną warstwę pod pastelowymi wyróżnieniami fragmentów powiązanych z kafelkami; jasne tło i duże fonty bez zmian.

Prototypy QA zachowują poprzednie modele oraz geometrię. Cold/share pozostają bez zmian. Slajdy catchError korzystają z tego samego adaptera z panelem instancji jak 09–12 — w wyszukiwarce każdy rząd to #n → kulka → HTTP GET → catchError → inner subscriber, na zewnątrz #n → kulka → HTTP GET → inner subscriber, a catchError stoi w górnym potoku.

W concatMap B pojawia się jako wartość W KOLEJCE; dopiero po complete poprzednika powstaje B$ i jego subskrypcja. Wprowadzenie map + concatAll pokazuje A$ i jeden udany HTTP, bez kolejki; pierwszy pełny pipeline pojawia się przed wewnętrzną subskrypcją. Wiersze zakończone pozostają zielone; pominięte wejścia exhaustMap nie tworzą wykonań. Kapsułki emisji i odbioru wchodzą przez 0,3 s. Postęp jest wyliczany w czasie ilustracji; w MAIN 08–12 kulka najpierw przechodzi po lokalnym wyjściu do prawej granicy panelu, a potem wychodzi z operatora. Prototypy zachowują krótki, niewidoczny powrót.

Liczniki uruchomionych i aktywnych inner korzystają ze stanu faktycznych subskrypcji. Nawigacja i postoje Reveal rodziny flatteningu pozostają dotychczasowe. Kontroler `stages` działa w podglądzie prototypów oraz w przebudowanym wprowadzeniu (04, wszystkie 05, oba 20). Spacja pauzuje/wznawia także pozostałe animacje, bez zmiany natywnej obsługi statycznego otwarcia. Zachowano identyfikatory i działające demonstracje; kolejność części właściwej odpowiada opisanej wyżej narracji 30–35 minut.

Na migrowanych slajdach diagram zajmuje 480 px wysokości. Większe kafelki mają 76 px wysokości, a odstęp do paneli 60 px; wiersze prac w prototypach są rozdzielone o 20 px, a MAIN 08–12 ma przylegające wiersze nowego panelu. Mniejszy podpis i liczniki są w stopce przy dole slajdu. U pokazuje kontrolki w miejscu stopki; ukrycie kontrolek przywraca podpis.

W `map + concatAll` górny pipeline ma cztery poziome kolumny: id$ → map → concatAll → odbiorca. Kulka A wjeżdża do map i zmienia się w A$ w czasie ilustracji 0,6 s, bez czasowego progressu. Każdy dolny pipeline ujawnia się po dotarciu Observable do concatAll; pierwszy ma osobny postój przed subskrypcją. Tempo 08: subscribe 0,4 s na odcinek, przelot 0,6 s, terminal 0,4 s; pozostałe 09–12: subscribe 0,5 s na odcinek (także subskrypcja inner), przelot 1 s.

W MAIN 08–12 przy complete zielony staje się execution lane, a nagłówek definicji pozostaje pastelowy. Pozostałe migrowane sceny zmieniają tło całego kafelka przy własnym complete. Źródło może zakończyć się wcześniej; *Map pozostaje aktywne aż do zakończenia wymaganych inner i kolejki. Nieobsłużony error daje czerwony operator, a odsubskrybowane źródło zachowuje swój kolor.


Płaski styl kafelków obejmuje 04-operator, całą rodzinę 05-zrodla, 04a-dwa-tory (cold, share, share-interval) oraz slajdy 08–12 (map + concatAll, concatMap, mergeMap, switchMap i exhaustMap): klasa `rx-flat-tiles` w scene.playerClass usuwa obrys i zaokrąglenie głównego prostokąta kafelka. Boksy historii (data-panel-box) w tych slajdach też są płaskie, z ciemniejszym tłem #ECE6DA zamiast ramki. Panel prac 08–12 jest rysowany płasko natywnie. Placeholder kolejki zachowuje przerywany obrys. Geometria, fonty, porty, progress, stany i animacje pozostają bez zmian; pozostałe slajdy nie otrzymują tej klasy.
