// Interface for a Variable in the pathology tree
export interface Variable {
  label: string;
  code?: string;
  description?: string;
  sql_type?: string;
  isCategorical?: boolean;
  enumerations?: any[];
  type?: string;
  methodology?: string;
  units?: string;
  minValue?: number;
  maxValue?: number;
}

// Interface for a Group in the pathology tree
export interface Group {
  label: string;
  code?: string;
  variables?: Variable[];
  groups?: Group[];
}

// Interface for the overall Pathology
export interface Pathology {
  uuid: string;
  label: string;
  code?: string;
  version?: string;  // Root level only
  longitudinal?: boolean;  // Root level only
  variables?: Variable[];
  groups?: Group[];
  released: boolean;
}

// D3 hierarchy format interface
export interface D3HierarchyNode {
  name: string;
  label: string;
  value?: number;  // Optional, as this may only be used for leaf nodes
  code?: string;
  description?: string;
  sql_type?: string;
  isCategorical?: boolean;
  enumerations?: any[];
  type?: string;
  methodology?: string;
  units?: string;
  minValue?: number;
  maxValue?: number;
  children?: D3HierarchyNode[];  // Recursive children
}
