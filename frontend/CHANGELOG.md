# Changelog

Tots els canvis notables en aquest projecte es documentaran en aquest fitxer.

## [1.3.3] - 2026-07-21

### Afegit

#### Backend
- **Catàleg i Comandes de Material**:
  - Nova migració de base de dades `000031_create_material_catalog_and_orders.up.sql` que crea les taules `material_productes` (nom, descripció, talles, flag `requereix_talla`, imatges, preu, estat `actiu`) i `material_comandes` (`atleta_id`, `producte_id`, `talla`, `quantitat`, `preu_unitari`, `preu_total`, `estat` [`pendent`, `bloquejada`, `pagada`, `servida`] i `notes`).
  - Afegida la configuració global `material_comandes_enabled` a `system_settings` per obrir/tancar les comandes.
  - Nous endpoints API Gin per a la gestió de productes, comandes d'atletes, canvis d'estat en massa, pujada d'imatges i exportació en format CSV/Excel.
  - Millores a `uploader.go` amb generació automàtica de còpia local (`/api/uploads/...`) i fallback si les credencials o el domini públic de Cloudflare R2 no estan actius.
- **Respostes interessants i comentaris d'entrenador als formularis**:
  - Nova migració de base de dades `000032_add_interessant_and_comentaris_to_forms` que afegeix les columnes `is_interesting` (booleà) i `comentari` (text) a les taules `form_responses` i `form_answers`.
  - Actualitzats els models i store de Go per gestionar l'estat de destacat i els comentaris interns privats de l'entrenador.
  - Nous endpoints HTTP `PUT /api/entrenador/responses/:responseId` i `PUT /api/entrenador/answers/:answerId`.

#### Frontend
- **Mòdul de Material per als Atletes (`MaterialCatalogView.vue`)**:
  - Nova ruta `/material` per consultar el catàleg actiu, triar talles i quantitat compacta (`140px`), afegir notes i enviar comandes de múltiples productes.
  - Taula de l'històrial de comandes de l'atleta amb badges d'estat i opció d'editar/cancel·lar comandes pendents quan les comandes estan obertes.
- **Mòdul de Gestió de Material per als Entrenadors (`MaterialManagerView.vue`)**:
  - Nova ruta `/material-manager` amb **Commutador Global ON/OFF** per obrir/tancar la finestra de comandes a tots els atletes.
  - *Gestió del Catàleg*: Formulari modal per crear/editar productes amb opció de pujar fitxer o afegir per URL directa, definició de talles i commutador de *"Requereix Talla"*.
  - *Gestió de Comandes*: Filtres per dates i estats, resum de mètriques (total comandes, unitats, import total), acció massiva *"Bloquejar Pendents"*, selector d'estats a la taula i **botó d'exportació a Excel (CSV)** desglossat línia per línia.
- **Marcador d'interessant i comentaris d'entrenador als formularis**:
  - *Vista general de respostes*: Botons d'estrella per marcar/desmarcar candidats com a interessants, insígnies indicadores visuals (`Destacat` / `Amb comentari`) i previsualització del comentari privat.
  - *Modal de detall de respostes*: Suport per afegir un comentari i marcar com a interessant tant el candidat complet com cada una de les preguntes individuals contestades, amb ressaltat visual en daurat.
  - *Exportació a Excel/CSV*: Inclou l'estat d'interessant i els comentaris privats de l'entrenador a l'informe descarregat.
  - *Traduccions*: Afegides les claus de traducció en català, castellà i anglès (`ca.json`, `es.json`, `en.json`).


## [1.3.2] - 2026-07-13

### Afegit

#### Backend
- **Integració amb Cloudflare R2**: Migració de les pujades de fitxers d'anuncis i de peticions de feedback a Cloudflare R2 amb fallback automàtic a disc local si no s'especifiquen les credencials.
- **Pujada de tracks de competició a R2**: Integració de la pujada de tracks de curses (.gpx) a Cloudflare R2 mitjançant l'uploader unificat.
- **Múltiples imatges a peticions i respostes**: Suport per registrar múltiples captures a peticions de feedback i en les seves respostes. Nova migració per a columnes `imatges` i `resposta_imatges` (arrays de text), i actualització dels handlers de pujada.
- **Notificacions de nous tiquets de feedback**: Enviament asíncron de notificacions per correu electrònic a tots els entrenadors actius en el seu idioma corresponent quan un usuari/atleta crea una petició/bug, mostrant la imatge de R2 de forma inline.
- **Cognoms de l'atleta a competicions**: S'ha afegit `AtletaCognoms` al struct `Competicio` i s'han actualitzat les consultes SQL de la base de dades per seleccionar `a.cognoms as atleta_cognoms`.
- **Taula de recordatoris setmanals**: Creada la taula `weekly_submission_reminders` per guardar el nombre d'emails automàtics i manuals enviats per atleta i setmana.
- **Ruta de recordatoris manuals**: Nou endpoint `POST /entrenador/atletes/:id/remind` per reenviar manualment els correus de recordatori.
- **Registre i comptadors de recordatoris**: Comptadors incrementats en enviar correus tant pel cron com per la ruta manual.

#### Frontend
- **Descàrrega de tracks per a l'entrenador**: S'ha afegit un botó de descàrrega de track (.gpx) a la fitxa de competicions entrants i a la modal de detalls de l'històric de competicions de l'entrenador, incloent-hi una icona indicadora al llistat de l'històric.
- **Gestió de múltiples imatges de feedback**: Selecció i eliminació de múltiples captures de pantalla en crear un tiquet o respondre-hi, i presentació d'aquests fitxers com a galeria de fotos al calaix de detall.
- **Cognoms de l'atleta a competicions**: Visualització de cognoms de l'atleta al costat del seu nom a `CompeticionsManagerView.vue`, `CompeticionsHistoricView.vue` i `CompeticioDetailView.vue`.
- **Mètriques i reenviament al Dashboard**: Nova columna "Recordatoris" al dashboard d'entrenador amb comptadors de recordatoris automàtics (rellotge ⏰) i manuals (mà 👆), amb botó per reenviar a l'instant.

## [1.3.1] - 2026-07-09 (Hotfix)

### Corregit

#### Backend
- **Resposta de l'API al marcar setmana gestionada**: Corregit un error 500 en marcar setmanes com a gestionades/planificades des del dashboard d'entrenador. L'estat s'actualitzava correctament a la base de dades, però fallava la resposta al frontend per un error d'escaneig de dades.

#### Frontend
- **Correcció de fus horari en les dates**:
  - *Dates locals*: S'ha solucionat el problema on els usuaris de fora d'Europa (com Sud-amèrica) veien començar la setmana en diumenge en lloc de dilluns a causa del desfase de zona horària amb UTC.
  - *Consistència visual*: S'ha unificat la visualització de dates de competicions i tests perquè es mostrin correctament segons la data local seleccionada i no la convertida a UTC.
- **Ocultar activitats inactives al calendari**:
  - *Amagar inactives*: En omplir la disponibilitat de la setmana, s'oculten les activitats que l'entrenador ha marcat com a inactives. Also es descarten en aplicar una plantilla desada si aquesta contenia alguna activitat que ara està desactivada.
- **Control d'atletes inactius a planificació i tests**:
  - *Filtre a Planificació*: S'ha afegit un selector a la vista de planificació de l'entrenador per poder filtrar els atletes entre "Actius", "Inactius" o "Tots".
  - *Restricció a Tests*: La llista d'atletes i els llistats de tests/recordatoris pendents al panell de tests s'han limitat per mostrar exclusivament els atletes actius.
- **Modificacions al correu de traspàs de setmana**:
  - *Enllaç a TrainingPeaks*: El correu que rep l'atleta quan es planifica/traspassa la setmana ara inclou un enllaç directe a TrainingPeaks en lloc del d'aquesta aplicació.
  - *Signatura actualitzada*: S'ha canviat el signant del correu perquè consti com a "L'equip d'entrenador trail".

## [1.3.0] - 2026-07-08

### Afegit

#### Frontend
- **Recuperació de Contrasenya**:
  - *Recuperació al login*: S'ha afegit un enllaç per restablir la contrasenya mitjançant correu electrònic en cas d'oblit.
  - *Seguretat contra enumeració*: El servidor respon el mateix text d'èxit de forma idèntica si l'email no coincideix amb cap compte actiu.
- **Plantilles de Setmana**:
  - *Setmanes tipus*: Els atletes poden desar configuracions setmanals de disponibilitat com a plantilles personalitzades.
  - *Selector ràpid*: Permet aplicar les plantilles desades a la setmana activa d'un sol clic o seguir configurant-la manualment.
  - *Gestió inline*: Opció per esborrar les plantilles desades des de la vista de Calendari.
- **Gestió d'Atletes (Entrenadors)**:
  - *Edició de dades*: Els entrenadors ara poden editar el nom i cognoms dels seus atletes directament des de la secció de Gestió d'Atletes.
  - *Sincronització*: Els canvis s'envoixen de fons per sincronitzar-se de forma immediata amb la base de contactes de Brevo.
- **Millores Visuals al Dashboard**:
  - *Colors d'estat de setmana*: Las files es ressalten en color verdós clar quan l'atleta marca la setmana com a completada, i en un to blau visible un cop l'entrenador les ha marcat com a traspassades.
  - *Logo a les plantilles de correu*: S'ha ajustat la capçalera dels emails de recordatori perquè s'adapti correctament a l'interior del cercle de fons blanc, evitant retalls o deformacions.
- **Exportació a Excel (Formularis)**:
  - *Exportació de respostes*: S'ha afegit un botó per descarregar les respostes dels formularis en format Excel/CSV compatible.
  - *Taula de selecció*: Permet triar exactament quins candidats/atletes incloure a l'informe descarregat.
  - *Estructura neta*: Genera una fila per atleta amb les seves respostes detallades per columnes segons les preguntes.

## [1.2.0] - 2026-07-07

### Afegit

#### Frontend & Backend
- **Integració amb Brevo**:
  - *Sincronització automàtica*: S'ha vinculat la base de dades d'usuaris amb la plataforma d'email màrqueting Brevo de manera automàtica.
  - *Gestió des de l'admin*: S'ha afegit una columna al tauler d'administrador per veure l'estat de la sincronització de cada usuari i la possibilitat de forçar-ne una manualment en cas d'error.
- **Nou camp Cognoms**:
  - *Registre i Perfil*: Els usuaris ara poden (i se'ls demana) introduir els seus cognoms durant el registre i l'edició del perfil.
- **Gestió de Feedback i Petició**:
  - *Estat i Resposta*: Ara es pot contestar a les peticions dels usuaris i canviar el seu estat.
  - *Notificació per Email*: L'usuari rep un correu electrònic automàtic quan se li contesta el tiquet de feedback.
- **Millores al Dashboard (Entrenadors)**:
  - *Atletes Actius/Inactius*: Per defecte s'oculten els atletes inactius i s'ha afegit un filtre per poder-los mostrar.
  - *Estats de Planificació*: S'ha afegit un filtre per veure quins atletes estan planificats i quins no, i la fila queda ombrejada quan s'ha marcat com a planificat.
  - *Notificacions automàtiques*: En marcar la setmana com a planificada, l'atleta rep un correu electrònic avisant-lo.
- **Calendari i Disponibilitat (Atletes)**:
  - *Copiar Dies*: S'ha afegit un botó per poder copiar les hores i activitats marcades d'un dia a la resta de dies de la setmana d'una sola vegada.

## [1.1.1] - 2026-07-01

### Afegit
- Petites correccions i millores d'estabilitat.

## [1.1.0] - 2026-06-30

### Afegit

#### Frontend & Backend
- S'ha implementat el compliment normatiu del RGPD juntament amb múltiples millores a l'edició de formularis i navegació.
- **Privacitat i RGPD**:
  - Acceptació obligatòria de la Política de Privacitat per a tots els usuaris.
  - Registre segur del consentiment, incloent l'adreça IP i versió de la política acceptada.
  - Nova pantalla visual per a la informació legal (Primera Capa).
- **Formularis (Form Builder)**:
  - *Formularis globals*: Ara els formularis són independents de l'entrenador.
  - *Drag & Drop*: Les preguntes del formulari es poden reordenar arrossegant i deixant anar (arrossega la icona de punts).
- **Tauler i Vistes**:
  - Els textos llargs als camps de notes ara es mostren completament en multilínia.
  - Cerca per nom i paginació afegida al llistat d'atletes.
  - Graella d'activitats redistribuïda a 2 columnes.
  - Filtre afegit a la vista de Planificació per ocultar les competicions descartades.
  - Filtre de setmanes ordenat de forma cronològica (de més antiga a més nova).
- **Navegació**:
  - Reestructuració de la barra superior agrupant la navegació en Atletes, Planificació i Configuració.
