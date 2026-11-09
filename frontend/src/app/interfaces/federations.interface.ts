import {Pathology} from "./pathology.interface";

export interface Federation {
  code: string;
  title: string;
  url: string;
  description: string;
  dataModelIds: string[];
  pathologies: Pathology[];
  institutions: string;
  records: string;
}
