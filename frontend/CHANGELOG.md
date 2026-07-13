# Changelog

Tots els canvis notables en aquest projecte es documentaran en aquest fitxer.

## [1.3.2] - 2026-07-13

### Afegit

#### Backend
- **Integració amb Cloudflare R2**: Migració de les pujades de fitxers d'anuncis i de peticions de feedback a Cloudflare R2 amb fallback automàtic a disc local si no s'especifiquen les credencials.
- **Notificacions de nous tiquets de feedback**: Enviament asíncron de notificacions per correu electrònic a tots els entrenadors actius en el seu idioma corresponent quan un usuari/atleta crea una petició/bug, mostrant la imatge de R2 de forma inline.
- **Cognoms de l'atleta a competicions**: S'ha afegit `AtletaCognoms` al struct `Competicio` i s'han actualitzat les consultes SQL de la base de dades per seleccionar `a.cognoms as atleta_cognoms`.
- **Taula de recordatoris setmanals**: Creada la taula `weekly_submission_reminders` per guardar el nombre d'emails automàtics i manuals enviats per atleta i setmana.
- **Ruta de recordatoris manuals**: Nou endpoint `POST /entrenador/atletes/:id/remind` per reenviar manualment els correus de recordatori.
- **Registre i comptadors de recordatoris**: Comptadors incrementats en enviar correus tant pel cron com per la ruta manual.

#### Frontend
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
