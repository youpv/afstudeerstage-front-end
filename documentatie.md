# Project Documentatie: Polaris POC Integratie Beheer

## 1. Introductie

Dit document beschrijft de technische architectuur en werking van de Polaris POC (Proof of Concept) applicatie. De applicatie is een client-side React applicatie, gebouwd met Vite, die gebruikers in staat stelt om product data integraties met externe systemen (via FTP) te configureren, te beheren en data te mappen met behulp van AI (OpenAI). De gebruikersinterface is gebouwd met het Shopify Polaris Design System.

## 2. Systeem Architectuur

De applicatie bestaat uit de volgende hoofdcomponenten:

*   **Frontend (Client-Side React Applicatie):**
    *   Verantwoordelijk voor de gebruikersinterface, gebruikersinteractie, en het beheren van de configuratie flow.
    *   Communiceert met een backend API voor persistentie en het triggeren van processen.
    *   Maakt direct verbinding met externe FTP servers voor data-acquisitie (tijdens configuratie/preview) via backend proxy-endpoints (`/api/ftp/test`, `/api/ftp/download`).
    *   Maakt direct verbinding met de OpenAI API voor het verkrijgen van data mapping suggesties.

*   **Backend API (Extern):**
    *   Draait (verondersteld) op `http://localhost:3000/api`.
    *   Verantwoordelijk voor:
        *   CRUD (Create, Read, Update, Delete) operaties op integratieconfiguraties (via `/products/configs` endpoints).
        *   Het triggeren van de daadwerkelijke data synchronisatieprocessen (via `/products/sync`).
        *   Proxying van FTP operaties (testen van verbinding, downloaden van bestanden) om FTP credentials niet direct in de client te exposen.
        *   Opslaan en beheren van gevoelige informatie zoals FTP credentials (verondersteld veilig opgeslagen).

*   **Externe Services:**
    *   **FTP Servers:** Bronnen van productdata. De applicatie leest data van deze servers via de backend proxy.
    *   **OpenAI API:** Wordt gebruikt om suggesties te genereren voor het mappen van bron data naar Shopify productvelden.

## 3. Technische Stack

*   **Frontend Framework:** React 18
*   **Build Tool:** Vite
*   **Programmeertaal:** JavaScript
*   **UI Design System:** Shopify Polaris v12
*   **Routing:** React Router DOM v7
*   **State Management:**
    *   React Context API (voor `IntegrationContext`)
    *   `@tanstack/react-query` (voor server state management, caching en mutations zoals FTP operations en syncs)
*   **HTTP Clients:**
    *   Native `fetch` API (voor communicatie met de backend API en OpenAI client)
    *   De `ftp-client.js` (in `src/services`) is een *logische* client die de `basic-ftp` library gebruikt, maar de daadwerkelijke FTP calls in de wizard lopen via backend proxy endpoints.
    *   `openai` library (voor communicatie met OpenAI API, in `src/services/openai-client.js`)
*   **Development Environment:** Verondersteld Node.js voor de build-tools en de (niet direct zichtbare) backend.

## 4. Projectstructuur

De broncode (`src`) is als volgt gestructureerd:

*   **`src/`**
    *   **`App.jsx`**: Hoofd React component, definieert routes en algemene app logica. Handelt de wizard finish en navigatie.
    *   **`main.jsx`**: Entry point van de applicatie, initialiseert React, Polaris `AppProvider`, `BrowserRouter`, `QueryClientProvider`, en de custom `IntegrationProvider`.
    *   **`assets/`**: Statische bestanden (bv. `react.svg`).
    *   **`components/`**: Herbruikbare UI componenten.
        *   `IntegrationEditor.jsx`: Dit is feitelijk een *pagina*-wrapper die de `IntegrationWizard` pagina hergebruikt in een "edit" modus. Het haalt de bestaande integratie data op basis van de URL parameter en geeft deze als `initialData` door aan de `IntegrationWizard`.
        *   **`IntegrationWizard/`**: Componenten specifiek voor de multi-step integratie wizard.
            *   `WizardStepBasics.jsx`: Rendert de UI voor de "Basis Informatie" stap. Props:
                *   `name`, `setName`, `nameId`: Voor de integratienaam.
                *   `connectionType`, `setConnectionType`: Voor het selecteren van het brontype (bv. FTP).
                *   `stepTitle`: Titel van de stap.
            *   `WizardStepConnectionFtp.jsx`: Rendert de UI voor de "Connectie Details" (FTP specifiek). Props:
                *   `stepTitle`, `ftpHost`, `setFtpHost`, `ftpHostId`, `ftpPort`, `setFtpPort`, `ftpPortId`, `ftpUser`, `setFtpUser`, `ftpUserId`, `ftpPassword`, `setFtpPassword`, `ftpPasswordId`, `filePath`, `setFilePath`, `filePathId`, `dataPath`, `setDataPath`, `dataPathId`: Voor FTP formulier velden.
                *   `handleTestConnectionClick`: Functie voor het starten van de connectie test.
                *   `testConnectionMutation`, `downloadMutation`: React Query mutation objecten voor de status van FTP operaties.
                *   `truncatedPreviewString`: String preview van gedownloade data.
                *   `dataPathError`: Foutmelding gerelateerd aan het parsen van het `dataPath`.
                *   `remoteData`: Ruwe gedownloade data.
                *   `productCount`: Aantal gevonden producten na parsen van `dataPath`.
            *   `WizardStepMapping.jsx`: Rendert de UI voor de "Data Mapping" stap. Dit is een complex component.
                *   **Props:** `stepTitle`, `titleKey`, `setTitleKey`, `titleKeyId`, `optionalFieldKeys`, `setOptionalFieldKeys`, `activeOptionalFields`, `setActiveOptionalFields`, `metafieldMappings`, `setMetafieldMappings`, `fieldConstants`, `mappingOptions`, `remoteData`, `processedPreviewData`.
                *   **Functionaliteit:**
                    *   Toont velden voor het mappen van de producttitel en andere standaard Shopify velden (`optionalFieldKeys`).
                    *   Stelt de gebruiker in staat om metafield mappings te configureren (`metafieldMappings`) voor zowel `single` als `dynamic_from_array` types.
                    *   Biedt een "Suggest Mappings" knop die de `openai-client.js` aanroept om AI-gegenereerde mapping suggesties te krijgen.
                    *   Toont een preview van de bron data waarden naast de mapping velden.
                    *   Gebruikt `fieldConstants` (bv. `FIELD_VENDOR`) voor consistentie.
                    *   `mappingOptions` zijn de beschikbare keys uit de bron data.
                    *   `processedPreviewData` is de data na toepassing van het `dataPath`, gebruikt voor previews en AI input.
            *   `WizardStepPreview.jsx`: Rendert de UI voor de "Preview" stap. Toont een gesimuleerde weergave van hoe een product eruit zou zien in Shopify op basis van de huidige mappings.
                *   **Props:** `stepTitle`, `processedPreviewData`, `mappedPreviewData`, `currentPreviewIndex`, `setCurrentPreviewIndex`.
                *   **Functionaliteit:**
                    *   Navigatie om door meerdere producten in de preview te bladeren.
                    *   Groepeert gemapte data in secties (Basis Info, Details, Tags, Inventaris & Prijzen, Verzending & Gewicht, Belasting, SEO, Metafields).
                    *   Gebruikt helper functies (`renderValue`, `createDescriptionListItems`) voor het formatteren van data.
                    *   `mappedPreviewData` is het resultaat van het toepassen van de mappings op een item uit `processedPreviewData`.
            *   `WizardStepSchedule.jsx`: Rendert de UI voor de "Planning" stap.
                *   **Props:** `stepTitle`, `frequency`, `setFrequency`, `frequencyId`.
                *   Biedt opties voor synchronisatie frequentie (bv. elk uur, dagelijks).
            *   `WizardStepsIndicator.jsx`: Toont de voortgang van de wizard via een reeks badges.
                *   **Props:** `steps` (array van stap-labels), `currentStep` (index van huidige stap).
            *   `WizardActions.jsx`: Rendert de "Back", "Next", en "Finish" knoppen voor de wizard navigatie.
                *   **Props:** `onBack`, `onNext`, `onSubmit`, `currentStep`, `totalSteps`, `isNextDisabled`, `isLoading`, `isEditing` (past de tekst van de finish-knop aan).
    *   **`context/`**: React Context providers.
        *   `IntegrationContext.jsx`: Beheert de state en CRUD operaties voor integraties.
            *   **State:**
                *   `integrations`: Array van integratie objecten.
                *   `isLoading`: Boolean die aangeeft of er data geladen wordt van de API.
                *   `error`: Error object als er iets misgaat bij API calls.
            *   **Reducer Acties:**
                *   `INIT`: Initialiseert de state met integraties (meestal van API).
                *   `ADD`: Voegt een nieuwe integratie toe aan de state.
                *   `EDIT`: Wijzigt een bestaande integratie in de state.
                *   `DELETE`: Verwijdert een integratie uit de state.
            *   **Belangrijkste Functies (exposed via `useIntegrations` hook):**
                *   `addIntegration(integration)`: Voegt lokaal toe en roept `saveIntegrationConfig` API aan. Update de lokale state met de server response (bv. met gegenereerde ID).
                *   `editIntegration(updated)`: Wijzigt lokaal en roept `updateIntegrationConfig` API aan. Update met server response.
                *   `deleteIntegration(id)`: Verwijdert lokaal en roept `deleteIntegrationConfig` API aan.
            *   **Synchronisatie:** Synchroniseert bij mount met `getIntegrationConfigs` en persisteert wijzigingen naar `localStorage` als fallback.
    *   **`mock/`**: Mock data voor ontwikkeling/testen.
        *   `productdata.json`: Voorbeeld productdata.
    *   **`pages/`**: Top-level componenten die volledige pagina's representeren.
        *   `Dashboard.jsx`: Toont een overzicht van alle integraties.
        *   `IntegrationDetail.jsx`: Toont details van een specifieke integratie.
        *   `IntegrationEditor.jsx`: Pagina-wrapper die de `IntegrationWizard` gebruikt om een bestaande integratie te bewerken.
        *   `IntegrationWizard.jsx`: Pagina die de multi-step wizard host voor het aanmaken of bewerken van integraties.
        *   `NotFound.jsx`: 404 pagina.
    *   **`services/`**: Modules voor communicatie met externe services.
        *   `api-client.js`: Functies voor interactie met de backend API (CRUD voor configs, sync trigger).
        *   `ftp-client.js`: *Logische* FTP client. De `FTPService` class hier definieert methoden zoals `downloadFile`, `listFiles`, `testConnection`. Deze class zelf wordt *niet* direct in de wizard gebruikt; de wizard roept backend proxy endpoints aan die waarschijnlijk een vergelijkbare FTP-logica (mogelijk deze class) aan de server-zijde gebruiken.
        *   `openai-client.js`: Service voor interactie met de OpenAI API (`suggestMappings` functie).
    *   **`utils/`**: Utility functies en componenten.
        *   `ScrollToTop.jsx`: Utility component om de pagina naar boven te scrollen bij navigatie.

## 5. Applicatie Flow

### 5.1. Initialisatie en Routing

1.  **`main.jsx`** laadt en rendert de `App` component.
2.  De `App` is gewrapt in:
    *   `AppProvider` (Polaris): Voor UI thema en i18n.
    *   `BrowserRouter`: Voor client-side routing.
    *   `QueryClientProvider`: Voor `@tanstack/react-query` (gebruikt voor o.a. FTP mutations in de wizard en sync mutatie op dashboard/detail).
    *   `IntegrationProvider`: Om de `IntegrationContext` beschikbaar te maken.
3.  **`App.jsx`** definieert de volgende routes:
    *   `/`: `Dashboard` pagina.
    *   `/integrations/new`: `IntegrationWizard` pagina (voor aanmaken).
    *   `/integrations/:id/edit`: `IntegrationEditor` pagina (die `IntegrationWizard` hergebruikt voor bewerken).
    *   `/integrations/:id`: `IntegrationDetail` pagina.
    *   `*`: `NotFound` pagina.

### 5.2. State Management (`IntegrationContext`)

*   De `IntegrationProvider` in `IntegrationContext.jsx` is de centrale hub voor het beheren van de lijst van integratieconfiguraties.
*   **Initiële Lading:** Bij het starten van de applicatie (wanneer `IntegrationProvider` mount), wordt `useEffect` getriggerd om `getIntegrationConfigs()` (van `api-client.js`) aan te roepen. De ontvangen integraties worden via `dispatch({ type: 'INIT', payload: apiIntegrations })` in de state gezet.
*   **State Structuur:** De state (`integrations`) is een array van objecten, waarbij elk object een integratieconfiguratie representeert. Deze objecten bevatten typisch `id`, `name`, `connectionType`, `credentials` (bv. FTP details), `mapping` (voor standaard velden), `metafieldMappings`, en `syncFrequency`.
*   **Reducer & Acties:**
    *   `INIT`: Vervangt de huidige state met de `payload` (gebruikt na het fetchen van API).
    *   `ADD`: Voegt de `payload` (nieuwe integratie) toe aan de array.
    *   `EDIT`: Zoekt een integratie op basis van `action.payload.id` en vervangt deze met `action.payload`.
    *   `DELETE`: Filtert de integratie met `action.payload` (ID) uit de array.
*   **Data Persistentie & Synchronisatie:**
    *   **API Eerst:** Wijzigingen (toevoegen, bewerken, verwijderen) worden *eerst* lokaal gedispatched naar de reducer voor een snelle UI update.
    *   **Vervolgens API Call:** Daarna wordt de corresponderende API functie (`saveIntegrationConfig`, `updateIntegrationConfig`, `deleteIntegrationConfig`) aangeroepen.
    *   **Update met Server Data:** Als de API call succesvol is en data retourneert (bv. een ID voor een nieuwe integratie, of server-side updates), wordt een `EDIT` actie gedispatched om de lokale state te synchroniseren met de server response.
    *   **localStorage Fallback:** `useEffect` luistert naar wijzigingen in de `integrations` state en schrijft de JSON stringified versie naar `localStorage.getItem('integrations')`. Bij het initialiseren van de reducer (`loadFromStorage`) wordt deze localStorage data als initiële state gebruikt voordat de API data binnenkomt.
*   **Hook `useIntegrations()`:** Biedt toegang tot `integrations`, `isLoading`, `error`, en de mutatie functies (`addIntegration`, `editIntegration`, `deleteIntegration`).

### 5.3. Integratie Wizard Flow (`IntegrationWizard.jsx`)

De `IntegrationWizard.jsx` pagina is de kern voor het aanmaken en bewerken van integraties. Het beheert de state voor alle wizard-stappen.

1.  **Initialisatie:**
    *   Accepteert een `initialData` prop. Als deze aanwezig is (vanuit `IntegrationEditor.jsx`), worden de wizard velden voorgevuld, wat de "edit" modus activeert.
    *   Gebruikt `useState` voor elke configuratie-optie (bv. `name`, `ftpHost`, `titleKey`, `metafieldMappings`, etc.).
2.  **Stap 1: Basis Informatie (`WizardStepBasics.jsx`)**
    *   Gebruiker vult `name` en `connectionType` (momenteel alleen FTP) in.
3.  **Stap 2: Connectie Details (`WizardStepConnectionFtp.jsx`)**
    *   Gebruiker vult FTP-credentials (`ftpHost`, `ftpPort`, `ftpUser`, `ftpPassword`), `filePath` (pad naar het databestand op FTP), en `dataPath` (optioneel JSON pad binnen het bestand) in.
    *   **Connectie Test & Data Fetch:** De knop "Test Connection & Fetch Data" triggert `handleTestConnectionClick`.
        *   Deze functie roept `testConnectionMutation.mutateAsync()` aan, die een backend endpoint `/api/ftp/test` aanroept (met credentials) om de FTP verbinding te valideren.
        *   Bij succes wordt `downloadMutation.mutateAsync()` aangeroepen, die `/api/ftp/download` aanroept (met credentials en filePath) om het bestand te downloaden.
        *   De gedownloade data wordt in `remoteData` gezet.
        *   `useEffect` reageert op wijzigingen in `remoteData` of `dataPath` om `processRemoteData` aan te roepen. Deze functie past het `dataPath` toe op `remoteData` (via `getDataFromPath`) om `processedPreviewData` te verkrijgen. Dit `processedPreviewData` wordt gebruikt voor de mapping en preview stappen.
        *   `mappingOptions` (keys van het eerste object in `processedPreviewData`) worden ook hier gegenereerd voor de dropdowns in de mapping stap.
        *   Status (loading, error, success) van deze operaties wordt getoond via `Banner` componenten, gebruikmakend van de state van `testConnectionMutation` en `downloadMutation`.
4.  **Stap 3: Data Mapping (`WizardStepMapping.jsx`)**
    *   Gebruiker mapt bronvelden (uit `mappingOptions`) naar Shopify velden.
    *   **Titel (Vereist):** `titleKey` wordt geselecteerd.
    *   **Optionele Standaard Velden:** De gebruiker kan standaard Shopify velden (zoals `FIELD_VENDOR`, `FIELD_PRICE`, etc., gedefinieerd als `fieldConstants`) activeren en een bron key toewijzen. `activeOptionalFields` houdt bij welke velden de gebruiker wil mappen.
    *   **Metafield Mappings:** Gebruikers kunnen een lijst van `metafieldMappings` configureren.
        *   Elke mapping heeft een `id`, `mappingType` (`single` of `dynamic_from_array`), `sourceKey`, `metafieldNamespace`, `metafieldKey`, en `metafieldType`.
        *   Voor `dynamic_from_array` zijn er ook `arrayKeySource` en `arrayValueSource` om aan te geven welke keys binnen de array-objecten gebruikt moeten worden voor de metafield key en value.
        *   Een `useEffect` hook past `addFormMappingType` aan (single/dynamic) en vult `arrayObjectKeys` op basis van de geselecteerde `newMetafieldSourceKey` en de structuur van `processedPreviewData`.
    *   **AI Suggesties:** De knop "Suggest Mappings with AI" (`handleAiSuggestMappings`) roept `suggestMappings` (uit `openai-client.js`) aan.
        *   Een sample van `processedPreviewData` (eerste item indien array) en `DEFAULT_MAPPING_SYSTEM_PROMPT` (aangevuld met de `fieldConstants` uit de `IntegrationWizard` pagina) worden naar de OpenAI API gestuurd.
        *   De AI retourneert een JSON object met suggesties voor `titleKey`, `optionalFieldKeys`, en `metafieldMappings`. Deze worden gebruikt om de state van de mapping formulier velden bij te werken.
5.  **Stap 4: Planning (`WizardStepSchedule.jsx`)**
    *   Gebruiker selecteert de `syncFrequency` (bv. `1`, `12`, `24` uur).
6.  **Stap 5: Preview (`WizardStepPreview.jsx`)**
    *   Toont een gesimuleerde weergave van de Shopify productdata.
    *   De functie `generatePreviewForProduct` (binnen `IntegrationWizard.jsx`) wordt gebruikt om een enkel item uit `processedPreviewData` te transformeren op basis van de huidige `titleKey`, `optionalFieldKeys` en `metafieldMappings`.
    *   `mappedPreviewData` (in `IntegrationWizard.jsx`) wordt gezet naar het resultaat van `generatePreviewForProduct` voor het `currentPreviewIndex`-de item.
    *   De `WizardStepPreview` component ontvangt deze `mappedPreviewData` en rendert het. Als `processedPreviewData` een array is, kan de gebruiker navigeren.
7.  **Navigatie & Voltooien:**
    *   `WizardActions.jsx` component verzorgt de "Back", "Next", en "Finish" knoppen.
    *   `isNextDisabled` logica controleert of aan de vereisten voor de huidige stap is voldaan (bv. FTP connectie succesvol, titel gemapt).
    *   `handleSubmit` wordt aangeroepen bij "Finish". Deze functie:
        *   Bouwt het finale `integrationData` object op basis van alle state variabelen.
        *   Als `initialData` bestaat (edit modus), wordt `updated.id = initialData.id` gezet.
        *   Roept de `onFinish` prop aan (die in `App.jsx` `addIntegration` of in `IntegrationEditor.jsx` `editIntegration` aanroept).

### 5.4. Data Synchronisatie Flow (Getriggerd vanuit UI)

1.  **Trigger:**
    *   **Dashboard:** Via de "Sync" knop per integratie.
    *   **Detail Pagina:** Via de "Sync Integration" knop.
2.  **Actie:** De `handleSyncClick` (in `Dashboard.jsx`) of `handleSyncIntegration` (in `IntegrationDetail.jsx`) functie wordt aangeroepen.
3.  **API Call:** Beide functies gebruiken een `useMutation` hook (van `@tanstack/react-query`) die de `syncIntegrationApi` functie aanroept. Deze functie stuurt een `POST` request naar `/api/products/sync` op de backend API met de `integrationId`.
4.  **Backend Verwerking:** De backend API is verantwoordelijk voor het uitvoeren van de synchronisatie (zie Sectie 5.3 van de wizard voor de logische stappen die de backend zou uitvoeren).
5.  **Feedback:**
    *   Loading state wordt getoond op de knop.
    *   Bij succes of falen worden console logs geschreven en React Query caches geïnvalideerd om UI updates te triggeren (bv. "last synced" tijd).

## 6. Belangrijkste Componenten (Pagina's)

*   **`Dashboard.jsx` (`/`)**:
    *   **Doel:** Toont een lijst van alle geconfigureerde integraties en biedt acties voor beheer.
    *   **Data:** Haalt `integrations` uit `IntegrationContext` (met fallback naar prop).
    *   **State:** Beheert lokale state voor `selectedItems`, `sortValue`, `queryValue` (filter), en `currentPage` (paginering).
    *   **Filtering & Sortering:** Filtert integraties client-side op basis van `queryValue` en sorteert op `sortValue`.
    *   **Paginering:** Implementeert client-side paginering.
    *   **Acties per Item:** Sync (met `useMutation` naar `syncIntegrationApi`), Edit (navigeert naar edit pagina), Delete (roept `onDelete` prop aan, die in `App.jsx` `deleteIntegration` uit context gebruikt).
    *   **Bulk Acties:** Selectie van items is aanwezig maar nog niet functioneel geïmplementeerd.
    *   **Empty State:** Toont een `EmptyState` component als er geen integraties zijn, met een actie om een nieuwe aan te maken.
    *   Gebruikt Polaris componenten zoals `Page`, `Layout`, `Card`, `ResourceList`, `ResourceItem`, `Filters`, `Pagination`.

*   **`IntegrationWizard.jsx` (`/integrations/new`, ook gebruikt door `IntegrationEditor.jsx`)**:
    *   **Doel:** Stapsgewijze configuratie van een nieuwe integratie of het bewerken van een bestaande.
    *   **Structuur:** Een `Page` component die conditioneel een van de `WizardStep*` componenten rendert op basis van de `step` state.
    *   **State Management:** Beheert een grote hoeveelheid state voor alle configuratievelden (zie 5.3 voor details).
    *   **FTP & Data Handling:** Gebruikt `useMutation` voor FTP test- en downloadoperaties via backend proxy's. Verwerkt gedownloade data met `getDataFromPath` om de `processedPreviewData` voor mapping en preview te verkrijgen.
    *   **Mapping Logica:** Implementeert de logica voor het mappen naar standaard Shopify velden en metafields, inclusief AI-suggesties via `openai-client.js`.
    *   **Preview Generatie:** Heeft de `generatePreviewForProduct` functie om een gesimuleerd Shopify product object te maken op basis van de mappings.
    *   **Navigatie:** `WizardActions` component voor stap navigatie. Validatie logica in `isNextDisabled` bepaalt of de gebruiker verder kan.
    *   **Edit Modus:** Als `initialData` prop wordt meegegeven, worden de formuliervelden hiermee gevuld. De `handleSubmit` functie roept dan `onFinish` aan (die uiteindelijk `editIntegration` uit context triggert).

*   **`IntegrationDetail.jsx` (`/integrations/:id`)**:
    *   **Doel:** Toont gedetailleerde informatie van een specifieke integratie en biedt acties zoals sync, edit, delete, en een data preview.
    *   **Data:** Haalt de specifieke `integration` op uit `IntegrationContext` gebaseerd op de `id` route parameter.
    *   **Acties:**
        *   `Edit`: Navigeert naar de edit pagina.
        *   `Sync`: Gebruikt `useMutation` om `syncIntegrationApi` aan te roepen.
        *   `Delete`: Gebruikt `useMutation` om `deleteIntegrationApi` aan te roepen (die `deleteIntegrationConfig` uit `api-client.js` gebruikt) en navigeert bij succes terug naar het dashboard.
    *   **Data Preview Modal:**
        *   Een knop "View Mapped Data Preview" opent een `Modal`.
        *   Binnen de modal wordt `useEffect` gebruikt om `fetchIntegrationData` aan te roepen wanneer de modal opent of `integration` data wijzigt.
        *   `fetchIntegrationData` gebruikt de FTP credentials en `filePath` van de integratie om het bronbestand opnieuw te downloaden via de `/api/ftp/download` proxy.
        *   De gedownloade data wordt verwerkt met `getDataFromPath` (uit de integratie `dataPath`).
        *   De `WizardStepPreview` component wordt *hergebruikt* binnen de modal om de gemapte data te tonen. Hiervoor wordt `generatePreviewForProduct` (vergelijkbaar met die in de wizard, maar hier lokaal gedefinieerd in `IntegrationDetail.jsx`) gebruikt om de `mappedPreviewData` te genereren op basis van de gedownloade data en de opgeslagen mappings van de integratie.
        *   State `currentPreviewIndexInModal` en `setCurrentPreviewIndexInModal` wordt gebruikt voor navigatie binnen de preview in de modal.
    *   Toont basisinformatie van de integratie (naam, type, frequentie, paden) en de mapping details (titel, optionele velden, metafields) in `DescriptionList` componenten.

*   **`IntegrationEditor.jsx` (`/integrations/:id/edit`)**:
    *   **Doel:** Pagina wrapper om een bestaande integratie te bewerken.
    *   **Functionaliteit:**
        *   Haalt de `id` uit de route parameters.
        *   Zoekt de corresponderende `integration` op in de `IntegrationContext`.
        *   Als de integratie niet gevonden wordt, toont het de `NotFound` pagina.
        *   Rendert de `IntegrationWizard` component en geeft de gevonden `integration` mee als `initialData`.
        *   De `onFinish` handler van de wizard roept `editIntegration` uit de `IntegrationContext` aan en navigeert terug naar het dashboard.

*   **`NotFound.jsx` (`*`)**:
    *   **Doel:** Standaard 404 pagina voor ongeldige routes.
    *   Toont een `EmptyState` component met een bericht en een knop om terug te keren naar het dashboard.

## 7. Services

### 7.1. API Client (`api-client.js`)

*   Module voor communicatie met de backend API (`http://localhost:3000/api`).
*   **Functies:**
    *   `saveIntegrationConfig(config)`: `POST /products/configs` - Opslaan nieuwe integratie.
    *   `getIntegrationConfigs()`: `GET /products/configs` - Ophalen alle integraties.
    *   `updateIntegrationConfig(id, config)`: `PUT /products/configs/:id` - Bijwerken bestaande integratie.
    *   `deleteIntegrationConfig(id)`: `DELETE /products/configs/:id` - Verwijderen integratie.
    *   `syncIntegration(id)`: `POST /products/sync` - Triggeren van synchronisatie voor een integratie.

### 7.2. FTP Client (`ftp-client.js` - Logische Client)

*   Definieert een `FTPService` class die de `basic-ftp` library gebruikt. Deze class zelf wordt **niet direct** door de frontend UI (wizard) aangeroepen voor FTP operaties. De wizard gebruikt backend proxy-endpoints (`/api/ftp/test`, `/api/ftp/download`). De backend zou deze `FTPService` class of vergelijkbare logica kunnen gebruiken.
*   **Kenmerken van de `FTPService` class:**
    *   Configuratie voor retries, timeouts, keep-alive.
    *   Connection pool voor het hergebruiken van verbindingen.
    *   Pogingen om gedownloade bestanden te parsen als JSON, anders als tekst.
*   **Methoden van `FTPService` (voor server-side gebruik):**
    *   `downloadFile(credentials, remotePath)`: Downloadt een bestand.
    *   `listFiles(credentials, remotePath)`: Lijst bestanden in een directory.
    *   `testConnection(credentials)`: Test de FTP verbinding.

### 7.3. OpenAI Client (`openai-client.js`)

*   Gebruikt de `openai` library voor interactie met de OpenAI API.
*   API Key wordt geladen uit `import.meta.env.VITE_OPENAI_API_KEY`.
*   **Functie:**
    *   `suggestMappings(dataSample, systemPrompt)`:
        *   Roept de OpenAI Chat Completions API aan (model `gpt-4.1-mini-2025-04-14`).
        *   Verstuurt een JSON data sample en een gedetailleerde `systemPrompt` (zie `DEFAULT_MAPPING_SYSTEM_PROMPT` in het bestand, welke programmatisch wordt aangevuld met de `fieldConstants` uit de `IntegrationWizard` pagina).
        *   De AI wordt geïnstrueerd om mappings voor te stellen naar Shopify productvelden en metafields, met specifieke regels voor prioriteit, key namen, en output formaat (JSON).
        *   Retourneert het door de AI gegenereerde JSON mapping object.

## 8. Configuratie & Omgeving

*   **Backend API URL:** Gedeeltelijk gehardcodeerd (`http://localhost:3000/api` in `api-client.js`, `/api/ftp/*` in `IntegrationWizard.jsx` en `IntegrationDetail.jsx`). Dit zou configureerbaar moeten zijn via environment variabelen voor verschillende omgevingen (dev, staging, prod).
*   **OpenAI API Key:** Moet worden ingesteld als de environment variabele `VITE_OPENAI_API_KEY`.
    *   **Security Waarschuwing:** De code in `openai-client.js` gebruikt `dangerouslyAllowBrowser: true`. Voor productieomgevingen wordt sterk aangeraden om OpenAI API calls via een eigen backend proxy te laten lopen om de API key niet bloot te stellen aan de client-side.
*   **Polaris Locales:** Momenteel geconfigureerd voor Engels (`enTranslations`) in `main.jsx`.

## 9. Mogelijkheden tot Uitbreiding & Aandachtspunten

*   **Security:**
    *   Backend API authenticatie/autorisatie is niet zichtbaar maar cruciaal.
    *   Veilig opslaan van FTP credentials door de backend (lijkt te gebeuren, client stuurt ze alleen voor test/download).
    *   Proxy OpenAI calls via de backend in productie (huidige setup is client-side).
*   **Error Handling & Feedback:** Robuustere error handling en gebruikersfeedback, vooral voor API/service calls (bv. Toasts voor sync status).
*   **Logging:** Uitgebreidere logging (zowel client als server-side) voor debugging en monitoring.
*   **Internationalisatie (i18n):** Polaris `AppProvider` ondersteunt i18n, maar momenteel zijn alleen Engelse vertalingen geladen. Applicatie-specifieke teksten zouden ook vertaalbaar gemaakt moeten worden.
*   **Testen:** Implementatie van unit, integratie, en end-to-end tests.
*   **Configuratie Management:** Centraliseren van configuraties (bv. API URLs) en consistent gebruik van environment variabelen.
*   **Real-time Updates:** Voor de status van synchronisaties (bv. via WebSockets).
*   **Ondersteuning voor Andere Data Bronnen:** Naast FTP zouden andere bronnen (bv. directe API koppelingen, Google Sheets) toegevoegd kunnen worden (de `connectionType` in `WizardStepBasics` hint hier al naar met de disabled 'Business Central' optie).
*   **Geavanceerdere Mapping Opties:** Meer complexe transformaties, conditionele logica, of data validatie in de mapping.
*   **Monitoring van Integraties:** Een dashboard met status, historie en statistieken per integratie.
*   **Consistentie Helper Functies:** Functies zoals `getDataFromPath` en `generatePreviewForProduct` zijn deels gedupliceerd/vergelijkbaar in `IntegrationWizard.jsx` en `IntegrationDetail.jsx`. Overweeg centralisatie in `src/utils`.
*   **Bulk Actions Dashboard:** De selectie functionaliteit in het dashboard is aanwezig maar de acties zelf (bv. bulk delete/sync) zijn nog niet geïmplementeerd.