# TrainEE — Plataforma de Gestió d'Entrenament

TrainEE és una aplicació full-stack dissenyada per a entrenadors d'atletisme (o altres esports) que necessiten organitzar i recopilar la disponibilitat setmanal dels seus atletes mitjançant una interfície àgil basada en el drag-and-drop.

## Tecnologies utilitzades

### Backend
- **Go 1.21+** (compilat i natiu)
- **Gin Web Framework** per a rutes HTTP i middleware.
- **PostgreSQL** amb driver `pgx/v5`.
- **Golang-migrate** encastat al binari (`//go:embed`) per inicialitzar la BDD a l'arrencada.
- **JWT (Golang-jwt v5)** per a l'autenticació i protecció de rutes.
- Arquitectura en capes: `handlers`, `store`, `models`, `auth`.

### Frontend
- **Vue 3** amb Composition API (`<script setup>`).
- **TypeScript** pur (sense `.js`).
- **Vite** com a *bundler* ultra ràpid i dev-server.
- **PrimeVue 4** amb tema *Aura* per components de UI complexos (Modals, Selects, Drawers).
- **Pinia** per a la gestió global de l'estat (sessions, calendaris).
- **Axios** (amb interceptors automàtics) per la connexió REST.
- HTML5 Drag and Drop natiu (sense pes extra a la capa de presentació).

---

## Estructura del Projecte

```
trainee/
├── backend/                  # Servidor API i base de dades
│   ├── cmd/server/main.go    # Punt d'entrada de l'API
│   ├── internal/             # Lògica i regles de negoci (auth, handlers, store)
│   ├── migrations/           # Scripts SQL (schema i dades llavor)
│   ├── Dockerfile            # Creador d'imatges Go
│   └── go.mod                # Mòduls Go
│
├── frontend/                 # Client SPA (Single Page Application)
│   ├── src/
│   │   ├── api/              # Capa de comunicació de xarxa (axios)
│   │   ├── components/       # Parts reutilitzables i Drag & Drop zones
│   │   ├── stores/           # Pinia states
│   │   └── views/            # Vistes d'atleta i entrenador
│   ├── Dockerfile            # Creador d'imatge frontend (per nginx)
│   ├── package.json          # Dependències NPM
│   └── vite.config.ts        # Setup de Vite amb proxy de /api
│
├── .env.example              # Exemple de variables d'entorn globals
└── docker-compose.yml        # Orquestració del clúster (sense DB, donat que es proveeix fora)
```

---

## Com arrencar el projecte en entorn de desenvolupament

Donat que ja disposes d'un servidor PostgreSQL extern/aixecat, arrencarem els projectes manualment per poder treballar de forma ràpida.

### 1. Variables d'entorn i Base de Dades

El backend necessita saber on connectar-se. Assegura't de tenir el PostgreSQL corrent (pots utilitzar la teva eina preferida) i crea una base de dades buida (per exemple, anomenada `trainee`).

A la carpeta `./backend`, copia el fitxer `.env.example` a `.env` i adapta-hi la connexió.
*(Si el PostgreSQL corre en local per defecte amb usuari `postgres` sense password, el valor per defecte funcionarà).*

```bash
cd backend
cp .env.example .env

# Per defecte esperarà postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable
```

### 2. Arrencar el Backend (Go)

Les migracions SQL (`000001_init` i `000002_seed`) es llançaran soles automàticament el primer cop que aixequis el servidor, gràcies al motor integrat a `main.go`.

```bash
cd backend
go mod tidy
go run cmd/server/main.go
```
*L'API quedarà escoltant al port `8080`.*

### 3. Arrencar el Frontend (Vite/Vue)

Obre una nova pestanya al terminal:

```bash
cd frontend
npm install
npm run dev
```
*El frontend quedarà escoltant a `http://localhost:5173`. L'aplicació inclou un proxy al fitxer `vite.config.ts` per redirigir transparentment `/api/*` al teu backend (`localhost:8080`).*

---

## Guia d'Ús Ràpida (Començar a provar)

En arrencar el servidor, la migració de "seed" (`000002_seed.up.sql`) ha creat 3 perfils **orfes** d'entrenador. Són perfils sense un usuari real assignat, creats perquè el club pugui existir abans de registrar usuaris reals.

1. **Vés a http://localhost:5173** i clica a "Registra't".
2. **Crea el teu Entrenador**: Tria el rol "Sóc Entrenador", omple el teu nom, email, password, i al selector final escull el perfil `"Marc - Entrenador Sènior"`. D'aquesta manera *reclames* el perfil d'entrenador de la BDD.
3. El sistema et deixarà a dins del teu **Dashboard d'Entrenador**.
4. A la barra de navegació, clica a **"Setmanes"** i crea'n una de nova (Selecciona un dilluns al calendari i desa). 
5. Ara vés a un altre navegador o finestra d'incògnit. Clica "Registra't".
6. **Crea un Atleta**: Tria el rol "Sóc Atleta". Omple els teus detalls i escull el teu nou entrenador (l'únic que has reclamat) al desplegable.
7. Com a Atleta, veuràs el **Calendari**. Donat que el teu entrenador acaba d'obrir una setmana, podràs arrossegar activitats als forats i guardar.
8. Torna al navegador de l'Entrenador, recarrega el **Dashboard** i veuràs immediatament la resposta del teu atleta.
