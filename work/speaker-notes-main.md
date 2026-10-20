# Speaker notes — RxJS: operatory, które znasz, ale bałeś się zagadać

Pełny eksport notatek z [index.html](../index.html): **40 slajdów MAIN**, od powitania do pytań i feedbacku. Plan 33 tematów jest rozłożony na istniejące slajdy, warianty i checkpointy.

Kolejność części technicznej pochodzi z `mainOrder` w [animations/scene-config.js](../animations/scene-config.js); tytuły wariantów z `prepareSlides`. Otwarcie zachowuje kolejność HTML.

❓ SALA oznacza pytanie do publiczności, ⏸ PAUZA — miejsce na zatrzymanie i komentarz. Notatki checkpointów zastępują notatki bazowe w oknie prelegenta. Na slajdach kodu i podsumowania notatki fragmentów opisują kolejne wyróżnienia i puentę. Wspólne notatki rodzin zawierają także skrót pozostałych wariantów.

Pokazy symulują HTTP. Tam, gdzie rozpiska mówi o User, porównanie późnych odbiorców używa na diagramie wartości 42. W concatMap B czeka w kolejce, a C w tej animacji przychodzi już po zakończeniu B. Trzy pytania podsumowania są do wypowiedzenia; publiczny układ slajdu pozostaje bez zmian.

## Spis slajdów

1. **Społeczność** — `spolecznosc`
2. **Kiedy odbyło się pierwsze spotkanie meet.js w Białymstoku?** — `pierwsze-meetjs-pytanie`
3. **meet.js Białystok #2** — `pierwsze-meetjs-odpowiedz`
4. **JavaScript Białystok #1** — `javascript-bialystok-1`
5. **Historia meet.js Białystok** — `historia-meetjs`
6. **Zawsze gdzieś się przewijałem**
7. **Poprzednie wystąpienia**
8. **RxJS Operatory, które znasz, ale bałeś się zagadać** — `tytul`
9. **HTTP: od definicji do wykonania** — `05-zrodla-2`
10. **httpGet od środka** — `05b-http-kod`
11. **Cold: jedna definicja, trzy wykonania** — `04a-dwa-tory`
12. **interval: strumień bez końca** — `05-zrodla`
13. **Subject — ręczna emisja** — `05-zrodla-5`
14. **Subject: ręczny multicast HTTP** — `05-zrodla-3`
15. **Subject — kto odłączy źródło?** — `05-zrodla-4`
16. **Jakie znasz operatory RxJS?** — `02-znane-operatory`
17. **Operator to funkcja** — `04-operator`
18. **myMap od środka** — `04b-map-kod`
19. **A share?** — `03-a-share`
20. **share(): wspólny request i późny odbiorca** — `04a-dwa-tory-2`
21. **share() — kto odłączy źródło?** — `04a-dwa-tory-3`
22. **shareReplay(1): kto zatrzyma interval?** — `20a-sharereplay-interval`
23. **shareReplay z refCount: kiedy znika bufor?** — `20b-sharereplay-refcount`
24. **shareReplay: późny odbiorca dostaje wynik** — `20-sharereplay-2`
25. **A jeśli wartością jest Observable?** — `08-map-strumienie`
26. **concatMap — Po kolei** — `09-concatmap`
27. **mergeMap — Równocześnie** — `10-mergemap`
28. **switchMap — Najnowsza subskrypcja** — `11-switchmap`
29. **exhaustMap — Jestem zajęty** — `12-exhaustmap`
30. **Zaprojektujmy wyszukiwarkę** — `12-intro-wyszukiwarka`
31. **Źródło: skąd bierze się query$?** — `12-query-zrodlo`
32. **Wybór operatora** — `12a-switchmap-live`
33. **debounceTime — czekamy na ciszę** — `12b-debounce-switchmap`
34. **distinctUntilChanged — znowu to samo?** — `11a-distinct-switchmap`
35. **catchError — wyszukiwarka działa dalej** — `11b-catcherror-search`
36. **catchError na zewnątrz** — `b04-catcherror`
37. **retry — nie udało się? Spróbuj później** — `x03-retry-backoff`
38. **RxJS w prawdziwym kodzie — kto wygrywa?** — `24-rxjs-liczby`
39. **To co, zagadamy do tych operatorów?** — `25-podsumowanie`
40. **Pytania?** — `pytania`

## 1. Społeczność

**ID:** `spolecznosc`

### Notatki bazowe

- Powitanie meet.js Białystok — wracamy do Zmiany Klimatu.
- Lokalna społeczność: Discord meet.js Poland i grupa JavaScript i front-end Białystok. Daj chwilę na zeskanowanie QR.
- WebStorm — zapowiedz konkurs / giveaway; wrócimy do niego na końcu.
- Przejście do pytania: kiedy odbyło się pierwsze spotkanie?

## 2. Kiedy odbyło się pierwsze spotkanie meet.js w Białymstoku?

**ID:** `pierwsze-meetjs-pytanie`

### Notatki bazowe

- ❓ SALA: Kiedy odbyło się pierwsze spotkanie meet.js w Białymstoku?
- Daj chwilę na odpowiedzi. To podchwytliwe pytanie — odpowiedź na następnym slajdzie.

## 3. meet.js Białystok #2

**ID:** `pierwsze-meetjs-odpowiedz`

### Notatki bazowe

- 24 lutego 2015, Zmiana Klimatu — pierwsze spotkanie pod szyldem meet.js, ale numer #2.
- Numer #1 odbył się wcześniej jako JavaScript Białystok. Dalej: początki przed meet.js.

## 4. JavaScript Białystok #1

**ID:** `javascript-bialystok-1`

### Notatki bazowe

- 20 stycznia 2015 — pierwsze spotkanie JavaScript Białystok, jeszcze przed meet.js.
- Angular — Karol Rogowski. Adam Piotrowski, Hubert i znajome twarze na zdjęciach.
- Zmiana Klimatu — dzisiejsze spotkanie to powrót do korzeni.
- Odsłaniaj zdjęcia kolejnymi kliknięciami. Wtedy obcy ludzie, dziś znajome twarze — jak operatorzy z tytułu.

## 5. Historia meet.js Białystok

**ID:** `historia-meetjs`

### Notatki bazowe

- 62 spotkania; numeracja nie opisuje całej historii — początki przed meet.js i odwołane edycje.
- Zmiana Klimatu → SoftwareHut → Instapage i kolejne miejsca. Kolory na osi odpowiadają legendzie.
- Rozwój → COVID → przerwy → powroty.
- Lokalna społeczność, ci sami ludzie przez lata. Cel: regularne spotkania.

## 6. Zawsze gdzieś się przewijałem

**Slajd bez ID w HTML.**

### Notatki bazowe

- Zawsze gdzieś się przewijałem — znajdź mnie na archiwalnych zdjęciach.
- Ci sami ludzie przez lata tworzą lokalną społeczność. Kolejne kliknięcia odsłaniają zdjęcia.

## 7. Poprzednie wystąpienia

**Slajd bez ID w HTML.**

### Notatki bazowe

- Dwa wcześniejsze wystąpienia, około 10 lat temu: mobile development (2016) i redukcja wagi skryptów (2017).
- Programowanie wtedy a AI dzisiaj — wiele się zmieniło.
- Dzisiaj RxJS: praktyczne zachowanie operatorów i decyzje o pracy, kolejności oraz współdzieleniu.

## 8. RxJS Operatory, które znasz, ale bałeś się zagadać

**ID:** `tytul`

### Notatki bazowe

- ❓ SALA: Kto zna RxJS? Kto używa? Kto lubi?
- Asynchroniczne zdarzenia i wartości: kliknięcia, HTTP, WebSocket, timery.
- Źródło → operatory → odbiorca. Emisje w czasie i deklaratywne przetwarzanie.
- Dziś przyglądamy się praktycznemu zachowaniu operatorów. Zaczynamy od HTTP.

## 9. HTTP: od definicji do wykonania

**ID:** `05-zrodla-2`

### Checkpoint `ready`

**0 — Definicja**

- Definicja ≠ wykonanie. http.get() / httpGet() to opis źródła w kliencie HTTP, nie natywny operator RxJS.

Zaczynamy od najprostszego źródła: zapytania HTTP. Wywołujemy httpGet('/api/data') i dostajemy Observable. Czy w tej chwili poszedł już request do serwera?

Na ekranie: tylko kod httpGet('/api/data') i sam nagłówek HTTP GET. Nie ma odbiorcy, połączenia ani wiersza wykonania. To jest wyłącznie definicja — przepis na request, nie request. Prawo: odbiorca. Cel: 30–45 s.

### Checkpoint `receiver`

**1 — Odbiorca**

Ktoś chce te dane wyświetlić — to nasz odbiorca A, na przykład funkcja render. Sam fakt, że odbiorca istnieje, jeszcze niczego nie uruchamia.

Na ekranie: po prawej pojawia się odbiorca z ikoną inbox i literą A. Nic go nie łączy z HTTP GET, kod się nie zmienił. Prawo: subscribe.

### Checkpoint `subscribed`

**2 — Subscribe**

Dopiero subscribe łączy odbiorcę ze źródłem. Subskrypcja biegnie od odbiorcy do HTTP — to odbiorca prosi źródło o wartości.

Na ekranie: w kodzie dopisuje się .subscribe(render), nad diagramem migawka .subscribe() A. Impuls doszedł od A do HTTP GET, powstał wiersz wykonania A, ale postęp jeszcze nie ruszył. Prawo: request.

### Checkpoint `response`

**3 — Request i odpowiedź**

Subskrypcja uruchomiła wykonanie: teraz dopiero poszedł request. Serwer odpowiada, a HTTP emituje wartość — next.

Na ekranie: migawka zgasła, w wierszu HTTP GET przesuwał się postęp requestu; kulka „dane” właśnie wyleciała z HTTP i jest w drodze do A. Prawo: dane docierają.

### Checkpoint `first`

**4 — Odbiorca dostaje dane**

Odbiorca dostał wartość. Czy to już koniec? Nie — HTTP musi jeszcze powiedzieć, że więcej wartości nie będzie.

Na ekranie: kulka „dane” w wierszu A. Wiersze jeszcze nie są zielone — complete nie dotarło. Prawo: complete (AUTO do końca).

### Checkpoint `finished`

**5 — Complete**

Complete jest osobną notyfikacją po odpowiedzi. HTTP emituje jedną wartość i kończy się — subskrypcja zamyka się sama, bez unsubscribe.

Na ekranie: zielony impuls od HTTP GET do A, wiersze zielenieją, przy A ✓ complete (bez napisu w HTTP GET). Przykład dotyczy cold HTTP, nie już uruchomionego Promise. Jak taki httpGet wygląda w środku? Prawo: kod źródłowy httpGet.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- interval(1000) jest cold. A dostaje 0, 1, 2…; późny B zaczyna własne 0, 1, 2… Każdy odbiorca ma osobny timer.
- Źródło jest nieskończone. unsubscribe zatrzymuje tylko własne wykonanie; nie wywołuje complete.
- Kolejne „dalej”: subscribe A (pauza przed emisjami) → emisje A → subscribe B → unsubscribe A → unsubscribe B → następny slajd.
- Daj obu wykonaniom chwilę na emisje. Po odejściu A pokaż, że B nadal odbiera.
- Dalej: Subject — ręczna emisja. Pozostałe warianty źródeł mają osobne notatki checkpointów.

## 10. httpGet od środka

**ID:** `05b-http-kod`

### Notatki bazowe

**0 — Jak działa httpGet?**

- new Observable(subscriber => ...) — funkcja producenta wywoływana przy subskrypcji.
- subscriber.next(value) — dane; subscriber.complete() — koniec; subscriber.error(error) — błąd.
- Ten skrót kodu pokazuje ścieżkę sukcesu; obsługa error nie jest tu zaimplementowana.
- Kierunek: subscribe ←, wartości →.

Zajrzyjmy do środka naszego httpGet — to uproszczona wersja, ale pokazuje wszystko, co przed chwilą widzieliśmy na diagramie: subscribe, request, next i complete.

Na ekranie: cały kod od początku, bez wyróżnień. Każde prawo wyróżnia kolejny fragment: subscriber, fetch i r.json(), subscriber.next(data), complete(); lewo cofa. Cel: 45–60 s.

### Notatki fragmentu

**1 — subscriber**

Funkcja przekazana do new Observable dostaje subscriber — to nasz odbiorca, przez którego wysyłamy powiadomienia. Ta funkcja uruchamia się dopiero przy subscribe, dla każdego subskrybenta osobno. Samo wywołanie httpGet(url) zwraca tylko definicję.

Na ekranie: wyróżnione subscriber w pierwszej linii. Prawo: request.

### Notatki fragmentu

**2 — fetch i r.json()**

Dopiero teraz fetch wysyła request. Gdy przyjdzie odpowiedź, r.json() parsuje treść do obiektu. To jest praca, którą widzieliśmy jako postęp w wierszu HTTP GET.

Na ekranie: wyróżnione fetch i r.json(). Prawo: wartość.

### Notatki fragmentu

**3 — subscriber.next(data)**

Dane trafiają do odbiorcy: subscriber.next(data). To ta sama kulka, która na diagramie przeleciała od HTTP GET do A.

Na ekranie: wyróżnione subscriber.next(data) (niebieskie next). Prawo: zakończenie.

### Notatki fragmentu

**4 — complete()**

Zaraz po next wywołujemy subscriber.complete() — HTTP ma dokładnie jedną wartość, więc od razu mówimy, że więcej nie będzie. To zielony impuls complete z diagramu.

Na ekranie: wyróżnione complete() (zielone). Prawo: Cold — jedna definicja, trzy wykonania.

## 11. Cold: jedna definicja, trzy wykonania

**ID:** `04a-dwa-tory`

### Checkpoint `ready`

**0 — Wprowadzenie**

- A: firstName; B: lastName; C: city.
- Przykład z aplikacji: kilka async pipe subskrybujących ten sam user$ w Angularze.
- ❓ SALA: Ile requestów zobaczy backend? Daj chwilę na odpowiedzi przed uruchomieniem subskrypcji.

Wyobraźmy sobie widok aplikacji. W jednym miejscu wyświetlamy imię użytkownika, w drugim nazwisko, a w trzecim miasto. Wszystkie potrzebują danych tego samego użytkownika.

Na ekranie: jedna definicja user$ = httpGet<User>('/api/users/42') i trzy puste pola widoku. To nasz httpGet z poprzedniego slajdu, tym razem z typem User — każde pole subskrybuje surowy Observable<User>. Nic jeszcze nie działa — sama definicja nie wysyła requestu. Requesty HTTP: 0.

### Checkpoint `requests`

**1 — Subskrypcje**

Mamy jedną definicję user$. Ale każde z tych miejsc niezależnie ją subskrybuje. I co się dzieje? Powstają trzy osobne requesty.

A, B i C subskrybują kolejno (co 250 ms czasu modelu); w HTTP GET powstają trzy wiersze wykonań i wszystkie trzy requesty trwają równolegle. Requesty HTTP: 3. Nie potrzebujemy składni frameworka — zakładamy, że każde pole samo subskrybuje user$ i wyświetla wynik.

### Checkpoint `received`

**2 — Odpowiedzi**

Każdy request wraca osobno. Każde pole dostaje swój własny, identyczny obiekt User i pokazuje z niego swoją właściwość.

Trzy kulki „{…}” (cały User) przyleciały kolejno z trzech wykonań; pola: Paweł, Kondraciuk, Białystok. Wiersze HTTP jeszcze nie są zielone — complete nie dotarło. Requesty HTTP: 3.

### Checkpoint `complete`

**3 — Complete**

- Wykonania są niezależne: każde ma własną odpowiedź i własne zakończenie; błąd jednego nie zakończy pozostałych. Tu wszystkie kończą się sukcesem.

Każde wykonanie kończy się własnym complete. To trzy niezależne wykonania tego samego cold Observable — każde ma własny cykl życia.

Trzy zielone impulsy complete docierają do A, B i C; przy polach pojawia się ✓ complete, wartości zostają.

### Checkpoint `finished`

**4 — Podsumowanie**

Mamy jedną definicję Observable, ale trzy wykonania. Każde ma własną subskrypcję i własny cykl życia. Wszystkie pytają backend o dokładnie tego samego użytkownika. Czy naprawdę musimy wykonywać trzy requesty?

Stan końcowy: A — Paweł, B — Kondraciuk, C — Białystok, wszystkie complete. Observable: 1, Requesty HTTP: 3. Do tego pytania wrócimy. Najpierw źródło, które samo się nie kończy — i też jest cold. Prawo: interval.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Cold: jeden user$, odbiorcy A: firstName, B: lastName, C: city. Trzy subscribe → trzy niezależne HTTP i trzy complete.
- Przykład: kilka async pipe w Angularze. ❓ SALA: Ile requestów zobaczy backend?
- share() + HTTP: A/B współdzielą request #1; po complete pytanie z sali i późny C uruchamia #2.
- share() + interval: ostatni unsubscribe odłącza źródło. Każdy wariant ma osobne notatki checkpointów.

## 12. interval: strumień bez końca

**ID:** `05-zrodla`

### Notatki bazowe

- interval(1000) jest cold. A dostaje 0, 1, 2…; późny B zaczyna własne 0, 1, 2… Każdy odbiorca ma osobny timer.
- Źródło jest nieskończone. unsubscribe zatrzymuje tylko własne wykonanie; nie wywołuje complete.
- Kolejne „dalej”: subscribe A (pauza przed emisjami) → emisje A → subscribe B → unsubscribe A → unsubscribe B → następny slajd.
- Daj obu wykonaniom chwilę na emisje. Po odejściu A pokaż, że B nadal odbiera.
- Dalej: Subject — ręczna emisja. Pozostałe warianty źródeł mają osobne notatki checkpointów.

## 13. Subject — ręczna emisja

**ID:** `05-zrodla-5`

### Checkpoint `ready`

**0 — Definicja**

Interval sam produkował kolejne liczby. A co, jeśli chcielibyśmy sami decydować, kiedy pojawi się następna wartość?

Na ekranie: tylko const subject$ = new Subject<number>() i kafelek Subject. Odbiorców jeszcze nie ma. Subject nie jest podłączony do żadnego źródła — nie ma connection ani upstreamu. Cel: 60–75 s.

### Checkpoint `subscribed-a`

**1 — A subskrybuje**

Subject jest jednocześnie Observable, które można subskrybować, i Observerem, któremu możemy przekazywać wartości. Najpierw korzystamy z pierwszej roli: A subskrybuje.

Pojawia się odbiorca A i od razu subskrybuje: migawka subject$.subscribe(observerA) stoi na pauzie, impuls doszedł od A do Subjecta, w Subject powstał wiersz A. A czeka na wartości. Odbiorcy: 1. Prawo: migawka gaśnie, wywołujemy next(1).

### Checkpoint `emit-1`

**2 — next(1)**

Teraz druga rola Subjecta: sami wywołujemy next(1). Wartość trafia do Subjecta — komu ją przekaże?

Migawka subject$.next(1); kulka 1 pojawia się w wierszu A Subjecta i stoi. Emisje next: 1. Prawo: kulka rusza do A.

### Checkpoint `next-1`

**3 — A dostaje 1**

Subject rozsyła wartość do aktualnych odbiorców — na razie jest tylko A.

Kulka 1 dotarła do A, migawka zgasła. B jeszcze nie istnieje. Prawo: drugi odbiorca.

### Checkpoint `subscribed-b`

**4 — B subskrybuje**

- ❓ SALA: Czy B dostanie wcześniejsze next(1)? Poczekaj na odpowiedzi.

Teraz pojawia się drugi odbiorca. Jak myślicie, czy dostanie jedynkę, którą Subject wyemitował wcześniej?

Pojawia się odbiorca B i od razu subskrybuje; migawka subject$.subscribe(observerB) stoi na pauzie, w Subject powstaje wiersz B. B ma pusty inbox, A zachowuje 1. Poczekaj na odpowiedzi — nie podpowiadaj.

### Checkpoint `emit-2`

**5 — next(2)**

Wywołujemy next(2). Subject ma teraz dwóch odbiorców, więc jedna wartość rozchodzi się na dwa powiadomienia.

Migawka subject$.next(2); kulka 2 pojawia się na środku Subjecta, rozchodzi się do wyjść A i B i staje na portach. B nadal nie ma 1. Emisje next: 2. Prawo: dwójka dociera do obu.

### Checkpoint `next-2`

**6 — A i B dostają 2**

Nie. Subject nie odtwarza wcześniejszych wartości. B dostaje dopiero dwójkę, podczas gdy A otrzymał zarówno jedynkę, jak i dwójkę.

Migawka zgasła. A: 1, 2. B: 2. Prawo: complete().

### Checkpoint `complete`

**7 — complete()**

Teraz ręcznie kończymy Subject. Complete trafia do wszystkich odbiorców i zamyka ich subskrypcje. Nie musimy już osobno wywoływać unsubscribe.

Migawka subject$.complete() zostaje do następnego etapu; zielony impuls wychodzi z Subjecta do A i B. Lane'y Subjecta i odbiorców zielenieją, a status ✓ complete pojawia się tylko przy A i B, po dotarciu impulsu. Historie zostają: A — 1, 2; B — 2. Odbiorcy: 0. Bez unsubscribe i bez error.

Prawo: pojawi się C i zasubskrybuje już zakończony Subject.

### Checkpoint `subscribed-c`

**8 — C subskrybuje po complete()**

C pojawia się dopiero po zakończeniu A i B. Wywołujemy subject$.subscribe(observerC): impuls subskrypcji biegnie od C do Subjecta.

Subject jest już zakończony, więc C natychmiast dostaje complete, bez żadnych wartości next. Zielony impuls wraca do C; pusty inbox i status ✓ complete. A i B zachowują historie i statusy. Odbiorcy cały czas: 0. Prawo: spróbujemy next(3).

### Checkpoint `next-ignored`

**9 — next(3) po zakończeniu**

Wywołujemy subject$.next(3), ale Subject już nie emituje. Nie pojawia się żadna kulka, historie A, B i C pozostają bez zmian. Odbiorcy: 0, Emisje next: nadal 2 — liczymy emisje, a nie ignorowane wywołania.

Zakończony Subject zostaje zakończony — kolejny next nie może go wznowić.

### Checkpoint `finished`

**10 — Podsumowanie**

Subject jest przykładem hot Observable — rozsyła emisje do aktualnych subskrybentów. Nowy odbiorca nie dostaje historii. Do różnicy między hot i cold jeszcze wrócimy.

Przed chwilą wywoływaliśmy next i complete ręcznie. A jeśli te powiadomienia przyjdą z HTTP? Czy Subject może rozesłać wynik jednego requestu do kilku odbiorców?

Na ekranie: A — 1, 2, complete; B — 2, complete; C — tylko complete, bez historii wartości; brak aktywnych subskrypcji. Po complete nie można wznowić emisji. Prawo: „Subject: ręczny multicast HTTP”.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- interval(1000) jest cold. A dostaje 0, 1, 2…; późny B zaczyna własne 0, 1, 2… Każdy odbiorca ma osobny timer.
- Źródło jest nieskończone. unsubscribe zatrzymuje tylko własne wykonanie; nie wywołuje complete.
- Kolejne „dalej”: subscribe A (pauza przed emisjami) → emisje A → subscribe B → unsubscribe A → unsubscribe B → następny slajd.
- Daj obu wykonaniom chwilę na emisje. Po odejściu A pokaż, że B nadal odbiera.
- Dalej: Subject — ręczna emisja. Pozostałe warianty źródeł mają osobne notatki checkpointów.

## 14. Subject: ręczny multicast HTTP

**ID:** `05-zrodla-3`

### Checkpoint `ready`

**0 — Wprowadzenie**

Kontynuujemy przykład Subjecta: nie wywołujemy next ręcznie — obiekt użytkownika pobierzemy z HTTP. Początkowo są tylko firstName i lastName: A i B już subskrybują Subject. Dwa puste pola, Odbiorcy 2, Requesty HTTP 0. Miasto dodamy dopiero po zakończeniu HTTP i Subjecta.

### Checkpoint `defined`

**1 — Definicja HTTP**

Dopisujemy const http$ = httpGet<User>('/api/users/42'). Pojawia się HTTP GET, ale to tylko definicja: nie ma wykonania ani requestu. A i B czekają.

### Checkpoint `connect-http`

**2 — Podłączamy HTTP**

Subject jest również Observerem. http$.subscribe(subject$) podłącza HTTP do Subjecta i uruchamia jedyny request. A i B nie zarządzają tym osobnym połączeniem; instrukcja zostaje w kodzie.

### Checkpoint `multicast`

**3 — Jeden User, dwa pola**

HTTP wykonuje jeden request. Jeden obiekt User trafia do Subjecta i rozdziela się na dwa identyczne powiadomienia next do A i B. Kulki stoją przy portach, pola jeszcze puste.

### Checkpoint `complete`

**4 — HTTP i Subject zakończone**

A wyświetla Paweł, B — Kondraciuk. HTTP emituje complete, Subject przekazuje je do A i B. HTTP i Subject są już zakończone, Odbiorcy 0, Requesty HTTP 1. ⏸ PAUZA: city jeszcze nie ma. Prawo: dodajemy pole miasta i subskrybujemy ten sam zakończony Subject.

### Checkpoint `subscribed-c`

**5 — City po complete**

Dopiero teraz pojawia się user.city. C subskrybuje Subject, który dostał już complete. C otrzymuje tylko complete, bez żadnej wartości next i bez nowego requestu. Pole miasta pozostaje puste z ✓ complete. A i B zachowują dane i statusy, Odbiorcy cały czas 0, HTTP nadal tylko jeden.

### Checkpoint `finished`

**6 — Podsumowanie**

Jeden HTTP zasilił A i B. Późny C dostał samo complete: Subject nie odtwarza danych i po zakończeniu nie zaczyna od nowa. Ale sami musieliśmy podłączyć źródło. Czy RxJS może zrobić to za nas? Do tego wrócimy przy share(). Najpierw sprawdźmy, kto odłączy ręcznie podłączony interval. Prawo: „Subject — kto odłączy źródło?”.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- interval(1000) jest cold. A dostaje 0, 1, 2…; późny B zaczyna własne 0, 1, 2… Każdy odbiorca ma osobny timer.
- Źródło jest nieskończone. unsubscribe zatrzymuje tylko własne wykonanie; nie wywołuje complete.
- Kolejne „dalej”: subscribe A (pauza przed emisjami) → emisje A → subscribe B → unsubscribe A → unsubscribe B → następny slajd.
- Daj obu wykonaniom chwilę na emisje. Po odejściu A pokaż, że B nadal odbiera.
- Dalej: Subject — ręczna emisja. Pozostałe warianty źródeł mają osobne notatki checkpointów.

## 15. Subject — kto odłączy źródło?

**ID:** `05-zrodla-4`

### Checkpoint `ready`

**0 — Wszyscy odbierają**

Kontynuujemy przykład Subjecta. Zamiast HTTP bierzemy dobrze już znany interval — źródło, które samo się nie kończy. Mamy trzech odbiorców i jedno wspólne źródło, podłączone ręcznie.

Na ekranie: slajd startuje już działający — connection = interval(1000).subscribe(subject$) (tor #1) oraz A, B i C podłączeni do Subjecta. Liczby lecą co sekundę, możesz mówić dowolnie długo. Prawo: subA.unsubscribe(). Cel: 45–60 s.

### Checkpoint `unsub-a`

**1 — A unsubscribe**

Pierwszy odbiorca rezygnuje. Jego subskrypcja się kończy, ale pozostali nadal dostają wartości.

Szary impuls × biegnie od A tylko do Subjecta, wiersz A szarzeje. A zachowuje ostatnią liczbę. Interval i tor #1 bez zmian.

### Checkpoint `unsub-b`

**2 — B unsubscribe**

B również się odłącza. C nadal otrzymuje wartości. Ale czy obecność C w ogóle ma wpływ na działanie źródła?

Nie podpowiadaj: interval pracuje dzięki osobnej subskrypcji connection = interval(1000).subscribe(subject$), a odbiorcy Subjecta nią nie zarządzają.

### Checkpoint `unsub-c`

**3 — C unsubscribe**

Teraz odłączamy ostatniego. I jak myślicie, co powinno się wydarzyć ze źródłem?

Poczekaj na odpowiedzi. Na ekranie widać już odpowiedź: kolejne liczby nadal dochodzą do Subjecta.

### Checkpoint `source`

**4 — Interval nadal pracuje**

- ⏸ PAUZA: zero odbiorców, timer wciąż aktywny. Daj mu wyemitować kilka liczb.
- Brak automatycznego refCount — ryzyko zbędnej pracy / wycieku.

Wszyscy odbiorcy już się odłączyli. Ale zobaczcie — interval nadal emituje wartości. Subject ciągle je odbiera, chociaż nikogo już nimi nie powiadamia.

Na ekranie: w kodzie wyróżnione interval(1000).subscribe(subject$), liczby gasną na wejściu Subjecta, licznik emisji rośnie. Emisje trwają, dopóki nie naciśniesz prawo — możesz poczekać kilka wartości. Prawo: connection.unsubscribe().

### Checkpoint `connection`

**5 — connection.unsubscribe()**

Bo mamy jeszcze jedną subskrypcję, którą sami stworzyliśmy. To połączenie interval z Subjectem. I dopiero teraz ręcznie je odłączamy.

Na ekranie: migawka connection.unsubscribe() nad połączeniem, szary impuls × biegnie od Subjecta do interval, wiersz #1 szarzeje. Bez complete — Subject pozostaje otwarty.

### Checkpoint `finished`

**Podsumowanie — źródło zatrzymane**

W Subject wszyscy się odłączyli, ale interval nadal pracował — dopóki sami nie wywołaliśmy connection.unsubscribe(). Subject nadal istnieje, nie dostał complete. Do zarządzania źródłem wrócimy przy share(). Najpierw przyjrzyjmy się operatorom.

Prawo: „Jakie znasz operatory RxJS?”.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- interval(1000) jest cold. A dostaje 0, 1, 2…; późny B zaczyna własne 0, 1, 2… Każdy odbiorca ma osobny timer.
- Źródło jest nieskończone. unsubscribe zatrzymuje tylko własne wykonanie; nie wywołuje complete.
- Kolejne „dalej”: subscribe A (pauza przed emisjami) → emisje A → subscribe B → unsubscribe A → unsubscribe B → następny slajd.
- Daj obu wykonaniom chwilę na emisje. Po odejściu A pokaż, że B nadal odbiera.
- Dalej: Subject — ręczna emisja. Pozostałe warianty źródeł mają osobne notatki checkpointów.

## 16. Jakie znasz operatory RxJS?

**ID:** `02-znane-operatory`

### Notatki bazowe

- ❓ SALA: Jakie znasz operatory RxJS? Daj chwilę na odpowiedzi.
- Odsłaniaj kolejno: map, tap, filter, switchMap.
- Dalej: operator to funkcja — User → fullName na przykładzie map.

## 17. Operator to funkcja

**ID:** `04-operator`

### Checkpoint `ready`

**0 — Definicja**

Załóżmy, że pobieramy dane użytkownika z HTTP. Dostajemy cały obiekt, ale nasz widok potrzebuje tylko pełnego imienia i nazwiska.

Na ekranie: kod httpGet<User>('/api/users/42') (turkusowe wyróżnienie jak HTTP GET), nagłówek HTTP GET i odbiorca A z pustym polem fullName. To nasz klient HTTP zwracający Observable, nie funkcja RxJS. Nie ma jeszcze wykonania ani requestu. Cel: 45–60 s.

### Checkpoint `pipeline`

**1 — Dodajemy map**

Dopisujemy .pipe(map(...)). Pipe składa nową definicję Observable, ale sam nie rozpoczyna wykonywania HTTP.

W kodzie pojawia się druga linia (map w fioletowym wyróżnieniu, w kolorze kafelka), na diagramie kafelek map między HTTP GET a A. Requesty HTTP: 0.

### Checkpoint `subscribed-map`

**2 — A subskrybuje map**

- ⏸ PAUZA: A subskrybuje map; HTTP jeszcze bez wykonania.

Dopiero subscribe uruchamia wykonanie. A subskrybuje map — impuls subscribe dotarł do map i tu się zatrzymał. Subskrypcja idzie od odbiorcy do źródła, a wartości wrócą w przeciwnym kierunku.

Chwilowe .subscribe() A; wiersz A w map, HTTP GET nadal bez wykonania. Requesty HTTP: 0. Prawo: map subskrybuje HTTP.

### Checkpoint `request`

**3 — map subskrybuje HTTP**

- ⏸ PAUZA: map subskrybuje HTTP. subscribe ←, next →.

Map nie ma własnych danych — żeby cokolwiek przekazać, sam subskrybuje źródło. Impuls pobiegł dalej w lewo i dopiero teraz startuje request.

Powstał wiersz wykonania w HTTP GET, postęp requestu rośnie. Requesty HTTP: 1. Prawo: odpowiedź.

### Checkpoint `arrived`

**4 — Odpowiedź HTTP**

Serwer odpowiada, a HTTP emituje jeden obiekt User. Wartość płynie w prawo — w przeciwnym kierunku niż subskrypcja.

Kulka „{…}” — cały obiekt User — dojechała do wejścia map; httpGet świeci, gdy wartość płynie. Requesty HTTP: 1.

### Checkpoint `mapped`

**5 — map przekształca wartość**

Operator map dostaje pojedynczą wartość i synchronicznie ją przekształca. Tutaj z obiektu User tworzymy string.

Kulka zatrzymuje się w wierszu map i zmienia się z „{…}” w „"…"” — string z imieniem i nazwiskiem; w kodzie świeci map. To ta sama subskrypcja, map nie tworzy nowej. Map działa tak dla każdej kolejnej emisji źródła — nasze HTTP emituje akurat tylko jedną wartość.

### Checkpoint `received`

**6 — Odbiorca dostaje wynik**

HTTP wykonał jeden request i wyemitował jeden obiekt. Map przekształcił go w jeden string. To nadal jedno wykonanie Observable.

Pole A (fullName) pokazuje: Paweł Kondraciuk. Requesty HTTP: 1.

### Checkpoint `complete`

**7 — Complete**

Map nie zmienia sposobu zakończenia — complete przechodzi dalej do odbiorcy.

Zielony impuls z HTTP przez map do A; wiersze HTTP GET, map i A zielenieją, a po dotarciu impulsu przy A pojawia się ✓ complete (tylko przy odbiorcy, bez napisu w HTTP GET i map). Map nie uruchamia dodatkowej pracy i nie zatrzymuje complete.

### Checkpoint `finished`

**8 — Zajrzyjmy do środka map**

Widzieliśmy subskrypcję biegnącą w lewo i przekształconą wartość płynącą w prawo. Zobaczmy teraz, jak te dwa kierunki wyglądają w kodzie prostego operatora myMap.

Prawo: „myMap od środka”.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- HTTP GET → map → odbiorca. User → fullName: Paweł Kondraciuk.
- ⏸ PAUZA: A subskrybuje map; potem map subskrybuje HTTP.
- subscribe w lewo; next w prawo. map synchronicznie zmienia wartość, nie uruchamia dodatkowego HTTP.
- complete przechodzi dalej. Dalej: myMap od środka.

## 18. myMap od środka

**ID:** `04b-map-kod`

### Notatki bazowe

**0 — Od definicji do wykonania**

To uproszczony operator myMap. Wywołanie myMap(fn) zwraca funkcję przyjmującą source$ i tworzącą nowy Observable. Na tym etapie mamy tylko definicję: nie ma jeszcze subskrypcji ani wywołania fn.

Cały kod jest widoczny od początku. Dwa kolejne kliknięcia wyróżnią pary fragmentów: source$: Observable<T> z source$.subscribe({ (linie 2 i 5), potem subscriber z subscriber.next(fn(value)) (linie 3 i 6). One tłumaczą poprzednią animację: subskrypcja idzie w lewo, emisja w prawo. Cel: 30–45 s.

### Notatki fragmentu

**1 — Subskrypcja idzie w lewo**

source$: Observable<T> w linii 2 to źródło, do którego operator zostanie podpięty — w naszym przykładzie HTTP GET. Dopiero gdy odbiorca subskrybuje wynikowy Observable, wykonuje się funkcja przekazana do new Observable. source$.subscribe(...) podłącza operator do źródła — tak jak impuls subskrypcji biegnący od A przez map do HTTP na poprzednim diagramie.

Zwracamy subskrypcję źródła jako teardown: rezygnacja odbiorcy odłączy również źródło. Prawo: emisja w drugą stronę.

### Notatki fragmentu

**2 — Emisja idzie w prawo**

subscriber z new Observable<R>(subscriber => {...}) w linii 3 to odbiorca wynikowego Observable — u nas A. Gdy źródło emituje wartość, fn(value) synchronicznie ją przekształca, a subscriber.next(...) przekazuje wynik odbiorcy — to kulka User zmieniająca się w string i płynąca dalej do A. error i complete przechodzą do odbiorcy bez zmiany.

Na razie mamy jeden widok, który wyświetla pełne imię i nazwisko. Pamiętacie Cold: trzy niezależne elementy interfejsu uruchamiały trzy requesty. Subject pozwolił rozesłać wynik jednego HTTP, ale musieliśmy sami podłączyć źródło. Czy operator może zrobić to za nas?

Prawo: „A share?”. Potem wrócimy do surowego user$ = httpGet<User>('/api/users/42'), bez map, i pól firstName/lastName, a po ich complete dołożymy późne city.

## 19. A share?

**ID:** `03-a-share`

### Notatki bazowe

- ❓ SALA: A share? Kto używa i co właściwie współdzielimy?
- Przypomnij: Cold — trzy requesty; Subject + HTTP — jeden request, ale ręczne podłączenie.
- Czy operator może podłączyć źródło i zarządzać nim za nas? Dalej: share(), wspólny request A/B i późny C.

## 20. share(): wspólny request i późny odbiorca

**ID:** `04a-dwa-tory-2`

### Checkpoint `ready`

**0 — Definicja**

Ten sam przykład co w Cold: user$ = httpGet<User>('/api/users/42'). Dwa puste pola: imię A i nazwisko B. Nic nie działa. Miasto pojawi się później.

### Checkpoint `share-added`

**1 — Dodajemy share()**

Dopisujemy .pipe(share()). To nadal tylko definicja, bez requestu.

### Checkpoint `complete`

**2 — Wspólny request A/B i complete**

Jeden krok: A subskrybuje, B dołącza w trakcie HTTP #1, krótki postęp 1,2 s, jeden User trafia do obu pól, a potem complete. Bez pośrednich postojów. A: Paweł, B: Kondraciuk; Odbiorcy 0, Requesty 1.

❓ SALA: A co, jeśli ktoś zasubskrybuje po zakończeniu requestu? ⏸ PAUZA także w AUTO. Dopiero następne prawo dodaje C.

### Checkpoint `complete-c`

**3 — Późny C: HTTP #2, wynik i complete**

W jednym kroku pojawia się user.city, C subskrybuje po complete i uruchamia HTTP #2. Postęp 1,2 s, potem Białystok i complete — bez zatrzymania na trwającym requeście. A/B zachowują wcześniejsze wyniki. Requesty: 2, Odbiorcy: 0.

### Checkpoint `finished`

**Wynik**

Share współdzieli aktywne wykonanie i resetuje się po complete. Późny odbiorca uruchamia nowy request. Prawo: share() — kto odłączy źródło?

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Cold: jeden user$, odbiorcy A: firstName, B: lastName, C: city. Trzy subscribe → trzy niezależne HTTP i trzy complete.
- Przykład: kilka async pipe w Angularze. ❓ SALA: Ile requestów zobaczy backend?
- share() + HTTP: A/B współdzielą request #1; po complete pytanie z sali i późny C uruchamia #2.
- share() + interval: ostatni unsubscribe odłącza źródło. Każdy wariant ma osobne notatki checkpointów.

## 21. share() — kto odłączy źródło?

**ID:** `04a-dwa-tory-3`

### Checkpoint `ready`

**0 — Dwóch odbiorców**

const shared$ = interval(1000).pipe(share()). A i B już odbierają z jednego wykonania interval #1. C jeszcze nie ma. Nie ma ręcznego connection. Kolejne kroki: unsubscribe A, unsubscribe B, a potem późny subscribe C.

### Checkpoint `unsub-a`

**1 — A robi unsubscribe**

subA.unsubscribe(). Szary impuls × kończy się na share(). B nadal słucha, więc interval #1 emituje dalej. Odbiorcy share(): 1. Prawo: odchodzi B — ostatni odbiorca.

### Checkpoint `unsub-b`

**2 — B odchodzi jako ostatni**

subB.unsubscribe(). Teraz nie ma już odbiorców, więc share() sam odłącza upstream: × biegnie do interval #1, źródło szarzeje i przestaje emitować. Bez complete. Odbiorcy: 0. Możesz poczekać: licznik emisji nie rośnie. Prawo: dodajemy późnego C.

### Checkpoint `subscribed-c`

**3 — Późny C: nowe interval od 0**

Dopiero teraz pojawia się C i subskrybuje ten sam shared$. Share tworzy nową subskrypcję źródła: interval #2 zaczyna od 0, potem 1, 2… C nie dostaje historii A/B, a dawne wykonanie #1 zostaje odłączone. Emisje do C trwają na żywo. Odbiorcy: 1. Prawo: następny slajd.

### Checkpoint `finished`

**Podsumowanie — odłączenie i ponowny start**

Share odłącza źródło po odejściu ostatniego odbiorcy. Późny C uruchamia nowe wykonanie interval od 0, bez poprzednich wartości. Na końcowym kadrze A/B są odłączeni, #1 zatrzymane, C odbiera z aktywnego #2. A gdyby operator pamiętał ostatnią wartość? Prawo: shareReplay(1) — najpierw na interval.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Cold: jeden user$, odbiorcy A: firstName, B: lastName, C: city. Trzy subscribe → trzy niezależne HTTP i trzy complete.
- Przykład: kilka async pipe w Angularze. ❓ SALA: Ile requestów zobaczy backend?
- share() + HTTP: A/B współdzielą request #1; po complete pytanie z sali i późny C uruchamia #2.
- share() + interval: ostatni unsubscribe odłącza źródło. Każdy wariant ma osobne notatki checkpointów.

## 22. shareReplay(1): kto zatrzyma interval?

**ID:** `20a-sharereplay-interval`

### Checkpoint `ready`

**0 — Definicja**

share() nie pamiętał wartości. shareReplay(1) zapamiętuje ostatnią emisję i oddaje ją późnym odbiorcom. Sprawdźmy go najpierw na nieskończonym źródle: interval(1000).pipe(shareReplay(1)).

Na ekranie: same definicje, pusta kieszeń „bufor” pod shareReplay(1). Odbiorcy: 0, Upstream: 0. Prawo: A subskrybuje. Cel: 45–60 s.

### Checkpoint `subscribed-a`

**1 — A subskrybuje, interval emituje**

A subskrybuje. Pierwszy odbiorca podłącza shareReplay(1) do interval — jedno połączenie upstream (#1). Od teraz interval emituje cały czas, także gdy stoimy.

Każda wartość rozdziela się w shareReplay(1): jedna kulka do A, druga do bufora — bufor zawsze trzyma ostatnią wartość. Prawo: subA.unsubscribe().

### Checkpoint `unsub-a`

**2 — A unsubscribe**

- Brak odbiorców ≠ zatrzymanie upstream. Domyślne refCount: false; bufor nadal się aktualizuje.

subA.unsubscribe(). Szary impuls × kończy się na shareReplay(1) — nie dociera do interval. Odbiorcy: 0, Upstream: 1.

Interval emituje dalej i nikt tego nie odbiera, ale każda wartość wjeżdża do bufora. Kto teraz zatrzyma interval? Prawo: kolejny subskrybent.

### Checkpoint `subscribed-b`

**3 — Kolejny subskrybent**

B subskrybuje. Najpierw natychmiast dostaje ostatnią wartość z bufora — kulka wyjeżdża z kieszeni do B — a potem kolejne wartości na żywo z tego samego, cały czas działającego interval. Nie powstaje drugie połączenie upstream.

### Checkpoint `unsub-b`

**4 — B unsubscribe**

subB.unsubscribe(). Znowu zero odbiorców — i znowu interval pracuje, a bufor się aktualizuje.

shareReplay(1) to refCount: false: przy zerze odbiorców operator nie odłącza tego aktywnego źródła. Przy nieskończonym źródle coś pracuje w tle, nawet gdy nikt nie słucha. Prawo: następny slajd.

### Checkpoint `finished`

**Stan końcowy**

Odbiorców brak, interval nadal emituje, bufor się aktualizuje. Replay działa, ale źródła nikt nie zatrzyma.

Jak to naprawić? shareReplay({ bufferSize: 1, refCount: true }). Prawo: ten sam interval z refCount: true.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- shareReplay(1): bufor ostatniej wartości; domyślnie refCount: false.
- A odchodzi → timer nadal działa. Brak odbiorców nie zatrzymuje upstreamu.
- Bufor cały czas się aktualizuje. Późny B → ostatnia wartość i dalsze emisje z tego samego interval.
- B odchodzi → źródło nadal aktywne bez odbiorców.
- Dalej: jawne refCount: true.

## 23. shareReplay z refCount: kiedy znika bufor?

**ID:** `20b-sharereplay-refcount`

### Checkpoint `ready`

**0 — Definicja**

Ten sam interval, ale shareReplay({ bufferSize: 1, refCount: true }). refCount: true znaczy: gdy odejdzie ostatni odbiorca, shareReplay sam odłączy źródło. Zobaczmy, co wtedy dzieje się z buforem.

Na ekranie: definicje, pusta kieszeń „bufor”. Odbiorcy: 0, Upstream: 0. Prawo: A subskrybuje. Cel: 60–75 s.

### Checkpoint `subscribed-a`

**1 — A subskrybuje, interval emituje**

A subskrybuje i podłącza shareReplay do interval (#1). Każda wartość rozdziela się: kulka do A i kulka do bufora.

Prawo: na chwilę wstrzymam animację interval i podłączę B.

### Checkpoint `subscribed-b`

**2 — Pauza i B z bufora**

Pauza to tylko zatrzymanie animacji, nie zachowanie operatora — interval na chwilę nie emituje, żeby było widać, co dostaje B. Ostatnia wartość dojeżdża do A i do bufora.

B subskrybuje i od razu dostaje tę wartość z bufora — kulka wyjeżdża z kieszeni do B. Nie powstaje drugie połączenie z interval: Upstream 1. Prawo: interval znowu emituje.

### Checkpoint `resumed`

**3 — Emisje wracają**

Interval emituje dalej, A i B dostają te same wartości. Prawo odłącza kolejno A i B; nowe pytanie pokażemy dopiero po B.

### Checkpoint `unsub-all`

**4 — B odłączony: co zrobi interval?**

A odłączył się wcześniej, teraz B też odszedł. Odbiorcy: 0, Upstream: 1. ⏸ PAUZA: zwykłe połączenie do interval i ostatnia wartość w buforze. ❓ SALA: Co teraz zrobi interval — będzie dalej emitował czy nastąpi unsubscribe? Nic nie zdradza odpowiedzi. Prawo: pokaż reset. To zatrzymany etap ilustracji, bez dodatkowych emisji.

### Checkpoint `reset`

**5 — Odpowiedź: reset przy unsubscribe**

Odpowiedź: przy unsubscribe ostatniego odbiorcy aktywnego źródła. shareReplay czyści bufor i odłącza interval: × dociera do #1. Odbiorcy: 0, Upstream: 0. W RxJS 7 resetOnRefCountZero: true porzuca stary ReplaySubject. Prawo: C zaczyna od 0.

### Checkpoint `subscribed-c`

**5 — Późny C: od zera**

C subskrybuje. Bufor jest pusty, więc C nie dostaje nic z przeszłości. shareReplay tworzy nowy ReplaySubject i nową subskrypcję interval (#2).

interval nie wysłał complete, więc nie ma czego pamiętać po resecie: to nowe wykonanie i liczy od 0. Prawo: C się odłącza.

### Checkpoint `unsub-c`

**6 — C unsubscribe**

subC.unsubscribe(). Znowu refCount = 0: bufor czyszczony, interval #2 odłączony. Nic nie pracuje w tle.

### Checkpoint `finished`

**Stan końcowy**

refCount: true zatrzymuje źródło i czyści bufor razem z ostatnim odbiorcą. Kolejny odbiorca zaczyna od nowa.

Wyjątek: gdy źródło zakończyło się complete, resetu nie ma i bufor zostaje. Prawo: ta sama konfiguracja na HTTP.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- bufferSize: 1 — jedna wartość w buforze; refCount: true — zarządzanie liczbą odbiorców.
- A i B współdzielą źródło. Pauza przy B dotyczy tylko animacji.
- Ostatni unsubscribe przed complete źródła → upstream odłączony i bufor zresetowany.
- Późny C → nowe wykonanie interval od 0; odejście C znów sprząta źródło.
- Dalej: ta sama konfiguracja i zakończony HTTP — czy bufor zostanie?

## 24. shareReplay: późny odbiorca dostaje wynik

**ID:** `20-sharereplay-2`

### Checkpoint `ready`

**0 — HTTP i pusty bufor**

Ta sama konfiguracja shareReplay({ bufferSize: 1, refCount: true }), teraz na HTTP. Jedno prawo uruchamia szybki, ciągły pokaz bez pośrednich postojów: A subskrybuje, HTTP zwraca 42 do A i bufora, potem complete; późny B dostaje 42 bezpośrednio z bufora, a następnie complete. Nie wykonujemy drugiego requestu. Obserwuj, że po complete bufor pozostaje.

### Checkpoint `finished`

**Wynik**

Jeden request, A i późny B dostali 42 i complete. refCount: true czyści bufor aktywnego źródła przy odejściu ostatniego odbiorcy, ale wynik zakończonego HTTP zostaje. Prawo: A jeśli wartością jest Observable?

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Jeden szybki pokaz: HTTP → A i bufor → complete → późny B z bufora i complete.
- Jeden request; bufor zakończonego HTTP zostaje także z refCount: true.
- Dalej: map + concatAll.

## 25. A jeśli wartością jest Observable?

**ID:** `08-map-strumienie`

### Checkpoint `ready`

**1 — Gotowy pipeline**

Od razu widać id$, map, concatAll i odbiorcę S1. To definicja: nie ma jeszcze subskrypcji ani requestu HTTP. Każde następne prawo odtwarza jeden krok.

### Checkpoint `first`

**2 — Subskrypcja, emisja i A$ w map**

S1 subskrybuje id$ przez concatAll i map, id$ emituje A, map zamienia A w zimne Observable A$. ⏸ PAUZA: A$ stoi na środku map, jeszcze przed concatAll. To Observable, nie odpowiedź HTTP. Panel innerów jest pusty, liczniki 0/0. Następne prawo przekazuje A$ do concatAll.

### Checkpoint `created`

**4 — A$ dociera do concatAll**

- ⏸ PAUZA: utworzony inner Observable; HTTP jeszcze niewykonany. Wynik map to Observable, nie odpowiedź.

map zamienia A w zimne Observable A$ i przekazuje je do concatAll. Samo utworzenie go nie uruchamia HTTP. Na dole widać #1, kulkę A$, HTTP GET i inner #1. Nie ma jeszcze kabla, postępu ani subskrypcji wewnętrznej. Liczniki pozostają 0/0.

Pytanie do sali: czy request już leci? Nie — Observable to tylko definicja.

### Checkpoint `active`

**5 — Subskrypcja wewnętrzna**

concatAll subskrybuje A$ — inner #1 subskrybuje HTTP GET. Dopiero teraz rusza HTTP #1; licznik uruchomionych i aktywnych innerów wynosi 1/1. Dalej pokaże odpowiedź.

### Checkpoint `received`

**6 — Odpowiedź u S1**

HTTP wysyła A do inner #1. concatAll przekazuje tę samą wartość do głównego odbiorcy S1. next i complete to osobne powiadomienia: odpowiedź już dotarła, ale HTTP jeszcze się nie zakończył.

### Checkpoint `complete-a`

**7 — Complete HTTP #1**

HTTP #1 kończy inner #1 przez complete. Jego wiersz pozostaje jako historia. S1 nadal jest podłączony, bo id$ się jeszcze nie zakończyło. Liczniki: 1 uruchomiony, 0 aktywnych.

### Checkpoint `complete`

**8 — Complete źródła**

id$ wysyła complete przez map do concatAll. Żaden inner nie jest aktywny, więc concatAll przekazuje complete do S1.

**Wniosek:** map tworzy Observable, a concatAll je subskrybuje i przekazuje ich wyniki. Co, jeśli kolejna wartość przyjdzie jeszcze podczas pracy HTTP? Przechodzimy do concatMap. Na oba przykłady przeznacz około 3 minut.

### Checkpoint `finished`

**Wynik**

S1 otrzymał A i complete. Jeden request HTTP: map tworzy Observable, concatAll je subskrybuje. Następny slajd pokazuje concatMap i wartość przychodzącą podczas trwającej pracy.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- map(id => httpGet(url(id))) zwraca Observable, a nie odpowiedź HTTP.
- ⏸ PAUZA: A$ już utworzony, HTTP jeszcze niewykonany.
- concatAll subskrybuje inner: jeden HTTP → wynik → S1.
- Inner complete; outer nadal może działać. Tutaj jedna wartość i jeden request.
- Wiele wejść i kolejka — następny slajd, concatMap.

## 26. concatMap — Po kolei

**ID:** `09-concatmap`

### Checkpoint `ready`

**0 — Start**

Teraz dochodzimy do operatorów, które dla każdej wartości mogą uruchomić osobną pracę. Funkcja projekcji zwraca Observable, a operator decyduje, kiedy go zasubskrybować.

Na górze jest jeden pipeline: id$ → concatMap → S1. Poniżej widzimy wykonania HTTP: każda wartość ma identyfikator wykonania (#1, #2, #3) i kulkę wartości wejścia, a każde uruchomione inner Observable to osobny, znany już pipeline: własny kafelek HTTP GET i własny inner subscriber — osobna wewnętrzna subskrypcja.

### Checkpoint `subscribe`

**1 — subscribe()**

Wywołujemy subscribe: S1 subskrybuje concatMap, a concatMap — id$. To jedna główna subskrypcja; nie powstaje nowa dla każdej wartości.

### Checkpoint `first`

**2 — A dociera**

Źródło emituje A. concatMap nic nie czeka, więc wywołuje projekcję: id => httpGet(url(A)). Projekcja tylko tworzy Observable — request jeszcze nie ruszył.

### Checkpoint `active`

**3 — HTTP A**

Obok #1 i kulki A stoi własny kafelek HTTP GET. Inbox po prawej to wewnętrzny subskrybent concatMap: dopiero jego subskrypcja uruchamia HTTP A. Postęp wypełnia lane pod nagłówkiem.

### Checkpoint `question`

**4 — A pracuje, przychodzi B**

- ⏸ PAUZA: HTTP #1 nadal aktywny.
- ❓ SALA: Co z B — kolejny request czy czekanie?

A już wykonuje HTTP. Przychodzi B. Co teraz? Uruchomimy drugi request czy poczekamy?

Nie podpowiadaj: #2 z kulką B ma tylko znak zapytania w miejscu przyszłej pracy — nie ma jeszcze kafelka HTTP GET.

### Checkpoint `answer`

**5 — Odpowiedź: kolejka**

concatMap kolejkowuje B. Dopóki A się nie skończy, nie wywołujemy nawet projekcji dla B.

„W KOLEJCE” to wartość B, nie Observable: brak kafelka HTTP GET, inner subscribera, portów i progressu. Dalej odtwarza się samo.

### Checkpoint `finished`

**6 — Wynik**

A complete → dopiero teraz projekcja B: placeholder zamienia się w nowy kafelek HTTP GET z własnym inner subscriberem. B kończy się, zanim przyjdzie C — kolejka jest pusta i nic nie trwa, więc C od razu dostaje swój HTTP. Gdyby C przyszło w trakcie B, też czekałoby w kolejce do complete B.

Wyniki A, B, C w kolejności wejść. Koszt: B czekało na całe A.

**Zastosowanie:** Kolejkowanie zapisów, gdy kolejność jest ważna — np. kolejne zapisy formularza (autosave) muszą dotrzeć na serwer w tej samej kolejności, w jakiej powstały.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Punkt wyjścia: map + concatAll. concatMap łączy projekcję z sekwencyjną obsługą.
- A uruchamia HTTP #1. ⏸ PAUZA: #1 trwa, pojawia się B.
- ❓ SALA: Co z B? Odpowiedź odsłoń następnym krokiem: kolejka wartości wejściowych.
- #1 complete → dopiero wtedy projekcja i start B. C w tej animacji przychodzi już po B; gdyby przyszło wcześniej, też czekałoby.
- Kolejność zachowana, brak równoległości. Przykład: kolejne zapisy formularza.

## 27. mergeMap — Równocześnie

**ID:** `10-mergemap`

### Checkpoint `ready`

**0 — Wprowadzenie**

Zostawiamy identyczną sytuację. A pracuje i pojawia się B. Ale tym razem mamy mergeMap.

S1 już subskrybuje — nie powtarzamy tej animacji. Dalej: A startuje i dochodzi do połowy.

### Checkpoint `question`

**1 — A pracuje, przychodzi B**

Czy naprawdę musimy czekać na zakończenie A?

### Checkpoint `answer`

**2 — Odpowiedź: równolegle**

- ❓ SALA: Który request skończy pierwszy? Zatrzymaj się przed pokazaniem wyników.

Nie. mergeMap uruchamia oba wewnętrzne Observable równolegle. Wyniki mogą wracać w dowolnej kolejności.

Dwa osobne pipeline'y: #1 (A) i #2 (B), każdy z własnym kafelkiem HTTP GET, postępem i inner subscriberem. Dalej: wyniki wracają w kolejności odpowiedzi.

### Checkpoint `c-result`

**3 — Wynik C u S1**

B wróciło przed A, bo krótszy request skończył się wcześniej. Potem C uruchomiło własny request; jego wynik właśnie dotarł do S1.

Każdy inner najpierw dostarcza wynik, dopiero potem kończy się complete. id$ już się zakończyło, ale S1 nie dostał complete — inner C jeszcze trwa. Dalej: complete inner C, a dopiero po nim complete S1.

### Checkpoint `finished`

**4 — Wynik**

S1 dostaje wyniki w kolejności nadejścia: B, A, C. Globalne complete przyszło dopiero po zakończeniu id$ i wszystkich innerów.

**Zastosowanie:** Niezależne, równoległe requesty HTTP — np. pobranie szczegółów kilku produktów naraz albo wysłanie kilku plików, które nie zależą od siebie.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- A → HTTP #1; B → HTTP #2 bez czekania; C → HTTP #3.
- Równoległe subskrypcje. ⏸ PAUZA: A trwa, przychodzi B — czy musimy czekać?
- ❓ SALA: Który request skończy pierwszy? Wyniki według odpowiedzi: B, A, C.
- complete całości dopiero po outer i wszystkich innerach.

## 28. switchMap — Najnowsza subskrypcja

**ID:** `11-switchmap`

### Checkpoint `ready`

**0 — Wprowadzenie**

A już pracuje. Teraz przychodzi B.

S1 już subskrybuje — dalej: A startuje i dochodzi do połowy.

### Checkpoint `question`

**1 — A pracuje, przychodzi B**

- ⏸ PAUZA: A trwa, pojawia się B.
- ❓ SALA: Co stanie się z A?

Co stanie się z A? Dokończy pracę czy zostanie anulowane?

### Checkpoint `answer`

**2 — Odpowiedź: anulowanie A**

switchMap odsubskrybowuje poprzednie wewnętrzne Observable i przełącza się na nowe. Główna subskrypcja S1 nadal działa.

Szary × biegnie od inner subscribera #1 do HTTP A — to teardown wewnętrznej subskrypcji A: request po stronie klienta przerwany, lane szarzeje, brak complete i brak odpowiedzi A.

### Checkpoint `started`

**3 — Nowy inner B**

Dopiero teraz projekcja B: nowy kafelek HTTP GET z własnym inner subscriberem. A zostaje widoczne jako anulowane. Dalej odtwarza się samo.

### Checkpoint `finished`

**4 — Wynik**

S1 dostaje B i C. Anulowane A nie wraca. Pamiętaj: unsubscribe nie cofa operacji na serwerze.

**Zastosowanie:** Pobieranie danych dla aktualnie wybranego użytkownika albo aktualnego wyszukiwania — liczy się tylko najnowsza odpowiedź, starsze nie mogą jej nadpisać.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Nowa wartość → nowy inner; poprzedni inner → unsubscribe.
- ⏸ PAUZA: A trwa, pojawia się B. ❓ SALA: Co stanie się z A?
- A anulowany; B uruchomiony. Odbieramy wyniki aktualnego innera.
- unsubscribe ≠ complete. Abort klienta nie cofa operacji na serwerze.
- Typowe zastosowanie: wyszukiwarka.

## 29. exhaustMap — Jestem zajęty

**ID:** `12-exhaustmap`

### Checkpoint `ready`

**0 — Wprowadzenie**

A pracuje. Przychodzi B. Poznaliśmy już kolejkowanie, równoległość i anulowanie.

S1 już subskrybuje — dalej: A startuje i dochodzi do połowy.

### Checkpoint `question`

**1 — A pracuje, przychodzi B**

- ❓ SALA: Formularz jest wysyłany. Co zrobi drugie kliknięcie?

A co, jeśli nie chcemy teraz przyjmować żadnej kolejnej pracy?

### Checkpoint `answer`

**2 — Odpowiedź: pominięte**

exhaustMap ignoruje B. Nie uruchamia projekcji, nie tworzy requestu i nie zapisuje B na później: #2 z kulką B ma tylko przygaszony placeholder „POMINIĘTE”, bez kafelka HTTP GET i inner subscribera. Dopiero po zakończeniu A może przyjąć następną wartość.

Dalej odtwarza się samo.

### Checkpoint `finished`

**3 — Wynik**

A kończy się normalnie, B nie wraca. C przychodzi po zakończeniu A i dostaje własny kafelek HTTP GET z inner subscriberem. S1 dostaje A i C.

**Zastosowanie:** Ignorowanie kolejnych kliknięć „Zapisz”, dopóki obecny zapis trwa — podwójne kliknięcie nie wyśle dwóch zapisów.

**Przejście:** Znamy już cztery sposoby obsługi kolejnych requestów. Zbudujmy teraz wyszukiwarkę i zobaczmy, które operatory rzeczywiście są nam potrzebne.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- A → HTTP aktywny. B podczas A → ignorowany.
- ❓ SALA: Co zrobi drugie kliknięcie formularza podczas wysyłania?
- Brak kolejki, brak anulowania A. Po complete A następna emisja może rozpocząć HTTP.
- Przykład: formularz i wielokrotny submit. Wyniki tej animacji: A, C.
- Dalej: cztery strategie HTTP zastosujemy w wyszukiwarce.

## 30. Zaprojektujmy wyszukiwarkę

**ID:** `12-intro-wyszukiwarka`

### Notatki bazowe

- Cztery strategie HTTP → praktyczny przykład: wyszukiwarka frameworków JavaScript.
- Pokaz startuje sam: rea, ang, vue, sve; wpisywanie i kasowanie, po pięć wyników.
- Po 300 ms ciszy pojawiają się wyniki. Przy pustej frazie lista znika.
- Spacja pauzuje/wznawia, strzałki zmieniają slajd. Dane są lokalną symulacją.
- Dalej: fromEvent → map → trim → query$, współdzielone przez share().

## 31. Źródło: skąd bierze się query$?

**ID:** `12-query-zrodlo`

### Checkpoint `ready`

**0 — Źródło i odbiorcy**

Skąd bierze się query$? Na razie mamy tylko definicję fromEvent i pusty input. Dwa pola odbiorców są widoczne, ale nikt jeszcze nie subskrybuje: nie ma portów, przewodów ani emisji. Dalej dodaje map.

### Checkpoint `map`

**1 — Wyciągamy tekst**

Dopisujemy .pipe(map(event => (event.target as HTMLInputElement).value.trim())). map dostaje zdarzenie input; event.target ma typ EventTarget, więc rzutujemy go na HTMLInputElement, odczytujemy value i usuwamy białe znaki. Kafelek map pojawia się razem z kodem. To nadal tylko definicja, bez subskrypcji i danych. Dalej dodaje share.

### Checkpoint `share`

**2 — Wspólne źródło**

Dopisujemy share() i pokazujemy jego kafelek. Współdzielimy jedno źródło i jedno wykonanie map między podglądem query a wyszukiwarką. Dalsze prawo szybko podłączy obu odbiorców i jedyny upstream, a potem uruchomi pisanie.

### Checkpoint `live`

**3 — Subskrypcja i dane**

A szybko subskrybuje przez share i map do fromEvent; B dołącza do share bez drugiej subskrypcji źródła. Dopiero teraz input wpisuje a → an → ang → angu → angul → angula → angular, czeka, kasuje litery do pustego tekstu i powtarza. map zamienia zdarzenie na tekst, share rozdziela tę samą kapsułkę do obu odbiorców. Pusty string to "". Przeloty spowalniają ilustrację, nie rzeczywiste operatory. Spacja pauzuje, lewo wraca do etapu share, R do początkowej definicji. Prawo przechodzi do wyboru operatora; wyjście odłącza subskrypcje i zatrzymuje zegar bez animacji. Powrót zaczyna od READY.

### Checkpoint `finished`

**4 — Gotowe query$**

Druk, F i Upcoming pokazują pełny pipeline i angular u obu odbiorców. Mamy gotowy strumień tekstu. Na następnym slajdzie wybierzemy operator: co powinno stać się z poprzednim requestem, gdy przychodzi nowa fraza?

### Notatki bazowe rodziny — zastępowane przez checkpointy

- fromEvent(inputEl, 'input') — źródło zdarzeń z pola.
- map odczytuje event.target.value; trim() usuwa skrajne białe znaki.
- Jeden query$ dla podglądu tekstu i wyszukiwarki.
- share() współdzieli jedną subskrypcję do zdarzeń i jedno wykonanie map.
- Kolejne kroki: map → share → subskrypcje i pisanie. Dalej: wybór operatora HTTP.

## 32. Wybór operatora

**ID:** `12a-switchmap-live`

### Checkpoint `ready`

**0 — Wybór operatora**

Mamy query$ i funkcję zwracającą HTTP Observable. Jaki operator wstawić w puste, wyróżnione miejsce? Chcemy wyświetlać wyniki aktualnej frazy. Co zrobić z requestem poprzedniej frazy, który jeszcze trwa? Daj sali chwilę na odpowiedź. Pierwsze dalej odsłoni wybór i uruchomi pokaz.

### Checkpoint `revealed`

**1 — switchMap**

- switchMap pilnuje aktualności, nie częstotliwości.
- ❓ SALA: Jak ograniczyć liczbę wywołań?

Wybieramy switchMap. Użytkownik szybko pisze r → re → rea: każda litera to emisja query$ i nowy request. re odłącza HTTP #1, rea odłącza #2 — szary ×, bez odpowiedzi i bez complete. Dopiero #3 dla rea dostarcza wynik i kończy się zielonym complete. To jest problem: trzy requesty, z których dwa przerywamy. Complete dotyczy tylko inner; główny odbiorca nadal słucha.

Teraz kasuje: re → r. Każde skasowanie znów wysyła request — re zostaje anulowane, r dostarcza wynik. Potem zastępuje tekst przez ang: a → an → ang (a i an anulowane, ang z wynikiem) i kasuje: an → a (an anulowane, a z wynikiem). Cykl się powtarza. Szybkie zmiany przerywają pracę, cisza po serii pozwala odebrać wynik. Widać maksymalnie trzy requesty; nowy dochodzi na dole, najstarszy znika z góry. Numery i liczniki rosną bez resetu.

Pokaz działa do przejścia dalej. Spacja pauzuje/wznawia, R przywraca pytanie z ukrytą nazwą; prawo przechodzi do debounceTime, lewo do źródła query$. Odsubskrybowanie klienta nie cofa operacji wykonanej na serwerze. Teraz ograniczymy liczbę requestów: zaczekamy 300 ms ciszy.

### Checkpoint `finished`

**Kadr podsumowania**

switchMap odsłonięty, HTTP #3 dla rea zakończone, #4 dla re anulowane, #5 dla r aktywne. Odbiorca zachowuje tablicę [#3] wyników dla rea. Nowe query może przerwać poprzedni request, ale zakończonego requestu już nie anuluje. Dalej dodamy debounceTime.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- ❓ SALA: Jaki operator wybrać, żeby wyniki dotyczyły aktualnej frazy?
- Pierwsze „dalej” odsłania switchMap i uruchamia pokaz.
- Każda zmiana query → nowe HTTP; poprzedni aktywny inner → unsubscribe.
- Szybkie pisanie → mnóstwo requestów. switchMap pilnuje aktualności, nie częstotliwości.
- ❓ SALA: Jak ograniczyć liczbę wywołań? Dalej: debounceTime.

## 33. debounceTime — czekamy na ciszę

**ID:** `12b-debounce-switchmap`

### Checkpoint `ready`

**0 — Pipeline już podłączony**

Cała główna subskrypcja jest już zestawiona: odbiorca, operatory i źródło mają widoczne połączenia. Nie odtwarzamy subscribe. Brak emisji i requestów HTTP; pierwsze prawo uruchamia zdarzenia przykładu.

### Checkpoint `buffered`

**2 — rea w buforze**

Użytkownik wpisał r → re → rea. Każda zmiana dotarła do debounceTime, zastąpiła oczekującą wartość i zresetowała timer. Trzy wejścia, zero requestów. Dopiero pełne 300 ms ciszy pozwoli przepuścić rea.

### Checkpoint `request-1`

**3 — HTTP #1: rea**

Cisza minęła. debounceTime przepuścił jedną wartość rea, a switchMap utworzył inner i uruchomił HTTP #1. Pośrednie r i re nie uruchomiły HTTP. Ten request będzie trwał dłużej — użytkownik zaraz dopisze kolejne litery, bez czekania na odpowiedź.

### Checkpoint `typing`

**4 — react czeka w debounceTime**

- ⏸ PAUZA: nowy tekst podczas odliczania, poprzedni HTTP trwa. Ważny przypadek przy wolnej sieci.
- ❓ SALA: Czy klawisz już anulował request?

Użytkownik dopisał c i t: rea → reac → react. Obie zmiany dotarły do debounceTime i zresetowały timer. HTTP #1 dla rea nadal działa — postęp rośnie.

Pytanie do sali: czy naciśnięcie klawisza już przerwało request #1? Nie. switchMap nie dostał jeszcze żadnej nowej wartości — react czeka w pamięci debounceTime na 300 ms ciszy.

### Checkpoint `switched`

**5 — Dopiero emisja przerywa HTTP #1**

Minęło 300 ms ciszy. debounceTime wyemitował react i dopiero wtedy switchMap odsubskrybował HTTP #1: szary ×, pasek zatrzymany, stan anulowane — bez wyniku i bez complete. Zaraz potem switchMap utworzył nowy inner i uruchomił HTTP #2 dla react.

Przy tym pipeline'ie anulowanie następuje po emisji z debounceTime, nie w chwili naciśnięcia klawisza.

### Checkpoint `complete-2`

**6 — HTTP #2 zakończony**

HTTP #2 zwrócił tablicę [#2] wyników dla react i zakończył inner zielonym complete. Użytkownik już kasuje dalej (reac → rea), więc w debounceTime znowu odlicza timer. Główna subskrypcja nadal działa. Następne dalej uruchomi pokaz ciągły, bez kolejnych postojów.

### Checkpoint `request-3`

**7 — HTTP #3 i pokaz ciągły**

Po ciszy debounceTime przepuścił rea, a switchMap uruchomił HTTP #3. Od tego momentu animacja nie zatrzymuje się na etapach: kasowanie re → r (HTTP dla r), zamiana na a → an → ang (HTTP dla ang), kasowanie an → a (HTTP dla a), potem cykl od r — razem z anulowaniem długiego rea przez react. Pośrednie litery tylko resetują timer. Udane HTTP zwracają tablicę [#N] i kończą swój inner przez complete; główny pipeline pozostaje aktywny. Są najwyżej trzy ostatnie rzeczywiste requesty. Numery i liczniki rosną bez resetu. Prawo podczas pokazu ciągłego od razu zmienia slajd, także po pauzie Spacją. Lewo cofa do ostatniego ręcznego postoju, R wraca do zatrzymanego READY.

### Checkpoint `finished`

**Kadr podsumowania**

Druk, F i Upcoming pokazują trzy HTTP: #1 rea anulowany przez switchMap, #2 react i #3 rea zakończone complete, wynik [#3], input r czekający w pamięci debounceTime i liczniki 9/3/0. To nieruchomy kadr ciągłego pokazu. Anulowanie #1 to unsubscribe, nie complete; źródło i odbiorca nadal działają. debounceTime pilnuje tylko ciszy — nie porównuje z poprzednio przepuszczoną wartością. Na następnym slajdzie pokażemy distinctUntilChanged() po debounceTime, przed switchMap: porównuje nową wartość z ostatnią wyemitowaną.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- debounceTime(300) przed switchMap: każdy znak resetuje 300 ms; po ciszy wychodzi ostatnie query.
- ⏸ PAUZA: HTTP #1 dla rea nadal trwa, react czeka w debounceTime.
- ❓ SALA: Czy samo naciśnięcie klawisza przerwało poprzedni request?
- Anulowanie dopiero po nowej emisji z debounceTime. Ważny przypadek przy wolnej sieci.
- Ilustracja jest spowolniona 5×. Po wyniku HTTP #2 kolejne „dalej” uruchamia pokaz ciągły.
- Dalej: debounce nie porównuje fraz — distinctUntilChanged.

## 34. distinctUntilChanged — znowu to samo?

**ID:** `11a-distinct-switchmap`

### Checkpoint `ready`

**0 — Pipeline już podłączony**

Cała główna subskrypcja jest już zestawiona: odbiorca, operatory i źródło mają widoczne połączenia. Nie odtwarzamy subscribe. Brak emisji i requestów HTTP; pierwsze prawo uruchamia zdarzenia przykładu.

### Checkpoint `first`

**1 — react przechodzi**

r → re → rea → reac → react. Po 300 ms ciszy debounceTime przepuścił react. distinctUntilChanged zapamiętał react, switchMap uruchomił HTTP #1, odpowiedź dotarła do odbiorcy i inner zakończył się complete. Główna subskrypcja nadal działa. Pięć wejść, jedna emisja debounce, jeden udany request. Dalej: szybka poprawka w polu.

### Checkpoint `duplicate`

**2 — Drugie react zostaje odrzucone**

- Domyślnie ===: stringi po wartości, obiekty po referencji.
- Operator stoi po debounceTime i przed switchMap; porównuje z ostatnią wyemitowaną wartością.

Użytkownik szybko skasował ostatnią literę (reac) i od razu dopisał t — znowu react, zanim minęło 300 ms. Wpisane wartości: react, reac, react. Wartości, które opuściły debounceTime: react, react — środkowe reac zostało zastąpione w pamięci debounce i nigdy nie wyszło dalej.

distinctUntilChanged porównał nowe react z ostatnim wyemitowanym react: === daje true, więc odrzucił duplikat. Przygaszona kulka react i podpis duplikat. Siedem wejść, dwie emisje debounce, nadal tylko jeden request — bez nowego HTTP i bez anulowania. Pamięć dotyczy ostatniej wyemitowanej wartości, nie całej historii. Dalej pokaże vue i ang, po czym zatrzyma się po wszystkich sukcesach.

### Checkpoint `successes`

**3 — Trzy poprawne wyszukiwania**

react, vue i ang przeszły; duplikat react nie utworzył HTTP. Każdy z trzech requestów dostarczył wynik i complete inner. Główny pipeline nadal działa. Liczniki: 15 zmian inputa i wejść query$, 4 emisje debounce, 3 requesty, 0 aktywnych. Następna strzałka uruchomi znowu react i zatrzyma się na działającym HTTP #4, przed błędem.

### Checkpoint `request-error`

**4 — Znowu react, kolejny HTTP**

Użytkownik wyczyścił pole i ponownie wpisał react. Tym razem distinctUntilChanged je przepuścił — porównuje z ostatnią wyemitowaną wartością, czyli ang, a nie ze wszystkimi wcześniejszymi. HTTP #4 jest aktywny, główna subskrypcja działa. Liczniki: 21 zmian inputa i wejść query$, 5 emisji debounce, 4 requesty, 1 aktywny. Ten kadr może stać dowolnie długo; błąd pojawi się dopiero po kolejnym dalej.

### Checkpoint `error`

**5 — Error zamknął subskrypcję**

HTTP #4 dla react zwrócił error 500. Czerwony impuls przeszedł przez switchMap do odbiorcy. Nie było complete tego HTTP ani głównej subskrypcji. Teardown odłączył distinctUntilChanged, debounceTime i query$. Input nadal pokazuje react: nie rozpoczęliśmy jeszcze kolejnych zmian pola. 21 zmian UI i wejść query$, 5 emisji debounce, 4 requesty, 0 aktywnych; subskrypcja zakończona błędem. Zatrzymaj się na tym problemie. Dopiero dalej pokaże, że użytkownik nadal może pisać — skasuje react i wpisze angular — ale wyszukiwarka nie reaguje.

### Checkpoint `finished`

**6 — Pisanie bez aktywnej wyszukiwarki**

Po strzałce w prawo wpisaliśmy znowu react. Fraza przeszła przez distinctUntilChanged (ostatnio wyemitowano ang) i uruchomiła HTTP #4, który zakończył się error 500. Błąd przeszedł przez switchMap do odbiorcy, główna subskrypcja została zamknięta, a query$, debounceTime i distinctUntilChanged odłączone. Ten HTTP i główny odbiorca nie dostały complete; wcześniejsze sukcesy pozostają historią. Użytkownik skasował react i wpisał angular. UI działa, ale pipeline nie odbiera wejść: brak nowych kulek, timera, wyników i HTTP #5. Ostatni poprawny wynik [#3] zostaje w czerwonym odbiorcy. Liczniki: 33 zmiany inputa, 21 wejść query$, 5 emisji debounce, 4 requesty, 0 aktywnych. distinctUntilChanged oszczędził duplikat, ale nie ochronił przed błędem backendu. Na następnym slajdzie ta sama wyszukiwarka dostanie catchError wewnątrz switchMap.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Po debounceTime, przed switchMap: porównanie z ostatnią wyemitowaną wartością.
- react → HTTP #1. Szybkie reac → react: debounce wypuszcza ponownie react.
- distinctUntilChanged: react === react → brak drugiego HTTP.
- Stringi porównujemy po wartości, obiekty domyślnie po referencji.
- Ponowne react po ang przechodzi. Potem error 500 zamyka subskrypcję; dalsze pisanie zmienia tylko UI.
- Dalej: catchError wewnątrz switchMap.

## 35. catchError — wyszukiwarka działa dalej

**ID:** `11b-catcherror-search`

### Checkpoint `ready`

**0 — Pipeline już podłączony**

Cała główna subskrypcja jest już zestawiona: odbiorca, operatory i źródło mają widoczne połączenia. Nie odtwarzamy subscribe. Tym razem przechwycimy błąd wewnątrz switchMap. Brak emisji i requestów HTTP; pierwsze prawo uruchamia zdarzenia przykładu.

### Checkpoint `request`

**1 — HTTP #1 trwa**

Odbiorca zasubskrybował pipeline, subskrypcja przeszła do query$. react przeszedł przez debounceTime (300 ms ciszy) i distinctUntilChanged; switchMap utworzył HTTP #1, a jego subskrypcja przeszła przez catchError do httpGet. Request trwa.

Pytanie do sali: co się stanie, jeśli ten request się nie uda?

### Checkpoint `error`

**2 — HTTP #1: error 500**

- ⏸ PAUZA: błąd w innerze. Outer query$ i główny odbiorca nadal aktywni.

Pierwszy request się nie udał. Tym razem jednak błąd trafia do catchError, a nie do głównego odbiorcy.

HTTP #1 jest czerwony (error 500), czerwony impuls właśnie dotarł do catchError. Główny odbiorca nie dostał błędu ani complete, główna subskrypcja jest aktywna. Kadr stoi dowolnie długo.

### Checkpoint `fallback`

**3 — catchError zwraca []**

Błąd HTTP nadal wystąpił, ale do naszej wyszukiwarki przekazaliśmy pustą listę. I co najważniejsze — nie straciliśmy subskrypcji.

catchError zatrzymał błąd i subskrybował zastępcze of([]). [] przeszło do odbiorcy innera, przez switchMap do odbiorcy wyników, a potem of([]) zakończyło się complete. HTTP #1 nadal jest oznaczony error 500 — zielone complete należy do zastępczego strumienia, nie do requestu. Główna subskrypcja nie dostała error ani complete i dalej nasłuchuje inputa.

### Checkpoint `success`

**4 — Kolejne wyszukiwanie: angular**

Czy wyszukiwarka nadal działa? Tak. Nowa fraza przechodzi przez te same operatory i uruchamia kolejny request.

Użytkownik skasował react i wpisał angular; każda zmiana trafiła do query$. Po 300 ms ciszy debounceTime przepuścił angular, distinctUntilChanged porównał go z react, switchMap uruchomił HTTP #2. Odpowiedź [#2] przeszła przez catchError bez zmian i dotarła do odbiorcy, a complete HTTP #2 przeszło przez catchError i zakończyło inner. Główny pipeline nie dostał complete.

### Checkpoint `finished`

**5 — Wniosek**

Obsłużyliśmy błąd pojedynczego HTTP, ale nie zakończyliśmy nasłuchiwania query$. To zasługa umieszczenia catchError wewnątrz switchMap.

Stan końcowy: HTTP #1 react — error 500, catchError dał [] i complete; HTTP #2 angular — wynik [#2] i complete. Odbiorca dostał kolejno [] i [#2], input pokazuje angular, główna subskrypcja aktywna. Liczniki: 2 requesty HTTP, 1 błąd, 0 aktywnych. Błąd jednego requestu nie musi kończyć całego strumienia. Dalej zmienia slajd.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Ta sama wyszukiwarka, nowa subskrypcja; catchError wewnątrz switchMap.
- HTTP → error 500. ⏸ PAUZA: błąd w catchError innera, główny odbiorca nadal aktywny.
- catchError → zastępczy Observable of([]) → pusty wynik i complete tylko innera.
- Outer query$ nadal działa; angular → kolejny HTTP.
- Błąd jednego requestu nie kończy wyszukiwarki. Dalej: catchError poza switchMap.

## 36. catchError na zewnątrz

**ID:** `b04-catcherror`

### Checkpoint `ready`

**0 — Pipeline już podłączony**

Cała główna subskrypcja jest już zestawiona: odbiorca, operatory i źródło mają widoczne połączenia. Nie odtwarzamy subscribe. catchError znajduje się na zewnątrz switchMap. Brak emisji i requestów HTTP; pierwsze prawo uruchamia zdarzenia przykładu.

### Checkpoint `request`

**1 — Klik A**

Kliknięcie A: switchMap uruchamia HTTP A. Request trwa, wszystkie subskrypcje są aktywne.

### Checkpoint `http-error`

**2 — HTTP zwraca błąd**

HTTP A kończy się error 500. Wewnątrz nie ma catchError, więc czerwony impuls rusza w stronę switchMap. Reszta pipeline'u jeszcze o niczym nie wie.

### Checkpoint `error`

**3 — Błąd w catchError**

Błąd przeszedł przez switchMap do zewnętrznego catchError. Klik$ nadal jest podłączony — zatrzymajmy się, zanim pokażemy, co zrobi catchError. Pytanie do sali: czy kolejne kliknięcia jeszcze zadziałają?

### Checkpoint `caught`

**4 — Przechwycenie**

Dopiero tutaj łapie go zewnętrzny catchError. Problem polega na tym, że oryginalny strumień zostaje odsubskrybowany.

### Checkpoint `fallback`

**5 — Fallback**

CatchError przełącza się na zastępcze of([]). Dostajemy pustą tablicę, a potem complete.

### Checkpoint `click-b`

**6 — Kolejne kliknięcie**

- ⏸ PAUZA: kolejne kliknięcie nie uruchamia HTTP. Lokalizacja catchError zmienia zachowanie aplikacji.

I teraz klikamy ponownie. Nic się nie dzieje. Nie dlatego, że switchMap zignorował kliknięcie, tylko dlatego, że nie mamy już aktywnej subskrypcji kliknięć.

### Checkpoint `finished`

**7 — Podsumowanie**

W wyszukiwarce obsłużyliśmy błąd pojedynczego HTTP. CatchError na zewnątrz zastępuje cały strumień po błędzie; tutaj of([]) emituje i kończy wynik. Teraz zobaczmy retry: zamiast zastępować strumień, ponowimy subskrypcję źródła.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- catchError poza switchMap — dla czytelności wracamy do źródła klik$.
- HTTP → error 500 → błąd wychodzi poza switchMap.
- Oryginalna subskrypcja klik$ i switchMap odłączona.
- catchError przełącza na of([]): fallback i complete całego wyniku.
- ⏸ PAUZA: kolejne kliknięcie B → brak reakcji. Położenie catchError zmienia zachowanie aplikacji.
- To of([]) kończy wynik; inny zastępczy Observable mógłby działać dłużej. Dalej: retry.

## 37. retry — nie udało się? Spróbuj później

**ID:** `x03-retry-backoff`

### Checkpoint `ready`

**0 — Pierwsza próba już podłączona**

A jest już podłączony przez retry do HTTP #1. Widać całą subskrypcję i pierwszy request z postępem 0%; liczniki 1/1. Pierwsze prawo pokazuje pracę i błąd pierwszej próby. Retry ponownie subskrybuje cold HTTP po 1/2/4 s.

### Checkpoint `error-1`

**2 — Pierwszy błąd**

Retry przechwytuje błąd. Nie kończy jeszcze całego Observable, tylko przygotowuje ponowną subskrypcję źródła.

A nie dostaje error. Prawo uruchamia pełne odliczanie 1 sekundy; w trakcie backoff żaden HTTP nie działa.

### Checkpoint `request-2`

**3 — Retry po 1 sekundzie**

To ważne: retry nie powtarza poprzedniej wartości i nie używa ponownie odpowiedzi. Poprzednie wykonanie się zakończyło. Teraz mamy nową subskrypcję tego samego cold HTTP.

#1 przesuwa się do historii, #2 zajmuje pierwszy wiersz. A nie subskrybuje ponownie. Requesty HTTP: 2.

### Checkpoint `error-2`

**4 — Drugi błąd**

Drugi error również kończy się na retry. A nadal czeka.

Poprzednio czekaliśmy 1 sekundę, teraz czekamy 2 sekundy. Natychmiastowe ponawianie mogłoby dodatkowo obciążyć serwer, który już ma problemy.

### Checkpoint `request-3`

**5 — Retry po 2 sekundach**

Po pełnym odliczaniu retry po raz kolejny subskrybuje źródło. #3 trafia bezpośrednio pod jeden nagłówek HTTP GET, a zakończone #2 i #1 zostają poniżej.

Requesty HTTP: 3, Aktywne: 1.

### Checkpoint `error-3`

**6 — Trzeci błąd**

W naszym przykładzie opóźnienie podwaja się po każdym kolejnym błędzie: 1, 2, 4 sekundy.

Pytanie do publiczności: pierwszy raz czekaliśmy sekundę, potem dwie, teraz cztery. Ile czekalibyśmy przy następnym ponowieniu?

### Checkpoint `request-4`

**7 — Retry po 4 sekundach**

Odpowiedź: 8 sekund, gdyby limit ponowień na to pozwalał.

Tutaj po pełnych 4 sekundach powstaje HTTP #4. count: 3 oznacza maksymalnie trzy ponowienia, czyli do czterech wykonań HTTP łącznie.

### Checkpoint `success`

**8 — Sukces**

Wreszcie czwarty request się udaje. Odbiorca A dostaje jeden User i complete. Wszystkie poprzednie błędy zostały obsłużone wewnątrz retry.

#4 pozostaje zielone na szczycie stosu, a trzy wcześniejsze wykonania pozostają czerwone. Requesty HTTP: 4, Aktywne: 0.

### Checkpoint `summary`

**9 — Podsumowanie**

- Cel backoff: mniej agresywne obciążanie backendu podczas chwilowej awarii.

Jeden HTTP GET ma historię czterech wykonań: #1 error → 1 s; #2 error → 2 s; #3 error → 4 s; #4 User + complete. A otrzymał next(User) → complete i nie otrzymał trzech pośrednich błędów.

retry ponownie subskrybuje to samo źródło; exponential backoff (wykładniczy, nie logarytmiczny: 1000 · 2^(retryCount − 1)) wydłuża oczekiwanie przed kolejną próbą.

### Checkpoint `finished`

**Warto dopowiedzieć**

Jeśli również ostatnia dozwolona próba się nie uda, retry przekaże terminalny error do A.

W produkcji często dodaje się maksymalne opóźnienie i jitter, żeby wielu klientów nie ponawiało requestów jednocześnie. Nie każdy błąd powinien być ponawiany — zwykle interesują nas błędy przejściowe, a nie walidacyjne.

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Błąd → ponowna subskrypcja upstream; każda próba to nowy cold HTTP.
- count: 3 → pierwsza próba + maksymalnie trzy ponowienia.
- Wykładnicze opóźnienia: 1 s → 2 s → 4 s; podczas oczekiwania brak aktywnego requestu.
- Błędy zatrzymane wewnątrz retry. Sukces próby #4 → User i complete.
- Po wyczerpaniu prób error idzie dalej. Cel: mniej agresywne obciążanie backendu.
- Dalej: RxJS w liczbach, potem trzy pytania podsumowania i puenta.

## 38. RxJS w prawdziwym kodzie — kto wygrywa?

**ID:** `24-rxjs-liczby`

### Checkpoint `ready`

**0 — Pytanie**

Przez ostatnie kilkadziesiąt minut poznawaliśmy różne operatory. A jak myślicie, którego z czterech Map używa się najczęściej w tym zestawieniu?

Na ekranie kolejność z prezentacji: concatMap, mergeMap, switchMap, exhaustMap. Daj sali chwilę na odpowiedź; pierwsze „dalej” odsłoni paski i wartości bez zmiany kolejności wierszy.

### Checkpoint `ranking`

**1 — Ranking**

SwitchMap odpowiada za prawie 80% wywołań wśród tej czwórki. MergeMap ma 14%, concatMap nieco ponad 5%, a exhaustMap mniej niż 2%.

### Checkpoint `map`

**2 — map**

A najczęściej wykorzystywanym operatorem w całym zestawieniu jest zwykły map — ponad cztery tysiące wywołań.

### Checkpoint `share-replay`

**3 — shareReplay**

ShareReplay pojawia się niemal cztery razy częściej niż zwykły share. Widać, że zapamiętywanie wyniku bywa bardzo przydatne.

### Checkpoint `concat-all`

**4 — concatAll**

A concatAll, które pokazywaliśmy jako fundament działania concatMap? W tym zbiorze użyto go bezpośrednio tylko jeden raz.

### Checkpoint `finished`

**5 — Finał**

Te liczby pochodzą z konkretnego zestawu kodu, więc nie traktujmy ich jako rankingu całego świata. Ale pokazują jedną rzecz: nie wszystkich operatorów używamy równie często. Najważniejsze to rozumieć ich zachowanie i umieć wybrać właściwy.

**Przejście:** „To co, zagadamy do tych operatorów?”

### Notatki bazowe rodziny — zastępowane przez checkpointy

- Dane z zestawienia rxjs-usage: liczba wywołań w kodzie wybranego zbioru, nie wykonań w runtime.
- Cztery *Map: switchMap 1418 (79,1%), mergeMap 251 (14,0%), concatMap 96 (5,4%), exhaustMap 28 (1,6%); razem 1793.
- map 4282; shareReplay 926 vs share 252 (≈3,7×); concatAll 1.
- Około minuty; dalej: podsumowanie.

## 39. To co, zagadamy do tych operatorów?

**ID:** `25-podsumowanie`

### Notatki bazowe

- To co, zagadamy do tych operatorów?
- Ile naprawdę uruchamiam subskrypcji?
- Nowa wartość: kolejka, równoległość, anulowanie czy ignorowanie?
- complete, error, unsubscribe — kto sprząta?
- Wypowiedz te trzy pytania; środkowe wiersze slajdu pozostają puste. „Dalej” odsłania puentę.

### Notatki fragmentu

**1 — Puenta**

Bo to, że działa, nie znaczy, że robi to, czego oczekujesz.

- Operator działa ≠ operator robi to, czego oczekuję.
- Zatrzymaj się na tej myśli. Kolejne „dalej” prowadzi do „Pytania?” z QR do feedbacku; „wstecz” ukrywa puentę.

## 40. Pytania?

**ID:** `pytania`

### Notatki bazowe

- Zaproś do pytań o przykłady i operatory.
- QR → formularz feedbacku: https://crossweb.pl/feedback/aks-lwt/. Daj chwilę na zeskanowanie.
- WebStorm — przypomnij o konkursie / giveaway.
- Podziękuj za udział i wspólne spotkanie. To ostatni slajd.
