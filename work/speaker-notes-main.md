# Speaker notes — RxJS: operatory, które znasz, ale bałeś się zagadać

Eksport z [index.html](../index.html): **42 slajdy MAIN** w kolejności prezentacji. Każdy slajd ma jedną stałą listę krótkich haseł, widoczną od wejścia do wyjścia — również podczas animacji, wyróżnień kodu, cofania i AUTO. Warianty mają własne listy.

## Spis slajdów

1. **Społeczność** — `spolecznosc`
2. **Kiedy odbyło się pierwsze spotkanie meet.js w Białymstoku?** — `pierwsze-meetjs-pytanie`
3. **meet.js Białystok #2** — `pierwsze-meetjs-odpowiedz`
4. **JavaScript Białystok #1** — `javascript-bialystok-1`
5. **Historia meet.js Białystok** — `historia-meetjs`
6. **Zawsze gdzieś się przewijałem**
7. **Poprzednie wystąpienia**
8. **RxJS Operatory, które znasz, ale bałeś się zagadać** — `tytul`
9. **RxJS — o co w tym chodzi?** — `01a-fabryka-soku`
10. **Rx marbles** — `01b-rx-marbles`
11. **HTTP: od definicji do wykonania** — `05-zrodla-2`
12. **httpGet od środka** — `05b-http-kod`
13. **Cold: jedna definicja, trzy wykonania** — `04a-dwa-tory`
14. **interval: strumień bez końca** — `05-zrodla`
15. **Subject — ręczna emisja** — `05-zrodla-5`
16. **Subject: ręczny multicast HTTP** — `05-zrodla-3`
17. **Subject — kto odłączy źródło?** — `05-zrodla-4`
18. **Jakie znasz operatory RxJS?** — `02-znane-operatory`
19. **Operator to funkcja** — `04-operator`
20. **myMap od środka** — `04b-map-kod`
21. **A share?** — `03-a-share`
22. **share(): wspólny request i późny odbiorca** — `04a-dwa-tory-2`
23. **share() — kto odłączy źródło?** — `04a-dwa-tory-3`
24. **shareReplay(1): kto zatrzyma interval?** — `20a-sharereplay-interval`
25. **shareReplay z refCount: kiedy znika bufor?** — `20b-sharereplay-refcount`
26. **shareReplay: późny odbiorca dostaje wynik** — `20-sharereplay-2`
27. **A jeśli wartością jest Observable?** — `08-map-strumienie`
28. **concatMap — Po kolei** — `09-concatmap`
29. **mergeMap — Równocześnie** — `10-mergemap`
30. **switchMap — Najnowsza subskrypcja** — `11-switchmap`
31. **exhaustMap — Jestem zajęty** — `12-exhaustmap`
32. **Zaprojektujmy wyszukiwarkę** — `12-intro-wyszukiwarka`
33. **Źródło: skąd bierze się query$?** — `12-query-zrodlo`
34. **Wybór operatora** — `12a-switchmap-live`
35. **debounceTime — czekamy na ciszę** — `12b-debounce-switchmap`
36. **distinctUntilChanged — znowu to samo?** — `11a-distinct-switchmap`
37. **catchError — wyszukiwarka działa dalej** — `11b-catcherror-search`
38. **catchError na zewnątrz** — `b04-catcherror`
39. **retry — nie udało się? Spróbuj później** — `x03-retry-backoff`
40. **Cztery operatory, jeden strumień** — `16-czas-cztery`
41. **RxJS w prawdziwym kodzie — kto wygrywa?** — `24-rxjs-liczby`
42. **Pytania?** — `pytania`

## 1. Społeczność

**ID:** `spolecznosc`

- **Powrót do Zmiany Klimatu**
- **Discord / grupa Białystok**
- **WebStorm — konkurs**

## 2. Kiedy odbyło się pierwsze spotkanie meet.js w Białymstoku?

**ID:** `pierwsze-meetjs-pytanie`

- **Pierwsze spotkanie — kiedy?**
- **Pułapka z numeracją**

## 3. meet.js Białystok #2

**ID:** `pierwsze-meetjs-odpowiedz`

- **24 lutego 2015**
- **Pierwsze meet.js, numer #2**
- **Wcześniej JavaScript Białystok**

## 4. JavaScript Białystok #1

**ID:** `javascript-bialystok-1`

- **20 stycznia 2015**
- **Angular — Karol Rogowski**
- **Adam, Hubert, znajome twarze**
- **Zmiana Klimatu — korzenie**

## 5. Historia meet.js Białystok

**ID:** `historia-meetjs`

- **62 spotkania, 7 miejsc**
- **Odwołane #34 i #38**
- **COVID, przerwy, powroty**
- **Społeczność przez lata**

## 6. Zawsze gdzieś się przewijałem

- **Znajdź mnie na zdjęciach**
- **Znajome twarze przez lata**

## 7. Poprzednie wystąpienia

- **Mobile 2016, kilobajty 2017**
- **Dekada zmian — dziś AI**
- **Dziś: zachowanie operatorów**

## 8. RxJS Operatory, które znasz, ale bałeś się zagadać

**ID:** `tytul`

- **Kto zna / używa / lubi?**
- **Zdarzenia i wartości w czasie**
- **Źródło → operatory → odbiorca**

## 9. RxJS — o co w tym chodzi?

**ID:** `01a-fabryka-soku`

- **Owoce — emisje w czasie**
- **Bramka — filter**
- **Wyciskarka — map**
- **Szklanki — wynik u odbiorcy**

## 10. Rx marbles

**ID:** `01b-rx-marbles`

- **Marbles — żart**
- **Zamiast jabłka: odpowiedź HTTP**

## 11. HTTP: od definicji do wykonania

**ID:** `05-zrodla-2`

- **Definicja ≠ wykonanie**
- **subscribe uruchamia request**
- **next → complete**
- **httpGet: klient HTTP, nie operator**

## 12. httpGet od środka

**ID:** `05b-http-kod`

- **Producent uruchamiany przy subscribe**
- **fetch → r.json()**
- **subscriber.next(data) → complete()**
- **Uproszczenie: tylko ścieżka sukcesu**

## 13. Cold: jedna definicja, trzy wykonania

**ID:** `04a-dwa-tory`

- **Jedna definicja, trzy wykonania**
- **Trzy async pipe — ile requestów?**
- **Własny wynik i complete**
- **Niezależne cykle życia**

## 14. interval: strumień bez końca

**ID:** `05-zrodla`

- **Cold: osobny timer każdego odbiorcy**
- **Późny B — własne 0**
- **Emisje bez końca**
- **unsubscribe tylko własnego wykonania**
- **unsubscribe ≠ complete**

## 15. Subject — ręczna emisja

**ID:** `05-zrodla-5`

- **Observable + Observer**
- **Ręczne next → aktualni odbiorcy**
- **Późny B — bez historii**
- **complete kończy Subject**
- **Późny C — tylko complete**
- **next po complete ignorowane**

## 16. Subject: ręczny multicast HTTP

**ID:** `05-zrodla-3`

- **Subject również Observerem**
- **http$.subscribe(subject$) — ręczne podłączenie**
- **Jeden HTTP, odbiorcy A/B**
- **HTTP complete → Subject complete**
- **Późny C — tylko complete**

## 17. Subject — kto odłączy źródło?

**ID:** `05-zrodla-4`

- **Ręczne połączenie ze źródłem**
- **Zero odbiorców — interval działa**
- **Brak automatycznego refCount**
- **connection.unsubscribe() zatrzymuje źródło**
- **Subject pozostaje otwarty**

## 18. Jakie znasz operatory RxJS?

**ID:** `02-znane-operatory`

- **Jakie operatory znacie?**
- **map / tap / filter / switchMap**

## 19. Operator to funkcja

**ID:** `04-operator`

- **pipe: nadal definicja**
- **subscribe ←, wartości →**
- **map synchronicznie: User → string**
- **Jeden request HTTP**
- **complete przechodzi dalej**

## 20. myMap od środka

**ID:** `04b-map-kod`

- **Operator zwraca funkcję**
- **subscribe wyniku → subscribe źródła**
- **fn(value) → subscriber.next**
- **error / complete przekazane dalej**
- **Zwrócona subskrypcja — teardown**

## 21. A share?

**ID:** `03-a-share`

- **Kto używa share?**
- **Cold: trzy requesty**
- **Subject: ręczne podłączenie**
- **Automatyczne zarządzanie źródłem?**

## 22. share(): wspólny request i późny odbiorca

**ID:** `04a-dwa-tory-2`

- **A/B — wspólny HTTP #1**
- **Późny C po complete?**
- **Reset po complete**
- **C — nowy HTTP #2**
- **share nie pamięta wyniku**

## 23. share() — kto odłączy źródło?

**ID:** `04a-dwa-tory-3`

- **A/B — jeden interval**
- **Ostatni odbiorca odchodzi?**
- **Zero odbiorców → odłączenie źródła**
- **Bez complete i historii**
- **Późny C — od 0**

## 24. shareReplay(1): kto zatrzyma interval?

**ID:** `20a-sharereplay-interval`

- **shareReplay(1): ostatnia wartość**
- **Domyślnie refCount: false**
- **Zero odbiorców — interval działa**
- **Bufor nadal aktualizowany**
- **Późny B: bufor + live**

## 25. shareReplay z refCount: kiedy znika bufor?

**ID:** `20b-sharereplay-refcount`

- **refCount: true na interval**
- **B: bufor + wspólne źródło**
- **Ostatni odbiorca odchodzi?**
- **Odłączenie źródła + reset bufora**
- **Późny C — od 0**
- **Wyjątek: bufor po complete zostaje**

## 26. shareReplay: późny odbiorca dostaje wynik

**ID:** `20-sharereplay-2`

- **refCount: true na HTTP**
- **Jeden request, bufor wyniku**
- **Późny B — co dostanie?**
- **Z bufora: 42 + complete**
- **Po complete bufor zostaje**

## 27. A jeśli wartością jest Observable?

**ID:** `08-map-strumienie`

- **map tworzy Observable**
- **Utworzenie ≠ request**
- **concatAll subskrybuje inner**
- **Dwa HTTP: A, potem B**
- **complete innera ≠ complete całości**
- **Koniec: outer + wszystkie innery**

## 28. concatMap — Po kolei

**ID:** `09-concatmap`

- **map + concatAll**
- **A pracuje — co z B?**
- **Kolejka wartości, przed projekcją**
- **complete A → start B**
- **C przychodzi po B**
- **Kolejność zapisów — autosave**

## 29. mergeMap — Równocześnie

**ID:** `10-mergemap`

- **A pracuje — co z B?**
- **Równoległe subskrypcje**
- **Wyniki według odpowiedzi: B, A, C**
- **Koniec: outer + wszystkie innery**
- **Niezależne requesty / uploady**

## 30. switchMap — Najnowsza subskrypcja

**ID:** `11-switchmap`

- **Nowa wartość — co z A?**
- **Poprzedni inner → unsubscribe**
- **Wyniki aktualnego innera**
- **unsubscribe ≠ complete**
- **Serwer nie cofa operacji**
- **Wyszukiwarka — aktualna fraza**

## 31. exhaustMap — Jestem zajęty

**ID:** `12-exhaustmap`

- **Drugie kliknięcie podczas zapisu?**
- **Aktywny inner → ignorowanie wejść**
- **Bez projekcji i kolejki**
- **Po complete przyjmuje kolejne**
- **Wielokrotny submit**

## 32. Zaprojektujmy wyszukiwarkę

**ID:** `12-intro-wyszukiwarka`

- **Wyszukiwarka frameworków**
- **300 ms ciszy**
- **Pusta fraza — brak wyników**
- **Skąd bierze się query$?**

## 33. Źródło: skąd bierze się query$?

**ID:** `12-query-zrodlo`

- **fromEvent — zdarzenia input**
- **map — value.trim()**
- **query$: podgląd + wyszukiwarka**
- **share: jeden listener, jedno map**

## 34. Wybór operatora

**ID:** `12a-switchmap-live`

- **Jaki operator dla aktualnej frazy?**
- **switchMap — poprzednie HTTP anulowane**
- **Trzy requesty, jeden wynik**
- **Aktualność ≠ ograniczenie częstotliwości**
- **Jak ograniczyć requesty?**

## 35. debounceTime — czekamy na ciszę

**ID:** `12b-debounce-switchmap`

- **300 ms ciszy**
- **Każdy znak resetuje timer**
- **Klawisz już anuluje HTTP?**
- **Anulowanie dopiero po debounce**
- **Powtórzona fraza — kolejny HTTP**

## 36. distinctUntilChanged — znowu to samo?

**ID:** `11a-distinct-switchmap`

- **Po debounce, przed switchMap**
- **Porównanie z ostatnią emisją**
- **Domyślnie ===; obiekty po referencji**
- **react → react: bez HTTP**
- **ang: error 500**
- **Error 500 zamyka wyszukiwarkę**

## 37. catchError — wyszukiwarka działa dalej

**ID:** `11b-catcherror-search`

- **catchError wewnątrz switchMap**
- **Error HTTP → of([])**
- **[] + complete tylko innera**
- **query$ nadal aktywne**
- **angular — następny HTTP działa**

## 38. catchError na zewnątrz

**ID:** `b04-catcherror`

- **catchError na zewnątrz switchMap**
- **Błąd odłącza oryginalne źródło**
- **of([]) → [] → complete**
- **Kolejne kliknięcie — brak reakcji**
- **Zakończenie zależy od fallbacku**

## 39. retry — nie udało się? Spróbuj później

**ID:** `x03-retry-backoff`

- **retry = ponowna subskrypcja**
- **count: 3 → maksymalnie 4 próby**
- **Backoff: 1 / 2 / 4 s**
- **Oczekiwanie bez aktywnego HTTP**
- **Wyczerpany limit → error**
- **Produkcja: błędy przejściowe, limit, jitter**

## 40. Cztery operatory, jeden strumień

**ID:** `16-czas-cztery`

- **debounce: ostatnia po ciszy**
- **throttle domyślnie: pierwsza w oknie**
- **audit: ostatnia na końcu okna**
- **throttle trailing: okno od zdarzenia**
- **sample: własny zegar, puste takty**
- **Te same wartości, inne chwile**

## 41. RxJS w prawdziwym kodzie — kto wygrywa?

**ID:** `24-rxjs-liczby`

- **Najczęstszy *Map?**
- **switchMap ≈ 80%**
- **map: 4282**
- **shareReplay / share ≈ 3,7×**
- **concatAll: 1**
- **Wybrany zbiór, nie cały świat**

## 42. Pytania?

**ID:** `pytania`

- **Pytania z sali**
- **Feedback — QR**
- **WebStorm — konkurs**
- **Dzięki za spotkanie**
