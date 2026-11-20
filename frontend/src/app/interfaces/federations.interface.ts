import {Pathology} from "./pathology.interface";

export interface Federation {
  code: string;
  title: string;
  url: string;
  description: string;
  dataModelIds: string[];
  institutions: number;
  records: number;
  /** Resolved client-side from dataModelIds; not part of the API payload. */
  pathologies?: Pathology[];
}

export type FederationInput = Omit<Federation, 'pathologies'>;
