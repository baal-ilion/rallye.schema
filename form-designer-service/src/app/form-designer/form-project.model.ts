export const FORM_PROJECT_SCHEMA_VERSION = 1;

export interface DesignerQuestion {
  id: string;
  number: string;
  label: string;
  answer: string;
  difficulty: number;
  points: number;
}

export interface DesignerSection {
  id: string;
  title: string;
  color: string;
  questions: DesignerQuestion[];
}

export type DesignerBlockType = 'section' | 'custom-table' | 'text' | 'image'
  | 'columns' | 'separator' | 'page-break';

export interface DesignerBlock {
  id: string;
  type: DesignerBlockType;
  title: string;
  text: string;
  textStyle: 'normal' | 'instruction' | 'title' | 'boxed';
  color: string;
  textColor: string;
  spacingBefore: number;
  spacingAfter: number;
  keepTogether: boolean;
  correctedOnly: boolean;
  columns: number;
  columnGap: number;
  rows: number;
  columnWidths: number[];
  rowHeight: number;
  repeatHeader: boolean;
  showTableHeader: boolean;
  rowsGrouped: boolean;
  cellsMerged: boolean;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  numbering: 'numeric' | 'alpha' | 'roman' | 'manual';
  prefix: string;
  imageUrl?: string;
  imageUsage: 'illustration';
  sectionId?: string;
  tableColumns: DesignerTableColumn[];
  tableRows: DesignerTableRow[];
  childColumns: DesignerBlock[][];
}

export interface DesignerTableColumn {
  id: string;
  title: string;
  width: number;
  type: 'text' | 'number' | 'image';
}

export interface DesignerTableRow {
  id: string;
  cells: string[];
}

export interface DesignerStage {
  id: string;
  number: number;
  name: string;
  sourceFileName: string;
  sections: DesignerSection[];
  blocks?: DesignerBlock[];
}

export interface FormProject {
  kind: 'rallye-form-project';
  schemaVersion: number;
  id: string;
  name: string;
  rallyTitle: string;
  stages: DesignerStage[];
}

export interface FormStageFile {
  kind: 'rallye-form-stage';
  schemaVersion: number;
  stage: DesignerStage;
}
