/**
 * Types et interfaces pour la validation des données
 * Ce fichier établit le contrat entre la couche logique métier et la validation
 *
 * @author Créé le 30 novanbre 2021
 */

import { z } from "zod";

/**
 * Interface générique pour les erreurs de validation
 * Permet d'uniformiser la gestion des erreurs à travers l'architecture en couches
 */
export interface ValidationError {
  message: string;
  path?: (string | number)[];
  errors?: Record<string, string>;
  code?: string;
}

/**
 * Interface pour les schémas de validation
 * Établit un contrat uniforme indépendant de l'implémentation spécifique de validation
 */
export interface ValidationSchema<T = unknown> {
  /**
   * Valide et transforme les données selon le schéma défini
   *
   * @param data Données à valider
   * @returns Données validées et transformées
   * @throws ValidationError si la validation échoue
   */
  parse(data: unknown): T;

  /**
   * Version asynchrone de la validation qui permet des validations complexes
   *
   * @param data Données à valider
   * @returns Promise avec les données validées et transformées
   * @throws ValidationError si la validation échoue
   */
  parseAsync?(data: unknown): Promise<T>;

  /**
   * Valide les données sans lancer d'exception
   *
   * @param data Données à valider
   * @returns Résultat de validation contenant les données ou les erreurs
   */
  safeParse?(
    data: unknown
  ): { success: true; data: T } | { success: false; error: ValidationError };
}

/**
 * Adaptateur pour transformer un schéma Zod en ValidationSchema
 * Permet d'utiliser Zod tout en respectant l'interface générique
 *
 * @param schema Schéma Zod à adapter
 * @returns ValidationSchema compatible avec l'architecture CRUD
 */
export function createZodValidationSchema<T>(
  schema: z.ZodType<T>
): ValidationSchema<T> {
  return {
    parse: (data: unknown): T => {
      try {
        return schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationError: ValidationError = {
            message: "Validation failed",
            errors: {},
            path: [],
          };

          // Transforme les erreurs Zod en format uniforme
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              const path = err.path.join(".");
              validationError.errors![path] = err.message;
            }

            if (validationError.path?.length === 0 && err.path.length > 0) {
              validationError.path = err.path;
            }
          });

          throw validationError;
        }
        throw error;
      }
    },

    parseAsync: async (data: unknown): Promise<T> => {
      try {
        return await schema.parseAsync(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationError: ValidationError = {
            message: "Validation failed",
            errors: {},
            path: [],
          };

          // Transforme les erreurs Zod en format uniforme
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              const path = err.path.join(".");
              validationError.errors![path] = err.message;
            }

            if (validationError.path?.length === 0 && err.path.length > 0) {
              validationError.path = err.path;
            }
          });

          throw validationError;
        }
        throw error;
      }
    },

    safeParse: (data: unknown) => {
      const result = schema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        const validationError: ValidationError = {
          message: "Validation failed",
          errors: {},
          path: [],
        };

        // Transforme les erreurs Zod en format uniforme
        result.error.errors.forEach((err) => {
          if (err.path.length > 0) {
            const path = err.path.join(".");
            validationError.errors![path] = err.message;
          }

          if (validationError.path?.length === 0 && err.path.length > 0) {
            validationError.path = err.path;
          }
        });

        return { success: false, error: validationError };
      }
    },
  };
}

/**
 * Crée un validateur complet qui gère à la fois la validation des formulaires et les validations en temps réel
 *
 * @template T Type des données validées
 * @param schemas Configuration des schémas de validation
 * @returns Validateur avec méthodes pour différents contextes de validation
 */
export function createValidator<T extends Record<string, unknown>>(schemas: {
  submit?: z.ZodType<T>;
  live?: z.ZodType<Partial<T>>;
  fields?: Record<keyof T, z.ZodType<unknown>>;
}) {
  return {
    /**
     * Valide les données soumises (formulaire complet)
     */
    validateSubmit: (data: unknown): T => {
      if (!schemas.submit) {
        throw new Error("Submit validation schema not defined");
      }

      try {
        return schemas.submit.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};

          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0] as string] = err.message;
            }
          });

          const validationError = new Error("Validation failed") as Error & {
            errors: Record<string, string>;
          };
          validationError.errors = errors;
          throw validationError;
        }
        throw error;
      }
    },

    /**
     * Valide un champ spécifique en temps réel
     */
    validateField: <K extends keyof T>(field: K, value: unknown): string => {
      // Utilise le schéma de champ spécifique s'il existe
      if (schemas.fields && schemas.fields[field]) {
        try {
          schemas.fields[field].parse(value);
          return "";
        } catch (error) {
          if (error instanceof z.ZodError) {
            return error.errors[0]?.message || "";
          }
          return "Erreur inconnue";
        }
      }

      // Repli sur le schéma live pour la validation partielle
      if (schemas.live) {
        try {
          schemas.live.parse({ [field]: value } as Partial<T>);
          return "";
        } catch (error) {
          if (error instanceof z.ZodError) {
            const fieldError = error.errors.find(
              (err) => err.path.length > 0 && err.path[0] === field
            );
            return fieldError?.message || "";
          }
          return "Erreur inconnue";
        }
      }

      return "";
    },

    /**
     * Convertit un schéma zod en ValidationSchema pour l'architecture CRUD
     */
    toValidationSchema: (): ValidationSchema<T> => {
      if (!schemas.submit) {
        throw new Error("Submit validation schema not defined");
      }

      return createZodValidationSchema(schemas.submit);
    },
  };
}
