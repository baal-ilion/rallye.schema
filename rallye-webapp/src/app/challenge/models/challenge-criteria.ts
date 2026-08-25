export interface ChallengeCriteria {
  /** Nom historique du numéro d'épreuve dans les paramètres de l'API. */
  challenge?: number,
  team?: number,
  checked?: boolean,
  entered?: boolean,
  finished?: boolean,
  sortBy?: string[]
}
