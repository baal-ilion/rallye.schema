import { AfterViewChecked, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { firstValueFrom, forkJoin, switchMap } from 'rxjs';
import * as XLSX from 'xlsx';
import * as JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import emojiGroupsData from 'unicode-emoji-json/data-by-group.json';
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
type ImportedCellMedia = Map<string, string[]>;
interface PictogramEntry { emoji: string; name: string; slug: string; }
interface PictogramGroup { name: string; slug: string; emojis: PictogramEntry[]; }

@Component({
  selector: 'app-form-designer',
  templateUrl: './form-designer.component.html',
  styleUrls: ['./form-designer.component.scss']
})
export class FormDesignerComponent implements OnInit, AfterViewChecked {
  readonly referenceStageId = '__reference_form__';
  readonly identificationBlockId = '__fixed_form_identification__';
  readonly titleBlockId = '__fixed_form_title__';

  project: FormProject = this.makeProject();
  referenceStage: DesignerStage = this.makeReferenceStage();
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
  showPictogramPalette = false;
  pictogramSearch = '';
  selectedPictogramGroup = 'smileys_emotion';
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
  readonly fontFamilies = [
    'Arial', 'Arial Black', 'Bahnschrift', 'Book Antiqua', 'Calibri', 'Cambria', 'Candara',
    'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New',
    'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Gill Sans', 'Impact', 'Lucida Console',
    'Lucida Sans Unicode', 'Palatino Linotype', 'Segoe Print', 'Segoe Script', 'Segoe UI',
    'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
    'Bangers', 'Bebas Neue', 'Caveat', 'Cinzel Decorative', 'Creepster', 'Dancing Script',
    'Fredericka the Great', 'Lobster', 'MedievalSharp', 'Monoton', 'Nosifer', 'Pacifico',
    'Pirata One', 'Rye', 'Special Elite', 'UnifrakturCook'
  ];
  readonly fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36'];
  readonly pictogramGroups = (emojiGroupsData as PictogramGroup[]).map(group => ({
    ...group,
    label: this.pictogramGroupLabel(group.slug)
  }));
  readonly identificationDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  private richTextEditor: HTMLElement | null = null;
  private richTextRange: Range | null = null;
  private preserveRichTextInsertion = false;
  private pendingRichTextInsertion?: {
    editor: HTMLElement;
    offsets: { start: number; end: number };
  };
  selectedContentImage: HTMLImageElement | null = null;
  private selectedContentEditorKey = '';
  private selectedContentImageIndex = 0;
  private draggedContentImage: HTMLImageElement | null = null;
  private draggedImageSourceEditor: HTMLElement | null = null;
  imageSelectionOverlay = { visible: false, left: 0, top: 0, width: 0, height: 0 };
  selectedImageWidthMm = 20;
  selectedImageHeightMm = 20;
  preserveSelectedImageRatio = true;
  selectedImageFit: 'contain' | 'cover' = 'contain';
  private activeTextEditingCellId = '';
  private titleWidthCache?: { text: string; showLogo: boolean; widthMm: number };
  private rallyParam?: RallyParamDto;
  private readonly requestedStageId = new URLSearchParams(window.location.search).get('stageId');
  private readonly stageParams = new Map<string, StageParamDto>();
  private readonly publishedDesignerLabels = new Map<string, Set<string>>();
  readonly blockCatalog: Array<{ type: DesignerBlockType; label: string; menuLabel?: string; icon: string }> = [
    { type: 'section', label: 'Section de réponses', menuLabel: 'Section', icon: '▦' },
    { type: 'custom-table', label: 'Tableau', icon: '▤' },
    { type: 'text', label: 'Texte', icon: 'T' },
    { type: 'image', label: 'Image', menuLabel: 'Bloc image', icon: '▧' },
    { type: 'columns', label: 'Conteneur colonnes', menuLabel: 'Colonnes', icon: '▥' },
    { type: 'separator', label: 'Séparateur', icon: '―' },
    { type: 'page-break', label: 'Saut de page', menuLabel: 'Saut page', icon: '↵' }
  ];

  constructor(private readonly api: FormDesignerApiService, private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadSharedConfiguration();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  refreshImageSelectionPosition(): void {
    if (this.imageSelectionOverlay.visible) { this.refreshSelectedImageOverlay(); }
  }

  ngAfterViewChecked(): void {
    document.querySelectorAll<HTMLElement>('.correction-groups').forEach(group => {
      const cellsHeight = Array.from(group.querySelectorAll<HTMLElement>(':scope > .correction-cells'))
        .reduce((height, cells) => height + cells.getBoundingClientRect().height, 0);
      const hasSpaceBelow = group.getBoundingClientRect().height > cellsHeight + 0.5;
      group.classList.toggle('ends-before-row', hasSpaceBelow);
    });
    this.adjustVerticalSectionTitleWidths();
  }

  private adjustVerticalSectionTitleWidths(): void {
    document.querySelectorAll<HTMLElement>('.question-section.vertical-section-title').forEach(section => {
      const titleBand = section.querySelector<HTMLElement>(':scope > .section-editor');
      const title = titleBand?.querySelector<HTMLElement>('.section-title-editor');
      const table = section.querySelector<HTMLElement>(':scope > table');
      if (!titleBand || !title || !table) { return; }
      const titleStyle = getComputedStyle(title);
      const signature = [
        title.innerHTML,
        titleStyle.fontFamily,
        titleStyle.fontSize,
        titleStyle.fontWeight,
        titleStyle.fontStyle,
        titleStyle.letterSpacing,
        table.offsetHeight,
        section.offsetWidth
      ].join('|');
      if (titleBand.dataset['widthSignature'] === signature) { return; }

      const millimetreInPixels = 96 / 25.4;
      const minimumBandWidth = 10 * millimetreInPixels;
      titleBand.style.width = `${minimumBandWidth}px`;
      titleBand.style.minWidth = `${minimumBandWidth}px`;

      let previousRequiredWidth = 0;
      for (let pass = 0; pass < 10; pass++) {
        const availableLength = Math.max(1, titleBand.clientHeight - 2 * millimetreInPixels);
        title.style.setProperty('position', 'absolute');
        title.style.setProperty('inset', 'auto');
        title.style.setProperty('left', '0');
        title.style.setProperty('top', '0');
        title.style.setProperty('width', `${availableLength}px`);
        title.style.setProperty('height', 'auto');
        title.style.setProperty('min-width', '0');
        title.style.setProperty('max-width', 'none');
        title.style.setProperty('display', 'block');
        title.style.setProperty('writing-mode', 'horizontal-tb');
        title.style.setProperty('white-space', 'normal', 'important');
        title.style.setProperty('overflow-wrap', 'anywhere');
        title.style.setProperty('text-align', 'center');
        title.style.setProperty('transform-origin', '0 0');
        title.style.setProperty('transform', 'none');

        const renderedHeight = title.offsetHeight;
        const requiredWidth = Math.max(minimumBandWidth, renderedHeight + 2 * millimetreInPixels);
        titleBand.style.width = `${Math.ceil(requiredWidth)}px`;
        titleBand.style.minWidth = `${Math.ceil(requiredWidth)}px`;
        titleBand.getBoundingClientRect();
        if (Math.abs(requiredWidth - previousRequiredWidth) < 0.5) { break; }
        previousRequiredWidth = requiredWidth;
      }

      const availableLength = Math.max(1, titleBand.clientHeight - 2 * millimetreInPixels);
      title.style.setProperty('width', `${availableLength}px`);
      title.style.setProperty('transform', 'none');
      const renderedHeight = title.offsetHeight;
      const finalRequiredWidth = Math.max(minimumBandWidth, renderedHeight + 2 * millimetreInPixels);
      if (finalRequiredWidth > titleBand.clientWidth + 0.5) {
        titleBand.style.width = `${Math.ceil(finalRequiredWidth)}px`;
        titleBand.style.minWidth = `${Math.ceil(finalRequiredWidth)}px`;
        titleBand.getBoundingClientRect();
      }
      const finalAvailableLength = Math.max(1, titleBand.clientHeight - 2 * millimetreInPixels);
      title.style.setProperty('width', `${finalAvailableLength}px`);
      const finalRenderedHeight = title.offsetHeight;
      title.style.setProperty('left', `${titleBand.clientWidth / 2 - finalRenderedHeight / 2}px`);
      title.style.setProperty('top', `${titleBand.clientHeight / 2 + finalAvailableLength / 2}px`);
      title.style.setProperty('transform', 'rotate(-90deg)');
      titleBand.dataset['widthSignature'] = [
        title.innerHTML,
        titleStyle.fontFamily,
        titleStyle.fontSize,
        titleStyle.fontWeight,
        titleStyle.fontStyle,
        titleStyle.letterSpacing,
        table.offsetHeight,
        section.offsetWidth
      ].join('|');
    });
  }

  get activeStage(): DesignerStage {
    if (this.isReferenceActive) { return this.referenceStage; }
    return this.project.stages.find(stage => stage.id === this.activeStageId) || this.project.stages[0];
  }

  get isReferenceActive(): boolean { return this.activeStageId === this.referenceStageId; }
  get correctionAppUrl(): string {
    const path = this.isReferenceActive
      ? '/listStageParam'
      : `/stageParam/${encodeURIComponent(this.activeStage.id)}`;
    return `https://${window.location.hostname}${path}`;
  }

  returnToCorrectionApp(): void {
    if (window.opener && !window.opener.closed) {
      const correctionOrigin = `https://${window.location.hostname}`;
      window.opener.postMessage({ type: 'rallye-designer-close' }, correctionOrigin);
      window.opener.focus();
      window.close();
      return;
    }
    window.location.href = this.correctionAppUrl;
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
    const mediaWidth = this.sections.reduce((width, section) => Math.max(width,
      section.uniformNumberMedia && section.questions.some(question =>
        /<img[\s>]|inline-pictogram/i.test(question.number))
        ? section.numberMediaWidthMm + 3 : 0), 0);
    return `max(calc(${maxLength}ch + 5mm), ${mediaWidth}mm)`;
  }

  get hasSelectedImage(): boolean {
    return !!this.selectedContentImage || this.selectedBlock?.type === 'image';
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
    const draftStage = this.project.stages[0];
    const number = onlyDraft ? draftStage.number : nextNumber;
    this.setSyncState('saving', 'Création de l’épreuve…');
    this.api.createStage({ ...this.emptyStageParam(number), name: onlyDraft ? draftStage.name : 'Nouvelle épreuve' }).subscribe({
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
    if (this.isReferenceActive) {
      this.setSyncState('ready', 'Formulaire de référence chargé.');
      return;
    }
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
    if (this.isReferenceActive) {
      this.saveReferenceForm();
      return;
    }
    this.saveStages([this.activeStage]);
  }

  private async saveReferenceForm(): Promise<void> {
    const restoreView = await this.freezeVisibleInterface('Enregistrement du formulaire de référence');
    this.setSyncState('saving', 'Enregistrement du formulaire de référence…');
    try {
      await this.saveRally();
      await this.persistReferenceForm();
      await this.publishActiveRecognition();
      this.setSyncState('saved', 'Formulaire de référence enregistré et publié.');
    } catch (error) {
      this.handleSyncError(error, 'Impossible d’enregistrer le formulaire de référence.');
    } finally {
      restoreView();
    }
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
      designs: this.api.getFormDesigns(),
      referenceDesign: this.api.getReferenceFormDesign()
    }).subscribe({
      next: ({ rally, stages, designs, referenceDesign }) => {
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
        this.referenceStage = referenceDesign?.content
          ? this.clone(referenceDesign.content)
          : this.makeReferenceStage();
        this.normalizeStageDesign(this.referenceStage);
        this.referenceStage.id = this.referenceStageId;
        this.referenceStage.name = 'Formulaire de référence';
        this.referenceStage.hasFormDesign = true;
        this.referenceStage.formDesignVersion = referenceDesign?.version;
        const requestedStage = this.requestedStageId
          ? this.project.stages.find(stage => stage.id === this.requestedStageId)
          : undefined;
        this.activeStageId = requestedStage?.id || this.project.stages[0].id;
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
    const restoreView = await this.freezeVisibleInterface('Enregistrement de tout le projet');
    this.setSyncState('saving', 'Enregistrement de tout le projet…');
    try {
      this.validateStagesBeforeSave(this.project.stages);
      await this.saveRally();
      await this.persistStages(this.project.stages);
      await this.persistReferenceForm();
      await this.publishAllRecognitions();
      this.setSyncState('saved', 'Projet enregistré dans la configuration partagée.');
    } catch (error) {
      this.handleSyncError(error, 'Impossible d’enregistrer tout le projet.');
    } finally {
      restoreView();
    }
  }

  private async saveStages(stages: DesignerStage[]): Promise<void> {
    const restoreView = await this.freezeVisibleInterface(
      stages.length === 1 ? 'Enregistrement de l’épreuve' : 'Enregistrement des épreuves');
    this.setSyncState('saving', stages.length === 1 ? 'Enregistrement de l’épreuve…' : 'Enregistrement des épreuves…');
    try {
      this.validateStagesBeforeSave(stages);
      await this.saveRally();
      await this.persistStages(stages);
      if (stages.some(stage => stage.id === this.activeStage.id)) { await this.publishActiveRecognition(); }
      this.setSyncState('saved', stages.length === 1 ? 'Épreuve enregistrée.' : 'Épreuves enregistrées.');
    } catch (error) {
      this.handleSyncError(error, 'Impossible d’enregistrer la configuration.');
    } finally {
      restoreView();
    }
  }

  private async saveRally(): Promise<void> {
    const current = this.rallyParam || {
      id: 'rally', title: '', date: '', showLogo: true, logoUrl: '',
      titleSpacingBeforeMm: 0, titleSpacingAfterMm: 0,
      correctionCellWidthCm: 0.53, correctionCellHeightCm: 0.53
    };
    this.rallyParam = await firstValueFrom(this.api.saveRally({
      ...current,
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

  private async persistReferenceForm(): Promise<void> {
    const saved = await firstValueFrom(this.api.saveReferenceFormDesign({
      version: this.referenceStage.formDesignVersion,
      schemaVersion: FORM_PROJECT_SCHEMA_VERSION,
      content: this.clone(this.referenceStage)
    }));
    this.referenceStage.formDesignVersion = saved.version;
    this.referenceStage.hasFormDesign = true;
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
    this.normalizeStageDesign(stage);
    stage.id = stageParam.id || stage.id;
    stage.number = stageParam.stage;
    stage.name = stageParam.name;
    if (this.plainText(stage.headerTitle).trim() !== stageParam.name.trim()) {
      stage.headerTitle = stageParam.name;
    }
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
    await this.waitForOutputReady();
    try {
      let paperElements = Array.from(document.querySelectorAll<HTMLElement>('.pages .paper'));
      if (!paperElements.length) { throw new Error('Aucune page A4 à publier.'); }

      const expectedLabels = (this.isReferenceActive ? [] : this.designerCorrectionEntries(this.activeStage)
        .map(entry => entry.label).filter(Boolean))
        .sort((left, right) => left.localeCompare(right, 'fr'));
      const renderedLabels = () => paperElements.flatMap(paper =>
          Array.from(paper.querySelectorAll<HTMLElement>('.correction-cells'))
            .map(group => group.getAttribute('title') || '').filter(Boolean))
        .sort((left, right) => left.localeCompare(right, 'fr'));
      const labelsMatch = (rendered: string[]) => expectedLabels.length === rendered.length
        && expectedLabels.every((label, index) => label === rendered[index]);
      let actualLabels = renderedLabels();
      if (!labelsMatch(actualLabels)) {
        // Lors d'une publication en série, Angular peut avoir terminé la
        // pagination alors que quelques vues appartiennent encore au document
        // précédent. Une reconstruction complète élimine ce faux négatif.
        this.pages = [];
        this.changeDetector.detectChanges();
        this.refreshPages();
        this.changeDetector.detectChanges();
        await this.waitForOutputReady();
        paperElements = Array.from(document.querySelectorAll<HTMLElement>('.pages .paper'));
        actualLabels = renderedLabels();
      }
      if (!labelsMatch(actualLabels)) {
        const missing = expectedLabels.filter(label => !actualLabels.includes(label));
        const unexpected = actualLabels.filter(label => !expectedLabels.includes(label));
        const details = [
          missing.length ? `absents : ${missing.join(', ')}` : '',
          unexpected.length ? `inattendus : ${unexpected.join(', ')}` : ''
        ].filter(Boolean).join(' ; ');
        throw new Error(`Le formulaire « ${this.activeStage.name} » n’est pas entièrement rendu`
          + `${details ? ` (${details})` : ''}. La publication a été interrompue.`);
      }
      if (this.isReferenceActive) {
        await firstValueFrom(this.api.publishReferenceRecognition(
          await this.generateRecognitionPage(paperElements[0], undefined, true)));
      } else {
        const generatedPages: GeneratedRecognitionPageDto[] = [];
        for (let index = 0; index < paperElements.length; index++) {
          generatedPages.push(await this.generateRecognitionPage(paperElements[index], index + 1, false));
        }
        await firstValueFrom(this.api.publishRecognitionPages(this.activeStage.number, generatedPages));
        const refreshedStage = await firstValueFrom(this.api.getStage(this.activeStage.id));
        this.stageParams.set(this.activeStage.id, refreshedStage);
        this.hydrateDesignerPoints(this.activeStage, refreshedStage);
      }
    } finally {
      this.correctedPreview = previousPreview;
      this.zoom = previousZoom;
      this.selectedBlockId = previousSelectedBlockId;
      previousSelectedCellIds.forEach(id => this.selectedCellIds.add(id));
      this.changeDetector.detectChanges();
    }
  }

  private validateStagesBeforeSave(stages: DesignerStage[]): void {
    for (const stage of this.project.stages) {
      if (!Number.isInteger(stage.number) || stage.number < 1 || stage.number > 99) {
        throw new Error(`Le numéro de l’épreuve « ${stage.name || 'sans nom'} » doit être un entier compris entre 1 et 99.`);
      }
      if (!stage.name.trim()) {
        throw new Error(`L’épreuve n° ${stage.number} ne peut pas être enregistrée sans titre.`);
      }
    }

    const stagesByNumber = new Map<number, DesignerStage[]>();
    this.project.stages.forEach(stage => {
      const sameNumber = stagesByNumber.get(stage.number) || [];
      sameNumber.push(stage);
      stagesByNumber.set(stage.number, sameNumber);
    });
    const duplicate = Array.from(stagesByNumber.entries())
      .find(([, matchingStages]) => matchingStages.length > 1);
    if (duplicate) {
      const [number, matchingStages] = duplicate;
      const names = matchingStages.map(stage => `« ${stage.name} »`).join(' et ');
      throw new Error(`Le numéro d’épreuve ${number} est déjà utilisé par ${names}. Choisissez un numéro différent.`);
    }

    this.validateDesignerQuestions(stages);
  }

  private async publishAllRecognitions(): Promise<void> {
    const previousStageId = this.activeStageId;
    const previousSelectedBlockId = this.selectedBlockId;
    const allStageIds = [
      this.referenceStageId,
      ...this.project.stages.filter(stage => stage.hasFormDesign).map(stage => stage.id)
    ];
    const stageIds = [
      ...(allStageIds.includes(previousStageId) ? [previousStageId] : []),
      ...allStageIds.filter(stageId => stageId !== previousStageId)
    ];
    try {
      for (const stageId of stageIds) {
        this.activeStageId = stageId;
        this.selectedBlockId = '';
        await this.publishActiveRecognition();
      }
    } finally {
      this.activeStageId = previousStageId;
      this.selectedBlockId = previousSelectedBlockId;
      this.pages = [];
      this.changeDetector.detectChanges();
      this.refreshPages();
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
    const paperRect = paper.getBoundingClientRect();
    const canonicalPng = await this.capturePaperPng(paper, targetWidth, targetHeight);
    const raster = await this.readPngRaster(canonicalPng);
    return {
      param: {
        stage: referenceOnly ? undefined : this.activeStage.number,
        page: referenceOnly ? undefined : page,
        template: this.buildRecognitionTemplate(paper, {
          x: targetWidth / paperRect.width,
          y: targetHeight / paperRect.height
        }, referenceOnly, raster),
        questions: {}
      },
      modelBase64: canonicalPng.split(',')[1],
      modelFileType: 'image/png',
      modelFileExtension: 'png'
    };
  }

  private async capturePaperPng(paper: HTMLElement, targetWidth = 2481, targetHeight = 3508): Promise<string> {
    const capturedCanvas = await html2canvas(paper, {
      scale: targetWidth / paper.offsetWidth, backgroundColor: '#ffffff', useCORS: true, logging: false,
      width: paper.offsetWidth, height: paper.offsetHeight,
      onclone: clonedDocument => this.prepareCaptureTextOrientations(clonedDocument)
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

  private async readPngRaster(dataUrl: string): Promise<ImageData> {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) { throw new Error('Impossible de mesurer les repères du formulaire.'); }
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  private prepareCaptureTextOrientations(clonedDocument: Document): void {
    // Les variables CSS du composant sont correctement visibles dans le
    // navigateur, mais leur résolution par html2canvas peut varier. Figer les
    // dimensions calculées sur chaque image garantit un rendu identique dans
    // l'aperçu, le PDF et le PNG publié vers le front.
    clonedDocument.querySelectorAll<HTMLElement>('.uniform-number-media').forEach(section => {
      const width = section.style.getPropertyValue('--number-media-width').trim() || '8mm';
      const height = section.style.getPropertyValue('--number-media-height').trim() || '8mm';
      const preserveRatio = section.classList.contains('preserve-number-media-ratio');
      section.querySelectorAll<HTMLElement>('.number-editor img').forEach(image => {
        image.style.setProperty('width', width, 'important');
        image.style.setProperty('height', height, 'important');
        image.style.setProperty('max-width', 'none', 'important');
        image.style.setProperty('object-fit', preserveRatio ? 'contain' : 'fill', 'important');
      });
    });

    // html2canvas peut écarter un sous-arbre dont un ancêtre est déclaré
    // visibility:hidden avant de résoudre la règle qui réaffiche ses images.
    // Les styles en ligne rendent l'intention non ambiguë dans le clone :
    // masquer les caractères de la réponse vierge, mais conserver ses images.
    clonedDocument.querySelectorAll<HTMLElement>('.hidden-answer.keep-answer-images').forEach(answer => {
      answer.style.setProperty('visibility', 'visible', 'important');
      answer.querySelectorAll<HTMLElement>('img').forEach(image => {
        image.style.setProperty('visibility', 'visible', 'important');
        image.style.setProperty('opacity', '1', 'important');
      });
    });
    clonedDocument.querySelectorAll<HTMLElement>('.text-effect-rotate-left').forEach(element => {
      element.style.setProperty('display', 'inline-block');
      element.style.setProperty('transform', 'rotate(-4deg)');
      element.style.setProperty('transform-origin', 'center center');
    });
    clonedDocument.querySelectorAll<HTMLElement>('.text-effect-rotate-right').forEach(element => {
      element.style.setProperty('display', 'inline-block');
      element.style.setProperty('transform', 'rotate(4deg)');
      element.style.setProperty('transform-origin', 'center center');
    });
  }

  private buildRecognitionTemplate(paper: HTMLElement, scale: { x: number; y: number },
      referenceOnly: boolean, raster?: ImageData): string {
    const paperRect = paper.getBoundingClientRect();
    const point = (element: Element): { x: number; y: number } => {
      const rect = element.getBoundingClientRect();
      const expected = { x: ((rect.left + rect.width / 2) - paperRect.left) * scale.x,
        y: ((rect.top + rect.height / 2) - paperRect.top) * scale.y };
      return raster
        ? this.refineRecognitionCenter(raster, expected, {
          width: rect.width * scale.x, height: rect.height * scale.y
        }, element.classList.contains('corner'), element.classList.contains('marked'))
        : expected;
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
    // Les deux lignes d'une même grille partagent exactement les mêmes
    // colonnes. Une case noircie peut masquer localement une bordure lors de
    // l'analyse du PNG : la première ligne sert alors de référence géométrique
    // pour les abscisses de la seconde.
    identification.forEach((values, name) => {
      const match = name.match(/^(.*?)(\d+)$/);
      if (!match || match[2] === '1') { return; }
      const reference = identification.get(`${match[1]}1`);
      if (!reference) { return; }
      values.forEach(value => {
        const referenceValue = reference.find(candidate => candidate.response === value.response);
        if (referenceValue) { value.x = referenceValue.x; }
      });
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

  private refineRecognitionCenter(raster: ImageData, expected: { x: number; y: number },
      size: { width: number; height: number }, filled: boolean,
      marked: boolean): { x: number; y: number } {
    const dark = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) { return false; }
      const index = (Math.trunc(y) * raster.width + Math.trunc(x)) * 4;
      return raster.data[index] + raster.data[index + 1] + raster.data[index + 2] < 420;
    };
    const halfWidth = Math.max(3, size.width / 2);
    const halfHeight = Math.max(3, size.height / 2);
    if (filled) {
      const margin = 5;
      let minX = Math.ceil(expected.x + halfWidth + margin);
      let maxX = Math.floor(expected.x - halfWidth - margin);
      let minY = Math.ceil(expected.y + halfHeight + margin);
      let maxY = Math.floor(expected.y - halfHeight - margin);
      for (let y = Math.floor(expected.y - halfHeight - margin);
           y <= Math.ceil(expected.y + halfHeight + margin); y++) {
        for (let x = Math.floor(expected.x - halfWidth - margin);
             x <= Math.ceil(expected.x + halfWidth + margin); x++) {
          if (!dark(x, y)) { continue; }
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      if (minX <= maxX && minY <= maxY) {
        return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
      }
      return expected;
    }

    const strongestLine = (vertical: boolean, estimate: number, side: -1 | 1): number | undefined => {
      const candidates: Array<{ coordinate: number; score: number }> = [];
      for (let delta = -6; delta <= 6; delta++) {
        const coordinate = Math.round(estimate + delta);
        let score = 0;
        const begin = Math.round((vertical ? expected.y - halfHeight : expected.x - halfWidth) + 2);
        const end = Math.round((vertical ? expected.y + halfHeight : expected.x + halfWidth) - 2);
        for (let position = begin; position <= end; position++) {
          if (dark(vertical ? coordinate : position, vertical ? position : coordinate)) { score++; }
        }
        candidates.push({ coordinate, score });
      }
      const threshold = Math.max(3, Math.min(size.width, size.height) * .35);
      const detected = candidates.filter(candidate => candidate.score >= threshold);
      if (!detected.length) { return undefined; }
      if (marked) {
        return side < 0 ? detected[0].coordinate : detected[detected.length - 1].coordinate;
      }
      const maximum = Math.max(...detected.map(candidate => candidate.score));
      return detected.filter(candidate => candidate.score >= maximum - 1)
        .sort((leftCandidate, rightCandidate) =>
          Math.abs(leftCandidate.coordinate - estimate) - Math.abs(rightCandidate.coordinate - estimate))[0].coordinate;
    };
    const left = strongestLine(true, expected.x - halfWidth, -1);
    const right = strongestLine(true, expected.x + halfWidth, 1);
    const top = strongestLine(false, expected.y - halfHeight, -1);
    const bottom = strongestLine(false, expected.y + halfHeight, 1);
    return {
      x: left !== undefined && right !== undefined ? (left + right) / 2 : expected.x,
      y: top !== undefined && bottom !== undefined ? (top + bottom) / 2 : expected.y
    };
  }

  /**
   * Attend toutes les ressources et la stabilisation de la mise en page avant
   * de produire une sortie officielle (PDF ou modèle PNG de reconnaissance).
   */
  private async waitForOutputReady(): Promise<void> {
    if (document.fonts?.ready) { await document.fonts.ready; }
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('.pages .paper img'));
    await Promise.all(images.map(async image => {
      if (!image.complete) {
        await new Promise<void>(resolve => {
          const done = () => resolve();
          image.addEventListener('load', done, { once: true });
          image.addEventListener('error', done, { once: true });
        });
      }
      if (typeof image.decode === 'function') {
        try { await image.decode(); } catch { /* Le rendu conservera l'état visible de l'image. */ }
      }
    }));

    let previousGeometry = '';
    for (let attempt = 0; attempt < 8; attempt++) {
      await this.nextPaint();
      const geometry = Array.from(document.querySelectorAll<HTMLElement>(
        '.pages .paper, .section-title-band, .vertical-section-title, .rich-inline-image'))
        .map(element => {
          const rect = element.getBoundingClientRect();
          return `${rect.x.toFixed(2)},${rect.y.toFixed(2)},${rect.width.toFixed(2)},${rect.height.toFixed(2)}`;
        }).join('|');
      if (geometry === previousGeometry) { return; }
      previousGeometry = geometry;
    }
  }

  private setSyncState(state: FormDesignerComponent['syncState'], message: string): void {
    this.syncState = state;
    this.syncMessage = message;
  }

  private handleSyncError(error: unknown, fallback: string): void {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0;
    const serverMessage = this.serverErrorMessage(error);
    const normalizedMessage = serverMessage.toLocaleLowerCase('fr');
    const simultaneousModification = status === 409
      && /(simultan|modifi|version|optimistic|recharge)/i.test(normalizedMessage)
      && !/(duplicate|doublon|déjà utilisé|already|e11000)/i.test(normalizedMessage);
    if (simultaneousModification) {
      this.setSyncState('error', 'La configuration a été modifiée ailleurs.');
      if (window.confirm(
        'La configuration a été modifiée dans une autre fenêtre. Recharger la version actuelle ?')) {
        this.loadSharedConfiguration();
      }
      return;
    }
    if (error instanceof Error && !('status' in error)) {
      this.setSyncState('error', error.message);
      return;
    }
    if (/(duplicate|doublon|déjà utilisé|already|e11000)/i.test(normalizedMessage)
        && /(stage|épreuve)/i.test(normalizedMessage)) {
      this.setSyncState('error',
        `Le numéro d’épreuve ${this.activeStage.number} est déjà utilisé. Choisissez un numéro différent.`);
      return;
    }
    const reason = serverMessage || this.httpSaveFailureReason(status);
    this.setSyncState('error', reason ? `${fallback.replace(/\.$/, '')} Motif : ${reason}` : fallback);
  }

  private serverErrorMessage(error: unknown): string {
    if (!error || typeof error !== 'object' || !('error' in error)) { return ''; }
    const payload = (error as { error?: unknown }).error;
    if (typeof payload === 'string') { return payload.trim(); }
    if (!payload || typeof payload !== 'object') { return ''; }
    for (const key of ['message', 'detail', 'error', 'reason']) {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) { return value.trim(); }
    }
    return '';
  }

  private httpSaveFailureReason(status: number): string {
    switch (status) {
      case 0: return 'le service de configuration est inaccessible. Vérifiez que le back est démarré et que la connexion fonctionne.';
      case 400: return 'certaines données sont invalides ou incomplètes.';
      case 401: return 'votre session n’est plus authentifiée.';
      case 403: return 'vous n’avez pas l’autorisation d’effectuer cette opération.';
      case 404: return 'la configuration concernée n’existe plus dans le back. Rechargez les données.';
      case 409: return 'une donnée est déjà utilisée ou la configuration a été modifiée ailleurs. Rechargez puis réessayez.';
      case 412: return 'la configuration affichée n’est plus à jour. Rechargez-la avant de recommencer.';
      case 413: return 'le formulaire ou l’une de ses images dépasse la taille acceptée par le serveur.';
      case 422: return 'le serveur refuse une ou plusieurs valeurs de la configuration.';
      default: return status >= 500
        ? 'le serveur a rencontré une erreur interne pendant l’enregistrement.'
        : '';
    }
  }

  async importWorkbook(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file) {
      return;
    }
    this.importError = '';
    try {
      const fileContent = await this.readFile(file);
      const workbook = XLSX.read(fileContent, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
      const media = await this.extractWorkbookMedia(fileContent, 0);
      const sections = this.parseSections(rows, sheet, media);

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
      verticalTitle: false,
      color: '#d9eaf2',
      headerLabels: ['N°', 'Réponse', 'Corrigé'],
      headerColors: ['#d9eaf2', '#d9eaf2', '#d9eaf2'],
      uniformNumberMedia: true,
      numberMediaWidthMm: 8,
      numberMediaHeightMm: 8,
      preserveNumberMediaRatio: true,
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
        id: this.newId('section'), title: block.title, showTitle: true, verticalTitle: false, color: block.color,
        headerLabels: ['N°', 'Réponse', 'Corrigé'],
        headerColors: [block.color, block.color, block.color],
        uniformNumberMedia: true, numberMediaWidthMm: 8, numberMediaHeightMm: 8,
        preserveNumberMediaRatio: true,
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
    this.richTextEditor = null;
    this.richTextRange = null;
    const cell = { gridId, row, column, id: cellId };
    this.focusInspectorForCell(gridId, cellId);
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

  private focusInspectorForCell(gridId: string, cellId: string): void {
    const sectionId = gridId.startsWith('section-') ? gridId.substring('section-'.length) : '';
    const tableBlockId = gridId.startsWith('table-') ? gridId.substring('table-'.length) : '';
    if (sectionId) {
      const sectionBlock = this.allBlocks.find(block => block.sectionId === sectionId);
      if (sectionBlock) { this.selectedBlockId = sectionBlock.id; }
    } else if (tableBlockId && this.allBlocks.some(block => block.id === tableBlockId)) {
      this.selectedBlockId = tableBlockId;
    }

    const questionMatch = /^question-(.+)-(?:0|1)$/.exec(cellId);
    const questionId = questionMatch?.[1];
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const inspector = document.querySelector<HTMLElement>('.inspector');
      if (!inspector) { return; }
      const target = questionId
        ? Array.from(inspector.querySelectorAll<HTMLElement>('.editable-question'))
          .find(element => element.dataset['questionId'] === questionId)
        : inspector.querySelector<HTMLElement>('.block-properties');
      if (!target) { return; }
      const stickyHeader = inspector.querySelector<HTMLElement>(':scope > h2');
      const headerHeight = stickyHeader?.getBoundingClientRect().height || 0;
      const targetTop = inspector.scrollTop
        + target.getBoundingClientRect().top
        - inspector.getBoundingClientRect().top
        - headerHeight
        - 8;
      inspector.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }));
  }

  focusQuestionProperties(event: MouseEvent, section: DesignerSection, question: DesignerQuestion): void {
    if (event.button !== 0) { return; }
    event.stopPropagation();
    this.clearCellSelection();
    this.selectSectionBlock(section);
    this.focusInspectorForCell(`section-${section.id}`, `question-${question.id}-1`);
  }

  updateNumberMediaDimension(dimension: 'width' | 'height', rawValue: number | string): void {
    const section = this.selectedSection;
    const value = Number(rawValue);
    if (!section || !Number.isFinite(value)) { return; }

    const previousWidth = Math.max(.1, section.numberMediaWidthMm || 8);
    const previousHeight = Math.max(.1, section.numberMediaHeightMm || 8);
    const ratio = previousWidth / previousHeight;
    let width = dimension === 'width' ? value : previousWidth;
    let height = dimension === 'height' ? value : previousHeight;
    if (section.preserveNumberMediaRatio) {
      if (dimension === 'width') { height = width / ratio; }
      else { width = height * ratio; }
      ({ width, height } = this.fitNumberMediaDimensions(width, height));
    } else {
      width = Math.max(2, Math.min(40, width));
      height = Math.max(2, Math.min(40, height));
    }
    section.numberMediaWidthMm = this.roundDimension(width);
    section.numberMediaHeightMm = this.roundDimension(height);
    this.questionEdited();
  }

  numberMediaDimensionMax(dimension: 'width' | 'height', section: DesignerSection): number {
    if (!section.preserveNumberMediaRatio) { return 40; }
    const width = Math.max(.1, section.numberMediaWidthMm || 8);
    const height = Math.max(.1, section.numberMediaHeightMm || 8);
    const ratio = width / height;
    return this.roundDimension(dimension === 'width'
      ? Math.min(40, 40 * ratio)
      : Math.min(40, 40 / ratio));
  }

  private fitNumberMediaDimensions(width: number, height: number): { width: number; height: number } {
    const minimum = 2;
    const maximum = 40;
    if (width > maximum || height > maximum) {
      const scale = Math.min(maximum / width, maximum / height);
      width *= scale;
      height *= scale;
    }
    if (width < minimum || height < minimum) {
      const scale = Math.max(minimum / width, minimum / height);
      width *= scale;
      height *= scale;
    }
    return { width, height };
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

  preserveRibbonTextSelection(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) { return; }
    const button = target.closest('button');
    if (!button) { return; }
    const preservesTextSelection = !!button.closest(
      '.font-group, .text-effects-group, .alignment-group, .text-color-group, .pictogram-grid'
    ) || button.title.includes('pictogramme comme un caract');
    if (!preservesTextSelection) { return; }
    this.rememberRichTextSelection();
    event.preventDefault();
  }

  updateRichText(target: any, property: string, event: Event): void {
    const editor = event.currentTarget as HTMLElement;
    const selectionOffsets = this.selectionOffsetsInEditor(editor);
    target[property] = editor.innerHTML;
    this.markModified();
    if (selectionOffsets) { this.scheduleSelectionRestore(editor, selectionOffsets); }
  }

  updateStageHeaderTitle(event: Event): void {
    this.updateRichText(this.activeStage, 'headerTitle', event);
    this.activeStage.name = this.plainText(this.activeStage.headerTitle)
      .replace(/\s+/g, ' ').trim();
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
    if (this.preserveRichTextInsertion) { return; }
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
    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const selectedRange = selection.getRangeAt(0);
      const selectedNode = selectedRange.commonAncestorContainer;
      const selectedElement = selectedNode instanceof Element ? selectedNode : selectedNode.parentElement;
      const selectedEditor = selectedElement?.closest<HTMLElement>('[contenteditable="true"]');
      if (selectedEditor && !selectedRange.collapsed) {
        this.richTextEditor = selectedEditor;
        this.richTextRange = selectedRange.cloneRange();
        this.applyRelativeFontSizeToTextSelection(delta);
        return;
      }
    }
    if (this.richTextEditor?.isConnected && this.richTextRange
      && !this.richTextRange.collapsed
      && this.richTextEditor.contains(this.richTextRange.commonAncestorContainer)) {
      this.applyRelativeFontSizeToTextSelection(delta);
      return;
    }
    this.applyFontCommand(delta > 0 ? 'increaseFontSize' : 'decreaseFontSize');
  }

  private applyRelativeFontSizeToTextSelection(delta: -1 | 1): void {
    const editor = this.richTextEditor;
    const range = this.richTextRange;
    if (!editor || !range || range.collapsed || !editor.contains(range.commonAncestorContainer)) {
      this.importError = 'Sélectionnez le texte ou le caractère dont vous voulez modifier la taille.';
      return;
    }
    const selectionOffsets = this.captureSelectionOffsets(editor, range);
    let textOffset = 0;
    let selectedTextElement: HTMLElement | null = null;
    const textNodes = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let textNode = textNodes.nextNode();
    while (textNode) {
      const nodeEnd = textOffset + (textNode.textContent?.length || 0);
      if (selectionOffsets.start < nodeEnd && selectionOffsets.end > textOffset) {
        selectedTextElement = textNode.parentElement;
        break;
      }
      textOffset = nodeEnd;
      textNode = textNodes.nextNode();
    }
    const startElement = selectedTextElement || (range.startContainer instanceof Element
      ? range.startContainer as HTMLElement : range.startContainer.parentElement);
    const currentPixels = Number.parseFloat(startElement ? getComputedStyle(startElement).fontSize : '');
    const currentPoints = Number.isFinite(currentPixels) ? currentPixels * .75 : 11;
    const availableSizes = this.fontSizes.map(Number);
    const targetSize = delta > 0
      ? availableSizes.find(size => size > currentPoints + .1) || availableSizes[availableSizes.length - 1]
      : [...availableSizes].reverse().find(size => size < currentPoints - .1) || availableSizes[0];
    const span = document.createElement('span');
    span.className = `font-size-${targetSize}`;
    span.append(range.extractContents());
    span.querySelectorAll<HTMLElement>('[class*="font-size-"]').forEach(element => {
      Array.from(element.classList)
        .filter(className => className.startsWith('font-size-'))
        .forEach(className => element.classList.remove(className));
      if (!element.className) { element.removeAttribute('class'); }
      if (!element.attributes.length) { element.replaceWith(...Array.from(element.childNodes)); }
    });
    range.insertNode(span);
    editor.querySelectorAll<HTMLElement>('span[class*="font-size-"]').forEach(element => {
      if (!element.textContent && !element.querySelector('img')) { element.remove(); }
    });
    range.selectNodeContents(span);
    this.richTextRange = range.cloneRange();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatFontSize' }));
    this.scheduleSelectionRestore(editor, selectionOffsets);
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

  deleteBlockFromOutline(blockId: string, event: Event): void {
    event.stopPropagation();
    const list = this.findBlockList(blockId);
    if (!list) { return; }
    const index = list.findIndex(block => block.id === blockId);
    if (index < 0) { return; }
    const [removed] = list.splice(index, 1);
    if (removed.type === 'columns') {
      list.splice(index, 0, ...removed.childColumns.flat());
    }
    if (removed.sectionId) {
      const sectionIndex = this.sections.findIndex(section => section.id === removed.sectionId);
      if (sectionIndex >= 0) { this.sections.splice(sectionIndex, 1); this.refreshPages(); }
    }
    if (this.selectedBlockId === blockId) {
      this.selectedBlockId = list[Math.min(index, list.length - 1)]?.id || '';
    }
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
    this.selectedBlock.imageUrl = await this.fileAsDataUrl(file);
    this.questionEdited();
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
    const restoreView = await this.freezeVisibleInterface(
      `Génération du PDF ${corrected ? 'complété' : 'vierge'}`);
    const previousPreview = this.correctedPreview;
    const previousZoom = this.zoom;
    const previousSelectedBlockId = this.selectedBlockId;
    const previousSelectedCellIds = [...this.selectedCellIds];
    this.pdfExporting = true;
    this.importError = '';
    try {
      this.zoom = 100;
      this.selectedBlockId = '';
      this.selectedCellIds.clear();
      if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }
      const pdf = await this.createActivePdf(corrected);
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
      restoreView();
    }
  }

  async exportAllStagePdfs(): Promise<void> {
    if (this.pdfExporting) { return; }
    const stages = this.project.stages.filter(stage => stage.hasFormDesign)
      .sort((left, right) => left.number - right.number);
    if (!stages.length) {
      this.importError = 'Aucune épreuve du rallye ne possède de formulaire à télécharger.';
      return;
    }
    const restoreView = await this.freezeVisibleInterface('Génération de tous les formulaires du rallye');
    const previousStageId = this.activeStageId;
    const previousPreview = this.correctedPreview;
    const previousZoom = this.zoom;
    const previousSelectedBlockId = this.selectedBlockId;
    const previousSelectedCellIds = [...this.selectedCellIds];
    this.pdfExporting = true;
    this.importError = '';
    try {
      const archive = new JSZip();
      this.zoom = 100;
      this.selectedBlockId = '';
      this.selectedCellIds.clear();
      if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }
      for (const stage of stages) {
        this.activeStageId = stage.id;
        this.changeDetector.detectChanges();
        const stageName = this.pdfFileName(`${stage.number} - ${stage.name}`);
        for (const corrected of [false, true]) {
          const pdf = await this.createActivePdf(corrected);
          const mode = corrected ? 'complété' : 'vierge';
          archive.file(`${stageName} - Formulaire ${mode}.pdf`, pdf.output('arraybuffer'));
        }
      }
      const content = await archive.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      this.downloadBlob(content,
        `${this.pdfFileName(this.project.rallyTitle || 'Rallye')} - Tous les formulaires.zip`);
    } catch (error) {
      this.importError = error instanceof Error
        ? `Impossible de télécharger tous les formulaires. Motif : ${error.message}`
        : 'Impossible de télécharger tous les formulaires.';
    } finally {
      this.activeStageId = previousStageId;
      this.correctedPreview = previousPreview;
      this.zoom = previousZoom;
      this.selectedBlockId = previousSelectedBlockId;
      this.selectedCellIds.clear();
      previousSelectedCellIds.forEach(id => this.selectedCellIds.add(id));
      this.pages = [];
      this.changeDetector.detectChanges();
      this.refreshPages();
      this.changeDetector.detectChanges();
      this.pdfExporting = false;
      restoreView();
    }
  }

  private async createActivePdf(corrected: boolean): Promise<jsPDF> {
    this.correctedPreview = corrected;
    this.pages = [];
    this.changeDetector.detectChanges();
    this.refreshPages();
    this.changeDetector.detectChanges();
    await this.waitForOutputReady();

    const papers = Array.from(document.querySelectorAll<HTMLElement>('.pages .paper'));
    if (!papers.length) { throw new Error(`Aucune page A4 pour l’épreuve « ${this.activeStage.name} ».`); }
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    for (let index = 0; index < papers.length; index++) {
      if (index > 0) { pdf.addPage('a4', 'portrait'); }
      pdf.addImage(await this.capturePaperPng(papers[index]), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }
    return pdf;
  }

  private downloadBlob(content: Blob, fileName: string): void {
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /**
   * La publication reconstruit temporairement les pages A4 à 100 %, parfois
   * pour plusieurs épreuves. Cette capture fige l'interface visible pendant ce
   * rendu interne, puis restitue exactement les positions de défilement.
   */
  private async freezeVisibleInterface(actionLabel: string): Promise<() => void> {
    const windowScrollX = window.scrollX;
    const windowScrollY = window.scrollY;
    const scrollPositions = ['.workspace', '.document-outline', '.inspector']
      .map(selector => document.querySelector<HTMLElement>(selector))
      .map(element => ({
        element,
        left: element?.scrollLeft || 0,
        top: element?.scrollTop || 0
      }));
    const focusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined;

    let frozenView: HTMLDivElement | undefined;
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const canvas = await html2canvas(document.body, {
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        x: windowScrollX,
        y: windowScrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: 0,
        scrollY: 0
      });
      frozenView = document.createElement('div');
      const frozenImage = document.createElement('img');
      frozenImage.src = canvas.toDataURL('image/png');
      frozenImage.alt = '';
      frozenImage.setAttribute('aria-hidden', 'true');
      Object.assign(frozenImage.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'fill'
      });

      const progressMessage = document.createElement('div');
      progressMessage.setAttribute('role', 'status');
      progressMessage.setAttribute('aria-live', 'polite');
      progressMessage.innerHTML = `
        <span class="operation-progress-spinner" aria-hidden="true"></span>
        <span><strong>${this.escapeHtml(actionLabel)} en cours…</strong>
        <small>Le traitement peut prendre quelques instants. Merci de patienter.</small></span>`;
      Object.assign(progressMessage.style, {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        minWidth: '360px',
        maxWidth: 'min(520px, calc(100vw - 40px))',
        padding: '18px 22px',
        color: '#212529',
        background: '#ffffff',
        border: '1px solid #a66f00',
        borderLeft: '5px solid #a66f00',
        borderRadius: '6px',
        boxShadow: '0 8px 28px rgba(0, 0, 0, .28)',
        fontFamily: 'Arial, sans-serif'
      });
      const spinner = progressMessage.querySelector<HTMLElement>('.operation-progress-spinner');
      if (spinner) {
        Object.assign(spinner.style, {
          flex: '0 0 28px',
          width: '28px',
          height: '28px',
          border: '4px solid #e2e3e5',
          borderTopColor: '#5b8734',
          borderRadius: '50%'
        });
        spinner.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
          { duration: 850, iterations: Infinity }
        );
      }
      const messageText = progressMessage.querySelector<HTMLElement>('span:last-child');
      const messageTitle = progressMessage.querySelector<HTMLElement>('strong');
      const messageDetail = progressMessage.querySelector<HTMLElement>('small');
      if (messageText) { Object.assign(messageText.style, { display: 'grid', gap: '4px' }); }
      if (messageTitle) { Object.assign(messageTitle.style, { fontSize: '15px', color: '#416326' }); }
      if (messageDetail) { Object.assign(messageDetail.style, { display: 'block', fontSize: '12px', color: '#5c636a' }); }
      frozenView.append(frozenImage, progressMessage);
      Object.assign(frozenView.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '2147483647',
        pointerEvents: 'auto',
        userSelect: 'none'
      });
      document.body.appendChild(frozenView);
    } catch {
      // Une image externe non compatible CORS ne doit jamais empêcher
      // l'enregistrement : la restauration des défilements reste assurée.
    }

    return () => {
      scrollPositions.forEach(position => {
        if (!position.element) { return; }
        position.element.scrollLeft = position.left;
        position.element.scrollTop = position.top;
      });
      window.scrollTo(windowScrollX, windowScrollY);
      frozenView?.remove();
      if (focusedElement?.isConnected) { focusedElement.focus({ preventScroll: true }); }
    };
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

  private parseSections(rows: any[][], sheet: XLSX.WorkSheet, media: ImportedCellMedia = new Map()): DesignerSection[] {
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
      // La colonne E contient une formule sur toutes les lignes du modèle. Elle
      // ne suffit donc pas, à elle seule, à matérialiser une question.
      if (![1, 2, 3, 5].some(column => String(row[column] ?? '').trim())) {
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
          verticalTitle: false,
          color: this.sectionColor(sectionName),
          headerLabels: ['N°', 'Réponse', 'Corrigé'],
          headerColors: [this.sectionColor(sectionName), this.sectionColor(sectionName), this.sectionColor(sectionName)],
          uniformNumberMedia: true,
          numberMediaWidthMm: 8,
          numberMediaHeightMm: 8,
          preserveNumberMediaRatio: true,
          questions: []
        };
        sections.push(current);
        currentKey = key;
      }
      const responseMerge = responseMerges.find(range => range.s.r === rowIndex);
      const groupEnd = responseMerge ? responseMerge.e.r : rowIndex;
      current.questions.push(this.toQuestion(rows, rowIndex, groupEnd, questionIndex++, media));
      rowIndex = groupEnd + 1;
    }
    const labels = sections.flatMap(section => section.questions.flatMap(question =>
      question.corrections.map(correction => correction.label).filter(Boolean)));
    const duplicate = labels.find((label, index) => labels.indexOf(label) !== index);
    if (duplicate) { throw new Error(`Format invalide : le label « ${duplicate} » est utilisé plusieurs fois.`); }
    return sections;
  }

  private toQuestion(rows: any[][], start: number, end: number, index: number,
      media: ImportedCellMedia): DesignerQuestion {
    const row = rows[start] || [];
    const number = this.importedNumberContent(String(row[1] ?? '').trim(), media.get(`${start},1`) || []);
    const responseMedia = Array.from({ length: end - start + 1 }, (_, offset) =>
      media.get(`${start + offset},2`) || []).flat();
    const answer = this.importedRichContent(String(row[2] ?? '').trim(), responseMedia);
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
      imagesVisibleInBlankForm: false,
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

  private makeReferenceStage(): DesignerStage {
    return {
      id: this.referenceStageId,
      hasFormDesign: true,
      number: 0,
      name: 'Formulaire de référence',
      headerTitle: 'Formulaire de référence',
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
      imageWidthMm: 80, imageHeightMm: 50, preserveImageRatio: true,
      imageFit: 'contain', imageAlignment: 'center',
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
      imagesVisibleInBlankForm: false,
      numberColor: '#ffffff', answerColor: '#ffffff',
      corrections: [this.makeCorrection()]
    };
  }

  private makeCorrection(): DesignerCorrection {
    return { id: this.newId('correction'), label: '', points: 0 };
  }

  applyTextEffect(effect: 'outline' | 'shadow' | 'wide' | 'rotate-left' | 'rotate-right'): void {
    const className = `text-effect-${effect}`;
    if (!this.activeTextEditingCellId && this.selectedCellIds.size) {
      this.transformSelectedCellContents(html => this.toggleHtmlClass(html, className));
      return;
    }
    if (!this.richTextEditor || !this.richTextRange) {
      this.importError = 'Sélectionnez du texte ou des cellules.';
      return;
    }
    const editor = this.richTextEditor;
    const selectionOffsets = this.captureSelectionOffsets(editor, this.richTextRange);
    const node = this.richTextRange.commonAncestorContainer;
    const existing = (node instanceof Element ? node : node.parentElement)
      ?.closest<HTMLElement>(`.${className}`);
    if (existing && this.richTextEditor.contains(existing)) {
      existing.replaceWith(...Array.from(existing.childNodes));
    } else {
      const span = document.createElement('span');
      span.className = className;
      span.append(this.richTextRange.extractContents());
      this.richTextRange.insertNode(span);
      this.richTextRange.selectNodeContents(span);
    }
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' }));
    this.scheduleSelectionRestore(editor, selectionOffsets);
  }

  isTextEffectActive(effect: 'outline' | 'shadow' | 'wide' | 'rotate-left' | 'rotate-right'): boolean {
    const className = `text-effect-${effect}`;
    if (this.activeTextEditingCellId && this.richTextRange) {
      const node = this.richTextRange.commonAncestorContainer;
      return !!(node instanceof Element ? node : node.parentElement)?.closest(`.${className}`);
    }
    const contents = this.selectedCellContents();
    return contents.length > 0 && contents.every(html => {
      const container = document.createElement('div');
      container.innerHTML = html;
      return container.childElementCount === 1 && container.firstElementChild?.classList.contains(className);
    });
  }

  private transformSelectedCellContents(transform: (html: string) => string): void {
    for (const section of this.sections) {
      if (this.selectedCellIds.has(`section-title-${section.id}`)) { section.title = transform(section.title); }
      section.headerLabels = section.headerLabels.map((value, index) =>
        this.selectedCellIds.has(`section-header-${section.id}-${index}`) ? transform(value) : value);
      section.questions.forEach(question => {
        if (this.selectedCellIds.has(`question-${question.id}-0`)) { question.number = transform(question.number); }
        if (this.selectedCellIds.has(`question-${question.id}-1`)) { question.answer = transform(question.answer); }
      });
    }
    this.allBlocks.filter(block => block.type === 'custom-table').forEach(block => {
      block.tableColumns.forEach(column => {
        if (this.selectedCellIds.has(`table-header-${column.id}`)) { column.title = transform(column.title); }
      });
      block.tableRows.forEach(row => {
        row.cells = row.cells.map((value, index) =>
          this.selectedCellIds.has(`table-cell-${row.id}-${index}`) ? transform(value) : value);
      });
    });
    this.questionEdited();
  }

  private toggleHtmlClass(html: string, className: string): string {
    const container = document.createElement('div');
    container.innerHTML = html;
    const wrapper = container.firstElementChild;
    if (wrapper?.classList.contains(className) && container.childElementCount === 1) {
      wrapper.replaceWith(...Array.from(wrapper.childNodes));
      return container.innerHTML;
    }
    return `<span class="${className}">${html}</span>`;
  }

  handleDesignerClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) { return; }
    const image = target.closest<HTMLImageElement>('.rich-text-editor img');
    if (image) {
      this.selectContentImage(image);
      this.ribbonTab = 'insert';
      const pixelsPerMm = 96 / 25.4;
      const imageStyle = getComputedStyle(image);
      this.selectedImageWidthMm = this.roundDimension(
        (Number.parseFloat(imageStyle.width) || Number(image.getAttribute('width')) || 1) / pixelsPerMm);
      this.selectedImageHeightMm = this.roundDimension(
        (Number.parseFloat(imageStyle.height) || Number(image.getAttribute('height')) || 1) / pixelsPerMm);
      this.preserveSelectedImageRatio = !image.hasAttribute('height');
      this.selectedImageFit = image.classList.contains('media-fit-cover') ? 'cover' : 'contain';
      this.richTextEditor = image.closest<HTMLElement>('.rich-text-editor');
      return;
    }
    const blockImage = target.closest<HTMLImageElement>('.form-image img');
    if (blockImage && this.selectedBlock?.type === 'image') {
      const block = this.selectedBlock;
      this.selectedContentImage = null;
      this.selectedImageWidthMm = block.imageWidthMm;
      this.selectedImageHeightMm = block.imageHeightMm;
      this.preserveSelectedImageRatio = block.preserveImageRatio;
      this.selectedImageFit = block.imageFit;
      this.showImageSelectionOverlay(blockImage);
      this.ribbonTab = 'insert';
      return;
    }
    if (!target.closest('.media-group') && !target.closest('.image-selection-overlay')) {
      this.clearSelectedContentImage();
    }
  }

  applySelectedImageSize(): void {
    const block = this.selectedBlock?.type === 'image' ? this.selectedBlock : undefined;
    if (!this.selectedContentImage && block) {
      block.imageWidthMm = this.selectedImageWidthMm;
      block.imageHeightMm = this.selectedImageHeightMm;
      block.preserveImageRatio = this.preserveSelectedImageRatio;
      this.questionEdited();
      setTimeout(() => this.refreshSelectedImageOverlay());
      return;
    }
    const image = this.currentContentImage();
    if (!image) { return; }
    const uniformSection = this.uniformNumberMediaSection(image);
    if (uniformSection) {
      uniformSection.numberMediaWidthMm = this.selectedImageWidthMm;
      uniformSection.numberMediaHeightMm = this.selectedImageHeightMm;
      uniformSection.preserveNumberMediaRatio = this.preserveSelectedImageRatio;
      this.questionEdited();
      setTimeout(() => this.restoreSelectedContentImage());
      return;
    }
    const pixelsPerMm = 96 / 25.4;
    image.setAttribute('width', String(Math.max(1, Math.round(this.selectedImageWidthMm * pixelsPerMm))));
    if (this.preserveSelectedImageRatio) {
      image.removeAttribute('height');
    } else {
      image.setAttribute('height', String(Math.max(1, Math.round(this.selectedImageHeightMm * pixelsPerMm))));
    }
    this.commitSelectedImageChange();
  }

  updateSelectedImageDimension(dimension: 'width' | 'height', rawValue: number | string): void {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || !this.hasSelectedImage) { return; }
    const previousWidth = Math.max(.1, this.selectedImageWidthMm || 20);
    const previousHeight = Math.max(.1, this.selectedImageHeightMm || 20);
    const ratio = previousWidth / previousHeight;
    const limits = this.selectedImageDimensionLimits();
    let width = dimension === 'width' ? value : previousWidth;
    let height = dimension === 'height' ? value : previousHeight;
    if (this.preserveSelectedImageRatio) {
      if (dimension === 'width') { height = width / ratio; }
      else { width = height * ratio; }
      ({ width, height } = this.fitDimensions(width, height, limits.width, limits.height));
    } else {
      width = Math.max(2, Math.min(limits.width, width));
      height = Math.max(2, Math.min(limits.height, height));
    }
    this.selectedImageWidthMm = this.roundDimension(width);
    this.selectedImageHeightMm = this.roundDimension(height);
    this.applySelectedImageSize();
  }

  selectedImageDimensionMax(dimension: 'width' | 'height'): number {
    const limits = this.selectedImageDimensionLimits();
    if (!this.preserveSelectedImageRatio) {
      return dimension === 'width' ? limits.width : limits.height;
    }
    const width = Math.max(.1, this.selectedImageWidthMm || 20);
    const height = Math.max(.1, this.selectedImageHeightMm || 20);
    const ratio = width / height;
    return this.roundDimension(dimension === 'width'
      ? Math.min(limits.width, limits.height * ratio)
      : Math.min(limits.height, limits.width / ratio));
  }

  private selectedImageDimensionLimits(): { width: number; height: number } {
    const image = this.currentContentImage();
    return image && this.uniformNumberMediaSection(image)
      ? { width: 40, height: 40 }
      : { width: 180, height: 240 };
  }

  private fitDimensions(width: number, height: number, maximumWidth: number,
      maximumHeight: number): { width: number; height: number } {
    if (width > maximumWidth || height > maximumHeight) {
      const scale = Math.min(maximumWidth / width, maximumHeight / height);
      width *= scale;
      height *= scale;
    }
    if (width < 2 || height < 2) {
      const scale = Math.max(2 / width, 2 / height);
      width *= scale;
      height *= scale;
    }
    return { width, height };
  }

  alignSelectedImage(alignment: 'inline' | 'left' | 'center' | 'right'): void {
    const block = this.selectedBlock?.type === 'image' ? this.selectedBlock : undefined;
    if (!this.selectedContentImage && block) {
      block.imageAlignment = alignment === 'inline' ? 'center' : alignment;
      this.questionEdited();
      return;
    }
    const image = this.currentContentImage();
    if (!image) { return; }
    image.classList.remove('media-inline', 'media-left', 'media-center', 'media-right');
    image.classList.add(`media-${alignment}`);
    this.commitSelectedImageChange();
  }

  setSelectedImageFit(fit: 'contain' | 'cover'): void {
    const block = this.selectedBlock?.type === 'image' ? this.selectedBlock : undefined;
    if (!this.selectedContentImage && block) {
      this.selectedImageFit = fit;
      block.imageFit = fit;
      this.questionEdited();
      return;
    }
    const image = this.currentContentImage();
    if (!image) { return; }
    this.selectedImageFit = fit;
    image.classList.toggle('media-fit-cover', fit === 'cover');
    image.classList.toggle('media-fit-contain', fit === 'contain');
    this.commitSelectedImageChange();
  }

  removeSelectedContentImage(): void {
    const block = this.selectedBlock?.type === 'image' ? this.selectedBlock : undefined;
    if (!this.selectedContentImage && block) {
      block.imageUrl = undefined;
      this.questionEdited();
      this.imageSelectionOverlay.visible = false;
      return;
    }
    const image = this.currentContentImage();
    if (!image) { return; }
    const editor = image.closest<HTMLElement>('.rich-text-editor');
    image.remove();
    this.clearSelectedContentImage();
    editor?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContent' }));
    this.questionEdited();
  }

  private commitSelectedImageChange(): void {
    const editor = this.currentContentImage()?.closest<HTMLElement>('.rich-text-editor');
    editor?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' }));
    this.questionEdited();
    setTimeout(() => this.restoreSelectedContentImage());
  }

  async replaceSelectedImage(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file || !file.type.startsWith('image/')) {
      if (file) { this.importError = 'Le fichier sélectionné doit être une image.'; }
      return;
    }
    const source = await this.fileAsDataUrl(file);
    const block = this.selectedBlock?.type === 'image' ? this.selectedBlock : undefined;
    if (!this.currentContentImage() && block) {
      block.imageUrl = source;
      this.questionEdited();
      setTimeout(() => this.refreshSelectedImageOverlay());
      return;
    }
    const image = this.currentContentImage();
    if (!image) { return; }
    image.src = source;
    image.alt = file.name;
    this.commitSelectedImageChange();
  }

  startSelectedImageResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const image = this.currentContentImage();
    const block = this.selectedBlock?.type === 'image' ? this.selectedBlock : undefined;
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = this.selectedImageWidthMm;
    const startHeight = this.selectedImageHeightMm;
    const ratio = Math.max(.01, startWidth / Math.max(.01, startHeight));
    const pixelsPerMm = 96 / 25.4;
    const move = (moveEvent: MouseEvent) => {
      const width = Math.max(2, Math.min(180, startWidth + (moveEvent.clientX - startX) / pixelsPerMm));
      const freeHeight = Math.max(2, Math.min(240, startHeight + (moveEvent.clientY - startY) / pixelsPerMm));
      this.selectedImageWidthMm = this.roundDimension(width);
      this.selectedImageHeightMm = this.roundDimension(this.preserveSelectedImageRatio ? width / ratio : freeHeight);
      if (image) {
        const uniformSection = this.uniformNumberMediaSection(image);
        if (uniformSection) {
          uniformSection.numberMediaWidthMm = this.selectedImageWidthMm;
          uniformSection.numberMediaHeightMm = this.selectedImageHeightMm;
          uniformSection.preserveNumberMediaRatio = this.preserveSelectedImageRatio;
        }
        image.setAttribute('width', String(Math.round(this.selectedImageWidthMm * pixelsPerMm)));
        if (this.preserveSelectedImageRatio) {
          image.removeAttribute('height');
        } else {
          image.setAttribute('height', String(Math.round(this.selectedImageHeightMm * pixelsPerMm)));
        }
        this.showImageSelectionOverlay(image);
      } else if (block) {
        block.imageWidthMm = this.selectedImageWidthMm;
        block.imageHeightMm = this.selectedImageHeightMm;
        block.preserveImageRatio = this.preserveSelectedImageRatio;
      }
    };
    const end = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      this.applySelectedImageSize();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', end);
  }

  handleImageDragStart(event: DragEvent): void {
    const target = event.target;
    const image = target instanceof Element ? target.closest<HTMLImageElement>('.rich-text-editor img') : null;
    if (!image) { return; }
    this.selectContentImage(image);
    this.draggedContentImage = image;
    this.draggedImageSourceEditor = image.closest<HTMLElement>('.rich-text-editor');
    event.dataTransfer?.setData('text/plain', this.selectedContentEditorKey || 'designer-image');
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; }
  }

  handleImageDragOver(event: DragEvent): void {
    const target = event.target;
    if (this.draggedContentImage && target instanceof Element && target.closest('.rich-text-editor')) {
      event.preventDefault();
      if (event.dataTransfer) { event.dataTransfer.dropEffect = 'move'; }
    }
  }

  handleImageDrop(event: DragEvent): void {
    const target = event.target;
    const editor = target instanceof Element ? target.closest<HTMLElement>('.rich-text-editor') : null;
    const image = this.draggedContentImage;
    if (!editor || !image) { return; }
    event.preventDefault();
    const documentWithCaret = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const range = documentWithCaret.caretRangeFromPoint?.(event.clientX, event.clientY);
    if (!range || !editor.contains(range.commonAncestorContainer)) { return; }
    const sourceEditor = this.draggedImageSourceEditor;
    range.insertNode(image);
    sourceEditor?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteByDrag' }));
    if (editor !== sourceEditor) {
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromDrop' }));
    }
    this.richTextEditor = editor;
    this.draggedContentImage = null;
    this.draggedImageSourceEditor = null;
    this.questionEdited();
    setTimeout(() => this.restoreSelectedContentImage());
  }

  private selectContentImage(image: HTMLImageElement): void {
    const section = image.closest<HTMLElement>('.question-section');
    if (section?.dataset['sectionId']) {
      this.selectedContentEditorKey = `section:${section.dataset['sectionId']}`;
      this.selectedContentImageIndex = Array.from(section.querySelectorAll('img')).indexOf(image);
    } else if (image.closest('.form-heading')) {
      this.selectedContentEditorKey = 'stage-title';
      this.selectedContentImageIndex = Array.from(
        image.closest('.form-heading')?.querySelectorAll('img') || []).indexOf(image);
    } else {
      this.selectedContentEditorKey = `block:${this.selectedBlockId}`;
      const block = image.closest<HTMLElement>('.designer-block') || image.closest<HTMLElement>('.inspector');
      this.selectedContentImageIndex = block ? Array.from(block.querySelectorAll('img')).indexOf(image) : 0;
    }
    this.selectedContentImage = image;
    image.draggable = true;
    this.showImageSelectionOverlay(image);
  }

  private currentContentImage(): HTMLImageElement | null {
    if (this.selectedContentImage?.isConnected) { return this.selectedContentImage; }
    if (!this.selectedContentEditorKey) { return null; }
    let container: HTMLElement | null = null;
    if (this.selectedContentEditorKey.startsWith('section:')) {
      const sectionId = this.selectedContentEditorKey.slice('section:'.length);
      container = document.querySelector<HTMLElement>(`.paper .question-section[data-section-id="${sectionId}"]`);
    } else if (this.selectedContentEditorKey === 'stage-title') {
      container = document.querySelector<HTMLElement>('.paper .form-heading');
    } else {
      container = document.querySelector<HTMLElement>('.designer-block.selected');
    }
    return container?.querySelectorAll<HTMLImageElement>('img')[this.selectedContentImageIndex] || null;
  }

  private restoreSelectedContentImage(): void {
    const image = this.currentContentImage();
    this.selectedContentImage = image;
    if (image) {
      image.draggable = true;
      this.showImageSelectionOverlay(image);
    } else {
      this.imageSelectionOverlay.visible = false;
    }
  }

  private clearSelectedContentImage(): void {
    this.selectedContentImage = null;
    this.selectedContentEditorKey = '';
    this.selectedContentImageIndex = 0;
    if (this.selectedBlock?.type !== 'image') { this.imageSelectionOverlay.visible = false; }
  }

  private refreshSelectedImageOverlay(): void {
    const image = this.currentContentImage()
      || (this.selectedBlock?.type === 'image'
        ? document.querySelector<HTMLImageElement>(`.designer-block.selected .form-image img`) : null);
    if (image) { this.showImageSelectionOverlay(image); }
  }

  private showImageSelectionOverlay(image: HTMLImageElement): void {
    const rect = image.getBoundingClientRect();
    this.imageSelectionOverlay = {
      visible: rect.width > 0 && rect.height > 0,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  private uniformNumberMediaSection(image: HTMLImageElement): DesignerSection | undefined {
    if (!image.closest('.number-editor')) { return undefined; }
    const sectionId = image.closest<HTMLElement>('.question-section')?.dataset['sectionId'];
    return sectionId ? this.sections.find(section => section.id === sectionId && section.uniformNumberMedia) : undefined;
  }

  private roundDimension(value: number): number {
    return Math.round(value * 10) / 10;
  }

  downloadExcelTemplate(): void {
    const link = document.createElement('a');
    link.href = 'assets/Modele-Reponses-et-bareme.xlsx';
    link.download = 'Modèle - Réponses et barème - Designer.xlsx';
    link.click();
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    const normalized = String(value ?? '').trim().toLocaleLowerCase('fr-FR');
    if (!normalized) { return fallback; }
    if (['oui', 'o', 'yes', 'y', 'vrai', 'true', '1'].includes(normalized)) { return true; }
    if (['non', 'n', 'no', 'faux', 'false', '0'].includes(normalized)) { return false; }
    return fallback;
  }

  private importedRichContent(text: string, images: string[]): string {
    const escaped = this.escapeHtml(text).replace(/\r?\n/g, '<br>');
    return escaped + images.map(source =>
      `<img class="media-inline" width="76" src="${source}" alt="">`).join('');
  }

  private importedNumberContent(text: string, images: string[]): string {
    const content = this.importedRichContent(text, images);
    const isShortSymbol = !!text && text.length <= 4 && !/^[\p{L}\p{N}]+$/u.test(text);
    return isShortSymbol && !images.length ? `<span class="inline-pictogram">${content}</span>` : content;
  }

  private escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  private async extractWorkbookMedia(content: ArrayBuffer, sheetIndex: number): Promise<ImportedCellMedia> {
    const result: ImportedCellMedia = new Map();
    const zip = await JSZip.loadAsync(content);
    const sheetNumber = sheetIndex + 1;
    const sheetRelationsPath = `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`;
    const sheetRelations = zip.file(sheetRelationsPath);
    if (!sheetRelations) { return result; }
    const relationsDocument = new DOMParser().parseFromString(await sheetRelations.async('text'), 'application/xml');
    const drawingRelation = Array.from(relationsDocument.getElementsByTagNameNS('*', 'Relationship'))
      .find(relation => String(relation.getAttribute('Type')).endsWith('/drawing'));
    const drawingTarget = drawingRelation?.getAttribute('Target');
    if (!drawingTarget) { return result; }
    const drawingPath = this.resolveZipPath('xl/worksheets', drawingTarget);
    const drawingFile = zip.file(drawingPath);
    const drawingRelationsFile = zip.file(
      `${drawingPath.slice(0, drawingPath.lastIndexOf('/'))}/_rels/${drawingPath.slice(drawingPath.lastIndexOf('/') + 1)}.rels`);
    if (!drawingFile || !drawingRelationsFile) { return result; }
    const drawingDocument = new DOMParser().parseFromString(await drawingFile.async('text'), 'application/xml');
    const drawingRelationsDocument = new DOMParser().parseFromString(
      await drawingRelationsFile.async('text'), 'application/xml');
    const mediaByRelationship = new Map(Array.from(
      drawingRelationsDocument.getElementsByTagNameNS('*', 'Relationship'))
      .map(relation => [relation.getAttribute('Id') || '', relation.getAttribute('Target') || '']));
    for (const anchor of Array.from(drawingDocument.getElementsByTagNameNS('*', 'twoCellAnchor'))
      .concat(Array.from(drawingDocument.getElementsByTagNameNS('*', 'oneCellAnchor')))) {
      const from = anchor.getElementsByTagNameNS('*', 'from')[0];
      const row = Number(from?.getElementsByTagNameNS('*', 'row')[0]?.textContent);
      const column = Number(from?.getElementsByTagNameNS('*', 'col')[0]?.textContent);
      const blip = anchor.getElementsByTagNameNS('*', 'blip')[0];
      const relationshipId = blip?.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
        || blip?.getAttribute('r:embed');
      const mediaTarget = relationshipId ? mediaByRelationship.get(relationshipId) : undefined;
      if (!mediaTarget || !Number.isFinite(row) || !Number.isFinite(column)) { continue; }
      const mediaPath = this.resolveZipPath(drawingPath.slice(0, drawingPath.lastIndexOf('/')), mediaTarget);
      const mediaFile = zip.file(mediaPath);
      if (!mediaFile) { continue; }
      const extension = mediaPath.split('.').pop()?.toLowerCase() || 'png';
      const mime = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg'
        : extension === 'svg' ? 'image/svg+xml' : extension === 'gif' ? 'image/gif' : 'image/png';
      const data = await mediaFile.async('base64');
      const key = `${row},${column}`;
      result.set(key, [...(result.get(key) || []), `data:${mime};base64,${data}`]);
    }
    return result;
  }

  private resolveZipPath(base: string, target: string): string {
    const normalizedTarget = target.replace(/\\/g, '/');
    const parts = (normalizedTarget.startsWith('/') ? normalizedTarget.slice(1)
      : `${base}/${normalizedTarget}`).split('/');
    const resolved: string[] = [];
    parts.forEach(part => {
      if (!part || part === '.') { return; }
      if (part === '..') { resolved.pop(); } else { resolved.push(part); }
    });
    return resolved.join('/');
  }

  async insertImageInContent(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file) {
      this.preserveRichTextInsertion = false;
      this.pendingRichTextInsertion = undefined;
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.preserveRichTextInsertion = false;
      this.pendingRichTextInsertion = undefined;
      this.importError = 'Le fichier sélectionné doit être une image.';
      return;
    }
    const source = await this.fileAsDataUrl(file);
    this.preserveRichTextInsertion = false;
    const pendingInsertion = this.pendingRichTextInsertion;
    if (pendingInsertion?.editor.isConnected) {
      this.restoreSelectionOffsets(pendingInsertion.editor, pendingInsertion.offsets);
    }
    this.pendingRichTextInsertion = undefined;
    this.insertRichContent(
      `<img class="media-inline" width="76" src="${source}" alt="${this.escapeAttribute(file.name)}">`);
  }

  prepareRichContentInsertion(): void {
    this.rememberRichTextSelection();
    this.pendingRichTextInsertion = this.richTextEditor?.isConnected && this.richTextRange
      ? {
        editor: this.richTextEditor,
        offsets: this.captureSelectionOffsets(this.richTextEditor, this.richTextRange)
      }
      : undefined;
    this.preserveRichTextInsertion = !!(this.activeTextEditingCellId
      && this.pendingRichTextInsertion);
    if (!this.preserveRichTextInsertion) { return; }
    window.addEventListener('focus', () => {
      setTimeout(() => { this.preserveRichTextInsertion = false; });
    }, { once: true });
  }

  insertPictogram(pictogram: string): void {
    this.insertRichContent(`<span class="inline-pictogram">${this.escapeHtml(pictogram)}</span>`);
    this.showPictogramPalette = false;
  }

  get filteredPictograms(): PictogramEntry[] {
    const query = this.pictogramSearch.trim().toLocaleLowerCase('fr-FR');
    const groups = this.selectedPictogramGroup === 'all'
      ? this.pictogramGroups
      : this.pictogramGroups.filter(group => group.slug === this.selectedPictogramGroup);
    const pictograms = groups.flatMap(group => group.emojis);
    if (!query) { return pictograms; }
    return pictograms.filter(pictogram =>
      pictogram.emoji.includes(query)
      || pictogram.name.toLocaleLowerCase('en-US').includes(query)
      || pictogram.slug.replace(/_/g, ' ').includes(query));
  }

  private pictogramGroupLabel(slug: string): string {
    return ({
      smileys_emotion: 'Émotions',
      people_body: 'Personnes',
      animals_nature: 'Animaux et nature',
      food_drink: 'Aliments',
      travel_places: 'Voyages et lieux',
      activities: 'Activités',
      objects: 'Objets',
      symbols: 'Symboles',
      flags: 'Drapeaux'
    } as Record<string, string>)[slug] || slug.replace(/_/g, ' ');
  }

  private insertRichContent(html: string): void {
    if (!this.activeTextEditingCellId && this.selectedCellIds.size === 1) {
      this.appendToSelectedCell(html);
      this.questionEdited();
      return;
    }
    if (this.richTextEditor?.isConnected && this.richTextRange
      && this.richTextEditor.contains(this.richTextRange.commonAncestorContainer)) {
      this.richTextEditor.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(this.richTextRange);
      this.richTextRange.deleteContents();
      const fragment = this.richTextRange.createContextualFragment(html);
      const lastNode = fragment.lastChild;
      this.richTextRange.insertNode(fragment);
      if (lastNode) {
        this.richTextRange.setStartAfter(lastNode);
        this.richTextRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(this.richTextRange);
      }
      this.richTextEditor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertContent' }));
      this.rememberRichTextSelection();
      return;
    }
    if (this.selectedCellIds.size === 1) {
      this.appendToSelectedCell(html);
      this.questionEdited();
      return;
    }
    this.importError = 'Sélectionnez une cellule ou placez le curseur dans un texte.';
  }

  private appendToSelectedCell(html: string): void {
    const selected = Array.from(this.selectedCellIds)[0];
    for (const section of this.sections) {
      if (selected === `section-title-${section.id}`) { section.title += html; return; }
      const headerIndex = section.headerLabels.findIndex((_, index) => selected === `section-header-${section.id}-${index}`);
      if (headerIndex >= 0) { section.headerLabels[headerIndex] += html; return; }
      for (const question of section.questions) {
        if (selected === `question-${question.id}-0`) { question.number += html; return; }
        if (selected === `question-${question.id}-1`) { question.answer += html; return; }
      }
    }
    for (const block of this.allBlocks.filter(item => item.type === 'custom-table')) {
      const header = block.tableColumns.find(column => selected === `table-header-${column.id}`);
      if (header) { header.title += html; return; }
      for (const row of block.tableRows) {
        const index = row.cells.findIndex((_, column) => selected === `table-cell-${row.id}-${column}`);
        if (index >= 0) { row.cells[index] += html; return; }
      }
    }
  }

  private fileAsDataUrl(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private escapeAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private normalizeStageDesign(stage: DesignerStage): void {
    stage.sections ||= [];
    stage.blocks ||= [];
    stage.sections.forEach(section => {
      section.showTitle ??= true;
      section.verticalTitle ??= false;
      section.uniformNumberMedia ??= true;
      section.numberMediaWidthMm ||= 8;
      section.numberMediaHeightMm ||= 8;
      section.preserveNumberMediaRatio ??= true;
      if (section.preserveNumberMediaRatio) {
        const fitted = this.fitNumberMediaDimensions(section.numberMediaWidthMm, section.numberMediaHeightMm);
        section.numberMediaWidthMm = this.roundDimension(fitted.width);
        section.numberMediaHeightMm = this.roundDimension(fitted.height);
      } else {
        section.numberMediaWidthMm = this.roundDimension(
          Math.max(2, Math.min(40, section.numberMediaWidthMm)));
        section.numberMediaHeightMm = this.roundDimension(
          Math.max(2, Math.min(40, section.numberMediaHeightMm)));
      }
      section.headerLabels ||= ['N°', 'Réponse', 'Corrigé'];
      section.headerColors ||= [
        section.color || '#d9eaf2', section.color || '#d9eaf2', section.color || '#d9eaf2'
      ];
      section.questions ||= [];
      section.questions.forEach(question => {
        question.visibleInBlankForm ??= false;
        question.imagesVisibleInBlankForm ??= false;
      });
    });
    this.flattenBlocks(stage.blocks).forEach(block => {
      block.imageWidthMm ||= 80;
      block.imageHeightMm ||= 50;
      block.preserveImageRatio ??= true;
      block.imageFit ||= 'contain';
      block.imageAlignment ||= 'center';
    });
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
          + section.questions.reduce((height, question) => height + this.questionRowHeight(section, block, question), 0);
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
            + this.questionRowHeight(section, block, section.questions[offset]);
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
            const nextHeight = this.questionRowHeight(section, block, section.questions[offset + questionCount]);
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
    const titleHeight = section.showTitle && !section.verticalTitle
      ? Math.max(6, this.richTextHeightMm(section.title, 70)) : 0;
    const headerHeight = Math.max(6, ...section.headerLabels.map(label => this.richTextHeightMm(label, 28)));
    const titleAndHeaderHeight = titleHeight + headerHeight;
    return titleAndHeaderHeight + (block?.spacingBefore || 0) + (block?.spacingAfter || 0);
  }

  private questionRowHeight(section: DesignerSection, block: DesignerBlock | undefined,
      question: DesignerQuestion): number {
    const placement = block ? this.findContainerPlacement(block.id) : undefined;
    const columnCount = placement?.container.childColumns.length || 1;
    const charactersPerLine = Math.max(18, Math.floor(78 / columnCount));
    const visualLineCount = Math.max(1, this.plainText(question.answer || '').split('\n')
      .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0));
    const correctionHeight = Math.max(1, question.corrections.length) * this.project.correctionCellHeightCm * 10;
    const textHeight = Math.max(visualLineCount * this.richTextLineHeightMm(question.answer),
      this.richMediaHeightMm(question.answer)) + 1.1;
    const configuredNumberMediaHeight = section.uniformNumberMedia
      && /<img[\s>]|inline-pictogram/i.test(question.number) ? section.numberMediaHeightMm : 0;
    const numberHeight = Math.max(this.richTextHeightMm(question.number, 8),
      this.richMediaHeightMm(question.number), configuredNumberMediaHeight) + 1.1;
    return Math.max(this.sectionRowHeight(block), textHeight, numberHeight, correctionHeight);
  }

  private richMediaHeightMm(html: string): number {
    const container = document.createElement('div');
    container.innerHTML = html || '';
    const pixelsPerMm = 96 / 25.4;
    return Math.max(0, ...Array.from(container.querySelectorAll('img')).map(image =>
      (Number(image.getAttribute('height')) || Number(image.getAttribute('width')) || 0) / pixelsPerMm));
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
