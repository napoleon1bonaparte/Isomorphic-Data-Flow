/**
 * Factories pour la création d'instances typées de hooks et services CRUD
 *
 * Cette architecture résout le problème fondamental de l'équilibre entre généricité et spécificité
 * en fournissant des mécanismes de spécialisation typée sans duplication de code.
 *
 * Ce fichier est volontairement agnostique à tout projet spécifique et peut être réutilisé
 * dans n'importe quelle application React/TypeScript nécessitant des opérations CRUD typées.
 *
 * @author Créé le 2 févrié 2022
 */

import { CrudService, ReadManyResult } from "../../lib/services/crudService";
import { CrudResult, OperationState, useCRUD, UseCRUDOptions } from "./useCRUD";

/**
 * Type utilitaire pour les transformateurs de résultats
 * Permet de définir des transformations sûres entre les types d'infrastructure et UI
 */
export interface TransformOptions<TInfra, TUI> {
  /** Transforme une entité d'infrastructure en entité UI */
  toUI: (infraEntity: TInfra) => TUI;
  /** Transforme une entité UI en entité d'infrastructure */
  toInfra: (uiEntity: Partial<TUI>) => Partial<TInfra>;
}

/**
 * Interface pour définir un résultat de lecture multiple avec généricité
 */
export interface TypedReadManyResult<T> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
    [key: string]: unknown;
  };
}

/**
 * Définition du type de la fonction de transformation
 * /!\Déplacé ici pour éviter les références circulaires dans la définition des génériques
 */
type TransformerFunction<TInput, TOutput> = (input: TInput) => TOutput;

/**
 * Crée un hook CRUD typé pour une entité spécifique
 * Cette factory utilise l'inférence de type pour garantir la cohérence des types
 * à travers les différentes couches architecturales.
 *
 * @template TCreateIn - Type pour création (entrée UI)
 * @template TUpdateIn - Type pour mise à jour (entrée UI)
 * @template TDeleteIn - Type pour suppression (entrée UI)
 * @template TReadParams - Type pour paramètres de lecture
 * @template TInfraEntity - Type entité infrastructure
 * @template TUIEntity - Type entité UI (doit être compatible avec la sortie de la transformation)
 * @template TInfraReadManyResult - Type résultat getMany (infrastructure)
 * @template TUIReadManyResult - Type résultat getMany (UI)
 * @returns Une fonction hook typée qui accepte des options CRUD et retourne une interface CRUD complète
 */
export function createTypedCrud<
  TCreateIn, // Type pour création (entrée UI)
  TUpdateIn, // Type pour mise à jour (entrée UI)
  TDeleteIn, // Type pour suppression (entrée UI)
  TReadParams, // Type pour paramètres de lecture
  TInfraEntity, // Type entité infrastructure (avec timestamp)
  TUIEntity, // Type entité UI (avec Date)
  TInfraReadManyResult extends TypedReadManyResult<TInfraEntity> = TypedReadManyResult<TInfraEntity>,
  TUIReadManyResult extends TypedReadManyResult<TUIEntity> = TypedReadManyResult<TUIEntity>
>(transformOptions: {
  /** Transforme une entité d'infrastructure en entité UI */
  infraEntityToUI: TransformerFunction<TInfraEntity, TUIEntity>;
  /** Transforme une entité UI en entité d'infrastructure (optionnel) */
  uiEntityToInfra?: (entity: Partial<TUIEntity>) => Partial<TInfraEntity>;
  /** Transforme un résultat de lecture multiple d'infrastructure en format UI (optionnel) */
  infraReadManyToUI?: (result: TInfraReadManyResult) => TUIReadManyResult;
}) {
  // Types spécifiques pour les transformateurs
  type InfraToUITransformer = TransformerFunction<TInfraEntity, TUIEntity>;
  type ReadManyTransformer = TransformerFunction<
    TInfraReadManyResult,
    TUIReadManyResult
  >;

  /**
   * Hook CRUD typé dynamiquement généré
   *
   * @param options Configuration des opérations CRUD
   * @returns Interface CRUD complète avec états et méthodes d'exécution typés
   */
  return (
    options: Omit<
      UseCRUDOptions<
        TCreateIn,
        TUpdateIn,
        TDeleteIn,
        TReadParams,
        TInfraEntity,
        TInfraReadManyResult,
        TCreateIn, // TCreateService (même type que l'entrée)
        TInfraEntity, // TCreateResult (résultat du service avant transformation)
        TUpdateIn, // TUpdateService (même type que l'entrée)
        TInfraEntity, // TUpdateResult (résultat du service avant transformation)
        TDeleteIn, // TDeleteService (même type que l'entrée)
        any // TDeleteOut (type de résultat pour delete)
      >,
      "read"
    > & {
      read?: {
        validationSchema?: any;
        transformer?: any;
        service?: {
          getOne?: (id: string, params?: any) => Promise<TInfraEntity>;
          getMany?: (params?: TReadParams) => Promise<TInfraReadManyResult>;
        };
        beforeValidation?: (
          params: TReadParams
        ) => Promise<TReadParams> | TReadParams;
        beforeService?: (
          params: TReadParams
        ) => Promise<TReadParams> | TReadParams;
        onErrorOne?: (error: Error, id: string) => Promise<void> | void;
        onErrorMany?: (
          error: Error,
          params: TReadParams
        ) => Promise<void> | void;
        onSuccessOne?: (result: TUIEntity, id: string) => Promise<void> | void;
        onSuccessMany?: (
          result: TUIReadManyResult,
          params: TReadParams
        ) => Promise<void> | void;
        initialStateOne?: Partial<OperationState<TUIEntity>>;
        initialStateMany?: Partial<OperationState<TUIReadManyResult>>;
      };
    }
  ): CrudResult<
    TCreateIn,
    TUpdateIn,
    TDeleteIn,
    TReadParams,
    TUIEntity, // Type UI pour getOne
    TUIReadManyResult, // Type UI pour getMany
    TUIEntity, // Type UI pour create result
    TUIEntity, // Type UI pour update result
    any // Type pour delete result
  > => {
    // Fonction sécurisée de transformation d'entités
    const transformEntityToUI: InfraToUITransformer =
      transformOptions.infraEntityToUI;

    // Fonction sécurisée de transformation de résultats multiples
    const transformReadManyResult: ReadManyTransformer = (
      result: TInfraReadManyResult
    ): TUIReadManyResult => {
      if (transformOptions.infraReadManyToUI) {
        return transformOptions.infraReadManyToUI(result);
      }

      // Transformation par défaut
      return {
        data: result.data.map(transformEntityToUI),
        meta: result.meta,
      } as TUIReadManyResult;
    };

    // Transformation des options de création pour gérer les types
    const createOptions = options.create
      ? {
          ...options.create,
          // Ajouter le transformateur de résultat
          resultTransformer: transformEntityToUI,
          // S'assurer que afterService gère correctement les types
          afterService: options.create.afterService
            ? async (result: TInfraEntity, originalData: TCreateIn) => {
                const transformedResult = transformEntityToUI(result);
                if (options.create?.afterService) {
                  // Appel du hook original avec le résultat transformé
                  return await options.create.afterService(
                    transformedResult as unknown as TInfraEntity,
                    originalData
                  );
                }
                return transformedResult;
              }
            : async (result: TInfraEntity) => transformEntityToUI(result),
        }
      : undefined;

    // Transformation des options de mise à jour pour gérer les types
    const updateOptions = options.update
      ? {
          ...options.update,
          // Ajouter le transformateur de résultat
          resultTransformer: transformEntityToUI,
          // S'assurer que afterService gère correctement les types
          afterService: options.update.afterService
            ? async (result: TInfraEntity, originalData: TUpdateIn) => {
                const transformedResult = transformEntityToUI(result);
                if (options.update?.afterService) {
                  // Appel du hook original avec le résultat transformé
                  return await options.update.afterService(
                    transformedResult as unknown as TInfraEntity,
                    originalData
                  );
                }
                return transformedResult;
              }
            : async (result: TInfraEntity) => transformEntityToUI(result),
        }
      : undefined;

    // Transformation des options de lecture pour gérer les types
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

          // Hooks de transformation pour getMany
          afterServiceMany: async (
            result: TInfraReadManyResult,
            params: TReadParams
          ) => {
            // Utiliser le transformateur personnalisé ou créer une transformation par défaut
            const transformedResult = transformReadManyResult(result);

            // Appel du hook original si existant
            if (options.read?.onSuccessMany) {
              await options.read.onSuccessMany(transformedResult, params);
            }

            return transformedResult;
          },
        }
      : undefined;

    // Configuration complète avec types transformés correctement
    const typedOptions = {
      create: createOptions,
      update: updateOptions,
      delete: options.delete,
      read: readOptions,
    };

    // Utilise le hook CRUD générique avec la configuration spécifique
    const crudResult = useCRUD(
      typedOptions as UseCRUDOptions<
        TCreateIn,
        TUpdateIn,
        TDeleteIn,
        TReadParams,
        TInfraEntity,
        TInfraReadManyResult,
        TCreateIn,
        TInfraEntity, // Type du service
        TUpdateIn,
        TInfraEntity, // Type du service
        TDeleteIn,
        any
      >
    );

    // Casting de type nécessaire pour assurer la cohérence de l'API exposée
    return crudResult as unknown as CrudResult<
      TCreateIn,
      TUpdateIn,
      TDeleteIn,
      TReadParams,
      TUIEntity,
      TUIReadManyResult,
      TUIEntity,
      TUIEntity,
      any
    >;
  };
}

/**
 * Crée un service CRUD typé pour une entité spécifique
 * Cette factory permet de créer des services fortement typés sans duplication de code
 *
 * @template TCreateDTO - Type DTO pour la création
 * @template TCreateEntity - Type d'entité pour la création
 * @template TCreateResult - Type de résultat pour la création
 * @template TUpdateDTO - Type DTO pour la mise à jour
 * @template TUpdateEntity - Type d'entité pour la mise à jour
 * @template TUpdateResult - Type de résultat pour la mise à jour
 * @template TDeleteDTO - Type DTO pour la suppression
 * @template TDeleteEntity - Type d'entité pour la suppression
 * @template TDeleteResult - Type de résultat pour la suppression
 * @template TReadParams - Type des paramètres de lecture
 * @template TReadEntity - Type d'entité de lecture
 * @template TReadOneResult - Type de résultat pour getOne
 * @template TReadManyResult - Type de résultat pour getMany
 * @returns Une fonction qui crée un service CRUD typé
 */
export function createTypedService<
  TCreateDTO,
  TCreateEntity,
  TCreateResult,
  TUpdateDTO,
  TUpdateEntity,
  TUpdateResult,
  TDeleteDTO,
  TDeleteEntity,
  TDeleteResult,
  TReadParams = Record<string, unknown>,
  TReadEntity = Record<string, unknown>,
  TReadOneResult = TReadEntity,
  TReadManyResult extends ReadManyResult<TReadEntity> = ReadManyResult<TReadEntity>
>() {
  /**
   * Crée une instance de service CRUD typé
   *
   * @param entityName Nom de l'entité
   * @param api Implémentation des méthodes d'API
   * @param transformers Transformateurs pour les conversions de types
   * @returns Service CRUD typé
   */
  return (
    entityName: string,
    api: {
      create?: (data: TCreateEntity) => Promise<TCreateResult>;
      update?: (data: TUpdateEntity) => Promise<TUpdateResult>;
      delete?: (data: TDeleteEntity) => Promise<TDeleteResult>;
      getOne?: (
        id: string,
        params?: Omit<TReadParams, "pagination">
      ) => Promise<TReadOneResult>;
      getMany?: (params?: TReadParams) => Promise<TReadManyResult>;
    },
    transformers?: {
      createDtoToEntity?: (data: TCreateDTO) => TCreateEntity;
      updateDtoToEntity?: (data: TUpdateDTO) => TUpdateEntity;
      deleteDtoToEntity?: (data: TDeleteDTO) => TDeleteEntity;
      readParamsToQuery?: (params: TReadParams) => unknown;
    }
  ): CrudService<
    TCreateDTO,
    TCreateEntity,
    TCreateResult,
    TUpdateDTO,
    TUpdateEntity,
    TUpdateResult,
    TDeleteDTO,
    TDeleteEntity,
    TDeleteResult,
    TReadParams,
    TReadEntity,
    TReadOneResult,
    TReadManyResult
  > => {
    return new CrudService<
      TCreateDTO,
      TCreateEntity,
      TCreateResult,
      TUpdateDTO,
      TUpdateEntity,
      TUpdateResult,
      TDeleteDTO,
      TDeleteEntity,
      TDeleteResult,
      TReadParams,
      TReadEntity,
      TReadOneResult,
      TReadManyResult
    >(entityName, api, transformers);
  };
}
