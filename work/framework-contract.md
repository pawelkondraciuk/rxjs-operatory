# Kontrakt prototypów v2

Zakres tej partii: osobny podgląd QA, bez migracji istniejących slajdów.
Bazowe lokalne zmiany: `vite.config.mjs` (dev base `/`, host 127.0.0.1 i HMR), nieśledzony `wymagania_v2.md`. Zachować.

## Dane i snapshot

Opcjonalne `graph.executions`: `{id,node,edge,panel,value,label,duration}`. `node` wskazuje wiersz pracy, `edge` subskrypcję gateWork. Czas pracy jest czasem modelu; czas ilustracji określa planFlow. Liczniki pochodzą ze stanu wykonania po faktycznej subskrypcji.
Opcjonalne timeline: `http-error`, `catch-handle`, `fallback-next`, `execution-focus` (pole `execution`, dla focus null zamyka szczegóły). Timeline używa czasu modelu i `plan.timeOf`; sceny mogą dostarczyć event selector zamiast at do precyzyjnego powiązania z ilustracją. ID i nazwy zgodne z dotychczasowymi zdarzeniami.
Snapshot zachowuje dotychczasowe pola; dodaje `executions` (`id,node,edge,panel,value,label,state,progress,httpState,handledError,focused,values`), `executionCounts` (`started,active,completed,cancelled,error`) i `focusedExecutionId`. Stany inner: running/completed/cancelled/error. HTTP: idle/running/success/error/cancelled. `handledError` nie jest stanem terminalnym inner. Anulowanie blokuje późniejsze next/error/catch/fallback, zatrzymuje postęp; historia odbiorcy zmienia się dopiero po dostarczeniu next.

## Panel

`graph.panels` zachowuje geometrię; opcjonalnie `id,recipe,maxRows,detailsHeight`. Domyślnie maxRows=3, najwyżej 4. Recepta ujawniona po pierwszej subskrypcji. Jeden fokus, miejsce na szczegóły zarezerwowane od początku. Aktywne, kolejka i fokus pozostają widoczne; starsze zakończone zbiorczo. Dla panelu wykonań nie rysujemy ponownie legacy workRow ani tekstowej kolejki. Źródło/operator/odbiorca mają wspólną wysokość; wyniki wewnątrz odbiorcy. Renderer rozpoznaje tylko pola snapshotu, nigdy operator ani ID sceny.

## Czas i sterowanie

Opcjonalne `scene.timing` w sekundach: subscribe=.7 (cały standardowy łańcuch), travel=.4, transform=.3, terminal=.35, gap=.5, http=1.5. Legacy zachowuje obecne .8 i .15. Domyślna praca HTTP jest w adapterze scenariusza, nie w rendererze.
Opcjonalne `scene.playback.controller='stages'`; explicit stops są etapami dydaktycznymi. Eksport `createStageController(player,{mode,onNavigate,onChange})`: next, previous, toggle, setMode, reset, finish, seek, suspend/resume; gettery mode/state. Jedyny RAF pozostaje w playerze. AUTO też kończy bieżący etap na next; wynik trzymany. Reveal adapter przez addKeyBinding/fragmenty, bez globalnego handlera strzałek. Niemigrowane sceny mają dotychczasową obsługę.
Reduced motion ogranicza geometrię ruchu w renderowaniu, bez zmiany modelu, checkpointów i czasu gracza.

## Przykładowe kadry

READY: executions=[], started=0, historia=[].
Po subskrypcji A: A running/http running, started=1, active=1. B w kolejce nie zwiększa started.
Po przechwyceniu błędu B: B running/http error/handledError=true/focused=true.
Po fallback i complete B: B completed/http error/handledError=true, active=0. Historia zawiera fallback dopiero po dotarciu tokena.
Po anulowaniu A: A cancelled/http cancelled, progress<1; brak późnego fallbacku.

Pliki właścicieli: A engine/flow/lifecycle i nowy moduł execution-state oraz tests/model-v2.test.cjs; B renderer/primitives/reveal.css i tests/view-v2.test.cjs; C player/main i nowe stage-controller/reveal-stages oraz tests/playback-v2.test.cjs. Prowadzący: katalog prototypów, QA, dokumentacja, package.json, baseline.
