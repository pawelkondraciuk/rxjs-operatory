# RxJS meet.js — framework animacji kafelków

> **Specyfikacja wdrożeniowa v2.0 — zagnieżdżone operatory, kompaktowe prace wewnętrzne, sterowanie i rzutnik**  
> Cel: jeden spójny język wizualny i mechanizm sterowania animacjami RxJS, **bez budowania pełnego symulatora RxJS**.  
> Punkt odniesienia: obecny slajd **„concatMap — Po kolei”** (zrzut udostępniony w rozmowie).

## 0. Decyzja projektowa w 30 sekund

**Zostawiamy obecny wygląd kafelków i panelu „PRACE WEWNĘTRZNE”.** Dobrze pokazuje rzeczy, których same linie przepływu nie tłumaczą: aktywny inner, zakończony inner i kolejkę.

Budujemy **mały framework prezentacyjny**, a nie silnik do automatycznego interpretowania dowolnego `pipe(...)`:

1. Wspólne komponenty: źródło, operator, odbiorca, połączenie, token wartości, panel wykonań, pasek postępu, licznik, legenda.
2. Wspólne sterowanie: `→`, `←`, `Spacja`, `R`, `M`.
3. **Każdy slajd ma własny, deterministyczny scenariusz zdarzeń**, zapisany jako dane. Wspólny odtwarzacz pokazuje ten scenariusz.
4. Dla niestandardowych slajdów (np. `share`, cold/hot, `catchError`) dopuszczamy własny układ wewnątrz wspólnej ramki.
5. Najpierw prototyp **`concatMap` + `switchMap`**, również w wariancie z zagnieżdżonym `http.get(...).pipe(catchError(...))`. Jeżeli mechanizm staje się bardziej pracochłonny niż dwa oddzielne scenariusze, **nie rozbudowujemy go na siłę** — zostają wspólne kafelki i kontroler, animacje mogą być lokalne.

6. **Nowa reguła:** nie mylimy bloku operatora wyższego rzędu z pracą, którą on uruchamia. Główny kafelek `switchMap` zawiera *logicznie* funkcję projekcji; zwrócony `inner$` może mieć własny mini-pipeline `HTTP → catchError`. Wyjaśniamy to raz czytelną „receptą inner”, a szczegóły pojedynczego requestu pokazujemy dopiero, gdy mają znaczenie.
7. **Nie powtarzamy opisu kolejki pod panelem** — same wiersze `C (wartość) — w kolejce` wystarczą.

**Definicja sukcesu:** animacja jest poprawna semantycznie, czytelna z końca sali, przewidywalna przy cofaniu i nie zabiera prezenterowi uwagi podczas mówienia.

---

## 1. Co zachować z istniejącego slajdu concatMap

Obecny układ jest **wzorcem referencyjnym**, a nie czymś do gruntownego przeprojektowania.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ concatMap — Po kolei                                 [Automatyczny · M]   │
│ source$.pipe(concatMap(makeInner$))                                        │
│                                                                           │
│ [ source$ ] ── (D) ── [ concatMap ] ─────────────────── [ Odbiorca ]      │
│                              │                               A1  A2      │
│                    ┌─────────┴────────────────────┐                       │
│                    │ PRACE WEWNĘTRZNE             │                       │
│                    │ A$          ✓ complete       │                       │
│                    │ B$       ▰▰▰ w trakcie       │                       │
│                    │ C (wartość)     w kolejce    │                       │
│                    └──────────────────────────────┘                       │
│ ───────────────────────────────────────────────────────────────────────── │
│ Wartości z aktywnych inner trafiają do odbiorcy.   uruchomione 2 aktywne 1│
└───────────────────────────────────────────────────────────────────────────┘
```

### Co jest szczególnie dobre

- **Kafelek na górze pokazuje operator**, a dolny panel ujawnia jego zachowanie wewnętrzne.
- **A$ ukończony, B$ aktywny, C w kolejce** — widać różnicę między trwającą pracą a oczekującą wartością.
- **A1 i A2 przy odbiorcy** pokazują rezultat, a nie tylko stan operatora.
- **Liczniki „uruchomione” / „aktywne”** ułatwiają porównania z `mergeMap` i `switchMap`.
- **Pasek postępu B$** daje intuicyjne poczucie trwania operacji.
- **Opis u dołu** jest miejscem na jedno zdanie, które prezenter może wypowiedzieć.
- **Wyniki w odbiorcy** zostają jako kulki `A1`, `A2` wewnątrz kafelka; to ich właściwe miejsce, nie osobny log.
- **Brak podwójnej kolejki:** nie umieszczamy pod panelem dodatkowego napisu `Kolejka wartości: [C]`.

### Drobne doprecyzowania — bez zmiany wyglądu

1. `C (wartość)` oznacza **oczekującą wartość ze źródła**, a nie już uruchomiony `C$`. W `concatMap` projektowanie B/C może odbyć się dopiero, kiedy nadejdzie ich kolej.
2. Żółta kulka **D** na przewodzie to wartość „w locie”, która **jeszcze nie dotarła do operatora**. Dopóki do niego nie dotrze, kolejka nadal zawiera `[C]`. Po dotarciu zrobi się `[C, D]`.
3. Licznik **„uruchomione”** powinien znaczyć: *liczba inner Observable faktycznie zasubskrybowanych od początku scenariusza*. **„aktywne”**: *liczba trwających subskrypcji inner*. Nie utożsamiać z liczbą wartości wyemitowanych przez źródło.
4. Etykiety `complete`, `w trakcie`, `w kolejce` są ważniejsze niż kolor. Nie opieramy znaczenia wyłącznie na barwach.
5. Pasek requestu HTTP w takim panelu to **umowny czas symulowanej operacji**, nie rzeczywisty procent przesłanych bajtów.
6. Nie zmniejszamy na ślepo wszystkich wierszy. **Wiersze inner są tylko trochę niższe od głównych kafelków**; ich etykiety muszą być czytelne na projektorze.
7. W zwykłym `map` źródło pokazuje aktualną kulkę, operator chwilowo `1 → 10`, a **odbiorca gromadzi** `10`, `20` itd. Nie powielamy historii wartości przy źródle i operatorach.

---

## 2. Stały układ (scene frame)

Wspólny szkielet slajdu:

| Obszar | Zawartość | Zasada |
|---|---|---|
| Nagłówek | Tytuł, tryb sterowania (`Ręczny` / `Automatyczny · M`) | Zawsze w tym samym miejscu |
| Definicja | Jeden krótki `source$.pipe(...)` | Maksymalnie **2 operatory** w podstawowej wizualizacji |
| Główna linia | `Źródło → Operator [→ Operator] → Odbiorca` | Stałe położenie kafelków między slajdami |
| Podłączony panel | Prace wewnętrzne **albo** instancje źródła / subskrybenci | Podłączony do właściwego kafelka; pokazuj tylko, gdy coś wyjaśnia |
| Recepta inner (opcjonalnie) | `project(value) → HTTP → catchError → inner$` | Mała, lecz czytelna belka nad pracami; **nie** trzeci operator na głównej linii |
| Rezultaty | Kulki przy odbiorcy | Historia emisji `next` w danym przykładzie |
| Stopka | Jedno zdanie wyjaśnienia + liczniki | Bez długiej teorii |

Dodatkowe zasady:

- Dwa różne kierunki: **subskrypcja / unsubscribe** w stronę źródła (`←`), **next / error / complete** w stronę odbiorcy (`→`).
- Połączenie między kafelkami to **jedna stała linia**; poruszają się po niej tokeny/impulsy — nie przesuwamy całego układu.
- `map` / `filter` / `tap`: zwykle **bez panelu wykonań**. `concatMap` / `mergeMap` / `switchMap` / `exhaustMap`: panel pełni kluczową rolę.
- Na slajdach cold/hot pokazujemy **instancje wykonania źródła**; na slajdach `*Map` — **wewnętrzne wykonania operatora**. To podobny komponent wizualny, ale inna semantyka.
- Ten sam kolor / kształt tokenu oznacza tę samą wartość na kolejnych slajdach. `A`, `B`, `C`, ewentualnie `D` nie zmieniają znaczenia bez uzasadnienia.
- Obsługujemy co najmniej stany: `idle`, `running`, `queued`, `completed`, `cancelled`, `ignored`, `error`.
- Priorytet: czytelność z dystansu; umiarkowane tempo, duży tekst, brak drobnego logu debugowego na głównym ekranie.
- **Wartości źródła:** pokazujemy aktualnie emitowaną kulkę poruszającą się po linii, nie historię wszystkich emisji w kafelku źródła (wyjątek: porównanie cold/hot).
- **Wartości operatora:** wizualna transformacja/odrzucenie tylko, jeśli uczy czegoś nowego (`map: 1→10`, `filter: stop`, `tap: przechodzi bez zmiany`). W operatorach `*Map` centrum akcji jest panel inner.
- **Odbiorca:** zbiera historię odebranych wartości **wewnątrz swojego kafelka**, np. `10 20`, `A1 A2`, `fallback B`; `complete/error` pokazujemy osobnymi ikonami, nie jak normalne kulki.
- **Główne kafelki i panel umieszczamy wysoko**, na dole zostaje duży, dynamiczny opis *bieżącego etapu* — jedno zdanie, nie log zdarzeń.

### Panel „PRACE WEWNĘTRZNE” — kontrakt

Każdy wiersz przedstawia **jedno uruchomione wykonanie inner** lub **oczekującą wartość**:

| Stan | Przykładowa etykieta | Pokazuj pasek? | Komentarz |
|---|---|---|---|
| `queued` | `C (wartość) — w kolejce` | Nie | W `concatMap` dopiero czeka na mapowanie / subskrypcję |
| `running` | `B$ — w trakcie` | Tak, jeśli operacja ma czas trwania | To aktywna subskrypcja inner |
| `completed` | `A$ — ✓ complete` | Nie lub 100% | Może pozostać widoczna, żeby porównać |
| `cancelled` | `A$ — odsubskrybowany` | Zatrzymany / przekreślony | Charakterystyczne dla `switchMap` |
| `ignored` | `C — zignorowany` | Nie | Charakterystyczne dla `exhaustMap`; nie było inner |
| `error` | `B$ — error (nieobsłużony)` | Zatrzymany | Błąd zakończył inner bez przechwycenia; propagacja dalej |
| `recovered` (widok) | `B$ — HTTP error → fallback → ✓` | Zakończony | To **nie** terminalny `error` całego inner; błąd HTTP przechwycono przez wewnętrzny `catchError` |

**Ważne:** `ignored` i `queued` nie powinny zwiększać licznika „uruchomione”. Status `recovered` jest **etykietą widoku**: wewnętrzna subskrypcja ostatecznie wykonała `complete`, choć transport HTTP miał błąd. W danych oddzielamy `httpStatus=error` od `innerStatus=completed`.

---


## 2A. **NOWE / KLUCZOWE:** co naprawdę jest „w środku” `switchMap`?

### Zasada semantyczna — koniecznie zachować w animacjach

`switchMap` dostaje **funkcję projekcji**, np. `id => http.get(...).pipe(catchError(...))`. Dla przyjętej wartości wywołuje tę funkcję, otrzymuje **inner Observable** i subskrybuje go. Wewnętrzny `catchError` jest częścią **każdego** zwróconego `inner$`, a nie automatyczną własnością `switchMap`.

```ts
const result$ = ids$.pipe(
  switchMap(id =>
    http.get(`/api/items/${id}`).pipe(
      catchError(() => of(`fallback:${id}`))
    )
  )
);
```

**Nie pokazujemy `http` i `catchError` jako dwóch dodatkowych operatorów głównej linii**, bo wtedy odbiorca błędnie uzna, że chodzi o `ids$.pipe(switchMap(...), http, catchError(...))`. Główna linia nadal ma tylko: `Źródło → switchMap → Odbiorca`. Recepta inner jest *podłączona pionowo do kafelka* `switchMap`.

### Proponowany układ w 16:9 (zgodny z istniejącą estetyką)

```text
 Tytuł: switchMap — najnowszy wygrywa               [Automatyczny · M]
 ids$.pipe(switchMap(id => http.get(...).pipe(catchError(...))))

   [ ids$ ] ────────────── [ switchMap ] ───────────── [ Odbiorca       ]
                                   │                      [ fallback B, C ]
                       ┌───────────┴──────────────────────────────┐
                       │ PRACE WEWNĘTRZNE                         │
                       │ Każda praca: HTTP → catchError → inner$  │  ← RECEPTA, raz
                       │ A$    × odsubskrybowany                  │
                       │ B$    ⚠ HTTP error → fallback → ✓        │
                       │ C$    ▰▰▰▱ w trakcie                     │
                       └──────────────────────────────────────────┘
  ───────────────────────────────────────────────────────────────
  Błąd HTTP B przechwycił catchError: odbiorca dostał fallback,
  a zewnętrzna subskrypcja dalej czeka na kolejne wartości.
```

**Uwaga:** szkic łączy w panelu **historię kolejnych chwil** dla dydaktycznego podsumowania; nie pokazuje, że B i C są jednocześnie aktywne w `switchMap`. Przed pojawieniem się C B musi zakończyć się po fallbacku. Gdy B jeszcze trwa, pojawienie się C odsubskrybuje B; późniejszy błąd B nie powinien wytwarzać fallbacku.

### Trzy poziomy szczegółowości, bez ścisku

1. **Główna linia (zawsze):** duże kafelki `Źródło → switchMap → Odbiorca` + kulki odpowiedzi w odbiorcy. Nie przesuwać kafelków po wyświetleniu inner.
2. **Nagłówek panelu (gdy w scenie jest zagnieżdżenie):** jedna wspólna, czytelna „recepta”: **`project(id) → HTTP → catchError → inner$`** lub **`Każde inner$: HTTP → catchError`**. Receptę ujawnić przy pierwszym `inner.start`; można krótko podświetlić związek z kodem u góry.
3. **Wiersze wykonania (zwięzłe):** `A$`, `B$`, `C$` + pasek lub etykieta statusu. **Tylko aktywny / błędny wiersz** może na chwilę rozwinąć mini-ścieżkę `HTTP → catchError → fallback`. Po zakończeniu wraca do zwartego wpisu np. `B$ ⚠ HTTP error → fallback → ✓`.

**Nie kopiujemy pełnych kafelków `HTTP → catchError` do wszystkich trzech wierszy.** To zrobiłoby z panelu drobny, trudny do odczytania diagram. Jeżeli prowadzący chce zobaczyć zagnieżdżenie już od pierwszej klatki, używamy samej belki „Każda praca: ...” i jednego wyróżnionego wiersza.

### Małe prace — ale nie mikrotekst

- Główne kafelki są duże i niezmienne; wiersze inner są **kompaktowe**, maksymalnie 3–4 widoczne naraz.
- W stanie złożonym małe etykiety `HTTP`, `catchError`, `fallback` pokazujemy w **jednym rozwiniętym wierszu**, nigdy w 3×4 kopiach.
- Rozwijanie wiersza ma korzystać z **zarezerwowanej wysokości panelu**; nie przesuwać całej głównej linii ani dolnego opisu.
- Status musi mieć **tekst i ikonę**: `HTTP error`, `przechwycony`, `fallback`, `complete`, `odsubskrybowany`. Kolor jest pomocniczy.
- Gdy brakuje miejsca, pokazuj tylko `A$ ×`, `B$ ⚠ → ✓`, `C$ w trakcie` i wspólną receptę; nie zmniejszaj czcionki do nieczytelnej.

### Który stan oznacza `error`? Rozdzielamy dwa poziomy!

| Zdarzenie | HTTP / transport | Cały `inner$` | Odbiorca zewnętrzny |
|---|---|---|---|
| HTTP B zgłasza błąd, jest `catchError(() => of('fallback'))` **w inner** | `error` (pokaż ⚠) | **nie kończy się błędem**; emit fallback, następnie `complete` | Dostaje `fallback`, dalej czeka na następne outer emisje |
| HTTP B zgłasza błąd **bez wewnętrznego catchError** | `error` | `error` | Błąd propaguje do `switchMap` i dalej, chyba że zewnętrzny `catchError` go przechwyci |
| HTTP B ma być anulowane przez nową wartość C, zanim B zgłosi błąd | przerwane / unsubscribe | `cancelled` | Z B nie dociera późniejszy fallback; działa C |
| `catchError(() => EMPTY)` w inner | `error` | `complete` **bez emisji fallbacku** | Nie dostaje wartości B, ale outer może działać dalej |

Przykład wymaga pokazania **przyczyny i skutku**: `B$: HTTP error` → podświetla się `catchError` → `fallback B` leci do odbiorcy → `B$ ✓ complete`. Nie wolno zatrzymać B$ na czerwonym terminalnym `error`, a jednocześnie kontynuować źródła, bez pokazania przechwycenia.

### Storyboard: `switchMap` + HTTP + `catchError` wewnętrzny

Warunek: źródło emituje **A**, po chwili **B** (gdy A jeszcze trwa), a następnie **C dopiero po zakończeniu B**. Tak rozdzielamy pokaz anulowania od pokazania błędu.

| Checkpoint | Główna linia | Panel wewnętrzny | Duży podpis u dołu |
|---|---|---|---|
| 0. Start | Tylko definicja i kafelki | Panel pusty / zwinięty | „Każda wartość może uruchomić osobny request”. |
| 1. `subscribe` | Impuls od odbiorcy przez switchMap do source | Ujawnia się recepta inner (opcjonalnie przy A) | „Odbiorca subskrybuje cały strumień”. |
| 2. A | Kulka A wpada do switchMap | `A$` startuje HTTP, pasek idzie | „switchMap uruchamia HTTP A”. |
| 3. B | B wpada do switchMap | `A$ × odsubskrybowany`; `B$` rusza HTTP | „Nowa wartość B odłącza poprzednie A$”. |
| 4. B — błąd | Nie ma emisji odpowiedzi z HTTP B | `B$: HTTP ⚠ error`, wyświetla się mini-ścieżka `HTTP → catchError` | „HTTP B zgłasza błąd, ale jest on wewnątrz obsługiwany”. |
| 5. B — fallback | Kulka `fallback B` do odbiorcy | `catchError → fallback`, potem `B$ ✓ complete` | „Błąd pojedynczego inner nie kończy subskrypcji zewnętrznej”. |
| 6. C | C wpada do switchMap; później odpowiedź C | `C$` startuje, HTTP kończy się sukcesem i `complete` | „Nowa wartość C nadal może uruchomić kolejne wykonanie”. |

Dla sceny porównawczej **bez catchError** zatrzymaj się po `HTTP B error`, pokaż `inner.error → outer.error`; C nigdy nie będzie obsłużone. Dla `catchError` **za** `switchMap` narysuj go jako **drugi duży kafelek na głównej linii**, a nie część mini-recepty.

## 2B. Przykład dwóch operatorów — `concatMap` + `catchError`

Chcemy porównać **identyczny błąd B** i zademonstrować, co stanie się z kolejką C. Dwa warianty muszą pozostać czytelne i różnić się tylko pozycją `catchError`.

**Wewnątrz funkcji projekcji:**

```ts
source$.pipe(
  concatMap(id => http.get(`/api/${id}`).pipe(
    catchError(() => of(`fallback:${id}`))
  ))
)
```

Główna linia: `Źródło → concatMap → Odbiorca`. Panel: wspólna recepta `HTTP → catchError`, `A$ ✓`, `B$ HTTP error → fallback → ✓`, `C (wartość)` oczekuje do końca B; następnie startuje `C$`. Wynik: **A, fallback B, C**.

**Na zewnątrz `concatMap`:**

```ts
source$.pipe(
  concatMap(id => http.get(`/api/${id}`)),
  catchError(() => of('fallback'))
)
```

Główna linia: `Źródło → concatMap → catchError → Odbiorca` (**dwa operatory — limit zachowany**). Panel wewnętrzny ma tylko `HTTP`. Gdy B$ emituje **nieprzechwycony error**, błąd przepływa z `concatMap` do zewnętrznego `catchError`, kolejka C zostaje porzucona, wynik: **A, fallback, complete**.

**Nie pokazuj tego jako `HTTP → catchError` w panelu w wariancie zewnętrznym.** To byłoby semantycznie błędne.

---

## 3. Sterowanie i model etapów

### Klawiatura

| Klawisz | Działanie |
|---|---|
| `→` | Następny **checkpoint**; gdy uruchomione jest autoplay, natychmiast zakończ bieżący etap i pokaż jego stan końcowy |
| `←` | Cofnij do poprzedniego checkpointu; przerwij bieżącą animację |
| `Spacja` | Pauza / wznowienie bieżącej animacji |
| `R` | Restart **bieżącego scenariusza**, bez zmiany slajdu |
| `M` | Przełącz `Ręczny` ↔ `Automatyczny`; przydatne na próbie i do szybkiego przejścia |
| Opcjonalnie `Home` | Powrót do początku scenariusza |

**Uwaga organizacyjna:** strzałki nie mogą jednocześnie sterować silnikiem animacji i nawigacją całej prezentacji. Dopiero gdy scenariusz jest zakończony, `→` przechodzi do następnego slajdu. Analogicznie `←` na pierwszym checkpointcie może wracać na poprzedni slajd — do decyzji w integracji z istniejącym routerem/slajderem.

### Trzy domyślne checkpointy

1. **Subskrypcja** — połączenie od odbiorcy przez operatory do źródła; powstaje wykonanie, jeśli źródło jest zimne.
2. **Pierwsza emisja** — pokazanie pierwszego zdarzenia od źródła, przejście przez operator(y) i wynik / odrzucenie.
3. **Reszta scenariusza — autoplay** — 2–3 kolejne wartości i stan końcowy.

To **szablon**, nie twarda reguła. Dla HTTP po jednej odpowiedzi następuje `complete`; dla `share` istotniejsza jest subskrypcja A, subskrypcja B i wspólny wynik. Dla `switchMap` może być dodatkowy checkpoint przed anulowaniem A.

### Docelowe czasy animacji — spójne, lecz konfigurowalne

| Akcja | Ustawienie startowe | Uwagi |
|---|---:|---|
| Subscribe od odbiorcy do źródła | **700 ms** | Jeden czytelny impuls przez całą linię |
| Kulka między sąsiednimi kafelkami | **400 ms** | Przy 2 operatorach dwa/więcej odcinków |
| Reakcja `map` (np. `1 → 10`) | **300 ms** | Zmiana etykiety w środku operatora |
| Odrzucenie przez `filter` | **250 ms** | Kulka znika w operatorze, brak wyniku u odbiorcy |
| Pojedynczy symulowany request HTTP | **1500 ms** | **Symulowany czas**, nie % pobranych danych |
| Efekt `error`, `complete`, `unsubscribe` | **300–400 ms** | Widoczna etykieta i ikona |
| Mikro-pauza między auto-emisjami | **400–600 ms** | Nie zasypywać slajdu kulkami |
| Rozwinięcie mini-pipeline jednego inner | **250–350 ms** | Nie zmienia położenia głównej linii |
| Cała automatyczna sekwencja po pierwszej emisji | zwykle **3–5 s** | Nie powtarzać w pętli |

Wszystkie czasy jako **wspólne tokeny konfiguracyjne**, z możliwością nadpisania per scenariusz. W slajdach z operatorem `*Map` inner A musi trwać tak długo, aby B/C zdążyły wejść przed `complete`. Pauza ma zatrzymywać **także paski i kulki**.

### Cofanie bez „odwracania animacji”

- Checkpoint ma **logiczny stan końcowy**.
- `←` przenosi do poprzedniego stabilnego stanu — bez odtwarzania od tyłu animacji piksel po pikselu.
- Stan odtwarzamy z wcześniejszych zdarzeń lub snapshotu. **Zero aktywnych timerów sprzed cofnięcia**.
- Animacje mogą być odtwarzane ponownie od checkpointu; nie powinny zależeć od przypadkowych timingów czy realnej sieci.
- Po wykonaniu etapu końcowy stan pozostaje na ekranie; autoplay **nie zapętla się**.

---

## 4. Pasek postępu: źródło kontra wewnętrzna operacja

Pasek **nie oznacza ogólnego procentu ukończenia Observable**.

| Źródło / operacja | Zachowanie | Co pokazujemy |
|---|---|---|
| `http.get()` | Odpowiedź → zazwyczaj `next` → `complete` | Animowany czas oczekiwania / indeterminate; koniec wraz z odpowiedzią |
| `timer(1000)` | Jedno opóźnienie → `0` → `complete` | Pasek 0→100%, potem emisja i complete |
| `interval(1000)` | Emisje `0`, `1`, `2`... bez automatycznego complete | **Cykliczny** pasek 0→100% → reset na każdą emisję |
| `timer(1000, 1000)` | Początkowe opóźnienie, potem cyklicznie | Jak interval, z własnym pierwszym odliczaniem |
| `Subject` / `fromEvent` | Emisja następuje po zdarzeniu zewnętrznym | Status „czeka na zdarzenie”, bez sztucznego procentu |
| `concatMap` / `mergeMap` | Wykonanie `inner$` po uruchomieniu | Pasek **w wierszu konkretnego inner**, nie pod outer source |
| `switchMap` | Nowy inner odsubskrybowuje poprzedni | Pasek poprzedniego inner **urywa się** |
| `exhaustMap` | Inner trwa, nowe emisje outer są ignorowane | Tylko aktywny inner ma pasek |

Jeżeli do animacji używamy sztucznego czasu, wyświetlamy **umowny postęp scenariusza**, a nie etykietę „78% pobrano”.

---

## 5. Minimalna architektura — mniej frameworka, więcej wspólnego języka

```text
Slides
 ├─ slide config / scene recipe
 ├─ opcjonalny custom scene adapter
 └─ shared SceneFrame
      ├─ CodeHeader
      ├─ FlowCanvas (SourceTile / OperatorTile / ReceiverTile)
      │    ├─ ConnectionLine
      │    └─ MovingToken (next / subscribe / unsubscribe / complete / error)
      ├─ ExecutionPanel (inner / source instance)
      │    ├─ InnerRecipeBanner (np. HTTP → catchError; wspólny, opcjonalny)
      │    ├─ ExecutionRow (kompaktowy, stabilna wysokość) + progress
      │    ├─ FocusedExecutionDetails (rozwija tylko jeden wiersz)
      │    │    └─ MiniStageTile (HTTP / catchError / fallback)
      │    ├─ QueuedValue (bez duplikatu listy pod panelem)
      │    └─ Completion/Cancel/HttpError/Caught/Error markers
      ├─ ReceiverOutput (kulki odebranych wartości wewnątrz odbiorcy)
      ├─ Statistics / Caption
      └─ SceneController + TimelinePlayer
```

**Nie robimy**: parsera kodu RxJS, automatycznego rozpoznawania operatorów, interpreterów semantyki Observable, prawdziwych requestów HTTP, skomplikowanego edytora timeline'ów.

**Robimy**: wspólne kafelki, bazowe animacje `moveToken(...)`, `showSubscription(...)`, `progress(...)`, `updateExecution(...)`, proste scenariusze i bezpieczne cofanie.

### Rekomendowana separacja

1. **Dane scenariusza** — co logicznie zaszło (`source.next`, `inner.start`, `inner.complete` itd.).
2. **Stan widoku** — lista wykonań, kolejka wartości, emisje odbiorcy, podświetlone krawędzie, liczby.
3. **Renderowanie** — kafelki i przejścia SVG/CSS na podstawie stanu.
4. **Sterownik czasu / klawiatury** — gdzie jesteśmy w scenariuszu, pauza, szybkie dokończenie, cofnięcie.

Nie trzymaj stanu operatora bezpośrednio w przypadkowych `setTimeout` poszczególnych kafelków. Timer musi być podporządkowany jednemu kontrolerowi animacji.

---

## 6. Model danych (propozycja TypeScript)

To **kontrakt poglądowy**, nie gotowa biblioteka. Można go uprościć pod używany framework (Angular, React lub vanilla TS).

```ts
type ExecutionStatus =
  | 'running' | 'completed' | 'cancelled' | 'error';

type SceneEvent =
  | { type: 'subscription.add'; subscriber: string }
  | { type: 'subscription.remove'; subscriber: string }
  | { type: 'source.execution.start'; id: string }
  | { type: 'source.next'; value: string }
  | { type: 'source.complete' }
  | { type: 'source.error'; message?: string }
  | { type: 'queue.add'; value: string }
  | { type: 'queue.remove'; value: string }
  | { type: 'inner.start'; id: string; from: string }
  | { type: 'inner.progress'; id: string; fraction: number }
  | { type: 'inner.next'; id: string; value: string }
  | { type: 'inner.complete'; id: string }
  | { type: 'inner.cancel'; id: string }
  | { type: 'inner.http.start'; id: string }
  | { type: 'inner.http.error'; id: string; message?: string }
  | { type: 'inner.catch.handle'; id: string }
  | { type: 'inner.fallback.next'; id: string; value: string }
  | { type: 'inner.error'; id: string; message?: string }
  | { type: 'inner.focus'; id: string | null }
  | { type: 'outer.error'; message?: string }
  | { type: 'value.ignored'; value: string }
  | { type: 'receiver.next'; value: string }
  | { type: 'receiver.complete' }
  | { type: 'caption'; text: string };

type TimedEvent = {
  atMs: number;                  // lokalny czas w obrębie kroku
  event: SceneEvent;
  animation?: 'none' | 'pulse' | 'travel';
};

type SceneStep = {
  id: string;
  label: string;
  playback: 'manual' | 'auto';
  durationMs: number;
  events: TimedEvent[];
};

type SceneDefinition = {
  id: string;
  title: string;
  code: string;
  sourceLabel: string;
  operatorLabels: string[];     // maksymalnie 2 w standardowym layoutcie
  receiverLabel: string;
  panel: 'none' | 'source-executions' | 'inner-executions' | 'custom';
  innerRecipe?: { label: string; stages: Array<'http' | 'catchError' | 'fallback' | 'custom'> };
  maxVisibleInnerRows?: number; // domyślnie 3; nie pomniejszaj dowolnie fontu
  steps: SceneStep[];
};
```

### Stan pochodny — jedna prawda

```ts
type SceneState = {
  subscribers: string[];
  sourceExecutions: Array<{ id: string; status: ExecutionStatus }>;
  innerExecutions: Array<{
    id: string;
    from: string;
    status: ExecutionStatus;
    progress: number;
    values: string[];
    httpStatus?: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
    handledHttpError?: boolean; // true => był błąd HTTP, ale niekoniecznie inner.error
  }>;
  queuedValues: string[];
  ignoredValues: string[];
  receiverValues: string[];
  receiverCompleted: boolean;
  outerErrored?: boolean;
  focusedInnerId?: string | null;
  caption: string;
};

const startedCount = state.innerExecutions.length;
const activeCount = state.innerExecutions.filter(x => x.status === 'running').length;
```

**Nigdy nie aktualizować ręcznie dwóch niezależnych liczników oraz listy wykonań.** Liczniki wyliczamy ze stanu, dzięki czemu nie rozjadą się podczas `←`. `inner.http.error` to **błąd etapu HTTP**, a nie to samo co `inner.error` po całym `pipe(catchError(...))`. Ten podział ma wymuszać poprawność semantyczną.

**Zasada tworzenia stanów:** `inner.start` tworzy rekord wykonania; `inner.http.error` zaznacza błąd transportu; `inner.catch.handle` przechwytuje go; `inner.fallback.next` dostarcza wartość; `inner.complete` kończy rekord. Jeśli brak handlera, pojawia się `inner.error` i błąd propaguje dalej. Przy `inner.cancel` późniejszych zdarzeń tego inner już nie odtwarzamy. Można to implementować jawnie w scenariuszach, bez pełnego silnika RxJS.

### Przykładowy scenariusz: concatMap (fragment)

```ts
const concatMapScene: SceneDefinition = {
  id: 'concat-map',
  title: 'concatMap — Po kolei',
  code: 'source$.pipe(concatMap(makeInner$))',
  sourceLabel: 'source$',
  operatorLabels: ['concatMap'],
  receiverLabel: 'Odbiorca',
  panel: 'inner-executions',
  steps: [
    {
      id: 'subscribe', label: 'Połączenie', playback: 'manual', durationMs: 800,
      events: [
        { atMs: 0, event: { type: 'subscription.add', subscriber: 'A' }, animation: 'travel' }
      ]
    },
    {
      id: 'first', label: 'Pierwsza wartość A', playback: 'manual', durationMs: 2000,
      events: [
        { atMs: 0, event: { type: 'source.next', value: 'A' }, animation: 'travel' },
        { atMs: 450, event: { type: 'inner.start', id: 'A$', from: 'A' } },
        { atMs: 1300, event: { type: 'inner.next', id: 'A$', value: 'A1' } },
        { atMs: 1450, event: { type: 'receiver.next', value: 'A1' }, animation: 'travel' }
      ]
    },
    {
      id: 'rest', label: 'Kolejka i kolejne wartości', playback: 'auto', durationMs: 4400,
      events: [
        { atMs: 0, event: { type: 'source.next', value: 'B' }, animation: 'travel' },
        { atMs: 350, event: { type: 'queue.add', value: 'B' } },
        { atMs: 650, event: { type: 'source.next', value: 'C' }, animation: 'travel' },
        { atMs: 1000, event: { type: 'queue.add', value: 'C' } },
        { atMs: 1300, event: { type: 'inner.next', id: 'A$', value: 'A2' } },
        { atMs: 1450, event: { type: 'receiver.next', value: 'A2' }, animation: 'travel' },
        { atMs: 1700, event: { type: 'inner.complete', id: 'A$' } },
        { atMs: 1750, event: { type: 'queue.remove', value: 'B' } },
        { atMs: 1800, event: { type: 'inner.start', id: 'B$', from: 'B' } },
        { atMs: 2300, event: { type: 'inner.progress', id: 'B$', fraction: 0.42 } },
        // Dalej można pokazać D będące jeszcze w drodze do concatMap.
        // Kiedy D dotrze do operatora — dopiero wtedy queue.add('D').
        { atMs: 4100, event: { type: 'caption', text: 'Wartości czekają, aż aktywny inner zrobi complete.' } }
      ]
    }
  ]
};
```

To **pseudodane do wdrożenia**: produkcyjny player powinien dodać osobny event wizualny „token przebywa odcinek”, żeby `source.next` oraz pojawienie się `queue.add` nie musiały być związane z jednym momentem. Nie ma potrzeby liczyć całego `concatMap` automatycznie — autor sceny określa wynik.

---

## 7. Storyboardy operatorów *Map — jeden layout, inne reguły

Dla porównania przyjmujemy identyczne emisje zewnętrzne: **A, B, C**, zanim pierwsze wykonanie A zdąży się zakończyć.

### `concatMap`

- A uruchamia `A$` → status `running`.
- B, C trafiają do **kolejki wartości**, bez uruchamiania nowych inner.
- `A$` emituje A1/A2 → wyniki docierają do odbiorcy.
- `A$` robi `complete` → dopiero teraz `B` jest mapowane i uruchamiane jako `B$`.
- **Wniosek:** zachowujemy kolejność wykonań; następne czekają.

### `mergeMap`

- A, B, C uruchamiają od razu odpowiednie inner (`A$`, `B$`, `C$`).
- Panel pokazuje **trzy równoległe paski**; wyniki mogą dotrzeć w innej kolejności niż wejścia.
- Licznik: `uruchomione 3`, `aktywne 3` (jeżeli żaden nie skończył).
- **Wniosek:** brak domyślnej kolejki ograniczającej współbieżność. Bonus: `mergeMap(project, 2)` ustawia limit 2 aktywnych inner.

### `switchMap`

- A uruchamia `A$`.
- B powoduje **unsubscribe A$**, po czym rusza `B$`.
- C powoduje **unsubscribe B$**, po czym rusza `C$`.
- Odsubskrybowane prace pozostają przez chwilę w panelu jako `cancelled`, aby było widać przyczynę.
- **Wniosek:** operator utrzymuje aktualnie najnowszą subskrypcję inner; anulowanie subskrypcji HTTP po stronie klienta nie cofa automatycznie operacji już wykonanej na backendzie.

### `exhaustMap`

- A uruchamia `A$`.
- B i C przychodzą, kiedy A trwa — są **ignorowane**, nie kolejkowane.
- Po `complete A$` następna nowa wartość (np. D) może uruchomić nowy inner.
- **Wniosek:** nie przerywamy trwającego działania, odrzucamy kolejne próby w jego trakcie.

### `map + concatAll` → `concatMap`

- Najpierw pokazujemy `map`, który tworzy **osobny Observable dla każdej wartości**, a `concatAll` subskrybuje je po kolei.
- Na kolejnym slajdzie **nie odtwarzamy całej animacji drugi raz** — te dwa kafelki wizualnie składają się w `concatMap`.
- Uwaga semantyczna: `map + concatAll` może tworzyć obserwable wcześniej; `concatMap` uruchamia `project` dla kolejnych wartości wtedy, gdy nadejdzie ich kolej. To istotne, gdy `project` ma skutki uboczne przed subskrypcją.

---

## 8. Scenariusze niepasujące do jednej kolejki

### Cold Observable (`interval`)

**Nie pokazujemy dwóch obiektów Observable.** Jedna definicja `counter$ = interval(1000)` u góry, poniżej dwa **oddzielne wykonania timera** po dwóch `subscribe()`; B startuje później i dostaje własne `0`. Osobne paski postępu dla każdego wykonania.

### Hot / Subject

Jedno aktywne źródło połączone z `Subject`, A i B podłączone do tego samego Subjecta. B dołącza późno i widzi wyłącznie przyszłe wartości (dla zwykłego Subjecta). Nie sugerować, że każdy hot Observable musi być Subjectem.

### HTTP bez `share` → z `share`

1. Definicja `users$ = http.get('/api/users')`.
2. Subskrypcja A → **GET #1**, subskrypcja B → **GET #2**.
3. W logu sieciowym dwa osobne wpisy, niezależne wykonania źródła.
4. Na kolejnym slajdzie **identyczna geometria**, wstawiony `share()` / Subject → jeden request i ta sama odpowiedź dla obu **jednocześnie aktywnych** odbiorców.
5. Sugerowany licznik na dole: `Requesty do backendu: 2` / `1`.

### `shareReplay(1)`

- Po `share()` wprowadzić **spóźnionego odbiorcę**, który dołącza po zakończeniu HTTP.
- Domyślne `share()` po complete przy nowej subskrypcji uruchamia nowe wykonanie źródła.
- `shareReplay({ bufferSize: 1, refCount: true })` może oddać zapamiętaną odpowiedź po complete, **bez nowego HTTP**. Cache pozostaje po udanym `complete` mimo spadku liczby odbiorców do zera.
- `refCount: true` ma znaczenie m.in. jeśli ostatni odbiorca odejdzie **przed complete**.
- `shareReplay` korzysta z **ReplaySubject**, nie BehaviorSubject.
- Bonus: przy nieskończonym źródle `refCount: false` może zostawić aktywne połączenie ze źródłem po odejściu odbiorców.

### `catchError` — wewnątrz versus na zewnątrz

**Dokładne makiety, momenty ujawniania i testy semantyki są w punktach 2A i 2B — to obecnie referencyjna wersja.**

- Wewnątrz `concatMap` / `switchMap`: `HTTP error` → `catchError` wewnątrz *każdego inner* → fallback → `inner complete`; zewnętrzny source może nadal działać.
- Po `concatMap` / `switchMap`: brak wewnętrznego przechwycenia; błąd wędruje do operatora na **głównej linii**, a pierwotny łańcuch nie wznawia się po zwróceniu `of(fallback)`.
- Dla `switchMap` **nie wolno pokazywać fallbacku** z inner, które zostało wcześniej odsubskrybowane przez nowszą wartość.
- Przy `concatMap` B(error) i C w kolejce: `A, fallback(B), C` kontra `A, fallback, complete`.

---

## 9. Kryteria wizualne i dostępność

**Układ na rzutnik:** zalecany punkt startowy dla 16:9 to ok. **15% nagłówek + kod**, **22% główna linia kafelków**, **40–43% panel prac** i **20% dolny dynamiczny podpis / liczniki**. To proporcje orientacyjne; najważniejsze, że kafelki znajdują się wysoko, a opis na dole nie zasłania animacji. Nie trzeba zawsze rezerwować panelu przy prostych `map/filter`.

**Typografia (punkt odniesienia przy wyświetlaniu w 1920×1080, bez nieoczekiwanego przeskalowania):** nagłówek 44–56 px; nazwy głównych kafelków ~30–34 px; istotne etykiety inner i dolne objaśnienie **co najmniej około 24–28 px**; kod ok. 28–32 px. Na rzeczywistym rzutniku zweryfikować z ostatniego rzędu. W razie ciasnoty skrócić treść albo ograniczyć liczbę wierszy, **nie pomniejszać wszystkiego**.

**Opis pod slajdem:** tylko zdanie odpowiadające aktualnemu checkpointowi, np. „B zgłasza błąd HTTP, ale wewnętrzny catchError podaje fallback” albo „C odsubskrybowuje poprzedni request B”. Bez drobnego stack trace i bez powielania kolejki w postaci tekstu.

- [ ] Kafelek źródła, operatora i odbiorcy ma tę samą wysokość/typografię na wszystkich slajdach.
- [ ] Odbiorca ma wewnątrz własny obszar na odebrane kulki (`10`, `20`, `A1`, `A2`) i nie gubi poprzednich emisji.
- [ ] W źródle nie ma redundantnego logu wartości, a operator pokazuje transformację tylko, gdy jest istotna.
- [ ] Główna linia pozostaje wysoko; panel nie spycha do dołu głównych kafelków.
- [ ] Panel zawiera **jedną** receptę `HTTP → catchError` dla wszystkich inner, a szczegóły rozwija tylko dla podświetlonego wiersza.
- [ ] Nie ma dodatkowego napisu „Kolejka wartości: [...]” pod panelem.
- [ ] Wykonania `running`, `queued`, `completed`, `cancelled`, `ignored` mają **etykietę tekstową** i stałą kolorystykę.
- [ ] Aktywne połączenie dla subscribe ma inny kolor niż wartość `next`; unsubscribe jest osobnym sygnałem.
- [ ] Ruch wartości po ścieżce trwa orientacyjnie 300–500 ms na odcinek; całe przejście subscribe około 600–800 ms.
- [ ] „Praca HTTP” w symulacji trwa zwykle 1–1,5 s — można globalnie ustawić prędkość.
- [ ] Pauza zamraża tokeny oraz paski, nie tylko opóźnia kolejne zdarzenia.
- [ ] Po `←`, `R`, przejściu do innego slajdu nie działa żaden timer z poprzedniego stanu.
- [ ] Tryb `prefers-reduced-motion`: wartości mogą skakać między węzłami bez długiego ruchu, a stany nadal są czytelne.
- [ ] Animacje mają stan końcowy, który można pokazać od razu na wypadek braku czasu.
- [ ] Panel nie przeskakuje gwałtownie wraz z liczbą aktywnych prac; zapewniamy stałą / minimalną wysokość.
- [ ] Przy wyjściu HDMI 1080p tekst statusu nadal można odczytać z końca sali.

---

## 10. Plan implementacji — od najmniejszego sensownego prototypu

### Etap 0 — zamrożenie dobrego wzorca

- [ ] Zachować aktualny zrzut / stan slajdu `concatMap` jako **visual baseline**.
- [ ] Spisać nazwy stanów, ich znaczenie i kolorystykę.
- [ ] Ustalić wymiary obszarów, pozycje kafelków i maksymalnie 2 operatory **głównej linii** (zagnieżdżone w receptach inner nie liczą się do tej dwójki).
- [ ] Potwierdzić, że `queued` oznacza *wartość*, a nie uruchomiony inner.

### Etap 1 — wspólne kafelki, bez animacji

- [ ] Wydzielić `SceneFrame` (tytuł / kod / linia / panel / stopka).
- [ ] Wydzielić `SourceTile`, `OperatorTile`, `ReceiverTile`, `ConnectionLine`, `ValueToken`.
- [ ] Wydzielić `ExecutionPanel`, `ExecutionRow`, `QueuedValue`, `ProgressBar`, `OutputTokens`.
- [ ] Dodać opcjonalne `InnerRecipeBanner` (`HTTP → catchError`) i `FocusedExecutionDetails` (rozwinąć pojedynczą pracę bez przeskoku layoutu).
- [ ] Zapewnić, że kulki zbierają się **wewnątrz `ReceiverTile`**, a nie w oddzielnym szeregu obok.
- [ ] Wyrenderować **obecny stan concatMap** wyłącznie z obiektu danych (bez ręcznego ustawiania statusów w DOM).
- [ ] Dodać panel podpisów i liczniki wyliczane ze stanu.

### Etap 2 — najprostszy kontroler

- [ ] Zdefiniować `SceneDefinition` / `SceneStep` / `SceneEvent`.
- [ ] Oddzielić `inner.http.error` od `inner.error` i dodać zdarzenia `inner.catch.handle`, `inner.fallback.next` oraz fokus wiersza.
- [ ] Dodać globalne tokeny czasów animacji (700/400/300/1500 ms itd.) i nadpisywanie per scena.
- [ ] Zaimplementować reduktor zdarzeń → `SceneState`.
- [ ] Dodać odtwarzanie jednego kroku od 0 do `durationMs`.
- [ ] Dodać `→` (next checkpoint) i `←` (restore previous checkpoint).
- [ ] Dodać `R` oraz bezpieczny cleanup animacji po zmianie slajdu.
- [ ] Dodać `Spacja` pauza/wznowienie i `M` manual/auto.
- [ ] Dodać przycisk „pokaż stan końcowy” / skip animacji.

### Etap 3 — prototyp, który rozstrzyga, czy warto budować framework

- [ ] Zbudować **pełny `concatMap`**: A w trakcie, B/C w kolejce, A1/A2 przy odbiorcy, A complete, B startuje.
- [ ] Zbudować **`switchMap` na tym samym komponencie**: A start, B anuluje A, C anuluje B.
- [ ] Zbudować wariant **`switchMap(id => http.get(...).pipe(catchError(...)))`**: recepta inner → B ma `HTTP error` → rozwija się `catchError` → fallback dociera do odbiorcy → B complete → dopiero potem C.
- [ ] Zbudować testowy wariant **`concatMap` z catchError wewnątrz vs za concatMap** i porównać los oczekującego C.
- [ ] Sprawdzić, że **w chwili anulowania B przed jego błędem** nie pojawia się później żaden `fallback B`.
- [ ] Zweryfikować cofanie `←` w chwili, kiedy pasek A ma 50% — powrót do poprzedniego stabilnego stanu.
- [ ] Sprawdzić przejście do innego slajdu podczas autoplay — brak osieroconych animacji.
- [ ] Sprawdzić tempo i czytelność na ekranie prezentacyjnym.
- [ ] Zmierzyć koszt dodania drugiego operatora: czy wymaga **nowego scenariusza**, czy przerabiania całego silnika.

**Bramka decyzyjna (go / no-go):** jeśli nowy slajd to głównie nowa lista zdarzeń + kilka opisów, rozwijamy framework. Jeśli wymaga zmian stanu globalnego, wyjątków w kontrolerze i licznych `if (operator === ...)`, zatrzymujemy uogólnianie.

### Etap 4 — rozszerzenia dopiero po udanym prototypie

- [ ] Dodać `mergeMap` i `exhaustMap` na tych samych A/B/C.
- [ ] Dodać transformacje prostych operatorów `map` / `filter` bez panelu inner.
- [ ] Dodać rodzaje postępu: jednorazowy, cykliczny, indeterminate.
- [ ] Dodać `cold` z dwoma osobnymi wykonaniami `interval`.
- [ ] Dodać dwa requesty HTTP → `share` → `shareReplay`.
- [ ] Dodać `catchError` inner / outer zgodnie z kontraktem 2A/2B; w razie ciasnoty zastosować **wspólną receptę + jeden rozwijany wiersz**, nie duplikować mini-pipeline w każdym wierszu.
- [ ] Dodać bonus `mergeMap(project, 2)` bez zmiany głównego UI.

### Etap 5 — przygotowanie sceniczne

- [ ] Próba pełnej prezentacji bez zatrzymywania — < 30 min materiału podstawowego.
- [ ] Próba z nieplanowanym `←`, `R`, zmianą slajdu i ponownym wejściem.
- [ ] Próba przy wolniejszym laptopie i projektorze / zewnętrznym monitorze.
- [ ] Zdefiniować skrót pokazania wyniku natychmiast, jeśli zabraknie czasu.
- [ ] Dopiąć speaker notes: **pytanie → kluczowy moment animacji → jedna myśl**.

---

## 11. Testy akceptacyjne (semantyka)

| Test | Oczekiwany wynik |
|---|---|
| Cold `interval`: B subskrybuje później | B dostaje własne `0`, a nie stan A |
| Dwa `subscribe()` do cold HTTP | Dwa niezależne wykonania i dwa wpisy GET |
| `share()` i równocześnie aktywni A/B | Jeden GET, obaj dostają odpowiedź |
| `share()` i B po complete | Domyślnie nowy GET |
| `shareReplay(1)` i B po udanym complete | B dostaje ostatni wynik bez nowego GET |
| `concatMap`, A trwa, B/C przychodzą | B/C są w kolejce; aktywne inner = 1 |
| `mergeMap` A/B/C przychodzą szybko | Trzy aktywne inner (bez limitu concurrency) |
| `switchMap` A→B→C | A i B cancelled, C aktywny |
| `exhaustMap` A trwa, B/C przychodzą | B/C ignored, brak późniejszego wykonania B/C |
| `concatMap` outer complete, queue niepusta | Inner i kolejka kończą się przed complete u odbiorcy |
| `switchMap` z `http.pipe(catchError)` | Po błędzie HTTP B widoczny `HTTP error → catchError → fallback → inner complete`; późniejsze C działa |
| `switchMap` anuluje B, zanim HTTP B zgłosi error | Brak późnego fallbacku B; B jest cancelled, C działa |
| `catchError` wewnątrz inner | Fallback dla jednego requestu, następne outer wartości mogą działać |
| `catchError` po concatMap | Błąd kończy pierwotny łańcuch, chyba że replacement jawnie wprowadza inne zachowanie |
| Operator `catchError` **w inner** vs **za operatorem** | W pierwszym wariancie mały element w panelu + recepta; w drugim duży kafelek na głównej linii |
| `inner.http.error` obsłużony | Wiersz pokazuje ⚠ i potem ✓ `complete`, **nie** końcowe `inner.error` |
| Wiersz inner ma trzy stany i szczegóły | Maks. jeden rozwinięty wiersz, bez podwójnego tekstu kolejki, bez skoku geometrii |
| `←` podczas pracy paska | Poprzedni checkpoint, brak „duchów” i timerów |
| `R` po error / complete | Scena wraca do zera i odtwarza się identycznie |

---

## 12. Kiedy zrezygnować z pełnego frameworka?

Nie każda animacja musi mieć ten sam silnik. **Plan B jest pełnoprawnym rozwiązaniem:** wspólne komponenty wizualne + wspólna klawiatura, ale osobne pliki animacji na każdy slajd.

**Sygnały ostrzegawcze:**

- Wspólny kontroler zaczyna zawierać wiele warunków `if (slideId === '...')`.
- Więcej czasu zajmuje rozwój abstrakcji niż zrobienie samego slajdu.
- Wymóg jednego modelu stanu utrudnia `share`, cold/hot lub `catchError`.
- Cofanie wymaga ręcznego anulowania kilkunastu niezależnych timeoutów.
- Przeniesienie slajdu do „frameworka” psuje prosty, czytelny układ istniejącego `concatMap`.

**Wtedy zostają:** `SceneFrame`, kafelki, panel wykonań, design tokens i `SceneController` obsługujący skróty. Każdy slajd może implementować własny `render(state)` oraz lokalny zestaw checkpointów. To nadal zachowuje spójność całej prezentacji.

### Proponowana struktura plików (niezależna od frameworka UI)

```text
presentation/
  rxjs/
    scene/
      SceneFrame.ts[x]
      SceneController.ts
      TimelinePlayer.ts
      sceneReducer.ts
      types.ts
    components/
      SourceTile.ts[x]
      OperatorTile.ts[x]
      ReceiverTile.ts[x]
      ExecutionPanel.ts[x]
      InnerRecipeBanner.ts[x]
      FocusedExecutionDetails.ts[x]
      MiniStageTile.ts[x]
      ValueToken.ts[x]
      ProgressBar.ts[x]
      FlowConnection.ts[x]
    scenarios/
      concatMap.scene.ts
      mergeMap.scene.ts
      switchMap.scene.ts
      switchMapHttpCatchError.scene.ts
      concatMapCatchErrorInside.scene.ts
      concatMapCatchErrorOutside.scene.ts
      exhaustMap.scene.ts
      share.scene.ts
      shareReplay.scene.ts
    custom/
      ColdVsHotScene.ts[x]
      CatchErrorScene.ts[x]
    tests/
      sceneReducer.spec.ts
      playback.spec.ts
      rxSemantics.spec.ts
```

`[x]` oznacza tylko potencjalny wariant rozszerzenia, nie konkretny framework.

---

## 13. Instrukcja dla agenta kodującego — wklej jako zadanie

> **Kontekst i ograniczenie:** rozwijaj istniejącą aplikację prezentacyjną meet.js o RxJS. Zachowaj w 100% jej aktualną stylistykę, w szczególności ekran `concatMap — Po kolei` z kafelkami źródła, operatora i odbiorcy, listą prac wewnętrznych i wynikami jako kulki **w odbiorcy**. Nie rób redesignu ani parsera RxJS. Przed zmianami przeanalizuj obecny kod i przedstaw listę komponentów/plików do modyfikacji.
>
> **Najważniejsza nowość:** operator `switchMap` lub `concatMap` przyjmuje projektor zwracający **inner Observable**, np. `id => http.get(...).pipe(catchError(...))`. Na głównej linii pokaż tylko `Źródło → switchMap → Odbiorca`. Pod operator podłącz panel „PRACE WEWNĘTRZNE” z **jedną wspólną receptą** `Każde inner$: HTTP → catchError`. Każda praca A$/B$/C$ jest kompaktowym wierszem; przy błędzie rozwiń **tylko fokusowany wiersz**: `HTTP error → catchError → fallback → complete`, potem zwiń do `B$ ⚠ HTTP error → fallback → ✓`. Nie powielaj małego `HTTP → catchError` trzy razy ani nie wprowadzaj catchError na główną linię w wariancie, w którym operator znajduje się w `inner.pipe(...)`.
>
> **Semantyka:** błąd requestu HTTP może zostać złapany wewnątrz inner. Wtedy `HTTP.status=error`, ale `inner.status=completed` po emisji fallbacku. To NIE jest nieobsłużony `inner.error`. Jeśli `switchMap` wcześniej anuluje B, żaden późniejszy fallback z B nie powinien się pojawić. Jeśli `catchError` jest na zewnątrz, pokaż go jako drugi duży kafelek: `Źródło → concatMap → catchError → Odbiorca` i zatrzymaj obsługę C oczekującego w kolejce po błędzie B (przy replacement `of(fallback)`).
>
> **UI:** zachowaj kompaktowe wiersze A$, B$, C, ale czytelne na projektorze. Usuń osobny napis `Kolejka wartości: [...]` pod panelem; te same dane pokazują już wiersze. Źródło emituje pojedyncze kulki, operator tylko ważną transformację/odrzucenie; odbiorca przechowuje historię kulek. Kafelki i panel mają być wysoko, duży dynamiczny podpis aktualnego zdarzenia jest na dole slajdu. Maks. 2 duże operatory na głównej linii, zagnieżdżone mini-kafelki w panelu nie liczą się do limitu.
>
> **Odtwarzanie:** deterministyczne scenariusze zdarzeń, nie realna sieć; wspólne kontrolki `→` kolejny checkpoint, `←` poprzedni, `Spacja` pauza, `R` reset, `M` manual/auto. `→` podczas autoplay może dokończyć etap. Subskrypcja od odbiorcy do źródła, wartości odwrotnie. Globalne czasy: subscribe 700 ms, ruch na odcinek 400 ms, transformacja 300 ms, HTTP symulowany 1500 ms, error/complete 300–400 ms, odstęp kolejnych emisji 400–600 ms; nadpisywane per scena. Cofanie odtwarza stabilny stan; zero osieroconych timerów.
>
> **Kolejność prac:** (1) odtwórz referencyjny concatMap z danych, (2) wdroż wspólny panel i klawiaturę, (3) wdroż switchMap + HTTP + catchError i jego szczegółowy storyboard z punktu 2A, (4) porównaj catchError wewnątrz/na zewnątrz concatMap z punktu 2B, (5) przetestuj cofanie w trakcie animacji i czytelność 16:9. Jeśli uniwersalny silnik wymaga zbyt wielu wyjątków, zostań przy wspólnych kafelkach i sterowaniu, ale animacje realizuj osobnymi scenami. Nie zmieniaj istniejących slajdów masowo przed zaakceptowaniem dwóch prototypów.
>
> **Kryteria odbioru:** wszystkie testy z rozdziału 11, brak duplikowanej kolejki, brak sprzecznych statusów error/complete, brak przesuwania układu podczas rozwijania pojedynczej pracy, czytelna projekcja z końca sali. Po każdej iteracji pokaż diff i krótkie podsumowanie, co zostało zmienione i przetestowane.

---

## 14. Priorytety na pierwszy dzień

1. **Odtworzyć obecny screen `concatMap` z danych**, bez animacji. Jeśli wygląda gorzej niż teraz, nie idziemy dalej.
2. Dodać **trzy checkpointy** i nawigację `→` / `←` z możliwością restartu.
3. Odtworzyć A → B → C w `concatMap`, wraz z kolejką i paskiem aktywnego inner.
4. W tej samej ramce przygotować `switchMap`, gdzie A/B są odsubskrybowane.
5. Dodać **wspólną receptę inner** `HTTP → catchError` i rozwinąć pojedynczy wiersz B w momencie błędu HTTP; po fallbacku ma być `inner complete`, nie terminalny error.
6. Porównać `concatMap` z `catchError` wewnątrz i na zewnątrz: C działa tylko w pierwszym wariancie.
7. Sprawdzić, czy kolejny slajd wymaga tylko nowej konfiguracji scenariusza. **Dopiero wtedy** dopracowywać więcej efektów i operatorów.

**Priorytet nadrzędny:** nie zepsuć czytelnego bloku z obecnego slajdu i nie ukryć w błędny sposób operatora wewnętrznego `catchError`. Ma on tłumaczyć operator na pierwszy rzut oka — framework jest tylko sposobem na jego wielokrotne użycie.
