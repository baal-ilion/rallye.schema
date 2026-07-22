export const FORM_PROJECT_SCHEMA_VERSION = 6;

export interface DesignerCorrection {
  id: string;
  label: string;
  points: number;
}

export interface DesignerQuestion {
  id: string;
  number: string;
  answer: string;
  visibleInBlankForm: boolean;
  numberColor: string;
  answerColor: string;
  corrections: DesignerCorrection[];
}

export interface DesignerSection {
  id: string;
  title: string;
  showTitle: boolean;
  color: string;
  headerLabels: string[];
  headerColors: string[];
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
  columns: number;
  columnGap: number;
  rows: number;
  columnWidths: number[];
  rowHeight: number;
  repeatHeader: boolean;
  showTableHeader: boolean;
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
  color: string;
}

export interface DesignerTableRow {
  id: string;
  cells: string[];
  cellColors: string[];
}

export interface DesignerStage {
  id: string;
  hasFormDesign: boolean;
  formDesignVersion?: number;
  number: number;
  name: string;
  headerTitle: string;
  sourceFileName: string;
  sections: DesignerSection[];
  blocks?: DesignerBlock[];
}

export interface FormProject {
  kind: 'rallye-form-project';
  schemaVersion: number;
  id: string;
  rallyTitle: string;
  rallyDate: string;
  showLogo: boolean;
  logoUrl: string;
  titleSpacingBeforeMm: number;
  titleSpacingAfterMm: number;
  correctionCellWidthCm: number;
  correctionCellHeightCm: number;
  stages: DesignerStage[];
}
