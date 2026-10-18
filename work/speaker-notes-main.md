# Speaker notes — slajdy techniczne RxJS

Pełny eksport notatek z `index.html` do weryfikacji. Zakres: **21 slajdów technicznych aktualnej ścieżki MAIN**, od pierwszego slajdu po „A share?” — „HTTP: od definicji do wykonania” — do „Cztery pytania przed kolejnym pipe”, przed „Pytania?”.

Kolejność pochodzi z `mainOrder` w [animations/scene-config.js](../animations/scene-config.js). Tytuły pobrano z końcowych konfiguracji scen po rozwinięciu wariantów przez `prepareSlides`. Przykład `14-distinct` jest obecnie w EXTRAS i nie należy do tego eksportu.

Eksport zachowuje oryginalne brzmienie wszystkich akapitów, w tym instrukcje prelegenta i opisy diagramów; zmieniono tylko format HTML na Markdown oraz białe znaki. Dla slajdów z szablonem checkpointów podano wszystkie etapy oraz osobno pełne bazowe notatki sekcji. W prezentacji notatki checkpointów zastępują bazowe. Dla pozostałych slajdów podano pełne wspólne notatki, także gdy opisują kilka wariantów.

## Spis slajdów

1. **HTTP: od definicji do wykonania** — `05-zrodla-2`
2. **interval: strumień bez końca** — `05-zrodla`
3. **Subject — ręczna emisja** — `05-zrodla-5`
4. **Operator to funkcja** — `04-operator`
5. **Cold: jedna definicja, trzy wykonania** — `04a-dwa-tory`
6. **Subject: ręczny multicast HTTP** — `05-zrodla-3`
7. **share(): jedno HTTP, trzech odbiorców** — `04a-dwa-tory-2`
8. **Subject — kto odłączy źródło?** — `05-zrodla-4`
9. **share() — kto odłączy źródło?** — `04a-dwa-tory-3`
10. **share: późny odbiorca uruchamia HTTP** — `20-sharereplay`
11. **shareReplay: późny odbiorca dostaje wynik** — `20-sharereplay-2`
12. **A jeśli wartością jest Observable?** — `08-map-strumienie`
13. **concatMap — Po kolei** — `09-concatmap`
14. **mergeMap — Równocześnie** — `10-mergemap`
15. **switchMap — Najnowsza subskrypcja** — `11-switchmap`
16. **exhaustMap — Jestem zajęty** — `12-exhaustmap`
17. **distinctUntilChanged — czy coś się zmieniło?** — `11a-distinct-switchmap`
18. **catchError wewnątrz** — `b04-catcherror-2`
19. **catchError na zewnątrz** — `b04-catcherror`
20. **debounceTime i auditTime: cisza czy okno?** — `16-czas-cztery`
21. **Cztery pytania przed kolejnym pipe** — `25-podsumowanie`

## 1. HTTP: od definicji do wykonania

**ID:** `05-zrodla-2`  
**Źródło:** [index.html — sekcja 05-zrodla](../index.html#L465)

### Notatki wspólne sekcji — wyświetlane w prezentacji

**HTTP — pierwszy slajd części właściwej:** Najpierw istnieje tylko definicja http.get('/api/data'). Samo jej utworzenie nie wysyła requestu. Subscribe dodaje odbiorcę; impuls biegnie do HTTP i uruchamia pracę. Zatrzymaj się przy request, potem przy next. Complete jest osobną notyfikacją po odpowiedzi. Przykład dotyczy cold HTTP, nie już uruchomionego Promise.

**interval — na żywo:** Na wejściu jest tylko definicja interval(1000); nic nie emituje. Pierwsze prawo: .subscribe() tworzy wykonanie A. Od tej chwili interval emituje 0, 1, 2, 3… co sekundę i sam się nie kończy — mów, ile chcesz, licznik biegnie. Drugie prawo: .unsubscribe() A; szary impuls × biegnie od odbiorcy do interval, emisje ustają, nie ma complete. Trzecie prawo przechodzi dalej. Lewo cofa o etap; po wyjściu ze slajdu wykonanie jest sprzątane i po powrocie zaczyna od zera.

**Subject — ręczna emisja (05-zrodla-5):** trzeci slajd techniczny, po interval i przed „Operator to funkcja”: next(1), next(2) i error do odbiorców A/B, potem next(3) bez skutku — notatki per checkpoint w szablonie poniżej.

**Subject (05-zrodla-3):** ręczny multicast HTTP do pól widoku z Cold ma własne notatki per checkpoint w szablonie poniżej.

**Subject + interval (05-zrodla-4):** „kto odłączy źródło?”, po share() + HTTP i przed share() + interval — notatki per checkpoint w szablonie poniżej.

**Sterowanie wprowadzeniem:** Prawo uruchamia lub kończy etap, lewo cofa checkpoint także w AUTO. Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany początek, U pokazuje sterowanie.

## 2. interval: strumień bez końca

**ID:** `05-zrodla`  
**Źródło:** [index.html — sekcja 05-zrodla](../index.html#L465)

### Notatki wspólne sekcji — wyświetlane w prezentacji

**HTTP — pierwszy slajd części właściwej:** Najpierw istnieje tylko definicja http.get('/api/data'). Samo jej utworzenie nie wysyła requestu. Subscribe dodaje odbiorcę; impuls biegnie do HTTP i uruchamia pracę. Zatrzymaj się przy request, potem przy next. Complete jest osobną notyfikacją po odpowiedzi. Przykład dotyczy cold HTTP, nie już uruchomionego Promise.

**interval — na żywo:** Na wejściu jest tylko definicja interval(1000); nic nie emituje. Pierwsze prawo: .subscribe() tworzy wykonanie A. Od tej chwili interval emituje 0, 1, 2, 3… co sekundę i sam się nie kończy — mów, ile chcesz, licznik biegnie. Drugie prawo: .unsubscribe() A; szary impuls × biegnie od odbiorcy do interval, emisje ustają, nie ma complete. Trzecie prawo przechodzi dalej. Lewo cofa o etap; po wyjściu ze slajdu wykonanie jest sprzątane i po powrocie zaczyna od zera.

**Subject — ręczna emisja (05-zrodla-5):** trzeci slajd techniczny, po interval i przed „Operator to funkcja”: next(1), next(2) i error do odbiorców A/B, potem next(3) bez skutku — notatki per checkpoint w szablonie poniżej.

**Subject (05-zrodla-3):** ręczny multicast HTTP do pól widoku z Cold ma własne notatki per checkpoint w szablonie poniżej.

**Subject + interval (05-zrodla-4):** „kto odłączy źródło?”, po share() + HTTP i przed share() + interval — notatki per checkpoint w szablonie poniżej.

**Sterowanie wprowadzeniem:** Prawo uruchamia lub kończy etap, lewo cofa checkpoint także w AUTO. Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany początek, U pokazuje sterowanie.

## 3. Subject — ręczna emisja

**ID:** `05-zrodla-5`  
**Źródło:** [index.html — sekcja 05-zrodla](../index.html#L465)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Definicja**

Do tej pory poznaliśmy Observable, które same dostarczały nam wartości: HTTP i interval. Ale co, jeśli chcemy samodzielnie decydować, kiedy pojawi się nowa wartość? Możemy wykorzystać Subject.

Na ekranie: tylko const subject$ = new Subject&lt;number&gt;(), pusty kafelek Subject i dwaj odbiorcy A/B bez subskrypcji. Pełny kod odbiorców (na slajdzie tylko jako migawki): const subA = subject$.subscribe({ next: value =&gt; console.log('A', value), error: err =&gt; console.error('A', err) }); i tak samo subB. Cel: 60–75 s.

#### `subscribed-a`

**1 — A subskrybuje**

Pierwszy odbiorca subskrybuje Subject. Przekazuje dwie funkcje: jedną dla kolejnych wartości, drugą na wypadek błędu.

Migawka const subA = subject$.subscribe({ next, error }); impuls biegnie od A do Subjecta, w Subject powstaje wiersz A. Nic jeszcze nie zostało wyemitowane. Odbiorcy: 1.

#### `subscribed-b`

**2 — B subskrybuje**

B robi dokładnie to samo. Subject ma teraz dwóch odbiorców, ale sam jeszcze niczego nie wysłał.

Wiersze A i B w Subject, inboxy puste. Odbiorcy: 2, Emisje next: 0.

#### `next-1`

**3 — next(1)**

Teraz sami wywołujemy next i przekazujemy jedynkę. Subject rozsyła ją wszystkim aktualnym odbiorcom — A i B dostają tę samą wartość.

Migawka subject$.next(1); kulka 1 pojawia się w Subject i rozdziela na dwa powiadomienia next — jedna emisja, dwóch odbiorców. Emisje next: 1.

#### `next-2`

**4 — next(2)**

I jeszcze raz: next(2). Next może wystąpić dowolnie wiele razy — tak jak w interval.

A i B mają 1, 2. Obie subskrypcje nadal trwają.

#### `error`

**5 — error()**

Do tej pory pokazywaliśmy zwykłe wartości. Ale Observable może też zakończyć się błędem. Subject pozwala nam ręcznie wywołać error, podobnie jak wcześniej next. Zwróćcie uwagę: obaj odbiorcy dostają informację o błędzie i ich subskrypcje się kończą.

Migawka subject$.error(new Error('Boom')); czerwony błysk w wierszach Subject i czerwone impulsy do A i B — bez kulki, bo error nie jest wartością next, tylko osobnym, terminalnym powiadomieniem. Wiersze Subject, A i B przechodzą w × error, Odbiorcy: 0. Nie ma complete ani unsubscribe. Obaj odbiorcy mają funkcję error, więc w prawdziwym kodzie błąd jest obsłużony, a nie zgłoszony jako nieobsłużony wyjątek.

#### `next-after-error`

**6 — next(3) po błędzie**

Spróbujmy jeszcze wysłać trójkę. Nic się nie dzieje. Error zakończył tego Subjecta — nie możemy już kontynuować jego emisji.

Szara migawka subject$.next(3) gaśnie bez skutku: żadnej kulki, impulsu, nowych wierszy ani subskrypcji. A i B nadal pokazują 1, 2 i × error. Emisje next: 2.

#### `finished`

**7 — Podsumowanie**

Mamy więc trzy rodzaje powiadomień: next, complete i error. Next może wystąpić wielokrotnie, ale complete i error kończą strumień. Wcześniej widzieliśmy też unsubscribe, które jest rezygnacją z subskrypcji, a nie kolejnym powiadomieniem.

Później zobaczymy, co zrobić, żeby błąd pojedynczego requestu nie zakończył całego nasłuchiwania.

Na ekranie: A i B — 1, 2, × error; Subject zakończony błędem; next(3) nie dotarło. To nie jest jeszcze lekcja obsługi błędów — catchError pokażemy później. Prawo: Operator to funkcja.

### Bazowe notatki sekcji — kontekst do weryfikacji

**HTTP — pierwszy slajd części właściwej:** Najpierw istnieje tylko definicja http.get('/api/data'). Samo jej utworzenie nie wysyła requestu. Subscribe dodaje odbiorcę; impuls biegnie do HTTP i uruchamia pracę. Zatrzymaj się przy request, potem przy next. Complete jest osobną notyfikacją po odpowiedzi. Przykład dotyczy cold HTTP, nie już uruchomionego Promise.

**interval — na żywo:** Na wejściu jest tylko definicja interval(1000); nic nie emituje. Pierwsze prawo: .subscribe() tworzy wykonanie A. Od tej chwili interval emituje 0, 1, 2, 3… co sekundę i sam się nie kończy — mów, ile chcesz, licznik biegnie. Drugie prawo: .unsubscribe() A; szary impuls × biegnie od odbiorcy do interval, emisje ustają, nie ma complete. Trzecie prawo przechodzi dalej. Lewo cofa o etap; po wyjściu ze slajdu wykonanie jest sprzątane i po powrocie zaczyna od zera.

**Subject — ręczna emisja (05-zrodla-5):** trzeci slajd techniczny, po interval i przed „Operator to funkcja”: next(1), next(2) i error do odbiorców A/B, potem next(3) bez skutku — notatki per checkpoint w szablonie poniżej.

**Subject (05-zrodla-3):** ręczny multicast HTTP do pól widoku z Cold ma własne notatki per checkpoint w szablonie poniżej.

**Subject + interval (05-zrodla-4):** „kto odłączy źródło?”, po share() + HTTP i przed share() + interval — notatki per checkpoint w szablonie poniżej.

**Sterowanie wprowadzeniem:** Prawo uruchamia lub kończy etap, lewo cofa checkpoint także w AUTO. Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany początek, U pokazuje sterowanie.

## 4. Operator to funkcja

**ID:** `04-operator`  
**Źródło:** [index.html — sekcja 04-operator](../index.html#L421)

### Notatki wspólne sekcji — wyświetlane w prezentacji

**Definicja:** Operator dostaje Observable i zwraca Observable. map(project) tworzy funkcję operatora przekazaną do pipe. Pipe wywołuje te funkcje podczas składania definicji; nie jest uczestnikiem późniejszego przepływu wartości.

**Początek:** of(1, 2, 3) definiuje trzy osobne emisje liczb: 1, 2, 3. READY pokazuje tylko nagłówek of(1, 2, 3) — definicję. Pierwsze prawo łagodnie odsłania pipe z map w kodzie i nagłówek map w diagramie. Samo pipe nie uruchamia źródła.

**Wykonanie:** Subscribe tworzy wykonanie A: pojawia się odbiorca A, a pod nagłówkami map i of(1, 2, 3) rosną wiersze A, gdy subskrypcja do nich dociera. Subskrypcja biegnie upstream, wartości i complete downstream.

**Pierwsza wartość:** Źródło emituje 1. map(x =&gt; x * 2) podwaja tę wartość, a odbiorca dostaje 2. Kolejne emisje 2 i 3 dają wyniki 4 i 6. Nie ma zagnieżdżonego map. of, projekcja i dostarczenie są synchroniczne. Przeloty i postoje spowalniają wyłącznie ilustrację. Kulka zatrzymuje się w wierszu map i zmienia 1 w 2.

**Dalej:** AUTO pokazuje 2 → 4, 3 → 6 i complete bieżącego wykonania; w wierszu odbiorcy A zostają kulki 2/4/6, wiersze wykonania zielenieją, nagłówki definicji się nie zmieniają. Definicję Observable można subskrybować ponownie.

**Pilot:** Prawo uruchamia etap, ponowne prawo kończy go. Lewo cofa checkpoint także w AUTO; Spacja pauzuje/wznawia, M wybiera tryb, R przywraca zatrzymany początek, U pokazuje sterowanie.

## 5. Cold: jedna definicja, trzy wykonania

**ID:** `04a-dwa-tory`  
**Źródło:** [index.html — sekcja 04a-dwa-tory](../index.html#L434)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Wprowadzenie**

Wyobraźmy sobie widok aplikacji, w którym trzy niezależne komponenty potrzebują danych tego samego użytkownika. Jeden wyświetla imię, drugi nazwisko, trzeci miasto.

Na ekranie: jedna definicja user$ = http.get&lt;User&gt;('/api/users/42') i trzy puste pola widoku. Nic jeszcze nie działa — sama definicja nie wysyła requestu.

#### `first`

**1 — Pierwsza subskrypcja**

Każdy z nich subskrybuje ten sam Observable. Pierwszy uruchamia HTTP.

A (user.firstName) subskrybuje user$; w HTTP GET pojawia się wiersz wykonania A, licznik: 1 request. Możesz zapytać, co się stanie, gdy subskrybuje drugie pole.

#### `requests`

**2 — Kolejne subskrypcje**

Drugi też uruchamia HTTP, a trzeci robi dokładnie to samo.

B i C subskrybują chwilę później (C 200 ms po B); w HTTP GET są trzy wiersze wykonań, wszystkie trzy requesty trwają jednocześnie. Licznik: 3 requesty.

#### `received`

**3 — Wyniki**

Każdy request zwraca cały obiekt użytkownika. Komponenty wyciągają z niego tylko potrzebne pola. Na ekranie wszystko wygląda poprawnie.

Kulka „{…}” to cały obiekt User { firstName, lastName, city } — HTTP nie emituje osobno imienia, nazwiska i miasta. Pola pokazują: Paweł, Kondraciuk, Białystok.

#### `finished`

**4 — Podsumowanie**

Trzy miejsca w widoku potrzebują tych samych danych. Wszystko działa, ale backend dostaje trzy identyczne requesty. Spróbujmy wykonać tylko jeden.

Jedna definicja Observable, trzy niezależne wykonania — każde kończy się własnym complete. Prawo: Subject — ręczny multicast HTTP.

### Bazowe notatki sekcji — kontekst do weryfikacji

**Tory wykonania:** nagłówek kafelka to definicja, wiersz pod nim — wykonanie (tor A, B, C). Stan czytamy z tła wiersza: bazowe — trwa, zielone — complete tej subskrypcji, szare — unsubscribe. Complete przebiega po kablu zielonym impulsem, unsubscribe — szarym impulsem ×.

**Warianty tej sekcji mają własne notatki per checkpoint w szablonach poniżej:** Cold (04a-dwa-tory: trzy pola widoku user$, trzy requesty), share() + HTTP (04a-dwa-tory-2: te same pola A/B/C, jeden request) i share() + interval (04a-dwa-tory-3: odpowiednik Subject + interval — ostatni odbiorca odłącza źródło, bez complete).

## 6. Subject: ręczny multicast HTTP

**ID:** `05-zrodla-3`  
**Źródło:** [index.html — sekcja 05-zrodla](../index.html#L465)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Wprowadzenie**

Wracamy do Subjecta, który poznaliśmy na początku. Tym razem nie wywołujemy next ręcznie — obiekt użytkownika pobierzemy z HTTP. Pamiętacie Cold: trzy komponenty, trzy subskrypcje i trzy identyczne requesty. Tutaj ci sami trzej odbiorcy są już podłączeni do jednego Subjecta.

Na ekranie: kod to tylko const subject$ = new Subject&lt;User&gt;(). Subject stoi na środku, a po lewej pojawi się HTTP GET. A, B i C już subskrybują Subject, pola są puste, HTTP nie jest podłączony. Requesty: 0.

#### `connect-http`

**1 — Podłączamy HTTP**

Widzieliśmy, że Subject potrafi sam emitować wartości przez next(), ale nie musimy robić tego ręcznie. Jest również Observerem, więc możemy przekazać go bezpośrednio do subscribe innego Observable.

Migawka: http.get&lt;User&gt;('/api/users/42').subscribe(subject$). Impuls biegnie od Subjecta do HTTP — to osobna subskrypcja (#1), nie subskrypcja A, B ani C.

#### `request`

**2 — HTTP pracuje**

Dopiero teraz rusza HTTP. Zwróćcie uwagę: jeden request, niezależnie od liczby odbiorców Subjecta.

#### `received`

**3 — HTTP emituje User**

Backend zwraca jeden obiekt użytkownika. HTTP emituje go do Subjecta.

#### `multicast`

**4 — Subject rozsyła wartość**

Subject rozsyła tę samą wartość wszystkim trzem odbiorcom. Każdy dostaje cały obiekt, ale wyświetla tylko potrzebne pole.

#### `complete`

**5 — Complete**

HTTP kończy się, a Subject przekazuje complete wszystkim odbiorcom.

#### `finished`

**6 — Podsumowanie**

Ten sam efekt w widoku, ale zamiast trzech requestów mamy jeden. Subject potrafi rozesłać wynik jednego HTTP do wielu odbiorców. Ale sami musieliśmy podłączyć źródło. Czy RxJS może zrobić to za nas?

Prawo: share() — ten sam przykład, bez ręcznego podłączania.

### Bazowe notatki sekcji — kontekst do weryfikacji

**HTTP — pierwszy slajd części właściwej:** Najpierw istnieje tylko definicja http.get('/api/data'). Samo jej utworzenie nie wysyła requestu. Subscribe dodaje odbiorcę; impuls biegnie do HTTP i uruchamia pracę. Zatrzymaj się przy request, potem przy next. Complete jest osobną notyfikacją po odpowiedzi. Przykład dotyczy cold HTTP, nie już uruchomionego Promise.

**interval — na żywo:** Na wejściu jest tylko definicja interval(1000); nic nie emituje. Pierwsze prawo: .subscribe() tworzy wykonanie A. Od tej chwili interval emituje 0, 1, 2, 3… co sekundę i sam się nie kończy — mów, ile chcesz, licznik biegnie. Drugie prawo: .unsubscribe() A; szary impuls × biegnie od odbiorcy do interval, emisje ustają, nie ma complete. Trzecie prawo przechodzi dalej. Lewo cofa o etap; po wyjściu ze slajdu wykonanie jest sprzątane i po powrocie zaczyna od zera.

**Subject — ręczna emisja (05-zrodla-5):** trzeci slajd techniczny, po interval i przed „Operator to funkcja”: next(1), next(2) i error do odbiorców A/B, potem next(3) bez skutku — notatki per checkpoint w szablonie poniżej.

**Subject (05-zrodla-3):** ręczny multicast HTTP do pól widoku z Cold ma własne notatki per checkpoint w szablonie poniżej.

**Subject + interval (05-zrodla-4):** „kto odłączy źródło?”, po share() + HTTP i przed share() + interval — notatki per checkpoint w szablonie poniżej.

**Sterowanie wprowadzeniem:** Prawo uruchamia lub kończy etap, lewo cofa checkpoint także w AUTO. Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany początek, U pokazuje sterowanie.

## 7. share(): jedno HTTP, trzech odbiorców

**ID:** `04a-dwa-tory-2`  
**Źródło:** [index.html — sekcja 04a-dwa-tory](../index.html#L434)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Definicja**

Ten sam przykład co w Cold: user$ = http.get&lt;User&gt;('/api/users/42'), ale z jednym dodatkiem — .pipe(share()). I ci sami trzej odbiorcy: imię, nazwisko i miasto.

Na ekranie: kod, nagłówki HTTP GET i share() oraz trzy puste pola widoku. Nic jeszcze nie działa, Requesty HTTP: 0. Cel: 45–60 s.

#### `subscribed-a`

**1 — A subskrybuje**

A subskrybuje jako pierwszy. Share automatycznie subskrybuje HTTP i uruchamia request — nie podłączamy niczego ręcznie, jak przy Subjecie.

Impuls .subscribe() A biegnie przez share() do HTTP; powstaje wspólne wykonanie #1 (fioletowe — uruchomił je A, zarządza nim share). Requesty HTTP: 1.

#### `joined`

**2 — B i C dołączają**

Teraz dołączają B i C. Zobaczcie, że ich subskrypcje kończą się na share. HTTP nadal wykonuje się tylko raz.

W share() są trzy wiersze, HTTP ma nadal jeden wiersz i ten sam postęp. Wszyscy subskrybują tę samą instancję user$ przed odpowiedzią — share() nie buforuje wartości.

#### `multicast`

**3 — HTTP emituje User**

Przychodzi wynik z serwera. Share rozsyła ten sam obiekt do wszystkich trzech odbiorców, dokładnie tak jak wcześniej Subject.

Jedna kulka „{…}” (cały User) dociera do share() i wychodzi jako trzy identyczne kulki. Pola: Paweł, Kondraciuk, Białystok.

#### `complete`

**4 — Complete**

I gotowe. Jeden request zamiast trzech, bez ręcznego podłączania Subjecta do HTTP.

Zielony impuls complete przechodzi z HTTP przez share() do A, B i C.

#### `finished`

**Stan końcowy**

Share współdzieli request automatycznie. Ale współdzielenie to nie wszystko. Co dzieje się ze źródłem, gdy odbiorcy rezygnują?

Requesty HTTP: 1, odbiorcy: 3. Prawo: Subject + interval.

### Bazowe notatki sekcji — kontekst do weryfikacji

**Tory wykonania:** nagłówek kafelka to definicja, wiersz pod nim — wykonanie (tor A, B, C). Stan czytamy z tła wiersza: bazowe — trwa, zielone — complete tej subskrypcji, szare — unsubscribe. Complete przebiega po kablu zielonym impulsem, unsubscribe — szarym impulsem ×.

**Warianty tej sekcji mają własne notatki per checkpoint w szablonach poniżej:** Cold (04a-dwa-tory: trzy pola widoku user$, trzy requesty), share() + HTTP (04a-dwa-tory-2: te same pola A/B/C, jeden request) i share() + interval (04a-dwa-tory-3: odpowiednik Subject + interval — ostatni odbiorca odłącza źródło, bez complete).

## 8. Subject — kto odłączy źródło?

**ID:** `05-zrodla-4`  
**Źródło:** [index.html — sekcja 05-zrodla](../index.html#L465)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Wszyscy odbierają**

Wracamy na chwilę do Subjecta. Zamiast HTTP bierzemy dobrze już znany interval — źródło, które samo się nie kończy. Mamy trzech odbiorców i jedno wspólne źródło, podłączone ręcznie.

Na ekranie: slajd startuje już działający — connection = interval(1000).subscribe(subject$) (tor #1) oraz A, B i C podłączeni do Subjecta. Liczby lecą co sekundę, możesz mówić dowolnie długo. Prawo: subA.unsubscribe(). Cel: 45–60 s.

#### `unsub-a`

**1 — A unsubscribe**

Pierwszy odbiorca rezygnuje. Jego subskrypcja się kończy, ale pozostali nadal dostają wartości.

Szary impuls × biegnie od A tylko do Subjecta, wiersz A szarzeje. A zachowuje ostatnią liczbę. Interval i tor #1 bez zmian.

#### `unsub-b`

**2 — B unsubscribe**

Drugi też się odłącza. Interval nadal działa, bo mamy jeszcze trzeciego odbiorcę. Na razie wszystko wygląda rozsądnie.

#### `unsub-c`

**3 — C unsubscribe**

Teraz odłączamy ostatniego. I jak myślicie, co powinno się wydarzyć ze źródłem?

Poczekaj na odpowiedzi. Na ekranie widać już odpowiedź: kolejne liczby nadal dochodzą do Subjecta.

#### `source`

**4 — Interval nadal pracuje**

Wszyscy odbiorcy już się odłączyli. Ale zobaczcie — interval nadal emituje wartości. Subject ciągle je odbiera, chociaż nikogo już nimi nie powiadamia.

Na ekranie: w kodzie wyróżnione interval(1000).subscribe(subject$), liczby gasną na wejściu Subjecta, licznik emisji rośnie. Emisje trwają, dopóki nie naciśniesz prawo — możesz poczekać kilka wartości. Prawo: connection.unsubscribe().

#### `connection`

**5 — connection.unsubscribe()**

Bo mamy jeszcze jedną subskrypcję, którą sami stworzyliśmy. To połączenie interval z Subjectem. I dopiero teraz ręcznie je odłączamy.

Na ekranie: migawka connection.unsubscribe() nad połączeniem, szary impuls × biegnie od Subjecta do interval, wiersz #1 szarzeje. Bez complete — Subject pozostaje otwarty.

#### `finished`

**Podsumowanie — źródło zatrzymane**

W Subject wszyscy się odłączyli, ale interval nadal pracował — dopóki sami nie wywołaliśmy connection.unsubscribe(). Subject nadal istnieje, nie dostał complete. Zobaczmy, co zrobi share w dokładnie tej samej sytuacji.

Prawo: następny slajd — share() + interval.

### Bazowe notatki sekcji — kontekst do weryfikacji

**HTTP — pierwszy slajd części właściwej:** Najpierw istnieje tylko definicja http.get('/api/data'). Samo jej utworzenie nie wysyła requestu. Subscribe dodaje odbiorcę; impuls biegnie do HTTP i uruchamia pracę. Zatrzymaj się przy request, potem przy next. Complete jest osobną notyfikacją po odpowiedzi. Przykład dotyczy cold HTTP, nie już uruchomionego Promise.

**interval — na żywo:** Na wejściu jest tylko definicja interval(1000); nic nie emituje. Pierwsze prawo: .subscribe() tworzy wykonanie A. Od tej chwili interval emituje 0, 1, 2, 3… co sekundę i sam się nie kończy — mów, ile chcesz, licznik biegnie. Drugie prawo: .unsubscribe() A; szary impuls × biegnie od odbiorcy do interval, emisje ustają, nie ma complete. Trzecie prawo przechodzi dalej. Lewo cofa o etap; po wyjściu ze slajdu wykonanie jest sprzątane i po powrocie zaczyna od zera.

**Subject — ręczna emisja (05-zrodla-5):** trzeci slajd techniczny, po interval i przed „Operator to funkcja”: next(1), next(2) i error do odbiorców A/B, potem next(3) bez skutku — notatki per checkpoint w szablonie poniżej.

**Subject (05-zrodla-3):** ręczny multicast HTTP do pól widoku z Cold ma własne notatki per checkpoint w szablonie poniżej.

**Subject + interval (05-zrodla-4):** „kto odłączy źródło?”, po share() + HTTP i przed share() + interval — notatki per checkpoint w szablonie poniżej.

**Sterowanie wprowadzeniem:** Prawo uruchamia lub kończy etap, lewo cofa checkpoint także w AUTO. Spacja pauzuje/wznawia, M zmienia tryb, R przywraca zatrzymany początek, U pokazuje sterowanie.

## 9. share() — kto odłączy źródło?

**ID:** `04a-dwa-tory-3`  
**Źródło:** [index.html — sekcja 04a-dwa-tory](../index.html#L434)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Wszyscy odbierają**

Dokładnie ta sama sytuacja: interval, trzech odbiorców i jedno wspólne źródło. Zmienia się jedna linia: const shared$ = interval(1000).pipe(share()). Nie ma ręcznego connection.

Na ekranie: slajd startuje już działający — share() subskrybuje interval (tor #1), A, B i C odbierają co sekundę. Prawo: subA.unsubscribe(). Cel: 45–60 s.

#### `unsub-a`

**1 — A unsubscribe**

A rezygnuje. Tak jak w Subject, jego subskrypcja kończy się na share(). B i C nadal odbierają, interval pracuje.

Szary impuls × biegnie od A tylko do share(), wiersz A szarzeje, A zachowuje ostatnią liczbę.

#### `unsub-b`

**2 — B unsubscribe**

B też się odłącza. Został jeszcze C, więc share() nadal trzyma subskrypcję interval.

Zapytaj: co się stanie, gdy odejdzie ostatni odbiorca? W Subject interval pracował dalej.

#### `unsub-c`

**3 — C unsubscribe**

Odłącza się ostatni odbiorca. Tym razem impuls nie zatrzymuje się na share(): nikt już nie słucha, więc share() sam odłącza upstream i interval przestaje emitować.

Szary impuls × przechodzi od C przez share() aż do interval, wiersz #1 szarzeje, licznik emisji staje. Bez complete — to unsubscribe, nie zakończenie strumienia.

#### `finished`

**Podsumowanie — share() sprząta sam**

Share umie odłączyć źródło, kiedy ostatni odbiorca odchodzi. A czy pamięta wyniki zakończonych requestów?

Prawo: wracamy do HTTP — późny odbiorca share().

### Bazowe notatki sekcji — kontekst do weryfikacji

**Tory wykonania:** nagłówek kafelka to definicja, wiersz pod nim — wykonanie (tor A, B, C). Stan czytamy z tła wiersza: bazowe — trwa, zielone — complete tej subskrypcji, szare — unsubscribe. Complete przebiega po kablu zielonym impulsem, unsubscribe — szarym impulsem ×.

**Warianty tej sekcji mają własne notatki per checkpoint w szablonach poniżej:** Cold (04a-dwa-tory: trzy pola widoku user$, trzy requesty), share() + HTTP (04a-dwa-tory-2: te same pola A/B/C, jeden request) i share() + interval (04a-dwa-tory-3: odpowiednik Subject + interval — ostatni odbiorca odłącza źródło, bez complete).

## 10. share: późny odbiorca uruchamia HTTP

**ID:** `20-sharereplay`  
**Źródło:** [index.html — sekcja 20-sharereplay](../index.html#L636)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Definicja**

Wracamy do HTTP. Wiemy już, że share współdzieli jedno aktywne wykonanie i sprząta po ostatnim odbiorcy. Ale co stanie się, jeśli drugi odbiorca pojawi się dopiero po zakończeniu requestu?

#### `subscribed-a`

**1 — A subskrybuje**

A subskrybuje jako pierwszy. Share uruchamia HTTP.

#### `received-a`

**2 — HTTP #1 emituje 42**

HTTP zwraca 42, a A otrzymuje wynik.

#### `complete-a`

**3 — HTTP #1 complete**

Request się zakończył. Share domyślnie resetuje swoje współdzielenie po complete.

#### `subscribed-b`

**4 — Późny odbiorca B**

Teraz pojawia się B. Czy dostanie wynik, który przed chwilą otrzymał A? Nie. Share nie pamięta ostatniej wartości.

#### `complete-b`

**5 — HTTP #2**

Zamiast tego powstaje drugie wykonanie HTTP. Ta sama definicja Observable, ale nowy request.

#### `finished`

**6 — Stan końcowy**

Obaj dostali 42, ale zwykły share uruchomił drugi request. A gdyby operator zapamiętał poprzednią wartość?

Prawo: shareReplay.

### Bazowe notatki sekcji — kontekst do weryfikacji

**share:** Tory jak w cold/Subject: HTTP GET → share() → A/B. A uruchamia HTTP #1, które zwraca 42 i kończy się. Domyślny share resetuje po complete, więc późny B uruchamia HTTP #2 — ta sama definicja, drugie wykonanie, dwa requesty.

**shareReplay:** Tory jak w share, z kieszenią „bufor” pod shareReplay(1). Jedno HTTP; 42 trafia do A i do bufora. Po complete bufor zostaje — refCount: true nie usuwa wyniku zakończonego źródła. Późny B dostaje 42 z bufora, bez nowego requestu. To semantyka RxJS 7.8.2, nie pełna polityka cache ani TTL.

**Przejście:** Wiemy już, kiedy wykonuje się praca i jak ją współdzielić. Teraz map zwróci Observable: kto będzie decydował, kiedy uruchomić jego pracę?

## 11. shareReplay: późny odbiorca dostaje wynik

**ID:** `20-sharereplay-2`  
**Źródło:** [index.html — sekcja 20-sharereplay](../index.html#L636)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Definicja, pusty bufor**

Przed chwilą widzieliśmy, że przy zwykłym share() późny odbiorca uruchamia nowy request. A co jeśli chcemy zachować ostatnią wartość?

#### `subscribed-a`

**1 — A subskrybuje**

A subskrybuje jako pierwszy i uruchamia HTTP.

#### `request`

**2 — HTTP pracuje**

Request trwa, ale zwróćcie uwagę, że shareReplay ma dodatkową odpowiedzialność — potrafi zapamiętać wynik.

#### `stored`

**3 — 42 do A i do bufora**

HTTP zwraca 42. Ta wartość trafia do odbiorcy A, ale jednocześnie zostaje zapisana w buforze operatora.

#### `complete-a`

**4 — Complete**

Request się kończy, ale zapamiętana wartość zostaje.

#### `subscribed-b`

**5 — Późny odbiorca B**

Dopiero teraz pojawia się B. To jest późny odbiorca.

#### `replayed`

**6 — 42 z bufora**

B dostaje wartość od razu z bufora. Nie uruchamiamy nowego HTTP.

#### `finished`

**7 — Stan końcowy**

I to jest kluczowa różnica względem share(): jeden request, a późny odbiorca nadal dostaje wynik. Jeśli chcemy pamiętać ostatnie emisje, wtedy sięgamy po shareReplay().

### Bazowe notatki sekcji — kontekst do weryfikacji

**share:** Tory jak w cold/Subject: HTTP GET → share() → A/B. A uruchamia HTTP #1, które zwraca 42 i kończy się. Domyślny share resetuje po complete, więc późny B uruchamia HTTP #2 — ta sama definicja, drugie wykonanie, dwa requesty.

**shareReplay:** Tory jak w share, z kieszenią „bufor” pod shareReplay(1). Jedno HTTP; 42 trafia do A i do bufora. Po complete bufor zostaje — refCount: true nie usuwa wyniku zakończonego źródła. Późny B dostaje 42 z bufora, bez nowego requestu. To semantyka RxJS 7.8.2, nie pełna polityka cache ani TTL.

**Przejście:** Wiemy już, kiedy wykonuje się praca i jak ją współdzielić. Teraz map zwróci Observable: kto będzie decydował, kiedy uruchomić jego pracę?

## 12. A jeśli wartością jest Observable?

**ID:** `08-map-strumienie`  
**Źródło:** [index.html — sekcja 08-map-strumienie](../index.html#L521)

### Notatki wspólne sekcji — wyświetlane w prezentacji

**Pytanie:** A$ pracuje, B$/C$ czekają — ile HTTP działa? Jeden.

**map:** Kulka A zmienia się w A$: map tworzy zimne HTTP Observable, bez rozpoczęcia requestu. Wiersze #1 · A$, #2 · B$, #3 · C$ pojawiają się po dotarciu referencji do concatAll. W KOLEJCE · Observable oznacza już utworzony inner, ale bez portów, subskrypcji i progressu.

**concatAll:** Subskrybuje po kolei: A$ → B$ → C$.

**Różnica:** concatAll kolejkuje Observable; concatMap wartości przed projekcją.

**Przejście:** To kluczowy pomost do concatMap na następnym slajdzie. Na oba przykłady przeznacz około 3 minut.

## 13. concatMap — Po kolei

**ID:** `09-concatmap`  
**Źródło:** [index.html — sekcja 09-concatmap](../index.html#L527)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Start**

Teraz dochodzimy do operatorów, które dla każdej wartości mogą uruchomić osobną pracę. Funkcja projekcji zwraca Observable, a operator decyduje, kiedy go zasubskrybować.

Na górze jest jeden pipeline: source$ → concatMap → S1. Na dole, w PRACACH WEWNĘTRZNYCH, każda wartość ma identyfikator #1 · A, #2 · B, #3 · C, a każde uruchomione inner Observable to osobny, znany już pipeline: własny kafelek HTTP GET i własny inbox — osobna wewnętrzna subskrypcja.

#### `subscribe`

**1 — subscribe()**

Wywołujemy subscribe: S1 subskrybuje concatMap, a concatMap — source$. To jedna główna subskrypcja; nie powstaje nowa dla każdej wartości.

#### `first`

**2 — A dociera**

Źródło emituje A. concatMap nic nie czeka, więc wywołuje projekcję: id =&gt; http.get(url(A)). Projekcja tylko tworzy Observable — request jeszcze nie ruszył.

#### `active`

**3 — HTTP A**

Obok #1 · A stoi własny kafelek HTTP GET. Inbox po prawej to wewnętrzny subskrybent concatMap: dopiero jego subskrypcja uruchamia HTTP A. Postęp wypełnia lane pod nagłówkiem.

#### `question`

**4 — A pracuje, przychodzi B**

A już wykonuje HTTP. Przychodzi B. Co teraz? Uruchomimy drugi request czy poczekamy?

Nie podpowiadaj: #2 · B ma tylko identyfikator i znak zapytania — nie ma jeszcze kafelka HTTP GET.

#### `answer`

**5 — Odpowiedź: kolejka**

concatMap kolejkowuje B. Dopóki A się nie skończy, nie wywołujemy nawet projekcji dla B.

„w kolejce” to wartość B, nie Observable: brak kafelka HTTP GET, inboxa, portów i progressu. Dalej odtwarza się samo.

#### `finished`

**6 — Wynik**

A complete → dopiero teraz projekcja B: placeholder zamienia się w nowy kafelek HTTP GET z własnym inboxem. C przychodzi, gdy nic nie czeka, i od razu dostaje swój HTTP.

Wyniki A, B, C w kolejności wejść. Koszt: B czekało na całe A.

**Zastosowanie:** Kolejkowanie zapisów, gdy kolejność jest ważna — np. kolejne zapisy formularza (autosave) muszą dotrzeć na serwer w tej samej kolejności, w jakiej powstały.

### Bazowe notatki sekcji — kontekst do weryfikacji

**Porównanie:** concatMap otwiera serię czterech slajdów z tym samym problemem: A pracuje długo, B przychodzi w połowie, C po zakończeniu A. Tylko tutaj pokazujemy całą subskrypcję S1.

**Pytanie:** A pracuje, przychodzi B — czekamy czy drugi request? Czekamy: B w kolejce, bez projekcji, inner i HTTP.

**Wniosek:** Jedna praca naraz; kolejność zachowana, kolejka zwiększa opóźnienie.

## 14. mergeMap — Równocześnie

**ID:** `10-mergemap`  
**Źródło:** [index.html — sekcja 10-mergemap](../index.html#L542)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Wprowadzenie**

Zostawiamy identyczną sytuację. A pracuje i pojawia się B. Ale tym razem mamy mergeMap.

S1 już subskrybuje — nie powtarzamy tej animacji. Dalej: A startuje i dochodzi do połowy.

#### `question`

**1 — A pracuje, przychodzi B**

Czy naprawdę musimy czekać na zakończenie A?

#### `answer`

**2 — Odpowiedź: równolegle**

Nie. mergeMap uruchamia oba wewnętrzne Observable równolegle. Wyniki mogą wracać w dowolnej kolejności.

Dwa osobne kafelki HTTP GET: #1 · A i #2 · B, każdy z własnym lane, postępem i inboxem. Dalej odtwarza się samo.

#### `finished`

**3 — Wynik**

B wróciło przed A, bo krótszy request skończył się wcześniej. S1 dostaje wyniki w kolejności nadejścia: B, A, C.

**Zastosowanie:** Niezależne, równoległe requesty HTTP — np. pobranie szczegółów kilku produktów naraz albo wysłanie kilku plików, które nie zależą od siebie.

### Bazowe notatki sekcji — kontekst do weryfikacji

**Porównanie:** Te same A/B/C i ten sam HTTP co w concatMap; S1 jest już zestawione.

**Pytanie:** Czy musimy czekać na A? Nie — drugi inner i drugi HTTP równolegle.

**Wniosek:** B wraca przed A; wyniki w kolejności odpowiedzi, nie wejść.

## 15. switchMap — Najnowsza subskrypcja

**ID:** `11-switchmap`  
**Źródło:** [index.html — sekcja 11-switchmap](../index.html#L554)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Wprowadzenie**

A już pracuje. Teraz przychodzi B.

S1 już subskrybuje — dalej: A startuje i dochodzi do połowy.

#### `question`

**1 — A pracuje, przychodzi B**

Co stanie się z A? Dokończy pracę czy zostanie anulowane?

#### `answer`

**2 — Odpowiedź: anulowanie A**

switchMap odsubskrybowuje poprzednie wewnętrzne Observable i przełącza się na nowe. Główna subskrypcja S1 nadal działa.

Szary × biegnie od inboxa A do HTTP A — to teardown wewnętrznej subskrypcji A: request po stronie klienta przerwany, lane szarzeje, brak complete i brak odpowiedzi A.

#### `started`

**3 — Nowy inner B**

Dopiero teraz projekcja B: nowy kafelek HTTP GET z własnym inboxem. A zostaje widoczne jako anulowane. Dalej odtwarza się samo.

#### `finished`

**4 — Wynik**

S1 dostaje B i C. Anulowane A nie wraca. Pamiętaj: unsubscribe nie cofa operacji na serwerze.

**Zastosowanie:** Pobieranie danych dla aktualnie wybranego użytkownika albo aktualnego wyszukiwania — liczy się tylko najnowsza odpowiedź, starsze nie mogą jej nadpisać.

### Bazowe notatki sekcji — kontekst do weryfikacji

**Porównanie:** Te same A/B/C co w concatMap i mergeMap; S1 jest już zestawione.

**Pytanie:** Co z A? Anulowane: unsubscribe inner A (szary impuls ×), bez complete.

**Pułapka:** ABORT klienta ≠ cofnięcie operacji serwera; unsubscribe ≠ complete. S1 nadal działa.

## 16. exhaustMap — Jestem zajęty

**ID:** `12-exhaustmap`  
**Źródło:** [index.html — sekcja 12-exhaustmap](../index.html#L567)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Wprowadzenie**

A pracuje. Przychodzi B. Poznaliśmy już kolejkowanie, równoległość i anulowanie.

S1 już subskrybuje — dalej: A startuje i dochodzi do połowy.

#### `question`

**1 — A pracuje, przychodzi B**

A co, jeśli nie chcemy teraz przyjmować żadnej kolejnej pracy?

#### `answer`

**2 — Odpowiedź: pominięte**

exhaustMap ignoruje B. Nie uruchamia projekcji, nie tworzy requestu i nie zapisuje B na później: #2 · B ma tylko placeholder „pominięte”, bez kafelka HTTP GET i inboxa. Dopiero po zakończeniu A może przyjąć następną wartość.

Dalej odtwarza się samo.

#### `finished`

**3 — Wynik**

A kończy się normalnie, B nie wraca. C przychodzi po zakończeniu A i dostaje własny kafelek HTTP GET z inboxem. S1 dostaje A i C.

**Zastosowanie:** Ignorowanie kolejnych kliknięć „Zapisz”, dopóki obecny zapis trwa — podwójne kliknięcie nie wyśle dwóch zapisów.

### Bazowe notatki sekcji — kontekst do weryfikacji

**Porównanie:** Te same A/B/C; po kolejkowaniu, równoległości i anulowaniu — ignorowanie.

**Pytanie:** A co, jeśli nie chcemy przyjmować kolejnej pracy? B pominięte: bez projekcji, requestu i kolejki.

**Wniosek:** Po zakończeniu A exhaustMap przyjmuje C.

## 17. distinctUntilChanged — czy coś się zmieniło?

**ID:** `11a-distinct-switchmap`  
**Źródło:** [index.html — sekcja 11a-distinct-switchmap](../index.html#L578)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Gotowy pipeline**

Na koniec wracamy do switchMap. Widzieliśmy, że anuluje poprzedni request, gdy przychodzi nowa wartość. Ale jest pewien problem. Co jeśli ta nowa wartość jest identyczna?

Na ekranie: selectedUserId$.pipe(distinctUntilChanged(), switchMap(...)), S1 już subskrybuje. Pięć emisji A, A, B, B, A. Cel: 60–90 s.

#### `first`

**1 — Pierwsze A**

Wybieramy użytkownika A. Operator przepuszcza pierwszy identyfikator i uruchamiamy HTTP.

Kulka A zostaje w lane distinctUntilChanged — to jedyna rzecz, którą operator pamięta: ostatnia przepuszczona wartość.

#### `question`

**2 — Drugie A: pytanie**

HTTP jeszcze trwa, a my ponownie wybieramy A. Sam switchMap anulowałby poprzedni request i uruchomił go jeszcze raz. Czy naprawdę tego chcemy?

#### `answer`

**2 — Drugie A: odpowiedź**

distinctUntilChanged pamięta ostatnią przepuszczoną wartość. A jest równe A, więc niczego nie emituje dalej. HTTP może spokojnie pracować.

#### `switched`

**3 — Pierwsze B**

Teraz wybieramy B. To już zmiana, więc wartość przechodzi do switchMap. Poprzedni HTTP zostaje anulowany i startuje nowy.

Kulka w pamięci operatora zmienia się z A na B.

#### `repeat-b`

**4 — Drugie B**

Drugie B ponownie zostaje odrzucone. Nie przerywamy wykonywanego requestu.

#### `again-a`

**5 — Ponowne A**

A teraz znowu wybieramy A. I uwaga: tym razem wartość przechodzi. distinctUntilChanged porównuje ją z ostatnim B, a nie ze wszystkimi wartościami z historii.

#### `finished`

**6 — Wynik**

Pięć emisji, trzy requesty. distinctUntilChanged nie jest cache'em — po prostu nie przepuszcza kolejnych identycznych wartości. Umieszczony przed switchMap pozwala uniknąć niepotrzebnych anulowań i requestów.

### Bazowe notatki sekcji — kontekst do weryfikacji

Jeden potok selectedUserId$ → distinctUntilChanged → switchMap → S1; wejścia A, A, B, B, A. Slajd stoi po exhaustMap, zamyka rodzinę *Map. distinctUntilChanged pamięta tylko ostatnią przepuszczoną wartość (jedna kulka w lane operatora), osobno dla każdej subskrypcji, i porównuje przez ===. Powtórzenia gasną w operatorze: bez nowego HTTP i bez anulowania trwającego. Do switchMap trafia A, B, A — 3 requesty zamiast 5. To nie jest cache: A po B przechodzi. 60–90 s.

## 18. catchError wewnątrz

**ID:** `b04-catcherror-2`  
**Źródło:** [index.html — sekcja b04-catcherror](../index.html#L669)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Definicja**

Zobaczmy, co się stanie, gdy HTTP zwróci błąd, ale catchError znajduje się wewnątrz switchMap.

#### `subscribe`

**1 — Subscribe**

Subskrybujemy zewnętrzny strumień kliknięć.

#### `click-a`

**2 — Klik A**

Pierwsze kliknięcie uruchamia wewnętrzny request HTTP.

#### `request`

**3 — Request A**

Request trwa. Zwróćcie uwagę, gdzie umieściliśmy catchError.

#### `error`

**4 — Error**

HTTP zwraca błąd. Ten błąd trafia do catchError wewnątrz konkretnego requestu.

#### `fallback`

**5 — Fallback of([])**

CatchError nie naprawia HTTP. Subskrybuje zastępcze of([]), które emituje pustą tablicę. Inner kończy się poprawnie.

#### `click-b`

**6 — Klik B**

Ale czy cały strumień kliknięć nadal działa? Sprawdźmy. Klikamy ponownie.

#### `finished`

**7 — Sukces B**

I proszę — drugi request działa normalnie. Obsłużyliśmy błąd lokalnie, nie kończąc zewnętrznego Observable.

### Bazowe notatki sekcji — kontekst do weryfikacji

Porównaj położenie catchError: wewnątrz pipe każdego HTTP albo osobny operator za switchMap. Każde kliknięcie tworzy nową subskrypcję http.get(url(id)). W obu wariantach catchError subskrybuje of([]), które emituje i kończy się. Wewnątrz kończy się tylko inner A: kolejne kliknięcie uruchamia HTTP B z własnym catchError i przekazuje wynik B. Na zewnątrz catchError odłącza pierwotny strumień (klik$ i switchMap), a S1 dostaje [] i complete; klik B nie uruchamia HTTP B. Nie sugeruj, że każdy zewnętrzny catchError zawsze kończy wynik: tutaj wynika to z wyboru of([]).

Tryb ręczny: prawo uruchamia kolejny postój, lewo cofa. Klik po ostatnim pytaniu włącza AUTO na tym samym slajdzie. MAIN zatrzymuje wynik; dodatki mogą powtarzać pokaz. W AUTO prawo najpierw pokazuje wynik, a następne przechodzi dalej; lewo wraca do poprzedniego slajdu. M: tryb ręczny/auto, U: sterowanie, A: automat/pauza, R: od początku.

## 19. catchError na zewnątrz

**ID:** `b04-catcherror`  
**Źródło:** [index.html — sekcja b04-catcherror](../index.html#L669)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Start**

Przed chwilą catchError znajdował się wewnątrz switchMap. Teraz przenosimy go na zewnątrz. Zobaczmy, co się zmieni.

#### `click-a`

**1 — HTTP A**

Pierwsze kliknięcie uruchamia request. Na razie zachowanie jest dokładnie takie samo.

#### `error`

**2 — Błąd**

HTTP emituje błąd. Ale wewnątrz nie mamy już catchError, więc błąd propaguje się przez switchMap.

#### `caught`

**3 — Przechwycenie**

Dopiero tutaj łapie go zewnętrzny catchError. Problem polega na tym, że oryginalny strumień zostaje odsubskrybowany.

#### `fallback`

**4 — Fallback**

CatchError przełącza się na zastępcze of([]). Dostajemy pustą tablicę, a potem complete.

#### `click-b`

**5 — Kolejne kliknięcie**

I teraz klikamy ponownie. Nic się nie dzieje. Nie dlatego, że switchMap zignorował kliknięcie, tylko dlatego, że nie mamy już aktywnej subskrypcji kliknięć.

#### `finished`

**6 — Podsumowanie**

CatchError wewnątrz ratuje pojedynczą operację. CatchError na zewnątrz zastępuje cały strumień po błędzie. Samo umiejscowienie operatora zmienia zachowanie aplikacji.

### Bazowe notatki sekcji — kontekst do weryfikacji

Porównaj położenie catchError: wewnątrz pipe każdego HTTP albo osobny operator za switchMap. Każde kliknięcie tworzy nową subskrypcję http.get(url(id)). W obu wariantach catchError subskrybuje of([]), które emituje i kończy się. Wewnątrz kończy się tylko inner A: kolejne kliknięcie uruchamia HTTP B z własnym catchError i przekazuje wynik B. Na zewnątrz catchError odłącza pierwotny strumień (klik$ i switchMap), a S1 dostaje [] i complete; klik B nie uruchamia HTTP B. Nie sugeruj, że każdy zewnętrzny catchError zawsze kończy wynik: tutaj wynika to z wyboru of([]).

Tryb ręczny: prawo uruchamia kolejny postój, lewo cofa. Klik po ostatnim pytaniu włącza AUTO na tym samym slajdzie. MAIN zatrzymuje wynik; dodatki mogą powtarzać pokaz. W AUTO prawo najpierw pokazuje wynik, a następne przechodzi dalej; lewo wraca do poprzedniego slajdu. M: tryb ręczny/auto, U: sterowanie, A: automat/pauza, R: od początku.

## 20. debounceTime i auditTime: cisza czy okno?

**ID:** `16-czas-cztery`  
**Źródło:** [index.html — sekcja 16-czas-cztery](../index.html#L793)

### Notatki per checkpoint — wyświetlane w prezentacji

#### `ready`

**0 — Start**

Mamy dwa operatory, które na pierwszy rzut oka robią podobną rzecz. Oba ograniczają liczbę emisji, ale inaczej traktują czas.

#### `a`

**1 — A**

Przychodzi A. Debounce zaczyna czekać na ciszę, a audit otwiera okno czasowe.

#### `b`

**2 — B**

Przychodzi B. Debounce zaczyna odliczanie od nowa. Audit jedynie zapamiętuje B — jego okno nadal trwa.

#### `c`

**3 — C (pytanie)**

Przychodzi C. Debounce znowu resetuje licznik. Audit zapamiętuje C, ale nie przesuwa końca okna. Jak myślicie, który operator pierwszy coś wyemituje?

#### `audit-c`

**4 — Pierwsze okno audit**

Minęło 3,5 sekundy od początku okna auditTime. Emitujemy ostatnią zapamiętaną wartość, czyli C. Debounce nadal czeka.

#### `d`

**5 — D**

Przychodzą kolejne wartości. Debounce za każdym razem zaczyna liczyć ciszę od nowa. Audit otwiera drugie okno przy D, a E tylko aktualizuje zapamiętaną wartość.

#### `e`

**6 — E**

E: debounce znowu liczy ciszę od nowa, audit tylko aktualizuje zapamiętaną wartość — jego okno nadal kończy się w 7,5 s.

#### `audit-e`

**7 — Drugie okno audit**

Audit emituje E po zakończeniu drugiego okna, mimo że od ostatniej wartości minęło mniej niż 3,5 sekundy.

#### `finished`

**8 — Finał**

Dopiero gdy przez pełne 3,5 sekundy nie przyjdzie nic nowego, debounce emituje E. Czyli debounce czeka na ciszę, a audit wypuszcza ostatnią wartość na końcu okna.

### Bazowe notatki sekcji — kontekst do weryfikacji

**Wspólne porównanie — MAIN:** Dwa potoki jeden pod drugim: zdarzenia$ → debounceTime → S1 i zdarzenia$ → auditTime → S2; te same zdarzenia A 0 s, B 1 s, C 2 s, D 4 s, E 5 s. Timery w wierszach operatorów: debounce zaczyna od nowa przy każdej wartości, audit nie przesuwa końca okna. S2 dostaje C (3,5 s) i E (7,5 s), S1 dopiero E (8,5 s). **debounceTime:** Wyszukiwanie po zakończeniu pisania. W aplikacji zwykle użyjemy znacznie krótszego okresu.

**auditTime — na wspólnym MAIN i samodzielnie w EXTRAS:** Aktualizacja układu podczas resize. Pierwsze wejście otwiera okno; kolejne aktualizują zapamiętaną wartość, bez przesuwania końca okna. Na pierwszym końcu okna odbiorca dostaje D. Audit pozwala aktualizować w trakcie ciągłego ruchu, debounce czeka na przerwę.

**throttleTime i sampleTime — EXTRAS:** Throttle domyślnie przepuszcza pierwszą wartość okna (leading:true, trailing:false). Sample ma stały rytm od subskrypcji i pomija takt bez nowych wejść. Wszystkie źródła pozostają aktywne; nie porównujemy zdarzeń dokładnie na granicy okna.

## 21. Cztery pytania przed kolejnym pipe

**ID:** `25-podsumowanie`  
**Źródło:** [index.html — sekcja 25-podsumowanie](../index.html#L724)

### Notatki wspólne sekcji — wyświetlane w prezentacji

Zakończ pytaniami, które publiczność może zastosować we własnym kodzie. Przywróć tytułową analogię znajomości operatorów.

Tryb ręczny: prawo uruchamia kolejny postój, lewo cofa. Klik po ostatnim pytaniu włącza AUTO na tym samym slajdzie. MAIN zatrzymuje wynik; dodatki mogą powtarzać pokaz. W AUTO prawo najpierw pokazuje wynik, a następne przechodzi dalej; lewo wraca do poprzedniego slajdu. M: tryb ręczny/auto, U: sterowanie, A: automat/pauza, R: od początku.

### Treść kart na slajdzie — uzupełnienie kontekstu

- **Czy trzeba?** — distinctUntilChanged.
- **Kiedy zacząć?** — debounceTime / auditTime.
- **Co z poprzednią pracą?** — concatMap / mergeMap / switchMap / exhaustMap.
- **Czy można współdzielić?** — share / shareReplay.

## Uwagi do weryfikacji — poza oryginalnymi notatkami

1. **Slajd 8 — Subject + interval, checkpoint `unsub-b`:** zdanie „Interval nadal działa, bo mamy jeszcze trzeciego odbiorcę” sugeruje zależność od odbiorców Subjecta. Proponowane brzmienie: „Interval nadal działa. Trzeci odbiorca wciąż dostaje wartości”. O pracy źródła decyduje osobna subskrypcja `connection`.
2. **Slajd 20 — debounceTime i auditTime, bazowe notatki:** akapit opisujący auditTime wspólnie dla MAIN i EXTRAS wskazuje D jako pierwszy wynik. Checkpoint `audit-c` dla MAIN poprawnie wskazuje C. Warto rozdzielić te opisy, ponieważ dotyczą innych zestawów zdarzeń.
3. **Slajd 21 — podsumowanie:** oryginalna notatka zawiera tylko ogólną wskazówkę zakończenia oraz sterowanie. Cztery pytania są treścią kart slajdu, nie rozpisaną wypowiedzią prelegenta.
