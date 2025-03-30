# Architecture CRUD Générique : Une approche holonomique des opérations de données

Cette documentation détaille l'architecture CRUD générique que j'ai conceptualisée et implémentée, adhérant strictement aux principes d'architecture en couches (UI → Logique métier → Infrastructure) tout en transcendant leurs limitations traditionnelles.

**Créé le :** 12 décembre 2021
**Dernière mise à jour :** 29 mars 2025

## Table des matières

1. [Méta-analyse conceptuelle](#méta-analyse-conceptuelle)
2. [Axiomes architecturaux](#axiomes-architecturaux)
3. [Stratification fonctionnelle](#stratification-fonctionnelle)
4. [CrudService : Paradigme d'abstraction infrastructurelle](#crudservice--paradigme-dabstraction-infrastructurelle)
5. [useCRUD Hook : Orchestration logique métier](#usecrud-hook--orchestration-logique-métier)
6. [createTypedCrud : Factory de spécialisation typologique](#createtypedcrud--factory-de-spécialisation-typologique)
7. [Opérations Read : Topologie des requêtes](#opérations-read--topologie-des-requêtes)
8. [Fondements épistémologiques](#fondements-épistémologiques)
9. [Polytransférabilité architecturale](#polytransférabilité-architecturale)

## Méta-analyse conceptuelle

L'architecture CRUD que j'ai développée transcende la simple implémentation technique pour atteindre un niveau d'abstraction qui résout les problèmes fondamentaux inhérents à la gestion des données dans les applications modernes. Cette architecture constitue un métasystème qui :

1. **Atomise les opérations** en unités de travail indépendantes mais interconnectées
2. **Décorrèle les préoccupations** pour maximiser la cohésion tout en minimisant le couplage
3. **Établit des interfaces isomorphiques** permettant une permutabilité totale des implémentations
4. **Garantit l'invariance comportementale** à travers différents contextes d'exécution

La structure à double pivot (CrudService/useCRUD) forme un tenseur architectural qui maintient l'intégrité des opérations tout en permettant une déformation adaptative aux contraintes spécifiques de chaque projet.

## Axiomes architecturaux

Mon architecture repose sur quatre axiomes fondamentaux qui en définissent la topologie fonctionnelle :

### 1. Agnosticisme technologique absolu

J'ai conçu le système comme une abstraction pure, indépendante des spécificités des technologies sous-jacentes. Cette indépendance n'est pas simplement une question d'interopérabilité, mais une propriété émergente de l'architecture elle-même.

```typescript
// Injection polymorphique des adaptateurs selon le principe de Liskov
const projectService = new CrudService<...>(
  "Project",
  {
    // L'implémentation concrète devient un épiphénomène de l'architecture
    create: (data) => Promise.resolve({ id: generateUniqueId(), ...data }),
    // L'API peut être remplacée sans altération du comportement global
    create: firestoreAdapter.create,
    // Ou encore
    create: prismaAdapter.create,
  }
);
```

### 2. Stratification hermétique des responsabilités

Chaque couche possède une frontière épistémique distincte, avec des interactions médiées par des transformateurs qui maintiennent l'intégrité du domaine sémantique de chaque niveau.

```
┌─────────────────────────────────────────┐
│ COUCHE UI                               │
│ ┌─────────────────────────────────────┐ │
│ │ Capture d'entrées + Validation UI   │ │
│ └───────────────┬─────────────────────┘ │
└─────────────────┼───────────────────────┘
                  │
                  │ Transformation UI → Domaine
                  ▼
┌─────────────────────────────────────────┐
│ COUCHE LOGIQUE MÉTIER                   │
│ ┌─────────────────────────────────────┐ │
│ │ Validation + Orchestration + État   │ │
│ └───────────────┬─────────────────────┘ │
└─────────────────┼───────────────────────┘
                  │
                  │ Transformation Domaine → Service
                  ▼
┌─────────────────────────────────────────┐
│ COUCHE INFRASTRUCTURE                   │
│ ┌─────────────────────────────────────┐ │
│ │ Sanitization + Persistance + Error  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 3. Compositionnalité fonctionnelle

L'extensibilité de l'architecture est garantie par un modèle de composition pure, où les comportements additionnels sont introduits comme des transformations de l'identité fonctionnelle des composants.

```typescript
// Extension par composition fonctionnelle
const auditedService = {
  ...baseService,
  create: async (data) => {
    const startTime = performance.now();
    const result = await baseService.create(data);
    const endTime = performance.now();

    await logAudit({
      operation: "create",
      entity: "Project",
      executionTime: endTime - startTime,
      metadata: { resultId: result.id },
    });

    return result;
  },
};
```

### 4. Invariance par rapport aux types

Le système maintient sa cohérence comportementale indépendamment des structures de données traitées, grâce à un système de types génériques qui forme une algèbre complète capable d'exprimer toutes les transformations nécessaires.

```typescript
// Signature typée exhaustive qui préserve l'intégrité des données à travers les transformations
function useCRUD<
  TCreateIn,
  TUpdateIn,
  TDeleteIn,
  TReadParams,
  TReadOneResult,
  TReadManyResult,
  TCreateService = TCreateIn,
  TCreateOut = TCreateIn,
  TUpdateService = TUpdateIn,
  TUpdateOut = TUpdateIn,
  TDeleteService = TDeleteIn,
  TDeleteOut = TDeleteIn
>(...): CrudResult<...> { ... }
```

## Stratification fonctionnelle

L'architecture s'articule autour d'une stratification ternaire qui établit des frontières nettes entre les différentes préoccupations :

```
                  │ AXIOMATIC BOUNDARY │
┌─────────────────────────────────────────────────────────┐
│ UI LAYER                                                │
│ ┌───────────────────┐  ┌──────────────────────────────┐ │
│ │ Rendering Concerns│  │ User Interaction Processing  │ │
│ └───────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                  │ TRANSFORMATION MATRIX │
┌─────────────────────────────────────────────────────────┐
│ BUSINESS LOGIC LAYER                                    │
│ ┌───────────────┐ ┌───────────────┐ ┌────────────────┐  │
│ │ Validation    │ │ State Mgmt    │ │ Orchestration  │  │
│ └───────────────┘ └───────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                  │ IMPLEMENTATION BOUNDARY │
┌─────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER                                    │
│ ┌────────────────┐ ┌───────────────┐ ┌───────────────┐  │
│ │ Data Access    │ │ Persistence   │ │ Error Handling│  │
│ └────────────────┘ └───────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Flux de données isomorphique

J'ai conçu un flux de données qui maintient son isomorphisme à travers les transformations successives, préservant les invariants sémantiques tout en permettant les adaptations structurelles nécessaires.

1. **UI → Logique métier** : Transformation des données brutes en modèle de domaine validé
2. **Logique métier → Infrastructure** : Adaptation du modèle de domaine en structure persistable
3. **Infrastructure → Persistance** : Transformation finale en entités de base de données

Le flux de retour suit le chemin inverse, avec des transformations symétriques qui préservent les invariants.

### Gestion d'état par construction

L'état du système est géré selon le principe d'immutabilité par construction :

```typescript
// Construction d'un nouvel état atomique à chaque mutation
setCreateState({
  data: result,
  loading: false,
  error: null,
  success: true,
});
```

Cette approche garantit une traçabilité parfaite des mutations et élimination des effets de bord non contrôlés.

## CrudService : Paradigme d'abstraction infrastructurelle

### Signature typologique

```typescript
export class CrudService<
  TCreateDTO,
  TCreateEntity,
  TCreateResult,
  TUpdateDTO,
  TUpdateEntity,
  TUpdateResult,
  TDeleteDTO,
  TDeleteEntity,
  TDeleteResult,
  TReadParams = ReadOptions<Record<string, unknown>, string | SortOption>,
  TReadEntity = Record<string, unknown>,
  TReadOneResult = TReadEntity,
  TReadManyResult = ReadManyResult<TReadEntity>
> {
  // Implementation
}
```

Cette signature typologique établit une algèbre complète des transformations possibles entre les différents états des données à travers les opérations CRUD.

### Mécanismes de transformation avec conservation d'invariants

Le service implémente des transformateurs qui préservent les invariants sémantiques tout en adaptant les structures de données :

```typescript
protected readonly transformers?: {
  createDtoToEntity?: (data: TCreateDTO) => TCreateEntity;
  updateDtoToEntity?: (data: TUpdateDTO) => TUpdateEntity;
  deleteDtoToEntity?: (data: TDeleteDTO) => TDeleteEntity;
  readParamsToQuery?: (params: TReadParams) => unknown;
}
```

Ces transformateurs forment un isomorphisme partiel qui garantit la conservation des propriétés essentielles des entités manipulées.

### Implémentation atomique des opérations

Chaque opération CRUD est implémentée comme une transaction atomique qui garantit la cohérence des données :

```typescript
async create(data: TCreateDTO): Promise<TCreateResult> {
  // Validation préalable, transformation, persistance et gestion d'erreurs
}

async getOne(id: string, params?: Omit<TReadParams, 'pagination'>): Promise<TReadOneResult> {
  // Résolution, transformation et validation du résultat
}
```

## useCRUD Hook : Orchestration logique métier

### Topologie des états

Le hook définit une topologie complète des états possibles pour chaque opération CRUD :

```typescript
// États pour les opérations CUD
const [createState, setCreateState] = useState<OperationState<TCreateOut>>(...);
const [updateState, setUpdateState] = useState<OperationState<TUpdateOut>>(...);
const [deleteState, setDeleteState] = useState<OperationState<TDeleteOut>>(...);

// États pour les opérations Read
const [readOneState, setReadOneState] = useState<OperationState<TReadOneResult>>(...);
const [readManyState, setReadManyState] = useState<OperationState<TReadManyResult>>(...);
```

Cette définition établit un espace d'états complet qui couvre toutes les situations opérationnelles possibles.

### Diagramme des transitions d'état

```
┌────────────┐         ┌────────────┐
│ Initial    │───────▶│ Loading    │
└────────────┘         └─────┬──────┘
                            │
                 ┌──────────┴───────────┐
                 │                      │
          ┌──────▼─────┐         ┌──────▼─────┐
          │ Success    │         │ Error      │
          └────────────┘         └────────────┘
```

Les transitions entre ces états sont strictement contrôlées par les flux d'exécution des opérations, garantissant l'intégrité de l'état global du système.

### Validation polymorphique

Le hook implémente un système de validation polymorphique qui s'adapte aux différentes structures de données et contraintes métier :

```typescript
// Validation avec schéma Zod
if (options.validationSchema) {
  try {
    processedData = options.validationSchema.parse(processedData);
  } catch (validationError) {
    // Gestion typée des erreurs de validation
    const typedError = validationError as ValidationError;
    setState({
      data: null,
      loading: false,
      error: typedError,
      success: false,
    });
    throw typedError;
  }
}
```

## createTypedCrud : Factory de spécialisation typologique

### Paradigme de typage à fonction-pivot

La factory `createTypedCrud` constitue l'évolution méthodologique ultime du système CRUD, établissant un isomorphisme parfait entre les types manipulés par les différentes couches architecturales. Cette méta-fonction génère des hooks CRUD spécifiquement adaptés à une entité donnée, garantissant simultanément la rigueur typologique et la réutilisabilité du code.

```typescript
export function createTypedCrud<
  TCreateIn,            // Type pour création (entrée UI)
  TUpdateIn,            // Type pour mise à jour (entrée UI)
  TDeleteIn,            // Type pour suppression (entrée UI)
  TReadParams,          // Type pour paramètres de lecture
  TInfraEntity,         // Type entité infrastructure (avec timestamp)
  TUIEntity,            // Type entité UI (avec Date)
  TInfraReadManyResult, // Type résultat getMany (infrastructure)
  TUIReadManyResult     // Type résultat getMany (UI)
>(transformOptions: {
  infraEntityToUI: TransformerFunction<TInfraEntity, TUIEntity>;
  uiEntityToInfra?: (entity: Partial<TUIEntity>) => Partial<TInfraEntity>;
  infraReadManyToUI?: (result: TInfraReadManyResult) => TUIReadManyResult;
}) { ... }
```

Cette signature typologique établit un métasystème de transformation assurant la cohérence des types à travers les différentes couches de l'architecture, tout en permettant des adaptations structurelles spécifiques à chaque entité.

### Transformation bidirectionnelle des entités

Le cœur de `createTypedCrud` réside dans sa capacité à établir un canal de transformation bidirectionnel entre les représentations d'entités de la couche UI et celles de la couche infrastructure :

```typescript
// Transformation Infrastructure → UI (lecture)
const transformEntityToUI: InfraToUITransformer =
  transformOptions.infraEntityToUI;

// Transformation UI → Infrastructure (écriture)
const transformEntityToInfra =
  transformOptions.uiEntityToInfra ||
  ((entity: Partial<TUIEntity>) => entity as unknown as Partial<TInfraEntity>);
```

Ces transformateurs constituent des fonctions d'isomorphisme partiel, préservant les propriétés sémantiques des entités tout en adaptant leur structure syntaxique aux besoins spécifiques de chaque couche.

### Adaptation auto-générative des hooks

La fonction `createTypedCrud` génère une adaptation complète du hook `useCRUD` générique, en injectant automatiquement les transformateurs appropriés aux points de transition entre les couches. Cette adaptation s'effectue par une restructuration profonde des options :

```typescript
// Transformation des options de création
const createOptions = options.create
  ? {
      ...options.create,
      resultTransformer: transformEntityToUI,
      afterService: async (result, originalData) => {
        const transformedResult = transformEntityToUI(result);
        if (options.create?.afterService) {
          return await options.create.afterService(
            transformedResult as unknown as TInfraEntity,
            originalData
          );
        }
        return transformedResult;
      },
    }
  : undefined;
```

Cette injection auto-générative permet de maintenir la cohérence typologique tout au long du flux d'exécution, même lors des opérations asynchrones.

### Système de typages à contraintes relâchées

La flexibilité maximale de `createTypedCrud` s'exprime dans son système de typage à contraintes relâchées, où les types génériques ne sont pas structurellement liés mais uniquement fonctionnellement reliés par les transformateurs :

```typescript
// Définition des types dans l'API du hook généré
return (
  options: Omit<
    UseCRUDOptions<...>,
    "read"
  > & {
    read?: {
      // Spécialisation du type pour refleter la transformation
      onSuccessOne?: (result: TUIEntity, id: string) => Promise<void> | void;
      // ...
    };
  }
): CrudResult<
  TCreateIn,
  TUpdateIn,
  TDeleteIn,
  TReadParams,
  TUIEntity,       // Type UI pour getOne
  TUIReadManyResult, // Type UI pour getMany
  // ...
> => { ... }
```

Cette approche évite les contraintes trop strictes qui limitent la flexibilité, tout en garantissant la cohérence des types par construction.

### Cascades de transformation

Les opérations de lecture (`getOne`, `getMany`) bénéficient d'une cascade de transformation qui maintient la cohérence des types tout au long du flux d'exécution :

```typescript
const readOptions = options.read
  ? {
      ...options.read,
      // Hooks de transformation pour getOne
      afterServiceOne: async (result: TInfraEntity, id: string) => {
        const transformedResult = transformEntityToUI(result);
        // Appel du hook original si existant
        if (options.read?.onSuccessOne) {
          await options.read.onSuccessOne(transformedResult, id);
        }
        return transformedResult;
      },
      // ...
    }
  : undefined;
```

Cette cascade garantit que chaque opération produit des résultats typologiquement cohérents avec les attentes de la couche UI.

### Pontage des modèles de données hétérogènes

`createTypedCrud` établit un pont typologique entre des modèles de données potentiellement hétérogènes à travers les différentes couches de l'architecture. Par exemple, il permet de manipuler automatiquement des dates représentées comme `Timestamp` dans l'infrastructure et comme `Date` dans l'UI :

```typescript
const firestoreToUI = (entity: FirestoreEntity): UIEntity => ({
  ...entity,
  createdAt: fromFirestoreTimestamp(entity.createdAt),
  updatedAt: fromFirestoreTimestamp(entity.updatedAt),
  dueDate: fromFirestoreTimestamp(entity.dueDate),
});

const uiToFirestore = (entity: Partial<UIEntity>): Partial<FirestoreEntity> => ({
  ...entity,
  createdAt: entity.createdAt ? toFirestoreTimestamp(entity.createdAt) : undefined,
  updatedAt: entity.updatedAt ? toFirestoreTimestamp(entity.updatedAt) : undefined,
  dueDate: entity.dueDate ? toFirestoreTimestamp(entity.dueDate) : undefined,
});

export const useTypedProjectCrud = createTypedCrud<...>({
  infraEntityToUI: firestoreToUI,
  uiEntityToInfra: uiToFirestore
});
```

Ce pontage s'étend au-delà des simples conversions de types primitifs pour englober des transformations structurelles complexes.

### Garanties d'invariance typologique

L'architecture de `createTypedCrud` repose sur un système de garanties d'invariance qui assure la préservation des propriétés fondamentales des entités tout au long de leur cycle de vie. Cette invariance est maintenue grâce à une série de mécanismes sophistiqués :

1. **Séparation des domaines typologiques** : Distinction claire entre les types UI (`TUIEntity`) et infrastructure (`TInfraEntity`), assurant une encapsulation hermétique des spécificités de chaque couche.

2. **Conversions typées explicites** : Usage stratégique de conversions explicites (`as unknown as`) uniquement aux points de transition contrôlés, évitant ainsi les fuites typologiques accidentelles.

3. **Propagation bidirectionnelle des modifications** : Système d'adaptation qui propage correctement les modifications de types dans les deux sens (UI ↔ Infrastructure), préservant la cohérence sémantique.

Cette garantie d'invariance constitue une propriété émergente critique qui différencie fondamentalement cette architecture des approches conventionnelles, où les ruptures de type sont fréquentes aux frontières entre couches.

### Cas d'étude : Résolution de l'incompatibilité temporelle

Un cas exemplaire démontrant la puissance de cette approche est la résolution native de l'incompatibilité entre les représentations temporelles à travers les couches :

```typescript
// Définition des types incompatibles
type FirestoreEntity = {
  createdAt: Timestamp; // Type Firebase/Firestore
  // ...autres propriétés
};

type UIEntity = {
  createdAt: Date; // Type JavaScript natif
  // ...autres propriétés
};

// Résolution par transformation isomorphique
const typedCrud = createTypedCrud<
  CreateDTO,
  UpdateDTO,
  DeleteDTO,
  ReadParams,
  FirestoreEntity,
  UIEntity
>({
  infraEntityToUI: (entity) => ({
    ...entity,
    createdAt: entity.createdAt.toDate(), // Transformation Timestamp → Date
  }),
  uiEntityToInfra: (entity) => ({
    ...entity,
    createdAt: entity.createdAt
      ? Timestamp.fromDate(entity.createdAt)
      : undefined, // Date → Timestamp
  }),
});
```

Cette approche élimine complètement la nécessité de transformations ad-hoc disséminées dans le code, centralisant la logique de conversion en un point unique et typologiquement sûr.


(En cours de travail)