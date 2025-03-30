/**
 * Paradigme d'abstraction infrastructurelle pour les opérations CRUD
 * Implémentation de la couche Infrastructure dans l'architecture stratifiée
 *
 * Cette classe établit une algèbre complète des transformations possibles
 * entre les différentes représentations des entités à travers les opérations CRUD.
 *
 * @author Créé le 21 novembre 2021
 */

// Types génériques pour les opérations CRUD
export interface EntityBase {
  id?: string;
}

// Structures topologiques pour les opérations de lecture
export interface ReadOptions<
  TFilter = Record<string, unknown>,
  TSort = string | SortOption | Array<string | SortOption>
> {
  pagination?: PaginationOptions;
  filter?: TFilter;
  sort?: TSort;
  includes?: string[];
  search?: string;
}

export interface PaginationOptions {
  page?: number; // Pagination basée sur les pages
  limit?: number; // Limite d'entités par page
  offset?: number; // Pagination basée sur les offsets
  cursor?: string; // Pagination basée sur les curseurs
}

export interface SortOption {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Service générique pour les opérations CRUD
 * Établit une abstraction pure, indépendante des spécificités des technologies sous-jacentes
 *
 * @template TCreateDTO - Type DTO pour la création (couche UI)
 * @template TCreateEntity - Type entity pour la création (couche infrastructure)
 * @template TCreateResult - Type résultat pour la création
 * @template TUpdateDTO - Type DTO pour la mise à jour (couche UI)
 * @template TUpdateEntity - Type entity pour la mise à jour (couche infrastructure)
 * @template TUpdateResult - Type résultat pour la mise à jour
 * @template TDeleteDTO - Type DTO pour la suppression (couche UI)
 * @template TDeleteEntity - Type entity pour la suppression (couche infrastructure)
 * @template TDeleteResult - Type résultat pour la suppression
 * @template TReadParams - Type de paramètres pour la lecture (filtres, pagination, etc.)
 * @template TReadEntity - Type d'entité retournée par l'API de lecture
 * @template TReadOneResult - Type de résultat pour la lecture d'une entité
 * @template TReadManyResult - Type de résultat pour la lecture de plusieurs entités
 */
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
  TReadParams = ReadOptions,
  TReadEntity = Record<string, unknown>,
  TReadOneResult = TReadEntity,
  TReadManyResult = ReadManyResult<TReadEntity>
> {
  /**
   * Constructeur du service CRUD
   * Permet l'injection polymorphique des adaptateurs selon le principe de Liskov
   *
   * @param entityName Nom de l'entité (pour les logs)
   * @param api Objet contenant les méthodes d'API pour chaque opération
   * @param transformers Objet contenant les méthodes de transformation entre DTO et Entity
   */
  constructor(
    protected readonly entityName: string,
    protected readonly api: {
      create?: (data: TCreateEntity) => Promise<TCreateResult>;
      update?: (data: TUpdateEntity) => Promise<TUpdateResult>;
      delete?: (data: TDeleteEntity) => Promise<TDeleteResult>;
      // Méthodes pour Read
      getOne?: (
        id: string,
        params?: Omit<TReadParams, "pagination">
      ) => Promise<TReadOneResult>;
      getMany?: (params?: TReadParams) => Promise<TReadManyResult>;
    },
    protected readonly transformers?: {
      createDtoToEntity?: (data: TCreateDTO) => TCreateEntity;
      updateDtoToEntity?: (data: TUpdateDTO) => TUpdateEntity;
      deleteDtoToEntity?: (data: TDeleteDTO) => TDeleteEntity;
      // Transformer pour Read
      readParamsToQuery?: (params: TReadParams) => unknown;
    }
  ) {}

  /**
   * Opération Create - Création d'une nouvelle entité
   * Transaction atomique garantissant l'intégrité des données
   *
   * @param data DTO contenant les données pour la création
   * @returns Entité créée
   */
  async create(data: TCreateDTO): Promise<TCreateResult> {
    if (!this.api.create) {
      throw new Error(`Create API not implemented for ${this.entityName}`);
    }

    try {
      // Transformation des données via le transformateur (couche logique métier → infrastructure)
      let entityData: TCreateEntity;
      if (this.transformers?.createDtoToEntity) {
        entityData = this.transformers.createDtoToEntity(data);
      } else {
        // Conversion sécurisée via type assertion contrôlée
        entityData = data as unknown as TCreateEntity;
      }

      // Log de l'opération pour traçabilité
      console.debug(`Creating ${this.entityName}:`, entityData);

      // Appel à l'API - Interaction avec la source de données
      const result = await this.api.create(entityData);

      return result;
    } catch (error) {
      // Gestion des erreurs avec contexte enrichi
      console.error(`Error creating ${this.entityName}:`, error);
      throw error;
    }
  }

  /**
   * Opération Update - Mise à jour d'une entité existante
   * Transaction atomique garantissant l'intégrité des données
   *
   * @param data DTO contenant les données pour la mise à jour
   * @returns Entité mise à jour
   */
  async update(data: TUpdateDTO): Promise<TUpdateResult> {
    if (!this.api.update) {
      throw new Error(`Update API not implemented for ${this.entityName}`);
    }

    try {
      // Transformation des données via le transformateur (couche logique métier → infrastructure)
      let entityData: TUpdateEntity;
      if (this.transformers?.updateDtoToEntity) {
        entityData = this.transformers.updateDtoToEntity(data);
      } else {
        // Conversion sécurisée via type assertion contrôlée
        entityData = data as unknown as TUpdateEntity;
      }

      // Log de l'opération pour traçabilité
      console.debug(`Updating ${this.entityName}:`, entityData);

      // Appel à l'API - Interaction avec la source de données
      const result = await this.api.update(entityData);

      return result;
    } catch (error) {
      // Gestion des erreurs avec contexte enrichi
      console.error(`Error updating ${this.entityName}:`, error);
      throw error;
    }
  }

  /**
   * Opération Delete - Suppression d'une entité
   * Transaction atomique garantissant l'intégrité des données
   *
   * @param data DTO contenant les données pour la suppression
   * @returns Confirmation de suppression
   */
  async delete(data: TDeleteDTO): Promise<TDeleteResult> {
    if (!this.api.delete) {
      throw new Error(`Delete API not implemented for ${this.entityName}`);
    }

    try {
      // Transformation des données via le transformateur (couche logique métier → infrastructure)
      let entityData: TDeleteEntity;
      if (this.transformers?.deleteDtoToEntity) {
        entityData = this.transformers.deleteDtoToEntity(data);
      } else {
        // Conversion sécurisée via type assertion contrôlée
        entityData = data as unknown as TDeleteEntity;
      }

      // Log de l'opération pour traçabilité
      console.debug(`Deleting ${this.entityName}:`, entityData);

      // Appel à l'API - Interaction avec la source de données
      const result = await this.api.delete(entityData);

      return result;
    } catch (error) {
      // Gestion des erreurs avec contexte enrichi
      console.error(`Error deleting ${this.entityName}:`, error);
      throw error;
    }
  }

  /**
   * Opération Read One - Lecture d'une entité par son identifiant
   * Maintient les invariants sémantiques à travers les transformations
   *
   * @param id Identifiant de l'entité à récupérer
   * @param params Paramètres additionnels (inclusions, filtres, etc.)
   * @returns Entité récupérée
   */
  async getOne(
    id: string,
    params?: Omit<TReadParams, "pagination">
  ): Promise<TReadOneResult> {
    if (!this.api.getOne) {
      throw new Error(`GetOne API not implemented for ${this.entityName}`);
    }

    try {
      // Transformation des paramètres via le transformateur spécifique
      let queryParams = params;
      if (params && this.transformers?.readParamsToQuery) {
        const transformedParams = this.transformers.readParamsToQuery({
          ...params,
          id,
        } as unknown as TReadParams);

        queryParams = transformedParams as Omit<TReadParams, "pagination">;
      }

      // Log de l'opération pour traçabilité
      console.debug(`Fetching ${this.entityName} with ID:`, id, queryParams);

      // Appel à l'API - Interaction avec la source de données
      const result = await this.api.getOne(id, queryParams);

      return result;
    } catch (error) {
      // Gestion des erreurs avec contexte enrichi
      console.error(`Error fetching ${this.entityName} with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Opération Read Many - Lecture de plusieurs entités avec filtrage, pagination, etc.
   * Implémente la topologie des requêtes pour une lecture flexible et performante
   *
   * @param params Paramètres de lecture (filtrage, pagination, tri)
   * @returns Liste d'entités et métadonnées (pagination, total, etc.)
   */
  async getMany(params?: TReadParams): Promise<TReadManyResult> {
    if (!this.api.getMany) {
      throw new Error(`GetMany API not implemented for ${this.entityName}`);
    }

    try {
      // Transformation des paramètres via le transformateur spécifique
      let queryParams = params;
      if (params && this.transformers?.readParamsToQuery) {
        const transformedParams = this.transformers.readParamsToQuery(params);
        queryParams = transformedParams as TReadParams;
      }

      // Log de l'opération pour traçabilité
      console.debug(
        `Fetching ${this.entityName} list with params:`,
        queryParams
      );

      // Appel à l'API - Interaction avec la source de données
      const result = await this.api.getMany(queryParams);

      return result;
    } catch (error) {
      // Gestion des erreurs avec contexte enrichi
      console.error(`Error fetching ${this.entityName} list:`, error);
      throw error;
    }
  }
}

/**
 * Structure typologique pour représenter le résultat d'une opération getMany
 * Établit un contrat clair pour le retour des collections paginées
 */
export interface ReadManyResult<T> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
}
