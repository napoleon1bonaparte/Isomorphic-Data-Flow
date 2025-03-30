/**
 * Orchestration logique métier pour les opérations CRUD
 * Implémentation de la couche logique métier dans l'architecture stratifiée
 *
 * Ce hook établit une topologie complète des états possibles pour chaque opération CRUD
 * et fournit une interface unifiée pour la gestion du cycle de vie des données.
 *
 * @author Créé le 9 novembre 2021
 */

import { useState } from "react";
import { ValidationError, ValidationSchema } from "../../lib/types/validation";

/**
 * Types pour l'état des opérations
 * Définition formelle des états possibles pour une opération CRUD
 */
export interface OperationState<TData = unknown> {
  loading: boolean;
  success: boolean;
  error: Error | ValidationError | null;
  data: TData | null;
}

/**
 * Types pour les transformations de données
 * Fonctions d'isomorphisme partiel qui garantissent la conservation des propriétés essentielles
 */
type Transformer<TInput, TOutput> = (data: TInput) => TOutput;

/**
 * Types pour les hooks de cycle de vie
 * Points d'extension permettant d'injecter des comportements sans modifier le flux principal
 */
type BeforeValidationHook<T> = (data: T) => Promise<T> | T;
type BeforeServiceHook<T> = (data: T) => Promise<T> | T;
type AfterServiceHook<T, R> = (result: R, originalData: T) => Promise<R> | R;
type OnErrorHook<T> = (error: Error, originalData: T) => Promise<void> | void;
type OnSuccessHook<T, R> = (result: R, originalData: T) => Promise<void> | void;

/**
 * Options pour les opérations de création, mise à jour et suppression
 * Configuration complète du comportement pour chaque type d'opération
 */
interface OperationOptions<TDataIn, TDataService, TDataOut> {
  validationSchema?: ValidationSchema<TDataIn>;
  transformer?: Transformer<TDataIn, TDataService>;
  resultTransformer?: Transformer<any, TDataOut>;
  service: (data: TDataService) => Promise<any>;
  // Hooks de cycle de vie
  beforeValidation?: BeforeValidationHook<TDataIn>;
  beforeService?: BeforeServiceHook<TDataService>;
  afterService?: AfterServiceHook<TDataService, TDataOut>;
  onError?: OnErrorHook<TDataIn>;
  onSuccess?: OnSuccessHook<TDataIn, TDataOut>;
  // État initial
  initialState?: Partial<OperationState<TDataOut>>;
}

/**
 * Options pour l'opération de lecture
 * Configuration spécialisée pour les opérations de lecture (getOne et getMany)
 */
interface ReadOperationOptions<TParams, TOneResult, TManyResult> {
  validationSchema?: ValidationSchema<TParams>;
  transformer?: Transformer<TParams, TParams>;
  service?: {
    getOne?: (
      id: string,
      params?: Omit<TParams, "pagination">
    ) => Promise<TOneResult>;
    getMany?: (params?: TParams) => Promise<TManyResult>;
  };
  // Hooks de cycle de vie
  beforeValidation?: BeforeValidationHook<TParams>;
  beforeService?: BeforeServiceHook<TParams>;
  afterServiceOne?: AfterServiceHook<string, TOneResult>;
  afterServiceMany?: AfterServiceHook<TParams, TManyResult>;
  onErrorOne?: OnErrorHook<string>;
  onErrorMany?: OnErrorHook<TParams>;
  onSuccessOne?: OnSuccessHook<string, TOneResult>;
  onSuccessMany?: OnSuccessHook<TParams, TManyResult>;
  // État initial
  initialStateOne?: Partial<OperationState<TOneResult>>;
  initialStateMany?: Partial<OperationState<TManyResult>>;
}

/**
 * Configuration complète du hook CRUD
 * Définit la configuration pour toutes les opérations CRUD supportées
 */
export interface UseCRUDOptions<
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
> {
  create?: OperationOptions<TCreateIn, TCreateService, TCreateOut>;
  update?: OperationOptions<TUpdateIn, TUpdateService, TUpdateOut>;
  delete?: OperationOptions<TDeleteIn, TDeleteService, TDeleteOut>;
  read?: ReadOperationOptions<TReadParams, TReadOneResult, TReadManyResult>;
}

/**
 * Résultat des opérations CRUD
 * Structure complète exposant les états et les méthodes d'exécution
 */
export interface CrudResult<
  TCreateIn = any,
  TUpdateIn = any,
  TDeleteIn = any,
  TReadParams = any,
  TReadOneResult = any,
  TReadManyResult = any,
  TCreateOut = any,
  TUpdateOut = any,
  TDeleteOut = any
> {
  create: {
    state: OperationState<TCreateOut>;
    execute: (data: TCreateIn) => Promise<TCreateOut>;
    reset: () => void;
  };
  update: {
    state: OperationState<TUpdateOut>;
    execute: (data: TUpdateIn) => Promise<TUpdateOut>;
    reset: () => void;
  };
  delete: {
    state: OperationState<TDeleteOut>;
    execute: (data: TDeleteIn) => Promise<TDeleteOut>;
    reset: () => void;
  };
  read: {
    one: {
      state: OperationState<TReadOneResult>;
      execute: (id: string, params?: any) => Promise<TReadOneResult>;
      reset: () => void;
    };
    many: {
      state: OperationState<TReadManyResult>;
      execute: (params?: TReadParams) => Promise<TReadManyResult>;
      reset: () => void;
    };
  };
}

/**
 * Hook useCRUD - Orchestration complète des opérations CRUD
 * Point central de la couche logique métier pour la gestion des données
 *
 * Implémente une signature typée exhaustive qui préserve l'intégrité des données
 * à travers toutes les transformations dans l'architecture en couches
 *
 * @template TCreateIn - Type d'entrée pour la création (ex: formulaire)
 * @template TUpdateIn - Type d'entrée pour la mise à jour
 * @template TDeleteIn - Type d'entrée pour la suppression
 * @template TReadParams - Type des paramètres de lecture
 * @template TReadOneResult - Type du résultat pour getOne
 * @template TReadManyResult - Type du résultat pour getMany
 * @template TCreateService - Type pour le service de création (après transformation)
 * @template TCreateOut - Type de sortie pour la création
 * @template TUpdateService - Type pour le service de mise à jour (après transformation)
 * @template TUpdateOut - Type de sortie pour la mise à jour
 * @template TDeleteService - Type pour le service de suppression (après transformation)
 * @template TDeleteOut - Type de sortie pour la suppression
 */
export function useCRUD<
  TCreateIn = any,
  TUpdateIn = any,
  TDeleteIn = any,
  TReadParams = any,
  TReadOneResult = any,
  TReadManyResult = any,
  TCreateService = TCreateIn,
  TCreateOut = TCreateIn,
  TUpdateService = TUpdateIn,
  TUpdateOut = TUpdateIn,
  TDeleteService = TDeleteIn,
  TDeleteOut = TDeleteIn
>(
  options: UseCRUDOptions<
    TCreateIn,
    TUpdateIn,
    TDeleteIn,
    TReadParams,
    TReadOneResult,
    TReadManyResult,
    TCreateService,
    TCreateOut,
    TUpdateService,
    TUpdateOut,
    TDeleteService,
    TDeleteOut
  >
): CrudResult<
  TCreateIn,
  TUpdateIn,
  TDeleteIn,
  TReadParams,
  TReadOneResult,
  TReadManyResult,
  TCreateOut,
  TUpdateOut,
  TDeleteOut
> {
  // États pour les opérations CUD (Create, Update, Delete)
  const [createState, setCreateState] = useState<OperationState<TCreateOut>>({
    loading: false,
    success: false,
    error: null,
    data: null,
    ...(options.create?.initialState || {}),
  });

  const [updateState, setUpdateState] = useState<OperationState<TUpdateOut>>({
    loading: false,
    success: false,
    error: null,
    data: null,
    ...(options.update?.initialState || {}),
  });

  const [deleteState, setDeleteState] = useState<OperationState<TDeleteOut>>({
    loading: false,
    success: false,
    error: null,
    data: null,
    ...(options.delete?.initialState || {}),
  });

  // États pour les opérations Read
  const [readOneState, setReadOneState] = useState<
    OperationState<TReadOneResult>
  >({
    loading: false,
    success: false,
    error: null,
    data: null,
    ...(options.read?.initialStateOne || {}),
  });

  const [readManyState, setReadManyState] = useState<
    OperationState<TReadManyResult>
  >({
    loading: false,
    success: false,
    error: null,
    data: null,
    ...(options.read?.initialStateMany || {}),
  });

  /**
   * Fonction générique pour exécuter une opération CRUD
   * Implémente le flux de traitement complet avec validation et hooks
   */
  const executeOperation = async <TIn, TService, TOut>(
    data: TIn,
    opOptions: OperationOptions<TIn, TService, TOut> | undefined,
    setState: React.Dispatch<React.SetStateAction<OperationState<TOut>>>
  ): Promise<TOut> => {
    if (!opOptions || !opOptions.service) {
      throw new Error("Operation not configured");
    }

    // Construction d'un nouvel état atomique - début du chargement
    setState({
      loading: true,
      success: false,
      error: null,
      data: null,
    });

    try {
      // Phase 1: Hook before validation (pré-transformation)
      let processedData = data;
      if (opOptions.beforeValidation) {
        processedData = await opOptions.beforeValidation(processedData);
      }

      // Phase 2: Validation polymorphique avec schéma Zod
      if (opOptions.validationSchema) {
        try {
          processedData = opOptions.validationSchema.parse(processedData);
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

      // Phase 3: Transformation des données (UI → Service)
      let serviceData = processedData as unknown as TService;
      if (opOptions.transformer) {
        serviceData = opOptions.transformer(processedData);
      }

      // Phase 4: Hook before service (post-transformation)
      if (opOptions.beforeService) {
        serviceData = await opOptions.beforeService(serviceData);
      }

      // Phase 5: Appel au service (isomorphisme UI → Infrastructure)
      const serviceResult = await opOptions.service(serviceData);

      // Phase 6: Transformation du résultat si nécessaire
      let result = serviceResult as unknown as TOut;
      if (opOptions.resultTransformer) {
        result = opOptions.resultTransformer(serviceResult);
      }

      // Phase 7: Hook after service (post-résultat)
      if (opOptions.afterService) {
        result = await opOptions.afterService(result, serviceData);
      }

      // Phase 8: Construction d'un nouvel état atomique - succès
      setState({
        data: result,
        loading: false,
        error: null,
        success: true,
      });

      // Phase 9: Hook on success (notification, effets secondaires)
      if (opOptions.onSuccess) {
        await opOptions.onSuccess(result, processedData);
      }

      return result;
    } catch (error) {
      // Gestion des erreurs avec hooks spécifiques
      const typedError = error as Error;

      // Construction d'un nouvel état atomique - erreur
      setState({
        data: null,
        loading: false,
        error: typedError,
        success: false,
      });

      // Hook on error (logging, notification)
      if (opOptions.onError) {
        await opOptions.onError(typedError, data);
      }

      throw typedError;
    }
  };

  /**
   * Implémentation des opérations de lecture spécialisées
   * Maintient les invariants sémantiques à travers les transformations
   */
  const executeReadOne = async (
    id: string,
    params?: Omit<TReadParams, "pagination">
  ): Promise<TReadOneResult> => {
    if (
      !options.read ||
      !options.read.service ||
      !options.read.service.getOne
    ) {
      throw new Error("Read operation not configured");
    }

    // Construction d'un nouvel état atomique - début du chargement
    setReadOneState({
      loading: true,
      success: false,
      error: null,
      data: null,
    });

    try {
      // Traitement des paramètres
      let processedParams = params as any;

      // Validation et transformation des paramètres
      if (processedParams && options.read.validationSchema) {
        try {
          processedParams =
            options.read.validationSchema.parse(processedParams);
        } catch (validationError) {
          // Gestion typée des erreurs de validation
          const typedError = validationError as ValidationError;
          setReadOneState({
            data: null,
            loading: false,
            error: typedError,
            success: false,
          });
          throw typedError;
        }
      }

      if (processedParams && options.read.transformer) {
        processedParams = options.read.transformer(processedParams);
      }

      // Hook before service
      if (options.read.beforeService && processedParams) {
        processedParams = await options.read.beforeService(
          processedParams as any
        );
      }

      // Appel au service
      const result = await options.read.service.getOne(id, processedParams);

      // Hook after service
      let processedResult = result;
      if (options.read.afterServiceOne) {
        processedResult = await options.read.afterServiceOne(
          processedResult,
          id
        );
      }

      // Construction d'un nouvel état atomique - succès
      setReadOneState({
        data: processedResult,
        loading: false,
        error: null,
        success: true,
      });

      // Hook on success
      if (options.read.onSuccessOne) {
        await options.read.onSuccessOne(processedResult, id);
      }

      return processedResult;
    } catch (error) {
      // Gestion des erreurs
      const typedError = error as Error;

      // Construction d'un nouvel état atomique - erreur
      setReadOneState({
        data: null,
        loading: false,
        error: typedError,
        success: false,
      });

      // Hook on error
      if (options.read.onErrorOne) {
        await options.read.onErrorOne(typedError, id);
      }

      throw typedError;
    }
  };

  /**
   * Implémentation de l'opération getMany avec support de la topologie des requêtes
   * (pagination, filtrage, tri)
   */
  const executeReadMany = async (
    params?: TReadParams
  ): Promise<TReadManyResult> => {
    if (
      !options.read ||
      !options.read.service ||
      !options.read.service.getMany
    ) {
      throw new Error("Read many operation not configured");
    }

    // Construction d'un nouvel état atomique - début du chargement
    setReadManyState({
      loading: true,
      success: false,
      error: null,
      data: null,
    });

    try {
      // Traitement des paramètres
      let processedParams = params;

      // Validation et transformation des paramètres
      if (processedParams && options.read.validationSchema) {
        try {
          processedParams = options.read.validationSchema.parse(
            processedParams
          ) as TReadParams;
        } catch (validationError) {
          // Gestion typée des erreurs de validation
          const typedError = validationError as ValidationError;
          setReadManyState({
            data: null,
            loading: false,
            error: typedError,
            success: false,
          });
          throw typedError;
        }
      }

      if (processedParams && options.read.transformer) {
        processedParams = options.read.transformer(
          processedParams
        ) as TReadParams;
      }

      // Hook before service
      if (options.read.beforeService && processedParams) {
        processedParams = (await options.read.beforeService(
          processedParams
        )) as TReadParams;
      }

      // Appel au service avec support des stratégies de pagination isomorphes
      const result = await options.read.service.getMany(processedParams);

      // Hook after service
      let processedResult = result;
      if (options.read.afterServiceMany) {
        processedResult = await options.read.afterServiceMany(
          processedResult,
          processedParams as TReadParams
        );
      }

      // Construction d'un nouvel état atomique - succès
      setReadManyState({
        data: processedResult,
        loading: false,
        error: null,
        success: true,
      });

      // Hook on success
      if (options.read.onSuccessMany && processedParams) {
        await options.read.onSuccessMany(processedResult, processedParams);
      }

      return processedResult;
    } catch (error) {
      // Gestion des erreurs
      const typedError = error as Error;

      // Construction d'un nouvel état atomique - erreur
      setReadManyState({
        data: null,
        loading: false,
        error: typedError,
        success: false,
      });

      // Hook on error
      if (options.read.onErrorMany && params) {
        await options.read.onErrorMany(typedError, params);
      }

      throw typedError;
    }
  };

  // Retourne l'interface complète avec les états et les méthodes d'exécution
  return {
    create: {
      state: createState,
      execute: (data: TCreateIn) =>
        executeOperation(data, options.create, setCreateState),
      reset: () =>
        setCreateState({
          loading: false,
          success: false,
          error: null,
          data: null,
        }),
    },
    update: {
      state: updateState,
      execute: (data: TUpdateIn) =>
        executeOperation(data, options.update, setUpdateState),
      reset: () =>
        setUpdateState({
          loading: false,
          success: false,
          error: null,
          data: null,
        }),
    },
    delete: {
      state: deleteState,
      execute: (data: TDeleteIn) =>
        executeOperation(data, options.delete, setDeleteState),
      reset: () =>
        setDeleteState({
          loading: false,
          success: false,
          error: null,
          data: null,
        }),
    },
    read: {
      one: {
        state: readOneState,
        execute: executeReadOne,
        reset: () =>
          setReadOneState({
            loading: false,
            success: false,
            error: null,
            data: null,
          }),
      },
      many: {
        state: readManyState,
        execute: executeReadMany,
        reset: () =>
          setReadManyState({
            loading: false,
            success: false,
            error: null,
            data: null,
          }),
      },
    },
  };
}
