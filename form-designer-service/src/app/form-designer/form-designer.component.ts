import { Component } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import * as XLSX from 'xlsx';
import { DesignerBlock, DesignerBlockType, DesignerCorrection, DesignerQuestion, DesignerSection, DesignerStage, FORM_PROJECT_SCHEMA_VERSION,
  FormProject, FormStageFile } from './form-project.model';

interface DesignerSectionFragment {
  section: DesignerSection;
  questions: DesignerQuestion[];
  continued: boolean;
}

interface DesignerPage {
  number: number;
  sections: DesignerSectionFragment[];
  blocks: DesignerBlock[];
}

@Component({
  selector: 'app-form-designer',
  templateUrl: './form-designer.component.html',
  styleUrls: ['./form-designer.component.scss']
})
export class FormDesignerComponent {
  private static readonly RALLY_TITLE_STORAGE_KEY = 'rallye-schema.form-designer.rally-title';

  project: FormProject = this.makeProject();
  activeStageId = this.project.stages[0].id;
  correctedPreview = false;
  importError = '';
  pages: DesignerPage[] = [{ number: 1, sections: [], blocks: [] }];
  ribbonTab: 'home' | 'insert' | 'table' | 'layout' | 'styles' = 'home';
  selectedBlockId = '';
  zoom = 85;
  showGrid = false;
  showOutline = true;
  showPictogramPalette = false;
  readonly pictograms = ['★', '●', '○', '✓', '✗', '→', '←', '↑', '↓', '⚑', '⚠', 'ⓘ',
    '♥', '♦', '♣', '♠', '⚓', '☀', '☂', '☎', '♬', '✉', '⌂', '◆'];
  private lastTextEditor: HTMLInputElement | HTMLTextAreaElement | null = null;
  readonly blockCatalog: Array<{ type: DesignerBlockType; label: string; icon: string }> = [
    { type: 'section', label: 'Section de réponses', icon: '▦' },
    { type: 'custom-table', label: 'Tableau', icon: '▤' },
    { type: 'text', label: 'Texte', icon: 'T' },
    { type: 'image', label: 'Image', icon: '▧' },
    { type: 'columns', label: 'Conteneur colonnes', icon: '▥' },
    { type: 'separator', label: 'Séparateur', icon: '―' },
    { type: 'page-break', label: 'Saut de page', icon: '↵' }
  ];

  get activeStage(): DesignerStage {
    return this.project.stages.find(stage => stage.id === this.activeStageId) || this.project.stages[0];
  }

  get sections(): DesignerSection[] { return this.activeStage?.sections || []; }
  get rallyTitle(): string { return this.project.rallyTitle; }
  get correctionGroupWidth(): string {
    return `${(this.project.correctionCellWidthCm * 3).toFixed(2)}cm`;
  }
  sectionCorrectionWidth(section: DesignerSection): string {
    return this.correctionGroupWidth;
  }
  get blocks(): DesignerBlock[] {
    if (!this.activeStage.blocks) { this.activeStage.blocks = []; }
    return this.activeStage.blocks;
  }
  get selectedBlock(): DesignerBlock | undefined {
    return this.allBlocks.find(block => block.id === this.selectedBlockId);
  }
  get allBlocks(): DesignerBlock[] { return this.flattenBlocks(this.blocks); }
  get dropListIds(): string[] {
    return ['root-blocks', ...this.allBlocks.filter(block => block.type === 'columns')
      .flatMap(block => block.childColumns.map((_, index) => this.columnDropId(block, index)))];
  }
  get selectedSection(): DesignerSection | undefined {
    const sectionId = this.selectedBlock?.sectionId;
    return sectionId ? this.sections.find(section => section.id === sectionId) : undefined;
  }
  get canvasBlocks(): DesignerBlock[] {
    // Les sections liées à un tableau sont déjà rendues et éditables dans les
    // pages A4. Le canevas intermédiaire ne montre que les blocs libres qui ne
    // disposent pas encore d'un rendu tabulaire afin d'éviter un faux doublon.
    return this.allBlocks.filter(block => !block.sectionId && block.type !== 'columns');
  }
  freeBlocksForPage(pageNumber: number): DesignerBlock[] {
    return this.pages[pageNumber - 1]?.blocks || [];
  }
  documentOrder(block: DesignerBlock): number {
    const index = this.allBlocks.findIndex(item => item.id === block.id);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  }
  sectionDocumentOrder(section: DesignerSection): number {
    const block = this.blockForSection(section);
    return block ? this.documentOrder(block) : Number.MAX_SAFE_INTEGER;
  }
  get isTableSelection(): boolean {
    return !!this.selectedSection || this.selectedBlock?.type === 'custom-table';
  }
  get canCustomizeColumns(): boolean {
    return this.selectedBlock?.type === 'custom-table' || this.selectedBlock?.type === 'columns';
  }

  get questionCount(): number {
    return this.sections.reduce((total, section) => total + section.questions.length, 0);
  }

  get paginatedQuestionCount(): number {
    return this.pages.reduce((pageTotal, page) => pageTotal
      + page.sections.reduce((sectionTotal, fragment) => sectionTotal + fragment.questions.length, 0), 0);
  }

  get questionColumnWidth(): string {
    const maxLength = this.sections.reduce((length, section) => Math.max(length,
      ...section.questions.map(question => question.number.length)), 2);
    return `calc(${maxLength}ch + 5mm)`;
  }

  newProject(): void {
    if (!confirm('Créer un nouveau projet ? Les modifications non sauvegardées seront perdues.')) {
      return;
    }
    this.project = this.makeProject();
    this.activeStageId = this.project.stages[0].id;
    this.importError = '';
    this.refreshPages();
  }

  addStage(): void {
    const nextNumber = Math.max(0, ...this.project.stages.map(stage => stage.number)) + 1;
    const stage = this.makeStage(nextNumber);
    this.project.stages.push(stage);
    this.selectStage(stage.id);
  }

  selectStage(id: string): void {
    this.activeStageId = id;
    this.importError = '';
    this.refreshPages();
    this.selectedBlockId = this.blocks[0]?.id || '';
  }

  deleteActiveStage(): void {
    if (this.project.stages.length === 1) {
      this.importError = 'Le projet doit contenir au moins une épreuve.';
      return;
    }
    if (!confirm(`Supprimer l'épreuve « ${this.activeStage.name} » ?`)) {
      return;
    }
    const index = this.project.stages.findIndex(stage => stage.id === this.activeStageId);
    this.project.stages.splice(index, 1);
    this.selectStage(this.project.stages[Math.max(0, index - 1)].id);
  }

  saveProject(): void {
    this.downloadJson(this.project, `${this.fileSlug(this.project.name)}.rallye-project.json`);
  }

  saveActiveStage(): void {
    const stageFile: FormStageFile = {
      kind: 'rallye-form-stage',
      schemaVersion: FORM_PROJECT_SCHEMA_VERSION,
      stage: this.clone(this.activeStage)
    };
    this.downloadJson(stageFile,
      `${String(this.activeStage.number).padStart(2, '0')}-${this.fileSlug(this.activeStage.name)}.rallye-stage.json`);
  }

  async openProject(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file) { return; }
    try {
      const value = JSON.parse(await file.text()) as FormProject;
      if (value.kind !== 'rallye-form-project' || value.schemaVersion !== FORM_PROJECT_SCHEMA_VERSION
        || !Array.isArray(value.stages) || !value.stages.length) {
        throw new Error('Le fichier ne contient pas un projet compatible.');
      }
      this.project = value;
      this.activeStageId = value.stages[0].id;
      this.updateRallyTitle(value.rallyTitle);
      this.importError = '';
      this.refreshPages();
    } catch (error) {
      this.importError = error instanceof Error ? error.message : 'Impossible d\'ouvrir le projet.';
    }
  }

  async openStage(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file) { return; }
    try {
      const value = JSON.parse(await file.text()) as FormStageFile;
      if (value.kind !== 'rallye-form-stage' || value.schemaVersion !== FORM_PROJECT_SCHEMA_VERSION
        || !value.stage?.sections) {
        throw new Error('Le fichier ne contient pas une épreuve compatible.');
      }
      const stage = this.clone(value.stage);
      stage.id = this.newId('stage');
      this.project.stages.push(stage);
      this.selectStage(stage.id);
    } catch (error) {
      this.importError = error instanceof Error ? error.message : 'Impossible d\'ouvrir l\'épreuve.';
    }
  }

  async importWorkbook(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file) {
      return;
    }
    this.importError = '';
    try {
      const workbook = XLSX.read(await this.readFile(file), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
      const sections = this.parseSections(rows, sheet);

      if (!sections.some(section => section.questions.length)) {
        throw new Error('Aucune réponse trouvée à partir de la ligne 11.');
      }
      this.activeStage.sourceFileName = file.name;
      this.activeStage.sections = sections;
      this.activeStage.blocks = sections.map(section => {
        const block = this.makeBlock('section', section.title, section.id);
        block.color = section.color;
        return block;
      });
      this.selectedBlockId = this.activeStage.blocks[0]?.id || '';
      this.refreshPages();
    } catch (error) {
      this.importError = error instanceof Error ? error.message : 'Le fichier Excel ne peut pas être lu.';
    }
  }

  addSection(): void {
    const index = this.sections.length + 1;
    this.sections.push({
      id: `section-${Date.now()}`,
      title: `Section ${index}`,
      showTitle: true,
      color: '#d9eaf2',
      questions: [this.makeQuestion(1)]
    });
    this.blocks.push(this.makeBlock('section', `Section ${index}`, this.sections[this.sections.length - 1].id));
    this.refreshPages();
  }

  insertBlock(type: DesignerBlockType): void {
    const definition = this.blockCatalog.find(item => item.type === type);
    const block = this.makeBlock(type, definition?.label || 'Bloc');
    const targetList = this.findBlockList(this.selectedBlockId) || this.blocks;
    const selectedIndex = targetList.findIndex(item => item.id === this.selectedBlockId);
    targetList.splice(selectedIndex < 0 ? targetList.length : selectedIndex + 1, 0, block);
    this.selectedBlockId = block.id;
    if (type === 'section') {
      const section: DesignerSection = {
        id: this.newId('section'), title: block.title, showTitle: true, color: block.color,
        questions: [this.makeQuestion(1)]
      };
      block.sectionId = section.id;
      this.sections.push(section);
      this.synchronizeSectionOrder();
    }
    this.refreshPages();
  }

  selectBlock(id: string): void { this.selectedBlockId = id; }

  rememberTextEditor(event: FocusEvent): void {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) {
      this.lastTextEditor = target;
      return;
    }
    if (target instanceof HTMLInputElement && ['text', 'search', 'url', 'email'].includes(target.type)) {
      this.lastTextEditor = target;
    }
  }

  insertPictogram(symbol: string): void {
    const editor = this.lastTextEditor;
    if (!editor) {
      this.importError = 'Placez d’abord le curseur dans un champ de texte.';
      return;
    }
    const start = editor.selectionStart ?? editor.value.length;
    const end = editor.selectionEnd ?? start;
    editor.setRangeText(symbol, start, end, 'end');
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.focus();
    this.showPictogramPalette = false;
    this.importError = '';
  }

  formatAsList(style: 'bullet' | 'numbered'): void {
    const editor = this.lastTextEditor;
    if (!editor) {
      this.importError = 'Placez d’abord le curseur dans un champ de texte.';
      return;
    }
    const value = editor.value;
    const selectionStart = editor.selectionStart ?? 0;
    const selectionEnd = editor.selectionEnd ?? selectionStart;
    const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
    const nextBreak = value.indexOf('\n', selectionEnd);
    const lineEnd = nextBreak < 0 ? value.length : nextBreak;
    const selectedLines = value.slice(lineStart, lineEnd).split('\n');
    const formatted = selectedLines.map((line, index) => {
      const content = line.replace(/^\s*(?:[•*-]|\d+[.)])\s+/, '');
      return style === 'bullet' ? `• ${content}` : `${index + 1}. ${content}`;
    }).join('\n');
    editor.setRangeText(formatted, lineStart, lineEnd, 'end');
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.focus();
    this.importError = '';
  }

  columnDropId(container: DesignerBlock, columnIndex: number): string {
    return `container-${container.id}-column-${columnIndex}`;
  }

  selectSectionBlock(section: DesignerSection): void {
    const existing = this.blocks.find(block => block.sectionId === section.id);
    if (existing) {
      this.selectedBlockId = existing.id;
      return;
    }
    const block = this.makeBlock('section', section.title, section.id);
    block.color = section.color;
    this.blocks.push(block);
    this.selectedBlockId = block.id;
  }

  blockForSection(section: DesignerSection): DesignerBlock | undefined {
    return this.allBlocks.find(block => block.sectionId === section.id);
  }

  sectionWidth(section: DesignerSection): string {
    const block = this.blockForSection(section);
    return block ? this.blockWidth(block) : '100%';
  }

  blockWidth(block: DesignerBlock): string {
    const placement = this.findContainerPlacement(block.id);
    if (placement) {
      const count = placement.container.childColumns.length;
      const gap = placement.container.columnGap || 0;
      const widthPercent = 100 / count;
      const gapShareMm = ((count - 1) * gap) / count;
      return `calc(${widthPercent}% - ${gapShareMm}mm)`;
    }
    return '100%';
  }

  sectionMarginLeft(section: DesignerSection): string {
    const block = this.blockForSection(section);
    return block ? this.blockMarginLeft(block) : '0';
  }

  sectionMarginRight(section: DesignerSection): string {
    const block = this.blockForSection(section);
    return block ? this.blockMarginRight(block) : '0';
  }

  blockMarginLeft(block: DesignerBlock): string {
    return '0';
  }

  blockMarginRight(block: DesignerBlock): string {
    const placement = this.findContainerPlacement(block.id);
    if (placement) {
      return placement.columnIndex < placement.container.childColumns.length - 1
        ? `${placement.container.columnGap || 0}mm` : '0';
    }
    return '0';
  }

  updateSelectedSectionTitle(value: string): void {
    if (!this.selectedBlock) { return; }
    this.selectedBlock.title = value;
    if (this.selectedSection) { this.selectedSection.title = value; }
  }

  updateSelectedSectionColor(value: string): void {
    if (!this.selectedBlock) { return; }
    this.selectedBlock.color = value;
    if (this.selectedSection) { this.selectedSection.color = value; }
  }

  addQuestion(section: DesignerSection): void {
    const index = section.questions.length + 1;
    section.questions.push(this.makeQuestion(index));
    this.refreshPages();
  }

  removeQuestion(section: DesignerSection, question: DesignerQuestion): void {
    const index = section.questions.indexOf(question);
    if (index >= 0) { section.questions.splice(index, 1); this.refreshPages(); }
  }

  moveQuestion(section: DesignerSection, question: DesignerQuestion, direction: -1 | 1): void {
    const index = section.questions.indexOf(question);
    const destination = index + direction;
    if (index >= 0 && destination >= 0 && destination < section.questions.length) {
      moveItemInArray(section.questions, index, destination);
      this.refreshPages();
    }
  }

  questionEdited(): void { this.refreshPages(); }

  applyNumbering(): void {
    const block = this.selectedBlock;
    if (!block || block.numbering === 'manual') { return; }
    const values = this.selectedSection?.questions.map(question => question)
      || block.tableRows.map(row => row);
    values.forEach((value, index) => {
      let number = String(index + 1);
      if (block.numbering === 'alpha') { number = this.alphaNumber(index); }
      if (block.numbering === 'roman') { number = this.romanNumber(index + 1); }
      const formatted = `${block.prefix}${number}`;
      if ('number' in value) { value.number = formatted; }
      else if (value.cells.length) { value.cells[0] = formatted; }
    });
  }

  blockHelp(type: DesignerBlockType): string {
    const help: Record<DesignerBlockType, string> = {
      section: 'Ajouter une section titrée et colorée qui regroupe des questions.',
      'custom-table': 'Ajouter un tableau dont les colonnes, largeurs et cellules peuvent être personnalisées.',
      text: 'Ajouter un bloc de texte libre dans la zone imprimable.',
      image: 'Ajouter une image. Choisissez ensuite le fichier dans les propriétés.',
      columns: 'Créer un conteneur qui dispose plusieurs blocs côte à côte.',
      separator: 'Ajouter une ligne ou un espace de séparation entre deux contenus.',
      'page-break': 'Forcer le contenu suivant à commencer sur une nouvelle page A4.'
    };
    return help[type];
  }

  dropBlock(event: CdkDragDrop<DesignerBlock[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data,
        event.previousIndex, event.currentIndex);
    }
    this.synchronizeSectionOrder();
  }

  moveSelected(direction: -1 | 1): void {
    const list = this.findBlockList(this.selectedBlockId);
    if (!list) { return; }
    const index = list.findIndex(block => block.id === this.selectedBlockId);
    const destination = index + direction;
    if (index >= 0 && destination >= 0 && destination < list.length) {
      moveItemInArray(list, index, destination);
      this.synchronizeSectionOrder();
    }
  }

  duplicateSelected(): void {
    const block = this.selectedBlock;
    if (!block) { return; }
    const copy = this.clone(block);
    copy.id = this.newId('block');
    copy.title += ' (copie)';
    if (block.sectionId) {
      const sourceSection = this.sections.find(section => section.id === block.sectionId);
      if (sourceSection) {
        const sectionCopy = this.clone(sourceSection);
        sectionCopy.id = this.newId('section');
        sectionCopy.title += ' (copie)';
        sectionCopy.questions.forEach(question => question.id = this.newId('question'));
        this.sections.push(sectionCopy);
        copy.sectionId = sectionCopy.id;
        copy.title = sectionCopy.title;
        this.refreshPages();
      }
    }
    const list = this.findBlockList(block.id) || this.blocks;
    const index = list.indexOf(block);
    list.splice(index + 1, 0, copy);
    this.selectedBlockId = copy.id;
    this.synchronizeSectionOrder();
  }

  deleteSelected(): void {
    const list = this.findBlockList(this.selectedBlockId);
    if (!list) { return; }
    const index = list.findIndex(block => block.id === this.selectedBlockId);
    if (index < 0) { return; }
    const [removed] = list.splice(index, 1);
    if (removed.type === 'columns') {
      list.splice(index, 0, ...removed.childColumns.flat());
    }
    if (removed.sectionId) {
      const sectionIndex = this.sections.findIndex(section => section.id === removed.sectionId);
      if (sectionIndex >= 0) { this.sections.splice(sectionIndex, 1); this.refreshPages(); }
    }
    this.selectedBlockId = list[Math.min(index, list.length - 1)]?.id || '';
    this.synchronizeSectionOrder();
  }

  addTableColumn(): void {
    if (!this.selectedBlock) { return; }
    if (this.selectedBlock.type === 'custom-table' || this.selectedBlock.type === 'columns') {
      this.selectedBlock.tableColumns.push({
        id: this.newId('column'), title: `Colonne ${this.selectedBlock.tableColumns.length + 1}`,
        width: 25, type: 'text'
      });
      this.selectedBlock.tableRows.forEach(row => row.cells.push(''));
      this.selectedBlock.columns = this.selectedBlock.tableColumns.length;
      if (this.selectedBlock.type === 'columns') { this.selectedBlock.childColumns.push([]); }
      return;
    }
    this.selectedBlock.columns++;
    this.selectedBlock.columnWidths.push(20);
  }

  removeTableColumn(): void {
    if (!this.selectedBlock || this.selectedBlock.columns <= 1) { return; }
    if (this.selectedBlock.type === 'custom-table' || this.selectedBlock.type === 'columns') {
      if (this.selectedBlock.type === 'columns') {
        const removedChildren = this.selectedBlock.childColumns.pop() || [];
        const parentList = this.findBlockList(this.selectedBlock.id) || this.blocks;
        const containerIndex = parentList.indexOf(this.selectedBlock);
        parentList.splice(containerIndex + 1, 0, ...removedChildren);
      }
      this.selectedBlock.tableColumns.pop();
      this.selectedBlock.tableRows.forEach(row => row.cells.pop());
      this.selectedBlock.columns = this.selectedBlock.tableColumns.length;
      return;
    }
    this.selectedBlock.columns--;
    this.selectedBlock.columnWidths.pop();
  }

  removeCustomColumn(columnIndex: number): void {
    const block = this.selectedBlock;
    if (!block || !['custom-table', 'columns'].includes(block.type)
      || block.tableColumns.length <= 1) { return; }
    block.tableColumns.splice(columnIndex, 1);
    block.tableRows.forEach(row => row.cells.splice(columnIndex, 1));
    block.columns = block.tableColumns.length;
  }

  setCustomColumnCount(value: number): void {
    const block = this.selectedBlock;
    if (!block || !['custom-table', 'columns'].includes(block.type)) { return; }
    const maximum = block.type === 'columns' ? 6 : 12;
    const target = Math.max(1, Math.min(maximum, Number(value) || 1));
    while (block.tableColumns.length < target) { this.addTableColumn(); }
    while (block.tableColumns.length > target) { this.removeTableColumn(); }
  }

  changeRows(delta: number): void {
    if (!this.selectedBlock) { return; }
    if (this.selectedSection) {
      if (delta > 0) { this.addQuestion(this.selectedSection); }
      if (delta < 0 && this.selectedSection.questions.length) {
        this.removeQuestion(this.selectedSection, this.selectedSection.questions[this.selectedSection.questions.length - 1]);
      }
      this.selectedBlock.rows = this.selectedSection.questions.length;
      return;
    }
    if (this.selectedBlock.type === 'custom-table') {
      if (delta > 0) {
        this.selectedBlock.tableRows.push({
          id: this.newId('row'), cells: this.selectedBlock.tableColumns.map(() => '')
        });
      } else if (this.selectedBlock.tableRows.length > 1) {
        this.selectedBlock.tableRows.pop();
      }
      this.selectedBlock.rows = this.selectedBlock.tableRows.length;
      return;
    }
    this.selectedBlock.rows = Math.max(1, (this.selectedBlock.rows || 1) + delta);
  }

  toggleGroupedRows(): void {
    if (this.selectedBlock) {
      this.selectedBlock.rowsGrouped = !this.selectedBlock.rowsGrouped;
      this.selectedBlock.keepTogether = this.selectedBlock.rowsGrouped;
      this.refreshPages();
    }
  }
  toggleRepeatHeader(): void { if (this.selectedBlock) { this.selectedBlock.repeatHeader = !this.selectedBlock.repeatHeader; } }
  toggleTextStyle(style: 'bold' | 'italic' | 'underline'): void {
    if (!this.selectedBlock) { return; }
    if (style === 'bold') { this.selectedBlock.fontWeight = this.selectedBlock.fontWeight === 'bold' ? 'normal' : 'bold'; }
    if (style === 'italic') { this.selectedBlock.fontStyle = this.selectedBlock.fontStyle === 'italic' ? 'normal' : 'italic'; }
    if (style === 'underline') { this.selectedBlock.textDecoration = this.selectedBlock.textDecoration === 'underline' ? 'none' : 'underline'; }
  }

  applyStyle(color: string, textColor = '#111111'): void {
    if (!this.selectedBlock) { return; }
    this.selectedBlock.color = color;
    this.selectedBlock.textColor = textColor;
    const section = this.sections.find(item => item.id === this.selectedBlock?.sectionId);
    if (section) { section.color = color; }
  }

  async attachImage(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file || !this.selectedBlock) { return; }
    this.selectedBlock.imageUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  removeSection(index: number): void {
    const [section] = this.sections.splice(index, 1);
    if (section?.questions.length) {
      if (!this.sections.length) {
        this.addSection();
      }
      this.sections[0].questions.push(...section.questions);
    }
    this.refreshPages();
  }

  print(corrected: boolean): void {
    this.correctedPreview = corrected;
    this.refreshPages();
    setTimeout(() => window.print());
  }

  setCorrectedPreview(corrected: boolean): void {
    this.correctedPreview = corrected;
    this.refreshPages();
  }

  updateRallyTitle(value: string): void {
    this.project.rallyTitle = value;
    localStorage.setItem(FormDesignerComponent.RALLY_TITLE_STORAGE_KEY, value);
  }

  trackSection(_: number, section: DesignerSection): string { return section.id; }
  trackQuestion(_: number, question: DesignerQuestion): string { return question.id; }
  trackCorrection(_: number, correction: DesignerCorrection): string { return correction.id; }

  addCorrection(question: DesignerQuestion): void {
    question.corrections.push(this.makeCorrection());
    this.questionEdited();
  }

  removeCorrection(question: DesignerQuestion, correction: DesignerCorrection): void {
    if (question.corrections.length <= 1) { return; }
    question.corrections.splice(question.corrections.indexOf(correction), 1);
    this.questionEdited();
  }

  private parseSections(rows: any[][], sheet: XLSX.WorkSheet): DesignerSection[] {
    const sectionHeader = String(rows[8]?.[0] ?? '').trim().toLocaleLowerCase('fr');
    if (sectionHeader !== 'section (optionnelle)') {
      throw new Error('Format invalide : la cellule A9 doit contenir « Section (optionnelle) ».');
    }
    const sectionMerges = (sheet['!merges'] || []).filter(merge => merge.s.c === 0 && merge.e.c === 0);
    const sections: DesignerSection[] = [];
    const responseMerges = (sheet['!merges'] || []).filter(merge =>
      (merge.s.c === 1 && merge.e.c === 1) || (merge.s.c === 2 && merge.e.c === 2));
    let current: DesignerSection | null = null;
    let currentKey = '';
    let questionIndex = 0;
    let anonymousIndex = 0;
    for (let rowIndex = 10; rowIndex < rows.length;) {
      const row = rows[rowIndex] || [];
      if (![1, 2, 3, 4, 5].some(column => String(row[column] ?? '').trim())) {
        current = null;
        currentKey = '';
        rowIndex++;
        continue;
      }
      const merge = sectionMerges.find(range => rowIndex >= range.s.r && rowIndex <= range.e.r);
      const mergedSectionName = merge ? String(rows[merge.s.r]?.[0] ?? '').trim() : '';
      const directSectionName = String(row[0] ?? '').trim();
      const sectionName = mergedSectionName || directSectionName;
      const key = merge ? `merge-${merge.s.r}` : sectionName ? `row-${rowIndex}` : 'anonymous';
      if (!current || currentKey !== key) {
        if (!sectionName) { anonymousIndex++; }
        current = {
          id: `section-${sections.length + 1}`,
          title: sectionName || `Section sans titre ${anonymousIndex}`,
          showTitle: !!sectionName,
          color: this.sectionColor(sectionName),
          questions: []
        };
        sections.push(current);
        currentKey = key;
      }
      const responseMerge = responseMerges.find(range => range.s.r === rowIndex);
      const groupEnd = responseMerge ? responseMerge.e.r : rowIndex;
      current.questions.push(this.toQuestion(rows, rowIndex, groupEnd, questionIndex++));
      rowIndex = groupEnd + 1;
    }
    const labels = sections.flatMap(section => section.questions.flatMap(question =>
      question.corrections.map(correction => correction.label).filter(Boolean)));
    const duplicate = labels.find((label, index) => labels.indexOf(label) !== index);
    if (duplicate) { throw new Error(`Format invalide : le label « ${duplicate} » est utilisé plusieurs fois.`); }
    return sections;
  }

  private toQuestion(rows: any[][], start: number, end: number, index: number): DesignerQuestion {
    const row = rows[start] || [];
    const number = String(row[1] ?? '').trim();
    const answer = String(row[2] ?? '').trim();
    const corrections = [] as DesignerCorrection[];
    for (let rowIndex = start; rowIndex <= end; rowIndex++) {
      const correctionRow = rows[rowIndex] || [];
      corrections.push({
        id: this.newId('correction'),
        label: String(correctionRow[5] ?? '').trim(),
        points: this.toNumber(correctionRow[4])
      });
    }
    return {
      id: this.technicalId(corrections.map(correction => correction.label).join('-'), index),
      number,
      answer,
      visibleInBlankForm: false,
      corrections
    };
  }

  private technicalId(value: string, index: number): string {
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase();
    return normalized || `Q${String(index + 1).padStart(3, '0')}`;
  }

  private alphaNumber(index: number): string {
    let result = '';
    for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
      result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
    }
    return result;
  }

  private romanNumber(value: number): string {
    const symbols: Array<[number, string]> = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let remaining = value;
    return symbols.reduce((result, [amount, symbol]) => {
      while (remaining >= amount) { result += symbol; remaining -= amount; }
      return result;
    }, '');
  }

  private sectionColor(name: string): string {
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalized.includes('vert')) { return '#b7d7a8'; }
    if (normalized.includes('bleu')) { return '#a9d6e5'; }
    if (normalized.includes('rouge')) { return '#f4a3a3'; }
    if (normalized.includes('jaune')) { return '#ffe98a'; }
    if (normalized.includes('gris')) { return '#d9d9d9'; }
    return '#d9ead3';
  }

  private toNumber(value: unknown): number {
    const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.');
    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private readFile(file: File): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('Impossible de lire le fichier.'));
      reader.onabort = () => reject(new Error('Lecture du fichier annulée.'));
      reader.readAsArrayBuffer(file);
    });
  }

  private refreshPages(): void {
    const pages = this.paginate();
    const paginatedCount = pages.reduce((pageTotal, page) => pageTotal
      + page.sections.reduce((sectionTotal, fragment) => sectionTotal + fragment.questions.length, 0), 0);
    const expectedCount = this.questionCount;
    if (paginatedCount !== expectedCount) {
      this.importError = `Pagination incomplète : ${paginatedCount} question(s) sur ${expectedCount}.`;
      return;
    }
    this.pages = pages;
  }

  private makeProject(): FormProject {
    const rallyTitle = localStorage.getItem(FormDesignerComponent.RALLY_TITLE_STORAGE_KEY)
      || 'Le Rallye se prend aux jeux';
    const firstStage = this.makeStage(1);
    return {
      kind: 'rallye-form-project',
      schemaVersion: FORM_PROJECT_SCHEMA_VERSION,
      id: this.newId('project'),
      name: 'Nouveau Rallye',
      rallyTitle,
      correctionCellWidthCm: 0.53,
      correctionCellHeightCm: 0.53,
      stages: [firstStage]
    };
  }

  private makeStage(number: number): DesignerStage {
    return {
      id: this.newId('stage'),
      number,
      name: 'Nouvelle épreuve',
      sourceFileName: '',
      sections: [],
      blocks: []
    };
  }

  private makeBlock(type: DesignerBlockType, title: string, sectionId?: string): DesignerBlock {
    return {
      id: this.newId('block'), type, title, text: '', textStyle: 'normal', color: '#d9eaf2', textColor: '#111111',
      spacingBefore: 0, spacingAfter: 0,
      keepTogether: true, columns: type === 'columns' ? 2 : 3, columnGap: 5, rows: 3,
      columnWidths: type === 'custom-table' ? [33.333, 33.333, 33.334] : [15, 70, 15],
      rowHeight: 4.7, repeatHeader: true, showTableHeader: false, rowsGrouped: false,
      cellsMerged: false,
      fontWeight: 'normal', fontStyle: 'normal',
      textDecoration: 'none', numbering: 'numeric', prefix: '', sectionId,
      imageUsage: 'illustration',
      tableColumns: type === 'custom-table'
        ? [1, 2, 3].map(index => ({
          id: this.newId('column'), title: `Colonne ${index}`, width: index === 3 ? 33.334 : 33.333,
          type: 'text' as const
        }))
        : [
          { id: this.newId('column'), title: 'N°', width: 15, type: 'number' as const },
          { id: this.newId('column'), title: 'Réponse', width: 70, type: 'text' as const },
          { id: this.newId('column'), title: 'Colonne 3', width: 15, type: 'text' as const }
        ].slice(0, type === 'columns' ? 2 : 3),
      tableRows: [1, 2, 3].map(index => ({
        id: this.newId('row'), cells: type === 'custom-table' ? ['', '', ''] : [String(index), '', '']
      })),
      childColumns: type === 'columns' ? [[], []] : []
    };
  }

  private makeQuestion(index: number): DesignerQuestion {
    return {
      id: this.newId('question'), number: String(index), answer: '', visibleInBlankForm: false,
      corrections: [this.makeCorrection()]
    };
  }

  private makeCorrection(): DesignerCorrection {
    return { id: this.newId('correction'), label: '', points: 0 };
  }

  private synchronizeSectionOrder(): void {
    this.activeStage.sections = [...this.sectionsInDocumentOrder()];
    this.refreshPages();
  }

  private sectionsInDocumentOrder(): DesignerSection[] {
    const sectionsById = new Map(this.sections.map(section => [section.id, section]));
    const orderedSections = this.flattenBlocks(this.blocks)
      .map(block => block.sectionId ? sectionsById.get(block.sectionId) : undefined)
      .filter((section): section is DesignerSection => !!section);
    const referencedIds = new Set(orderedSections.map(section => section.id));
    orderedSections.push(...this.sections.filter(section => !referencedIds.has(section.id)));
    return orderedSections;
  }

  private flattenBlocks(blocks: DesignerBlock[]): DesignerBlock[] {
    return blocks.flatMap(block => {
      if (block.type !== 'columns') {
        return [block, ...this.flattenBlocks(block.childColumns.flat())];
      }
      // Le rendu A4 utilise un flux horizontal. Les enfants doivent donc être
      // fournis ligne par ligne et non colonne par colonne, sinon deux éléments
      // de la première colonne se retrouvent côte à côte.
      const rowMajorChildren: DesignerBlock[] = [];
      const rowCount = Math.max(0, ...block.childColumns.map(column => column.length));
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        for (const column of block.childColumns) {
          const child = column[rowIndex];
          if (child) { rowMajorChildren.push(child); }
        }
      }
      return [block, ...this.flattenBlocks(rowMajorChildren)];
    });
  }

  private findBlockList(blockId: string, blocks: DesignerBlock[] = this.blocks): DesignerBlock[] | undefined {
    if (blocks.some(block => block.id === blockId)) { return blocks; }
    for (const block of blocks) {
      for (const column of block.childColumns) {
        const found = this.findBlockList(blockId, column);
        if (found) { return found; }
      }
    }
    return undefined;
  }

  private findContainerPlacement(blockId: string): {
    container: DesignerBlock; columnIndex: number; rowIndex: number
  } | undefined {
    for (const container of this.allBlocks.filter(block => block.type === 'columns')) {
      for (let columnIndex = 0; columnIndex < container.childColumns.length; columnIndex++) {
        const rowIndex = container.childColumns[columnIndex].findIndex(child => child.id === blockId);
        if (rowIndex >= 0) { return { container, columnIndex, rowIndex }; }
      }
    }
    return undefined;
  }

  private newId(prefix: string): string {
    const value = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${value}`;
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private fileSlug(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sans-nom';
  }

  private downloadJson(value: unknown, fileName: string): void {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private paginate(): DesignerPage[] {
    // La hauteur des lignes est fixe en CSS. Cette capacité laisse la place au
    // cartouche, aux titres de section, au pied de page et aux quatre repères.
    // Toutes les mesures correspondent aux dimensions physiques du rendu A4.
    const contentCapacityMm = 190;
    const pages: DesignerPage[] = [];
    let current: DesignerPage = { number: 1, sections: [], blocks: [] };
    let remainingMm = contentCapacityMm;

    const pushPage = () => {
      pages.push(current);
      current = { number: pages.length + 1, sections: [], blocks: [] };
      remainingMm = contentCapacityMm;
    };

    /* Ancien algorithme séquentiel conservé temporairement pour faciliter la comparaison.
    for (const section of this.sections) {
      if (!section.questions.length) {
        continue;
      }
      let offset = 0;
      let continued = false;
      const sectionBlock = this.blockForSection(section);
      const questionHeightMm = Math.max(3, sectionBlock?.rowHeight || 4.7);
      const spacingMm = (sectionBlock?.spacingBefore || 0) + (sectionBlock?.spacingAfter || 0);
      const completeSectionHeight = sectionOverheadMm + spacingMm + section.questions.length * questionHeightMm;
      if (sectionBlock?.keepTogether && completeSectionHeight <= contentCapacityMm
        && completeSectionHeight > remainingMm) {
        pushPage();
      }
      while (offset < section.questions.length) {
        // Une section consomme son titre, l'en-tête du tableau et sa marge.
        if (remainingMm < sectionOverheadMm + spacingMm + questionHeightMm) {
          pushPage();
        }
        const availableRows = Math.floor((remainingMm - sectionOverheadMm - spacingMm) / questionHeightMm);
        const questionCount = Math.min(availableRows, section.questions.length - offset);
        current.sections.push({
          section,
          questions: section.questions.slice(offset, offset + questionCount),
          continued
        });
        offset += questionCount;
        remainingMm -= sectionOverheadMm + spacingMm + questionCount * questionHeightMm;
        continued = true;
        if (offset < section.questions.length) {
          pushPage();
        }
      }
    }
    */
    const sectionsById = new Map(this.sections.map(section => [section.id, section]));
    const documentUnits = this.documentBlockUnits(this.blocks);

    for (const unitBlocks of documentUnits) {
      if (unitBlocks.length === 1 && unitBlocks[0].type === 'page-break') {
          pushPage();
          continue;
      }
      const freeBlocks = unitBlocks.filter(block => !block.sectionId && block.type !== 'page-break');
      const unit = unitBlocks.map(block => block.sectionId ? sectionsById.get(block.sectionId) : undefined)
        .filter((section): section is DesignerSection => !!section && section.questions.length > 0);
      const freeHeight = Math.max(0, ...freeBlocks.map(block => this.estimateBlockHeight(block)));

      if (!unit.length) {
        const keepTogether = freeBlocks.every(block => block.keepTogether !== false);
        if (keepTogether && freeHeight <= contentCapacityMm && freeHeight > remainingMm
          && (current.blocks.length > 0 || current.sections.length > 0)) {
          pushPage();
        }
        current.blocks.push(...freeBlocks);
        remainingMm = Math.max(0, remainingMm - Math.min(contentCapacityMm, freeHeight));
        continue;
      }
      const offsets = new Map(unit.map(section => [section.id, 0]));
      const completeHeight = Math.max(...unit.map(section => {
        const block = this.blockForSection(section);
        return this.sectionOverhead(section, block)
          + section.questions.reduce((height, question) => height + this.questionRowHeight(block, question), 0);
      }));
      const totalUnitHeight = Math.max(completeHeight, freeHeight);
      const keepTogether = unitBlocks.every(block => block.keepTogether !== false);
      if (keepTogether && totalUnitHeight <= contentCapacityMm && totalUnitHeight > remainingMm) {
        pushPage();
      }
      current.blocks.push(...freeBlocks);
      let firstFragment = true;
      while (unit.some(section => (offsets.get(section.id) || 0) < section.questions.length)) {
        const activeSections = unit.filter(section => (offsets.get(section.id) || 0) < section.questions.length);
        const minimumHeight = Math.max(...activeSections.map(section => {
          const block = this.blockForSection(section);
          const offset = offsets.get(section.id) || 0;
          return this.sectionOverhead(section, block)
            + this.questionRowHeight(block, section.questions[offset]);
        }));
        if (remainingMm < minimumHeight) { pushPage(); }
        let consumedHeight = 0;
        for (const section of activeSections) {
          const block = this.blockForSection(section);
          const overhead = this.sectionOverhead(section, block);
          const offset = offsets.get(section.id) || 0;
          let questionCount = 0;
          let rowsHeight = 0;
          const availableHeight = Math.max(0, remainingMm - overhead);
          while (offset + questionCount < section.questions.length) {
            const nextHeight = this.questionRowHeight(block, section.questions[offset + questionCount]);
            if (questionCount > 0 && rowsHeight + nextHeight > availableHeight) { break; }
            rowsHeight += nextHeight;
            questionCount++;
            if (rowsHeight >= availableHeight) { break; }
          }
          questionCount = Math.max(1, questionCount);
          current.sections.push({
            section,
            questions: section.questions.slice(offset, offset + questionCount),
            continued: offset > 0
          });
          offsets.set(section.id, offset + questionCount);
          consumedHeight = Math.max(consumedHeight, overhead + rowsHeight);
        }
        remainingMm -= Math.max(consumedHeight, firstFragment ? freeHeight : 0);
        firstFragment = false;
        if (unit.some(section => (offsets.get(section.id) || 0) < section.questions.length)) {
          pushPage();
        }
      }
    }
    if (current.sections.length || current.blocks.length || !pages.length) {
      pages.push(current);
    }
    return pages;
  }

  private estimateBlockHeight(block: DesignerBlock): number {
    const spacing = (block.spacingBefore || 0) + (block.spacingAfter || 0);
    if (block.type === 'custom-table') {
      return spacing + 8 + Math.max(1, block.tableRows.length) * Math.max(3, block.rowHeight || 4.7);
    }
    if (block.type === 'image') { return spacing + 55; }
    if (block.type === 'separator') { return spacing + 4; }
    if (block.type === 'text') {
      const lineCount = Math.max(1, block.text.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 85)), 0));
      return spacing + lineCount * 5;
    }
    return spacing + 10;
  }

  private sectionRowHeight(block?: DesignerBlock): number {
    const correctionHeightMm = Math.max(3, this.project.correctionCellHeightCm * 10);
    return Math.max(correctionHeightMm, block?.rowHeight || 4.7);
  }

  private sectionOverhead(section: DesignerSection, block?: DesignerBlock): number {
    const titleAndHeaderHeight = section.showTitle ? 14 : 8;
    return titleAndHeaderHeight + (block?.spacingBefore || 0) + (block?.spacingAfter || 0);
  }

  private questionRowHeight(block: DesignerBlock | undefined, question: DesignerQuestion): number {
    const placement = block ? this.findContainerPlacement(block.id) : undefined;
    const columnCount = placement?.container.childColumns.length || 1;
    const charactersPerLine = Math.max(18, Math.floor(78 / columnCount));
    const visualLineCount = Math.max(1, String(question.answer || '').split('\n')
      .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0));
    const correctionHeight = Math.max(1, question.corrections.length) * this.project.correctionCellHeightCm * 10;
    return Math.max(this.sectionRowHeight(block), visualLineCount * 4.2 + 1.1, correctionHeight);
  }

  private documentBlockUnits(blocks: DesignerBlock[]): DesignerBlock[][] {
    const units: DesignerBlock[][] = [];
    for (const block of blocks) {
      if (block.type !== 'columns') {
        units.push([block]);
        continue;
      }
      const rowCount = Math.max(0, ...block.childColumns.map(column => column.length));
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const row = block.childColumns
          .map(column => column[rowIndex])
          .filter((child): child is DesignerBlock => !!child);
        if (row.length) { units.push(row); }
      }
    }
    return units;
  }
}
