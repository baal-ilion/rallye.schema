import { AfterViewChecked, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { firstValueFrom, forkJoin, switchMap } from 'rxjs';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DesignerBlock, DesignerBlockType, DesignerCorrection, DesignerQuestion, DesignerSection, DesignerStage, FORM_PROJECT_SCHEMA_VERSION,
  FormProject } from './form-project.model';
import { FormDesignerApiService, FormDesignDto, GeneratedRecognitionPageDto, QuestionParamDto, QuestionPointParamDto,
  RallyParamDto, StageParamDto } from './form-designer-api.service';

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

interface CellPosition { gridId: string; row: number; column: number; id: string; }

@Component({
  selector: 'app-form-designer',
  templateUrl: './form-designer.component.html',
  styleUrls: ['./form-designer.component.scss']
})
export class FormDesignerComponent implements OnInit, AfterViewChecked {
  readonly identificationBlockId = '__fixed_form_identification__';
  readonly titleBlockId = '__fixed_form_title__';

  project: FormProject = this.makeProject();
  activeStageId = this.project.stages[0].id;
  correctedPreview = true;
  importError = '';
  syncState: 'loading' | 'ready' | 'modified' | 'saving' | 'saved' | 'error' = 'loading';
  syncMessage = 'Chargement de la configuration partagée…';
  pages: DesignerPage[] = [{ number: 1, sections: [], blocks: [] }];
  ribbonTab: 'home' | 'insert' | 'layout' = 'home';
  selectedBlockId = '';
  zoom = 85;
  showCellColorPalette = false;
  showTextColorPalette = false;
  pdfExporting = false;
  readonly selectedCellIds = new Set<string>();
  private cellSelectionAnchor?: CellPosition;
  private draggingCellSelection = false;
  readonly themeColorColumns = [
    ['#ffffff', '#f2f2f2', '#d9d9d9', '#bfbfbf', '#a6a6a6', '#7f7f7f'],
    ['#000000', '#7f7f7f', '#595959', '#3f3f3f', '#262626', '#0d0d0d'],
    ['#44546a', '#d6dce4', '#adb9ca', '#8497b0', '#5b6f8d', '#323f4f'],
    ['#4472c4', '#d9e2f3', '#b4c6e7', '#8eaadb', '#2f5597', '#203864'],
    ['#ed7d31', '#fce4d6', '#f8cbad', '#f4b183', '#c65911', '#843c0c'],
    ['#a5a5a5', '#ededed', '#dbdbdb', '#c9c9c9', '#7b7b7b', '#525252'],
    ['#ffc000', '#fff2cc', '#ffe699', '#ffd966', '#bf9000', '#806000'],
    ['#5b9bd5', '#ddebf7', '#bdd7ee', '#9dc3e6', '#2e75b6', '#1f4e78'],
    ['#70ad47', '#e2f0d9', '#c6e0b4', '#a9d18e', '#548235', '#375623'],
    ['#264478', '#d9e1f2', '#b4c6e7', '#8faadc', '#203864', '#172b4d']
  ];
  readonly standardColors = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];
  readonly fontFamilies = ['Arial', 'Calibri', 'Cambria', 'Georgia', 'Tahoma', 'Times New Roman', 'Verdana'];
  readonly fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36'];
  readonly identificationDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  private richTextEditor: HTMLElement | null = null;
  private richTextRange: Range | null = null;
  private activeTextEditingCellId = '';
  private titleWidthCache?: { text: string; showLogo: boolean; widthMm: number };
  private rallyParam?: RallyParamDto;
  private readonly stageParams = new Map<string, StageParamDto>();
  private readonly publishedDesignerLabels = new Map<string, Set<string>>();
  readonly blockCatalog: Array<{ type: DesignerBlockType; label: string; icon: string }> = [
    { type: 'section', label: 'Section de réponses', icon: '▦' },
    { type: 'custom-table', label: 'Tableau', icon: '▤' },
    { type: 'text', label: 'Texte', icon: 'T' },
    { type: 'image', label: 'Image', icon: '▧' },
    { type: 'columns', label: 'Conteneur colonnes', icon: '▥' },
    { type: 'separator', label: 'Séparateur', icon: '―' },
    { type: 'page-break', label: 'Saut de page', icon: '↵' }
  ];

  constructor(private readonly api: FormDesignerApiService, private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadSharedConfiguration();
  }

  ngAfterViewChecked(): void {
    document.querySelectorAll<HTMLElement>('.correction-groups').forEach(group => {
      const cellsHeight = Array.from(group.querySelectorAll<HTMLElement>(':scope > .correction-cells'))
        .reduce((height, cells) => height + cells.getBoundingClientRect().height, 0);
      const hasSpaceBelow = group.getBoundingClientRect().height > cellsHeight + 0.5;
      group.classList.toggle('ends-before-row', hasSpaceBelow);
    });
  }

  get activeStage(): DesignerStage {
    return this.project.stages.find(stage => stage.id === this.activeStageId) || this.project.stages[0];
  }

  get isIdentificationBlockSelected(): boolean { return this.selectedBlockId === this.identificationBlockId; }
  get isTitleBlockSelected(): boolean { return this.selectedBlockId === this.titleBlockId; }
  get isFixedHeaderBlockSelected(): boolean {
    return this.isIdentificationBlockSelected || this.isTitleBlockSelected;
  }

  selectFixedHeaderBlock(blockId: string): void {
    this.selectedBlockId = blockId;
    this.clearCellSelection();
  }

  get pageChoices(): number[] {
    return [1, 2, 3, 4];
  }

  get stageTitleWidthMm(): number {
    const titleHtml = String(this.activeStage.headerTitle || '');
    const text = this.plainText(titleHtml).trim().toUpperCase();
    if (!text) { return 20; }
    if (this.titleWidthCache?.text === titleHtml && this.titleWidthCache.showLogo === this.project.showLogo) {
      return this.titleWidthCache.widthMm;
    }
    const pixelsPerMm = 96 / 25.4;
    const maximumWidthPx = (this.project.showLogo ? 150 : 170) * pixelsPerMm;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) { return this.project.showLogo ? 150 : 170; }
    const titleContainer = document.createElement('div');
    titleContainer.innerHTML = titleHtml;
    const pointSizes = [8, 10, 12, 14, 18, 24, 36];
    let fontSizePx = 5.8 * pixelsPerMm;
    titleContainer.querySelectorAll('font[size]').forEach(font => {
      const size = Math.max(1, Math.min(7, Number(font.getAttribute('size')) || 3));
      fontSizePx = Math.max(fontSizePx, pointSizes[size - 1] * 96 / 72);
    });
    context.font = `700 ${fontSizePx}px Arial`;
    const words = text.split(/\s+/);
    const spaceWidth = context.measureText(' ').width;
    const wordWidths = words.map(word => context.measureText(word).width);
    const lineCount = (width: number): number => {
      let lines = 1;
      let currentWidth = 0;
      wordWidths.forEach(wordWidth => {
        const nextWidth = currentWidth ? currentWidth + spaceWidth + wordWidth : wordWidth;
        if (currentWidth && nextWidth > width) {
          lines++;
          currentWidth = wordWidth;
        } else {
          currentWidth = nextWidth;
        }
      });
      return lines;
    };
    const targetLineCount = lineCount(maximumWidthPx);
    let minimum = Math.min(maximumWidthPx, Math.max(...wordWidths));
    let maximum = maximumWidthPx;
    for (let iteration = 0; iteration < 14; iteration++) {
      const candidate = (minimum + maximum) / 2;
      if (lineCount(candidate) <= targetLineCount) { maximum = candidate; } else { minimum = candidate; }
    }
    const widthMm = Math.min(maximumWidthPx, Math.ceil(maximum + 1)) / pixelsPerMm;
    this.titleWidthCache = { text: titleHtml, showLogo: this.project.showLogo, widthMm };
    return widthMm;
  }

  get titleBlockHeightMm(): number {
    const textHeight = this.richTextHeightMm(this.activeStage.headerTitle || '', 45) + 3;
    return Math.max(this.project.showLogo ? 21 : 18, textHeight);
  }

  isStageDigitMarked(position: 0 | 1, digit: number): boolean {
    const stageNumber = Math.max(0, Math.min(99, Math.trunc(Number(this.activeStage.number) || 0)));
    return Number(String(stageNumber).padStart(2, '0')[position]) === digit;
  }

  get sections(): DesignerSection[] { return this.activeStage?.sections || []; }
  get rallyTitle(): string { return this.project.rallyTitle; }
  get rallyFooterText(): string {
    let date = '';
    if (this.project.rallyDate) {
      const [year, month, day] = this.project.rallyDate.split('-');
      date = year && month && day ? `${day}/${month}/${year}` : this.project.rallyDate;
    }
    return [date, this.rallyTitle].filter(Boolean).join(' - ');
  }
  get correctionGroupWidth(): string {
    return `${(this.project.correctionCellWidthCm * 3).toFixed(2)}cm`;
  }

  supportsBlockSpacing(type: DesignerBlockType): boolean {
    return ['section', 'custom-table', 'text', 'image', 'separator'].includes(type);
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
  get canRemoveSelectedTableRow(): boolean {
    if (this.selectedSection) { return this.selectedSection.questions.length > 1; }
    return !!this.selectedBlock && this.selectedBlock.type === 'custom-table'
      && this.selectedBlock.tableRows.length > 1;
  }

  changeSelectedTableRows(delta: 1 | -1): void {
    if (this.selectedSection) {
      const selectedIndex = this.selectedSectionRowIndex(this.selectedSection);
      if (delta > 0) {
        const insertionIndex = selectedIndex >= 0 ? selectedIndex + 1 : this.selectedSection.questions.length;
        const question = this.makeQuestion(insertionIndex + 1);
        this.selectedSection.questions.splice(insertionIndex, 0, question);
        this.applyNumbering();
        this.selectSingleCell(`section-${this.selectedSection.id}`, insertionIndex + 2, 0,
          `question-${question.id}-0`);
      } else if (this.selectedSection.questions.length > 1) {
        const removalIndex = selectedIndex >= 0 ? selectedIndex : this.selectedSection.questions.length - 1;
        this.selectedSection.questions.splice(removalIndex, 1);
        this.applyNumbering();
        this.clearCellSelection();
      }
      this.questionEdited();
      return;
    }
    this.changeRows(delta);
    this.questionEdited();
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
      ...section.questions.map(question => this.plainText(question.number).length)), 2);
    return `calc(${maxLength}ch + 5mm)`;
  }

  newProject(): void {
    if (!confirm('Recharger la configuration partagée ? Les modifications non enregistrées seront perdues.')) {
      return;
    }
    this.loadSharedConfiguration();
  }

  addStage(): void {
    const onlyDraft = this.stageParams.size === 0 && this.project.stages.length === 1;
    const nextNumber = Math.max(0, ...this.project.stages.map(stage => stage.number)) + 1;
    const number = onlyDraft ? this.activeStage.number : nextNumber;
    this.setSyncState('saving', 'Création de l’épreuve…');
    this.api.createStage({ ...this.emptyStageParam(number), name: onlyDraft ? this.activeStage.name : 'Nouvelle épreuve' }).subscribe({
      next: value => {
        const stage = this.makeStageFromParam(value);
        this.stageParams.set(stage.id, value);
        if (onlyDraft) { this.project.stages[0] = stage; }
        else { this.project.stages.push(stage); }
        this.selectStage(stage.id);
        this.setSyncState('saved', 'Épreuve créée dans la configuration partagée.');
      },
      error: error => this.handleSyncError(error, 'Impossible de créer l’épreuve.')
    });
  }

  selectStage(id: string): void {
    this.activeStageId = id;
    this.importError = '';
    this.refreshPages();
    this.selectedBlockId = this.blocks[0]?.id || '';
    if (!this.stageParams.has(id)) { return; }
    this.api.getStage(id).subscribe({
      next: stageParam => {
        this.stageParams.set(id, stageParam);
        if (this.activeStageId !== id) { return; }
        this.hydrateDesignerPoints(this.activeStage, stageParam);
        this.refreshPages();
        this.setSyncState('ready', 'Épreuve et barèmes actualisés depuis la configuration partagée.');
      },
      error: error => this.handleSyncError(error, 'Impossible d’actualiser les paramètres de l’épreuve.')
    });
  }

  deleteActiveStage(): void {
    if (!confirm(`Supprimer l'épreuve « ${this.activeStage.name} », son formulaire et toutes ses données associées ?`)) {
      return;
    }
    const stageId = this.activeStage.id;
    if (!this.stageParams.has(stageId)) {
      this.project.stages[0] = this.makeStage(1);
      this.activeStageId = this.project.stages[0].id;
      this.setSyncState('ready', 'Aucune épreuve enregistrée.');
      this.refreshPages();
      return;
    }
    const index = this.project.stages.findIndex(stage => stage.id === stageId);
    this.setSyncState('saving', 'Suppression de l’épreuve…');
    this.api.deleteStage(stageId).subscribe({
      next: () => {
        this.project.stages.splice(index, 1);
        this.stageParams.delete(stageId);
        if (!this.project.stages.length) { this.project.stages.push(this.makeStage(1)); }
        this.selectStage(this.project.stages[Math.max(0, index - 1)].id);
        this.setSyncState('saved', this.stageParams.size
          ? 'Épreuve et formulaire associé supprimés.'
          : 'Toutes les épreuves sont supprimées. Une nouvelle épreuve peut être créée.');
      },
      error: error => this.handleSyncError(error, 'Impossible de supprimer l’épreuve.')
    });
  }

  saveProject(): void {
    this.saveAll();
  }

  saveActiveStage(): void {
    this.saveStages([this.activeStage]);
  }

  createActiveForm(): void {
    if (this.activeStage.hasFormDesign) { return; }
    this.activeStage.hasFormDesign = true;
    this.activeStage.headerTitle = this.activeStage.name;
    this.questionEdited();
    this.saveActiveStage();
  }

  deleteActiveForm(): void {
    const stage = this.activeStage;
    if (!stage.hasFormDesign || !confirm(`Supprimer le formulaire de « ${stage.name} » ? L’épreuve sera conservée.`)) {
      return;
    }
    this.setSyncState('saving', 'Suppression du formulaire…');
    this.api.deleteRecognitionPages(stage.number).pipe(
      switchMap(() => this.api.deleteFormDesign(stage.id))
    ).subscribe({
      next: () => {
        stage.hasFormDesign = false;
        stage.formDesignVersion = undefined;
        stage.sections = [];
        stage.blocks = [];
        this.selectedBlockId = '';
        this.refreshPages();
        this.setSyncState('saved', 'Formulaire supprimé. L’épreuve est conservée.');
      },
      error: error => this.handleSyncError(error, 'Impossible de supprimer le formulaire.')
    });
  }

  private loadSharedConfiguration(): void {
    this.setSyncState('loading', 'Chargement de la configuration partagée…');
    forkJoin({
      rally: this.api.getRally(),
      stages: this.api.getStages(),
      designs: this.api.getFormDesigns()
    }).subscribe({
      next: ({ rally, stages, designs }) => {
        this.rallyParam = rally;
        this.stageParams.clear();
        this.publishedDesignerLabels.clear();
        const stageParams = this.api.stageItems(stages)
          .sort((left, right) => left.stage - right.stage);
        const designsByStage = new Map(designs.map(design => [design.stageParamId, design]));
        const designerStages = stageParams.map(stageParam => {
          if (stageParam.id) { this.stageParams.set(stageParam.id, stageParam); }
          const design = designsByStage.get(stageParam.id);
          if (stageParam.id) {
            this.publishedDesignerLabels.set(stageParam.id,
              new Set(design ? this.designerCorrectionEntries(design.content).map(entry => entry.label) : []));
          }
          return this.stageFromSharedData(stageParam, design);
        });
        const draft = this.makeStage(1);
        this.project = {
          kind: 'rallye-form-project',
          schemaVersion: FORM_PROJECT_SCHEMA_VERSION,
          id: rally.id,
          name: rally.name,
          rallyTitle: rally.title,
          rallyDate: rally.date,
          showLogo: rally.showLogo,
          logoUrl: rally.logoUrl || 'assets/logo-rallye.png',
          titleSpacingBeforeMm: rally.titleSpacingBeforeMm,
          titleSpacingAfterMm: rally.titleSpacingAfterMm,
          correctionCellWidthCm: rally.correctionCellWidthCm,
          correctionCellHeightCm: rally.correctionCellHeightCm,
          stages: designerStages.length ? designerStages : [draft]
        };
        this.activeStageId = this.project.stages[0].id;
        this.selectedBlockId = this.blocks[0]?.id || '';
        this.importError = '';
        this.refreshPages();
        this.setSyncState('ready', designerStages.length
          ? 'Configuration partagée chargée.'
          : 'Aucune épreuve : la première sera créée lors de l’enregistrement.');
      },
      error: error => this.handleSyncError(error,
        'Le designer ne peut pas charger la configuration du back.')
    });
  }

  private async saveAll(): Promise<void> {
    this.setSyncState('saving', 'Enregistrement de tout le projet…');
    try {
      this.validateDesignerQuestions(this.project.stages);
      await this.saveRally();
      await this.persistStages(this.project.stages);
      await this.publishActiveRecognition();
      this.setSyncState('saved', 'Projet enregistré dans la configuration partagée.');
    } catch (error) {
      this.handleSyncError(error, 'Impossible d’enregistrer tout le projet.');
    }
  }

  private async saveStages(stages: DesignerStage[]): Promise<void> {
    this.setSyncState('saving', stages.length === 1 ? 'Enregistrement de l’épreuve…' : 'Enregistrement des épreuves…');
    try {
      this.validateDesignerQuestions(stages);
      await this.saveRally();
      await this.persistStages(stages);
      if (stages.some(stage => stage.id === this.activeStage.id)) { await this.publishActiveRecognition(); }
      this.setSyncState('saved', stages.length === 1 ? 'Épreuve enregistrée.' : 'Épreuves enregistrées.');
    } catch (error) {
      this.handleSyncError(error, 'Impossible d’enregistrer la configuration.');
    }
  }

  private async saveRally(): Promise<void> {
    const current = this.rallyParam || {
      id: 'rally', name: '', title: '', date: '', showLogo: true, logoUrl: '',
      titleSpacingBeforeMm: 0, titleSpacingAfterMm: 0,
      correctionCellWidthCm: 0.53, correctionCellHeightCm: 0.53
    };
    this.rallyParam = await firstValueFrom(this.api.saveRally({
      ...current,
      name: this.project.name,
      title: this.project.rallyTitle,
      date: this.project.rallyDate,
      showLogo: this.project.showLogo,
      logoUrl: this.project.logoUrl,
      titleSpacingBeforeMm: this.project.titleSpacingBeforeMm,
      titleSpacingAfterMm: this.project.titleSpacingAfterMm,
      correctionCellWidthCm: this.project.correctionCellWidthCm,
      correctionCellHeightCm: this.project.correctionCellHeightCm
    }));
  }

  private async persistStages(stages: DesignerStage[]): Promise<void> {
    for (const stage of stages) {
      let stageParam = this.stageParams.get(stage.id);
      const payload: StageParamDto = {
        ...(stageParam || this.emptyStageParam(stage.number)),
        id: stageParam?.id,
        stage: stage.number,
        name: stage.name
      };
      this.applyDesignerQuestions(payload, stage);
      delete payload._links;
      const savedStage = stageParam
        ? await firstValueFrom(this.api.updateStage(payload))
        : await firstValueFrom(this.api.createStage(payload));
      if (!savedStage.id) { throw new Error('Le back n’a pas retourné l’identifiant de l’épreuve.'); }
      if (savedStage.id !== stage.id) {
        const oldId = stage.id;
        stage.id = savedStage.id;
        if (this.activeStageId === oldId) { this.activeStageId = savedStage.id; }
      }
      this.stageParams.set(savedStage.id, savedStage);
      stageParam = savedStage;
      if (stage.hasFormDesign) {
        const content = this.clone(stage);
        content.formDesignVersion = undefined;
        const savedDesign = await firstValueFrom(this.api.saveFormDesign(savedStage.id, {
          version: stage.formDesignVersion,
          stageParamId: savedStage.id,
          schemaVersion: FORM_PROJECT_SCHEMA_VERSION,
          content
        }));
        stage.formDesignVersion = savedDesign.version;
        this.publishedDesignerLabels.set(savedStage.id,
          new Set(this.designerCorrectionEntries(stage).map(entry => entry.label)));
      }
    }
  }

  private stageFromSharedData(stageParam: StageParamDto, design?: FormDesignDto): DesignerStage {
    const stage = design?.content ? this.clone(design.content) : this.makeStageFromParam(stageParam);
    stage.id = stageParam.id || stage.id;
    stage.number = stageParam.stage;
    stage.name = stageParam.name;
    stage.headerTitle ||= stageParam.name;
    stage.sections ||= [];
    stage.blocks ||= [];
    stage.hasFormDesign = !!design;
    stage.formDesignVersion = design?.version;
    if (design) { this.hydrateDesignerPoints(stage, stageParam); }
    return stage;
  }

  private makeStageFromParam(stageParam: StageParamDto): DesignerStage {
    const stage = this.makeStage(stageParam.stage);
    stage.id = stageParam.id || stage.id;
    stage.name = stageParam.name;
    stage.headerTitle = stageParam.name;
    stage.hasFormDesign = false;
    return stage;
  }

  private emptyStageParam(number: number): StageParamDto {
    return {
      stage: number,
      name: 'Nouvelle épreuve',
      questionPointParams: {},
      performancePointParams: {},
      questionParams: {}
    };
  }

  private designerCorrectionEntries(stage: DesignerStage): Array<{ label: string; points: number }> {
    return (stage.sections || []).flatMap(section => section.questions.flatMap(question =>
      question.corrections.map(correction => ({
        label: this.plainText(correction.label || '').trim(),
        points: Number(correction.points)
      }))));
  }

  private validateDesignerQuestions(stages: DesignerStage[]): void {
    for (const stage of stages.filter(item => item.hasFormDesign)) {
      const entries = this.designerCorrectionEntries(stage);
      const empty = entries.find(entry => !entry.label);
      if (empty) {
        throw new Error(`L’épreuve « ${stage.name} » contient un bloc de correction sans label.`);
      }
      const labels = new Map<string, string>();
      for (const entry of entries) {
        const normalized = entry.label.toLocaleLowerCase('fr-FR');
        if (labels.has(normalized)) {
          throw new Error(`Le label « ${entry.label} » est utilisé plusieurs fois dans l’épreuve « ${stage.name} ».`);
        }
        labels.set(normalized, entry.label);
        if (!Number.isFinite(entry.points) || !Number.isInteger(entry.points)) {
          throw new Error(`Le nombre de points du label « ${entry.label} » doit être un nombre entier.`);
        }
      }
      const stageParam = this.stageParams.get(stage.id);
      for (const entry of entries) {
        if (stageParam?.questionParams?.[entry.label]?.type === 'PERFORMANCE') {
          throw new Error(`Le label « ${entry.label} » est déjà utilisé par une performance dans l’épreuve « ${stage.name} ».`);
        }
      }
    }
  }

  private applyDesignerQuestions(stageParam: StageParamDto, stage: DesignerStage): void {
    if (!stage.hasFormDesign) { return; }
    const questionParams: Record<string, QuestionParamDto> = { ...(stageParam.questionParams || {}) };
    const pointParams: Record<string, QuestionPointParamDto> = { ...(stageParam.questionPointParams || {}) };
    const currentEntries = this.designerCorrectionEntries(stage);
    const currentLabels = new Set(currentEntries.map(entry => entry.label));
    for (const previousLabel of this.publishedDesignerLabels.get(stage.id) || []) {
      if (!currentLabels.has(previousLabel)) {
        questionParams[previousLabel] = { name: previousLabel };
        pointParams[previousLabel] = { name: previousLabel, point: null };
      }
    }
    for (const entry of currentEntries) {
      const existing = questionParams[entry.label];
      questionParams[entry.label] = {
        name: entry.label,
        type: 'QUESTION',
        managedByOrganizer: existing?.managedByOrganizer ?? false
      };
      pointParams[entry.label] = { name: entry.label, point: entry.points };
    }
    stageParam.questionParams = questionParams;
    stageParam.questionPointParams = pointParams;
  }

  private hydrateDesignerPoints(stage: DesignerStage, stageParam: StageParamDto): void {
    for (const section of stage.sections || []) {
      for (const question of section.questions) {
        for (const correction of question.corrections) {
          const label = this.plainText(correction.label || '').trim();
          const sharedPoint = stageParam.questionPointParams?.[label]?.point;
          if (sharedPoint !== undefined && sharedPoint !== null) { correction.points = sharedPoint; }
        }
      }
    }
  }

  private async publishActiveRecognition(): Promise<void> {
    if (!this.activeStage.hasFormDesign) { return; }
    const previousPreview = this.correctedPreview;
    const previousZoom = this.zoom;
    const previousSelectedBlockId = this.selectedBlockId;
    const previousSelectedCellIds = [...this.selectedCellIds];
    this.correctedPreview = false;
    // Le zoom ne concerne que l'aperçu. html2canvas ignore la transformation
    // du conteneur pour l'image, tandis que getBoundingClientRect peut encore
    // la refléter pour les coordonnées. Publier à 100 % garantit un référentiel
    // unique entre le PNG et le template FormScanner.
    this.zoom = 100;
    this.selectedBlockId = '';
    this.selectedCellIds.clear();
    if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }

    // Le contenu éditable peut conserver son ancien DOM alors que le modèle a
    // déjà été mis à jour et sauvegardé. Détruire puis reconstruire les pages
    // garantit que le PNG et le template sont produits depuis le modèle courant.
    this.pages = [];
    this.changeDetector.detectChanges();
    this.refreshPages();
    this.changeDetector.detectChanges();
    await this.nextPaint();
    try {
      const paperElements = Array.from(document.querySelectorAll<HTMLElement>('.pages .paper'));
      if (!paperElements.length) { throw new Error('Aucune page A4 à publier.'); }

      const expectedLabels = this.designerCorrectionEntries(this.activeStage)
        .map(entry => entry.label).sort((left, right) => left.localeCompare(right, 'fr'));
      const renderedLabels = paperElements.flatMap(paper =>
        Array.from(paper.querySelectorAll<HTMLElement>('.correction-cells'))
          .map(group => group.getAttribute('title') || '').filter(Boolean))
        .sort((left, right) => left.localeCompare(right, 'fr'));
      if (expectedLabels.length !== renderedLabels.length
        || expectedLabels.some((label, index) => label !== renderedLabels[index])) {
        throw new Error('La prévisualisation du formulaire n’est pas à jour. La publication a été interrompue pour éviter de conserver un ancien formulaire.');
      }
      const generatedPages: GeneratedRecognitionPageDto[] = [];
      for (let index = 0; index < paperElements.length; index++) {
        generatedPages.push(await this.generateRecognitionPage(paperElements[index], index + 1, false));
      }
      await firstValueFrom(this.api.publishRecognitionPages(this.activeStage.number, generatedPages));
      await firstValueFrom(this.api.publishReferenceRecognition(
        await this.generateRecognitionPage(paperElements[0], undefined, true)));
    } finally {
      this.correctedPreview = previousPreview;
      this.zoom = previousZoom;
      this.selectedBlockId = previousSelectedBlockId;
      previousSelectedCellIds.forEach(id => this.selectedCellIds.add(id));
      this.changeDetector.detectChanges();
    }
  }

  private async generateRecognitionPage(paper: HTMLElement, page: number | undefined,
      referenceOnly: boolean): Promise<GeneratedRecognitionPageDto> {
    // Les modèles historiques produits par FormScanner font 2481 × 3508 px.
    // Conserver cette résolution garantit que les coordonnées et la taille des
    // marqueurs ont la même échelle que les formulaires déjà reconnus par le back.
    const targetWidth = 2481;
    const targetHeight = 3508;
    const captureScale = targetWidth / paper.offsetWidth;
    const paperRect = paper.getBoundingClientRect();
    const capturedCanvas = await html2canvas(paper, {
      scale: captureScale, backgroundColor: '#ffffff', useCORS: true, logging: false,
      width: paper.offsetWidth, height: paper.offsetHeight
    });
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) { throw new Error('Impossible de préparer le modèle FormScanner.'); }
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(capturedCanvas, 0, 0, targetWidth, targetHeight);
    return {
      param: {
        stage: referenceOnly ? undefined : this.activeStage.number,
        page: referenceOnly ? undefined : page,
        template: this.buildRecognitionTemplate(paper, {
          x: targetWidth / paperRect.width,
          y: targetHeight / paperRect.height
        }, referenceOnly),
        questions: {}
      },
      modelBase64: canvas.toDataURL('image/png').split(',')[1],
      modelFileType: 'image/png',
      modelFileExtension: 'png'
    };
  }

  private async capturePaperPng(paper: HTMLElement, targetWidth = 2481, targetHeight = 3508): Promise<string> {
    const capturedCanvas = await html2canvas(paper, {
      scale: targetWidth / paper.offsetWidth, backgroundColor: '#ffffff', useCORS: true, logging: false,
      width: paper.offsetWidth, height: paper.offsetHeight
    });
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) { throw new Error('Impossible de préparer la page A4.'); }
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(capturedCanvas, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/png');
  }

  private buildRecognitionTemplate(paper: HTMLElement, scale: { x: number; y: number },
      referenceOnly: boolean): string {
    const paperRect = paper.getBoundingClientRect();
    const point = (element: Element): { x: number; y: number } => {
      const rect = element.getBoundingClientRect();
      return { x: ((rect.left + rect.width / 2) - paperRect.left) * scale.x,
        y: ((rect.top + rect.height / 2) - paperRect.top) * scale.y };
    };
    const cornerEntries = [
      ['TOP_LEFT', '.corner.top-left'], ['TOP_RIGHT', '.corner.top-right'],
      ['BOTTOM_RIGHT', '.corner.bottom-right'], ['BOTTOM_LEFT', '.corner.bottom-left']
    ].map(([position, selector]) => ({ position, point: point(paper.querySelector(selector) as Element) }));
    const identification = new Map<string, Array<{ response: string; x: number; y: number }>>();
    paper.querySelectorAll<HTMLElement>('.mark-box[data-field][data-value]').forEach(box => {
      const name = box.dataset['field'] || '';
      const values = identification.get(name) || [];
      values.push({ response: box.dataset['value'] || '', ...point(box) });
      identification.set(name, values);
    });
    const corrections = new Map<string, Array<{ response: string; x: number; y: number }>>();
    if (!referenceOnly) {
      paper.querySelectorAll<HTMLElement>('.correction-cells').forEach(group => {
        const name = group.getAttribute('title') || '';
        if (!name) { return; }
        const values = corrections.get(name) || [];
        group.querySelectorAll<HTMLElement>('span[aria-label]').forEach(box => {
          values.push({ response: box.getAttribute('aria-label') || '', ...point(box) });
        });
        corrections.set(name, values);
      });
    }
    // Valeur native de FormScanner utilisée par tous les anciens templates.
    // Il s'agit de la zone de détection autour du centre, pas de la dimension
    // graphique complète de la cellule imprimée.
    const fieldSize = 15;
    const xmlQuestions = (fields: Map<string, Array<{ response: string; x: number; y: number }>>) =>
      Array.from(fields.entries()).map(([name, values]) => {
        const correction = ['O', 'N', 'Y'].includes(values[0]?.response);
        return `            <question multiple="${correction}" question="${this.xmlEscape(name)}" rejectMultiple="${!correction}" type="QUESTIONS_BY_ROWS">\n                <values>\n${values.map(value => `                    <value response="${this.xmlEscape(value.response)}"><point x="${value.x.toFixed(1)}" y="${value.y.toFixed(1)}"/></value>`).join('\n')}\n                </values>\n            </question>`;
      }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<template density="40" threshold="127" version="2.1">
    <crop bottom="0" left="0" right="0" top="0"/>
    <rotation angle="0.0"/>
    <corners type="ROUND">
${cornerEntries.map(entry => `        <corner position="${entry.position}"><point x="${entry.point.x.toFixed(1)}" y="${entry.point.y.toFixed(1)}"/></corner>`).join('\n')}
    </corners>
    <fields groups="true" shape="SQUARE" size="${fieldSize}">
        <group name="Identification">
${xmlQuestions(identification)}
        </group>
${referenceOnly ? '' : `        <group name="Questions">\n${xmlQuestions(corrections)}\n        </group>`}
    </fields>
</template>`;
  }

  private xmlEscape(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  private nextPaint(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }

  private setSyncState(state: FormDesignerComponent['syncState'], message: string): void {
    this.syncState = state;
    this.syncMessage = message;
  }

  private handleSyncError(error: unknown, fallback: string): void {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0;
    this.setSyncState('error', status === 409
      ? 'La configuration a été modifiée ailleurs. Rechargez-la avant de recommencer.'
      : error instanceof Error && !status ? error.message : fallback);
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
      this.activeStage.hasFormDesign = true;
      this.activeStage.sections = sections;
      this.activeStage.blocks = sections.map(section => {
        const block = this.makeBlock('section', section.title, section.id);
        block.color = section.color;
        return block;
      });
      this.selectedBlockId = this.activeStage.blocks[0]?.id || '';
      this.questionEdited();
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
      headerLabels: ['N°', 'Réponse', 'Corrigé'],
      headerColors: ['#d9eaf2', '#d9eaf2', '#d9eaf2'],
      questions: [this.makeQuestion(1)]
    });
    this.blocks.push(this.makeBlock('section', `Section ${index}`, this.sections[this.sections.length - 1].id));
    this.questionEdited();
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
        headerLabels: ['N°', 'Réponse', 'Corrigé'],
        headerColors: [block.color, block.color, block.color],
        questions: [this.makeQuestion(1)]
      };
      block.sectionId = section.id;
      this.sections.push(section);
      this.synchronizeSectionOrder();
    }
    this.refreshPages();
  }

  selectBlock(id: string): void { this.selectedBlockId = id; }

  startCellSelection(event: MouseEvent, gridId: string, row: number, column: number, cellId: string): void {
    if ((event.target as Element | null)?.closest('[contenteditable="true"]')) { return; }
    event.stopPropagation();
    if (event.button !== 0) { return; }
    this.activeTextEditingCellId = '';
    const cell = { gridId, row, column, id: cellId };
    if (event.shiftKey && this.cellSelectionAnchor?.gridId === gridId) {
      this.selectCellRange(this.cellSelectionAnchor, cell, event.ctrlKey || event.metaKey);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      this.selectedCellIds.has(cellId) ? this.selectedCellIds.delete(cellId) : this.selectedCellIds.add(cellId);
      this.cellSelectionAnchor = cell;
      return;
    }
    this.selectedCellIds.clear();
    this.selectedCellIds.add(cellId);
    this.cellSelectionAnchor = cell;
    this.draggingCellSelection = true;
  }

  extendCellSelection(event: MouseEvent, gridId: string, row: number, column: number, cellId: string): void {
    if (!this.draggingCellSelection || event.buttons !== 1 || this.cellSelectionAnchor?.gridId !== gridId) { return; }
    event.stopPropagation();
    this.selectCellRange(this.cellSelectionAnchor, { gridId, row, column, id: cellId }, false);
  }

  endCellSelection(): void { this.draggingCellSelection = false; }

  isCellSelected(cellId: string): boolean { return this.selectedCellIds.has(cellId); }
  isTextEditing(cellId: string): boolean { return this.activeTextEditingCellId === cellId; }

  beginTextEditing(event: MouseEvent, cellId: string): void {
    event.stopPropagation();
    this.activeTextEditingCellId = cellId;
    const editor = event.currentTarget as HTMLElement;
    editor.contentEditable = 'true';
    editor.focus();
  }

  handleRichTextClick(event: MouseEvent, cellId: string): void {
    if (event.detail < 3 || !this.isTextEditing(cellId)) { return; }
    event.preventDefault();
    event.stopPropagation();
    const documentWithCaret = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const range = documentWithCaret.caretRangeFromPoint?.(event.clientX, event.clientY);
    const selection = window.getSelection() as (Selection & {
      modify?: (alter: string, direction: string, granularity: string) => void;
    }) | null;
    if (!range || !selection) { return; }
    selection.removeAllRanges();
    selection.addRange(range);
    selection.modify?.('move', 'backward', 'word');
    selection.modify?.('extend', 'forward', 'word');
    this.rememberRichTextSelection();
  }
  questionCellRow(section: DesignerSection, question: DesignerQuestion): number {
    return section.questions.indexOf(question) + 2;
  }

  trackTableColumn(_: number, column: DesignerBlock['tableColumns'][number]): string { return column.id; }
  trackTableRow(_: number, row: DesignerBlock['tableRows'][number]): string { return row.id; }
  trackIndex(index: number): number { return index; }

  selectAllCellsInSelectedBlock(): void {
    const block = this.selectedBlock;
    if (!block) { return; }
    this.activeTextEditingCellId = '';
    this.selectedCellIds.clear();
    const section = block.sectionId ? this.sections.find(item => item.id === block.sectionId) : undefined;
    if (section) {
      this.cellsInGrid(`section-${section.id}`).forEach(cell => this.selectedCellIds.add(cell.id));
    }
    if (block.type === 'custom-table') {
      this.cellsInGrid(`table-${block.id}`).forEach(cell => this.selectedCellIds.add(cell.id));
    }
  }

  clearCellSelection(): void { this.selectedCellIds.clear(); this.cellSelectionAnchor = undefined; }

  chooseSelectedCellColor(color: string): void {
    this.applySelectedCellColor(color);
    this.showCellColorPalette = false;
  }

  chooseTextColor(color: string): void {
    this.applyFontCommand('foreColor', color);
    this.showTextColorPalette = false;
  }

  private selectCellRange(from: CellPosition, to: CellPosition, preserveSelection: boolean): void {
    if (!preserveSelection) { this.selectedCellIds.clear(); }
    const minRow = Math.min(from.row, to.row), maxRow = Math.max(from.row, to.row);
    const minColumn = Math.min(from.column, to.column), maxColumn = Math.max(from.column, to.column);
    this.cellsInGrid(from.gridId).filter(cell => cell.row >= minRow && cell.row <= maxRow
      && cell.column >= minColumn && cell.column <= maxColumn)
      .forEach(cell => this.selectedCellIds.add(cell.id));
  }

  private cellsInGrid(gridId: string): CellPosition[] {
    const cells: CellPosition[] = [];
    if (gridId.startsWith('section-')) {
      const section = this.sections.find(item => `section-${item.id}` === gridId);
      if (!section) { return cells; }
      if (section.showTitle) { cells.push({ gridId, row: 0, column: 0, id: `section-title-${section.id}` }); }
      section.headerColors.forEach((_, column) => cells.push({ gridId, row: 1, column, id: `section-header-${section.id}-${column}` }));
      section.questions.forEach((question, index) => [0, 1].forEach(column => cells.push({
        gridId, row: index + 2, column, id: `question-${question.id}-${column}`
      })));
    } else if (gridId.startsWith('table-')) {
      const block = this.allBlocks.find(item => `table-${item.id}` === gridId && item.type === 'custom-table');
      if (!block) { return cells; }
      if (block.showTableHeader) { block.tableColumns.forEach((column, index) => cells.push({ gridId, row: 0, column: index, id: `table-header-${column.id}` })); }
      block.tableRows.forEach((row, rowIndex) => row.cells.forEach((_, column) => cells.push({
        gridId, row: rowIndex + 1, column, id: `table-cell-${row.id}-${column}`
      })));
    }
    return cells;
  }

  applySelectedCellColor(color: string): void {
    for (const section of this.sections) {
      if (this.selectedCellIds.has(`section-title-${section.id}`)) { section.color = color; }
      section.headerColors = section.headerColors.map((current, column) =>
        this.selectedCellIds.has(`section-header-${section.id}-${column}`) ? color : current);
      section.questions.forEach(question => {
        if (this.selectedCellIds.has(`question-${question.id}-0`)) { question.numberColor = color; }
        if (this.selectedCellIds.has(`question-${question.id}-1`)) { question.answerColor = color; }
      });
    }
    this.allBlocks.filter(block => block.type === 'custom-table').forEach(block => {
      block.tableColumns.forEach(column => {
        if (this.selectedCellIds.has(`table-header-${column.id}`)) { column.color = color; }
      });
      block.tableRows.forEach(row => {
        row.cellColors = row.cellColors.map((current, column) =>
          this.selectedCellIds.has(`table-cell-${row.id}-${column}`) ? color : current);
      });
    });
  }

  rememberTextEditor(event: FocusEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && target.isContentEditable) {
      if (target.closest('[data-rich-text-context="free"]')) { this.activeTextEditingCellId = '__free_text__'; }
      this.richTextEditor = target;
      this.rememberRichTextSelection();
      return;
    }
  }

  rememberRichTextSelection(): void {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !this.richTextEditor) { return; }
    const range = selection.getRangeAt(0);
    if (this.richTextEditor.contains(range.commonAncestorContainer)) { this.richTextRange = range.cloneRange(); }
  }

  updateRichText(target: any, property: string, event: Event): void {
    const editor = event.currentTarget as HTMLElement;
    const selectionOffsets = this.selectionOffsetsInEditor(editor);
    target[property] = editor.innerHTML;
    this.markModified();
    if (selectionOffsets) { this.scheduleSelectionRestore(editor, selectionOffsets); }
  }

  updateRichTextArray(values: string[], index: number, event: Event): void {
    const editor = event.currentTarget as HTMLElement;
    const selectionOffsets = this.selectionOffsetsInEditor(editor);
    values[index] = editor.innerHTML;
    this.markModified();
    if (selectionOffsets) { this.scheduleSelectionRestore(editor, selectionOffsets); }
  }

  private selectionOffsetsInEditor(editor: HTMLElement): { start: number; end: number } | undefined {
    const selection = window.getSelection();
    if (!selection?.rangeCount) { return undefined; }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) { return undefined; }
    this.richTextEditor = editor;
    this.richTextRange = range.cloneRange();
    return this.captureSelectionOffsets(editor, range);
  }

  handleRichTextBlur(event: FocusEvent): void {
    const editor = event.target;
    if (!(editor instanceof HTMLElement) || !editor.isContentEditable) { return; }
    const next = event.relatedTarget;
    if (next instanceof Element && next.closest('.ribbon')) { return; }
    setTimeout(() => {
      if (document.activeElement?.closest('.ribbon')) { return; }
      this.activeTextEditingCellId = '';
      this.questionEdited();
    });
  }

  applyFontCommand(command: string, value?: string): void {
    if (!this.activeTextEditingCellId && this.selectedCellIds.size) {
      this.applyFontToSelectedCells(command, value);
      return;
    }
    if (!this.richTextEditor || !this.richTextRange) {
      this.importError = 'Sélectionnez des cellules ou du texte dans le document.';
      return;
    }
    this.richTextEditor.focus();
    const selectionOffsets = this.captureSelectionOffsets(this.richTextEditor, this.richTextRange);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(this.richTextRange);
    if (command === 'hiliteColor' && this.removeSelectedHighlight(this.richTextRange)) {
      this.richTextEditor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatRemove' }));
      this.scheduleSelectionRestore(this.richTextEditor, selectionOffsets);
      return;
    }
    document.execCommand(command, false, value);
    if (command === 'hiliteColor') { this.normalizeHighlights(this.richTextEditor); }
    if (['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) {
      this.normalizeAlignments(this.richTextEditor, command);
    }
    this.richTextEditor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' }));
    this.scheduleSelectionRestore(this.richTextEditor, selectionOffsets);
  }

  private captureSelectionOffsets(editor: HTMLElement, range: Range): { start: number; end: number } {
    const beforeStart = range.cloneRange();
    beforeStart.selectNodeContents(editor);
    beforeStart.setEnd(range.startContainer, range.startOffset);
    const beforeEnd = range.cloneRange();
    beforeEnd.selectNodeContents(editor);
    beforeEnd.setEnd(range.endContainer, range.endOffset);
    return { start: beforeStart.toString().length, end: beforeEnd.toString().length };
  }

  private scheduleSelectionRestore(editor: HTMLElement, offsets: { start: number; end: number }): void {
    setTimeout(() => this.restoreSelectionOffsets(editor, offsets));
  }

  private restoreSelectionOffsets(editor: HTMLElement, offsets: { start: number; end: number }): void {
    if (!editor.isConnected) { return; }
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) { nodes.push(node as Text); }
    if (!nodes.length) { return; }
    const boundary = (offset: number): { node: Text; offset: number } => {
      let consumed = 0;
      for (const node of nodes) {
        const length = node.data.length;
        if (offset <= consumed + length) { return { node, offset: Math.max(0, offset - consumed) }; }
        consumed += length;
      }
      const node = nodes[nodes.length - 1];
      return { node, offset: node.data.length };
    };
    const start = boundary(offsets.start);
    const end = boundary(offsets.end);
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();
    this.richTextEditor = editor;
    this.richTextRange = range.cloneRange();
  }

  private normalizeHighlights(editor: HTMLElement): void {
    Array.from(editor.querySelectorAll<HTMLElement>('[style]')).forEach(element => {
      if (!element.style.backgroundColor) { return; }
      const mark = document.createElement('mark');
      mark.append(...Array.from(element.childNodes));
      element.replaceWith(mark);
    });
  }

  private normalizeAlignments(editor: HTMLElement, command: string): void {
    const requestedAlignment = command === 'justifyLeft' ? 'left' : command === 'justifyCenter' ? 'center' : 'right';
    editor.querySelectorAll<HTMLElement>('[style]').forEach(element => {
      if (!element.style.textAlign) { return; }
      element.setAttribute('align', element.style.textAlign);
      element.style.removeProperty('text-align');
      if (!element.getAttribute('style')) { element.removeAttribute('style'); }
    });
    if (editor.style.textAlign) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('align', editor.style.textAlign || requestedAlignment);
      wrapper.append(...Array.from(editor.childNodes));
      editor.append(wrapper);
      editor.style.removeProperty('text-align');
      if (!editor.getAttribute('style')) { editor.removeAttribute('style'); }
    }
  }

  private removeSelectedHighlight(range: Range): boolean {
    const elementFor = (node: Node) => node instanceof Element ? node : node.parentElement;
    const startMark = elementFor(range.startContainer)?.closest('mark');
    const endMark = elementFor(range.endContainer)?.closest('mark');
    if (!startMark || startMark !== endMark) { return false; }
    startMark.replaceWith(...Array.from(startMark.childNodes));
    return true;
  }

  isFontStyleActive(command: string): boolean {
    if (this.activeTextEditingCellId) {
      if (command === 'hiliteColor' && this.richTextRange) {
        const node = this.richTextRange.commonAncestorContainer;
        const element = node instanceof Element ? node : node.parentElement;
        return !!element?.closest('mark');
      }
      return document.queryCommandState(command);
    }
    const tag = this.toggleTagForCommand(command);
    const contents = this.selectedCellContents();
    return !!tag && contents.length > 0 && contents.every(html => this.isEntireCellFormatted(html, tag));
  }

  isAlignmentActive(command: 'justifyLeft' | 'justifyCenter' | 'justifyRight'): boolean {
    if (this.activeTextEditingCellId) { return document.queryCommandState(command); }
    const alignment = command === 'justifyLeft' ? 'left' : command === 'justifyCenter' ? 'center' : 'right';
    const contents = this.selectedCellContents();
    return contents.length > 0 && contents.every(html => {
      const container = document.createElement('div');
      container.innerHTML = html;
      return container.firstElementChild?.getAttribute('align') === alignment;
    });
  }

  private applyFontToSelectedCells(command: string, value?: string): void {
    const toggleTag = this.toggleTagForCommand(command);
    const selectedContents = this.selectedCellContents();
    const removeToggle = !!toggleTag && selectedContents.length > 0
      && selectedContents.every(html => this.isEntireCellFormatted(html, toggleTag));
    const format = (html: string) => {
      if (!toggleTag) { return this.formatWholeCell(html, command, value); }
      if (removeToggle) { return this.removeTag(html, toggleTag); }
      return this.isEntireCellFormatted(html, toggleTag) ? html : this.formatWholeCell(html, command, value);
    };
    for (const section of this.sections) {
      if (this.selectedCellIds.has(`section-title-${section.id}`)) {
        section.title = format(section.title);
        const block = this.blockForSection(section);
        if (block) { block.title = section.title; }
      }
      section.headerLabels = section.headerLabels.map((label, column) =>
        this.selectedCellIds.has(`section-header-${section.id}-${column}`) ? format(label) : label);
      section.questions.forEach(question => {
        if (this.selectedCellIds.has(`question-${question.id}-0`)) { question.number = format(question.number); }
        if (this.selectedCellIds.has(`question-${question.id}-1`)) { question.answer = format(question.answer); }
      });
    }
    this.allBlocks.filter(block => block.type === 'custom-table').forEach(block => {
      block.tableColumns.forEach(column => {
        if (this.selectedCellIds.has(`table-header-${column.id}`)) { column.title = format(column.title); }
      });
      block.tableRows.forEach(row => {
        row.cells = row.cells.map((cell, column) =>
          this.selectedCellIds.has(`table-cell-${row.id}-${column}`) ? format(cell) : cell);
      });
    });
    this.questionEdited();
  }

  private selectedCellContents(): string[] {
    const contents: string[] = [];
    for (const section of this.sections) {
      if (this.selectedCellIds.has(`section-title-${section.id}`)) { contents.push(section.title); }
      section.headerLabels.forEach((label, column) => {
        if (this.selectedCellIds.has(`section-header-${section.id}-${column}`)) { contents.push(label); }
      });
      section.questions.forEach(question => {
        if (this.selectedCellIds.has(`question-${question.id}-0`)) { contents.push(question.number); }
        if (this.selectedCellIds.has(`question-${question.id}-1`)) { contents.push(question.answer); }
      });
    }
    this.allBlocks.filter(block => block.type === 'custom-table').forEach(block => {
      block.tableColumns.forEach(column => {
        if (this.selectedCellIds.has(`table-header-${column.id}`)) { contents.push(column.title); }
      });
      block.tableRows.forEach(row => row.cells.forEach((cell, column) => {
        if (this.selectedCellIds.has(`table-cell-${row.id}-${column}`)) { contents.push(cell); }
      }));
    });
    return contents;
  }

  private toggleTagForCommand(command: string): string | undefined {
    const tags: Record<string, string> = {
      bold: 'b', italic: 'i', underline: 'u', strikeThrough: 's', subscript: 'sub', superscript: 'sup',
      hiliteColor: 'mark'
    };
    return tags[command];
  }

  private isEntireCellFormatted(html: string, tag: string): boolean {
    const container = document.createElement('div');
    container.innerHTML = html;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Node[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.textContent?.trim()) { textNodes.push(node); }
    }
    return textNodes.length > 0 && textNodes.every(node => {
      for (let element = node.parentElement; element && element !== container; element = element.parentElement) {
        if (element.tagName.toLowerCase() === tag) { return true; }
      }
      return false;
    });
  }

  private removeTag(html: string, tag: string): string {
    const container = document.createElement('div');
    container.innerHTML = html;
    Array.from(container.querySelectorAll(tag)).forEach(element => element.replaceWith(...Array.from(element.childNodes)));
    return container.innerHTML;
  }

  displayText(value: string): string { return this.plainText(value); }

  private formatWholeCell(html: string, command: string, value?: string): string {
    if (command === 'removeFormat') { return this.plainText(html); }
    if (command === 'bold') { return `<b>${html}</b>`; }
    if (command === 'italic') { return `<i>${html}</i>`; }
    if (command === 'underline') { return `<u>${html}</u>`; }
    if (command === 'strikeThrough') { return `<s>${html}</s>`; }
    if (command === 'subscript') { return `<sub>${html}</sub>`; }
    if (command === 'superscript') { return `<sup>${html}</sup>`; }
    if (command === 'fontName' && value) { return `<font face="${value.replace(/"/g, '&quot;')}">${html}</font>`; }
    if (command === 'fontSize' && value) { return `<font size="${value}">${html}</font>`; }
    if (command === 'increaseFontSize') { return `<big>${html}</big>`; }
    if (command === 'decreaseFontSize') { return `<small>${html}</small>`; }
    if (command === 'foreColor' && value) { return `<font color="${value}">${html}</font>`; }
    if (command === 'hiliteColor') { return `<mark>${html}</mark>`; }
    if (['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) {
      const alignment = command === 'justifyLeft' ? 'left' : command === 'justifyCenter' ? 'center' : 'right';
      const container = document.createElement('div');
      container.innerHTML = html;
      container.querySelectorAll<HTMLElement>('[align]').forEach(element => element.removeAttribute('align'));
      return `<div align="${alignment}">${container.innerHTML}</div>`;
    }
    return html;
  }

  changeFontSize(points: string): void {
    this.applyFontCommand('fontSize', this.fontSizeCommandValue(Number(points)));
  }

  changeFontSizeRelative(delta: -1 | 1): void {
    this.applyFontCommand(delta > 0 ? 'increaseFontSize' : 'decreaseFontSize');
  }

  private fontSizeCommandValue(points: number): string {
    if (points <= 9) { return '1'; }
    if (points <= 11) { return '2'; }
    if (points <= 13) { return '3'; }
    if (points <= 17) { return '4'; }
    if (points <= 23) { return '5'; }
    if (points <= 31) { return '6'; }
    return '7';
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
    this.questionEdited();
  }

  removeQuestion(section: DesignerSection, question: DesignerQuestion): void {
    const index = section.questions.indexOf(question);
    if (index >= 0) { section.questions.splice(index, 1); this.questionEdited(); }
  }

  moveQuestion(section: DesignerSection, question: DesignerQuestion, direction: -1 | 1): void {
    const index = section.questions.indexOf(question);
    const destination = index + direction;
    if (index >= 0 && destination >= 0 && destination < section.questions.length) {
      moveItemInArray(section.questions, index, destination);
      this.questionEdited();
    }
  }

  questionEdited(): void { this.markModified(); this.refreshPages(); }

  markModified(): void {
    if (this.syncState !== 'loading' && this.syncState !== 'saving') {
      this.setSyncState('modified', 'Modifications non enregistrées.');
    }
  }

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
      const selectedColumn = this.selectedBlock.type === 'custom-table'
        ? this.selectedCustomTableColumnIndex(this.selectedBlock) : -1;
      const insertionIndex = selectedColumn >= 0 ? selectedColumn + 1 : this.selectedBlock.tableColumns.length;
      const column = {
        id: this.newId('column'), title: '',
        width: 25, color: '#d9eaf2'
      } as DesignerBlock['tableColumns'][number];
      this.selectedBlock.tableColumns.splice(insertionIndex, 0, column);
      this.selectedBlock.tableRows.forEach(row => {
        row.cells.splice(insertionIndex, 0, '');
        row.cellColors.splice(insertionIndex, 0, '#ffffff');
      });
      this.selectedBlock.columns = this.selectedBlock.tableColumns.length;
      if (this.selectedBlock.type === 'columns') { this.selectedBlock.childColumns.splice(insertionIndex, 0, []); }
      if (this.selectedBlock.type === 'custom-table') {
        this.normalizeTableColumnWidths(this.selectedBlock);
        this.selectSingleCell(`table-${this.selectedBlock.id}`, 0, insertionIndex,
          `table-header-${column.id}`);
      }
      this.questionEdited();
      return;
    }
    this.selectedBlock.columns++;
    this.selectedBlock.columnWidths.push(20);
  }

  removeTableColumn(): void {
    if (!this.selectedBlock || this.selectedBlock.columns <= 1) { return; }
    if (this.selectedBlock.type === 'custom-table' || this.selectedBlock.type === 'columns') {
      const selectedColumn = this.selectedBlock.type === 'custom-table'
        ? this.selectedCustomTableColumnIndex(this.selectedBlock) : -1;
      const removalIndex = selectedColumn >= 0 ? selectedColumn : this.selectedBlock.tableColumns.length - 1;
      if (this.selectedBlock.type === 'columns') {
        const [removedChildren = []] = this.selectedBlock.childColumns.splice(removalIndex, 1);
        const parentList = this.findBlockList(this.selectedBlock.id) || this.blocks;
        const containerIndex = parentList.indexOf(this.selectedBlock);
        parentList.splice(containerIndex + 1, 0, ...removedChildren);
      }
      this.selectedBlock.tableColumns.splice(removalIndex, 1);
      this.selectedBlock.tableRows.forEach(row => {
        row.cells.splice(removalIndex, 1);
        row.cellColors.splice(removalIndex, 1);
      });
      this.selectedBlock.columns = this.selectedBlock.tableColumns.length;
      if (this.selectedBlock.type === 'custom-table') {
        this.normalizeTableColumnWidths(this.selectedBlock);
      }
      this.clearCellSelection();
      this.questionEdited();
      return;
    }
    this.selectedBlock.columns--;
    this.selectedBlock.columnWidths.pop();
  }

  updateTableColumnWidth(columnIndex: number, value: number | string): void {
    const block = this.selectedBlock;
    if (!block || block.type !== 'custom-table' || !block.tableColumns[columnIndex]) { return; }
    this.redistributeTableColumnWidths(block, columnIndex, Number(value));
    this.questionEdited();
  }

  private redistributeTableColumnWidths(block: DesignerBlock, fixedIndex: number, requestedWidth: number): void {
    const count = block.tableColumns.length;
    if (count === 1) {
      block.tableColumns[0].width = 100;
      block.columnWidths = [100];
      return;
    }
    const minimumWidth = 3;
    const previousWidth = block.tableColumns.slice(0, fixedIndex)
      .reduce((total, column) => total + column.width, 0);
    const followingIndexes = block.tableColumns.map((_, index) => index).filter(index => index > fixedIndex);
    const availableWidth = Math.max(0, 100 - previousWidth);
    const maximumFixedWidth = Math.max(minimumWidth,
      availableWidth - minimumWidth * followingIndexes.length);
    const fixedWidth = followingIndexes.length
      ? Math.max(minimumWidth, Math.min(maximumFixedWidth, Number(requestedWidth) || minimumWidth))
      : availableWidth;
    const availableExtra = availableWidth - fixedWidth - minimumWidth * followingIndexes.length;
    const weightTotal = followingIndexes.reduce((total, index) =>
      total + Math.max(0, block.tableColumns[index].width - minimumWidth), 0);
    block.tableColumns[fixedIndex].width = this.roundPercentage(fixedWidth);
    followingIndexes.forEach(index => {
      const weight = weightTotal > 0
        ? Math.max(0, block.tableColumns[index].width - minimumWidth) / weightTotal
        : 1 / followingIndexes.length;
      block.tableColumns[index].width = this.roundPercentage(minimumWidth + availableExtra * weight);
    });
    const total = block.tableColumns.reduce((sum, column) => sum + column.width, 0);
    const adjustmentIndex = followingIndexes[followingIndexes.length - 1] ?? fixedIndex;
    block.tableColumns[adjustmentIndex].width = this.roundPercentage(block.tableColumns[adjustmentIndex].width
      + 100 - total);
    block.columnWidths = block.tableColumns.map(column => column.width);
  }

  private normalizeTableColumnWidths(block: DesignerBlock): void {
    if (!block.tableColumns.length) { return; }
    const total = block.tableColumns.reduce((sum, column) => sum + Math.max(0, column.width), 0);
    if (total <= 0) {
      const equalWidth = 100 / block.tableColumns.length;
      block.tableColumns.forEach(column => column.width = this.roundPercentage(equalWidth));
    } else {
      block.tableColumns.forEach(column =>
        column.width = this.roundPercentage(Math.max(0, column.width) * 100 / total));
    }
    const normalizedTotal = block.tableColumns.reduce((sum, column) => sum + column.width, 0);
    const last = block.tableColumns[block.tableColumns.length - 1];
    last.width = this.roundPercentage(last.width + 100 - normalizedTotal);
    block.columnWidths = block.tableColumns.map(column => column.width);
  }

  private roundPercentage(value: number): number { return Math.round(value * 1000) / 1000; }

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
      const selectedIndex = this.selectedCustomTableRowIndex(this.selectedBlock);
      if (delta > 0) {
        const insertionIndex = selectedIndex >= 0 ? selectedIndex + 1 : this.selectedBlock.tableRows.length;
        const row = {
          id: this.newId('row'), cells: this.selectedBlock.tableColumns.map(() => ''),
          cellColors: this.selectedBlock.tableColumns.map(() => '#ffffff')
        };
        this.selectedBlock.tableRows.splice(insertionIndex, 0, row);
        this.applyNumbering();
        this.selectSingleCell(`table-${this.selectedBlock.id}`, insertionIndex + 1, 0,
          `table-cell-${row.id}-0`);
      } else if (this.selectedBlock.tableRows.length > 1) {
        const removalIndex = selectedIndex >= 0 ? selectedIndex : this.selectedBlock.tableRows.length - 1;
        this.selectedBlock.tableRows.splice(removalIndex, 1);
        this.applyNumbering();
        this.clearCellSelection();
      }
      this.selectedBlock.rows = this.selectedBlock.tableRows.length;
      return;
    }
    this.selectedBlock.rows = Math.max(1, (this.selectedBlock.rows || 1) + delta);
  }

  private selectedSectionRowIndex(section: DesignerSection): number {
    const cellId = this.activeSelectedCellId(`section-${section.id}`);
    return section.questions.findIndex(question => [0, 1]
      .some(column => cellId === `question-${question.id}-${column}`));
  }

  private selectedCustomTableRowIndex(block: DesignerBlock): number {
    const cellId = this.activeSelectedCellId(`table-${block.id}`);
    return block.tableRows.findIndex(row => row.cells
      .some((_, column) => cellId === `table-cell-${row.id}-${column}`));
  }

  private selectedCustomTableColumnIndex(block: DesignerBlock): number {
    const cellId = this.activeSelectedCellId(`table-${block.id}`);
    const headerIndex = block.tableColumns.findIndex(column => cellId === `table-header-${column.id}`);
    if (headerIndex >= 0) { return headerIndex; }
    for (const row of block.tableRows) {
      const cellIndex = row.cells.findIndex((_, column) => cellId === `table-cell-${row.id}-${column}`);
      if (cellIndex >= 0) { return cellIndex; }
    }
    return -1;
  }

  private activeSelectedCellId(gridId: string): string {
    if (this.cellSelectionAnchor?.gridId === gridId && this.selectedCellIds.has(this.cellSelectionAnchor.id)) {
      return this.cellSelectionAnchor.id;
    }
    return this.cellsInGrid(gridId).find(cell => this.selectedCellIds.has(cell.id))?.id || '';
  }

  private selectSingleCell(gridId: string, row: number, column: number, id: string): void {
    this.selectedCellIds.clear();
    this.selectedCellIds.add(id);
    this.cellSelectionAnchor = { gridId, row, column, id };
  }

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
    if (section) { section.color = color; section.headerColors = section.headerColors.map(() => color); }
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

  async replaceProjectLogo(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file) { return; }
    if (!file.type.startsWith('image/')) {
      this.importError = 'Le logo doit être un fichier image.';
      return;
    }
    this.project.logoUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    this.project.showLogo = true;
    this.importError = '';
  }

  restoreDefaultLogo(): void {
    this.project.logoUrl = 'assets/logo-rallye.png';
    this.project.showLogo = true;
  }

  removeSection(index: number): void {
    const [section] = this.sections.splice(index, 1);
    if (section?.questions.length) {
      if (!this.sections.length) {
        this.addSection();
      }
      this.sections[0].questions.push(...section.questions);
    }
    this.questionEdited();
  }

  async exportPdf(corrected: boolean): Promise<void> {
    if (this.pdfExporting || !this.activeStage.hasFormDesign) { return; }
    const previousPreview = this.correctedPreview;
    const previousZoom = this.zoom;
    const previousSelectedBlockId = this.selectedBlockId;
    const previousSelectedCellIds = [...this.selectedCellIds];
    this.pdfExporting = true;
    this.importError = '';
    try {
      this.correctedPreview = corrected;
      this.zoom = 100;
      this.selectedBlockId = '';
      this.selectedCellIds.clear();
      if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }
      this.pages = [];
      this.changeDetector.detectChanges();
      this.refreshPages();
      this.changeDetector.detectChanges();
      if (document.fonts?.ready) { await document.fonts.ready; }
      await this.nextPaint();

      const papers = Array.from(document.querySelectorAll<HTMLElement>('.pages .paper'));
      if (!papers.length) { throw new Error('Aucune page A4 à exporter.'); }
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      for (let index = 0; index < papers.length; index++) {
        if (index > 0) { pdf.addPage('a4', 'portrait'); }
        pdf.addImage(await this.capturePaperPng(papers[index]), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      }
      const mode = corrected ? 'complété' : 'vierge';
      const stageName = this.pdfFileName(`${this.activeStage.number} - ${this.activeStage.name}`);
      pdf.save(`${stageName} - Formulaire ${mode}.pdf`);
    } catch (error) {
      this.importError = error instanceof Error ? error.message : 'Le PDF ne peut pas être généré.';
    } finally {
      this.correctedPreview = previousPreview;
      this.zoom = previousZoom;
      this.selectedBlockId = previousSelectedBlockId;
      previousSelectedCellIds.forEach(id => this.selectedCellIds.add(id));
      this.refreshPages();
      this.changeDetector.detectChanges();
      this.pdfExporting = false;
    }
  }

  private pdfFileName(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  }

  setCorrectedPreview(corrected: boolean): void {
    this.correctedPreview = corrected;
    this.refreshPages();
  }

  updateRallyTitle(value: string): void {
    this.project.rallyTitle = value;
    this.markModified();
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
          headerLabels: ['N°', 'Réponse', 'Corrigé'],
          headerColors: [this.sectionColor(sectionName), this.sectionColor(sectionName), this.sectionColor(sectionName)],
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
      numberColor: '#ffffff',
      answerColor: '#ffffff',
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
    const firstStage = this.makeStage(1);
    return {
      kind: 'rallye-form-project',
      schemaVersion: FORM_PROJECT_SCHEMA_VERSION,
      id: this.newId('project'),
      name: 'Nouveau Rallye',
      rallyTitle: 'Le Rallye se prend aux jeux',
      rallyDate: '',
      showLogo: true,
      logoUrl: 'assets/logo-rallye.png',
      titleSpacingBeforeMm: 0,
      titleSpacingAfterMm: 0,
      correctionCellWidthCm: 0.53,
      correctionCellHeightCm: 0.53,
      stages: [firstStage]
    };
  }

  private makeStage(number: number): DesignerStage {
    return {
      id: this.newId('stage'),
      hasFormDesign: false,
      number,
      name: 'Nouvelle épreuve',
      headerTitle: 'Nouvelle épreuve',
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
      rowHeight: 4.7, repeatHeader: true, showTableHeader: false,
      cellsMerged: false,
      fontWeight: 'normal', fontStyle: 'normal',
      textDecoration: 'none', numbering: 'numeric', prefix: '', sectionId,
      imageUsage: 'illustration',
      tableColumns: type === 'custom-table'
        ? [1, 2, 3].map(index => ({
          id: this.newId('column'), title: '', width: index === 3 ? 33.334 : 33.333,
          color: '#d9eaf2'
        }))
        : [
          { id: this.newId('column'), title: 'N°', width: 15, color: '#d9eaf2' },
          { id: this.newId('column'), title: 'Réponse', width: 70, color: '#d9eaf2' },
          { id: this.newId('column'), title: 'Colonne 3', width: 15, color: '#d9eaf2' }
        ].slice(0, type === 'columns' ? 2 : 3),
      tableRows: [1, 2, 3].map(index => ({
        id: this.newId('row'), cells: type === 'custom-table' ? ['', '', ''] : [String(index), '', ''],
        cellColors: (type === 'custom-table' ? ['', '', ''] : [String(index), '', '']).map(() => '#ffffff')
      })),
      childColumns: type === 'columns' ? [[], []] : []
    };
  }

  private makeQuestion(index: number): DesignerQuestion {
    return {
      id: this.newId('question'), number: String(index), answer: '', visibleInBlankForm: false,
      numberColor: '#ffffff', answerColor: '#ffffff',
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

  private paginate(): DesignerPage[] {
    // La hauteur des lignes est fixe en CSS. Cette capacité laisse la place au
    // cartouche, aux titres de section, au pied de page et aux quatre repères.
    // Toutes les mesures correspondent aux dimensions physiques du rendu A4.
    const continuationPageCapacityMm = 211.5;
    const firstPageCapacityMm = continuationPageCapacityMm - this.titleBlockHeightMm
      - Math.max(0, this.project.titleSpacingBeforeMm || 0)
      - Math.max(0, this.project.titleSpacingAfterMm || 0);
    const pages: DesignerPage[] = [];
    let current: DesignerPage = { number: 1, sections: [], blocks: [] };
    let remainingMm = firstPageCapacityMm;
    const currentPageCapacityMm = () => current.number === 1
      ? firstPageCapacityMm : continuationPageCapacityMm;

    const pushPage = () => {
      pages.push(current);
      current = { number: pages.length + 1, sections: [], blocks: [] };
      remainingMm = continuationPageCapacityMm;
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
      if (sectionBlock?.keepTogether && completeSectionHeight <= currentPageCapacityMm()
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
      if (unitBlocks.length === 1 && unitBlocks[0].type === 'custom-table'
        && unitBlocks[0].tableRows.length > 0) {
        const table = unitBlocks[0];
        const completeTableHeight = this.estimateBlockHeight(table);
        if (table.keepTogether && completeTableHeight <= continuationPageCapacityMm
          && completeTableHeight > remainingMm) {
          pushPage();
        }
        let rowOffset = 0;
        let firstFragment = true;

        while (rowOffset < table.tableRows.length) {
          const showHeader = table.showTableHeader && (firstFragment || table.repeatHeader);
          const spacingBefore = firstFragment ? Math.max(0, table.spacingBefore || 0) : 0;
          const headerHeight = this.customTableHeaderHeight(table, showHeader);
          const firstRowHeight = this.customTableRowHeight(table, table.tableRows[rowOffset]);
          const minimumHeight = spacingBefore + headerHeight + firstRowHeight;
          const pageHasContent = current.blocks.length > 0 || current.sections.length > 0;

          if (minimumHeight > remainingMm && pageHasContent) {
            pushPage();
            continue;
          }

          const fragmentRows: typeof table.tableRows = [];
          let fragmentHeight = spacingBefore + headerHeight;
          while (rowOffset < table.tableRows.length) {
            const row = table.tableRows[rowOffset];
            const rowHeight = this.customTableRowHeight(table, row);
            const isLastRow = rowOffset === table.tableRows.length - 1;
            const spacingAfter = isLastRow ? Math.max(0, table.spacingAfter || 0) : 0;
            if (fragmentRows.length > 0 && fragmentHeight + rowHeight + spacingAfter > remainingMm) {
              break;
            }
            fragmentRows.push(row);
            fragmentHeight += rowHeight;
            rowOffset++;
            if (isLastRow) { fragmentHeight += spacingAfter; }
            if (fragmentHeight >= remainingMm) { break; }
          }

          const lastFragment = rowOffset >= table.tableRows.length;
          current.blocks.push({
            ...table,
            tableRows: fragmentRows,
            showTableHeader: showHeader,
            spacingBefore,
            spacingAfter: lastFragment ? table.spacingAfter : 0
          });
          remainingMm = Math.max(0, remainingMm - fragmentHeight);
          firstFragment = false;
          if (!lastFragment) { pushPage(); }
        }
        continue;
      }
      const freeBlocks = unitBlocks.filter(block => !block.sectionId && block.type !== 'page-break');
      const unit = unitBlocks.map(block => block.sectionId ? sectionsById.get(block.sectionId) : undefined)
        .filter((section): section is DesignerSection => !!section && section.questions.length > 0);
      const freeHeight = Math.max(0, ...freeBlocks.map(block => this.estimateBlockHeight(block)));

      if (!unit.length) {
        const keepTogether = freeBlocks.every(block => block.keepTogether !== false);
        if (keepTogether && freeHeight <= currentPageCapacityMm() && freeHeight > remainingMm
          && (current.blocks.length > 0 || current.sections.length > 0)) {
          pushPage();
        }
        current.blocks.push(...freeBlocks);
        remainingMm = Math.max(0, remainingMm - Math.min(currentPageCapacityMm(), freeHeight));
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
      if (keepTogether && totalUnitHeight <= currentPageCapacityMm() && totalUnitHeight > remainingMm) {
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
      const rowsHeight = block.tableRows.reduce((total, row) => total + this.customTableRowHeight(block, row), 0);
      return spacing + this.customTableHeaderHeight(block, block.showTableHeader) + rowsHeight;
    }
    if (block.type === 'image') { return spacing + 55; }
    if (block.type === 'separator') { return spacing + 4; }
    if (block.type === 'text') {
      const lineCount = Math.max(1, this.plainText(block.text).split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 85)), 0));
      return spacing + lineCount * this.richTextLineHeightMm(block.text);
    }
    return spacing + 10;
  }

  private customTableHeaderHeight(block: DesignerBlock, visible: boolean): number {
    if (!visible) { return 0; }
    const columnCharacters = Math.max(12, Math.floor(75 / Math.max(1, block.tableColumns.length)));
    return Math.max(6, ...block.tableColumns.map(column => this.richTextHeightMm(column.title, columnCharacters)));
  }

  private customTableRowHeight(block: DesignerBlock, row: DesignerBlock['tableRows'][number]): number {
    const columnCharacters = Math.max(12, Math.floor(75 / Math.max(1, block.tableColumns.length)));
    return Math.max(block.rowHeight || 4.7,
      ...row.cells.map(cell => this.richTextHeightMm(cell, columnCharacters)));
  }

  private sectionRowHeight(block?: DesignerBlock): number {
    const correctionHeightMm = Math.max(3, this.project.correctionCellHeightCm * 10);
    return Math.max(correctionHeightMm, block?.rowHeight || 4.7);
  }

  private sectionOverhead(section: DesignerSection, block?: DesignerBlock): number {
    const titleHeight = section.showTitle ? Math.max(6, this.richTextHeightMm(section.title, 70)) : 0;
    const headerHeight = Math.max(6, ...section.headerLabels.map(label => this.richTextHeightMm(label, 28)));
    const titleAndHeaderHeight = titleHeight + headerHeight;
    return titleAndHeaderHeight + (block?.spacingBefore || 0) + (block?.spacingAfter || 0);
  }

  private questionRowHeight(block: DesignerBlock | undefined, question: DesignerQuestion): number {
    const placement = block ? this.findContainerPlacement(block.id) : undefined;
    const columnCount = placement?.container.childColumns.length || 1;
    const charactersPerLine = Math.max(18, Math.floor(78 / columnCount));
    const visualLineCount = Math.max(1, this.plainText(question.answer || '').split('\n')
      .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0));
    const correctionHeight = Math.max(1, question.corrections.length) * this.project.correctionCellHeightCm * 10;
    const textHeight = visualLineCount * this.richTextLineHeightMm(question.answer) + 1.1;
    const numberHeight = this.richTextHeightMm(question.number, 8) + 1.1;
    return Math.max(this.sectionRowHeight(block), textHeight, numberHeight, correctionHeight);
  }

  private richTextHeightMm(html: string, charactersPerLine: number): number {
    const lines = Math.max(1, this.plainText(html).split('\n').reduce((count, line) =>
      count + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0));
    return lines * this.richTextLineHeightMm(html);
  }

  private richTextLineHeightMm(html: string): number {
    const container = document.createElement('div');
    container.innerHTML = html || '';
    const pointSizes = [8, 10, 12, 14, 18, 24, 36];
    let maximumPoints = 9;
    container.querySelectorAll('font[size]').forEach(font => {
      const size = Math.max(1, Math.min(7, Number(font.getAttribute('size')) || 3));
      maximumPoints = Math.max(maximumPoints, pointSizes[size - 1]);
    });
    container.querySelectorAll('big').forEach(() => { maximumPoints = Math.max(maximumPoints, 14); });
    return Math.max(4.2, maximumPoints * 0.3528 * 1.25);
  }

  private plainText(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = value || '';
    return container.textContent || '';
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
