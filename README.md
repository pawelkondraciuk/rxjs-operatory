# RxJS — Operatory, które znasz, ale bałeś się zagadać

Polska prezentacja Pawła Kondraciuka o sterowaniu pracą, kolejnością, subskrypcjami i współdzieleniem w RxJS. Podstawowy przykład współdzielenia jest niezależny od frameworka; po nim wspominamy zastosowania w Angularze i React. Otwarcie przypomina historię meet.js Białystok; część techniczna używa animowanych bloczków i wartości.

Ten README jest mapą treści: opisuje slajdy, zawartość bloczków i speaker notes. Implementację animacji, mapę plików i używane API znajdziesz w [AGENTS.md](AGENTS.md).

## Uruchomienie i obsługa

```sh
npm ci
npm run dev
```

Otwórz adres podany przez serwer ze ścieżką `/rxjs-operatory/`. `npm run build` buduje prezentację, `npm run preview` uruchamia podgląd zbudowanej wersji. `S` otwiera widok prelegenta z notatkami, `Esc` widok wszystkich slajdów. Strzałki i Page Up/Page Down obsługują nawigację Reveal.js; fragmenty odsłaniają zdjęcia i listy.

Sceny MAIN z pytaniami zaczynają od nieruchomego READY. Prawo / Page Down uruchamia kolejny postój; lewo cofa. Dopiero następny klik po ostatnim pytaniu uruchamia AUTO na tym samym slajdzie. Automat zatrzymuje się na wyniku FINISHED. U pokazuje dolne sterowanie, A przechodzi z ręcznego do auto lub pauzuje/wznawia auto, M zmienia tryb, [ i ] zmieniają krok, R zaczyna od początku. W AUTO strzałki zmieniają slajdy. Tryb, postój i pauza są pamiętane przy powrocie. EXTRAS domyślnie powtarzają pokaz, z wyjątkiem rodzin mających własne postoje.

Dopisanie `?print-pdf` przed hashem ustawia wszystkie animacje, łącznie z EXTRAS, w końcowych nieruchomych kadrach bez kontrolek.

## Jak czytać spis

Porównania są osobnymi slajdami. Warianty z sufiksami -2/-3/-4 powstają podczas uruchamiania; pierwszy zachowuje ID bazowe. Poniżej podano kolejność MAIN, a dalszy spis opisuje rodziny tematycznie. Pozycje EXTRAS są oznaczone.

Każda pozycja opisuje temat, ekran/bloczki i notatki prelegenta. Tabele wariantów podają rzeczywiste tytuły i kod nad diagramem. Speaker notes przy rodzinie dotyczą wszystkich jej wariantów, ponieważ sekcje są klonowane razem z notatkami. Notatki przytoczono z ujednoliconymi odstępami; powtarzaną instrukcję obsługi zwykłych animacji opisano wspólnie wyżej.

Czasy są umownym modelem dydaktycznym. Przelot wartości i pauza przy operatorze spowalniają ilustrację; nie dodają opóźnień do rzeczywistego synchronicznego RxJS. HTTP jest symulowane. Pasek pokazuje czas pracy, a nie pomiar postępu prawdziwego żądania.

## Ścieżka MAIN i czas

MAIN ma 40 slajdów (28 animowanych) i kończy się na „Pytania?”. EXTRAS zawiera 26 dodatkowych wariantów z 17 bazowych sekcji. Całość to 49 bazowych slajdów HTML, 66 po rozwinięciu, 54 animowane.

Kolejność głównego pokazu:

1. Społeczność, historia spotkań, autor, tytuł, pytanie o operatory i legenda.
2. map → źródła (timer/HTTP/Subject) → subskrypcja → cold/hot → porównanie dwóch subskrypcji.
3. map + concatAll → concatMap → mergeMap → switchMap HTTP → exhaustMap.
4. distinctUntilChanged → debounceTime/auditTime/throttleTime/sampleTime.
5. Dwie subskrypcje bez/z share → wzmianka o Angularze i React → share/shareReplay → catchError na zewnątrz/wewnątrz → refCount false/true.
6. Resolver: problem → microtask → wspólny bufor HTTP.
7. Cztery pytania podsumowania → Pytania? → świadomy wybór dodatku.

Proponowany budżet 45 minut: otwarcie i legenda 5 min, źródła i map 7 min, flattening 10 min, ograniczanie emisji 3 min, współdzielenie/catchError/refCount 9 min, resolver 7 min, podsumowanie/pytania 4 min. To plan prelegenta, nie zmierzony czas automatu. W razie opóźnienia skróć omówienie porównań źródeł i dwóch subskrypcji; nie uruchamiaj EXTRAS w głównej ścieżce.

EXTRAS: share — wspólne wykonanie, complete outer, limit współbieżności, cztery operatory czasu, withLatestFrom/combineLatest, koszt i pozycja share, alias async, signals, defer, first/take, bufferTime, finalize, forkJoin, zip, merge, pairwise. Menu otwiera ?extras#/id; stare bezpośrednie linki do ID dodatków nadal działają. Powrót „Dodatkowe przykłady” prowadzi do menu MAIN.

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

### Jak czytać animacje? — `legenda`

**Temat:** wspólny język wizualny kolejnych diagramów.

**Na bloczkach:** cztery przykłady połączeń A → B: `subscribe`, `unsubscribe`, `complete`, `error`. Niżej bloczek HTTP z paskiem „in progress / Praca trwa” oraz kółko wartości next. A oznacza źródło, B odbiorcę. Legenda powtarza animacje co 6 s.

**Speaker notes:**

> To legenda dla kolejnych diagramów. A oznacza źródło, B odbiorcę. Czarna kreska pokazuje połączenie: przy subscribe wydłuża się od odbiorcy B do źródła A, a przy unsubscribe skraca się i znika. Sama subskrypcja nie musi uruchamiać producenta, na przykład przy już działającym źródle hot.

> Przy complete i error linia skraca się i znika od źródła A do odbiorcy B: zielona przy complete i czerwona przy error. To kierunek przeciwny do unsubscribe. Tylko klocek odbiorcy B ma kolor zakończenia; źródło A zachowuje swój kolor. Oba powiadomienia są terminalne: ta subskrypcja nie dostanie już kolejnych wartości. Unsubscribe to rezygnacja odbiorcy i samo nie wywołuje jego callbacku complete. Nie musi również zatrzymać współdzielonego producenta.

> Blok HTTP z rosnącym paskiem na dole oznacza pracę w toku (in progress). Pasek jest umowną ilustracją czasu pracy, nie pomiarem postępu prawdziwego żądania HTTP. Kółka z liczbami pokazują next, czyli wartości. Animacje legendy powtarzają się co sześć sekund, aby można było spokojnie je omówić. Każda pętla przedstawia nowy przykład, a nie wznowienie zakończonej subskrypcji. Ruch jest ilustracją, nie opóźnieniem RxJS.

## Źródła, subskrypcje i operatory

### Operator to funkcja — `04-operator`

**Temat:** przekształcanie wartości w potoku i tworzenie połączenia przez subskrypcję.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 04-operator | Operator to funkcja | `const sub = source$.pipe(map(x => x * 10)).subscribe(observer)` |

**Na bloczkach:** „Źródło” → „map(x ⇒ x × 10)” → „Odbiorca”. Wejście 1, 2, 3; wyniki 10, 20, 30 zostają wewnątrz odbiorcy. Przy transformacji widać równanie, np. `1 × 10 = 10`. Po unsubscribe źródło emituje 4, lecz odbiorca go nie dostaje. Podświetlony jest bloczek aktualnie obsługujący wartość.

**Speaker notes:**

> Na początku widać trzy niepołączone klocki: Źródło, map i odbiorcę. Przy subscribe() prosta czarna kreska wydłuża się od odbiorcy do map, a następnie od map do źródła. To kierunek rysowania połączenia, a nie kolejność wewnętrznego wywoływania subskrypcji w RxJS.

> Źródło emituje 1. Wartość najpierw dociera do map, tam zmienia się w 10 i dopiero potem rusza do odbiorcy. To samo dla 2 i 3. Ruch oraz pauza przy map celowo spowalniają ilustrację. W rzeczywistym potoku źródło i map przekazują te wartości synchronicznie, bez takich opóźnień.

> Przy unsubscribe() kreski skracają się i znikają. Kolejne next(4) nadal jest możliwe w źródle, ale ta subskrypcja już niczego nie przekazuje. Odsubskrybowanie odbiorcy nie oznacza complete źródła. map(fn) tworzy operator, a sam callback x => x * 10 przekształca wartość.

> Ręcznie pokazujemy subscribe, dotarcie 1 do map, transformację i odebranie 10. Następny klik uruchamia automatyczny pokaz 2, 3 oraz unsubscribe. Wynik pozostaje na ekranie, bez automatycznej pętli. M zmienia tryb, U pokazuje sterowanie, R wraca do początku.

### Skąd płyną wartości? — `05-zrodla`

**Temat:** trzy niezależne przykłady źródeł, każdy na osobnym slajdzie.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 05-zrodla | timer: wartości w czasie | `timer(2000, 4000)` |
| 05-zrodla-2 | HTTP: odpowiedź i complete | `http.get('/api/data')` |
| 05-zrodla-3 | Subject: odbierasz od chwili subskrypcji | `subject$.subscribe(observer)` |

**Na bloczkach i w animacji:**

- Timer: „timer” → „Odbiorca”, kolejne 0, 1, 2, 3; źródło pozostaje aktywne.
- HTTP: „HTTP” → „Odbiorca”, praca, jedna odpowiedź „dane” i complete.
- Subject: „Subject” → „Odbiorca”; A w 4 s przed subskrypcją, odbiorca dołącza w 8 s i dostaje B w 12 s. Bez historii A.

**Speaker notes:**

> To zwykły Subject, bez replay. Timer i HTTP są osobnymi przykładami źródeł. Odbiorca Subject subskrybuje dopiero w 8. sekundzie.

### Co uruchamia pracę? — `06-subskrypcja`

**Temat:** utworzenie zimnego Observable HTTP nie wysyła żądania.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 06-subskrypcja | Co uruchamia pracę? | `const data$ = http.get('/api/data')` |

**Na bloczkach:** „subscribe()”, „HTTP”, „Odbiorca”. Request zaczyna się przy subskrypcji w 6 s; odpowiedź i complete w 12 s. Podpisy rozróżniają deklarację Observable od jego wykonania.

**Speaker notes:**

> Przykład dotyczy zimnego Observable z Angular HttpClient. Nie generalizuj leniwości na już uruchomiony Promise.

### Cold i hot — `06a-cold-hot`

**Temat:** późniejszy odbiorca: własne wykonanie czy dołączenie do istniejącego producenta?

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 06a-cold-hot | Cold: własny timer dla każdego | `cold: timer(1000, 3000) dla każdej subskrypcji` |
| 06a-cold-hot-2 | Hot: dołączasz do działającego źródła | `hot: jeden timer → Subject → A i B` |

**Na bloczkach i w animacji:**

- Cold: „timer A”, „timer B”, „Odbiorca A”, „Odbiorca B”. B dołącza w 6 s; w 7 s dostaje własne 0, gdy A dostaje 2. Licznik producentów rośnie do 2.
- Hot: „wspólny timer” → „Subject” → „Odbiorca A” i „Odbiorca B”. W 7 s obaj dostają 2; B nie dostaje wcześniejszych 0 i 1. Jeden producent.

**Speaker notes:**

> Cold: każdy odbiorca uruchamia własny timer; A subskrybuje w 0 s, B w 6 s, pierwszy tick następuje po 1 s. Hot: jeden timer powstaje niezależnie od odbiorców i nadaje przez zwykły Subject. B subskrybuje w 6 s, więc odbiera 2 w 7 s. Nie odtwarzamy wcześniejszych wartości i nie utożsamiamy hot z replay.

### Dwie subskrypcje: bez share i z share — `07-hot-cold`

**Temat:** wpływ współdzielenia na wykonania zimnego HTTP.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 07-hot-cold | Bez share: dwie subskrypcje, dwa HTTP | `const data$ = http.get('/api/data')` |
| 07-hot-cold-2 | Z share: dwie subskrypcje, jedno HTTP | `const data$ = http.get('/api/data').pipe(share())` |

**Na bloczkach i w animacji:**

- Bez share: „HTTP A” → „Odbiorca A” i „HTTP B” → „Odbiorca B”. A subskrybuje w 1 s i dostaje dane w 7 s; B w 3 s i dostaje je w 9 s. Licznik 2 requestów.
- Z share: „wspólne HTTP” → „share()” → „Odbiorca A” i „Odbiorca B”. B dołącza przed odpowiedzią; obaj dostają dane w 7 s. Licznik 1 requestu.

**Speaker notes:**

> Porównaj warianty na kolejnych slajdach. A subskrybuje w 1 s, B w 3 s. Każdy request trwa 6 s od uruchomienia. Bez share każdy odbiorca uruchamia własne zimne wykonanie. Z share obaj korzystają z tej samej instancji data$ i nakładających się subskrypcji; B dołącza przed odpowiedzią w 7 s. Zwykły share nie przechowuje wyniku dla spóźnionego odbiorcy i domyślnie resetuje po complete.

### A jeśli wartością jest Observable? — `08-map-strumienie`

**Temat:** map może zwrócić Observable, a spłaszczenie wymaga subskrypcji.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 08-map-strumienie | A jeśli wartością jest Observable? | `map(id => request$(id)) → concatAll()` |

**Na bloczkach:** source$ → map → concatAll → Odbiorca. Panel PRACE WEWNĘTRZNE pokazuje A$, B$, C$. Utworzone B$ i C$ czekają bez uruchomionego HTTP; A$ ma pasek pracy. Kolejne complete uruchamiają następny inner. Wynik: A1, A2, B1, B2, C1, C2.

**Speaker notes:** Rozróżnij wartość A od referencji A$. map tworzy zimne Observable przy wejściu; dopiero concatAll subskrybuje je kolejno. Zatrzymaj pokaz, gdy A$ pracuje, a B$/C$ już istnieją.

### concatMap — `09-concatmap`

**Temat:** obsługa pracy po kolei.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 09-concatmap | concatMap — Po kolei | `source$.pipe(concatMap(makeInner$))` |

**Na bloczkach:** source$ → concatMap → Odbiorca oraz panel prac. Wspólne wejście A, B, C, D; praca trwa 1,2 s od subskrypcji. A$ ma pasek, oczekujące B/C/D pozostają wartościami, nie aktywnymi HTTP. Po complete poprzednika projekcja tworzy następny inner. Wynik A1, A2, B1, B2, C1, C2, D1, D2.

**Speaker notes:** Postój B podczas A służy pytaniu o kolejkę. W odróżnieniu od concatAll kolejkujemy wartości przed projekcją. Każde wejście zostaje obsłużone; kolejka zwiększa opóźnienie.

### mergeMap — `10-mergemap`

**Temat:** równoległe wykonania strumieni wewnętrznych.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 10-mergemap | mergeMap — Równocześnie | `source$.pipe(mergeMap(makeInner$))` |

**Na bloczkach:** source$ → mergeMap → Odbiorca oraz panel A$/B$/C$/D$. Te same wejścia i czas pracy co w pozostałych strategiach. Paski prac nakładają się, wyniki przeplatają; complete dotyczy każdego inner osobno.

**Speaker notes:** B nie czeka na A. Domyślnie brak limitu współbieżności. Zwróć uwagę na liczbę aktywnych prac i kolejność wyników.

### switchMap — `11-switchmap`

**Temat:** nowa wartość zastępuje poprzednią subskrypcję wewnętrzną.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 11-switchmap | switchMap — Najnowsza subskrypcja | ``id$.pipe(switchMap(id => http.get(`/api/users/${id}`)))`` |

**Na bloczkach:** id$ → switchMap → Odbiorca; panel HTTP A/B/C/D. Postój przy B następuje, gdy HTTP A nadal pracuje. Dalej: unsubscribe A, zatrzymany pasek i „anulowana · ABORT (klient)”, następnie start B. Kolejne wejścia anulują B i C; tylko D dostarcza odpowiedź i complete.

**Speaker notes:** Nowa wartość usuwa poprzednią subskrypcję przed projekcją nowego inner. Teardown zatrzymuje pracę klienta. Anulowana praca nie staje się complete i nie dostarcza późniejszej odpowiedzi. Nie oznacza to cofnięcia zmian już wykonanych na serwerze.

### exhaustMap — `12-exhaustmap`

**Temat:** podczas aktywnej pracy ignorujemy nowe wejścia.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 12-exhaustmap | exhaustMap — Jestem zajęty | `source$.pipe(exhaustMap(makeInner$))` |

**Na bloczkach:** source$ → exhaustMap → Odbiorca; panel A$ i D$. B oraz C są oznaczone jako pominięte wejścia: ich inner nie powstają. D pojawia się już po zakończeniu A. Wynik A1, A2, D1, D2.

**Speaker notes:** Identyczny harmonogram A/B/C/D jak w pozostałych strategiach. Podczas aktywnego A nowe B/C nie są kolejkowane ani projektowane.

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

> Complete źródła zewnętrznego nie odsubskrybowuje automatycznie aktywnego inner. concatMap obsługuje jeszcze wartości w kolejce i czeka na wszystkie inner; switchMap czeka na aktualny inner. Gdy inner nigdy się nie kończy, wynik może nadal nie emitować complete. Nie należy mylić complete źródła z unsubscribe całego potoku.

### 100 zadań. Ile naraz? — `13-limit`

**EXTRAS — poza główną ścieżką.**

**Temat:** limit równoległych subskrypcji wewnętrznych.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 13-limit | 100 zadań. Ile naraz? | `mergeMap(request$, 3)` |

**Na bloczkach:** „mergeMap” z opisem „limit: 3”, zadania „A”, „B”, „C”, „D”, „E” i „Odbiorca”. A/B/C startują, D/E czekają na wolne miejsce. Liczniki „aktywne / 3” i „w kolejce”. Tytuł mówi o 100 zadaniach, diagram pokazuje pięć przykładowych.

**Speaker notes:**

> Limit ogranicza liczbę aktywnych subskrypcji wewnętrznych. Dalsze wejścia są buforowane, więc limit nie jest pełnym mechanizmem backpressure.

## Ograniczanie emisji i wyzwalanie pracy

### distinctUntilChanged — `14-distinct`

**Temat:** pomijanie kolejnych identycznych identyfikatorów przed kosztownym HTTP.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 14-distinct | Czy ten sam identyfikator wymaga kolejnego HTTP? | `map(x => x.id) → distinctUntilChanged() → mergeMap(http)` |

**Na bloczkach:** „id$” rozdziela się na „bez filtra” → „HTTP” i „distinctUntilChanged” → „HTTP”. Wejście A, A, B, B, A. Bez filtra 5 requestów, z filtrem 3; A po B przechodzi ponownie. Liczniki pokazują obie liczby żądań.

**Speaker notes:**

> Porównanie z ostatnią przepuszczoną wartością; domyślnie ===. Identyfikator jest prymitywem. To nie jest globalne usuwanie duplikatów.

### debounceTime, auditTime, throttleTime i sampleTime — `15-debounce-audit`

**Temat:** cztery sposoby ograniczania emisji na wspólnym strumieniu wejściowym.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 15-debounce-audit | Czekać na ciszę czy aktualizować w trakcie? | `debounceTime(3500) / auditTime(3500) / throttleTime(3500) / sampleTime(3500)` |

**Na bloczkach:** „zdarzenia$” rozdziela się na cztery operatory, każdy z własnym odbiorcą i historią wewnątrz bloczka. Okno 3,5 s: debounce czeka na ciszę, audit emituje ostatnią wartość okna, throttle przepuszcza pierwszą, sample odczytuje najnowszą w stałym rytmie. Przy postoju w 5 s throttle ma A, sample C, audit D, a debounce jeszcze czeka. Sample pomija pusty takt w 17,5 s. Statusy pokazują odliczanie lub otwarte okno.

**Speaker notes:**

> Przykład trwającego źródła, bez complete i error podczas pokazu. W aplikacji czasy często będą krótsze. Audit otwiera okno zdarzeniem, a debounce czeka na ciszę. Throttle przepuszcza pierwszą wartość i pomija kolejne przez 3,5 s (domyślnie leading: true, trailing: false). Sample odlicza takty od subskrypcji i emituje tylko wtedy, gdy od poprzedniego taktu przyszła nowa wartość. Pomijamy zdarzenia dokładnie na granicach okien.

### Cztery sposoby ograniczania emisji — `16-czas-cztery`

**EXTRAS — poza główną ścieżką.**

**Temat:** cztery strategie, na czterech osobnych slajdach z tym samym wejściem.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 16-czas-cztery | debounceTime: czekamy na ciszę | `debounceTime(3500)` |
| 16-czas-cztery-2 | auditTime: ostatnia wartość okna | `auditTime(3500)` |
| 16-czas-cztery-3 | throttleTime: pierwsza wartość okna | `throttleTime(3500)` |
| 16-czas-cztery-4 | sampleTime: odczyt w stałym rytmie | `sampleTime(3500)` |

**Na bloczkach i w animacji:**

- „zdarzenia$” → „debounceTime” → „Odbiorca”: wynik po 3,5 s ciszy; nowe wejście odnawia odliczanie.
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

**Temat:** dwie subskrypcje tego samego zimnego Observable HTTP, bez współdzielenia i z share. Historyczne ID pozostają bez zmian.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 18-async | Dwie subskrypcje: dwa wykonania HTTP | `const user$ = http$; user$.subscribe(observerA); user$.subscribe(observerB);` |
| 18-async-2 | Dwie subskrypcje z share: jedno HTTP | `const user$ = http$.pipe(share()); user$.subscribe(observerA); user$.subscribe(observerB);` |

**Na bloczkach i w animacji:**

- Bez share: „HTTP A”, „HTTP B”, „Odbiorca A”, „Odbiorca B”. Dwa wykonania user$, dwie odpowiedzi i licznik 2 requestów.
- Z share: „wspólne HTTP” → „share()” → „Odbiorca A” i „Odbiorca B”. Jedna odpowiedź „user” trafia do obu odbiorców; licznik 1 requestu. Po odpowiedzi końcowy podpis wspomina Angular async pipe oraz subscribe w React useEffect z unsubscribe przy sprzątaniu.

**Speaker notes:**

> Najpierw pokaż dwie zwykłe subskrypcje A i B. http$ oznacza zimne Observable HTTP, np. ajax.getJSON z rxjs/ajax. Obie subskrypcje zaczynają się przed odpowiedzią. share stosujemy raz do wspólnej instancji user$. Dopiero po porównaniu odnieś odbiorców do Angular async pipe albo subscribe w React useEffect ze sprzątaniem przez unsubscribe. W React zachowaj stabilną instancję user$ poza komponentami; nie twórz osobnego share w każdym efekcie. AsyncPipe zarządza własną subskrypcją, ale nie dodaje współdzielenia. share nie jest trwałym cache.

Podstawa wzmianki o cyklu życia: [Angular AsyncPipe](https://angular.dev/api/common/AsyncPipe), [React — synchronizacja i sprzątanie efektów](https://react.dev/learn/synchronizing-with-effects).

### share — `19-share`

**EXTRAS — poza główną ścieżką.** Osobny pokaz zachowany jako dodatek; MAIN przechodzi z dwóch subskrypcji bezpośrednio do późnego odbiorcy.

**Temat:** jedno wykonanie podczas nakładających się subskrypcji.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 19-share | share — wspólne wykonanie | `http$.pipe(share())` |

**Na bloczkach:** „HTTP” → „share()” → „Odbiorca A” i „Odbiorca B”. A dołącza w 1 s, B w 3 s; wspólne „dane” i complete w 7 s. Licznik 1 requestu.

**Speaker notes:**

> A i B mają nakładające się subskrypcje. share() nie gwarantuje jednego wykonania na zawsze ani cache dla późniejszych odbiorców.

### share a shareReplay — `20-sharereplay`

**Temat:** odbiorca dołączający po odpowiedzi i complete HTTP.

| ID slajdu | Tytuł na ekranie | Kod nad diagramem |
| --- | --- | --- |
| 20-sharereplay | share: późny odbiorca uruchamia HTTP | `http$.pipe(share())` |
| 20-sharereplay-2 | shareReplay: późny odbiorca dostaje wynik | `http$.pipe(shareReplay({bufferSize: 1, refCount: true}))` |

**Na bloczkach i w animacji:**

- share: „HTTP #1”, następnie „HTTP #2”, „share()”, „Widok A”, „Widok B”. Po pierwszym wykonaniu brak bufora; B w 10 s uruchamia nowe HTTP i czeka do 15 s. Licznik 2 requestów.
- shareReplay: „HTTP #1” → „shareReplay(1)” → „Widok A”, „Widok B”. Status „bufor: dane”; B w 10 s dostaje zapamiętany wynik bez nowego HTTP. Liczniki 1 requestu i 1 wartości w buforze.

**Speaker notes:**

> Źródło HTTP kończy się odpowiedzią w 6 s. Widok A znika w 8 s; B pojawia się w 10 s. Domyślny share resetuje po complete, więc B uruchamia nowy request. shareReplay({bufferSize:1,refCount:true}) zachowuje wynik poprawnie zakończonego źródła i odtwarza go dla B. RefCount true nie usuwa automatycznie tego zakończonego cache. Wersja RxJS 7.8.2.

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

## Praktyczny finał: resolver metadanych

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

**Na ekranie:** koniec MAIN i menu 17 rodzin EXTRAS. Pilot nie przechodzi automatycznie do dodatków. Kliknięcie wybranego tematu otwiera jego slajd; każdy ma link powrotny „Dodatkowe przykłady”.

**Speaker notes:** Zakończ główny pokaz. Dodatki otwieraj wyłącznie w odpowiedzi na pytania lub przy zapasie czasu.

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

**Na bloczkach:** „zdarzenia” → „bufferTime()” → „HTTP · paczka” → „Odbiorca”. A/B/C tworzą ABC, D/E tworzą DE, F osobną paczkę. Okna 6 s; 6 zdarzeń, 3 zbiorcze requesty. Kod nad diagramem zawiera też filtr pustych paczek.

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

Wszystkie animowane warianty korzystają z jednego kompilatora, renderera SVG i odtwarzacza. Panel prac wewnętrznych nie ma kresek subskrypcji do wierszy. Kolejka jest szara od pierwszej klatki. Panel jest wspólnym prymitywem: pasek pracy, complete, kolejka i anulowanie mają również opis tekstowy. Diagram oraz istniejący podpis mieszczą się nad dolnymi 20% slajdu; opcjonalne sterowanie jest niżej.

Podgląd developerski: /rxjs-operatory/work/animation-review.html — wybór sceny, READY, pytanie, FINISHED i audyt granic tekstu. Uruchom npm test oraz npm run build po zmianach animacji. Próba na fizycznym projektorze i pełna próba 45 minut wymagają prelegenta.
